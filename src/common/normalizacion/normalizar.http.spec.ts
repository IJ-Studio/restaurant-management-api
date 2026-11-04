import { INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';

import { ReservationsController } from '../../reservations/reservations.controller';
import { ReservationsService } from '../../reservations/reservations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizarPipe } from './normalizar.pipe';

// POST /reservations no tiene pipe propio (lo usa la móvil): el pipe global normaliza igual.
describe('NormalizarPipe global (HTTP)', () => {
  let app: INestApplication;
  const create = jest.fn().mockResolvedValue({ id: 1 });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: { createReservation: create },
        },
        { provide: APP_PIPE, useClass: NormalizarPipe },
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

  afterAll(() => app?.close());

  it('normaliza los textos y conserva los campos que no conoce el DTO', async () => {
    await request(app.getHttpServer() as Server)
      .post('/reservations')
      .send({
        clienteNombre: '  maría   peña ',
        clienteEmail: ' Maria@Correo.MX ',
        clienteTelefono: '771 123 4567',
        peticionesEspeciales: '   ',
        canal: 'telefono',
        campoDeMas: 'se queda',
      })
      .expect(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteNombre: 'MARÍA PEÑA',
        clienteEmail: 'maria@correo.mx',
        clienteTelefono: '+527711234567',
        peticionesEspeciales: null,
        canal: 'telefono',
        campoDeMas: 'se queda',
      }),
    );
  });
});
