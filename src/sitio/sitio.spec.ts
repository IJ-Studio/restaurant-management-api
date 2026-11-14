import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ROLES } from '../common/constants/roles';
import { SitioController } from './sitio.controller';
import { SitioDto } from './sitio.dto';
import { SitioService } from './sitio.service';

const imagen = (n = 1) => ({
  url: `https://res.cloudinary.com/dcb1tspbj/image/upload/v1/ElQuijote/landing/foto${n}.jpg`,
  publicId: `ElQuijote/landing/foto${n}`,
  alt: 'Comedor del restaurante',
});
const valido = {
  portada: [imagen()],
  colorRespaldo: '#2B2119',
  telefono: '+52 771 702 8172',
  whatsapp: '7717028172',
};
const errores = async (body: object) =>
  (await validate(plainToInstance(SitioDto, body))).flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...(e.children ?? []).flatMap((c) =>
      (c.children ?? [c]).flatMap((d) => Object.values(d.constraints ?? {})),
    ),
  ]);

describe('SitioDto (P1.5)', () => {
  it('acepta imágenes de la nube del restaurante y teléfonos con o sin lada', async () => {
    expect(await errores(valido)).toEqual([]);
  });

  it('rechaza imágenes de terceros, más de 5 en la portada, colores y teléfonos inválidos', async () => {
    const e = await errores({
      ...valido,
      portada: [
        { ...imagen(), url: 'https://images.unsplash.com/x.jpg' },
        ...[2, 3, 4, 5, 6].map(imagen),
      ],
      colorRespaldo: 'rojo',
      telefono: '123',
    });
    expect(e).toEqual(
      expect.arrayContaining([
        'La portada admite hasta 5 imágenes.',
        'La imagen debe estar en la nube del restaurante.',
        'El color debe ser hexadecimal (#RRGGBB).',
        'Escribe un teléfono válido (10 dígitos o con lada).',
      ]),
    );
  });
});

describe('SitioController', () => {
  it('leer es público; guardar es solo del administrador', () => {
    const r = new Reflector();
    expect(
      r.get<boolean>(
        'isPublic',
        Object.getOwnPropertyDescriptor(SitioController.prototype, 'obtener')!
          .value as () => unknown,
      ),
    ).toBe(true);
    expect(
      r.get<number[]>(
        'roles',
        Object.getOwnPropertyDescriptor(SitioController.prototype, 'guardar')!
          .value as () => unknown,
      ),
    ).toEqual([ROLES.ADMIN]);
  });
});

describe('SitioService', () => {
  function db(ajuste: unknown[], config: unknown[]) {
    const resultados = [ajuste, config];
    const select = () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve(resultados.shift()) }),
        limit: () => Promise.resolve(resultados.shift()),
      }),
    });
    return { select } as never;
  }

  it('sin configurar devuelve vacío con color de respaldo y los teléfonos del restaurante', async () => {
    const s = new SitioService(
      db([], [{ telefono: '+52 771 702 8172', whatsapp: null }]),
    );
    await expect(s.obtener()).resolves.toEqual({
      portada: [],
      login: null,
      registro: null,
      colorRespaldo: '#2B2119',
      telefono: '+52 771 702 8172',
      whatsapp: null,
    });
  });

  it('mezcla lo guardado sobre los valores por defecto', async () => {
    const s = new SitioService(
      db([{ value: { portada: [imagen()], login: imagen(2) } }], []),
    );
    await expect(s.obtener()).resolves.toMatchObject({
      portada: [imagen()],
      login: imagen(2),
      registro: null,
      telefono: null,
    });
  });
});
