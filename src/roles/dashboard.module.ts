import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import jwtConfig from '../common/config/jwt.config';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ConfigModule.forFeature(jwtConfig),
    ReservationsModule,  // Necesario para usar ReservationsService
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: 'CONFIGURATION(jwt)',
      useFactory: (configService: ConfigService) => configService.get('jwt'),
      inject: [ConfigService],
    },
  ],
})
export class DashboardModule {}
