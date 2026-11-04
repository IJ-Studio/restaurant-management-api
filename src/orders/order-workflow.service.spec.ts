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
  return { service: new OrderWorkflowService(db as never), writes, db };
}

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
    it('en efectivo calcula el cambio, cierra el pedido y registra el pago', async () => {
      const { service, writes } = setup([
        [orden({ estatus: 'entregada' })],
        [efectivo],
        [{ id: 'orden-1' }],
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
      });
      expect(writes.set[0]).toMatchObject({
        estatus: 'pagada',
        propina: '20.00',
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
    });

    it('con terminal no pide efectivo y guarda la referencia', async () => {
      const { service, writes } = setup([
        [orden()],
        [terminal],
        [{ id: 'orden-1' }],
        [],
      ]);

      await expect(
        service.cobrar(
          'orden-1',
          { metodoPagoId: 2, referencia: ' AUT-123 ' },
          5,
        ),
      ).resolves.toMatchObject({ cambio: '0.00', totalCobrado: '215.00' });
      expect(writes.values[0]).toMatchObject({
        referencia: 'AUT-123',
        propina: '0.00',
      });
    });

    it('si el método no acepta propina, no la suma', async () => {
      const { service } = setup([
        [orden()],
        [{ ...terminal, aplicaPropina: false }],
        [{ id: 'orden-1' }],
        [],
      ]);
      await expect(
        service.cobrar('orden-1', { metodoPagoId: 2, propina: 50 }, 5),
      ).resolves.toMatchObject({
        propina: '0.00',
        totalCobrado: '215.00',
      });
    });

    it('en efectivo exige lo recibido y que alcance', async () => {
      const sinMonto = setup([[orden()], [efectivo]]);
      await expect(
        sinMonto.service.cobrar('orden-1', { metodoPagoId: 1 }, 5),
      ).rejects.toThrow('Indica con cuánto pagó el cliente.');

      const noAlcanza = setup([[orden()], [efectivo]]);
      await expect(
        noAlcanza.service.cobrar(
          'orden-1',
          { metodoPagoId: 1, montoRecibido: 200 },
          5,
        ),
      ).rejects.toThrow('faltan $15.00');
    });

    it('un pedido pagado → 409; uno pendiente o cancelado → 400', async () => {
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
    });

    it('un total en cero o un método inválido → 400', async () => {
      await expect(
        setup([[orden({ total: '0' })]]).service.cobrar(
          'orden-1',
          { metodoPagoId: 1 },
          5,
        ),
      ).rejects.toThrow('mayor a cero');
      await expect(
        setup([[orden()], []]).service.cobrar(
          'orden-1',
          { metodoPagoId: 99 },
          5,
        ),
      ).rejects.toThrow('método de pago válido');
      await expect(
        setup([
          [orden()],
          [{ ...terminal, nombre: 'Tarjeta en línea (Stripe)' }],
        ]).service.cobrar('orden-1', { metodoPagoId: 3 }, 5),
      ).rejects.toThrow('método de pago válido');
    });

    it('si otra caja lo cobró al mismo tiempo → 409 y no registra un segundo pago', async () => {
      const { service, writes } = setup([[orden()], [terminal], []]);
      await expect(
        service.cobrar('orden-1', { metodoPagoId: 2 }, 5),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(writes.values).toHaveLength(0);
    });
  });
});
