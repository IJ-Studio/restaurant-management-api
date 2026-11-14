// Pruebas de esfuerzo (api#85): rampa a 5× la carga nominal y pico repentino sobre pedidos y cambio de estado.
// Solo contra un entorno de pruebas. Criterio: sin caída, errores < 5 % y recuperación < 60 s.
import { sleep } from 'k6';
import { getJson, loginAll, MESAS, orderCycle } from './lib.js';

const FACTOR = Number(__ENV.FACTOR || 1); // 0.25 para un ensayo corto en local

const s = (sec) => `${Math.max(5, Math.round(sec * FACTOR))}s`;

export const options = {
  scenarios: {
    rampa: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: s(60), target: 20 },
        { duration: s(120), target: 100 }, // 5× la carga nominal
        { duration: s(60), target: 100 },
        { duration: s(30), target: 20 },
        { duration: s(60), target: 20 }, // recuperación
      ],
      exec: 'pedidos',
    },
    pico: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: s(360),
      stages: [
        { duration: '5s', target: 200 },
        { duration: s(30), target: 200 },
        { duration: '5s', target: 0 },
      ],
      exec: 'pedidos',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{scenario:rampa}': ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  return loginAll(['cajero', 'mesero', 'cocina']);
}

export function pedidos(tokens) {
  orderCycle(tokens, MESAS[(__VU * 7 + __ITER) % MESAS.length]);
  getJson('/pedidos/admin/recent', tokens.cocina);
  sleep(0.5);
}
