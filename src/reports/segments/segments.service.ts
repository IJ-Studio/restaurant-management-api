import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE } from '../../database/drizzle/constants';
import * as schema from '../../database/schema/public.schema';
import { kmeans, silhouetteScore, pca2D, ClientFeatures } from './kmeans.util';

const K = 4;
const MIN_CLIENTES = K * 2;

type LabelKey =
  | 'frecuentes'
  | 'regularesMesa'
  | 'ocasionales'
  | 'domicilioRecurrente';

const LABELS: Record<LabelKey, { nombre: string; color: string; descripcion: string }> = {
  frecuentes: {
    nombre: 'Clientes frecuentes',
    color: 'brand',
    descripcion: 'Alta frecuencia de órdenes y ticket promedio elevado, casi siempre en mesa.',
  },
  regularesMesa: {
    nombre: 'Regulares en mesa',
    color: 'secondary',
    descripcion: 'Vuelven entre semana, ticket moderado, consistentes en frecuencia.',
  },
  ocasionales: {
    nombre: 'Ocasionales',
    color: 'amber',
    descripcion: 'Baja frecuencia, ticket bajo, suelen volver por promociones.',
  },
  domicilioRecurrente: {
    nombre: 'Domicilio recurrente',
    color: 'red',
    descripcion: 'Piden vía domicilio con frecuencia, ticket medio-alto.',
  },
};

interface ClienteAgregadoRow {
  cliente_id: string;
  nombre: string | null;
  email: string | null;
  frecuencia: number;
  ticket_promedio: number;
  proporcion_mesa: number;
  recencia_dias: number;
}

interface ClientInfo extends ClientFeatures {
  nombre: string;
  email: string;
  pcaX: number;
  pcaY: number;
}

interface ClusterStat {
  clusterIndex: number;
  tamano: number;
  frecuenciaPromedio: number;
  ticketPromedio: number;
  proporcionMesa: number;
  recenciaPromedio: number;
  miembros: ClientInfo[];
}

@Injectable()
export class SegmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getCustomerSegments() {
    const rows = await this.db.execute(sql`
      select
        c.id as cliente_id,
        trim(concat(u.name, ' ', u.lastname)) as nombre,
        u.email as email,
        count(o.id)::int as frecuencia,
        coalesce(avg(o.total), 0)::numeric as ticket_promedio,
        coalesce(
          sum(case when o.tipo = 'mesa' then 1 else 0 end)::float / nullif(count(o.id), 0),
          0
        ) as proporcion_mesa,
        extract(day from (now() - max(o.creado_en)))::numeric as recencia_dias
      from clientes c
      join ordenes o on o.cliente_id = c.id
      left join users u on u.id = c.user_id
      where o.estatus not in ('cancelada', 'pendiente')
      group by c.id, u.name, u.lastname, u.email
      having count(o.id) > 0
    `);

    const featureRows: Omit<ClientInfo, 'pcaX' | 'pcaY'>[] = (
      rows as unknown as ClienteAgregadoRow[]
    ).map((r) => ({
      clienteId: r.cliente_id,
      nombre: r.nombre?.trim() || 'Cliente sin nombre',
      email: r.email ?? '',
      frecuencia: Number(r.frecuencia),
      ticketPromedio: Number(r.ticket_promedio),
      proporcionMesa: Number(r.proporcion_mesa),
      recenciaDias: Number(r.recencia_dias),
    }));

    if (featureRows.length < MIN_CLIENTES) {
      return {
        disponible: false,
        motivo: 'No hay suficientes clientes con historial de compras para segmentar.',
      };
    }

    const { points, assignments } = kmeans(featureRows, K);
    const indiceSilueta = silhouetteScore(points, assignments, K);
    const totalClientes = featureRows.length;

    // Coordenadas 2D (PCA sobre el mismo espacio estandarizado que usó
    // K-Means) para graficar los clústeres de forma fiel a como se separaron
    // realmente, en vez de proyectar 2 features de negocio al azar.
    const coords = pca2D(points);
    const enrichedRows: ClientInfo[] = featureRows.map((r, i) => ({
      ...r,
      pcaX: Math.round(coords[i].x * 100) / 100,
      pcaY: Math.round(coords[i].y * 100) / 100,
    }));

    const clusterStats: ClusterStat[] = Array.from({ length: K }, (_, ci) => {
      const members = enrichedRows.filter((_, i) => assignments[i] === ci);
      const tamano = members.length;
      const avg = (sel: (m: ClientFeatures) => number) =>
        tamano > 0 ? members.reduce((s, m) => s + sel(m), 0) / tamano : 0;

      return {
        clusterIndex: ci,
        tamano,
        frecuenciaPromedio: avg((m) => m.frecuencia),
        ticketPromedio: avg((m) => m.ticketPromedio),
        proporcionMesa: avg((m) => m.proporcionMesa),
        recenciaPromedio: avg((m) => m.recenciaDias),
        miembros: [...members].sort((a, b) => b.frecuencia - a.frecuencia),
      };
    }).filter((c) => c.tamano > 0);

    const segmentos = this.etiquetarClusters(clusterStats).map((c) => {
      const meta = LABELS[c.label];
      return {
        nombre: meta.nombre,
        color: meta.color,
        descripcion: meta.descripcion,
        tamano: c.tamano,
        tamanoPct: Math.round((c.tamano / totalClientes) * 100),
        ticketPromedio: Math.round(c.ticketPromedio),
        frecuenciaPromedio: Math.round(c.frecuenciaPromedio * 10) / 10,
        tipoDominante: c.proporcionMesa >= 0.5 ? 'mesa' : 'domicilio',
        recenciaPromedioDias: Math.round(c.recenciaPromedio),
        clientes: c.miembros.map((m) => ({
          id: m.clienteId,
          nombre: m.nombre,
          email: m.email,
          frecuencia: m.frecuencia,
          ticketPromedio: Math.round(m.ticketPromedio),
          tipoDominante: m.proporcionMesa >= 0.5 ? 'mesa' : 'domicilio',
          recenciaDias: Math.round(m.recenciaDias),
          pcaX: m.pcaX,
          pcaY: m.pcaY,
        })),
      };
    });

    return {
      disponible: true,
      segmentosDetectados: segmentos.length,
      clientesAnalizados: totalClientes,
      indiceSilueta: Math.round(indiceSilueta * 100) / 100,
      segmentos: segmentos.sort((a, b) => b.tamano - a.tamano),
    };
  }

  // Los clústeres de K-Means no traen nombre: se etiquetan después según sus
  // propias estadísticas (no hay texto fijo por posición/índice), así que el
  // resultado se adapta a los datos reales en vez de forzar 4 nombres.
  private etiquetarClusters(
    clusterStats: ClusterStat[],
  ): Array<ClusterStat & { label: LabelKey }> {
    const restantes = [...clusterStats];
    const etiquetados: Array<ClusterStat & { label: LabelKey }> = [];

    const tomar = (
      comparador: (a: ClusterStat, b: ClusterStat) => number,
      label: LabelKey,
    ) => {
      if (!restantes.length) return;
      restantes.sort(comparador);
      const elegido = restantes.shift()!;
      etiquetados.push({ ...elegido, label });
    };

    // 1) Menor proporción de pedidos en mesa -> domicilio recurrente
    tomar((a, b) => a.proporcionMesa - b.proporcionMesa, 'domicilioRecurrente');
    // 2) De los que quedan, mayor frecuencia -> clientes frecuentes
    tomar((a, b) => b.frecuenciaPromedio - a.frecuenciaPromedio, 'frecuentes');
    // 3) De los que quedan, menor frecuencia -> ocasionales
    tomar((a, b) => a.frecuenciaPromedio - b.frecuenciaPromedio, 'ocasionales');
    // 4) El que sobra -> regulares en mesa
    tomar(() => 0, 'regularesMesa');

    return etiquetados;
  }
}
