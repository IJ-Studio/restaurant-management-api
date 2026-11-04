import { Injectable, Inject, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE } from '../../database/drizzle/constants';
import * as schema from '../../database/schema/public.schema';
import { fitRandomForest, predictProba, mulberry32, RandomForestModel } from './random-forest.util';

const MIN_MUESTRAS = 30;
const UMBRAL_ALTO = 0.25;
const UMBRAL_MEDIO = 0.1;

// Categorías fijas (no inferidas de los datos): "alexa" existe como canal
// real aunque no aparezca en las 450 filas sintéticas, así que debe quedar
// en el encoding igual — si se infiriera de los datos de entrenamiento se
// perdería esa columna y el modelo no podría representarla nunca.
const OCASIONES = ['casual', 'cumpleaños', 'aniversario', 'negocios', 'otro'] as const;
const CANALES = ['telefono', 'web', 'app', 'redes_sociales', 'alexa'] as const;

const FEATURE_NAMES = [
  'num_comensales',
  'duracion_min',
  'deposito_requerido',
  'deposito_pagado',
  'deposito_pagado_flag',
  'recordatorio_enviado',
  'anticipacion_dias',
  'dia_semana',
  'hora',
  ...OCASIONES.map((o) => `ocasion_${o}`),
  ...CANALES.map((c) => `canal_${c}`),
];

interface RawFeatureRow {
  num_comensales: number | string;
  duracion_min: number | string;
  ocasion: string | null;
  canal: string | null;
  recordatorio_enviado: boolean | null;
  deposito_requerido: number | string | null;
  deposito_pagado: number | string | null;
  anticipacion_dias: number | string;
  dia_semana: number | string;
  hora: number | string;
}

interface RawTrainRow extends RawFeatureRow {
  no_show: boolean | null;
  es_sintetica: boolean | null;
}

interface FeatureInput {
  num_comensales: number;
  duracion_min: number;
  ocasion: string | null;
  canal: string | null;
  recordatorio_enviado: boolean;
  deposito_requerido: number;
  deposito_pagado: number;
  anticipacion_dias: number;
  dia_semana: number;
  hora: number;
}

function toFeatureInput(r: RawFeatureRow): FeatureInput {
  return {
    num_comensales: Number(r.num_comensales),
    duracion_min: Number(r.duracion_min),
    ocasion: r.ocasion,
    canal: r.canal,
    recordatorio_enviado: !!r.recordatorio_enviado,
    deposito_requerido: Number(r.deposito_requerido ?? 0),
    deposito_pagado: Number(r.deposito_pagado ?? 0),
    anticipacion_dias: Number(r.anticipacion_dias),
    dia_semana: Number(r.dia_semana),
    hora: Number(r.hora),
  };
}

interface ModelCache {
  model: RandomForestModel;
  matrizConfusion: { verdaderosPositivos: number; falsosPositivos: number; falsosNegativos: number; verdaderosNegativos: number };
  precision: number;
  recall: number;
  f1: number;
  datasetInfo: {
    totalMuestras: number;
    reales: number;
    sinteticas: number;
    porcentajeSintetico: number;
    tasaClasePositiva: number;
    nEntrenamiento: number;
    nPrueba: number;
  };
}

@Injectable()
export class NoShowService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // Entrenado una sola vez por proceso (lazy) y cacheado en memoria: es
  // barato re-consultar una reservación puntual para anotarla con el modelo
  // ya entrenado, pero no tiene sentido re-entrenar el bosque en cada
  // request — el badge se recalcula por reservación, no el modelo.
  private cache: ModelCache | null = null;

  // Se cachea también la PROMESA en vuelo (no solo el resultado ya resuelto):
  // el bosque se entrena de forma síncrona y bloquea el event loop mientras
  // corre, así que si varias reservaciones piden su riesgo casi al mismo
  // tiempo (típico al cargar la tabla del admin), sin esto cada una
  // arrancaba su propio entrenamiento en paralelo — N reservaciones visibles
  // = N bosques entrenándose a la vez, y el proceso se sentía "colgado".
  private trainingPromise: Promise<ModelCache> | null = null;

  private normalizeOcasion(raw: string | null): (typeof OCASIONES)[number] {
    const v = (raw ?? '').trim().toLowerCase();
    return (OCASIONES as readonly string[]).includes(v) ? (v as (typeof OCASIONES)[number]) : 'otro';
  }

  private featurize(row: FeatureInput): number[] {
    const ocasion = this.normalizeOcasion(row.ocasion);
    const canal = (row.canal ?? '').trim().toLowerCase();

    return [
      row.num_comensales,
      row.duracion_min,
      row.deposito_requerido,
      row.deposito_pagado,
      row.deposito_pagado > 0 ? 1 : 0,
      row.recordatorio_enviado ? 1 : 0,
      row.anticipacion_dias,
      row.dia_semana,
      row.hora,
      ...OCASIONES.map((o) => (ocasion === o ? 1 : 0)),
      ...CANALES.map((c) => (canal === c ? 1 : 0)),
    ];
  }

  private async ensureModel(): Promise<ModelCache> {
    if (this.cache) return this.cache;
    if (this.trainingPromise) return this.trainingPromise;

    this.trainingPromise = this.trainModel().then((result) => {
      this.cache = result;
      return result;
    }).finally(() => {
      this.trainingPromise = null;
    });

    return this.trainingPromise;
  }

  private async trainModel(): Promise<ModelCache> {
    // Solo reservaciones ya resueltas (completada/no_show) cuyo evento ya
    // pasó: son las únicas con un no_show observado de verdad. Se excluyen
    // "pendiente" y "cancelada" (nunca llegaron a resolverse) y cualquier
    // "confirmada" cuya fecha todavía no llega — traen no_show=false por
    // default aunque el resultado todavía no se conozca, incluirlas sería
    // una fuga de etiqueta (label leakage).
    const rows = await this.db.execute(sql`
      select
        num_comensales,
        duracion_min,
        ocasion,
        canal,
        recordatorio_enviado,
        deposito_requerido,
        deposito_pagado,
        no_show,
        es_sintetica,
        extract(epoch from (fecha_hora - creado_en)) / 86400.0 as anticipacion_dias,
        extract(dow from fecha_hora)::int as dia_semana,
        extract(hour from fecha_hora)::int as hora
      from reservaciones
      where estatus in ('completada', 'no_show') and fecha_hora <= now()
    `);

    const parsed = (rows as unknown as RawTrainRow[]).map((r) => ({
      ...toFeatureInput(r),
      no_show: !!r.no_show,
      es_sintetica: !!r.es_sintetica,
    }));

    if (parsed.length < MIN_MUESTRAS) {
      throw new ServiceUnavailableException(
        'No hay suficientes reservaciones resueltas para entrenar el modelo de no-show.',
      );
    }

    const X = parsed.map((r) => this.featurize(r));
    const y = parsed.map((r) => (r.no_show ? 1 : 0)) as (0 | 1)[];

    const { trainIdx, testIdx } = this.stratifiedSplit(y);
    const model = fitRandomForest(
      trainIdx.map((i) => X[i]),
      trainIdx.map((i) => y[i]),
      { seed: 77 },
    );

    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    for (const i of testIdx) {
      const pred = predictProba(model, X[i]) >= 0.5 ? 1 : 0;
      if (pred === 1 && y[i] === 1) tp++;
      else if (pred === 1 && y[i] === 0) fp++;
      else if (pred === 0 && y[i] === 1) fn++;
      else tn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const reales = parsed.filter((r) => !r.es_sintetica).length;
    const sinteticas = parsed.length - reales;

    return {
      model,
      matrizConfusion: { verdaderosPositivos: tp, falsosPositivos: fp, falsosNegativos: fn, verdaderosNegativos: tn },
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1: Math.round(f1 * 1000) / 1000,
      datasetInfo: {
        totalMuestras: parsed.length,
        reales,
        sinteticas,
        porcentajeSintetico: Math.round((sinteticas / parsed.length) * 1000) / 10,
        tasaClasePositiva: Math.round((y.reduce((s, v) => s + v, 0) / y.length) * 1000) / 10,
        nEntrenamiento: trainIdx.length,
        nPrueba: testIdx.length,
      },
    };
  }

  // Split 80/20 estratificado por clase (obligatorio: la clase positiva es
  // ~11%, un split aleatorio simple puede desbalancear aún más el test set).
  private stratifiedSplit(y: (0 | 1)[]): { trainIdx: number[]; testIdx: number[] } {
    const rng = mulberry32(77);
    const idx0: number[] = [];
    const idx1: number[] = [];
    y.forEach((v, i) => (v === 1 ? idx1 : idx0).push(i));

    const splitOne = (idx: number[]) => {
      const shuffled = [...idx];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const nTest = Math.max(1, Math.round(shuffled.length * 0.2));
      return { test: shuffled.slice(0, nTest), train: shuffled.slice(nTest) };
    };

    const s0 = splitOne(idx0);
    const s1 = splitOne(idx1);
    return { trainIdx: [...s0.train, ...s1.train], testIdx: [...s0.test, ...s1.test] };
  }

  async getModelMetrics() {
    const { matrizConfusion, precision, recall, f1, datasetInfo, model } = await this.ensureModel();

    const importanciaVariables = FEATURE_NAMES.map((variable, i) => ({
      variable,
      importancia: Math.round(model.featureImportances[i] * 1000) / 1000,
    })).sort((a, b) => b.importancia - a.importancia);

    return {
      datasetInfo,
      matrizConfusion,
      precision,
      recall,
      f1,
      importanciaVariables,
      limitaciones: [
        `${datasetInfo.porcentajeSintetico}% del dataset usado para entrenar es sintético (${datasetInfo.sinteticas} de ${datasetInfo.totalMuestras} filas) — el modelo aún no tiene validez predictiva real, es una prueba de concepto del pipeline completo.`,
        'ordenes.reservacion_id no está vinculado en los datos reales hoy, así que no se puede confirmar desde el lado de pedidos si una reservación se concretó en una compra.',
        'Reentrenar excluyendo las filas sintéticas cuando se acumulen al menos 200-300 reservaciones reales resueltas.',
      ],
    };
  }

  async getRiskForReservation(id: string) {
    const { model } = await this.ensureModel();

    const rows = await this.db.execute(sql`
      select
        num_comensales,
        duracion_min,
        ocasion,
        canal,
        recordatorio_enviado,
        deposito_requerido,
        deposito_pagado,
        extract(epoch from (fecha_hora - creado_en)) / 86400.0 as anticipacion_dias,
        extract(dow from fecha_hora)::int as dia_semana,
        extract(hour from fecha_hora)::int as hora
      from reservaciones
      where id = ${id}
    `);

    const row = (rows as unknown as RawFeatureRow[])[0];
    if (!row) throw new NotFoundException('Reservación no encontrada');

    const x = this.featurize(toFeatureInput(row));
    const probabilidad = predictProba(model, x);
    const clasificacion =
      probabilidad >= UMBRAL_ALTO ? 'Alto' : probabilidad >= UMBRAL_MEDIO ? 'Medio' : 'Bajo';

    return {
      probabilidad: Math.round(probabilidad * 1000) / 1000,
      clasificacion,
    };
  }
}
