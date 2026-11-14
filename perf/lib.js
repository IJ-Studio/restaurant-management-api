// Utilidades comunes de las pruebas de rendimiento y esfuerzo (k6).
// Variables: BASE_URL (API, nunca producción), PASSWORD (usuarios de prueba), MESAS (lista separada por comas).
import http from 'k6/http';
import { check, sleep } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:10000').replace(/\/+$/, '');
const PASSWORD = __ENV.PASSWORD || 'Prueba#2026';
const DOMAIN = __ENV.USER_DOMAIN || 'prueba.local';
export const MESAS = (__ENV.MESAS || Array.from({ length: 40 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`).join(','))
  .split(',');

// 409 (otro dispositivo movió el pedido) es una respuesta correcta del flujo, no una falla.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 409));

/** Un inicio de sesión por rol en `setup()`: el login tiene su propio límite de 5 por minuto e IP. */
export function loginAll(roles) {
  const tokens = {};
  for (const role of roles) {
    const signIn = () =>
      http.post(
        `${BASE_URL}/auth/sign-in`,
        JSON.stringify({ email: `${role}@${DOMAIN}`, password: PASSWORD }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /auth/sign-in' } },
      );
    let res = signIn();
    // Dos corridas seguidas pasan del límite del login: se espera a que se libere y se reintenta.
    for (let i = 0; i < 2 && res.status === 429; i += 1) {
      sleep(61);
      res = signIn();
    }
    check(res, { [`login ${role}`]: (r) => r.status === 200 });
    tokens[role] = res.json('accessToken');
  }
  return tokens;
}

export const auth = (token) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
});

const named = (params, name) => ({ ...params, tags: { name } });

/** Ciclo completo de un pedido de mesa: mesero crea y manda a cocina, cocina lo marca listo, mesero lo entrega, caja cobra. */
export function orderCycle(tokens, mesa) {
  const created = http.post(
    `${BASE_URL}/pedidos/mesa`,
    JSON.stringify({ mesa, numComensales: 2, items: [{ platilloId: 1, cantidad: 1 }, { platilloId: 7, cantidad: 2 }] }),
    named(auth(tokens.mesero), 'POST /pedidos/mesa'),
  );
  check(created, { 'pedido creado': (r) => r.status === 201 });
  const id = created.json('ordenId');
  if (!id) return;
  http.post(`${BASE_URL}/pedidos/confirmar/${id}`, null, named(auth(tokens.mesero), 'POST /pedidos/confirmar/:id'));
  const step = (token, estatus) =>
    http.patch(`${BASE_URL}/pedidos/${id}/estatus`, JSON.stringify({ estatus }), named(auth(token), 'PATCH /pedidos/:id/estatus'));
  check(step(tokens.cocina, 'lista'), { 'cocina marca listo': (r) => r.status === 200 || r.status === 409 });
  check(step(tokens.mesero, 'entregada'), { 'mesero entrega': (r) => r.status === 200 || r.status === 409 });
  const paid = http.post(`${BASE_URL}/pedidos/${id}/cobrar`, JSON.stringify({ metodoPagoId: 2 }), named(auth(tokens.cajero), 'POST /pedidos/:id/cobrar'));
  check(paid, { 'caja cobra': (r) => r.status === 201 || r.status === 200 || r.status === 409 });
}

export function getJson(path, token) {
  return http.get(`${BASE_URL}${path}`, named(token ? auth(token) : {}, `GET ${path.replace(/\?.*$/, '')}`));
}
