import { BadRequestException } from '@nestjs/common';

import { ROLES } from '../common/constants/roles';
import { PagosService } from './pagos.service';

process.env.STRIPE_SECRET_KEY = 'sk_test_falso';
process.env.FACTURAPI_TEST_KEY = 'sk_test_falso';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_falso';

function setup(rowsQueue: unknown[][], eventsInserted: unknown[][] = []) {
  const results = [...rowsQueue];
  const where = jest.fn(() => {
    const rows = results.shift() ?? [];
    return Object.assign(Promise.resolve(rows), {
      limit: jest.fn().mockResolvedValue(rows),
    });
  });

  const insertReturning = jest.fn();
  for (const result of eventsInserted) {
    insertReturning.mockResolvedValueOnce(result);
  }
  const onConflictDoNothing = jest
    .fn()
    .mockReturnValue({ returning: insertReturning });
  const insertValues = jest.fn(() =>
    Object.assign(Promise.resolve(undefined), {
      onConflictDoNothing,
      returning: insertReturning,
    }),
  );

  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where: updateWhere });
  const deleteWhere = jest.fn().mockResolvedValue(undefined);
  const del = jest.fn().mockReturnValue({ where: deleteWhere });

  const db = {
    select: () => ({ from: () => ({ where }) }),
    insert: () => ({ values: insertValues }),
    update: () => ({ set }),
    delete: del,
  };
  const service = new PagosService(db as never);

  const create = jest.fn().mockResolvedValue({
    client_secret: 'secret',
    status: 'requires_confirmation',
  });
  const constructEvent = jest.fn();
  (
    service as unknown as {
      stripe: {
        paymentIntents: { create: typeof create };
        webhooks: { constructEvent: typeof constructEvent };
      };
    }
  ).stripe = {
    paymentIntents: { create },
    webhooks: { constructEvent },
  };

  return { service, create, constructEvent, set, insertValues };
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

describe('PagosService.manejarWebhookStripe (DT-D10 / NH-11 / NH-12)', () => {
  const eventoExitoso = {
    id: 'evt-1',
    type: 'payment_intent.succeeded',
    data: {
      object: { id: 'pi_1', amount: 11600, metadata: { ordenId: 'orden-1' } },
    },
  };

  it('no arranca sin STRIPE_WEBHOOK_SECRET', () => {
    const anterior = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    try {
      expect(() => new PagosService({} as never)).toThrow(
        'STRIPE_WEBHOOK_SECRET',
      );
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = anterior;
    }
  });

  it('firma inválida → 400 genérico, sin el detalle interno', async () => {
    const { service, constructEvent } = setup([]);
    constructEvent.mockImplementation(() => {
      throw new Error('detalle interno de stripe');
    });

    const error: unknown = await service
      .manejarWebhookStripe(Buffer.from(''), 'firma-mala')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toBe('Firma de webhook inválida.');
    expect((error as Error).message).not.toContain('detalle interno');
  });

  it('un evento repetido no vuelve a procesar la orden', async () => {
    const { service, constructEvent, set } = setup([], [[]]);
    constructEvent.mockReturnValue(eventoExitoso);

    const result = await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(result).toEqual({ received: true, duplicate: true });
    expect(set).not.toHaveBeenCalled();
  });

  it('payment_intent.succeeded marca la orden como pagada una sola vez', async () => {
    const orden = { id: 'orden-1', estatus: 'abierta' };
    const metodo = { id: 3 };
    const { service, constructEvent, set, insertValues } = setup(
      [[orden], [metodo]],
      [[{ eventId: 'evt-1' }]],
    );
    constructEvent.mockReturnValue(eventoExitoso);

    const result = await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(result).toEqual({ received: true });
    expect(set).toHaveBeenCalledWith({ estatus: 'pagada' });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        ordenId: 'orden-1',
        idTransaccionPasarela: 'pi_1',
      }),
    );
  });

  it('si la orden ya está pagada no duplica el pago', async () => {
    const orden = { id: 'orden-1', estatus: 'pagada' };
    const { service, constructEvent, set } = setup(
      [[orden]],
      [[{ eventId: 'evt-1' }]],
    );
    constructEvent.mockReturnValue(eventoExitoso);

    await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(set).not.toHaveBeenCalled();
  });

  it('payment_intent.payment_failed no actualiza la orden', async () => {
    const eventoFallido = {
      id: 'evt-2',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_2', metadata: { ordenId: 'orden-1' } } },
    };
    const { service, constructEvent, set } = setup(
      [],
      [[{ eventId: 'evt-2' }]],
    );
    constructEvent.mockReturnValue(eventoFallido);

    const result = await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(result).toEqual({ received: true });
    expect(set).not.toHaveBeenCalled();
  });
});
