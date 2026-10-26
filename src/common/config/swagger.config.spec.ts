import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { isSwaggerEnabled, setupSwagger, SWAGGER_PATH } from './swagger.config';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

describe('isSwaggerEnabled', () => {
  it('se apaga en producción', () => {
    expect(isSwaggerEnabled('production')).toBe(false);
  });

  it.each([undefined, 'development', 'staging', 'test'])(
    'se enciende con NODE_ENV=%p',
    (nodeEnv) => {
      expect(isSwaggerEnabled(nodeEnv)).toBe(true);
    },
  );
});

describe('setupSwagger', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = moduleRef.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sirve el documento OpenAPI en /docs-json', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/docs-json')
      .expect(200);

    const body = response.body as {
      openapi?: unknown;
      paths?: Record<string, unknown>;
    };

    expect(body.openapi).toEqual(expect.stringMatching(/^3\./));
    expect(body.paths).toHaveProperty('/ping');
  });

  it(`sirve la UI en /${SWAGGER_PATH}`, async () => {
    const response = await request(app.getHttpServer() as Server)
      .get(`/${SWAGGER_PATH}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/html');
  });
});
