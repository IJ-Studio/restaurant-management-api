import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE } from '../constants';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Schema } from '../schema/index';
import {
  DBCpuMetricsDto,
  DBRWRatioDto,
  DBAutovacuumTableDto,
  DBStorageMetricsDto,
  DBHotTableDto,
  DBLatencyMetricsDto,
  DBConnectionMetricsDto,
  DBWaitEventDto,
  HistoryPointCpuDto,
  HistoryPointStorageDto,
  HistoryPointLatencyDto,
  HistoryPointConnectionDto,
} from './dto/metricsDTO';

// ─────────────────────────────────────────────────────────────────────────────
//  NOTA TÉCNICA — CPU en Supabase (PostgreSQL gestionado):
//
//  Las métricas reales de CPU del sistema operativo (/proc/stat, load average)
//  NO son accesibles vía SQL en un PostgreSQL gestionado (Supabase, RDS, etc.).
//  pg_stat_statements y pg_stat_activity son las únicas fuentes disponibles.
//
//  Esta implementación utiliza métricas REALES de PostgreSQL como proxy:
//    - totalPct   → % conexiones activas vs max_connections (carga relativa)
//    - postgresPct → % sesiones ejecutando queries activamente (active/total)
//    - loadAvg1m  → número absoluto de conexiones activas (similar a load avg)
//    - iowaitPct  → % sesiones esperando en eventos de tipo IO
//    - userPct    → % sesiones en estado 'active'
//    - systemPct  → % sesiones en transacción (idle in transaction)
//    - idlePct    → % sesiones completamente idle
//
//  Si se requieren métricas reales de CPU del SO, se debe integrar
//  un agente externo (Prometheus node_exporter, Datadog, etc.) y
//  exponer esas métricas como endpoint separado.
// ─────────────────────────────────────────────────────────────────────────────

// Almacén en memoria para los historiales de polling
// En producción esto podría moverse a Redis, pero para el caso de uso
// de este panel (single-instance NestJS) es suficiente y correcto.
const CPU_HISTORY: HistoryPointCpuDto[] = [];
const STORAGE_HISTORY: HistoryPointStorageDto[] = [];
const LATENCY_HISTORY: HistoryPointLatencyDto[] = [];
const CONNECTION_HISTORY: HistoryPointConnectionDto[] = [];
const MAX_HISTORY_POINTS = 60; // últimos 60 puntos

function pushHistory<T>(arr: T[], item: T): void {
  arr.push(item);
  if (arr.length > MAX_HISTORY_POINTS) arr.shift();
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<Schema>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  //  1) CPU — Métricas de actividad desde pg_stat_activity
  //
  //  Fuente: pg_stat_activity (vista estándar de PostgreSQL)
  //  Columnas usadas:
  //    - state: 'active' | 'idle' | 'idle in transaction' | 'fastpath function call' | null
  //    - wait_event_type: 'IO' | 'Lock' | 'LWLock' | 'Client' | 'CPU' | null
  //  Referencia: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW
  // ══════════════════════════════════════════════════════════════════════════
  async getCpuMetrics(): Promise<DBCpuMetricsDto> {
    const result = await this.db.execute(sql`
      WITH activity AS (
        SELECT
          state,
          wait_event_type,
          backend_type
        FROM pg_stat_activity
        -- Excluir el proceso walsender y autovacuum launcher que siempre están presentes
        WHERE backend_type NOT IN ('autovacuum launcher', 'walsender', 'background worker')
          AND pid <> pg_backend_pid()
      ),
      totals AS (
        SELECT
          COUNT(*)                                                        AS total,
          COUNT(*) FILTER (WHERE state = 'active')                       AS active_count,
          COUNT(*) FILTER (WHERE state = 'idle')                         AS idle_count,
          COUNT(*) FILTER (WHERE state LIKE 'idle in transaction%')      AS idle_in_tx_count,
          COUNT(*) FILTER (WHERE wait_event_type = 'IO')                 AS io_wait_count
        FROM activity
      ),
      max_conn AS (
        SELECT setting::int AS max_connections
        FROM pg_settings
        WHERE name = 'max_connections'
      )
      SELECT
        t.total,
        t.active_count,
        t.idle_count,
        t.idle_in_tx_count,
        t.io_wait_count,
        m.max_connections,
        -- % uso total relativo a max_connections
        ROUND(100.0 * t.total / NULLIF(m.max_connections, 0), 2)             AS total_pct,
        -- % sesiones activas del total de sesiones
        ROUND(100.0 * t.active_count / NULLIF(t.total, 0), 2)               AS postgres_pct,
        -- % sesiones en IO wait
        ROUND(100.0 * t.io_wait_count / NULLIF(t.total, 0), 2)              AS iowait_pct,
        -- % sesiones idle
        ROUND(100.0 * t.idle_count / NULLIF(t.total, 0), 2)                 AS idle_pct,
        -- % sesiones idle in transaction (overhead del sistema)
        ROUND(100.0 * t.idle_in_tx_count / NULLIF(t.total, 0), 2)           AS system_pct
      FROM totals t
      CROSS JOIN max_conn m
    `);

    const row = result[0] as any;
    const totalPct = parseFloat(row?.total_pct ?? '0') || 0;
    const postgresPct = parseFloat(row?.postgres_pct ?? '0') || 0;
    const iowaitPct = parseFloat(row?.iowait_pct ?? '0') || 0;
    const idlePct = parseFloat(row?.idle_pct ?? '0') || 0;
    const systemPct = parseFloat(row?.system_pct ?? '0') || 0;
    const userPct = Math.max(0, 100 - idlePct - systemPct - iowaitPct);
    const loadAvg1m = parseInt(row?.active_count ?? '0', 10);

    const ts = new Date().toISOString();
    pushHistory(CPU_HISTORY, { ts, totalPct, postgresPct });

    return {
      totalPct,
      postgresPct,
      loadAvg1m,
      iowaitPct,
      userPct: parseFloat(userPct.toFixed(2)),
      systemPct,
      idlePct,
      history: [...CPU_HISTORY],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  2) Lectura vs Escritura
  //
  //  Fuente: pg_stat_database
  //  Columnas:
  //    - tup_returned: filas devueltas por queries (seq scans + index scans)
  //    - tup_fetched:  filas obtenidas por index scans
  //    - tup_inserted: filas insertadas
  //    - tup_updated:  filas actualizadas
  //    - tup_deleted:  filas eliminadas
  //  Referencia: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-DATABASE-VIEW
  // ══════════════════════════════════════════════════════════════════════════
  async getRWRatio(): Promise<DBRWRatioDto> {
    const result = await this.db.execute(sql`
      SELECT
        SUM(tup_returned + tup_fetched)              AS reads,
        SUM(tup_inserted + tup_updated + tup_deleted) AS writes
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    const row = result[0] as any;
    const reads = parseInt(row?.reads ?? '0', 10) || 0;
    const writes = parseInt(row?.writes ?? '0', 10) || 0;
    const total = reads + writes;

    return {
      reads,
      writes,
      readPct: total > 0 ? parseFloat(((reads / total) * 100).toFixed(2)) : 0,
      writePct: total > 0 ? parseFloat(((writes / total) * 100).toFixed(2)) : 0,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3) Autovacuum
  //
  //  Fuentes:
  //    - pg_stat_user_tables: estadísticas de tuplas y vacuum por tabla
  //      Columnas: relname, last_autovacuum, last_autoanalyze,
  //                n_dead_tup, n_live_tup
  //    - pg_stat_progress_vacuum: procesos de vacuum en ejecución
  //      Columna relid para JOIN con pg_stat_user_tables.relid
  //  Referencia: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-USER-TABLES-VIEW
  //              https://www.postgresql.org/docs/current/progress-reporting.html#VACUUM-PROGRESS-REPORTING
  // ══════════════════════════════════════════════════════════════════════════
  async getAutovacuum(): Promise<DBAutovacuumTableDto[]> {
    const result = await this.db.execute(sql`
      SELECT
        t.relname                                                     AS table_name,
        t.last_autovacuum,
        t.last_autoanalyze,
        t.n_dead_tup                                                  AS dead_tuples,
        t.n_live_tup                                                  AS live_tuples,
        -- % dead tuples sobre el total de tuplas (vivas + muertas)
        ROUND(
          100.0 * t.n_dead_tup / NULLIF(t.n_live_tup + t.n_dead_tup, 0),
          2
        )                                                             AS dead_pct,
        -- Determinar si hay un proceso de vacuum en ejecución para esta tabla
        EXISTS (
          SELECT 1
          FROM pg_stat_progress_vacuum v
          WHERE v.relid = t.relid
        )                                                             AS vacuum_running,
        -- Minutos desde el último autovacuum
        CASE
          WHEN t.last_autovacuum IS NOT NULL
          THEN ROUND(EXTRACT(EPOCH FROM (NOW() - t.last_autovacuum)) / 60)::int
          ELSE NULL
        END                                                           AS minutes_since_vacuum
      FROM pg_stat_user_tables t
      ORDER BY t.n_dead_tup DESC
      LIMIT 50
    `);

    return (result as any[]).map((row) => ({
      tableName: row.table_name,
      lastAutovacuum: row.last_autovacuum
        ? new Date(row.last_autovacuum).toISOString()
        : null,
      lastAutoanalyze: row.last_autoanalyze
        ? new Date(row.last_autoanalyze).toISOString()
        : null,
      deadTuples: parseInt(row.dead_tuples ?? '0', 10),
      liveTuples: parseInt(row.live_tuples ?? '0', 10),
      deadPct: parseFloat(row.dead_pct ?? '0') || 0,
      vacuumRunning: row.vacuum_running === true || row.vacuum_running === 't',
      minutesSinceVacuum:
        row.minutes_since_vacuum !== null &&
        row.minutes_since_vacuum !== undefined
          ? parseInt(row.minutes_since_vacuum, 10)
          : null,
    }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  4) Almacenamiento
  //
  //  Fuentes:
  //    - pg_database_size(current_database()): tamaño total de la BD
  //    - pg_total_relation_size(): tamaño total de relación (tabla + índices + TOAST)
  //    - pg_relation_size(): tamaño de la tabla (heap) solamente
  //    - pg_indexes_size(): tamaño de índices
  //  Referencia: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE
  //
  //  Crecimiento en 24h: diferencia entre el tamaño actual y el promedio
  //  calculado desde pg_stat_database (blks_read * block_size como proxy).
  //  NOTA: En Supabase no hay acceso a snapshots históricos de tamaño,
  //  por lo que el crecimiento 24h es una estimación basada en el historial
  //  en memoria del proceso NestJS.
  // ══════════════════════════════════════════════════════════════════════════
  async getStorage(): Promise<DBStorageMetricsDto> {
    const result = await this.db.execute(sql`
      WITH db_size AS (
        SELECT
          pg_database_size(current_database())                          AS total_bytes
      ),
      table_stats AS (
        SELECT
          SUM(pg_relation_size(relid))                                  AS tables_bytes,
          SUM(pg_indexes_size(relid))                                   AS indexes_bytes,
          -- TOAST: total - heap - indices
          SUM(
            pg_total_relation_size(relid)
            - pg_relation_size(relid)
            - pg_indexes_size(relid)
          )                                                             AS toast_bytes
        FROM pg_stat_user_tables
      )
      SELECT
        d.total_bytes,
        COALESCE(t.tables_bytes, 0)                                     AS tables_bytes,
        COALESCE(t.indexes_bytes, 0)                                    AS indexes_bytes,
        COALESCE(GREATEST(t.toast_bytes, 0), 0)                         AS toast_bytes
      FROM db_size d
      CROSS JOIN table_stats t
    `);

    const row = result[0] as any;
    const totalMB = parseFloat(
      (parseInt(row?.total_bytes ?? '0', 10) / 1024 / 1024).toFixed(2),
    );
    const tablesMB = parseFloat(
      (parseInt(row?.tables_bytes ?? '0', 10) / 1024 / 1024).toFixed(2),
    );
    const indexesMB = parseFloat(
      (parseInt(row?.indexes_bytes ?? '0', 10) / 1024 / 1024).toFixed(2),
    );
    const toastMB = parseFloat(
      (parseInt(row?.toast_bytes ?? '0', 10) / 1024 / 1024).toFixed(2),
    );

    const ts = new Date().toISOString();
    pushHistory(STORAGE_HISTORY, { ts, totalMB });

    // Calcular crecimiento 24h desde el historial en memoria
    const growth24hMB =
      STORAGE_HISTORY.length >= 2
        ? parseFloat(
            Math.max(0, totalMB - STORAGE_HISTORY[0].totalMB).toFixed(2),
          )
        : 0;

    return {
      totalMB,
      tablesMB,
      indexesMB,
      toastMB,
      growth24hMB,
      history: [...STORAGE_HISTORY],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  5) Tablas más leídas/modificadas (Hot Tables)
  //
  //  Fuente: pg_stat_user_tables
  //  Columnas:
  //    - seq_scan:    número de seq scans iniciados en la tabla
  //    - idx_scan:    número de index scans iniciados
  //    - tup_returned: filas devueltas por seq scans
  //    - tup_fetched:  filas devueltas por index scans (live rows)
  //    - tup_inserted, tup_updated, tup_deleted: filas modificadas
  //  Referencia: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-USER-TABLES-VIEW
  // ══════════════════════════════════════════════════════════════════════════
  async getHotTables(): Promise<DBHotTableDto[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT
          t.relname                                                     AS table_name,
          COALESCE(t.seq_scan, 0)                                       AS seq_scan,
          COALESCE(t.idx_scan, 0)                                       AS idx_scan,
          COALESCE(t.seq_tup_read, 0) + COALESCE(t.idx_tup_fetch, 0)   AS tup_returned,
          COALESCE(t.n_tup_ins, 0) + COALESCE(t.n_tup_upd, 0)
            + COALESCE(t.n_tup_del, 0)                                 AS tup_modified,
          COALESCE(t.seq_scan, 0) + COALESCE(t.idx_scan, 0)
            + COALESCE(t.seq_tup_read, 0) + COALESCE(t.idx_tup_fetch, 0)
            + COALESCE(t.n_tup_ins, 0) + COALESCE(t.n_tup_upd, 0)
            + COALESCE(t.n_tup_del, 0)                                 AS total_ops,
        LIMIT 20
      `);

      return (result as any[]).map((row) => ({
        tableName: row.table_name,
        seqScan: parseInt(row.seq_scan ?? '0', 10),
        idxScan: parseInt(row.idx_scan ?? '0', 10),
        tupReturned: parseInt(row.tup_returned ?? '0', 10),
        tupModified: parseInt(row.tup_modified ?? '0', 10),
        totalOps: parseInt(row.total_ops ?? '0', 10),
        sizeMB: parseFloat(row.size_mb ?? '0') || 0,
      }));
    } catch (error) {
      this.logger.error('Error obteniendo hot tables:', error);
      // Devolver array vacío en caso de error
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  6) Latencia por tipo de operación
  //
  //  Fuente: pg_stat_statements (requiere extensión habilitada)
  //  Columnas:
  //    - query:          texto normalizado de la query (parameterizado)
  //    - calls:          número de ejecuciones
  //    - mean_exec_time: latencia promedio en ms (disponible desde PG 13)
  //    - min_exec_time:  mínima latencia (para percentiles aproximados)
  //    - max_exec_time:  máxima latencia
  //    - stddev_exec_time: desviación estándar de latencia
  //
  //  NOTA SOBRE PERCENTILES:
  //  pg_stat_statements NO almacena distribuciones, por lo que p95/p99 exactos
  //  no son calculables directamente. Se usan las fórmulas de aproximación
  //  estadística estándar basadas en mean + stddev:
  //    - p95 ≈ mean + 1.645 * stddev
  //    - p99 ≈ mean + 2.326 * stddev
  //  Esto es una estimación válida asumiendo distribución aproximadamente normal.
  //  Para percentiles exactos se requeriría pg_stat_monitor o timescaledb.
  //
  //  La detección del tipo de operación se hace via UPPER(LEFT(query, 6)):
  //  pg_stat_statements normaliza queries pero mantiene el verbo SQL al inicio.
  //
  //  Referencia: https://www.postgresql.org/docs/current/pgstatstatements.html
  // ══════════════════════════════════════════════════════════════════════════
  async getLatency(): Promise<DBLatencyMetricsDto> {
    // Verificar que pg_stat_statements esté disponible
    const extCheck = await this.db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_stat_statements'
      ) AS available
    `);
    const available =
      (extCheck[0] as any)?.available === true ||
      (extCheck[0] as any)?.available === 't';

    const emptyEntry = { avgMs: 0, p95Ms: 0, p99Ms: 0 };

    if (!available) {
      this.logger.warn(
        'pg_stat_statements no está instalado. Latency endpoint retorna ceros. ' +
          'Ejecutar: CREATE EXTENSION pg_stat_statements; en la base de datos.',
      );
      return {
        SELECT: emptyEntry,
        INSERT: emptyEntry,
        UPDATE: emptyEntry,
        DELETE: emptyEntry,
        history: [...LATENCY_HISTORY],
      };
    }

    const result = await this.db.execute(sql`
      SELECT
        -- Extraer el primer token de la query normalizada como tipo de operación.
        -- pg_stat_statements normaliza el texto pero preserva el verbo SQL inicial.
        UPPER(TRIM(SPLIT_PART(TRIM(query), ' ', 1)))              AS op_type,
        -- mean_exec_time está en milisegundos (desde PG 13)
        ROUND(AVG(mean_exec_time)::numeric, 3)                    AS avg_ms,
        -- p95 y p99 aproximados con media + z-score * desviación estándar
        -- Fórmula estándar para distribuciones aproximadamente normales
        ROUND((AVG(mean_exec_time) + 1.645 * AVG(stddev_exec_time))::numeric, 3) AS p95_ms,
        ROUND((AVG(mean_exec_time) + 2.326 * AVG(stddev_exec_time))::numeric, 3) AS p99_ms
      FROM pg_stat_statements
      WHERE
        -- Filtrar solo queries planificables (SELECT, INSERT, UPDATE, DELETE)
        UPPER(TRIM(SPLIT_PART(TRIM(query), ' ', 1))) IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        AND calls > 0
        AND mean_exec_time > 0
        -- Limitar a la base de datos actual
        AND dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      GROUP BY op_type
    `);

    const byType: Record<
      string,
      { avgMs: number; p95Ms: number; p99Ms: number }
    > = {};

    for (const row of result as any[]) {
      const op = String(row.op_type).toUpperCase();
      byType[op] = {
        avgMs: Math.max(0, parseFloat(row.avg_ms ?? '0') || 0),
        p95Ms: Math.max(0, parseFloat(row.p95_ms ?? '0') || 0),
        p99Ms: Math.max(0, parseFloat(row.p99_ms ?? '0') || 0),
      };
    }

    const selectEntry = byType['SELECT'] ?? emptyEntry;
    const insertEntry = byType['INSERT'] ?? emptyEntry;
    const updateEntry = byType['UPDATE'] ?? emptyEntry;
    const deleteEntry = byType['DELETE'] ?? emptyEntry;

    const ts = new Date().toISOString();
    pushHistory(LATENCY_HISTORY, {
      ts,
      SELECT: selectEntry.avgMs,
      INSERT: insertEntry.avgMs,
      UPDATE: updateEntry.avgMs,
      DELETE: deleteEntry.avgMs,
    });

    return {
      SELECT: selectEntry,
      INSERT: insertEntry,
      UPDATE: updateEntry,
      DELETE: deleteEntry,
      history: [...LATENCY_HISTORY],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  7) Conexiones activas
  //
  //  Fuente: pg_stat_activity + pg_settings
  //  Columnas de pg_stat_activity:
  //    - state: 'active' | 'idle' | 'idle in transaction' | 'idle in transaction (aborted)'
  //    - wait_event_type + wait_event: para detectar backends en espera
  //  pg_settings: max_connections (límite configurado del servidor)
  //  Referencia: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW
  // ══════════════════════════════════════════════════════════════════════════
  async getConnections(): Promise<DBConnectionMetricsDto> {
    const result = await this.db.execute(sql`
      WITH activity AS (
        SELECT state, wait_event_type, wait_event, backend_type
        FROM pg_stat_activity
        -- Incluir todas las conexiones de usuarios (excluir procesos internos de PG)
        WHERE backend_type = 'client backend'
      ),
      counts AS (
        SELECT
          COUNT(*)                                                         AS total,
          COUNT(*) FILTER (WHERE state = 'active')                        AS active,
          COUNT(*) FILTER (WHERE state = 'idle')                          AS idle,
          COUNT(*) FILTER (WHERE state LIKE 'idle in transaction%')       AS idle_in_tx,
          -- 'waiting' = tiene un wait_event activo que NO sea Client (IO, Lock, LWLock)
          COUNT(*) FILTER (
            WHERE wait_event_type IS NOT NULL
              AND wait_event_type <> 'Client'
              AND state = 'active'
          )                                                                AS waiting
        FROM activity
      ),
      max_conn AS (
        SELECT setting::int AS max_connections
        FROM pg_settings
        WHERE name = 'max_connections'
      )
      SELECT
        c.total,
        c.active,
        c.idle,
        c.idle_in_tx,
        c.waiting,
        m.max_connections,
        ROUND(100.0 * c.total / NULLIF(m.max_connections, 0), 2) AS usage_pct
      FROM counts c
      CROSS JOIN max_conn m
    `);

    const row = result[0] as any;
    const total = parseInt(row?.total ?? '0', 10);
    const active = parseInt(row?.active ?? '0', 10);
    const idle = parseInt(row?.idle ?? '0', 10);
    const idleInTx = parseInt(row?.idle_in_tx ?? '0', 10);
    const waiting = parseInt(row?.waiting ?? '0', 10);
    const maxConnections = parseInt(row?.max_connections ?? '100', 10);
    const usagePct = parseFloat(row?.usage_pct ?? '0') || 0;

    const ts = new Date().toISOString();
    pushHistory(CONNECTION_HISTORY, { ts, total, active });

    return {
      active,
      idle,
      idleInTx,
      waiting,
      total,
      maxConnections,
      usagePct,
      history: [...CONNECTION_HISTORY],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  8) Wait Events — Distribución del tiempo de espera
  //
  //  Fuente: pg_stat_activity
  //  Columnas:
  //    - wait_event_type: categoría del evento de espera
  //      Valores posibles (PostgreSQL docs):
  //        'Activity'  → proceso en espera de actividad de cliente
  //        'BufferPin' → esperando un pin de buffer
  //        'Client'    → esperando datos del cliente (network idle)
  //        'Extension' → evento de extensión
  //        'IO'        → I/O de disco
  //        'IPC'       → comunicación entre procesos PG
  //        'Lock'      → lock heavyweight (tabla, fila, etc.)
  //        'LWLock'    → lock lightweight interno de PG
  //        'Timeout'   → timeout configurado
  //        NULL        → CPU / sin evento de espera (trabajando activamente)
  //
  //  El frontend espera categorías: 'CPU', 'IO', 'Lock', 'LWLock', 'Client'
  //  Mapeamos wait_event_type NULL → 'CPU' (sesión activa sin espera = usando CPU)
  //
  //  Referencia: https://www.postgresql.org/docs/current/monitoring-stats.html#WAIT-EVENT-TABLE
  // ══════════════════════════════════════════════════════════════════════════
  async getWaitEvents(): Promise<DBWaitEventDto[]> {
    const result = await this.db.execute(sql`
      WITH wait_data AS (
        SELECT
          -- Mapear categorías de wait_event_type a las 5 del frontend
          CASE
            WHEN wait_event_type IS NULL AND state = 'active'  THEN 'CPU'
            WHEN wait_event_type = 'IO'                        THEN 'IO'
            WHEN wait_event_type = 'Lock'                      THEN 'Lock'
            WHEN wait_event_type = 'LWLock'                    THEN 'LWLock'
            WHEN wait_event_type = 'Client'                    THEN 'Client'
            ELSE NULL  -- Ignorar categorías no relevantes (IPC, Timeout, etc.)
          END AS category,
          COUNT(*) AS cnt
        FROM pg_stat_activity
        WHERE backend_type = 'client backend'
          AND state IS NOT NULL
        GROUP BY category
      ),
      total AS (
        SELECT SUM(cnt) AS grand_total FROM wait_data WHERE category IS NOT NULL
      )
      SELECT
        w.category,
        w.cnt,
        ROUND(100.0 * w.cnt / NULLIF(t.grand_total, 0), 2) AS pct
      FROM wait_data w
      CROSS JOIN total t
      WHERE w.category IS NOT NULL
      ORDER BY w.cnt DESC
    `);

    return (result as any[]).map((row) => ({
      category: row.category,
      pct: parseFloat(row.pct ?? '0') || 0,
      count: parseInt(row.cnt ?? '0', 10),
    }));
  }
}
