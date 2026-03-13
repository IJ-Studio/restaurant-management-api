import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { BackupsModule } from './backups/backups.module';
import { ReportsModule } from './reports/reports.module';
import { PlatillosModule } from './platillos/platillos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    BackupsModule,
    ReportsModule,
    PlatillosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
