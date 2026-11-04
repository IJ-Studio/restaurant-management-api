import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { CacheService } from '../cache/cache.service';
import jwtConfig from '../common/config/jwt.config';
import { ROLES } from '../common/constants/roles';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

describe('GET /reservations por rol (HTTP)', () => {
  let app: INestApplication;
  let server: Server;
  const tokens: Record<string, string> = {};

  const sign = async (id: string, roleId: number) => {
    const tokenId = `tok-${id}`;
    await cache.set(`user-${id}`, tokenId);
    return jwt.signAsync(
      { id, email: 'x@quijote.mx', roleId, tokenId },
      { secret: SECRET, expiresIn: 60 },
    );
  };

  beforeAll(async () => {
    tokens.admin = await sign('1', ROLES.ADMIN);
    tokens.cajero = await sign('2', ROLES.CAJERO);
    tokens.mesero = await sign('3', ROLES.MESERO);
    tokens.cocina = await sign('4', ROLES.COCINA);
    tokens.cliente = await sign('5', ROLES.CLIENTE);

    const moduleRef = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        Reflector,
        JwtAuthGuard,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        {
          provide: ReservationsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sin token → 401', async () => {
    await request(server).get('/reservations').expect(401);
  });

  it.each(['admin', 'cajero', 'mesero'])(
    'el listado está abierto a %s → 200',
    async (role) => {
      await request(server)
        .get('/reservations?fechaDesde=2026-10-26T00:00:00.000Z')
        .set('Authorization', `Bearer ${tokens[role]}`)
        .expect(200);
    },
  );

  it.each(['cocina', 'cliente'])('%s no ve el listado → 403', async (role) => {
    await request(server)
      .get('/reservations')
      .set('Authorization', `Bearer ${tokens[role]}`)
      .expect(403);
  });

  it('el detalle sigue siendo solo del Admin', async () => {
    await request(server)
      .get('/reservations/abc')
      .set('Authorization', `Bearer ${tokens.mesero}`)
      .expect(403);
    await request(server)
      .get('/reservations/abc')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
  });
});
