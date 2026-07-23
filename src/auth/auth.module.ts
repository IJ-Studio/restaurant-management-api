import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
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
  controllers: [AuthController], // ✅ CORREGIDO
  providers: [
    AuthService,
    BcryptService,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    JwtModule,
    BcryptService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
