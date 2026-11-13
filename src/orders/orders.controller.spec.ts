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
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderWorkflowService } from './order-workflow.service';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

const ordersService = {
  createOrderMesa: jest.fn(),
  findOrdersByUser: jest.fn().mockResolvedValue([]),
  findDeliveryOrdersByUser: jest.fn().mockResolvedValue([]),
  confirmarOrdenMesa: jest.fn(),
  eliminarItemOrden: jest.fn(),
  cancelarOrden: jest.fn(),
};

const workflowService = {
  listarMetodosPago: jest.fn().mockResolvedValue([]),
  cambiarEstatus: jest.fn().mockResolvedValue({ success: true }),
  cobrar: jest.fn().mockResolvedValue({ success: true }),
  obtenerDetalle: jest.fn().mockResolvedValue({ id: 'x' }),
};

const protectedRoutes = [
  { method: 'post', path: '/pedidos/mesa', status: 201 },
  { method: 'get', path: '/pedidos/usuario?mesaId=1', status: 200 },
  { method: 'get', path: '/pedidos/usuario?tipo=domicilio', status: 200 },
  { method: 'post', path: '/pedidos/confirmar/orden-1', status: 201 },
  { method: 'delete', path: '/pedidos/item/5', status: 200 },
  { method: 'patch', path: '/pedidos/cancelar/orden-1', status: 200 },
] as const;

const requester = { id: 7, roleId: ROLES.CLIENTE };

describe('OrdersController (DT-04)', () => {
  let app: INestApplication;
  let token: string;
  let cajeroToken: string;

  function call(method: string, path: string) {
    const server = app.getHttpServer() as Server;
    const agent = request(server);
    if (method === 'get') return agent.get(path);
    if (method === 'post') return agent.post(path);
    if (method === 'patch') return agent.patch(path).send({ motivo: 'prueba' });
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
    await cache.set('session-tok-7', '7');
    cajeroToken = await jwt.signAsync(
      {
        id: '8',
        email: 'caja@quijote.mx',
        roleId: ROLES.CAJERO,
        tokenId: 'tok-8',
      },
      { secret: SECRET, expiresIn: 60 },
    );
    await cache.set('session-tok-8', '8');

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        { provide: OrdersService, useValue: ordersService },
        { provide: OrderWorkflowService, useValue: workflowService },
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
      if (method === 'post') req.send({});
      await req.expect(status);
    },
  );

  it('POST /pedidos/mesa usa el usuario del token, no el del body', async () => {
    await request(app.getHttpServer() as Server)
      .post('/pedidos/mesa')
      .set('Authorization', `Bearer ${token}`)
      .send({ mesa: '1', usuarioId: 999 })
      .expect(201);

    expect(ordersService.createOrderMesa).toHaveBeenCalledWith(
      expect.objectContaining({ mesa: '1' }),
      7,
      ROLES.CLIENTE,
    );
  });

  it('GET /pedidos/usuario de mesa pasa usuario y rol del token', async () => {
    await request(app.getHttpServer() as Server)
      .get('/pedidos/usuario?mesaId=1&usuarioId=999')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(ordersService.findOrdersByUser).toHaveBeenCalledWith('1', requester);
  });

  it('GET /pedidos/usuario a domicilio usa el usuario del token', async () => {
    await request(app.getHttpServer() as Server)
      .get('/pedidos/usuario?tipo=domicilio&usuarioId=999')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(ordersService.findDeliveryOrdersByUser).toHaveBeenCalledWith(7);
  });

  it('confirmar, eliminar item y cancelar pasan el usuario del token', async () => {
    const server = app.getHttpServer() as Server;
    const auth = `Bearer ${token}`;

    await request(server)
      .post('/pedidos/confirmar/orden-1')
      .set('Authorization', auth)
      .expect(201);
    expect(ordersService.confirmarOrdenMesa).toHaveBeenCalledWith(
      'orden-1',
      requester,
    );

    await request(server)
      .delete('/pedidos/item/5')
      .set('Authorization', auth)
      .expect(200);
    expect(ordersService.eliminarItemOrden).toHaveBeenCalledWith(5, requester);

    await request(server)
      .patch('/pedidos/cancelar/orden-1')
      .set('Authorization', auth)
      .send({ motivo: '  me equivoqué de platillo ' })
      .expect(200);
    expect(ordersService.cancelarOrden).toHaveBeenCalledWith(
      'orden-1',
      requester,
      'ME EQUIVOQUÉ DE PLATILLO',
    );
  });

  it('cancelar sin motivo responde 400 y no llega al servicio (Prioridad 3.3)', async () => {
    ordersService.cancelarOrden.mockClear();
    const server = app.getHttpServer() as Server;
    for (const cuerpo of [{}, { motivo: '  ' }, { motivo: 'x', extra: 1 }]) {
      await request(server)
        .patch('/pedidos/cancelar/orden-1')
        .set('Authorization', `Bearer ${token}`)
        .send(cuerpo)
        .expect(400);
    }
    expect(ordersService.cancelarOrden).not.toHaveBeenCalled();
  });

  describe('flujo del pedido en la app móvil', () => {
    const ORDEN = '5f0c8a5e-4a43-4b7e-9d1c-2f3e4a5b6c7d';
    const server = () => request(app.getHttpServer() as Server);

    it.each([
      ['get', '/pedidos/metodos-pago'],
      ['get', `/pedidos/${ORDEN}`],
      ['patch', `/pedidos/${ORDEN}/estatus`],
      ['post', `/pedidos/${ORDEN}/cobrar`],
    ])('un cliente no puede usar %s %s → 403', async (method, path) => {
      const agent = server();
      const req =
        method === 'get'
          ? agent.get(path)
          : method === 'patch'
            ? agent.patch(path)
            : agent.post(path);
      await req.set('Authorization', `Bearer ${token}`).send({}).expect(403);
    });

    it('caja cobra con el usuario del token y la validación estricta del body', async () => {
      await server()
        .post(`/pedidos/${ORDEN}/cobrar`)
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send({ metodoPagoId: 1, propina: 10, montoRecibido: 500 })
        .expect(201);
      expect(workflowService.cobrar).toHaveBeenCalledWith(
        ORDEN,
        expect.objectContaining({
          metodoPagoId: 1,
          propina: 10,
          montoRecibido: 500,
        }),
        8,
      );

      await server()
        .post(`/pedidos/${ORDEN}/cobrar`)
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send({ metodoPagoId: 1, total: 1 })
        .expect(400);
      await server()
        .post(`/pedidos/${ORDEN}/cobrar`)
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send({ metodoPagoId: 1, propina: -5 })
        .expect(400);
    });

    it('cambia el estatus solo a los valores permitidos', async () => {
      await server()
        .patch(`/pedidos/${ORDEN}/estatus`)
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send({ estatus: 'entregada' })
        .expect(200);
      expect(workflowService.cambiarEstatus).toHaveBeenCalledWith(
        ORDEN,
        'entregada',
        {
          id: 8,
          roleId: ROLES.CAJERO,
        },
      );

      await server()
        .patch(`/pedidos/${ORDEN}/estatus`)
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send({ estatus: 'pagada' })
        .expect(400);
    });

    it('GET /pedidos/:id exige un UUID y no tapa las rutas fijas', async () => {
      await server()
        .get(`/pedidos/${ORDEN}`)
        .set('Authorization', `Bearer ${cajeroToken}`)
        .expect(200);
      expect(workflowService.obtenerDetalle).toHaveBeenCalledWith(ORDEN);

      await server()
        .get('/pedidos/no-es-uuid')
        .set('Authorization', `Bearer ${cajeroToken}`)
        .expect(400);
      await server()
        .get('/pedidos/metodos-pago')
        .set('Authorization', `Bearer ${cajeroToken}`)
        .expect(200);
      expect(workflowService.listarMetodosPago).toHaveBeenCalled();
    });
  });
});
