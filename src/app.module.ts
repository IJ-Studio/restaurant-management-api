import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // Asegúrate de tener esto
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { LoggerMiddleware } from '../common/middleware/logger.middleware';
import { BackupsModule } from './backups/backups.module';
import { PlatillosModule } from './platillos/platillos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    // ─── ACTIVA EL MOTOR DE CRON ──────────────────────────────────────────
    ScheduleModule.forRoot(), // Esto es vital para que el decorador @Cron funcione
    // ──────────────────────────────────────────────────────────────────────
    DatabaseModule,
    AuthModule,
    PlatillosModule,
    BackupsModule, // Tu módulo de backups para el restaurante
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
