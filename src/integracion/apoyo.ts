/**
 * Apoyo para las suites de integración contra el API local real (`pnpm test:integracion`).
 *
 * - `API_URL`: el API local (por defecto http://localhost:10000). Nunca otro host.
 * - `CLAVE_PRUEBAS`: la contraseña de los usuarios `<rol>@prueba.local` de la semilla local.
 * - `LOCAL_DATABASE_URL`: la base local de pruebas, para comprobar lo que quedó guardado. Solo
 *   localhost: con cualquier otro host las pruebas que la usan no corren.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';

export const API = process.env.API_URL ?? 'http://localhost:10000';
export const CLAVE = process.env.CLAVE_PRUEBAS ?? 'Prueba#2026';
const BASE = process.env.LOCAL_DATABASE_URL ?? '';

export const apiLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API);
export const baseLocal =
  /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(BASE);

export type Rol = 'admin' | 'cajero' | 'mesero' | 'cocina' | 'cliente';
export type Cuerpo = Record<string, any>;

export async function http(
  metodo: string,
  ruta: string,
  token?: string,
  cuerpo?: unknown,
): Promise<{ status: number; body: Cuerpo }> {
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

// El login admite 5 intentos por minuto por IP y cada suite corre en su propio módulo: las sesiones
// se guardan en un archivo temporal para que las suites las compartan.
const ARCHIVO_SESIONES = join(tmpdir(), 'quijote-integracion-sesiones.json');

function leerSesiones(): Partial<Record<Rol, string>> {
  try {
    return JSON.parse(readFileSync(ARCHIVO_SESIONES, 'utf8')) as Partial<
      Record<Rol, string>
    >;
  } catch {
    return {};
  }
}

/** Token de `<rol>@prueba.local`: reutiliza la sesión si sigue viva y respeta el límite del login. */
export async function sesion(rol: Rol): Promise<string> {
  const guardadas = leerSesiones();
  const guardada = guardadas[rol];
  if (guardada && (await http('GET', '/auth/me', guardada)).status === 200)
    return guardada;

  for (let intento = 0; intento < 3; intento++) {
    const r = await http('POST', '/auth/sign-in', undefined, {
      email: `${rol}@prueba.local`,
      password: CLAVE,
    });
    if (r.status === 201) {
      const token = r.body.accessToken as string;
      writeFileSync(
        ARCHIVO_SESIONES,
        JSON.stringify({ ...leerSesiones(), [rol]: token }),
      );
      return token;
    }
    if (r.status !== 429)
      throw new Error(`No se pudo entrar como ${rol}: ${r.status}`);
    await new Promise((listo) => setTimeout(listo, 61_000));
  }
  throw new Error(`El login de ${rol} sigue limitado`);
}

let sql: ReturnType<typeof postgres> | null = null;

/** Conexión directa a la base local, independiente del proceso del API. */
export function base(): ReturnType<typeof postgres> {
  if (!baseLocal)
    throw new Error('LOCAL_DATABASE_URL debe apuntar a localhost');
  sql ??= postgres(BASE, { max: 1, onnotice: () => undefined });
  return sql;
}

export async function cerrarBase(): Promise<void> {
  await sql?.end({ timeout: 5 });
  sql = null;
}

/** Fecha y hora en UTC dentro del horario de la semilla (08:00 a 22:00, UTC-6) a `dias` de hoy. */
export function enHorario(dias: number, horaLocal = 14): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  fecha.setUTCHours(horaLocal + 6, 0, 0, 0);
  return fecha.toISOString();
}

/** Espera a que `condicion` se cumpla (eventos que llegan por otro proceso). */
export async function esperar<T>(
  condicion: () => T | undefined,
  ms = 5000,
): Promise<T> {
  const fin = Date.now() + ms;
  for (;;) {
    const valor = condicion();
    if (valor !== undefined) return valor;
    if (Date.now() > fin) throw new Error(`No llegó en ${ms} ms`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
