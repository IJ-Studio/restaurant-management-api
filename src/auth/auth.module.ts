import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { DashboardController } from '../roles/dashboard.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guards';

import jwtConfig from 'src/common/config/jwt.config';
import { DatabaseModule } from 'src/database/database.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    DatabaseModule,
    CacheModule,
  ],
  controllers: [AuthController, DashboardController],
  providers: [
    AuthService,
    BcryptService,
    JwtAuthGuard, // <-- 👈 Agrega el guard como provider explícito
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    JwtModule,
    BcryptService,
    JwtAuthGuard, // <-- 👈 Ahora se puede exportar
  ],
})
export class AuthModule {}
