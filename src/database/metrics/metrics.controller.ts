import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Public } from 'src/auth/decorators/public.decorator';
import {
  DBCpuMetricsDto,
  DBRWRatioDto,
  DBAutovacuumTableDto,
  DBStorageMetricsDto,
  DBHotTableDto,
  DBLatencyMetricsDto,
  DBConnectionMetricsDto,
  DBWaitEventDto,
} from './dto/metricsDTO';

/**
 * DbMetricsController
 *
 * Expone los 8 endpoints que el panel de rendimiento de base de datos
 * del frontend consume vía polling periódico.
 *
 * Todos los endpoints son GET y no reciben parámetros por ahora.
 * El frontend maneja la frecuencia de refresco con su propio hook usePolling().
 *
 * Prefijo base: /db-metrics  (el módulo lo registra sin prefijo global,
 * y el frontend lo llama como /api/db-metrics/... via NEXT_PUBLIC_API_URL)
 */
@Public()
@Controller('db-metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly dbMetricsService: MetricsService) {}

  // ── 1) CPU ─────────────────────────────────────────────────────────────────
  @Get('cpu')
  @HttpCode(HttpStatus.OK)
  async getCpu(): Promise<DBCpuMetricsDto> {
    try {
      return await this.dbMetricsService.getCpuMetrics();
    } catch (err) {
      this.logger.error('Error obteniendo métricas de CPU', err);
      throw new InternalServerErrorException(
        'No se pudieron obtener métricas de CPU',
      );
    }
  }

  // ── 2) Lectura vs Escritura ─────────────────────────────────────────────────
  @Get('rw-ratio')
  @HttpCode(HttpStatus.OK)
  async getRWRatio(): Promise<DBRWRatioDto> {
    try {
      return await this.dbMetricsService.getRWRatio();
    } catch (err) {
      this.logger.error('Error obteniendo ratio R/W', err);
      throw new InternalServerErrorException(
        'No se pudo obtener el ratio lectura/escritura',
      );
    }
  }

  // ── 3) Autovacuum ───────────────────────────────────────────────────────────
  @Get('autovacuum')
  @HttpCode(HttpStatus.OK)
  async getAutovacuum(): Promise<DBAutovacuumTableDto[]> {
    try {
      return await this.dbMetricsService.getAutovacuum();
    } catch (err) {
      this.logger.error('Error obteniendo estado de autovacuum', err);
      throw new InternalServerErrorException(
        'No se pudo obtener el estado de autovacuum',
      );
    }
  }

  // ── 4) Almacenamiento ───────────────────────────────────────────────────────
  @Get('storage')
  @HttpCode(HttpStatus.OK)
  async getStorage(): Promise<DBStorageMetricsDto> {
    try {
      return await this.dbMetricsService.getStorage();
    } catch (err) {
      this.logger.error('Error obteniendo métricas de almacenamiento', err);
      throw new InternalServerErrorException(
        'No se pudieron obtener métricas de almacenamiento',
      );
    }
  }

  // ── 5) Tablas calientes ─────────────────────────────────────────────────────
  @Get('hot-tables')
  @HttpCode(HttpStatus.OK)
  async getHotTables(): Promise<DBHotTableDto[]> {
    try {
      return await this.dbMetricsService.getHotTables();
    } catch (err) {
      this.logger.error('Error obteniendo tablas con mayor carga', err);
      throw new InternalServerErrorException(
        'No se pudieron obtener las tablas con mayor carga',
      );
    }
  }

  // ── 6) Latencia por tipo de operación ───────────────────────────────────────
  @Get('latency')
  @HttpCode(HttpStatus.OK)
  async getLatency(): Promise<DBLatencyMetricsDto> {
    try {
      return await this.dbMetricsService.getLatency();
    } catch (err) {
      this.logger.error('Error obteniendo métricas de latencia', err);
      throw new InternalServerErrorException(
        'No se pudieron obtener métricas de latencia',
      );
    }
  }

  // ── 7) Conexiones ───────────────────────────────────────────────────────────
  @Get('connections')
  @HttpCode(HttpStatus.OK)
  async getConnections(): Promise<DBConnectionMetricsDto> {
    try {
      return await this.dbMetricsService.getConnections();
    } catch (err) {
      this.logger.error('Error obteniendo métricas de conexiones', err);
      throw new InternalServerErrorException(
        'No se pudieron obtener métricas de conexiones',
      );
    }
  }

  // ── 8) Wait Events ──────────────────────────────────────────────────────────
  @Get('wait-events')
  @HttpCode(HttpStatus.OK)
  async getWaitEvents(): Promise<DBWaitEventDto[]> {
    try {
      return await this.dbMetricsService.getWaitEvents();
    } catch (err) {
      this.logger.error('Error obteniendo wait events', err);
      throw new InternalServerErrorException(
        'No se pudieron obtener los wait events',
      );
    }
  }
}
