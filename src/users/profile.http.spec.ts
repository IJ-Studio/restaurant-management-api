import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { CacheService } from '../cache/cache.service';
import jwtConfig from '../common/config/jwt.config';
import { ROLES } from '../common/constants/roles';
import { PrivacyService } from './privacy.service';
import { ProfileController } from './profile.controller';
import { UsersService } from './users.service';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

describe('Derechos ARCO: /profile y /account (HTTP)', () => {
  let app: INestApplication;
  let server: Server;
  let token: string;
  const usersService = {
    getPublicUserById: jest.fn().mockResolvedValue({ id: 3, name: 'ANA' }),
    updateUser: jest.fn().mockResolvedValue({ id: 3, name: 'ANA MARÍA' }),
  };
  const privacyService = {
    getState: jest.fn().mockResolvedValue({ notificacionesPush: true }),
    update: jest.fn().mockResolvedValue({ notificacionesPush: false }),
    deleteOwnAccount: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    await cache.set('session-tok-3', '3');
    token = await jwt.signAsync(
      {
        id: '3',
        email: 'x@quijote.mx',
        roleId: ROLES.MESERO,
        tokenId: 'tok-3',
      },
      { secret: SECRET, expiresIn: 60 },
    );

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [ProfileController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        { provide: UsersService, useValue: usersService },
        { provide: PrivacyService, useValue: privacyService },
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

  it.each([
    ['get', '/profile'],
    ['put', '/profile'],
    ['get', '/profile/privacidad'],
    ['put', '/profile/privacidad'],
    ['delete', '/profile'],
    ['delete', '/account'],
  ] as const)('%s %s sin token → 401', async (method, path) => {
    await request(server)[method](path).send({}).expect(401);
    expect(privacyService.deleteOwnAccount).not.toHaveBeenCalled();
  });

  it('Acceso: GET /profile devuelve la cuenta del token', async () => {
    const res = await request(server)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ id: 3, name: 'ANA' });
    expect(usersService.getPublicUserById).toHaveBeenCalledWith(3, 3);
  });

  it('Rectificación: PUT /profile edita solo la cuenta del token', async () => {
    await request(server)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana María' })
      .expect(200);

    const [id, dto, requesterId] = usersService.updateUser.mock.calls[0] as [
      number,
      Record<string, unknown>,
      number,
    ];
    expect([id, requesterId]).toEqual([3, 3]);
    expect(Object.keys(dto)).toEqual(['name']);
  });

  it('Rectificación: rol, id o cualquier campo ajeno al perfil → 400', async () => {
    await request(server)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ana', roleId: ROLES.ADMIN, id: 99 })
      .expect(400);
    expect(usersService.updateUser).not.toHaveBeenCalled();
  });

  it('Oposición: PUT /profile/privacidad registra la preferencia', async () => {
    await request(server)
      .put('/profile/privacidad')
      .set('Authorization', `Bearer ${token}`)
      .send({ origen: 'movil', notificacionesPush: false })
      .expect(200);

    expect(privacyService.update).toHaveBeenCalledWith(3, {
      origen: 'movil',
      notificacionesPush: false,
    });
  });

  it('Oposición: un origen desconocido o un campo de más → 400', async () => {
    await request(server)
      .put('/profile/privacidad')
      .set('Authorization', `Bearer ${token}`)
      .send({ origen: 'otro', notificacionesPush: false })
      .expect(400);
    await request(server)
      .put('/profile/privacidad')
      .set('Authorization', `Bearer ${token}`)
      .send({ origen: 'web', userId: 99 })
      .expect(400);
    expect(privacyService.update).not.toHaveBeenCalled();
  });

  it.each(['/account', '/profile'])(
    'Cancelación: DELETE %s con contraseña → 204',
    async (path) => {
      await request(server)
        .delete(path)
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'Prueba#2026' })
        .expect(204);

      expect(privacyService.deleteOwnAccount).toHaveBeenCalledWith(
        3,
        'Prueba#2026',
      );
    },
  );

  it('Cancelación: sin contraseña → 400 y no se borra nada', async () => {
    await request(server)
      .delete('/account')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    expect(privacyService.deleteOwnAccount).not.toHaveBeenCalled();
  });
});
