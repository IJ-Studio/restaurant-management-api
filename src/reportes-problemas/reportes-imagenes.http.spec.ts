import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { CacheService } from '../cache/cache.service';
import jwtConfig from '../common/config/jwt.config';
import { ROLES } from '../common/constants/roles';
import { DRIZZLE } from '../database/drizzle/constants';
import {
  firmarCloudinary,
  ImagenesController,
} from '../imagenes/imagenes.controller';
import { ReportesProblemasController } from './reportes-problemas.controller';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const cache = new CacheService();

describe('POST /reportes-problemas y POST /imagenes/firma (HTTP)', () => {
  let app: INestApplication;
  let server: Server;
  const tokens: Record<string, string> = {};
  const values = jest.fn().mockResolvedValue(undefined);
  const db = { insert: jest.fn().mockReturnValue({ values }) };
  const sign = async (id: string, roleId: number) => {
    await cache.set(`session-tok-${id}`, id);
    return jwt.signAsync(
      { id, email: 'x@quijote.mx', roleId, tokenId: `tok-${id}` },
      { secret: SECRET, expiresIn: 60 },
    );
  };

  beforeAll(async () => {
    tokens.admin = await sign('1', ROLES.ADMIN);
    tokens.cliente = await sign('5', ROLES.CLIENTE);
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportesProblemasController, ImagenesController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: CacheService, useValue: cache },
        {
          provide: jwtConfig.KEY,
          useValue: { secret: SECRET, accessTokenTtl: '3600' },
        },
        { provide: DRIZZLE, useValue: db },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  const valido = {
    tipo: 'no-funciona',
    descripcion: 'El enlace del pie no abre.',
    ruta: '/privacidad',
  };

  it('un reporte válido se guarda sin sesión y solo con los campos del DTO', async () => {
    await request(server)
      .post('/reportes-problemas')
      .send(valido)
      .expect(201, { success: true });
    expect(values).toHaveBeenCalledWith({
      tipo: 'no-funciona',
      descripcion: 'EL ENLACE DEL PIE NO ABRE.',
      ruta: '/privacidad',
    });
  });

  it.each([
    ['tipo desconocido', { ...valido, tipo: 'hack' }],
    ['descripción corta', { ...valido, descripcion: 'corto' }],
    ['ruta ajena', { ...valido, ruta: 'https://otro.sitio/x' }],
    ['campo de más', { ...valido, correo: 'a@b.c' }],
  ])('400 con %s y no se guarda nada', async (_caso, cuerpo) => {
    await request(server).post('/reportes-problemas').send(cuerpo).expect(400);
    expect(values).not.toHaveBeenCalled();
  });

  it('la firma exige sesión de administración', async () => {
    await request(server)
      .post('/imagenes/firma')
      .send({ destino: 'platillos' })
      .expect(401);
    await request(server)
      .post('/imagenes/firma')
      .set('Authorization', `Bearer ${tokens.cliente}`)
      .send({ destino: 'platillos' })
      .expect(403);
  });

  it('sin la configuración de Cloudinary responde 503, nunca una firma vacía', async () => {
    await request(server)
      .post('/imagenes/firma')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ destino: 'platillos' })
      .expect(503);
  });

  it('firma para la carpeta fija del destino y rechaza destinos desconocidos', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'nube';
    process.env.CLOUDINARY_API_KEY = 'clave';
    process.env.CLOUDINARY_API_SECRET = 'secreto';
    const r = await request(server)
      .post('/imagenes/firma')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ destino: 'platillos' })
      .expect(201);
    const cuerpo = r.body as {
      folder: string;
      timestamp: number;
      signature: string;
      apiKey: string;
    };
    expect(cuerpo.folder).toBe('ElQuijote/menu');
    expect(cuerpo.apiKey).toBe('clave');
    expect(cuerpo.signature).toBe(
      createHash('sha1')
        .update(`folder=ElQuijote/menu&timestamp=${cuerpo.timestamp}secreto`)
        .digest('hex'),
    );
    expect(JSON.stringify(r.body)).not.toContain('secreto');
    await request(server)
      .post('/imagenes/firma')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ destino: 'otra' })
      .expect(400);
  });

  it('firmarCloudinary ordena los parámetros como pide Cloudinary', () => {
    expect(firmarCloudinary({ timestamp: 1, folder: 'a' }, 's')).toBe(
      createHash('sha1').update('folder=a&timestamp=1s').digest('hex'),
    );
  });
});
