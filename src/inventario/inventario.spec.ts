import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ROLES } from '../common/constants/roles';
import { InventarioController } from './inventario.controller';
import { OrdenCompraDto, ProductoDto } from './inventario.dto';
import { InventarioService } from './inventario.service';

const errores = async <T extends object>(cls: new () => T, cuerpo: object) =>
  (await validate(plainToInstance(cls, cuerpo))).map((e) => e.property);

describe('inventario del administrador', () => {
  it('el producto rechaza existencias y costos negativos y normaliza el nombre', async () => {
    expect(
      await errores(ProductoDto, { stock: -1, costPerUnit: -0.5 }),
    ).toEqual(expect.arrayContaining(['stock', 'costPerUnit']));
    expect(
      plainToInstance(ProductoDto, { name: ' tomate  saladet ' }).name,
    ).toBe('TOMATE SALADET');
  });

  it('la orden valida cada artículo', async () => {
    expect(
      await errores(OrdenCompraDto, {
        items: [{ productName: 'X', quantity: -1, unit: 'kg', unitCost: 10 }],
      }),
    ).toContain('items');
    expect(await errores(OrdenCompraDto, { status: 'perdida' })).toContain(
      'status',
    );
  });

  it('el alta exige nombre y categoría (no se hereda un @IsOptional)', async () => {
    const s = new InventarioService({} as never);
    await expect(s.crearProducto({ name: 'X' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(s.crearProveedor({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('borrar algo con historial responde 409 en lugar de 500', async () => {
    const db = {
      execute: jest.fn().mockRejectedValue({ cause: { code: '23503' } }),
    };
    const s = new InventarioService(db as never);
    await expect(
      s.eliminar('inventario_productos', 1, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('todas las rutas son solo del administrador', () => {
    expect(Reflect.getMetadata('roles', InventarioController)).toEqual([
      ROLES.ADMIN,
    ]);
  });
});
