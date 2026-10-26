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
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

const pagosService = {
  crearDireccion: jest.fn(),
  listarDirecciones: jest.fn().mockResolvedValue([]),
  actualizarDireccion: jest.fn(),
  eliminarDireccion: jest.fn(),
  crearSetupIntent: jest.fn(),
  guardarMetodoPago: jest.fn(),
  listarMetodosPago: jest.fn().mockResolvedValue([]),
  eliminarMetodoPago: jest.fn(),
  crearIntentoPago: jest.fn(),
  manejarWebhookStripe: jest.fn().mockResolvedValue({ received: true }),
  guardarPerfilFacturacion: jest.fn(),
  listarPerfilesFacturacion: jest.fn().mockResolvedValue([]),
  eliminarPerfilFacturacion: jest.fn(),
  crearFactura: jest.fn(),
  obtenerFacturaPorOrden: jest.fn(),
  descargarFacturaArchivo: jest.fn().mockResolvedValue(Buffer.from('')),
};

const protectedRoutes = [
  { method: 'post', path: '/direcciones', status: 201 },
  { method: 'get', path: '/direcciones', status: 200 },
  { method: 'put', path: '/direcciones/1', status: 200 },
  { method: 'delete', path: '/direcciones/1', status: 200 },
  { method: 'post', path: '/metodos-pago/setup-intent', status: 201 },
  { method: 'post', path: '/metodos-pago', status: 201 },
  { method: 'get', path: '/metodos-pago', status: 200 },
  { method: 'delete', path: '/metodos-pago/pm-1', status: 200 },
  { method: 'post', path: '/pagos/crear-intento', status: 201 },
  { method: 'post', path: '/perfiles-facturacion', status: 201 },
  { method: 'get', path: '/perfiles-facturacion', status: 200 },
  { method: 'delete', path: '/perfiles-facturacion/pf-1', status: 200 },
  { method: 'post', path: '/facturas', status: 201 },
  { method: 'get', path: '/facturas/orden-1', status: 200 },
  { method: 'get', path: '/facturas/orden-1/descargar', status: 200 },
] as const;

describe('PagosController (DT-03)', () => {
  let app: INestApplication;
  let token: string;
  let cajeroToken: string;

  function call(method: string, path: string) {
    const server = app.getHttpServer() as Server;
    const agent = request(server);
    if (method === 'get') return agent.get(path);
    if (method === 'post') return agent.post(path);
    if (method === 'put') return agent.put(path);
    return agent.delete(path);
  }

  beforeAll(async () => {
    token = await jwt.signAsync(
      {
        id: '7',
        email: 'cliente@quijote.mx',
        roleId: ROLES.CLIENTE,
        tokenId: 'tok-7',
      },
      { secret: SECRET, expiresIn: 60 },
    );
    await cache.set('user-7', 'tok-7');
    cajeroToken = await jwt.signAsync(
      {
        id: '8',
        email: 'cajero@quijote.mx',
        roleId: ROLES.CAJERO,
        tokenId: 'tok-8',
      },
      { secret: SECRET, expiresIn: 60 },
    );
    await cache.set('user-8', 'tok-8');

    const moduleRef = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        { provide: PagosService, useValue: pagosService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(protectedRoutes)(
    '$method $path sin token → 401',
    async ({ method, path }) => {
      await call(method, path).expect(401);
    },
  );

  it.each(protectedRoutes)(
    '$method $path con token → $status',
    async ({ method, path, status }) => {
      const req = call(method, path).set('Authorization', `Bearer ${token}`);
      if (method === 'post' || method === 'put') req.send({});
      await req.expect(status);
    },
  );

  it('ignora el usuarioId del query y usa el del token', async () => {
    await request(app.getHttpServer() as Server)
      .get('/direcciones?usuarioId=999')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(pagosService.listarDirecciones).toHaveBeenCalledWith(7);
  });

  it('ignora el usuarioId del body y usa el del token', async () => {
    await request(app.getHttpServer() as Server)
      .post('/pagos/crear-intento')
      .set('Authorization', `Bearer ${token}`)
      .send({ usuarioId: 999, ordenId: 'orden-1' })
      .expect(201);

    expect(pagosService.crearIntentoPago).toHaveBeenCalledWith(
      expect.objectContaining({ ordenId: 'orden-1' }),
      7,
      ROLES.CLIENTE,
    );
  });

  it('el cajero inicia el cobro con su rol del token (DT-16)', async () => {
    await request(app.getHttpServer() as Server)
      .post('/pagos/crear-intento')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send({ ordenId: 'orden-2' })
      .expect(201);

    expect(pagosService.crearIntentoPago).toHaveBeenCalledWith(
      expect.objectContaining({ ordenId: 'orden-2' }),
      8,
      ROLES.CAJERO,
    );
  });

  it('la factura se busca solo con el usuario del token', async () => {
    await request(app.getHttpServer() as Server)
      .get('/facturas/orden-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(pagosService.obtenerFacturaPorOrden).toHaveBeenCalledWith(
      'orden-1',
      7,
    );
  });

  it('el webhook de Stripe sigue siendo público', async () => {
    await request(app.getHttpServer() as Server)
      .post('/pagos/webhook')
      .set('stripe-signature', 'firma')
      .send({})
      .expect(201);

    expect(pagosService.manejarWebhookStripe).toHaveBeenCalled();
  });
});
