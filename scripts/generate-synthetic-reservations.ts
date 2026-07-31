// Genera reservaciones sintéticas para el dataset de entrenamiento del
// modelo de no-show (src/reservations/no-show/). Requisito de la sección
// 3.2 del documento de requisitos: script reproducible con semilla fija,
// reglas de negocio explicadas, y proporción real/sintética documentada.
//
// USO:
//   pnpm ts-node -r tsconfig-paths/register scripts/generate-synthetic-reservations.ts [--reset] [--dry-run]
//
//   --dry-run  No escribe en la base de datos, solo imprime un resumen de
//              lo que generaría (útil para revisar las reglas sin tocar
//              datos reales).
//   --reset    Borra las reservaciones sintéticas existentes
//              (es_sintetica = true) antes de insertar las nuevas. Sin esta
//              bandera, el script no inserta nada si ya hay reservaciones
//              sintéticas (evita duplicar datos por error).
//
// REPRODUCIBILIDAD: todo el dataset se deriva de SEED=77 vía mulberry32
// (mismo PRNG que random-forest.util.ts y kmeans.util.ts). Dos corridas del
// script producen exactamente las mismas 450 filas, byte por byte. La fecha
// de referencia (FECHA_REFERENCIA) también es una constante fija, no
// `new Date()`, precisamente para que el resultado no dependa del día en
// que se ejecuta el script.
//
// REGLAS DE NEGOCIO (derivadas de patrones razonables para un restaurante,
// no de datos reales — no existen suficientes reservaciones históricas):
//
// 1. Cliente: nombre completo, teléfono (10 dígitos, formato mexicano sin
//    guiones, igual que las reservaciones reales) y correo (derivado del
//    nombre + dominio común), todos tomados de catálogos fijos — se
//    generan a propósito para que el frontend (confirmación telefónica,
//    ficha de la reservación) se vea igual que con datos reales. Al no
//    corresponder a personas reales, no son PII real y no requieren
//    anonimizarse en el respaldo de entrega.
// 2. mesa_id: se asigna la mesa activa más chica cuya capacidad alcanza
//    para num_comensales (igual que asignaría el staff). user_id queda
//    NULL siempre — es una reservación de invitado sin cuenta, y llenarlo
//    asociaría la reservación sintética a la cuenta de un usuario real.
// 3. fecha_hora: distribuida entre 260 días antes y 75 días después de
//    FECHA_REFERENCIA (78% pasado / 22% futuro, ver regla 9), en horario
//    de servicio (12:00–22:00). anticipacion (fecha_hora - creado_en) es
//    uniforme entre 1 y 30 días.
// 4. num_comensales: 2 a 8, con más peso en grupos chicos (2-4) que
//    grandes (7-8), reflejando que la mayoría de las reservaciones son
//    familias o parejas, no eventos grandes.
// 5. canal: teléfono es el canal dominante (47%), seguido de web (24%),
//    app (20%) y redes sociales (9%). "alexa" existe como canal real del
//    sistema pero no se genera aquí a propósito — igual que en el snapshot
//    real, para que el modelo/backend deban soportarlo sin depender de
//    verlo en el set de entrenamiento.
// 6. Depósito: se requiere depósito con más probabilidad mientras más
//    grande es el grupo (reservaciones grandes son más costosas de dejar
//    vacías si el cliente no llega). Cuando se requiere, el monto es
//    proporcional al número de comensales. El pago es binario: se paga
//    completo o no se paga nada (nunca parcial) — 80%/20%.
// 7. recordatorio_enviado: 80% de probabilidad, independiente del resto
//    (se envía casi siempre salvo fallas del sistema de notificaciones).
// 8. no_show: la variable objetivo. Depende de si se pagó depósito y si se
//    envió recordatorio — ambos son señales de compromiso del cliente:
//      sin depósito, sin recordatorio  -> 20% de no-show
//      sin depósito, con recordatorio  -> 19%
//      con depósito, sin recordatorio  -> 13%
//      con depósito, con recordatorio  ->  5%
//    Esta regla es intencional: el Random Forest debe poder recuperarla
//    (y de hecho `deposito_pagado`/`recordatorio_enviado` salen entre las
//    variables más importantes del modelo — ver no_show_prediction.ipynb,
//    sección 9).
// 9. estatus: ~78% de las reservaciones caen antes de FECHA_REFERENCIA
//    (ya "sucedieron") y se resuelven en 'completada' o 'no_show' según la
//    regla anterior. El ~22% restante cae después de FECHA_REFERENCIA
//    (todavía no ocurren) y queda en 'confirmada' (58%) o 'pendiente'
//    (42%), sin no_show observado — evita fuga de etiqueta, igual que
//    filtra el propio notebook (sección 3, "Filtrado: solo reservaciones
//    resueltas").

import 'dotenv/config';
import postgres from 'postgres';
import { mulberry32 } from '../src/reservations/no-show/random-forest.util';

const SEED = 77;
const N_SINTETICAS = 450;
const FECHA_REFERENCIA = new Date('2026-07-20T22:00:00.000Z');
const DIAS_PASADO = 260; // ventana hacia atrás desde FECHA_REFERENCIA (resueltas)
const DIAS_FUTURO = 75; // ventana hacia adelante (aún no ocurren, ~22% del total)

const NOMBRES = [
  'María',
  'José',
  'Juan',
  'Laura',
  'Miguel',
  'Sofía',
  'Luis',
  'Daniela',
  'Jorge',
  'Fernanda',
  'Roberto',
  'Patricia',
  'Javier',
  'Andrea',
  'Carlos',
  'Alejandra',
  'Francisco',
  'Gabriela',
  'Ricardo',
  'Valeria',
  'Diego',
  'Mónica',
  'Raúl',
  'Claudia',
  'Sergio',
  'Verónica',
  'Arturo',
  'Paola',
];
const APELLIDOS = [
  'García',
  'Hernández',
  'López',
  'Martínez',
  'González',
  'Pérez',
  'Sánchez',
  'Ramírez',
  'Torres',
  'Flores',
  'Rivera',
  'Gómez',
  'Díaz',
  'Cruz',
  'Morales',
  'Reyes',
  'Jiménez',
  'Álvarez',
  'Chávez',
  'Ortiz',
];

const OCASIONES = [
  'Casual',
  'Cumpleaños',
  'Aniversario',
  'Negocios',
  'Otro',
] as const;

const CANALES: { valor: string; peso: number }[] = [
  { valor: 'telefono', peso: 0.47 },
  { valor: 'web', peso: 0.24 },
  { valor: 'app', peso: 0.2 },
  { valor: 'redes_sociales', peso: 0.09 },
];

const DOMINIOS_CORREO = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
];

// Debe reflejar la tabla `mesas` real (id, capacidad, solo activas).
// Si el layout de mesas cambia, actualizar este catálogo.
const MESAS: { id: number; capacidad: number }[] = [
  { id: 1, capacidad: 4 },
  { id: 2, capacidad: 4 },
  { id: 3, capacidad: 4 },
  { id: 4, capacidad: 6 },
  { id: 5, capacidad: 6 },
  { id: 6, capacidad: 4 },
  { id: 7, capacidad: 8 },
  { id: 8, capacidad: 2 },
  { id: 9, capacidad: 4 },
  { id: 10, capacidad: 4 },
  { id: 11, capacidad: 6 },
  { id: 12, capacidad: 2 },
  { id: 13, capacidad: 2 },
  { id: 14, capacidad: 2 },
  { id: 15, capacidad: 2 },
  { id: 16, capacidad: 2 },
];

const PESOS_COMENSALES: { valor: number; peso: number }[] = [
  { valor: 2, peso: 0.16 },
  { valor: 3, peso: 0.19 },
  { valor: 4, peso: 0.19 },
  { valor: 5, peso: 0.15 },
  { valor: 6, peso: 0.14 },
  { valor: 7, peso: 0.09 },
  { valor: 8, peso: 0.08 },
];

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWeighted<T>(
  rng: () => number,
  opciones: { valor: T; peso: number }[],
): T {
  const total = opciones.reduce((s, o) => s + o.peso, 0);
  let r = rng() * total;
  for (const o of opciones) {
    if (r < o.peso) return o.valor;
    r -= o.peso;
  }
  return opciones[opciones.length - 1].valor;
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

// Teléfono mexicano de 10 dígitos, sin guiones ni lada con "+", igual al
// formato dominante en las reservaciones reales (ver cliente_telefono).
function generarTelefono(rng: () => number): string {
  const primero = randInt(rng, 2, 9);
  let resto = '';
  for (let i = 0; i < 9; i++) resto += randInt(rng, 0, 9);
  return `${primero}${resto}`;
}

const SIN_ACENTOS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ñ: 'n',
};

function generarCorreo(rng: () => number, nombreCompleto: string): string {
  const normalizado = nombreCompleto
    .toLowerCase()
    .replace(/[áéíóúñ]/g, (c) => SIN_ACENTOS[c] ?? c)
    .trim()
    .split(/\s+/)
    .join('.');
  const dominio = pick(rng, DOMINIOS_CORREO);
  return `${normalizado}${randInt(rng, 1, 99)}@${dominio}`;
}

// Mesa activa más chica cuya capacidad alcanza para numComensales (igual
// que asignaría el staff); si nadie alcanza (grupos > 8), la más grande.
function asignarMesa(rng: () => number, numComensales: number): number {
  const candidatas = MESAS.filter((m) => m.capacidad >= numComensales);
  const pool = candidatas.length > 0 ? candidatas : [MESAS[MESAS.length - 1]];
  const capacidadMinima = Math.min(...pool.map((m) => m.capacidad));
  const ajustadas = pool.filter((m) => m.capacidad === capacidadMinima);
  return pick(rng, ajustadas).id;
}

interface ReservacionSintetica {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  mesa_id: number;
  fecha_hora: string;
  creado_en: string;
  duracion_min: number;
  num_comensales: number;
  ocasion: string;
  canal: string;
  recordatorio_enviado: boolean;
  deposito_requerido: number;
  deposito_pagado: number;
  estatus: 'completada' | 'no_show' | 'confirmada' | 'pendiente';
  no_show: boolean;
  es_sintetica: true;
}

// Probabilidad de no_show según compromiso del cliente (regla 8 de arriba).
function probabilidadNoShow(
  depositoPagado: boolean,
  recordatorioEnviado: boolean,
): number {
  if (depositoPagado && recordatorioEnviado) return 0.05;
  if (depositoPagado && !recordatorioEnviado) return 0.13;
  if (!depositoPagado && recordatorioEnviado) return 0.19;
  return 0.2;
}

export function generarReservacion(rng: () => number): ReservacionSintetica {
  const nombre = `${pick(rng, NOMBRES)} ${pick(rng, APELLIDOS)}`;
  const telefono = generarTelefono(rng);
  const correo = generarCorreo(rng, nombre);

  const numComensales = pickWeighted(rng, PESOS_COMENSALES);
  const mesaId = asignarMesa(rng, numComensales);
  const duracionMin = randInt(rng, 60, 150);
  const ocasion = pick(rng, OCASIONES);
  const canal = pickWeighted(rng, CANALES);

  // Grupos grandes tienen más probabilidad de requerir depósito (regla 6).
  const probRequiereDeposito = Math.min(0.9, 0.1 + 0.09 * numComensales);
  const requiereDeposito = rng() < probRequiereDeposito;
  const depositoRequerido = requiereDeposito
    ? Math.round(numComensales * randFloat(rng, 30, 90))
    : 0;
  const depositoPagado =
    requiereDeposito && rng() < 0.8 ? depositoRequerido : 0;

  const recordatorioEnviado = rng() < 0.8;

  // Distribución temporal: la mayoría de las fechas caen antes de la
  // referencia (ya resueltas); una fracción queda después (aún no ocurren).
  const offsetDias = randFloat(rng, -DIAS_PASADO, DIAS_FUTURO);
  const fechaHora = new Date(
    FECHA_REFERENCIA.getTime() + offsetDias * 86400000,
  );
  fechaHora.setUTCHours(randInt(rng, 12, 22), pick(rng, [0, 15, 30, 45]), 0, 0);

  const anticipacionDias = randFloat(rng, 1, 30);
  const creadoEn = new Date(fechaHora.getTime() - anticipacionDias * 86400000);

  const yaOcurrio = fechaHora.getTime() < FECHA_REFERENCIA.getTime();

  let estatus: ReservacionSintetica['estatus'];
  let noShow: boolean;
  if (yaOcurrio) {
    noShow =
      rng() < probabilidadNoShow(depositoPagado > 0, recordatorioEnviado);
    estatus = noShow ? 'no_show' : 'completada';
  } else {
    noShow = false;
    estatus = rng() < 0.58 ? 'confirmada' : 'pendiente';
  }

  return {
    cliente_nombre: nombre,
    cliente_telefono: telefono,
    cliente_email: correo,
    mesa_id: mesaId,
    fecha_hora: fechaHora.toISOString(),
    creado_en: creadoEn.toISOString(),
    duracion_min: duracionMin,
    num_comensales: numComensales,
    ocasion,
    canal,
    recordatorio_enviado: recordatorioEnviado,
    deposito_requerido: depositoRequerido,
    deposito_pagado: depositoPagado,
    estatus,
    no_show: noShow,
    es_sintetica: true,
  };
}

export function generarDataset(): ReservacionSintetica[] {
  const rng = mulberry32(SEED);
  return Array.from({ length: N_SINTETICAS }, () => generarReservacion(rng));
}

function resumen(filas: ReservacionSintetica[]): void {
  const porEstatus = new Map<string, number>();
  let noShows = 0;
  for (const f of filas) {
    porEstatus.set(f.estatus, (porEstatus.get(f.estatus) ?? 0) + 1);
    if (f.no_show) noShows++;
  }
  console.log(`Filas generadas: ${filas.length}`);
  console.log('Por estatus:', Object.fromEntries(porEstatus));
  console.log(
    `no_show=true: ${noShows} (${((noShows / filas.length) * 100).toFixed(1)}%)`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const reset = args.includes('--reset');

  const filas = generarDataset();
  resumen(filas);

  if (dryRun) {
    console.log('--dry-run: no se escribió nada en la base de datos.');
    return;
  }

  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Define DATABASE_MIGRATION_URL o DATABASE_URL en .env para ejecutar el script.',
    );
  }

  const sql = postgres(url, {
    ssl: process.env.DATABASE_SSL === 'true' ? 'require' : false,
    prepare: false,
  });

  try {
    const [{ count }] = await sql<{ count: string }[]>`
      select count(*)::text from reservaciones where es_sintetica = true
    `;

    if (Number(count) > 0 && !reset) {
      console.log(
        `Ya existen ${count} reservaciones sintéticas. Usa --reset para borrarlas y regenerar, ` +
          'o corre con --dry-run para solo revisar las reglas.',
      );
      return;
    }

    if (reset && Number(count) > 0) {
      await sql`delete from reservaciones where es_sintetica = true`;
      console.log(`Borradas ${count} reservaciones sintéticas existentes.`);
    }

    // Inserción masiva en un solo round-trip vía el helper de postgres.js
    // (genera un único INSERT multi-fila, atómico por sí mismo).
    await sql`
      insert into reservaciones ${sql(
        filas,
        'cliente_nombre',
        'cliente_telefono',
        'cliente_email',
        'mesa_id',
        'fecha_hora',
        'creado_en',
        'duracion_min',
        'num_comensales',
        'ocasion',
        'canal',
        'recordatorio_enviado',
        'deposito_requerido',
        'deposito_pagado',
        'estatus',
        'no_show',
        'es_sintetica',
      )}
    `;

    console.log(
      `Insertadas ${filas.length} reservaciones sintéticas (es_sintetica = true).`,
    );
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
