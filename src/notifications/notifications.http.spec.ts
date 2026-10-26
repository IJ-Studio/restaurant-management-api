import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { CacheService } from '../cache/cache.service';
import jwtConfig from '../common/config/jwt.config';
import { ROLES } from '../common/constants/roles';
import { DeviceTokensService } from './device-tokens.service';
import { NotificationsController } from './notifications.controller';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();
const TOKEN = 'ExponentPushToken[abc123]';

describe('POST/DELETE /notifications/devices (HTTP)', () => {
  let app: INestApplication;
  let server: Server;
  const tokens: Record<string, string> = {};
  const deviceTokens = {
    register: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn().mockResolvedValue(undefined),
  };

  const sign = async (id: string, roleId: number) => {
    const tokenId = `tok-${id}`;
    await cache.set(`user-${id}`, tokenId);
    return jwt.signAsync(
      { id, email: 'x@quijote.mx', roleId, tokenId },
      { secret: SECRET, expiresIn: 60 },
    );
  };

  beforeAll(async () => {
    tokens.mesero = await sign('3', ROLES.MESERO);
    tokens.cocina = await sign('4', ROLES.COCINA);
    tokens.cliente = await sign('5', ROLES.CLIENTE);

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        { provide: DeviceTokensService, useValue: deviceTokens },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('sin token → 401', async () => {
    await request(server)
      .post('/notifications/devices')
      .send({ token: TOKEN, platform: 'android' })
      .expect(401);
    expect(deviceTokens.register).not.toHaveBeenCalled();
  });

  it('un cliente no registra dispositivos → 403', async () => {
    await request(server)
      .post('/notifications/devices')
      .set('Authorization', `Bearer ${tokens.cliente}`)
      .send({ token: TOKEN, platform: 'android' })
      .expect(403);
  });

  it('el personal registra su dispositivo → 204', async () => {
    await request(server)
      .post('/notifications/devices')
      .set('Authorization', `Bearer ${tokens.cocina}`)
      .send({ token: TOKEN, platform: 'android' })
      .expect(204);
    expect(deviceTokens.register).toHaveBeenCalledWith(4, {
      token: TOKEN,
      platform: 'android',
    });
  });

  it('un body con userId ajeno → 400', async () => {
    await request(server)
      .post('/notifications/devices')
      .set('Authorization', `Bearer ${tokens.mesero}`)
      .send({ token: TOKEN, platform: 'android', userId: 1 })
      .expect(400);
    expect(deviceTokens.register).not.toHaveBeenCalled();
  });

  it('un token que no es de Expo → 400', async () => {
    await request(server)
      .post('/notifications/devices')
      .set('Authorization', `Bearer ${tokens.mesero}`)
      .send({ token: '<script>alert(1)</script>', platform: 'android' })
      .expect(400);
  });

  it('al cerrar sesión da de baja el dispositivo del usuario → 204', async () => {
    await request(server)
      .delete(`/notifications/devices/${encodeURIComponent(TOKEN)}`)
      .set('Authorization', `Bearer ${tokens.mesero}`)
      .expect(204);
    expect(deviceTokens.unregister).toHaveBeenCalledWith(3, TOKEN);
  });
});
