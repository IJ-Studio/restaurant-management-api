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
      const payload = await this.jwtService.verifyAsync<
        ActiveUserData & { iat?: number }
      >(token, { secret: this.jwtConfiguration.secret });

      // La sesión vive en memoria: se pierde al cerrar sesión, al caducar o al reiniciar el servidor.
      const owner = (await this.cacheService.get(
        `session-${payload.tokenId}`,
      )) as string | null;
      if (owner !== payload.id) {
        throw new UnauthorizedException('Token no encontrado o expirado');
      }

      const revokedAt = (await this.cacheService.get(
        `revoked-${payload.id}`,
      )) as number | null;
      if (revokedAt && (payload.iat ?? 0) * 1000 <= revokedAt) {
        throw new UnauthorizedException('Token revocado');
      }

      // Los controladores leen el usuario por `REQUEST_USER_KEY` y por `request.user`.

      const target = request as Request & Record<string, unknown>;

      target[REQUEST_USER_KEY] = payload;

      target.user = payload;

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        (error instanceof Error && error.message) || 'Token inválido',
      );
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
