import { NotFoundException } from '@nestjs/common';

import { ROLES } from '../common/constants/roles';
import { OrdersService } from './orders.service';

const ordenAjena = {
  id: 'orden-1',
  tipo: 'mesa',
  estatus: 'pendiente',
  clienteId: 'cli-8',
  tiempoApertura: null,
};

const cliente = { id: 'cli-7' };

function setup(whereResults: unknown[][]) {
  const results = [...whereResults];
  const where = jest.fn(() => {
    const rows = results.shift() ?? [];
    return Object.assign(Promise.resolve(rows), {
      limit: jest.fn().mockResolvedValue(rows),
      orderBy: jest.fn().mockResolvedValue(rows),
    });
  });
  const chain = { where, leftJoin: jest.fn() };
  chain.leftJoin.mockReturnValue(chain);

  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where: updateWhere });
  const deleteWhere = jest.fn().mockResolvedValue(undefined);
  const del = jest.fn().mockReturnValue({ where: deleteWhere });
  const db = {
    select: () => ({ from: () => chain }),
    update: () => ({ set }),
    delete: del,
  };

  return { service: new OrdersService(db as never), set, del };
}

describe('OrdersService (DT-04)', () => {
  it('un cliente no puede confirmar la orden de otro → 404', async () => {
    const { service, set } = setup([[ordenAjena], [cliente]]);

    const error: unknown = await service
      .confirmarOrdenMesa('orden-1', { id: 7, roleId: ROLES.CLIENTE })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(set).not.toHaveBeenCalled();
  });

  it('el personal puede confirmar una orden de mesa ajena', async () => {
    const { service, set } = setup([[ordenAjena], [{ id: 1 }]]);

    await service.confirmarOrdenMesa('orden-1', {
      id: 7,
      roleId: ROLES.MESERO,
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ estatus: 'abierta' }),
    );
  });

  it('un cliente no puede cancelar la orden de otro → 404', async () => {
    const abierta = {
      ...ordenAjena,
      estatus: 'abierta',
      tiempoApertura: new Date().toISOString(),
    };
    const { service, set } = setup([[abierta], [cliente]]);

    const error: unknown = await service
      .cancelarOrden('orden-1', { id: 7, roleId: ROLES.CLIENTE }, 'MOTIVO')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(set).not.toHaveBeenCalled();
  });

  it('un cliente no puede quitar un item de la orden de otro → 404', async () => {
    const { service, del } = setup([
      [{ id: 5, ordenId: 'orden-1' }],
      [ordenAjena],
      [cliente],
    ]);

    const error: unknown = await service
      .eliminarItemOrden(5, { id: 7, roleId: ROLES.CLIENTE })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(del).not.toHaveBeenCalled();
  });

  it('el dueño sí puede quitar un item de su carrito', async () => {
    const propia = { ...ordenAjena, clienteId: 'cli-7' };
    const { service, del, set } = setup([
      [{ id: 5, ordenId: 'orden-1' }],
      [propia],
      [cliente],
      [{ id: 5, subtotal: '100' }],
      [],
    ]);

    const result = await service.eliminarItemOrden(5, {
      id: 7,
      roleId: ROLES.CLIENTE,
    });

    expect(del).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ total: '100' }));
    expect(result).toMatchObject({ success: true, ordenId: 'orden-1' });
  });
});

describe('OrdersService: pedido de mesa desde la app del mesero', () => {
  function setupCreate(results: unknown[]) {
    const queue = [...results];
    const writes: { insert: unknown[]; set: unknown[]; where: unknown[] } = {
      insert: [],
      set: [],
      where: [],
    };
    const chain = (): Record<string, jest.Mock> & PromiseLike<unknown> => {
      const c = {} as Record<string, jest.Mock> & PromiseLike<unknown>;
      for (const m of ['from', 'where', 'limit', 'returning', 'leftJoin'])
        c[m] = jest.fn(() => c);
      c.values = jest.fn((data: unknown) => {
        writes.insert.push(data);
        return c;
      });
      c.set = jest.fn((data: unknown) => {
        writes.set.push(data);
        return c;
      });
      (c as { then: PromiseLike<unknown>['then'] }).then = (resolve, reject) =>
        Promise.resolve(queue.shift() ?? []).then(resolve, reject);
      return c;
    };
    const db = {
      select: jest.fn(chain),
      insert: jest.fn(chain),
      update: jest.fn(chain),
      delete: jest.fn(chain),
    };
    return { service: new OrdersService(db as never), writes };
  }

  const platillo = { id: 1, precio: '145.50', nombre: 'Enchiladas' };

  it('guarda comensales, notas, el mesero que atendió y separa líneas con notas distintas', async () => {
    const { service, writes } = setupCreate([
      [platillo], // platillos
      [{ id: 'cli-3' }], // cliente del usuario
      [{ id: 5, numero: '5', activa: true }], // mesa
      [], // sin carrito previo
      [{ id: 'orden-9' }], // insert orden
      [], // item con esa nota no existe
      [], // insert item
      [{ subtotal: '291.00' }], // items para el total
      [], // update total
    ]);

    await service.createOrderMesa(
      {
        mesa: '5',
        numComensales: 4,
        notasCocina: '  Alergia a la nuez  ',
        items: [{ platilloId: 1, cantidad: 2, notas: ' sin cebolla ' }],
      },
      3,
      ROLES.MESERO,
    );

    expect(writes.insert[0]).toMatchObject({
      mesaId: 5,
      numComensales: 4,
      atendidoPor: 3,
      notasCocina: 'Alergia a la nuez',
    });
    expect(writes.insert[1]).toMatchObject({
      platilloId: 1,
      cantidad: 2,
      notas: 'sin cebolla',
    });
  });

  it('un cliente no queda como mesero y los valores fuera de rango se ignoran', async () => {
    const { service, writes } = setupCreate([
      [platillo],
      [{ id: 'cli-7' }],
      [{ id: 5, numero: '5', activa: true }],
      [],
      [{ id: 'orden-9' }],
      [],
      [],
      [{ subtotal: '145.50' }],
      [],
    ]);

    await service.createOrderMesa(
      { mesa: '5', numComensales: 99, items: [{ platilloId: 1, cantidad: 1 }] },
      7,
      ROLES.CLIENTE,
    );

    expect(writes.insert[0]).toMatchObject({
      numComensales: 1,
      atendidoPor: null,
      notasCocina: null,
    });
    expect(writes.insert[1]).toMatchObject({ notas: null });
  });

  it('en un carrito existente actualiza comensales y mesero', async () => {
    const { service, writes } = setupCreate([
      [platillo],
      [{ id: 'cli-3' }],
      [{ id: 5, numero: '5', activa: true }],
      [{ id: 'orden-9' }], // carrito previo
      [], // update datos de la mesa
      [{ id: 20, cantidad: 1 }], // item con la misma nota
      [], // update item
      [{ subtotal: '291.00' }],
      [],
    ]);

    await service.createOrderMesa(
      { mesa: '5', numComensales: 3, items: [{ platilloId: 1, cantidad: 1 }] },
      3,
      ROLES.MESERO,
    );

    expect(writes.set[0]).toEqual({ atendidoPor: 3, numComensales: 3 });
    expect(writes.set[1]).toMatchObject({ cantidad: 2 });
  });
});
