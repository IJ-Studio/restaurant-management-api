import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import jwtConfig from '../common/config/jwt.config';
import { DatabaseModule } from '../database/database.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

/** Mismo arreglo de guards que OrdersModule (JwtAuthGuard + RolesGuard). */
@Module({
  imports: [DatabaseModule, AuthModule, ConfigModule.forFeature(jwtConfig)],
  controllers: [OperationsController],
  providers: [
    OperationsService,
    {
      provide: 'CONFIGURATION(jwt)',
      useFactory: (configService: ConfigService) =>
        configService.get<Record<string, unknown>>('jwt'),
      inject: [ConfigService],
    },
  ],
  exports: [OperationsService],
})
export class OperationsModule {}
