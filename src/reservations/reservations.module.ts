import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import jwtConfig from '../common/config/jwt.config';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ConfigModule.forFeature(jwtConfig), // Esto registra el provider 'jwt'
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    // Provider explícito para 'CONFIGURATION(jwt)'
    {
      provide: 'CONFIGURATION(jwt)',
      useFactory: (configService: ConfigService) => configService.get('jwt'),
      inject: [ConfigService],
    },
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
