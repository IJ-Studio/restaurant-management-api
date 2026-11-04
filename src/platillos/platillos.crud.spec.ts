import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ActualizarPlatilloDto, CrearPlatilloDto } from './dto/platillo.dto';
import { PlatillosService } from './platillos.service';

function setup(
  opciones: { filas?: { id: number }[]; errorBorrado?: unknown } = {},
) {
  const filas = opciones.filas ?? [{ id: 7 }];
  const returning = jest.fn().mockResolvedValue(filas);
  const values = jest.fn().mockReturnValue({ returning });
  const set = jest
    .fn()
    .mockReturnValue({ where: jest.fn().mockReturnValue({ returning }) });
  const borrar = opciones.errorBorrado
    ? jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(opciones.errorBorrado),
        }),
      })
    : jest
        .fn()
        .mockReturnValue({ where: jest.fn().mockReturnValue({ returning }) });
  const db = {
    insert: jest.fn().mockReturnValue({ values }),
    update: jest.fn().mockReturnValue({ set }),
    delete: borrar,
  };
  return { service: new PlatillosService(db as never), values, set };
}

describe('PlatillosService: alta, edición y borrado (D-31)', () => {
  it('crea con la categoría y convierte las etiquetas en sus columnas', async () => {
    const { service, values } = setup();
    await expect(
      service.crear({
        categoria_id: 2,
        nombre: ' Enchiladas ',
        precio: 150,
        tags: ['popular'],
      }),
    ).resolves.toEqual({ id: 7 });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        categoriaId: 2,
        nombre: 'Enchiladas',
        precio: '150',
        esPopular: true,
        esVegano: false,
      }),
    );
  });

  it('agotar solo cambia «disponible»', async () => {
    const { service, set } = setup();
    await service.actualizar(7, { disponible: false });
    const cambios = (set.mock.calls as Record<string, unknown>[][])[0][0];
    expect(cambios.disponible).toBe(false);
    expect(Object.keys(cambios).sort()).toEqual([
      'actualizadoEn',
      'disponible',
    ]);
  });

  it('sin cambios responde 400 y si no existe, 404', async () => {
    await expect(setup().service.actualizar(7, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      setup({ filas: [] }).service.actualizar(99, { disponible: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('borrar un platillo con pedidos responde 409 en lugar de 500', async () => {
    await expect(
      setup({ errorBorrado: { code: '23503' } }).service.eliminar(7),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      setup({ filas: [] }).service.eliminar(99),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup().service.eliminar(7)).resolves.toEqual({
      success: true,
    });
  });

  it('el DTO solo acepta imágenes de Cloudinary por https y etiquetas conocidas', async () => {
    const errores = async (cuerpo: object) =>
      (await validate(plainToInstance(ActualizarPlatilloDto, cuerpo))).map(
        (e) => e.property,
      );
    expect(
      await errores({
        imagen_url: 'https://res.cloudinary.com/dcb1tspbj/image/upload/a.jpg',
      }),
    ).toEqual([]);
    expect(
      await errores({ imagen_url: 'https://images.unsplash.com/a.jpg' }),
    ).toEqual(['imagen_url']);
    expect(await errores({ tags: ['popular', 'hackeo'] })).toEqual(['tags']);
    expect(await errores({ precio: -1 })).toEqual(['precio']);
  });

  it('el alta exige categoría, nombre y precio', async () => {
    const errores = (
      await validate(plainToInstance(CrearPlatilloDto, { categoria_id: 1 }))
    )
      .map((e) => e.property)
      .sort();
    expect(errores).toEqual(['nombre', 'precio']);
    expect(
      await validate(
        plainToInstance(CrearPlatilloDto, {
          categoria_id: 1,
          nombre: 'Sopa',
          precio: 90,
        }),
      ),
    ).toEqual([]);
  });
});
