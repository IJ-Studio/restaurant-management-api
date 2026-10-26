import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { Server } from 'node:http';
import request from 'supertest';

import {
  BODY_LIMIT,
  configureHttp,
  parseCorsOrigins,
  parseTrustProxy,
} from './http.config';

@Controller('test-http')
class TestHttpController {
  @Get('ping')
  ping() {
    return { ok: true };
  }

  @Get('ip')
  ip(@Req() req: Request) {
    return { ip: req.ip };
  }
}

describe('parseCorsOrigins', () => {
  it('usa los orígenes de siempre si no hay variable', () => {
    expect(parseCorsOrigins(undefined)).toEqual([
      'https://el-quijote.vercel.app',
      'http://localhost:3000',
    ]);
  });

  it('separa por comas, recorta y descarta vacíos', () => {
    expect(parseCorsOrigins('https://a.mx, https://b.mx,')).toEqual([
      'https://a.mx',
      'https://b.mx',
    ]);
  });
});

describe('parseTrustProxy', () => {
  it.each([
    ['1', 1],
    ['0', 0],
    ['2', 2],
  ])('TRUST_PROXY=%s → %i', (raw, expected) => {
    expect(parseTrustProxy(raw)).toBe(expected);
  });

  it.each([undefined, '', 'abc', '-1', '1.5'])(
    'valor inválido %p → 1 salto por defecto',
    (raw) => {
      expect(parseTrustProxy(raw)).toBe(1);
    },
  );
});

describe('configureHttp', () => {
  let app: INestApplication;
  const previousCors = process.env.CORS_ORIGINS;

  beforeAll(async () => {
    process.env.CORS_ORIGINS = 'https://test.example';

    const moduleRef = await Test.createTestingModule({
      controllers: [TestHttpController],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureHttp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.CORS_ORIGINS = previousCors;
  });

  it('agrega las cabeceras de helmet', async () => {
    const response = await request(app.getHttpServer() as Server).get(
      '/test-http/ping',
    );

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('permite el origen configurado en CORS_ORIGINS', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-http/ping')
      .set('Origin', 'https://test.example');

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://test.example',
    );
  });

  it('respeta X-Forwarded-For con trust proxy', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-http/ip')
      .set('X-Forwarded-For', '203.0.113.7');

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('declara un límite de body de 100 kb', () => {
    expect(BODY_LIMIT).toBe('100kb');
  });
});
