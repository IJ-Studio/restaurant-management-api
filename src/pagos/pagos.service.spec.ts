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
      for: jest.fn().mockResolvedValue(rows),
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
    transaction: (fn: (tx: unknown) => unknown) => fn(db),
  };
  const service = new PagosService(db as never);

  const create = jest.fn().mockResolvedValue({
    client_secret: 'secret',
    status: 'requires_confirmation',
  });
  const constructEvent = jest.fn();
  const refund = jest.fn().mockResolvedValue({ id: 're_1' });
  (
    service as unknown as {
      stripe: {
        paymentIntents: { create: typeof create };
        webhooks: { constructEvent: typeof constructEvent };
        refunds: { create: typeof refund };
      };
    }
  ).stripe = {
    paymentIntents: { create },
    webhooks: { constructEvent },
    refunds: { create: refund },
  };

  return { service, create, constructEvent, set, insertValues, refund };
}

describe('PagosService.crearIntentoPago (DT-16)', () => {
  it('rechaza una dirección de envío que no es del cliente de la orden', async () => {
    const propia = {
      id: 'orden-1',
      clienteId: 'cli-7',
      estatus: 'pendiente',
      total: '50.00',
    };
    // orden, cliente del usuario y búsqueda de la dirección (no la encuentra para cli-7).
    const { service, create, set } = setup([[propia], [{ id: 'cli-7' }], []]);

    await expect(
      service.crearIntentoPago(
        { ordenId: 'orden-1', direccionId: 99 },
        7,
        ROLES.CLIENTE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(set).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('acepta la dirección propia y la guarda en la orden', async () => {
    const propia = {
      id: 'orden-1',
      clienteId: 'cli-7',
      estatus: 'pendiente',
      total: '50.00',
    };
    const { service, set } = setup([[propia], [{ id: 'cli-7' }], [{ id: 5 }]]);

    await service.crearIntentoPago(
      { ordenId: 'orden-1', direccionId: 5 },
      7,
      ROLES.CLIENTE,
    );
    expect(set).toHaveBeenCalledWith({ direccionEnvioId: 5 });
  });

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

  it.each(['lista', 'entregada'])(
    'el cajero puede cobrar con tarjeta una orden %s (el flujo normal de la mesa)',
    async (estatus) => {
      const orden = {
        id: 'orden-1',
        clienteId: null,
        estatus,
        total: '215.00',
      };
      const { service, create } = setup([[orden], []]);

      await service.crearIntentoPago({ ordenId: 'orden-1' }, 8, ROLES.CAJERO);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 21500 }),
        expect.anything(),
      );
    },
  );

  it('el cajero no puede cobrar con tarjeta un pedido con pagos parciales en caja', async () => {
    const orden = {
      id: 'orden-1',
      clienteId: null,
      estatus: 'entregada',
      total: '215.00',
    };
    const { service, create } = setup([[orden], [{ id: 'pago-1' }]]);

    await expect(
      service.crearIntentoPago({ ordenId: 'orden-1' }, 8, ROLES.CAJERO),
    ).rejects.toThrow('Este pedido ya tiene pagos en caja');
    expect(create).not.toHaveBeenCalled();
  });

  it('una orden pagada o cancelada no admite tarjeta', async () => {
    const orden = {
      id: 'orden-1',
      clienteId: null,
      estatus: 'pagada',
      total: '215.00',
    };
    const { service, create } = setup([[orden]]);

    await expect(
      service.crearIntentoPago({ ordenId: 'orden-1' }, 8, ROLES.CAJERO),
    ).rejects.toThrow('ya no admite pago');
    expect(create).not.toHaveBeenCalled();
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

  const metodoStripe = { id: 12 };

  it('payment_intent.succeeded registra el pago y cierra el pedido', async () => {
    const orden = { id: 'orden-1', estatus: 'abierta', total: '116.00' };
    const { service, constructEvent, set, insertValues, refund } = setup(
      [[metodoStripe], [orden], []],
      [[{ eventId: 'evt-1' }]],
    );
    constructEvent.mockReturnValue(eventoExitoso);

    const result = await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(result).toEqual({ received: true });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ estatus: 'pagada' }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        ordenId: 'orden-1',
        monto: '116.00',
        idTransaccionPasarela: 'pi_1',
      }),
    );
    expect(refund).not.toHaveBeenCalled();
  });

  it('el mismo intento ya registrado (otro evento) no duplica el pago', async () => {
    const orden = { id: 'orden-1', estatus: 'pagada', total: '116.00' };
    const { service, constructEvent, set, insertValues, refund } = setup(
      [[metodoStripe], [orden], [{ intento: 'pi_1' }]],
      [[{ eventId: 'evt-9' }]],
    );
    constructEvent.mockReturnValue(eventoExitoso);

    await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(set).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledTimes(1); // solo el evento
    expect(refund).not.toHaveBeenCalled();
  });

  it('si el pedido ya se cobró en caja, no lo vuelve a cobrar: reembolsa el intento', async () => {
    const orden = { id: 'orden-1', estatus: 'pagada', total: '116.00' };
    const { service, constructEvent, set, refund } = setup(
      [[metodoStripe], [orden], [{ intento: null }]],
      [[{ eventId: 'evt-1' }]],
    );
    constructEvent.mockReturnValue(eventoExitoso);

    await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(set).not.toHaveBeenCalled();
    expect(refund).toHaveBeenCalledWith(
      { payment_intent: 'pi_1', reason: 'duplicate' },
      { idempotencyKey: 'cobro-doble-pi_1' },
    );
  });

  it('un cobro menor al total (el pedido creció) se registra sin cerrar el pedido', async () => {
    const orden = { id: 'orden-1', estatus: 'abierta', total: '150.00' };
    const { service, constructEvent, set } = setup(
      [[metodoStripe], [orden], []],
      [[{ eventId: 'evt-1' }]],
    );
    constructEvent.mockReturnValue(eventoExitoso);

    await service.manejarWebhookStripe(Buffer.from(''), 'firma');

    expect(set).toHaveBeenCalledWith(
      expect.not.objectContaining({ estatus: 'pagada' }),
    );
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
