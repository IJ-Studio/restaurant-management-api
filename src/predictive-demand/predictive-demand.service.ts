import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE } from '../database/drizzle/constants';
import * as schema from '../database/schema/public.schema';
import { fitLinearRegression, predictLinearRegression, wape } from './ols.util';

const HOLDOUT_DIAS = 14;
const DEFAULT_HORIZONTE = 7;
const MIN_DIAS_CON_VENTAS = 15;
const MIN_UNIDADES_TOTAL = 30;

interface VentaRow {
  fecha: string;
  platillo_id: number;
  unidades: number;
}

interface PlatilloRow {
  id: number;
  nombre: string;
  categoria: string;
  precio: string;
}

export interface PlatilloInfo {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
}

interface FilaFeature {
  dayIdx: number;
  platilloId: number;
  x: number[];
  y: number;
}

// Índice 1..6 = lunes..sábado; domingo queda como categoría base (todo en 0)
function dowDummies(fecha: Date): number[] {
  const dow = fecha.getUTCDay(); // 0 = domingo
  return [1, 2, 3, 4, 5, 6].map((d) => (dow === d ? 1 : 0));
}

@Injectable()
export class PredictiveDemandService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async cargarDatos() {
    const ventasRaw = await this.db.execute(sql`
      select
        date_trunc('day', o.creado_en)::date as fecha,
        oi.platillo_id as platillo_id,
        sum(oi.cantidad)::int as unidades
      from orden_items oi
      join ordenes o on o.id = oi.orden_id
      where o.estatus not in ('cancelada', 'pendiente')
      group by 1, 2
    `);

    const platillosRaw = await this.db.execute(sql`
      select p.id, p.nombre, c.nombre as categoria, p.precio
      from platillos p
      join categorias_menu c on c.id = p.categoria_id
      where p.disponible = true
    `);

    const ventas = ventasRaw as unknown as VentaRow[];
    const platillos = new Map<number, PlatilloInfo>();
    for (const p of platillosRaw as unknown as PlatilloRow[]) {
      platillos.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        precio: Number(p.precio),
      });
    }

    return { ventas, platillos };
  }

  // Arma el grid fecha × platillo (rellenando ceros) y regresa, por
  // platillo calificado, su serie diaria alineada a `fechas`.
  private construirSeries(ventas: VentaRow[]) {
    const fechasSet = new Set(ventas.map((v) => v.fecha));
    const fechas = Array.from(fechasSet).sort();
    if (fechas.length === 0) return { fechas: [] as string[], seriesPorPlatillo: new Map<number, number[]>() };

    const fechaMin = new Date(fechas[0]);
    const fechaMax = new Date(fechas[fechas.length - 1]);
    const todasFechas: string[] = [];
    for (let d = new Date(fechaMin); d <= fechaMax; d.setUTCDate(d.getUTCDate() + 1)) {
      todasFechas.push(d.toISOString().slice(0, 10));
    }

    const ventasMap = new Map<string, number>();
    for (const v of ventas) ventasMap.set(`${v.fecha}|${v.platillo_id}`, v.unidades);

    const diasConVentasPorPlatillo = new Map<number, number>();
    const totalUnidadesPorPlatillo = new Map<number, number>();
    for (const v of ventas) {
      diasConVentasPorPlatillo.set(v.platillo_id, (diasConVentasPorPlatillo.get(v.platillo_id) ?? 0) + 1);
      totalUnidadesPorPlatillo.set(v.platillo_id, (totalUnidadesPorPlatillo.get(v.platillo_id) ?? 0) + v.unidades);
    }

    const platilloIdsCalificados = [...diasConVentasPorPlatillo.entries()]
      .filter(
        ([id, dias]) =>
          dias >= MIN_DIAS_CON_VENTAS &&
          (totalUnidadesPorPlatillo.get(id) ?? 0) >= MIN_UNIDADES_TOTAL,
      )
      .map(([id]) => id);

    const seriesPorPlatillo = new Map<number, number[]>();
    for (const pid of platilloIdsCalificados) {
      seriesPorPlatillo.set(
        pid,
        todasFechas.map((f) => ventasMap.get(`${f}|${pid}`) ?? 0),
      );
    }

    return { fechas: todasFechas, seriesPorPlatillo };
  }

  private construirFeatures(
    fechas: string[],
    seriesPorPlatillo: Map<number, number[]>,
    promedioEntrenoPorPlatillo: Map<number, number>,
  ): FilaFeature[] {
    const filas: FilaFeature[] = [];
    for (const [pid, serie] of seriesPorPlatillo.entries()) {
      for (let i = 7; i < serie.length; i++) {
        const fecha = new Date(fechas[i]);
        const lag1 = serie[i - 1];
        const lag7 = serie[i - 7];
        const mm7 = serie.slice(i - 7, i).reduce((a, b) => a + b, 0) / 7;
        const tendencia = i / fechas.length;

        filas.push({
          dayIdx: i,
          platilloId: pid,
          x: [
            ...dowDummies(fecha),
            lag1,
            lag7,
            mm7,
            promedioEntrenoPorPlatillo.get(pid) ?? 0,
            tendencia,
          ],
          y: serie[i],
        });
      }
    }
    return filas;
  }

  private clasificar(variacionPct: number): 'Alta demanda' | 'Demanda media' | 'Baja demanda' {
    if (variacionPct > 15) return 'Alta demanda';
    if (variacionPct < -15) return 'Baja demanda';
    return 'Demanda media';
  }

  /**
   * Entrena el modelo global (pooled) sobre todos los platillos calificados,
   * mide su error contra el baseline ingenuo (lag_7) en un holdout de los
   * últimos días, y regresa todo lo necesario para pronosticar hacia
   * adelante. Se recalcula en cada request (sin persistir el modelo).
   */
  private async entrenar() {
    const { ventas, platillos } = await this.cargarDatos();
    const { fechas, seriesPorPlatillo } = this.construirSeries(ventas);

    if (fechas.length < HOLDOUT_DIAS + 21 || seriesPorPlatillo.size === 0) {
      return null;
    }

    const corte = fechas.length - HOLDOUT_DIAS;

    // El "promedio histórico" de cada platillo (feature de popularidad) se
    // calcula solo con el período de entrenamiento, para no filtrar
    // información del holdout hacia el modelo.
    const promedioEntrenoPorPlatillo = new Map<number, number>();
    for (const [pid, serie] of seriesPorPlatillo.entries()) {
      const train = serie.slice(0, corte);
      promedioEntrenoPorPlatillo.set(pid, train.reduce((a, b) => a + b, 0) / train.length);
    }

    const filas = this.construirFeatures(fechas, seriesPorPlatillo, promedioEntrenoPorPlatillo);
    const filasTrain = filas.filter((f) => f.dayIdx < corte);
    const filasVal = filas.filter((f) => f.dayIdx >= corte);

    if (filasTrain.length < 30 || filasVal.length === 0) return null;

    const coefValidacion = fitLinearRegression(
      filasTrain.map((f) => f.x),
      filasTrain.map((f) => f.y),
    );

    const predVal = filasVal.map((f) => predictLinearRegression(coefValidacion, f.x));
    const baselineVal = filasVal.map((f) => f.x[7]); // índice 7 = lag_7
    const yVal = filasVal.map((f) => f.y);

    const wapeModelo = wape(yVal, predVal);
    const wapeBaseline = wape(yVal, baselineVal);

    // Reentrena con TODO el historial (train + holdout) para las
    // predicciones hacia adelante que sí se van a mostrar/usar.
    const promedioFinalPorPlatillo = new Map<number, number>();
    for (const [pid, serie] of seriesPorPlatillo.entries()) {
      promedioFinalPorPlatillo.set(pid, serie.reduce((a, b) => a + b, 0) / serie.length);
    }
    const filasFinal = this.construirFeatures(fechas, seriesPorPlatillo, promedioFinalPorPlatillo);
    const coefFinal = fitLinearRegression(
      filasFinal.map((f) => f.x),
      filasFinal.map((f) => f.y),
    );

    return {
      fechas,
      seriesPorPlatillo,
      promedioFinalPorPlatillo,
      coefFinal,
      wapeModelo,
      wapeBaseline,
      platillos,
    };
  }

  private pronosticar(
    serie: number[],
    fechas: string[],
    promedioPlatillo: number,
    coef: number[],
    dias: number,
  ): { fecha: string; unidadesPredichas: number }[] {
    const historia = [...serie];
    const ultimaFecha = new Date(fechas[fechas.length - 1]);
    const resultado: { fecha: string; unidadesPredichas: number }[] = [];

    for (let o = 1; o <= dias; o++) {
      const fecha = new Date(ultimaFecha);
      fecha.setUTCDate(fecha.getUTCDate() + o);

      const idx = historia.length; // índice que tendría este día si extendiéramos la serie real
      const lag1 = historia[historia.length - 1];
      const lag7 = historia[historia.length - 7];
      const mm7 = historia.slice(historia.length - 7).reduce((a, b) => a + b, 0) / 7;
      const tendencia = (fechas.length - 1 + o) / fechas.length;

      const x = [...dowDummies(fecha), lag1, lag7, mm7, promedioPlatillo, tendencia];
      const pred = Math.round(predictLinearRegression(coef, x) * 10) / 10;

      resultado.push({ fecha: fecha.toISOString().slice(0, 10), unidadesPredichas: pred });
      historia.push(pred); // recursive forecasting: el pronóstico alimenta el siguiente lag_1/media móvil
    }

    return resultado;
  }

  async getRanking(dias: number = DEFAULT_HORIZONTE) {
    const modelo = await this.entrenar();
    if (!modelo) {
      return {
        disponible: false,
        motivo: 'No hay suficiente historial de ventas diarias para entrenar el modelo todavía.',
      };
    }

    const { fechas, seriesPorPlatillo, promedioFinalPorPlatillo, coefFinal, wapeModelo, wapeBaseline, platillos } =
      modelo;

    const items = [...seriesPorPlatillo.entries()].map(([pid, serie]) => {
      const info = platillos.get(pid);
      const unidadesUltimos7 = serie.slice(-7).reduce((a, b) => a + b, 0);
      const pronostico = this.pronosticar(serie, fechas, promedioFinalPorPlatillo.get(pid) ?? 0, coefFinal, dias);
      const unidadesPredichas = pronostico.reduce((s, p) => s + p.unidadesPredichas, 0);
      const variacionPct =
        unidadesUltimos7 > 0
          ? Math.round(((unidadesPredichas - unidadesUltimos7) / unidadesUltimos7) * 1000) / 10
          : unidadesPredichas > 0
            ? 100
            : 0;

      return {
        platilloId: pid,
        nombre: info?.nombre ?? `Platillo ${pid}`,
        categoria: info?.categoria ?? '',
        unidadesUltimos7,
        unidadesPredichas7: Math.round(unidadesPredichas * 10) / 10,
        variacionPct,
        clasificacion: this.clasificar(variacionPct),
      };
    });

    items.sort((a, b) => b.variacionPct - a.variacionPct);

    return {
      disponible: true,
      horizonteDias: dias,
      wapeModelo: Math.round(wapeModelo * 1000) / 1000,
      wapeBaseline: Math.round(wapeBaseline * 1000) / 1000,
      mejoraPct: Math.round((1 - wapeModelo / wapeBaseline) * 1000) / 10,
      platilloMayorCrecimiento: items[0] ?? null,
      platilloMayorDecrecimiento: items[items.length - 1] ?? null,
      platillos: items,
    };
  }

  async getPorPlatillo(platilloId: number, dias: number = DEFAULT_HORIZONTE) {
    const modelo = await this.entrenar();
    if (!modelo) {
      return {
        disponible: false,
        motivo: 'No hay suficiente historial de ventas diarias para entrenar el modelo todavía.',
      };
    }

    const { fechas, seriesPorPlatillo, promedioFinalPorPlatillo, coefFinal, wapeModelo, wapeBaseline, platillos } =
      modelo;

    const serie = seriesPorPlatillo.get(platilloId);
    if (!serie) {
      return {
        disponible: false,
        motivo: 'Este platillo no tiene suficiente historial de ventas diarias todavía (mínimo 15 días con venta).',
      };
    }

    const info = platillos.get(platilloId);
    const pronostico = this.pronosticar(serie, fechas, promedioFinalPorPlatillo.get(platilloId) ?? 0, coefFinal, dias);

    const serieHistorica = fechas.slice(-30).map((f, i) => ({
      fecha: f,
      unidades: serie[fechas.length - 30 + i] ?? 0,
    }));

    return {
      disponible: true,
      platillo: info ?? { id: platilloId, nombre: `Platillo ${platilloId}`, categoria: '', precio: 0 },
      wapeModelo: Math.round(wapeModelo * 1000) / 1000,
      wapeBaseline: Math.round(wapeBaseline * 1000) / 1000,
      serieHistorica,
      pronostico,
    };
  }
}
