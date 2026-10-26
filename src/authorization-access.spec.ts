import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guards';
import { RolesGuard } from './auth/guards/roles.guard';
import { CacheService } from './cache/cache.service';
import jwtConfig from './common/config/jwt.config';
import { ROLES } from './common/constants/roles';
import { BackupsController } from './database/features/backups/backups.controller';
import { BackupsService } from './database/features/backups/backups.service';
import { MetricsController } from './database/features/metrics/metrics.controller';
import { MetricsService } from './database/features/metrics/metrics.service';
import { PlatillosController } from './platillos/platillos.controller';
import { PlatillosService } from './platillos/platillos.service';
import { ExportController } from './reports/export/export.controller';
import { ExportService } from './reports/export/export.service';
import { ImportController } from './reports/import/import.controller';
import { ImportService } from './reports/import/import.service';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

const routes = [
  { method: 'GET', path: '/backups', ok: 200 },
  { method: 'GET', path: '/db-metrics/cpu', ok: 200 },
  { method: 'GET', path: '/platillos/schema', ok: 200 },
  { method: 'POST', path: '/import/excel', ok: 201 },
  { method: 'GET', path: '/export?type=dishes&format=xlsx', ok: 200 },
] as const;

describe('Rutas administrativas con rol', () => {
  let app: INestApplication;
  let adminToken: string;
  let meseroToken: string;

  const sign = (id: string, roleId: number, tokenId: string) =>
    jwt.signAsync(
      { id, email: 'x@quijote.mx', roleId, tokenId },
      { secret: SECRET, expiresIn: 60 },
    );

  const call = (method: string, path: string) => {
    const server = app.getHttpServer() as Server;
    return method === 'GET'
      ? request(server).get(path)
      : request(server).post(path);
  };

  beforeAll(async () => {
    adminToken = await sign('1', ROLES.ADMIN, 'tok-admin');
    meseroToken = await sign('3', ROLES.MESERO, 'tok-mesero');
    await cache.set('user-1', 'tok-admin');
    await cache.set('user-3', 'tok-mesero');

    const moduleRef = await Test.createTestingModule({
      controllers: [
        BackupsController,
        MetricsController,
        PlatillosController,
        ImportController,
        ExportController,
      ],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        {
          provide: BackupsService,
          useValue: { getBackups: () => [] },
        },
        {
          provide: MetricsService,
          useValue: { getCpuMetrics: () => ({}) },
        },
        {
          provide: PlatillosService,
          useValue: { getSchema: () => ({}) },
        },
        {
          provide: ExportService,
          useValue: {
            export: () => ({
              buffer: Buffer.from(''),
              filename: 'reporte.xlsx',
              contentType: 'application/octet-stream',
            }),
          },
        },
        {
          provide: ImportService,
          useValue: { importFromExcel: () => ({ imported: 0 }) },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(routes)('$method $path sin token → 401', async ({ method, path }) => {
    await call(method, path).expect(401);
  });

  it.each(routes)(
    '$method $path con rol mesero → 403',
    async ({ method, path }) => {
      await call(method, path)
        .set('Authorization', `Bearer ${meseroToken}`)
        .expect(403);
    },
  );

  it.each(routes)(
    '$method $path con rol admin → $ok',
    async ({ method, path, ok }) => {
      const req = call(method, path).set(
        'Authorization',
        `Bearer ${adminToken}`,
      );

      if (method === 'POST') {
        req.attach('file', Buffer.from('x'), 'ventas.xlsx');
      }

      await req.expect(ok);
    },
  );

  it.each([
    BackupsController,
    MetricsController,
    PlatillosController,
    ImportController,
    ExportController,
  ])('%s exige ROLES.ADMIN a nivel de clase', (controller) => {
    expect(Reflect.getMetadata('roles', controller)).toEqual([ROLES.ADMIN]);
    expect(Reflect.getMetadata('__guards__', controller)).toContain(RolesGuard);
  });

  it('db-metrics ya no es público', () => {
    expect(Reflect.getMetadata('isPublic', MetricsController)).toBeUndefined();
  });
});
