/**
 * Integración HU-03 + HU-04 (api#79): menú y reservaciones contra el API local real y su base
 * (app ↔ API ↔ BD). También cubre los payloads maliciosos de reservaciones (api#71).
 *
 *   API_URL=http://localhost:10000 LOCAL_DATABASE_URL=postgresql://…@localhost/quijote_local \
 *   CLAVE_PRUEBAS=… pnpm test:integracion
 *
 * Solo corre contra localhost. En CI la levanta `integration-tests.yml` con la base de
 * `test/db/` y datos sintéticos.
 */
import {
  apiLocal,
  base,
  baseLocal,
  cerrarBase,
  enHorario,
  http,
  sesion,
} from './apoyo';

const describeLocal = apiLocal && baseLocal ? describe : describe.skip;

interface Platillo {
  id: number;
  categoriaId: number;
  nombre: string;
  precio: string;
  disponible: boolean;
}
interface Categoria {
  id: number;
  nombre: string;
  platillos: Platillo[];
}

/** Reservación válida con datos sintéticos; `marca` la hace única en la base. */
const reservacion = (marca: string, extra: Record<string, unknown> = {}) => ({
  clienteNombre: `Integración ${marca}`,
  clienteTelefono: '7711234567',
  clienteEmail: `integracion.${marca.toLowerCase()}@prueba.local`,
  fechaHora: enHorario(3),
  numComensales: 4,
  ...extra,
});

describeLocal('HU-03 + HU-04: menú y reservaciones (app ↔ API ↔ BD)', () => {
  const marca = `R${Date.now().toString(36).toUpperCase()}`;

  afterAll(async () => {
    const sql = base();
    await sql`delete from reservaciones where cliente_email like ${'integracion.%@prueba.local'}`;
    await sql`delete from platillos where nombre like ${'INTEGRACIÓN %'}`;
    await cerrarBase();
  });

  describe('menú (HU-03)', () => {
    it('GET /menu devuelve los platillos que hay en la base, con su precio', async () => {
      const r = await http('GET', '/menu');
      expect(r.status).toBe(200);

      const filas = await base()<{ id: number; precio: string }[]>`
        select id, precio::text from platillos order by id`;
      const delApi = (r.body as unknown as Platillo[])
        .map(({ id, precio }) => ({ id, precio }))
        .sort((a, b) => a.id - b.id);
      expect(delApi).toEqual(filas.map(({ id, precio }) => ({ id, precio })));
    });

    it('agrupa los platillos por categoría y cada uno queda en la suya', async () => {
      const r = await http('GET', '/menu/categories/with-products');
      expect(r.status).toBe(200);
      const categorias = r.body as unknown as Categoria[];

      const activas = await base()<{ id: number }[]>`
        select id from categorias_menu where activa order by id`;
      expect(categorias.map((c) => c.id).sort((a, b) => a - b)).toEqual(
        activas.map((c) => c.id),
      );
      for (const categoria of categorias)
        for (const platillo of categoria.platillos)
          expect(platillo.categoriaId).toBe(categoria.id);
    });

    it('un platillo nuevo en la base aparece en el menú sin reiniciar el API', async () => {
      const [nuevo] = await base()<{ id: number }[]>`
        insert into platillos (categoria_id, nombre, descripcion, precio, disponible)
        values (1, ${`INTEGRACIÓN ${marca}`}, 'Platillo de la prueba de integración', 12.34, true)
        returning id`;

      const r = await http('GET', '/menu');
      const platillo = (r.body as unknown as Platillo[]).find(
        (p) => p.id === nuevo.id,
      );
      expect(platillo).toMatchObject({ categoriaId: 1, precio: '12.34' });
    });
  });

  describe('reservaciones (HU-04)', () => {
    it('una reservación válida se guarda y aparece en el listado de activas del personal', async () => {
      const creada = await http(
        'POST',
        '/reservations',
        undefined,
        reservacion(marca),
      );
      expect(creada.status).toBe(201);
      expect(creada.body).toMatchObject({
        estatus: 'pendiente',
        numComensales: 4,
      });
      expect(creada.body.mesaId).toEqual(expect.any(Number));

      const listado = await http(
        'GET',
        `/reservations?clienteNombre=${encodeURIComponent(`Integración ${marca}`)}`,
        await sesion('mesero'),
      );
      expect(listado.status).toBe(200);
      const ids = (listado.body as unknown as { id: string }[]).map(
        (x) => x.id,
      );
      expect(ids).toContain(creada.body.id);
    });

    it('persistencia: la reservación queda en Postgres, no en la memoria del API', async () => {
      const filas = await base()<{ estatus: string; num_comensales: number }[]>`
        select estatus, num_comensales from reservaciones
        where cliente_email = ${`integracion.${marca.toLowerCase()}@prueba.local`}`;
      expect(filas).toEqual([{ estatus: 'pendiente', num_comensales: 4 }]);
    });

    it.each([
      ['un teléfono que no es teléfono', { clienteTelefono: 'abc' }],
      ['un correo inválido', { clienteEmail: 'no-es-correo' }],
      ['cero comensales', { numComensales: 0 }],
      ['más de 50 comensales', { numComensales: 51 }],
      ['comensales como texto', { numComensales: '4' }],
      ['una fecha que no es fecha', { fechaHora: 'mañana' }],
      ['una fecha pasada', { fechaHora: enHorario(-2) }],
      ['una hora fuera del horario', { fechaHora: enHorario(3, 3) }],
      ['una mesa que no es número', { mesaId: '1 OR 1=1' }],
      [
        'un estatus impuesto por el cliente (asignación masiva)',
        { estatus: 'confirmada' },
      ],
      ['un depósito impuesto por el cliente', { depositoPagado: true }],
    ])('rechaza con 400 %s y no guarda nada', async (_caso, cambio) => {
      const marcaMala = `${marca}X${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const r = await http(
        'POST',
        '/reservations',
        undefined,
        reservacion(marcaMala, cambio),
      );
      expect(r.status).toBe(400);

      const filas = await base()`
        select 1 from reservaciones
        where cliente_email = ${`integracion.${marcaMala.toLowerCase()}@prueba.local`}`;
      expect(filas).toHaveLength(0);
    });

    it('inyección SQL en el nombre: se guarda como texto y la tabla sigue intacta (api#71)', async () => {
      const malicioso = `Robert'); DROP TABLE reservaciones;--`;
      const r = await http(
        'POST',
        '/reservations',
        undefined,
        reservacion(`${marca}SQL`, { clienteNombre: malicioso }),
      );
      // Las consultas van parametrizadas: no hay nada que ejecutar.
      expect(r.status).toBe(201);
      expect(r.body.clienteNombre).toBe(malicioso.toUpperCase());

      const [tabla] = await base()<{ existe: boolean }[]>`
        select to_regclass('public.reservaciones') is not null as existe`;
      expect(tabla.existe).toBe(true);
    });

    it('el listado de reservaciones (datos personales) no se abre sin sesión ni para el cliente', async () => {
      expect((await http('GET', '/reservations')).status).toBe(401);
      expect(
        (await http('GET', '/reservations', await sesion('cliente'))).status,
      ).toBe(403);
      expect(
        (await http('GET', '/reservations', await sesion('cocina'))).status,
      ).toBe(403);
    });
  });
});
