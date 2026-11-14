/**
 * Integración de caja, pagos y facturación contra el API local real (app ↔ API ↔ BD ↔ Stripe test ↔
 * Facturapi sandbox). No corre en CI: necesita el API local con la base de pruebas, `stripe listen`
 * reenviando a `/pagos/webhook` y su secreto en STRIPE_WEBHOOK_SECRET. Se niega a correr contra
 * algo que no sea localhost o con llaves que no sean de prueba.
 *
 *   API_URL=http://localhost:10000 STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… \
 *   PLATILLO_CENTAVOS=<id de 100.01> PLATILLO_REFRESCO=<id de 25.50> pnpm test:integracion
 * Pasos y evidencia: docs/pruebas-pagos-facturacion.md.
 */
import Facturapi from 'facturapi';
import Stripe from 'stripe';

const API = process.env.API_URL ?? 'http://localhost:10000';
const CLAVE = process.env.CLAVE_PRUEBAS ?? 'Prueba#2026';
const SK = process.env.STRIPE_SECRET_KEY ?? '';
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const CENTAVOS = Number(process.env.PLATILLO_CENTAVOS);
const REFRESCO = Number(process.env.PLATILLO_REFRESCO);

const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API);
const listo =
  local &&
  SK.startsWith('sk_test_') &&
  WHSEC.startsWith('whsec_') &&
  CENTAVOS > 0 &&
  REFRESCO > 0;
const describeLocal = listo ? describe : describe.skip;

const stripe = new Stripe(SK || 'sk_test_x');
const facturapi = new Facturapi(process.env.FACTURAPI_TEST_KEY || 'sk_test_x');
const EFECTIVO = 1;
const TARJETA = 2;

type Cuerpo = Record<string, any>;
interface Pago {
  id: number;
  metodo: string;
  monto: string;
  referencia: string | null;
}
interface Detalle {
  estatus: string;
  pagado: string;
  restante: string;
  propina: string;
  pagos: Pago[];
}
async function http(
  metodo: string,
  ruta: string,
  token?: string,
  cuerpo?: unknown,
) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let body: Cuerpo = {};
  try {
    body = texto ? (JSON.parse(texto) as Cuerpo) : {};
  } catch {
    body = { texto };
  }
  // Algunos POST responden 200 (@HttpCode) y otros 201: para estas pruebas ambos son «creado».
  return {
    status: metodo === 'POST' && r.status === 200 ? 201 : r.status,
    body,
  };
}

const sesiones: Record<string, string> = {};
async function sesion(
  rol: 'admin' | 'cajero' | 'mesero' | 'cocina' | 'cliente',
) {
  if (!sesiones[rol]) {
    const r = await http('POST', '/auth/sign-in', undefined, {
      email: `${rol}@prueba.local`,
      password: CLAVE,
    });
    expect(r.status).toBe(201);
    sesiones[rol] = r.body.accessToken as string;
  }
  return sesiones[rol];
}

/** Pedido en mesa entregado y listo para cobrar (mesero → cocina → mesero). */
async function pedidoEntregado(
  mesa: string,
  items: { platilloId: number; cantidad: number }[],
  totalEsperado: string,
  comensales = 3,
) {
  const mesero = await sesion('mesero');
  const creado = await http('POST', '/pedidos/mesa', mesero, {
    mesa,
    items,
    numComensales: comensales,
  });
  expect(creado.status).toBe(201);
  const id = creado.body.ordenId as string;
  expect(creado.body.total).toBe(totalEsperado);
  expect((await http('POST', `/pedidos/confirmar/${id}`, mesero)).status).toBe(
    201,
  );
  const cocina = await sesion('cocina');
  expect(
    (
      await http('PATCH', `/pedidos/${id}/estatus`, cocina, {
        estatus: 'lista',
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await http('PATCH', `/pedidos/${id}/estatus`, mesero, {
        estatus: 'entregada',
      })
    ).status,
  ).toBe(200);
  return id;
}

const detalle = async (id: string) =>
  (await http('GET', `/pedidos/${id}`, await sesion('cajero'))).body as Detalle;
const cobrar = async (
  id: string,
  cuerpo: Cuerpo,
  rol: 'cajero' | 'admin' = 'cajero',
) => http('POST', `/pedidos/${id}/cobrar`, await sesion(rol), cuerpo);

/** Igual que la app (`equalShare`): lo que falta entre quienes faltan, la última paga el resto. */
const parteIgual = (restante: number, faltan: number) =>
  faltan <= 1
    ? restante
    : Math.round(Math.round(restante * 100) / faltan) / 100;

async function esperar<T>(
  fn: () => Promise<T>,
  ok: (v: T) => boolean,
  ms = 30000,
) {
  const fin = Date.now() + ms;
  let v = await fn();
  while (!ok(v) && Date.now() < fin) {
    await new Promise((r) => setTimeout(r, 1000));
    v = await fn();
  }
  return v;
}

/** Evento firmado con el secreto de `stripe listen`, para repetir entregas a mano. */
async function webhook(evento: Cuerpo, firma?: string) {
  const payload = JSON.stringify(evento);
  const header =
    firma ??
    stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
  const r = await fetch(`${API}/pagos/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  return { status: r.status, body: (await r.json()) as Cuerpo };
}

const DATOS_FISCALES = {
  rfc: 'EKU9003173C9',
  razonSocial: 'ESCUELA KEMPER URGATE',
  usoCfdi: 'G03',
  regimenFiscal: '601',
  codigoPostalFiscal: '42501',
  email: 'facturas@example.com',
};

describeLocal(
  'Caja: cuenta dividida, propina, pagos mixtos y concurrencia',
  () => {
    it('D1 · 100.01 entre 3 en partes iguales: la suma es exacta y cierra el pedido', async () => {
      const id = await pedidoEntregado(
        'P01',
        [{ platilloId: CENTAVOS, cantidad: 1 }],
        '100.01',
      );
      const partes: number[] = [];
      for (let faltan = 3; faltan >= 1; faltan--) {
        const restante = Number((await detalle(id)).restante);
        const parte = parteIgual(restante, faltan);
        partes.push(parte);
        const r = await cobrar(id, {
          metodoPagoId: EFECTIVO,
          monto: parte,
          montoRecibido: 50,
          etiqueta: `Persona ${4 - faltan} de 3`,
        });
        expect(r.status).toBe(201);
        expect(r.body.cerrada).toBe(faltan === 1);
      }
      expect(partes).toEqual([33.34, 33.34, 33.33]);
      const d = await detalle(id);
      expect(d.estatus).toBe('pagada');
      expect(d.pagado).toBe('100.01');
      expect(d.restante).toBe('0.00');
      expect(d.pagos.map((p) => p.referencia)).toEqual([
        'PERSONA 1 DE 3',
        'PERSONA 2 DE 3',
        'PERSONA 3 DE 3',
      ]);
    });

    it('D2 · propina y cambio en efectivo; un monto mayor a lo que falta se rechaza', async () => {
      const id = await pedidoEntregado(
        'P02',
        [{ platilloId: REFRESCO, cantidad: 2 }],
        '51',
      );
      const excede = await cobrar(id, {
        metodoPagoId: EFECTIVO,
        monto: 60,
        montoRecibido: 100,
      });
      expect(excede.status).toBe(400);
      const r = await cobrar(id, {
        metodoPagoId: EFECTIVO,
        propina: 5.1,
        montoRecibido: 100,
      });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        total: '51.00',
        propina: '5.10',
        totalCobrado: '56.10',
        cambio: '43.90',
      });
      expect((await detalle(id)).propina).toBe('5.10');
    });

    it('D3 · pago mixto: una parte en efectivo y el resto con tarjeta en terminal', async () => {
      const id = await pedidoEntregado(
        'P03',
        [{ platilloId: REFRESCO, cantidad: 4 }],
        '102',
      );
      expect(
        (
          await cobrar(id, {
            metodoPagoId: EFECTIVO,
            monto: 40,
            montoRecibido: 40,
          })
        ).status,
      ).toBe(201);
      const tarjeta = await cobrar(id, {
        metodoPagoId: TARJETA,
        propina: 10,
        referencia: 'AUT-123456',
      });
      expect(tarjeta.status).toBe(201);
      expect(tarjeta.body).toMatchObject({ total: '62.00', cerrada: true });
      const d = await detalle(id);
      expect(d.pagos.map((p) => [p.metodo, p.monto])).toEqual([
        ['EFECTIVO', '40.00'],
        ['TARJETA', '62.00'],
      ]);
    });

    it('D4 · una cuenta ya pagada no se vuelve a cobrar', async () => {
      const id = await pedidoEntregado(
        'P04',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      expect((await cobrar(id, { metodoPagoId: TARJETA })).status).toBe(201);
      const otra = await cobrar(id, { metodoPagoId: TARJETA });
      expect(otra.status).toBe(409);
      expect((await detalle(id)).pagos).toHaveLength(1);
    });

    it('D5 · varios pedidos en una mesa se cobran por separado', async () => {
      const a = await pedidoEntregado(
        'P05',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      const b = await pedidoEntregado(
        'P05',
        [{ platilloId: CENTAVOS, cantidad: 1 }],
        '100.01',
      );
      expect(a).not.toBe(b);
      expect((await cobrar(a, { metodoPagoId: TARJETA })).status).toBe(201);
      const db = await detalle(b);
      expect([db.estatus, db.restante]).toEqual(['entregada', '100.01']);
      expect((await cobrar(b, { metodoPagoId: TARJETA })).status).toBe(201);
    });

    it('D6 · dos cajeros cobran la misma cuenta a la vez: un solo pago', async () => {
      const id = await pedidoEntregado(
        'P06',
        [{ platilloId: CENTAVOS, cantidad: 1 }],
        '100.01',
      );
      const [uno, dos] = await Promise.all([
        cobrar(id, { metodoPagoId: TARJETA }, 'cajero'),
        cobrar(id, { metodoPagoId: TARJETA }, 'admin'),
      ]);
      expect([uno.status, dos.status].sort()).toEqual([201, 409]);
      const d = await detalle(id);
      expect(d.pagos).toHaveLength(1);
      expect(d.pagado).toBe('100.01');
    });

    it('D7 · dos partes a la vez que juntas pasan del total: la segunda se rechaza', async () => {
      const id = await pedidoEntregado(
        'P07',
        [{ platilloId: CENTAVOS, cantidad: 1 }],
        '100.01',
      );
      const [uno, dos] = await Promise.all([
        cobrar(id, { metodoPagoId: TARJETA, monto: 60 }, 'cajero'),
        cobrar(id, { metodoPagoId: TARJETA, monto: 60 }, 'admin'),
      ]);
      expect([uno.status, dos.status].sort()).toEqual([201, 400]);
      expect((await detalle(id)).restante).toBe('40.01');
    });

    it('D8 · reversa de un pago de caja: deja de contar y el pedido vuelve a cobrarse', async () => {
      const id = await pedidoEntregado(
        'P08',
        [{ platilloId: REFRESCO, cantidad: 2 }],
        '51',
      );
      await cobrar(id, { metodoPagoId: TARJETA, monto: 20, propina: 2 });
      const pago = (await detalle(id)).pagos[0] as Cuerpo;
      const admin = await sesion('admin');
      const cajero = await sesion('cajero');
      expect(
        (
          await http('POST', `/pagos/${pago.id}/reembolso`, cajero, {
            motivo: 'Cobro equivocado',
          })
        ).status,
      ).toBe(403);
      const r = await http('POST', `/pagos/${pago.id}/reembolso`, admin, {
        motivo: 'Cobro equivocado',
      });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ devolucion: 'caja', monto: '22.00' });
      const d = await detalle(id);
      expect([d.restante, d.propina, d.pagos.length]).toEqual([
        '51.00',
        '0.00',
        0,
      ]);
      expect(
        (
          await http('POST', `/pagos/${pago.id}/reembolso`, admin, {
            motivo: 'Otra vez',
          })
        ).status,
      ).toBe(409);
    });

    it('D9 · corte de caja: esperado = fondo + efectivo + propinas en efectivo; diferencia al cerrar', async () => {
      const cajero = await sesion('cajero');
      const actual = await http('GET', '/caja/actual', cajero);
      if (actual.body.abierta)
        await http('POST', '/caja/cerrar', cajero, {
          efectivoContado: Number(actual.body.efectivoEsperado),
        });
      expect(
        (await http('POST', '/caja/abrir', cajero, { fondoInicial: 500 }))
          .status,
      ).toBe(201);
      const id = await pedidoEntregado(
        'P09',
        [{ platilloId: REFRESCO, cantidad: 2 }],
        '51',
      );
      await cobrar(id, {
        metodoPagoId: EFECTIVO,
        propina: 4,
        montoRecibido: 100,
      });
      const caja = (await http('GET', '/caja/actual', cajero)).body;
      expect(caja.efectivoEsperado).toBe('555.00');
      const cierre = await http('POST', '/caja/cerrar', cajero, {
        efectivoContado: 550,
      });
      expect(cierre.status).toBe(201);
      expect((cierre.body.caja as { diferencia: string }).diferencia).toBe(
        '-5.00',
      );
    });
  },
);

describeLocal(
  'Stripe (modo test): tarjetas, webhook, idempotencia y reembolso',
  () => {
    let pagadaConStripe = '';

    /** Como la app: el API crea el intento y la hoja de pago de Stripe lo confirma con la tarjeta. */
    async function pagarConTarjeta(id: string, tarjeta: string) {
      const r = await http(
        'POST',
        '/pagos/crear-intento',
        await sesion('cajero'),
        { ordenId: id },
      );
      expect(r.status).toBe(201);
      const piId = String(r.body.clientSecret).split('_secret_')[0];
      return stripe.paymentIntents
        .confirm(piId, {
          payment_method: tarjeta,
          return_url: 'https://example.com/pago',
        })
        .catch((e: Stripe.errors.StripeError) => ({
          status: 'error',
          code: e.decline_code ?? e.code,
        }));
    }

    it('S1 · tarjeta aprobada: el webhook firmado cierra el pedido con un solo pago', async () => {
      const id = await pedidoEntregado(
        'P10',
        [{ platilloId: CENTAVOS, cantidad: 1 }],
        '100.01',
      );
      const r = await pagarConTarjeta(id, 'pm_card_visa');
      expect(r.status).toBe('succeeded');
      const d = await esperar(
        () => detalle(id),
        (v) => v.estatus === 'pagada',
      );
      expect(d.estatus).toBe('pagada');
      expect(d.pagos).toHaveLength(1);
      expect(d.pagos[0].monto).toBe('100.01');
      pagadaConStripe = id;
    });

    it('S2 · fondos insuficientes: rechazo en la hoja de pago y, con tarjeta ya elegida, 402 claro', async () => {
      const id = await pedidoEntregado(
        'P11',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      const hoja = await pagarConTarjeta(
        id,
        'pm_card_visa_chargeDeclinedInsufficientFunds',
      );
      expect(hoja).toMatchObject({
        status: 'error',
        code: 'insufficient_funds',
      });
      const directo = await http(
        'POST',
        '/pagos/crear-intento',
        await sesion('cajero'),
        {
          ordenId: id,
          paymentMethodId: 'pm_card_visa_chargeDeclinedInsufficientFunds',
        },
      );
      expect(directo.status).toBe(402);
      expect(String(directo.body.message)).toMatch(/fondos suficientes/i);
      await new Promise((ok) => setTimeout(ok, 3000));
      expect((await detalle(id)).estatus).toBe('entregada');
    });

    it('S3 · 3D Secure: queda pendiente de autenticar y no marca pagado', async () => {
      const id = await pedidoEntregado(
        'P12',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      const r = await pagarConTarjeta(id, 'pm_card_threeDSecure2Required');
      expect(r.status).toBe('requires_action');
      await new Promise((ok) => setTimeout(ok, 4000));
      expect((await detalle(id)).estatus).toBe('entregada');
    });

    it('S4 · webhook con firma inválida → 400', async () => {
      const r = await webhook(
        { id: 'evt_falso', type: 'payment_intent.succeeded' },
        't=1,v1=firma-falsa',
      );
      expect(r.status).toBe(400);
    });

    it('S5 · el mismo evento dos veces y otro evento del mismo cobro: no duplica el pago', async () => {
      const pi = (await stripe.paymentIntents.list({ limit: 20 })).data.find(
        (p) => p.metadata?.ordenId === pagadaConStripe,
      )!;
      const evento = {
        id: `evt_prueba_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: { object: pi },
      };
      expect((await webhook(evento)).body).toEqual({ received: true });
      expect((await webhook(evento)).body).toEqual({
        received: true,
        duplicate: true,
      });
      expect((await detalle(pagadaConStripe)).pagos).toHaveLength(1);
    });

    it('S6 · cobro con tarjeta de un pedido ya pagado en caja: se reembolsa solo', async () => {
      const id = await pedidoEntregado(
        'P15',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      expect((await cobrar(id, { metodoPagoId: TARJETA })).status).toBe(201);
      const pi = await stripe.paymentIntents.create({
        amount: 2550,
        currency: 'mxn',
        payment_method: 'pm_card_visa',
        payment_method_types: ['card'],
        confirm: true,
        metadata: { ordenId: id },
      });
      const reembolsos = await esperar(
        () => stripe.refunds.list({ payment_intent: pi.id }),
        (l) => l.data.length > 0,
      );
      expect(reembolsos.data[0]).toMatchObject({
        amount: 2550,
        reason: 'duplicate',
      });
      expect((await detalle(id)).pagos).toHaveLength(1);
    });

    it('S7 · reembolso de un cobro de Stripe: se devuelve en Stripe y el pedido se cancela', async () => {
      const id = await pedidoEntregado(
        'P16',
        [{ platilloId: REFRESCO, cantidad: 2 }],
        '51',
      );
      await pagarConTarjeta(id, 'pm_card_visa');
      const d = await esperar(
        () => detalle(id),
        (v) => v.estatus === 'pagada',
      );
      const r = await http(
        'POST',
        `/pagos/${d.pagos[0].id}/reembolso`,
        await sesion('admin'),
        {
          motivo: 'El cliente se fue sin consumir',
          cancelarPedido: true,
        },
      );
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        devolucion: 'stripe',
        estatusOrden: 'cancelada',
      });
      const reembolso = await stripe.refunds.retrieve(
        r.body.referencia as string,
      );
      expect([reembolso.amount, reembolso.status]).toEqual([5100, 'succeeded']);
    });
  },
);

describeLocal(
  'Facturación (Facturapi sandbox): cola, validación, duplicados y cancelación',
  () => {
    let ordenMixta = '';
    let facturaId = '';

    it('F1 · datos fiscales fuera de catálogo se rechazan antes de la cola', async () => {
      const id = await pedidoEntregado(
        'P17',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      const cajero = await sesion('cajero');
      for (const malo of [
        { rfc: 'XAXX0101' },
        { usoCfdi: 'Z99' },
        { regimenFiscal: '699' },
      ]) {
        const r = await http('POST', '/solicitudes-factura', cajero, {
          ...DATOS_FISCALES,
          ...malo,
          ordenId: id,
        });
        expect(r.status).toBe(400);
      }
    });

    it('F2 · cuenta dividida con pago mixto: caja la pide, el admin la timbra y los montos coinciden', async () => {
      ordenMixta = await pedidoEntregado(
        'P18',
        [{ platilloId: CENTAVOS, cantidad: 1 }],
        '100.01',
      );
      await cobrar(ordenMixta, {
        metodoPagoId: EFECTIVO,
        monto: 33.34,
        montoRecibido: 40,
      });
      await cobrar(ordenMixta, {
        metodoPagoId: TARJETA,
        monto: 66.67,
        propina: 10,
      });
      const cajero = await sesion('cajero');
      const s = await http('POST', '/solicitudes-factura', cajero, {
        ...DATOS_FISCALES,
        ordenId: ordenMixta,
      });
      expect(s.status).toBe(201);
      const admin = await sesion('admin');
      const [uno, dos] = await Promise.all([
        http('POST', `/solicitudes-factura/${s.body.id}/emitir`, admin),
        http('POST', `/solicitudes-factura/${s.body.id}/emitir`, admin),
      ]);
      expect([uno.status, dos.status].sort()).toEqual([201, 409]);
      const emitida = uno.status === 201 ? uno : dos;
      facturaId = emitida.body.facturaId as string;
      expect(emitida.body.correo).toMatchObject({ enviado: false });
      const lista = await http('GET', `/facturas?q=EKU9003173C9`, admin);
      const factura = (lista.body.facturas as Cuerpo[]).find(
        (f) => f.id === facturaId,
      )!;
      // Sin propinas: el CFDI ampara el consumo, que es lo pagado sin propina.
      expect(factura.total).toBe('100.01');
      expect(Number(factura.subtotal) + Number(factura.iva)).toBeCloseTo(
        100.01,
        2,
      );
      expect(
        (lista.body.facturas as Cuerpo[]).filter(
          (f) => f.ordenId === ordenMixta,
        ),
      ).toHaveLength(1);
      // El CFDI timbrado (no solo nuestra copia) ampara lo cobrado y la forma del pago mayor.
      const { data } = await facturapi.invoices.list({ limit: 20 });
      const cfdi = data.find((i) => i.uuid === factura.folioFiscal)!;
      expect([cfdi.total, cfdi.payment_form]).toEqual([100.01, '04']);
    });

    it('F3 · con factura vigente no se reembolsa: primero se cancela (motivo 03)', async () => {
      const pago = (await detalle(ordenMixta)).pagos[0] as Cuerpo;
      const admin = await sesion('admin');
      const r = await http('POST', `/pagos/${pago.id}/reembolso`, admin, {
        motivo: 'Prueba de reversa',
      });
      expect(r.status).toBe(409);
      const c = await http('POST', `/facturas/${facturaId}/cancelar`, admin, {
        motivo: '03',
      });
      expect(c.status).toBe(201);
      expect(c.body.estatus).toBe('cancelada');
      expect(
        (
          await http('POST', `/facturas/${facturaId}/cancelar`, admin, {
            motivo: '03',
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await http('POST', `/pagos/${pago.id}/reembolso`, admin, {
            motivo: 'Prueba de reversa',
          })
        ).status,
      ).toBe(201);
    });

    it('F4 · un dato que Facturapi rechaza al timbrar: la solicitud queda para corregir y reintentar', async () => {
      const id = await pedidoEntregado(
        'P20',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      await cobrar(id, { metodoPagoId: TARJETA });
      const cajero = await sesion('cajero');
      // El API acepta el dominio .local; Facturapi no. (El sandbox no valida régimen contra RFC.)
      const s = await http('POST', '/solicitudes-factura', cajero, {
        ...DATOS_FISCALES,
        email: 'facturas@prueba.local',
        ordenId: id,
      });
      expect(s.status).toBe(201);
      const admin = await sesion('admin');
      const r = await http(
        'POST',
        `/solicitudes-factura/${s.body.id}/emitir`,
        admin,
      );
      expect(r.status).toBe(400);
      const pendientes = await http(
        'GET',
        '/solicitudes-factura?estatus=pendiente',
        admin,
      );
      expect(
        (pendientes.body as Cuerpo[]).some((p) => p.id === s.body.id),
      ).toBe(true);
      // Corregido (se reenvía mientras siga pendiente) y emitido.
      expect(
        (
          await http('POST', '/solicitudes-factura', cajero, {
            ...DATOS_FISCALES,
            ordenId: id,
          })
        ).status,
      ).toBe(201);
      expect(
        (await http('POST', `/solicitudes-factura/${s.body.id}/emitir`, admin))
          .status,
      ).toBe(201);
    });

    it('F5 · no se factura una cuenta que aún no está pagada', async () => {
      const id = await pedidoEntregado(
        'P21',
        [{ platilloId: REFRESCO, cantidad: 1 }],
        '25.5',
      );
      const cajero = await sesion('cajero');
      const s = await http('POST', '/solicitudes-factura', cajero, {
        ...DATOS_FISCALES,
        ordenId: id,
      });
      const r = await http(
        'POST',
        `/solicitudes-factura/${s.body.id}/emitir`,
        await sesion('admin'),
      );
      expect(r.status).toBe(400);
      expect(String(r.body.message)).toMatch(/pagada/);
    });
  },
);
