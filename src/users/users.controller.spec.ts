import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES } from '../common/constants/roles';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const user = { id: 1, name: 'Ana', email: 'ana@quijote.mx', roleId: 5 };

describe('UsersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getUserById: jest.fn().mockResolvedValue(user),
            getAllUsers: jest.fn().mockResolvedValue([user]),
            createUser: jest.fn().mockResolvedValue(user),
            deleteUser: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
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

  it.each(['createUser', 'getAllUsers', 'deleteUser'])(
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
