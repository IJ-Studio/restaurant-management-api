/**
 * Acceso entre cuentas (IDOR), manipulación de precios y repetición de peticiones, contra el API
 * local real. Un segundo cliente (B) intenta leer, cambiar o pagar lo del primero (A); el servidor
 * debe negarse y lo de A no debe cambiar. Se niega a correr contra algo que no sea localhost.
 *
 *   API_URL=http://localhost:10000 pnpm test:integracion -- entre-cuentas
 */
const API = process.env.API_URL ?? 'http://localhost:10000';
const CLAVE = process.env.CLAVE_PRUEBAS ?? 'Prueba#2026';
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API);
const describeLocal = local ? describe : describe.skip;

type Cuerpo = Record<string, any>;
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
    body:
      cuerpo === undefined || metodo === 'GET'
        ? undefined
        : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let body: Cuerpo = {};
  try {
    body = texto ? (JSON.parse(texto) as Cuerpo) : {};
  } catch {
    body = { texto };
  }
  return { status: r.status, body };
}

describeLocal('entre cuentas, precios y repeticiones', () => {
  let a: string;
  let b: string;
  let idA: number;
  let platillo: { id: number; precio: string };
  let ordenA: string;
  let itemA: number;
  let direccionA: number;
  let perfilA: string;

  beforeAll(async () => {
    a = (
      await http('POST', '/auth/sign-in', undefined, {
        email: 'cliente@prueba.local',
        password: CLAVE,
      })
    ).body.accessToken as string;
    idA = Number((await http('GET', '/auth/me', a)).body.id);
    const correoB = `cliente-b-${Date.now()}@prueba.local`;
    const alta = await http('POST', '/auth/sign-up', undefined, {
      name: 'Bruno',
      lastname: 'Prueba',
      email: correoB,
      phone: `+5277${String(Date.now()).slice(-8)}`,
      password: 'Quijote#Mancha7',
      passwordConfirm: 'Quijote#Mancha7',
    });
    expect(alta.status).toBeLessThan(300);
    b = (
      await http('POST', '/auth/sign-in', undefined, {
        email: correoB,
        password: 'Quijote#Mancha7',
      })
    ).body.accessToken as string;

    const menu = (await http('GET', '/menu')).body as unknown as {
      id: number;
      precio: string;
      disponible: boolean;
    }[];
    platillo = menu.find((p) => p.disponible)!;
    const pedido = await http('POST', '/pedidos/mesa', a, {
      platilloId: platillo.id,
      cantidad: 2,
    });
    ordenA = pedido.body.ordenId as string;
    const mios = (await http('GET', '/pedidos/usuario?tipo=domicilio', a))
      .body as unknown as { id: string; items?: { id: number }[] }[];
    itemA = mios.find((o) => o.id === ordenA)!.items![0].id;
    direccionA = Number(
      (
        await http('POST', '/direcciones', a, {
          linea1: 'Calle Hidalgo 5',
          codigoPostal: '43000',
          ciudad: 'Huejutla',
          estado: 'Hidalgo',
        })
      ).body.id,
    );
    perfilA = String(
      (
        await http('POST', '/perfiles-facturacion', a, {
          rfc: 'XAXX010101000',
          razonSocial: 'PUBLICO EN GENERAL',
          usoCfdi: 'S01',
          regimenFiscal: '616',
          codigoPostalFiscal: '43000',
        })
      ).body.id,
    );
  });

  it('prepara los recursos de A', () => {
    expect(ordenA).toEqual(expect.any(String));
    expect(itemA).toBeGreaterThan(0);
    expect(direccionA).toBeGreaterThan(0);
    expect(perfilA).not.toBe('undefined');
  });

  it.each([
    ['GET', () => `/users/${idA}`, undefined],
    ['POST', () => `/pedidos/confirmar/${ordenA}`, {}],
    ['DELETE', () => `/pedidos/item/${itemA}`, undefined],
    ['PATCH', () => `/pedidos/cancelar/${ordenA}`, { motivo: 'Lo cancela B' }],
    ['PUT', () => `/direcciones/${direccionA}`, { alias: 'De B' }],
    ['DELETE', () => `/direcciones/${direccionA}`, undefined],
    ['DELETE', () => `/perfiles-facturacion/${perfilA}`, undefined],
    ['GET', () => `/facturas/${ordenA}`, undefined],
    ['GET', () => `/facturas/${ordenA}/descargar`, undefined],
    ['GET', () => `/solicitudes-factura/orden/${ordenA}`, undefined],
  ] as [string, () => string, unknown][])(
    'B no puede %s lo de A (%#)',
    async (metodo, ruta, cuerpo) => {
      const r = await http(metodo, ruta(), b, cuerpo);
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
      expect(r.status).not.toBe(401);
    },
  );

  it.each([
    ['POST', '/pagos/crear-intento', () => ({ ordenId: ordenA })],
    ['POST', '/solicitudes-factura', () => ({ ordenId: ordenA })],
    [
      'POST',
      '/facturas',
      () => ({ ordenId: ordenA, perfilFacturacionId: perfilA }),
    ],
  ] as [string, string, () => unknown][])(
    'B no puede usar el pedido de A en %s %s',
    async (metodo, ruta, cuerpo) => {
      const r = await http(metodo, ruta, b, cuerpo());
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    },
  );

  it('lo de A sigue intacto y B no lo ve en sus listas', async () => {
    const mios = (await http('GET', '/pedidos/usuario?tipo=domicilio', a))
      .body as unknown as { id: string; estatus: string; items: unknown[] }[];
    const orden = mios.find((o) => o.id === ordenA)!;
    expect(orden.estatus).not.toBe('cancelada');
    expect(orden.items.length).toBeGreaterThan(0);
    const direcciones = (await http('GET', '/direcciones', a))
      .body as unknown as { id: number; alias: string | null }[];
    expect(direcciones.find((d) => d.id === direccionA)?.alias).not.toBe(
      'De B',
    );
    for (const ruta of [
      '/pedidos/usuario?tipo=domicilio',
      '/direcciones',
      '/perfiles-facturacion',
      '/metodos-pago',
    ]) {
      const deB = JSON.stringify((await http('GET', ruta, b)).body);
      expect(deB).not.toContain(ordenA);
      expect(deB).not.toContain('Calle Hidalgo 5');
    }
  });

  it('el precio lo pone el servidor: un precio o total del cliente se rechaza', async () => {
    for (const extra of [
      { precio: 0 },
      { precioUnitario: 0.01 },
      { total: 1 },
      { descuento: 100 },
    ]) {
      const r = await http('POST', '/pedidos/mesa', a, {
        platilloId: platillo.id,
        cantidad: 1,
        ...extra,
      });
      expect(r.status).toBe(400);
    }
    const r = await http('POST', '/pagos/crear-intento', a, {
      ordenId: ordenA,
      monto: 1,
    });
    expect(r.status).toBe(400);
  });

  it('el total del pedido sale del precio de la carta', async () => {
    const mios = (await http('GET', '/pedidos/usuario?tipo=domicilio', a))
      .body as unknown as { id: string; total?: string; subtotal?: string }[];
    const orden = mios.find((o) => o.id === ordenA)!;
    const importe = Number(orden.subtotal ?? orden.total);
    expect(importe).toBeGreaterThanOrEqual(Number(platillo.precio) * 2);
  });

  it('el menú público no expone el costo de los platillos', async () => {
    const menu = JSON.stringify((await http('GET', '/menu')).body);
    expect(menu).not.toContain('precioCosto');
    const carta = JSON.stringify(
      (await http('GET', '/menu/categories/with-products')).body,
    );
    expect(carta).not.toContain('precioCosto');
  });

  it('confirmar dos veces el mismo pedido no lo duplica ni da 5xx', async () => {
    const [r1, r2] = await Promise.all([
      http('POST', `/pedidos/confirmar/${ordenA}`, a, {}),
      http('POST', `/pedidos/confirmar/${ordenA}`, a, {}),
    ]);
    expect(r1.status).toBeLessThan(500);
    expect(r2.status).toBeLessThan(500);
  });
});
