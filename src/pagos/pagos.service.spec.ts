import { BadRequestException } from '@nestjs/common';

import { ROLES } from '../common/constants/roles';
import { PagosService } from './pagos.service';

process.env.STRIPE_SECRET_KEY = 'sk_test_falso';
process.env.FACTURAPI_TEST_KEY = 'sk_test_falso';

function setup(rowsQueue: unknown[][]) {
  const results = [...rowsQueue];
  const where = jest.fn(() => {
    const rows = results.shift() ?? [];
    return Object.assign(Promise.resolve(rows), {
      limit: jest.fn().mockResolvedValue(rows),
    });
  });
  const db = { select: () => ({ from: () => ({ where }) }) };
  const service = new PagosService(db as never);

  const create = jest.fn().mockResolvedValue({
    client_secret: 'secret',
    status: 'requires_confirmation',
  });
  (
    service as unknown as {
      stripe: { paymentIntents: { create: typeof create } };
    }
  ).stripe = { paymentIntents: { create } };

  return { service, create };
}

describe('PagosService.crearIntentoPago (DT-16)', () => {
  it('el cajero puede cobrar una orden abierta que no le pertenece', async () => {
    const orden = {
      id: 'orden-1',
      clienteId: 'cli-1',
      estatus: 'abierta',
      total: '116.00',
    };
    const { service, create } = setup([[orden]]);

    const result = await service.crearIntentoPago(
      { ordenId: 'orden-1' },
      8,
      ROLES.CAJERO,
    );

    expect(create).toHaveBeenCalled();
    expect(result).toEqual({
      clientSecret: 'secret',
      status: 'requires_confirmation',
    });
  });

  it('el cajero puede cobrar una orden en para_cobrar', async () => {
    const orden = {
      id: 'orden-1',
      clienteId: 'cli-1',
      estatus: 'para_cobrar',
      total: '50.00',
    };
    const { service, create } = setup([[orden]]);

    await service.crearIntentoPago({ ordenId: 'orden-1' }, 8, ROLES.CAJERO);

    expect(create).toHaveBeenCalled();
  });

  it('el cliente sigue pagando solo sus órdenes pendientes', async () => {
    const propia = {
      id: 'orden-1',
      clienteId: 'cli-7',
      estatus: 'pendiente',
      total: '50.00',
    };
    const { service, create } = setup([[propia], [{ id: 'cli-7' }]]);

    await service.crearIntentoPago({ ordenId: 'orden-1' }, 7, ROLES.CLIENTE);

    expect(create).toHaveBeenCalled();
  });

  it('el cliente no puede pagar la orden de otro → 400', async () => {
    const ajena = {
      id: 'orden-1',
      clienteId: 'cli-8',
      estatus: 'pendiente',
      total: '50.00',
    };
    const { service, create } = setup([[ajena], [{ id: 'cli-7' }]]);

    const error: unknown = await service
      .crearIntentoPago({ ordenId: 'orden-1' }, 7, ROLES.CLIENTE)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('el cliente no puede pagar una orden propia ya abierta → 400', async () => {
    const propia = {
      id: 'orden-1',
      clienteId: 'cli-7',
      estatus: 'abierta',
      total: '50.00',
    };
    const { service, create } = setup([[propia], [{ id: 'cli-7' }]]);

    const error: unknown = await service
      .crearIntentoPago({ ordenId: 'orden-1' }, 7, ROLES.CLIENTE)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('el cajero no puede cobrar una orden ya pagada → 400', async () => {
    const pagada = {
      id: 'orden-1',
      clienteId: 'cli-1',
      estatus: 'pagada',
      total: '50.00',
    };
    const { service, create } = setup([[pagada]]);

    const error: unknown = await service
      .crearIntentoPago({ ordenId: 'orden-1' }, 8, ROLES.CAJERO)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
});
