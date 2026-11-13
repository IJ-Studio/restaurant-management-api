import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // 👈 AGREGADO
import { APP_GUARD, APP_PIPE } from '@nestjs/core'; // 👈 AGREGADO
import { PagosModule } from './pagos/pagos.module';
import { ReservationsModule } from './reservations/reservations.module';
import { AuthModule } from './auth/auth.module';
import { BackupsModule } from './database/features/backups/backups.module';
import { ReportsModule } from './reports/reports.module';
import { PlatillosModule } from './platillos/platillos.module';
import { ImportModule } from './reports/import/import.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { UsersModule } from './users/users.module';
import { MetricsModule } from './database/features/metrics/metrics.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { OperationsModule } from './operations/operations.module';
import { MesasModule } from './mesas/mesas.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { PredictiveDemandModule } from './predictive-demand/predictive-demand.module';
import { PayrollModule } from './payroll/payroll.module';
import { DashboardModule } from './roles/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportesProblemasModule } from './reportes-problemas/reportes-problemas.module';
import { NormalizarPipe } from './common/normalizacion/normalizar.pipe';
import { FacturasAdminModule } from './facturas/facturas-admin.module';
import { InventarioModule } from './inventario/inventario.module';
import { PromocionesModule } from './promociones/promociones.module';
import { RegistrosEliminadosModule } from './registros-eliminados/registros-eliminados.module';
import { ImagenesModule } from './imagenes/imagenes.module';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      envFilePath: `.env`,
      validate: validateEnv,
    }),
    // ─── BLINDAJE CONTRA PETICIONES MASIVAS (RATE LIMITING) ───
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto (en milisegundos)
        // Por IP. Todo el personal del restaurante sale por la misma IP: subirlo en producción con
        // THROTTLE_LIMIT si hay 429 en hora pico (ver docs/rendimiento.md). Las pruebas de carga lo suben.
        limit: Number(process.env.THROTTLE_LIMIT) || 40,
      },
    ]),
    DatabaseModule,
    CacheModule,
    AuthModule,
    PagosModule,
    ReservationsModule,
    ScheduleModule.forRoot(),
    BackupsModule,
    ReportsModule,
    ImportModule,
    PlatillosModule,
    UsersModule,
    MetricsModule,
    MenuModule,
    DashboardModule,
    OrdersModule,
    OperationsModule,
    MesasModule,
    RecommendationsModule,
    PredictiveDemandModule,
    PayrollModule,
    NotificationsModule,
    ReportesProblemasModule,
    RegistrosEliminadosModule,
    PromocionesModule,
    InventarioModule,
    FacturasAdminModule,
    ImagenesModule,
  ],
  controllers: [],
  providers: [
    // ─── PROVEE EL GUARD DE FORMA GLOBAL PARA TODAS LAS RUTAS ───
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Normaliza los textos de cada cuerpo (trim, mayúsculas, correos) sin validar ni quitar campos.
    { provide: APP_PIPE, useClass: NormalizarPipe },
  ],
})
export class AppModule {}
