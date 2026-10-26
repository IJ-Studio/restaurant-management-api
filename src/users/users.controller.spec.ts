import {
  BadRequestException,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { REQUEST_USER_KEY } from '../common/constants';
import { ROLES } from '../common/constants/roles';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const user = { id: 1, name: 'Ana', email: 'ana@quijote.mx', roleId: 5 };

const service = {
  getPublicUserById: jest.fn().mockResolvedValue(user),
  getAllUsers: jest.fn().mockResolvedValue([user]),
  createUser: jest.fn().mockResolvedValue(user),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  updateUser: jest.fn().mockResolvedValue(user),
  changePassword: jest.fn().mockResolvedValue(undefined),
  changeRole: jest.fn().mockResolvedValue({ ...user, roleId: ROLES.MESERO }),
};

describe('UsersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<{ [REQUEST_USER_KEY]?: unknown }>();
          req[REQUEST_USER_KEY] = {
            id: '1',
            email: 'ana@quijote.mx',
            roleId: ROLES.CLIENTE,
            tokenId: 'tok-1',
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users/:id con id no numérico responde 400 y no llega al servicio', async () => {
    await request(app.getHttpServer() as Server)
      .get('/users/abc')
      .expect(400);
  });

  it('GET /users/:id con id numérico responde 200', async () => {
    await request(app.getHttpServer() as Server)
      .get('/users/1')
      .expect(200)
      .expect(user);
  });

  it('GET /users sigue devolviendo un arreglo y agrega X-Next-Cursor si la página viene llena', async () => {
    const page = [user, { ...user, id: 2 }];
    service.getAllUsers.mockResolvedValueOnce(page);

    const response = await request(app.getHttpServer() as Server)
      .get('/users?limit=2')
      .expect(200)
      .expect(page);

    expect(response.headers['x-next-cursor']).toBe('2');
    expect(service.getAllUsers).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ limit: 2 }),
    );
  });

  it('GET /users con limit inválido responde 400', async () => {
    await request(app.getHttpServer() as Server)
      .get('/users?limit=abc')
      .expect(400);
  });

  it('PATCH /users/:id solo actualiza el perfil y descarta roleId, password e isActive', async () => {
    await request(app.getHttpServer() as Server)
      .patch('/users/1')
      .send({
        name: 'Ana María',
        roleId: ROLES.ADMIN,
        password: 'sin-hash',
        isActive: false,
      })
      .expect(200);

    expect(service.updateUser).toHaveBeenCalledWith(
      1,
      { name: 'Ana María' },
      1,
    );
  });

  it('PATCH /users/:id/password responde 200 si la contraseña actual es correcta', async () => {
    const body = {
      currentPassword: 'Vieja#2026',
      newPassword: 'Nueva#2026',
    };

    await request(app.getHttpServer() as Server)
      .patch('/users/1/password')
      .send(body)
      .expect(200);

    expect(service.changePassword).toHaveBeenCalledWith(1, body, 1);
  });

  it('PATCH /users/:id/password responde 400 si la contraseña actual no es correcta', async () => {
    service.changePassword.mockRejectedValueOnce(
      new BadRequestException('La contraseña actual no es correcta'),
    );

    await request(app.getHttpServer() as Server)
      .patch('/users/1/password')
      .send({
        currentPassword: 'incorrecta',
        newPassword: 'Nueva#2026',
      })
      .expect(400);
  });

  it('PATCH /users/:id/role responde 200 con admin', async () => {
    await request(app.getHttpServer() as Server)
      .patch('/users/1/role')
      .send({ roleId: ROLES.MESERO })
      .expect(200)
      .expect({ ...user, roleId: ROLES.MESERO });

    expect(service.changeRole).toHaveBeenCalledWith(1, ROLES.MESERO, 1);
  });

  it.each(['createUser', 'getAllUsers', 'deleteUser', 'changeRole'])(
    '%s exige el rol admin (ROLES.ADMIN, no el número mágico 1)',
    (method) => {
      const handler = Object.getOwnPropertyDescriptor(
        UsersController.prototype,
        method,
      )?.value as object;

      expect(Reflect.getMetadata('roles', handler)).toEqual([ROLES.ADMIN]);
    },
  );
});
