/**
 * Contratos y reglas de los endpoints públicos contra el API local real (sin simular nada):
 * rutas públicas con y sin token, rutas del cliente que exigen sesión, plano de mesas con las mismas
 * reglas que la creación (capacidad, solapes y hora del restaurante) y dos reservas a la vez por la
 * misma mesa. Se niega a correr contra algo que no sea localhost.
 *
 *   API_URL=http://localhost:10000 pnpm test:integracion -- publico
 * Para comprobar la zona horaria como en Render, arrancar el API con TZ=UTC.
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
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
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

interface Reglas {
  utcOffsetMin: number;
  reservas: { duracionMin: number; anticipacionMin: number };
  horario: { dia: number; apertura: string; cerrado: boolean }[];
  diasEspeciales: { fecha: string }[];
}
interface Mesa {
  id: number;
  capacidad: number;
  estado: 'disponible' | 'ocupada' | 'sin-lugar';
  motivo: string | null;
}

describeLocal('endpoints públicos contra el API local', () => {
  let reglas: Reglas;
  let cliente: string;
  // Un día abierto lejano, distinto en cada corrida, para no chocar con datos anteriores.
  let fecha: string;
  let apertura: number;

  /** «HH:MM» del restaurante, `min` minutos después de la apertura de ese día. */
  const hora = (min: number) => {
    const t = apertura + min;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  /** Hora del restaurante → instante ISO, con el desfase que publica /reglas. */
  const iso = (h: string) => {
    const [y, m, d] = fecha.split('-').map(Number);
    const [hh, mm] = h.split(':').map(Number);
    return new Date(
      Date.UTC(y, m - 1, d, hh, mm) - reglas.utcOffsetMin * 60_000,
    ).toISOString();
  };
  const plano = async (h: string, personas = 2) =>
    (
      await http(
        'GET',
        `/reservations/map?fechaHora=${fecha}T${h}&numComensales=${personas}`,
      )
    ).body as unknown as Mesa[];
  const reservar = (h: string, mesaId: number | undefined, personas = 2) =>
    http('POST', '/reservations', undefined, {
      clienteNombre: 'Prueba Integración',
      clienteTelefono: '7711234567',
      clienteEmail: 'integracion@prueba.local',
      fechaHora: iso(h),
      numComensales: personas,
      mesaId,
    });

  beforeAll(async () => {
    reglas = (await http('GET', '/reglas')).body as unknown as Reglas;
    const especiales = new Set(reglas.diasEspeciales.map((d) => d.fecha));
    for (let n = 30 + Math.floor(Math.random() * 300); ; n++) {
      const d = new Date(Date.now() + n * 86_400_000);
      const f = d.toISOString().slice(0, 10);
      const dia = reglas.horario.find(
        (h) => h.dia === new Date(`${f}T12:00:00Z`).getUTCDay(),
      );
      if (dia && !dia.cerrado && !especiales.has(f)) {
        fecha = f;
        const [h, m] = dia.apertura.split(':').map(Number);
        apertura = h * 60 + m;
        break;
      }
    }
    const r = await http('POST', '/auth/sign-in', undefined, {
      email: 'cliente@prueba.local',
      password: CLAVE,
    });
    cliente = r.body.accessToken as string;
  });

  describe('contratos con y sin token', () => {
    const publicas = [
      '/menu',
      '/menu/categories/with-products',
      '/reglas',
      '/sitio',
      '/promociones',
      '/mesas',
      '/reservations/map',
    ];

    it.each(publicas)('%s responde 200 sin token', async (ruta) => {
      expect((await http('GET', ruta)).status).toBe(200);
    });

    it.each(publicas)(
      '%s ignora un token caducado o ajeno en lugar de rechazarlo',
      async (ruta) => {
        expect((await http('GET', ruta, 'token.caducado.ajeno')).status).toBe(
          200,
        );
      },
    );

    it.each([
      ['POST', '/pedidos/mesa'],
      ['GET', '/pedidos/usuario?tipo=domicilio'],
      ['GET', '/direcciones'],
      ['POST', '/pagos/crear-intento'],
    ])(
      '%s %s exige sesión: 401 con mensaje, nunca 500',
      async (metodo, ruta) => {
        const r = await http(
          metodo,
          ruta,
          undefined,
          metodo === 'GET' ? undefined : {},
        );
        expect(r.status).toBe(401);
        expect(r.body.message).toEqual(expect.any(String));
      },
    );

    it('pedido a domicilio con la sesión del cliente: 201', async () => {
      const menu = (await http('GET', '/menu')).body as {
        id: number;
        disponible?: boolean;
      }[];
      const platillo = menu.find((p) => p.disponible !== false) ?? menu[0];
      const r = await http('POST', '/pedidos/mesa', cliente, {
        platilloId: Number(platillo.id),
        cantidad: 1,
      });
      expect(r.status).toBe(201);
      expect(r.body.ordenId).toEqual(expect.any(String));
    });
  });

  describe('plano de mesas con las reglas de la creación', () => {
    it('para 6 personas, las mesas pequeñas salen bloqueadas con su motivo', async () => {
      const mesas = await plano(hora(60), 6);
      expect(mesas.length).toBeGreaterThan(0);
      for (const m of mesas.filter((x) => x.capacidad < 6)) {
        expect(m.estado).toBe('sin-lugar');
        expect(m.motivo).toBe(`Para ${m.capacidad} personas`);
      }
      const chica = mesas.find((m) => m.capacidad < 6);
      if (chica) {
        const r = await reservar(hora(60), chica.id, 6);
        expect(r.status).toBe(400);
        expect(r.body.message).toContain(`para ${chica.capacidad} personas`);
      }
    });

    it('una reserva en curso bloquea la mesa; al terminar, queda libre', async () => {
      const libre = (await plano(hora(120))).find(
        (m) => m.estado === 'disponible',
      )!;
      expect((await reservar(hora(120), libre.id)).status).toBe(201);

      // Empezó 30 min antes y sigue en curso: el plano de antes no la veía.
      const enCurso = (await plano(hora(150))).find((m) => m.id === libre.id)!;
      expect(enCurso.estado).toBe('ocupada');
      expect(enCurso.motivo).toBe('Reservada a esa hora');
      const choque = await reservar(hora(150), libre.id);
      expect(choque.status).toBe(409);
      expect(choque.body.message).toContain('ya está reservada');

      // Una reserva que empieza justo al terminar la anterior no se cruza.
      const justo = hora(120 + reglas.reservas.duracionMin);
      expect((await plano(justo)).find((m) => m.id === libre.id)!.estado).toBe(
        'disponible',
      );
      expect((await reservar(justo, libre.id)).status).toBe(201);
    });

    it('la hora sin zona es la del restaurante: igual que con su desfase explícito', async () => {
      const h = hora(60);
      const sinZona = await plano(h);
      const conZona = (
        await http(
          'GET',
          `/reservations/map?fechaHora=${encodeURIComponent(iso(h))}&numComensales=2`,
        )
      ).body as unknown as Mesa[];
      expect(sinZona.map((m) => m.estado)).toEqual(
        conZona.map((m) => m.estado),
      );
    });

    it.each(['abc', '0', '-2', '2.5', '51'])(
      'comensales inválidos en el plano (%s): 400',
      async (n) => {
        const r = await http(
          'GET',
          `/reservations/map?fechaHora=${fecha}T12:00&numComensales=${n}`,
        );
        expect(r.status).toBe(400);
      },
    );

    it('fecha imposible en el plano: 400, no el plano de ahora', async () => {
      const r = await http(
        'GET',
        '/reservations/map?fechaHora=2026-02-30T99:99',
      );
      expect(r.status).toBe(400);
    });

    it('dos clientes a la vez por la misma mesa: una entra y la otra recibe 409', async () => {
      const h = hora(240);
      const libre = (await plano(h)).find((m) => m.estado === 'disponible')!;
      const [a, b] = await Promise.all([
        reservar(h, libre.id),
        reservar(h, libre.id),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
    });
  });
});
