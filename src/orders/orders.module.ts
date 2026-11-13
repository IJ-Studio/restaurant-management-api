import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReglasModule } from '../reglas/reglas.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderWorkflowService } from './order-workflow.service';
import { OrderEventsService } from './order-events.service';
import jwtConfig from '../common/config/jwt.config';

@Module({
  imports: [
    DatabaseModule,
    AuthModule, // 👈 Importa el módulo de autenticación (contiene JwtAuthGuard, RolesGuard, etc.)
    NotificationsModule, // avisos push al cambiar el estado del pedido (HU-07)
    ReglasModule, // horario de cocina y cantidades máximas (Fase 3)
    ConfigModule.forFeature(jwtConfig), // 👈 Hace disponible la configuración JWT
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderWorkflowService,
    OrderEventsService,
    // Provider explícito para 'CONFIGURATION(jwt)', igual que en ReservationsModule
    {
      provide: 'CONFIGURATION(jwt)',
      useFactory: (configService: ConfigService) =>
        configService.get<unknown>('jwt'),
      inject: [ConfigService],
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
