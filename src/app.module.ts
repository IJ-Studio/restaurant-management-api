import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { BackupsModule } from './backups/backups.module';
import { ReportsModule } from './reports/reports.module';
import { PlatillosModule } from './platillos/platillos.module';
import { ImportModule } from './reports/import/import.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { UsersModule } from './users/users.module';
import { MetricsModule } from './database/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    DatabaseModule,
    CacheModule,
    AuthModule,
    ScheduleModule.forRoot(),
    BackupsModule,
    ReportsModule,
    ImportModule,
    PlatillosModule,
    UsersModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
