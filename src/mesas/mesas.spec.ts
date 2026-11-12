import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ROLES } from '../common/constants/roles';
import { MesaDto } from './mesa.dto';
import { MesasController } from './mesas.controller';
import { MesasService } from './mesas.service';

const errores = async (cuerpo: object) =>
  (await validate(plainToInstance(MesaDto, cuerpo))).map((e) => e.property);

const mesa = (extra: object = {}) => ({
  id: 7,
  numero: 'T9',
  nombre: null,
  capacidad: 4,
  forma: 'cuadrada',
  areaId: 1,
  areaNombre: 'SALÓN',
  activa: true,
  conHistorial: false,
  reservasActivas: 0,
  ...extra,
});

/** Servicio con `listarAdmin` simulado y un db que registra lo que se escribe. */
function setup(fila?: object) {
  const escrito: { update?: object; borrado: boolean } = { borrado: false };
  const db = {
    update: () => ({
      set: (v: object) => ({
        where: () => {
          escrito.update = v;
          return Promise.resolve();
        },
      }),
    }),
    transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        delete: () => ({ where: () => Promise.resolve() }),
        execute: () => {
          escrito.borrado = true;
          return Promise.resolve([{ id: 1 }]);
        },
      }),
  };
  const s = new MesasService(db as never);
  jest.spyOn(s, 'listarAdmin').mockResolvedValue(fila ? [fila as never] : []);
  return { s, escrito };
}

describe('mesas del administrador (Prioridad 1.3)', () => {
  it('valida número, capacidad, forma y área; normaliza el número', async () => {
    expect(
      await errores({ numero: '', capacidad: 0, forma: 'ovalada', areaId: 0 }),
    ).toEqual(
      expect.arrayContaining(['numero', 'capacidad', 'forma', 'areaId']),
    );
    expect(await errores({ nombre: null, areaId: null })).toEqual([]);
    expect(plainToInstance(MesaDto, { numero: ' t 10 ' }).numero).toBe('T 10');
  });

  it('el alta exige número y capacidad', async () => {
    const s = new MesasService({} as never);
    await expect(s.crear({ numero: 'T1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('un número repetido responde 409', async () => {
    const db = {
      insert: () => ({
        values: () => ({
          returning: () =>
            Promise.reject(
              Object.assign(new Error('duplicado'), {
                cause: { code: '23505' },
              }),
            ),
        }),
      }),
    };
    await expect(
      new MesasService(db as never).crear({ numero: 'T1', capacidad: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sin historial ni reservas, la baja archiva y borra', async () => {
    const { s, escrito } = setup(mesa());
    await expect(s.eliminar(7, {})).resolves.toMatchObject({
      resultado: 'eliminada',
    });
    expect(escrito.borrado).toBe(true);
    expect(escrito.update).toBeUndefined();
  });

  it('con historial, la baja solo desactiva', async () => {
    const { s, escrito } = setup(mesa({ conHistorial: true }));
    await expect(s.eliminar(7, {})).resolves.toMatchObject({
      resultado: 'desactivada',
    });
    expect(escrito.update).toEqual({ activa: false });
    expect(escrito.borrado).toBe(false);
  });

  it('con reservas activas, la baja desactiva y avisa cuántas hay', async () => {
    const { s, escrito } = setup(mesa({ reservasActivas: 2 }));
    const r = await s.eliminar(7, {});
    expect(r).toMatchObject({ resultado: 'desactivada', reservasActivas: 2 });
    expect(r.message).toContain('2 reservación');
    expect(escrito.borrado).toBe(false);
  });

  it('una mesa que no existe responde 404', async () => {
    const { s } = setup();
    await expect(s.eliminar(99, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('solo el admin administra; la lista pública sigue abierta', () => {
    const metodo = (m: string): unknown =>
      Object.getOwnPropertyDescriptor(MesasController.prototype, m)?.value;
    for (const m of ['listar', 'areas', 'crear', 'actualizar', 'eliminar'])
      expect(Reflect.getMetadata('roles', metodo(m) as object)).toEqual([
        ROLES.ADMIN,
      ]);
    expect(Reflect.getMetadata('isPublic', metodo('getMesas') as object)).toBe(
      true,
    );
  });
});
