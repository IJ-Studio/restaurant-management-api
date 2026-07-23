import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import jwtConfig from '../common/config/jwt.config';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,                       // 👈 Importa el módulo de autenticación (contiene JwtAuthGuard, RolesGuard, etc.)
    ConfigModule.forFeature(jwtConfig), // 👈 Hace disponible la configuración JWT
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    // Provider explícito para 'CONFIGURATION(jwt)', igual que en ReservationsModule
    {
      provide: 'CONFIGURATION(jwt)',
      useFactory: (configService: ConfigService) => configService.get('jwt'),
      inject: [ConfigService],
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
