import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // 👈 AGREGADO
import { APP_GUARD } from '@nestjs/core'; // 👈 AGREGADO
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
import { MesasModule } from './mesas/mesas.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { PredictiveDemandModule } from './predictive-demand/predictive-demand.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      envFilePath: `.env`,
    }),
    // ─── BLINDAJE CONTRA PETICIONES MASIVAS (RATE LIMITING) ───
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto (en milisegundos)
      limit: 40,  // Máximo 40 peticiones por minuto por cada IP / Cliente
    }]),
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
    OrdersModule,
    MesasModule,
    RecommendationsModule,
    PredictiveDemandModule,
  ],
   controllers: [],  // 👈 debe estar aquí

  providers: [
    // ─── PROVEE EL GUARD DE FORMA GLOBAL PARA TODAS LAS RUTAS ───
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
