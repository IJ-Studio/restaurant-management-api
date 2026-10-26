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
      .cancelarOrden('orden-1', { id: 7, roleId: ROLES.CLIENTE })
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
