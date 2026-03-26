import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * DbMetricsModule
 *
 * Módulo self-contained para las métricas de rendimiento de base de datos.
 * No necesita importar DatabaseModule porque DrizzleProvider es @Global()
 * y ya está disponible en toda la aplicación.
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
