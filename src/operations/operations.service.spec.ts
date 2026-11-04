import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import {
  claseDeMetodo,
  construirResumen,
  OperationsService,
  rangoDeHoy,
  TABLA_INCIDENCIAS,
} from './operations.service';

type Chain = Record<string, jest.Mock> & PromiseLike<unknown>;

/** `db` simulado: cada consulta toma la siguiente respuesta de `results`; registra `.set()` y `.values()`. */
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
      'innerJoin',
      'orderBy',
      'groupBy',
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
  return { service: new OperationsService(db as never), writes };
}

interface FakeDb {
  select: jest.Mock<Chain, []>;
  update: jest.Mock<Chain, []>;
  insert: jest.Mock<Chain, []>;
  transaction: jest.Mock<Promise<unknown>, [(tx: unknown) => Promise<unknown>]>;
}

const usuario = [{ name: 'Diego', lastname: 'Luna' }];

describe('utilidades', () => {
  it('clasifica los métodos para el corte', () => {
    expect(claseDeMetodo('efectivo', 'Efectivo')).toBe('efectivo');
    expect(claseDeMetodo('tarjeta', 'Tarjeta débito')).toBe('tarjeta');
    expect(claseDeMetodo('digital', 'Mercado Pago')).toBe('digital');
    expect(claseDeMetodo(null, null)).toBe('digital');
  });

  it('el día va de la medianoche a la siguiente', () => {
    const { inicio, fin } = rangoDeHoy(new Date(2026, 9, 28, 15, 30));
    expect(new Date(inicio)).toEqual(new Date(2026, 9, 28));
    expect(new Date(fin)).toEqual(new Date(2026, 9, 29));
  });
});

describe('incidencias', () => {
  it('guarda un retraso en la bitácora con la mesa del pedido', async () => {
    const { service, writes } = setup([
      [{ id: 'orden-1', mesa: 'S01' }],
      [{ id: 9n, creadoEn: '2026-10-28 20:00:00+00' }],
      usuario,
    ]);

    const result = await service.reportarIncidencia(
      {
        tipo: 'retraso',
        ordenId: 'orden-1',
        minutos: 15,
        mensaje: ' Falta el horno ',
      },
      4,
    );

    expect(writes.values[0]).toEqual({
      userId: 4,
      tabla: TABLA_INCIDENCIAS,
      registroId: 'orden-1',
      accion: 'REPORTE',
      datosDespues: {
        tipo: 'retraso',
        mensaje: 'Falta el horno',
        minutos: 15,
        mesa: 'S01',
      },
    });
    expect(result).toMatchObject({
      message: 'Se avisó del retraso al personal de piso.',
      incidencia: { id: '9', reportadoPor: 'Diego Luna', mesa: 'S01' },
    });
  });

  it('una incidencia general no lleva pedido ni minutos', async () => {
    const { service, writes } = setup([[{ id: 1n, creadoEn: null }], usuario]);
    await service.reportarIncidencia({ tipo: 'equipo', minutos: 10 }, 4);
    expect(writes.values[0]).toMatchObject({
      registroId: null,
      datosDespues: {
        tipo: 'equipo',
        mensaje: null,
        minutos: null,
        mesa: null,
      },
    });
  });

  it('un pedido que no existe → 404', async () => {
    const { service } = setup([[]]);
    await expect(
      service.reportarIncidencia({ tipo: 'retraso', ordenId: 'x' }, 4),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lista las de hoy con quién las reportó y tolera datos incompletos', async () => {
    const { service } = setup([
      [
        {
          id: 3n,
          registroId: 'orden-1',
          datos: {
            tipo: 'falta_insumo',
            mensaje: 'Sin aguacate',
            minutos: null,
            mesa: 'T01',
          },
          creadoEn: 'x',
          name: 'Diego',
          lastname: 'Luna',
        },
        {
          id: 4n,
          registroId: null,
          datos: null,
          creadoEn: 'y',
          name: null,
          lastname: null,
        },
      ],
    ]);
    await expect(service.listarIncidencias()).resolves.toEqual([
      {
        id: '3',
        ordenId: 'orden-1',
        tipo: 'falta_insumo',
        mensaje: 'Sin aguacate',
        minutos: null,
        mesa: 'T01',
        reportadoPor: 'Diego Luna',
        creadoEn: 'x',
      },
      {
        id: '4',
        ordenId: null,
        tipo: 'otro',
        mensaje: null,
        minutos: null,
        mesa: null,
        reportadoPor: null,
        creadoEn: 'y',
      },
    ]);
  });
});

describe('mermas', () => {
  const aguacate = {
    id: 31,
    name: 'Aguacate',
    unit: 'kg',
    stock: '5.000',
    costPerUnit: '120.00',
    active: true,
  };

  it('descuenta el producto del inventario y calcula el costo', async () => {
    const { service, writes } = setup([
      usuario,
      [aguacate],
      [],
      [{ id: 1, productName: 'Aguacate' }],
    ]);

    const result = await service.registrarMerma(
      {
        productId: 31,
        quantity: 1.5,
        reason: 'caducado',
        justification: ' Se oxidó ',
      },
      4,
    );

    expect(writes.set[0]).toMatchObject({ stock: '3.500' });
    expect(writes.values[0]).toMatchObject({
      productId: 31,
      productName: 'Aguacate',
      quantity: '1.5',
      unit: 'kg',
      reason: 'caducado',
      justification: 'Se oxidó',
      reportedBy: 'Diego Luna',
      cost: '180.00',
    });
    expect(result.message).toBe(
      'Merma registrada. Quedan 3.500 kg en inventario.',
    );
  });

  it('el stock nunca queda negativo', async () => {
    const { service, writes } = setup([usuario, [aguacate], [], [{ id: 1 }]]);
    await service.registrarMerma(
      {
        productId: 31,
        quantity: 9,
        reason: 'derrame',
        justification: 'Se cayó',
      },
      4,
    );
    expect(writes.set[0]).toMatchObject({ stock: '0.000' });
  });

  it('sin producto del inventario solo registra el reporte', async () => {
    const { service, writes } = setup([usuario, [{ id: 2 }]]);
    const result = await service.registrarMerma(
      {
        productName: ' Salsa verde ',
        quantity: 2,
        unit: 'lt',
        reason: 'preparacion',
        justification: 'Se quemó',
      },
      4,
    );
    expect(writes.set).toHaveLength(0);
    expect(writes.values[0]).toMatchObject({
      productId: null,
      productName: 'Salsa verde',
      unit: 'lt',
      cost: '0.00',
    });
    expect(result.message).toBe('Merma registrada.');
  });

  it('pide qué se perdió y que el producto exista', async () => {
    await expect(
      setup([]).service.registrarMerma(
        { quantity: 1, reason: 'otro', justification: 'xyz' },
        4,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      setup([usuario, []]).service.registrarMerma(
        { productId: 99, quantity: 1, reason: 'otro', justification: 'xyz' },
        4,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('corte de caja', () => {
  const abierta = {
    id: 7,
    userId: 2,
    fechaApertura: '2026-10-28T14:00:00.000Z',
    fechaCierre: null,
    fondoInicial: '500.00',
    efectivoContado: null,
    diferencia: null,
    estatus: 'abierto',
  };
  const pagosCaja = [
    { monto: '300.00', propina: '30.00', tipo: 'efectivo', metodo: 'Efectivo' },
    {
      monto: '200.00',
      propina: '20.00',
      tipo: 'tarjeta',
      metodo: 'Tarjeta débito',
    },
    { monto: '100.00', propina: '0', tipo: 'digital', metodo: 'Mercado Pago' },
  ];

  it('sin caja abierta lo dice', async () => {
    await expect(setup([[]]).service.cajaActual(2)).resolves.toEqual({
      abierta: false,
    });
  });

  it('muestra lo cobrado desde que se abrió y el efectivo que debe haber', async () => {
    await expect(
      setup([[abierta], pagosCaja]).service.cajaActual(2),
    ).resolves.toMatchObject({
      abierta: true,
      fondoInicial: '500.00',
      efectivoVentas: '300.00',
      tarjetaVentas: '200.00',
      digitalVentas: '100.00',
      totalVentas: '600.00',
      propinas: '50.00',
      numPagos: 3,
      // fondo + efectivo + propinas en efectivo
      efectivoEsperado: '830.00',
    });
  });

  it('abre una caja con fondo; no deja abrir dos', async () => {
    const { service, writes } = setup([[], [abierta]]);
    await expect(
      service.abrirCaja(2, { fondoInicial: 500 }),
    ).resolves.toMatchObject({
      message: 'Caja abierta.',
      caja: { fondoInicial: '500.00', efectivoEsperado: '500.00' },
    });
    expect(writes.values[0]).toMatchObject({
      userId: 2,
      fondoInicial: '500.00',
      estatus: 'abierto',
    });

    await expect(
      setup([[abierta]]).service.abrirCaja(2, { fondoInicial: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('al cerrar calcula sobrante, faltante o cuadre', async () => {
    const cerrar = async (contado: number) => {
      const { service, writes } = setup([
        [abierta],
        pagosCaja,
        [{ ...abierta, estatus: 'cerrado' }],
      ]);
      const result = await service.cerrarCaja(2, {
        efectivoContado: contado,
        notas: ' ok ',
      });
      return { result, set: writes.set[0] };
    };

    const cuadra = await cerrar(830);
    expect(cuadra.result.message).toBe('Caja cerrada. El efectivo cuadra.');
    expect(cuadra.set).toMatchObject({
      diferencia: '0.00',
      estatus: 'cerrado',
      notas: 'ok',
      totalVentas: '600.00',
    });
    expect((await cerrar(850)).result.message).toBe(
      'Caja cerrada con $20.00 de sobrante.',
    );
    expect((await cerrar(800)).result.message).toBe(
      'Caja cerrada con $30.00 de faltante.',
    );
  });

  it('no se cierra una caja que no está abierta', async () => {
    await expect(
      setup([[]]).service.cerrarCaja(2, { efectivoContado: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      setup([[abierta], [], []]).service.cerrarCaja(2, {
        efectivoContado: 500,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lista los cortes con el nombre del cajero', async () => {
    const { service } = setup([
      [{ caja: abierta, name: 'Carlos', lastname: 'Soto' }],
    ]);
    await expect(service.listarCortes()).resolves.toEqual([
      { ...abierta, cajero: 'Carlos Soto' },
    ]);
  });
});

describe('resumen del día', () => {
  it('junta ventas por método, cajero, mesero, hora y platillos', () => {
    const resumen = construirResumen({
      pagosHoy: [
        {
          ordenId: 'a',
          monto: '200.00',
          propina: '20.00',
          creadoEn: new Date(2026, 9, 28, 14, 10).toISOString(),
          metodo: 'Efectivo',
          tipo: 'efectivo',
          cajeroId: 2,
          cajeroNombre: 'Carlos',
          cajeroApellido: 'Soto',
          mesa: 'S01',
        },
        {
          ordenId: 'a',
          monto: '100.00',
          propina: null,
          creadoEn: new Date(2026, 9, 28, 14, 40).toISOString(),
          metodo: 'Tarjeta débito',
          tipo: 'tarjeta',
          cajeroId: 2,
          cajeroNombre: 'Carlos',
          cajeroApellido: 'Soto',
          mesa: 'S01',
        },
        {
          ordenId: 'b',
          monto: '150.00',
          propina: '0',
          creadoEn: null,
          metodo: null,
          tipo: null,
          cajeroId: null,
          cajeroNombre: null,
          cajeroApellido: null,
          mesa: null,
        },
      ],
      ordenesHoy: [
        {
          id: 'a',
          estatus: 'pagada',
          total: '300.00',
          comensales: 4,
          meseroId: 3,
          meseroNombre: 'Mariana',
          meseroApellido: 'Pérez',
        },
        {
          id: 'b',
          estatus: 'pagada',
          total: '150.00',
          comensales: null,
          meseroId: null,
          meseroNombre: null,
          meseroApellido: null,
        },
        {
          id: 'c',
          estatus: 'cancelada',
          total: '90.00',
          comensales: 2,
          meseroId: 3,
          meseroNombre: 'Mariana',
          meseroApellido: 'Pérez',
        },
        {
          id: 'd',
          estatus: 'abierta',
          total: '80.00',
          comensales: 2,
          meseroId: 3,
          meseroNombre: 'Mariana',
          meseroApellido: 'Pérez',
        },
      ],
      top: [{ nombre: 'Mole', cantidad: 5, total: '900.5' }],
      incidencias: [{ id: '1' }],
      mermas: [{ cost: '180.00' }, { cost: '20.50' }],
      cajas: [{ id: 7, fechaApertura: 'x', name: 'Carlos', lastname: 'Soto' }],
    });

    expect(resumen.ventas).toEqual({
      cobrado: '450.00',
      propinas: '20.00',
      pagos: 3,
      ordenesPagadas: 2,
      ticketPromedio: '225.00',
      comensales: 7,
    });
    expect(resumen.pedidos).toEqual({
      total: 3,
      porEstatus: { pagada: 2, cancelada: 1, abierta: 1 },
    });
    expect(resumen.porMetodo).toEqual([
      { metodo: 'Efectivo', total: '200.00', pagos: 1 },
      { metodo: 'Otro', total: '150.00', pagos: 1 },
      { metodo: 'Tarjeta débito', total: '100.00', pagos: 1 },
    ]);
    expect(resumen.porCajero).toEqual([
      { nombre: 'Carlos Soto', total: '300.00', pagos: 2 },
      { nombre: 'Pago en línea', total: '150.00', pagos: 1 },
    ]);
    expect(resumen.porMesero).toEqual([
      { nombre: 'Mariana Pérez', pedidos: 2, total: '380.00', comensales: 6 },
      {
        nombre: 'Sin asignar (web)',
        pedidos: 1,
        total: '150.00',
        comensales: 1,
      },
    ]);
    expect(resumen.porHora[14]).toBe(300);
    expect(resumen.topPlatillos).toEqual([
      { nombre: 'Mole', cantidad: 5, total: '900.50' },
    ]);
    expect(resumen.ultimosCobros[0]).toMatchObject({
      mesa: 'S01',
      monto: '200.00',
      cajero: 'Carlos Soto',
    });
    expect(resumen.mermas).toEqual({ registros: 2, costo: '200.50' });
    expect(resumen.cajasAbiertas).toEqual([
      { id: 7, cajero: 'Carlos Soto', desde: 'x' },
    ]);
  });

  it('sin ventas no divide entre cero', () => {
    const resumen = construirResumen({
      pagosHoy: [],
      ordenesHoy: [],
      top: [],
      incidencias: [],
      mermas: [],
      cajas: [],
    });
    expect(resumen.ventas.ticketPromedio).toBe('0.00');
    expect(resumen.porHora).toHaveLength(24);
  });

  it('resumenDelDia consulta todo en paralelo', async () => {
    const { service } = setup([[], [], [], [], [], []]);
    await expect(service.resumenDelDia()).resolves.toMatchObject({
      ventas: { cobrado: '0.00' },
    });
  });
});

describe('listarProductos', () => {
  it('incluye el mínimo de existencias (aditivo para la web; la móvil lo ignora)', async () => {
    const { service } = setup([
      [{ id: 1, name: 'Tortillas', stock: '2', minStock: '5' }],
    ]);
    const db = (service as unknown as { db: { select: jest.Mock } }).db;
    await service.listarProductos();
    expect(
      Object.keys((db.select.mock.calls as Record<string, unknown>[][])[0][0]),
    ).toContain('minStock');
  });
});
