// Pruebas de rendimiento (api#80, #82, #84): carga nominal del restaurante.
// SCENARIO=s2 (menú y reservaciones) | s3 (pedidos y cobro en hora pico) | s4 (estadísticas) | todos (por defecto)
// DURATION (por defecto 5m) y VUS (por defecto 20).
import { sleep } from 'k6';
import { getJson, loginAll, MESAS, orderCycle } from './lib.js';

const DURATION = __ENV.DURATION || '5m';
const VUS = Number(__ENV.VUS || 20);
const ONLY = __ENV.SCENARIO || 'todos';

const all = {
  s2_menu_reservaciones: { executor: 'constant-vus', vus: VUS, duration: DURATION, exec: 'menuYReservaciones' },
  s3_pedidos_cobro: { executor: 'constant-vus', vus: VUS, duration: DURATION, exec: 'pedidosYCobro' },
  s4_estadisticas: { executor: 'constant-vus', vus: Math.max(2, Math.round(VUS / 4)), duration: DURATION, exec: 'estadisticas' },
};
const pick = { s2: 's2_menu_reservaciones', s3: 's3_pedidos_cobro', s4: 's4_estadisticas' };

export const options = {
  scenarios: ONLY === 'todos' ? all : { [pick[ONLY]]: all[pick[ONLY]] },
  // Criterios de los issues: p95 < 500 ms en lecturas, < 800 ms en escrituras y errores < 1 %.
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{method:GET}': ['p(95)<500'],
    'http_req_duration{method:POST}': ['p(95)<800'],
    'http_req_duration{method:PATCH}': ['p(95)<800'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  return loginAll(['admin', 'cajero', 'mesero', 'cocina']);
}

export function menuYReservaciones(tokens) {
  getJson('/menu');
  getJson('/menu/categories/with-products');
  getJson('/mesas');
  getJson('/reservations', tokens.mesero);
  sleep(1);
}

export function pedidosYCobro(tokens) {
  orderCycle(tokens, MESAS[(__VU * 7 + __ITER) % MESAS.length]);
  getJson('/pedidos/admin/recent', tokens.cocina);
  sleep(1);
}

export function estadisticas(tokens) {
  getJson('/dashboard/admin/stats', tokens.admin);
  getJson('/dashboard/admin/ventas-por-hora', tokens.admin);
  getJson('/reportes/hoy', tokens.admin);
  sleep(2);
}
