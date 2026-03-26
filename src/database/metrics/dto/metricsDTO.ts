import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================
//  DTOs — Contratos de respuesta del módulo db-metrics
//  Mapean 1:1 con los tipos TypeScript del frontend
// ============================================================

export class HistoryPointCpuDto {
  ts: string;
  totalPct: number;
  postgresPct: number;
}

export class DBCpuMetricsDto {
  /** % de backends activos vs max_connections (proxy de carga) */
  totalPct: number;
  /** % backends en estado 'active' (ejecutando query activamente) */
  postgresPct: number;
  /** Número de conexiones activas (sin unidad, load-style) */
  loadAvg1m: number;
  /** % sesiones esperando en I/O (wait_event_type = 'IO') */
  iowaitPct: number;
  /** % sesiones en estado 'active' con CPU real */
  userPct: number;
  /** % sesiones en estado interno del sistema */
  systemPct: number;
  /** % sesiones idle */
  idlePct: number;
  history: HistoryPointCpuDto[];
}

export class DBRWRatioDto {
  reads: number;
  writes: number;
  readPct: number;
  writePct: number;
}

export class DBAutovacuumTableDto {
  tableName: string;
  lastAutovacuum: string | null;
  lastAutoanalyze: string | null;
  deadTuples: number;
  liveTuples: number;
  deadPct: number;
  vacuumRunning: boolean;
  minutesSinceVacuum: number | null;
}

export class HistoryPointStorageDto {
  ts: string;
  totalMB: number;
}

export class DBStorageMetricsDto {
  totalMB: number;
  tablesMB: number;
  indexesMB: number;
  toastMB: number;
  growth24hMB: number;
  history: HistoryPointStorageDto[];
}

export class DBHotTableDto {
  tableName: string;
  seqScan: number;
  idxScan: number;
  tupReturned: number;
  tupModified: number;
  totalOps: number;
  sizeMB: number;
}

export class DBLatencyEntryDto {
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
}

export class HistoryPointLatencyDto {
  ts: string;
  SELECT: number;
  INSERT: number;
  UPDATE: number;
  DELETE: number;
}

export class DBLatencyMetricsDto {
  SELECT: DBLatencyEntryDto;
  INSERT: DBLatencyEntryDto;
  UPDATE: DBLatencyEntryDto;
  DELETE: DBLatencyEntryDto;
  history: HistoryPointLatencyDto[];
}

export class HistoryPointConnectionDto {
  ts: string;
  total: number;
  active: number;
}

export class DBConnectionMetricsDto {
  active: number;
  idle: number;
  idleInTx: number;
  waiting: number;
  total: number;
  maxConnections: number;
  usagePct: number;
  history: HistoryPointConnectionDto[];
}

export class DBWaitEventDto {
  category: string;
  pct: number;
  count: number;
}
