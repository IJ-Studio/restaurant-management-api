import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ROLES } from '../common/constants/roles';
import { OrderWorkflowService } from './order-workflow.service';

type Chain = Record<string, jest.Mock> & PromiseLike<unknown>;

/**
 * `db` simulado: cada consulta (select/update/insert) toma la siguiente respuesta de `results`,
 * sin importar los métodos que encadene. `writes` guarda lo que se mandó en `.set()` y `.values()`.
 */
function setup(results: unknown[]) {
  const queue = [...results];
  const writes: { set: unknown[]; values: unknown[] } = { set: [], values: [] };

  const query = (): Chain => {
    const chain = {} as Chain;
    for (const method of [
      'from',
      'where',
      'limit',
      'leftJoin',
      'orderBy',
      'returning',
      'for',
    ]) {
      chain[method] = jest.fn(() => chain);
    }
    chain.set = jest.fn((data: unknown) => {
      writes.set.push(data);
      return chain;
    });
    chain.values = jest.fn((data: unknown) => {
      writes.values.push(data);
      return chain;
    });
    (chain as { then: PromiseLike<unknown>['then'] }).then = (
      resolve,
      reject,
    ) => Promise.resolve(queue.shift() ?? []).then(resolve, reject);
    return chain;
  };

  const db: FakeDb = {
    select: jest.fn(query),
    update: jest.fn(query),
    insert: jest.fn(query),
    transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };
  const notifications = { sendToRoles: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new OrderWorkflowService(db as never, notifications as never),
    writes,
    db,
    notifications,
  };
}

/** El aviso sale sin `await`: deja que termine antes de revisar qué se mandó. */
const avisoEnviado = () => new Promise((resolve) => setImmediate(resolve));

interface FakeDb {
  select: jest.Mock<Chain, []>;
  update: jest.Mock<Chain, []>;
  insert: jest.Mock<Chain, []>;
  transaction: jest.Mock<Promise<unknown>, [(tx: unknown) => Promise<unknown>]>;
}

const orden = (overrides: Record<string, unknown> = {}) => ({
  id: 'orden-1',
  folio: null,
  tipo: 'mesa',
  mesaId: 3,
  estatus: 'abierta',
  subtotal: '215.00',
  propina: '0',
  total: '215.00',
  notasCocina: null,
  tiempoApertura: '2026-10-28 20:41:35+00',
  tiempoCierre: null,
  ...overrides,
});

const efectivo = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'efectivo',
  activo: true,
  aplicaPropina: true,
};
const terminal = {
  id: 2,
  nombre: 'Tarjeta (terminal)',
  tipo: 'tarjeta',
  activo: true,
  aplicaPropina: true,
};
const cocina = { id: 9, roleId: ROLES.COCINA };
const mesero = { id: 3, roleId: ROLES.MESERO };

describe('OrderWorkflowService', () => {
  describe('obtenerDetalle', () => {
    it('devuelve el pedido con su mesa y sus platillos', async () => {
      const { service } = setup([
        [orden()],
        [{ numero: 'S01' }],
        [
          {
            id: 10,
            cantidad: 2,
            precioUnitario: '70.00',
            subtotal: '140.00',
            notas: 'Sin hielo',
            nombre: 'Ojos Verdes',
            imagenUrl: null,
          },
        ],
      ]);

      await expect(service.obtenerDetalle('orden-1')).resolves.toMatchObject({
        id: 'orden-1',
        mesa: 'S01',
        estatus: 'abierta',
        total: '215.00',
        items: [
          {
            id: 10,
            cantidad: 2,
            notas: 'Sin hielo',
            platillo: { nombre: 'Ojos Verdes', imagenUrl: null },
          },
        ],
      });
    });

    it('un pedido a domicilio no tiene mesa', async () => {
      const { service } = setup([
        [orden({ mesaId: null, tipo: 'domicilio' })],
        [],
      ]);
      await expect(service.obtenerDetalle('orden-1')).resolves.toMatchObject({
        mesa: null,
        items: [],
      });
    });

    it('un pedido que no existe → 404', async () => {
      const { service } = setup([[]]);
      await expect(service.obtenerDetalle('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cambiarEstatus', () => {
    it('cocina empieza a preparar un pedido enviado', async () => {
      const { service, writes } = setup([[orden()], [{ id: 'orden-1' }]]);

      await expect(
        service.cambiarEstatus('orden-1', 'en_preparacion', cocina),
      ).resolves.toMatchObject({
        success: true,
        estatus: 'en_preparacion',
      });
      expect(writes.set[0]).toMatchObject({ estatus: 'en_preparacion' });
    });

    it('al marcarlo listo guarda la hora en sus platillos', async () => {
      const { service, writes } = setup([
        [orden({ estatus: 'en_preparacion' })],
        [{ id: 'orden-1' }],
        [],
      ]);

      await service.cambiarEstatus('orden-1', 'lista', cocina);

      expect(Object.keys(writes.set[1] as object)).toEqual(['tiempoListo']);
      expect(
        typeof (writes.set[1] as { tiempoListo: unknown }).tiempoListo,
      ).toBe('string');
    });

    it('el mesero entrega un pedido listo', async () => {
      const { service, writes } = setup([
        [orden({ estatus: 'lista' })],
        [{ id: 'orden-1' }],
        [],
      ]);

      await expect(
        service.cambiarEstatus('orden-1', 'entregada', mesero),
      ).resolves.toMatchObject({
        message: 'Pedido entregado a la mesa.',
      });
      expect(Object.keys(writes.set[1] as object)).toEqual(['tiempoEntrega']);
      expect(
        typeof (writes.set[1] as { tiempoEntrega: unknown }).tiempoEntrega,
      ).toBe('string');
    });

    describe('avisos push al cambiar de manos (HU-07)', () => {
      it('cocina marca listo → aviso a los meseros con la mesa y sin datos del cliente', async () => {
        const { service, notifications } = setup([
          [orden({ estatus: 'en_preparacion' })],
          [{ id: 'orden-1' }],
          [],
          [{ numero: 'B01' }],
        ]);

        await service.cambiarEstatus('orden-1', 'lista', cocina);
        await avisoEnviado();

        expect(notifications.sendToRoles).toHaveBeenCalledWith([ROLES.MESERO], {
          title: 'Pedido listo',
          body: 'Mesa B01: listo para entregar.',
          data: { type: 'order_ready', orderId: 'orden-1', place: 'Mesa B01' },
        });
      });

      it('el mesero entrega → aviso a caja para cobrar', async () => {
        const { service, notifications } = setup([
          [orden({ estatus: 'lista' })],
          [{ id: 'orden-1' }],
          [],
          [{ numero: 'B01' }],
        ]);

        await service.cambiarEstatus('orden-1', 'entregada', mesero);
        await avisoEnviado();

        expect(notifications.sendToRoles).toHaveBeenCalledWith([ROLES.CAJERO], {
          title: 'Cuenta por cobrar',
          body: 'Mesa B01: entregado, falta cobrar.',
          data: {
            type: 'order_delivered',
            orderId: 'orden-1',
            place: 'Mesa B01',
          },
        });
      });

      it('un pedido sin mesa se identifica por su folio corto', async () => {
        const { service, notifications } = setup([
          [orden({ id: 'a1b2c3d4-0000', mesaId: null, estatus: 'abierta' })],
          [{ id: 'a1b2c3d4-0000' }],
          [],
        ]);

        await service.cambiarEstatus('a1b2c3d4-0000', 'lista', cocina);
        await avisoEnviado();

        expect(notifications.sendToRoles).toHaveBeenCalledWith(
          [ROLES.MESERO],
          expect.objectContaining({
            body: 'Pedido A1B2C3: listo para entregar.',
          }),
        );
      });

      it('empezar a preparar no avisa a nadie', async () => {
        const { service, notifications } = setup([
          [orden()],
          [{ id: 'orden-1' }],
        ]);

        await service.cambiarEstatus('orden-1', 'en_preparacion', cocina);
        await avisoEnviado();

        expect(notifications.sendToRoles).not.toHaveBeenCalled();
      });

      it('un cambio rechazado no avisa', async () => {
        const { service, notifications } = setup([
          [orden({ estatus: 'lista' })],
          [],
        ]);

        await expect(
          service.cambiarEstatus('orden-1', 'entregada', mesero),
        ).rejects.toBeInstanceOf(ConflictException);
        await avisoEnviado();

        expect(notifications.sendToRoles).not.toHaveBeenCalled();
      });

      it('si el aviso falla, el cambio de estado se mantiene', async () => {
        const { service, notifications } = setup([
          [orden({ estatus: 'en_preparacion' })],
          [{ id: 'orden-1' }],
          [],
          [{ numero: 'B01' }],
        ]);
        notifications.sendToRoles.mockRejectedValue(new Error('Expo caído'));

        await expect(
          service.cambiarEstatus('orden-1', 'lista', cocina),
        ).resolves.toMatchObject({ success: true, estatus: 'lista' });
        await avisoEnviado();
      });
    });

    it('el mesero no puede marcar un pedido como listo → 403', async () => {
      const { service, db } = setup([]);
      await expect(
        service.cambiarEstatus('orden-1', 'lista', mesero),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('no se puede saltar pasos: un pedido pendiente no se entrega → 400', async () => {
      const { service, db } = setup([[orden({ estatus: 'pendiente' })]]);
      await expect(
        service.cambiarEstatus('orden-1', 'entregada', mesero),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('si otro dispositivo ya lo movió → 409', async () => {
      const { service } = setup([[orden()], []]);
      await expect(
        service.cambiarEstatus('orden-1', 'en_preparacion', cocina),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('listarMetodosPago', () => {
    it('deja fuera la pasarela en línea y marca el efectivo', async () => {
      const { service } = setup([
        [
          { id: 1, nombre: 'Efectivo', tipo: 'efectivo', aplicaPropina: true },
          {
            id: 2,
            nombre: 'Tarjeta (terminal)',
            tipo: 'tarjeta',
            aplicaPropina: null,
          },
          {
            id: 3,
            nombre: 'Tarjeta en línea (Stripe)',
            tipo: 'tarjeta',
            aplicaPropina: true,
          },
        ],
      ]);

      await expect(service.listarMetodosPago()).resolves.toEqual([
        {
          id: 1,
          nombre: 'Efectivo',
          tipo: 'efectivo',
          aplicaPropina: true,
          esEfectivo: true,
        },
        {
          id: 2,
          nombre: 'Tarjeta (terminal)',
          tipo: 'tarjeta',
          aplicaPropina: true,
          esEfectivo: false,
        },
      ]);
    });
  });

  describe('cobrar', () => {
    // Orden de las consultas: pedido, método y, dentro de la transacción: pedido bloqueado,
    // suma de pagos previos, insert del pago y update del pedido.
    const cobrable = (overrides = {}) => [
      orden({ estatus: 'entregada', ...overrides }),
    ];
    const sinPagos = [{ pagado: '0', propinas: '0' }];

    it('en efectivo cobra todo lo que falta, calcula el cambio y cierra el pedido', async () => {
      const { service, writes } = setup([
        cobrable(),
        [efectivo],
        cobrable(),
        sinPagos,
        [],
        [],
      ]);

      const result = await service.cobrar(
        'orden-1',
        { metodoPagoId: 1, propina: 20, montoRecibido: 300 },
        5,
      );

      expect(result).toMatchObject({
        success: true,
        total: '215.00',
        propina: '20.00',
        totalCobrado: '235.00',
        cambio: '65.00',
        pagado: '215.00',
        restante: '0.00',
        cerrada: true,
      });
      expect(writes.values[0]).toMatchObject({
        ordenId: 'orden-1',
        metodoPagoId: 1,
        monto: '215.00',
        propina: '20.00',
        cambio: '65.00',
        cobradoPor: 5,
        estatus: 'completado',
      });
      expect(writes.set[0]).toMatchObject({
        estatus: 'pagada',
        propina: '20.00',
      });
    });

    it('cuenta separada: cobra una parte, deja el pedido abierto y guarda para quién es', async () => {
      const { service, writes } = setup([
        cobrable(),
        [terminal],
        cobrable(),
        sinPagos,
        [],
        [],
      ]);

      const result = await service.cobrar(
        'orden-1',
        { metodoPagoId: 2, monto: 100, propina: 10, etiqueta: ' Persona 1 ' },
        5,
      );

      expect(result).toMatchObject({
        total: '100.00',
        totalCobrado: '110.00',
        pagado: '100.00',
        restante: '115.00',
        cerrada: false,
        message: 'Pago registrado. Faltan $115.00 por cobrar.',
      });
      expect(writes.values[0]).toMatchObject({
        monto: '100.00',
        referencia: 'Persona 1',
      });
      // No cambia el estatus: solo acumula la propina.
      expect(writes.set[0]).toEqual({
        propina: '10.00',
        actualizadoEn: expect.any(String) as unknown,
      });
    });

    it('el último pago de la cuenta separada cierra el pedido y suma las propinas', async () => {
      const { service, writes } = setup([
        cobrable(),
        [terminal],
        cobrable(),
        [{ pagado: '100.00', propinas: '10.00' }],
        [],
        [],
      ]);

      await expect(
        service.cobrar('orden-1', { metodoPagoId: 2, propina: 5 }, 5),
      ).resolves.toMatchObject({
        total: '115.00',
        restante: '0.00',
        cerrada: true,
      });
      expect(writes.set[0]).toMatchObject({
        estatus: 'pagada',
        propina: '15.00',
      });
    });

    it('no deja cobrar más de lo que falta', async () => {
      const { service, writes } = setup([
        cobrable(),
        [terminal],
        cobrable(),
        [{ pagado: '200.00', propinas: '0' }],
      ]);
      await expect(
        service.cobrar('orden-1', { metodoPagoId: 2, monto: 20 }, 5),
      ).rejects.toThrow('El monto excede lo que falta por cobrar ($15.00).');
      expect(writes.values).toHaveLength(0);
    });

    it('si el método no acepta propina, no la suma', async () => {
      const { service } = setup([
        cobrable(),
        [{ ...terminal, aplicaPropina: false }],
        cobrable(),
        sinPagos,
        [],
        [],
      ]);
      await expect(
        service.cobrar('orden-1', { metodoPagoId: 2, propina: 50 }, 5),
      ).resolves.toMatchObject({
        propina: '0.00',
        totalCobrado: '215.00',
      });
    });

    it('con terminal guarda la referencia', async () => {
      const { service, writes } = setup([
        cobrable(),
        [terminal],
        cobrable(),
        sinPagos,
        [],
        [],
      ]);
      await service.cobrar(
        'orden-1',
        { metodoPagoId: 2, referencia: ' AUT-123 ' },
        5,
      );
      expect(writes.values[0]).toMatchObject({
        referencia: 'AUT-123',
        propina: '0.00',
      });
    });

    it('en efectivo exige lo recibido y que alcance', async () => {
      const sinMonto = setup([cobrable(), [efectivo], cobrable(), sinPagos]);
      await expect(
        sinMonto.service.cobrar('orden-1', { metodoPagoId: 1 }, 5),
      ).rejects.toThrow('Indica con cuánto pagó el cliente.');

      const noAlcanza = setup([cobrable(), [efectivo], cobrable(), sinPagos]);
      await expect(
        noAlcanza.service.cobrar(
          'orden-1',
          { metodoPagoId: 1, montoRecibido: 200 },
          5,
        ),
      ).rejects.toThrow('faltan $15.00');
    });

    it('un pedido pagado → 409; uno pendiente → 400; total en cero o método inválido → 400', async () => {
      await expect(
        setup([[orden({ estatus: 'pagada' })]]).service.cobrar(
          'orden-1',
          { metodoPagoId: 1 },
          5,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        setup([[orden({ estatus: 'pendiente' })]]).service.cobrar(
          'orden-1',
          { metodoPagoId: 1 },
          5,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        setup([[orden({ total: '0' })]]).service.cobrar(
          'orden-1',
          { metodoPagoId: 1 },
          5,
        ),
      ).rejects.toThrow('mayor a cero');
      await expect(
        setup([cobrable(), []]).service.cobrar(
          'orden-1',
          { metodoPagoId: 99 },
          5,
        ),
      ).rejects.toThrow('método de pago válido');
      await expect(
        setup([
          cobrable(),
          [{ ...terminal, nombre: 'Tarjeta en línea (Stripe)' }],
        ]).service.cobrar('orden-1', { metodoPagoId: 3 }, 5),
      ).rejects.toThrow('método de pago válido');
    });

    it('si otra caja lo cerró mientras tanto → 409 y no registra un segundo pago', async () => {
      const cerrada = setup([
        cobrable(),
        [terminal],
        [orden({ estatus: 'pagada' })],
      ]);
      await expect(
        cerrada.service.cobrar('orden-1', { metodoPagoId: 2 }, 5),
      ).rejects.toThrow('Este pedido ya fue cobrado.');
      const cubierta = setup([
        cobrable(),
        [terminal],
        cobrable(),
        [{ pagado: '215.00', propinas: '0' }],
      ]);
      await expect(
        cubierta.service.cobrar('orden-1', { metodoPagoId: 2 }, 5),
      ).rejects.toThrow('Este pedido ya quedó cubierto.');
      expect(cerrada.writes.values).toHaveLength(0);
      expect(cubierta.writes.values).toHaveLength(0);
    });
  });
});
