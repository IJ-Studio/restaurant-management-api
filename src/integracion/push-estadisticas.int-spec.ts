/**
 * Integración HU-07 + HU-08 (api#83): cambio de estado → aviso push al rol correcto, y estadísticas
 * del administrador con los pedidos y pagos que crea la prueba (app ↔ API ↔ BD ↔ Expo simulado).
 *
 * El API debe arrancar con `EXPO_PUSH_URL=http://127.0.0.1:<EXPO_SIMULADO_PUERTO>/push`: esta suite
 * levanta ahí un Expo simulado y revisa lo que le llega. Sin esa variable, las pruebas de push no
 * corren (las de estadísticas sí).
 *
 *   EXPO_PUSH_URL=http://127.0.0.1:10099/push API_URL=http://localhost:10000 \
 *   LOCAL_DATABASE_URL=postgresql://…@localhost/quijote_local CLAVE_PRUEBAS=… pnpm test:integracion
 */
import { createServer, type Server } from 'node:http';

import {
  apiLocal,
  base,
  baseLocal,
  cerrarBase,
  esperar,
  http,
  sesion,
  type Rol,
} from './apoyo';

const describeLocal = apiLocal && baseLocal ? describe : describe.skip;
const PUERTO = Number(process.env.EXPO_SIMULADO_PUERTO ?? 10099);
const conExpoSimulado = (process.env.EXPO_PUSH_URL ?? '').includes(
  `127.0.0.1:${PUERTO}`,
);
const describePush = conExpoSimulado ? describe : describe.skip;

const EFECTIVO = 1;

interface MensajeExpo {
  to: string;
  title: string;
  body: string;
  data: { type: string; orderId: string; place: string };
}

const creados: string[] = [];

/** Pedido de mesa mandado a cocina; devuelve su id y su total. */
async function pedidoEnCocina(mesa: string) {
  const mesero = await sesion('mesero');
  const creado = await http('POST', '/pedidos/mesa', mesero, {
    mesa,
    items: [{ platilloId: 1, cantidad: 2 }],
    numComensales: 2,
  });
  expect(creado.status).toBe(201);
  const id = creado.body.ordenId as string;
  creados.push(id);
  expect((await http('POST', `/pedidos/confirmar/${id}`, mesero)).status).toBe(
    201,
  );
  return { id, total: Number(creado.body.total) };
}

const estatus = async (id: string, nuevo: string, rol: Rol) =>
  (
    await http('PATCH', `/pedidos/${id}/estatus`, await sesion(rol), {
      estatus: nuevo,
    })
  ).status;

describeLocal(
  'HU-07 + HU-08: push y estadísticas (app ↔ API ↔ BD ↔ Expo simulado)',
  () => {
    const marca = Date.now().toString(36);
    const tokenMesero = `ExponentPushToken[integracion-mesero-${marca}]`;
    const tokenCajero = `ExponentPushToken[integracion-cajero-${marca}]`;
    const recibidos: MensajeExpo[] = [];
    let expo: Server | undefined;

    beforeAll(async () => {
      if (!conExpoSimulado) return;
      expo = createServer((req, res) => {
        let cuerpo = '';
        req.on('data', (parte: Buffer) => (cuerpo += parte.toString()));
        req.on('end', () => {
          const lote = JSON.parse(cuerpo) as MensajeExpo[];
          recibidos.push(...lote);
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              data: lote.map(() => ({ status: 'ok', id: 'simulado' })),
            }),
          );
        });
      });
      await new Promise<void>((listo) =>
        expo!.listen(PUERTO, '127.0.0.1', listo),
      );
    });

    afterAll(async () => {
      // Deja las mesas libres para la siguiente corrida: entrega y cobra lo que quedó abierto.
      for (const id of creados) {
        const detalle = await http(
          'GET',
          `/pedidos/${id}`,
          await sesion('cajero'),
        );
        if (detalle.body.estatus === 'lista')
          await estatus(id, 'entregada', 'mesero');
        if (['lista', 'entregada'].includes(detalle.body.estatus as string))
          await http('POST', `/pedidos/${id}/cobrar`, await sesion('cajero'), {
            metodoPagoId: EFECTIVO,
            montoRecibido: Number(detalle.body.restante),
          });
      }
      await base()`delete from device_tokens where token like ${'%integracion-%'}`;
      await cerrarBase();
      await new Promise<void>((listo) =>
        expo ? expo.close(() => listo()) : listo(),
      );
    });

    describePush('token del dispositivo y avisos (HU-07)', () => {
      const dueño = async (token: string) =>
        (
          await base()<{ email: string }[]>`
        select u.email from device_tokens d join users u on u.id = d.user_id where d.token = ${token}`
        ).map((f) => f.email);

      it('se registra a nombre del usuario del token', async () => {
        const r = await http(
          'POST',
          '/notifications/devices',
          await sesion('mesero'),
          {
            token: tokenMesero,
            platform: 'android',
          },
        );
        expect(r.status).toBe(204);
        expect(await dueño(tokenMesero)).toEqual(['mesero@prueba.local']);
      });

      it('si el mismo teléfono entra con otra cuenta, el token se actualiza al nuevo usuario', async () => {
        const token = `ExponentPushToken[integracion-compartido-${marca}]`;
        for (const rol of ['cajero', 'cocina'] as const)
          expect(
            (
              await http('POST', '/notifications/devices', await sesion(rol), {
                token,
                platform: 'ios',
              })
            ).status,
          ).toBe(204);
        expect(await dueño(token)).toEqual(['cocina@prueba.local']);
      });

      it('cocina marca «lista» → Expo recibe el aviso para el mesero, con la mesa y sin datos del cliente', async () => {
        expect(
          (
            await http(
              'POST',
              '/notifications/devices',
              await sesion('cajero'),
              {
                token: tokenCajero,
                platform: 'android',
              },
            )
          ).status,
        ).toBe(204);
        const { id } = await pedidoEnCocina('A01');
        recibidos.length = 0;

        expect(await estatus(id, 'lista', 'cocina')).toBe(200);
        const aviso = await esperar(() =>
          recibidos.find((m) => m.to === tokenMesero && m.data.orderId === id),
        );

        expect(aviso).toEqual({
          to: tokenMesero,
          title: 'Pedido listo',
          body: 'Mesa A01: listo para entregar.',
          data: { type: 'order_ready', orderId: id, place: 'Mesa A01' },
          sound: 'default',
        });
        // Es para el piso: caja no lo recibe.
        expect(
          recibidos.some((m) => m.to === tokenCajero && m.data.orderId === id),
        ).toBe(false);

        // Al entregarlo, el aviso es para caja.
        expect(await estatus(id, 'entregada', 'mesero')).toBe(200);
        const cobro = await esperar(() =>
          recibidos.find((m) => m.to === tokenCajero && m.data.orderId === id),
        );
        expect(cobro.data.type).toBe('order_delivered');
      });

      it('al cerrar sesión el token se da de baja y ya no recibe avisos', async () => {
        const mesero = await sesion('mesero');
        expect(
          (
            await http(
              'DELETE',
              `/notifications/devices/${encodeURIComponent(tokenMesero)}`,
              mesero,
            )
          ).status,
        ).toBe(204);
        expect(await dueño(tokenMesero)).toEqual([]);

        const { id } = await pedidoEnCocina('A02');
        recibidos.length = 0;
        expect(await estatus(id, 'lista', 'cocina')).toBe(200);
        // El aviso sale para los demás meseros (si hay); al token dado de baja no llega.
        await new Promise((r) => setTimeout(r, 1500));
        expect(recibidos.some((m) => m.to === tokenMesero)).toBe(false);
      });

      it('nadie da de baja el token de otro usuario', async () => {
        const r = await http(
          'DELETE',
          `/notifications/devices/${encodeURIComponent(tokenCajero)}`,
          await sesion('mesero'),
        );
        expect(r.status).toBe(204);
        expect(await dueño(tokenCajero)).toEqual(['cajero@prueba.local']);
      });
    });

    describe('estadísticas del administrador (HU-08)', () => {
      const resumen = async () => {
        const admin = await sesion('admin');
        const [stats, hoy] = await Promise.all([
          http('GET', '/dashboard/admin/stats', admin),
          http('GET', '/reportes/hoy', admin),
        ]);
        expect([stats.status, hoy.status]).toEqual([200, 200]);
        const ventas = hoy.body.ventas as {
          cobrado: string;
          ordenesPagadas: number;
        };
        return {
          totalVentas: Number(stats.body.totalVentas),
          cobrado: Number(ventas.cobrado),
          ordenesPagadas: Number(ventas.ordenesPagadas),
        };
      };

      it('reflejan el pedido y el pago que crea la prueba', async () => {
        const antes = await resumen();

        const { id, total } = await pedidoEnCocina('A03');
        expect(await estatus(id, 'lista', 'cocina')).toBe(200);
        expect(await estatus(id, 'entregada', 'mesero')).toBe(200);
        const cobro = await http(
          'POST',
          `/pedidos/${id}/cobrar`,
          await sesion('cajero'),
          {
            metodoPagoId: EFECTIVO,
            montoRecibido: total,
          },
        );
        expect(cobro.status).toBe(201);

        const despues = await resumen();
        expect(despues.totalVentas - antes.totalVentas).toBeCloseTo(total, 2);
        expect(despues.cobrado - antes.cobrado).toBeCloseTo(total, 2);
        expect(despues.ordenesPagadas - antes.ordenesPagadas).toBe(1);
      });

      it.each(['cajero', 'mesero', 'cocina', 'cliente'] as const)(
        'solo el admin las ve: %s → 403',
        async (rol) => {
          const token = await sesion(rol);
          expect(
            (await http('GET', '/dashboard/admin/stats', token)).status,
          ).toBe(403);
          expect((await http('GET', '/reportes/hoy', token)).status).toBe(403);
        },
      );

      it('sin sesión → 401', async () => {
        expect((await http('GET', '/dashboard/admin/stats')).status).toBe(401);
        expect((await http('GET', '/reportes/hoy')).status).toBe(401);
      });
    });
  },
);
