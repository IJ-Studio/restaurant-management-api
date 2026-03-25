import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Request } from 'express';

import jwtConfig from 'src/common/config/jwt.config';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/cache/cache.service';
import { Reflector } from '@nestjs/core';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';
import { REQUEST_USER_KEY } from 'src/common/constants';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.getToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autorización es requerido');
    }

    try {
      const payload = await this.jwtService.verifyAsync<ActiveUserData>(token, {
        secret: this.jwtConfiguration.secret,
      });

      console.log('✅ JWT válido:', payload);

      const cachedTokenId = await this.cacheService.get(`user-${payload.id}`);

      console.log(`🔍 Buscando en caché: user-${payload.id}`);
      console.log('🔍 TokenId en JWT:', payload.tokenId);
      console.log('🔍 TokenId en caché:', cachedTokenId);

      if (!cachedTokenId) {
        console.error('❌ Token no encontrado en caché');
        throw new UnauthorizedException('Token no encontrado o expirado');
      }

      if (cachedTokenId !== payload.tokenId) {
        console.error('❌ TokenId no coincide');
        throw new UnauthorizedException('Token revocado');
      }

      (request as any)[REQUEST_USER_KEY] = payload;
      (request as any).user = payload;

      console.log('✅ Usuario asignado a request.user:', (request as any).user);

      return true;
    } catch (error: any) {
      console.error('❌ Error en Autorización:', error.message);
      throw new UnauthorizedException(error.message || 'Token inválido');
    }
  }

  private getToken(request: Request): string | undefined {
    const authHeader = request.headers['authorization'];

    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer') {
      throw new UnauthorizedException('Formato de token inválido');
    }

    return token;
  }
}
