import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ROLES } from '../common/constants/roles';
import { PromocionesController } from './promociones.controller';
import { CrearPromocionDto } from './promociones.dto';
import { aFila, PromocionesService } from './promociones.service';

const errores = async (cuerpo: object) =>
  (await validate(plainToInstance(CrearPromocionDto, cuerpo))).map(
    (e) => e.property,
  );

describe('promociones', () => {
  it('el alta exige título y normaliza los textos', async () => {
    expect(await errores({})).toContain('titulo');
    const dto = plainToInstance(CrearPromocionDto, {
      titulo: '  2x1 en  tacos ',
      descripcion: '   ',
    });
    expect(dto.titulo).toBe('2X1 EN TACOS');
    expect(dto.descripcion).toBeNull();
  });

  it('rechaza precios negativos, imágenes ajenas a Cloudinary y fechas inválidas', async () => {
    expect(
      await errores({
        titulo: 'X',
        precio_original: -1,
        imagen_url: 'https://evil.example/x.jpg',
        fecha_fin: '30/11/2026',
      }),
    ).toEqual(
      expect.arrayContaining(['precio_original', 'imagen_url', 'fecha_fin']),
    );
    expect(
      await errores({ titulo: 'X', imagen_url: null, fecha_inicio: null }),
    ).toEqual([]);
  });

  it('la fila sale en snake_case con importes numéricos', () => {
    const fila = aFila({
      id: 1,
      titulo: 'T',
      descripcion: null,
      badge: null,
      emoji: null,
      color: null,
      precioOriginal: '120.00',
      precioDescuento: null,
      imagenUrl: null,
      imagenPublicId: null,
      activa: true,
      orden: 0,
      fechaInicio: '2026-11-01',
      fechaFin: null,
      creadoEn: null,
      actualizadoEn: null,
    });
    expect(fila).toMatchObject({
      precio_original: 120,
      precio_descuento: null,
      fecha_inicio: '2026-11-01',
    });
  });

  it('inicio posterior al fin: 400; sin cambios: 400; inexistente: 404', async () => {
    const db = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    };
    const s = new PromocionesService(db as never);
    await expect(
      s.crear({
        titulo: 'X',
        fecha_inicio: '2026-12-02',
        fecha_fin: '2026-12-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.actualizar(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(s.actualizar(1, { activa: false })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('solo la lectura de vigentes es pública; lo demás es del admin', () => {
    const manejador = (nombre: string) =>
      Object.getOwnPropertyDescriptor(PromocionesController.prototype, nombre)
        ?.value as object;
    expect(Reflect.getMetadata('isPublic', manejador('vigentes'))).toBe(true);
    for (const nombre of ['todas', 'crear', 'actualizar', 'eliminar']) {
      expect(Reflect.getMetadata('roles', manejador(nombre))).toEqual([
        ROLES.ADMIN,
      ]);
      expect(
        Reflect.getMetadata('isPublic', manejador(nombre)),
      ).toBeUndefined();
    }
  });
});
