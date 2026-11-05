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
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

const operations = {
  reportarIncidencia: jest.fn().mockResolvedValue({ success: true }),
  listarIncidencias: jest.fn().mockResolvedValue([]),
  listarProductos: jest.fn().mockResolvedValue([]),
  registrarMerma: jest.fn().mockResolvedValue({ success: true }),
  listarMermasDeHoy: jest.fn().mockResolvedValue([]),
  cajaActual: jest.fn().mockResolvedValue({ abierta: false }),
  abrirCaja: jest.fn().mockResolvedValue({ success: true }),
  cerrarCaja: jest.fn().mockResolvedValue({ success: true }),
  listarCortes: jest.fn().mockResolvedValue([]),
  resumenDelDia: jest.fn().mockResolvedValue({}),
};

const ROLE_ID = {
  admin: ROLES.ADMIN,
  cajero: ROLES.CAJERO,
  mesero: ROLES.MESERO,
  cocina: ROLES.COCINA,
  cliente: ROLES.CLIENTE,
};
type RoleName = keyof typeof ROLE_ID;

describe('OperationsController', () => {
  let app: INestApplication;
  const tokens = {} as Record<RoleName, string>;

  beforeAll(async () => {
    for (const [i, role] of (Object.keys(ROLE_ID) as RoleName[]).entries()) {
      const id = String(100 + i);
      tokens[role] = await jwt.signAsync(
        {
          id,
          email: `${role}@quijote.mx`,
          roleId: ROLE_ID[role],
          tokenId: `tok-${id}`,
        },
        { secret: SECRET, expiresIn: 60 },
      );
      await cache.set(`user-${id}`, `tok-${id}`);
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [OperationsController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        { provide: OperationsService, useValue: operations },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const call = (
    method: 'get' | 'post',
    path: string,
    role?: RoleName,
    body?: object,
  ) => {
    const agent = request(app.getHttpServer() as Server);
    const req =
      method === 'get' ? agent.get(path) : agent.post(path).send(body ?? {});
    return role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;
  };

  // [método, ruta, body válido, roles con acceso]
  const routes: ['get' | 'post', string, object | undefined, RoleName[]][] = [
    [
      'post',
      '/cocina/incidencias',
      { tipo: 'retraso', minutos: 10 },
      ['admin', 'cajero', 'mesero', 'cocina'],
    ],
    [
      'get',
      '/cocina/incidencias',
      undefined,
      ['admin', 'cajero', 'mesero', 'cocina'],
    ],
    ['get', '/inventario/productos', undefined, ['admin', 'cocina']],
    [
      'post',
      '/inventario/mermas',
      {
        productName: 'Salsa',
        quantity: 1,
        reason: 'otro',
        justification: 'Se quemó',
      },
      // Prioridad 1.2: solo el personal operativo registra mermas; el admin no.
      ['cajero', 'mesero', 'cocina'],
    ],
    [
      'get',
      '/inventario/mermas',
      undefined,
      ['admin', 'cajero', 'mesero', 'cocina'],
    ],
    ['get', '/caja/actual', undefined, ['admin', 'cajero']],
    ['post', '/caja/abrir', { fondoInicial: 500 }, ['admin', 'cajero']],
    ['post', '/caja/cerrar', { efectivoContado: 500 }, ['admin', 'cajero']],
    ['get', '/caja/cortes', undefined, ['admin']],
    ['get', '/reportes/hoy', undefined, ['admin']],
  ];

  it.each(routes)('%s %s exige token', async (method, path, body) => {
    await call(method, path, undefined, body).expect(401);
  });

  it.each(routes)(
    '%s %s respeta los roles',
    async (method, path, body, allowed) => {
      for (const role of Object.keys(ROLE_ID) as RoleName[]) {
        const res = await call(method, path, role, body);
        expect([role, res.status]).toEqual([
          role,
          allowed.includes(role) ? (method === 'post' ? 201 : 200) : 403,
        ]);
      }
    },
  );

  it('valida los bodies con la validación estricta', async () => {
    await call('post', '/cocina/incidencias', 'cocina', {
      tipo: 'chisme',
    }).expect(400);
    await call('post', '/cocina/incidencias', 'cocina', {
      tipo: 'retraso',
      extra: 1,
    }).expect(400);
    await call('post', '/inventario/mermas', 'cocina', {
      quantity: 0,
      reason: 'otro',
      justification: 'xx',
    }).expect(400);
    await call('post', '/caja/abrir', 'cajero', { fondoInicial: -1 }).expect(
      400,
    );
    await call('post', '/caja/cerrar', 'cajero', {}).expect(400);
  });

  it('pasa el usuario del token', async () => {
    await call('post', '/caja/abrir', 'cajero', { fondoInicial: 250 }).expect(
      201,
    );
    expect(operations.abrirCaja).toHaveBeenLastCalledWith(101, {
      fondoInicial: 250,
    });
    await call('get', '/cocina/incidencias?ordenId=abc', 'mesero').expect(200);
    expect(operations.listarIncidencias).toHaveBeenLastCalledWith('abc');
  });
});
