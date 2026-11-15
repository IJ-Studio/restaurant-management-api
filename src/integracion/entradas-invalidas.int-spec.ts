/**
 * Entradas inválidas en TODOS los endpoints, contra el API local real. Las rutas, los roles y el DTO de
 * cada cuerpo se leen de los metadatos de Nest y de class-validator (no de una lista a mano), así que
 * un endpoint nuevo queda cubierto solo.
 *
 * Por cada ruta:
 * - acceso: sin token → 401; con un rol que no está en @Roles → 401 o 403 (escalada de privilegios);
 * - parámetros de ruta mal formados o inexistentes → 4xx;
 * - cada campo del cuerpo con vacío, solo espacios, 100 000 caracteres, emojis, HTML, SQL, negativo,
 *   decimal, astronómico, arreglo, objeto, null y booleano, y un campo extra (asignación masiva).
 *
 * Criterio: nunca un 5xx ni un stack trace; los 4xx traen `message`. Un 2xx con un valor claramente
 * inválido se anota como «aceptado» para revisarlo (el servidor no debe confiar en el cliente).
 *
 *   API_URL=http://localhost:10000 RESULTADOS=/ruta/resultados.json pnpm test:integracion -- entradas
 * El API debe correr con THROTTLE_LIMIT alto. Crea registros en la base local: respaldarla antes.
 */
import 'reflect-metadata';
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { RequestMethod } from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { getMetadataStorage } from 'class-validator';

const API = process.env.API_URL ?? 'http://localhost:10000';
const CLAVE = process.env.CLAVE_PRUEBAS ?? 'Prueba#2026';
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API);
const describeLocal = local ? describe : describe.skip;

const ROLES = {
  admin: 1,
  cajero: 2,
  mesero: 3,
  cocina: 4,
  cliente: 5,
} as const;
type Rol = keyof typeof ROLES;

// Rutas que cierran la sesión de prueba, borran la cuenta, tocan respaldos reales o no terminan (SSE).
const OMITIR = [
  /^POST \/auth\/(logout|sign-in|sign-up|refresh)$/,
  /^DELETE \/(account|profile)$/,
  /\/backups/,
  /^GET .*\/stream$/,
];

interface Ruta {
  metodo: string;
  ruta: string;
  roles: number[] | null;
  publica: boolean;
  dto: (new () => object) | null;
}
interface Resultado {
  ruta: string;
  rol: string;
  caso: string;
  esperado: string;
  status: number;
  aprobado: boolean;
  nota?: string;
}

function controladores(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return controladores(p);
    return n.endsWith('.controller.ts') ? [p] : [];
  });
}

function rutas(): Ruta[] {
  const out: Ruta[] = [];
  for (const archivo of controladores(join(__dirname, '..'))) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(archivo) as Record<string, unknown>;
    for (const clase of Object.values(mod)) {
      if (typeof clase !== 'function') continue;
      const base = Reflect.getMetadata(PATH_METADATA, clase) as
        string | undefined;
      if (base === undefined) continue;
      const proto = (clase as { prototype: Record<string, unknown> }).prototype;
      for (const nombre of Object.getOwnPropertyNames(proto)) {
        const fn = proto[nombre];
        if (nombre === 'constructor' || typeof fn !== 'function') continue;
        const sub = Reflect.getMetadata(PATH_METADATA, fn) as
          string | string[] | undefined;
        const metodo = Reflect.getMetadata(METHOD_METADATA, fn) as
          RequestMethod | undefined;
        if (sub === undefined || metodo === undefined) continue;
        const args = (Reflect.getMetadata(ROUTE_ARGS_METADATA, clase, nombre) ??
          {}) as Record<string, { index: number }>;
        const tipos = (Reflect.getMetadata(
          'design:paramtypes',
          proto,
          nombre,
        ) ?? []) as unknown[];
        const cuerpo = Object.entries(args).find(
          ([k]) => Number(k.split(':')[0]) === Number(RouteParamtypes.BODY),
        );
        const dto = cuerpo ? tipos[cuerpo[1].index] : null;
        const roles = (Reflect.getMetadata('roles', fn) ??
          Reflect.getMetadata('roles', clase) ??
          null) as number[] | null;
        for (const parte of Array.isArray(sub) ? sub : [sub])
          out.push({
            metodo: RequestMethod[metodo],
            ruta: `/${[base, parte].filter((s) => s && s !== '/').join('/')}`.replace(
              /\/+/g,
              '/',
            ),
            roles,
            publica: Boolean(
              Reflect.getMetadata('isPublic', fn) ??
              Reflect.getMetadata('isPublic', clase),
            ),
            dto:
              typeof dto === 'function' && dto !== Object
                ? (dto as new () => object)
                : null,
          });
      }
    }
  }
  return out;
}

/** Valor plausible por las reglas del campo, para que solo cambie el campo que se prueba. */
function valorBase(reglas: { name?: string; constraints?: unknown[] }[]) {
  const t = new Set(reglas.map((r) => r.name));
  const en = reglas.find((r) => r.name === 'isIn')?.constraints?.[0];
  if (Array.isArray(en) && en.length) return en[0] as unknown;
  if (t.has('isEmail')) return 'entradas@prueba.local';
  if (t.has('isDateString') || t.has('isISO8601'))
    return new Date(Date.now() + 40 * 86_400_000).toISOString();
  if (t.has('isUUID')) return '00000000-0000-4000-8000-000000000000';
  if (t.has('isBoolean')) return true;
  if (t.has('isArray')) return [];
  if (t.has('isInt') || t.has('isNumber') || t.has('isPositive')) return 1;
  return 'Prueba';
}

const INVALIDOS: [string, unknown][] = [
  ['vacío', ''],
  ['solo espacios', '     '],
  ['100 000 caracteres', 'a'.repeat(100_000)],
  ['emojis', '😀🔥🍕'.repeat(20)],
  ['unicode raro', 'Ｚａｌｇｏ̴̡̛̖ ​‮\u0000'],
  ['HTML', '<script>alert(1)</script><img src=x onerror=alert(1)>'],
  ['SQL', "' OR 1=1; DROP TABLE users;--"],
  ['negativo', -1],
  ['decimal', 1.5],
  ['astronómico', 1e308],
  ['arreglo', ['a', 'b']],
  ['objeto', { $ne: null }],
  ['null', null],
  ['booleano', true],
];
const IDS_MALOS = [
  'abc',
  '-1',
  '0',
  '1.5',
  '99999999999999999999',
  "1' OR '1'='1",
  '00000000-0000-0000-0000-000000000000',
  '%F0%9F%98%80',
];
const INEXISTENTE = '999999';

describeLocal('entradas inválidas en todos los endpoints', () => {
  const tokens: Partial<Record<Rol, string>> = {};
  const resultados: Resultado[] = [];
  const todas = rutas().filter(
    (r) => !OMITIR.some((re) => re.test(`${r.metodo} ${r.ruta}`)),
  );

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
    let message: unknown;
    try {
      message = (JSON.parse(texto) as { message?: unknown }).message;
    } catch {
      message = undefined;
    }
    return { status: r.status, texto, message };
  }

  function anotar(
    ruta: string,
    rol: string,
    caso: string,
    esperado: string,
    r: { status: number; texto: string; message: unknown },
    ok: (s: number) => boolean,
  ) {
    const sinTraza = !/\n\s+at |\.ts:\d+|node_modules/.test(r.texto);
    const conMensaje =
      r.status < 400 ||
      (typeof r.message === 'string' && r.message !== '') ||
      Array.isArray(r.message);
    const aprobado = r.status < 500 && sinTraza && conMensaje && ok(r.status);
    resultados.push({
      ruta,
      rol,
      caso,
      esperado,
      status: r.status,
      aprobado,
      ...(sinTraza ? {} : { nota: 'stack trace en la respuesta' }),
      ...(conMensaje ? {} : { nota: '4xx sin message' }),
    });
  }

  const conParametros = (ruta: string, valor: string) =>
    ruta.replace(/:\w+/g, encodeURIComponent(valor).replace(/%25/g, '%'));

  beforeAll(async () => {
    for (const rol of Object.keys(ROLES) as Rol[]) {
      const r = await http('POST', '/auth/sign-in', undefined, {
        email: `${rol}@prueba.local`,
        password: CLAVE,
      });
      tokens[rol] = (
        JSON.parse(r.texto) as { accessToken: string }
      ).accessToken;
    }
  });

  afterAll(() => {
    if (process.env.RESULTADOS)
      writeFileSync(
        process.env.RESULTADOS,
        JSON.stringify({ total: resultados.length, resultados }, null, 1),
      );
  });

  it('descubre las rutas de los controladores', () => {
    expect(todas.length).toBeGreaterThan(100);
  });

  it('acceso: sin token 401 y con un rol no permitido 401/403', async () => {
    for (const r of todas.filter((x) => !x.publica)) {
      const ruta = conParametros(r.ruta, INEXISTENTE);
      const id = `${r.metodo} ${r.ruta}`;
      anotar(
        id,
        'anónimo',
        'sin token',
        '401',
        await http(r.metodo, ruta, undefined, {}),
        (s) => s === 401,
      );
      if (!r.roles) continue;
      for (const rol of Object.keys(ROLES) as Rol[]) {
        if (r.roles.includes(ROLES[rol])) continue;
        anotar(
          id,
          rol,
          'rol no permitido',
          '401/403',
          await http(r.metodo, ruta, tokens[rol], {}),
          (s) => s === 401 || s === 403,
        );
      }
    }
  });

  /** Primer rol que puede usar la ruta (el cliente si basta con sesión). */
  const rolDe = (r: Ruta): Rol | undefined =>
    r.publica || !r.roles
      ? 'cliente'
      : (Object.keys(ROLES) as Rol[]).find((k) => r.roles!.includes(ROLES[k]));

  it('parámetros de ruta mal formados o inexistentes: 4xx', async () => {
    for (const r of todas.filter((x) => x.ruta.includes(':'))) {
      const rol = rolDe(r);
      for (const valor of [...IDS_MALOS, INEXISTENTE]) {
        anotar(
          `${r.metodo} ${r.ruta}`,
          rol ?? 'anónimo',
          `parámetro «${valor}»`,
          '4xx',
          await http(
            r.metodo,
            conParametros(r.ruta, valor),
            rol && tokens[rol],
            {},
          ),
          // Mal formado → 4xx. Inexistente pero bien formado: sin 5xx; las lecturas de analítica
          // responden `disponible: false` y borrar un token de aviso es idempotente (204).
          (s) =>
            valor === INEXISTENTE || r.ruta.includes(':token')
              ? s < 500
              : s >= 400 && s < 500,
        );
      }
    }
  });

  it('cada campo del cuerpo con valores inválidos y un campo extra', async () => {
    const meta = getMetadataStorage();
    for (const r of todas.filter((x) => x.dto)) {
      const rol = rolDe(r);
      const token = rol && tokens[rol];
      const reglas = meta.getTargetValidationMetadatas(r.dto!, '', true, false);
      const campos = [...new Set(reglas.map((m) => m.propertyName))];
      const base = Object.fromEntries(
        campos.map((c) => [
          c,
          valorBase(
            reglas
              .filter((m) => m.propertyName === c)
              .map((m) => ({
                name:
                  m.name ??
                  meta.getTargetValidatorConstraints(m.constraintCls)[0]?.name,
                constraints: m.constraints,
              })),
          ),
        ]),
      );
      // Con parámetros, un id inexistente: la validación corre antes y no se modifica nada real.
      const ruta = conParametros(r.ruta, INEXISTENTE);
      const id = `${r.metodo} ${r.ruta}`;
      const quien = rol ?? 'anónimo';
      for (const [nombre, valor] of [
        [
          'campo extra «rol: admin»',
          { ...base, rol: 'admin', roleId: 1, isAdmin: true },
        ],
        ['cuerpo arreglo', [base]],
        ['cuerpo vacío', {}],
      ] as [string, unknown][]) {
        anotar(
          id,
          quien,
          nombre,
          '4xx',
          await http(r.metodo, ruta, token, valor),
          (s) => s >= 400,
        );
      }
      for (const campo of campos) {
        for (const [caso, valor] of INVALIDOS) {
          anotar(
            id,
            quien,
            `${campo}: ${caso}`,
            'no 5xx',
            await http(r.metodo, ruta, token, { ...base, [campo]: valor }),
            () => true,
          );
        }
      }
    }
  });

  it('ningún 5xx, ningún stack trace y todo 4xx con mensaje', () => {
    const fallidos = resultados.filter((r) => !r.aprobado);
    expect(
      fallidos.map(
        (f) => `${f.ruta} [${f.rol}] ${f.caso} → ${f.status} ${f.nota ?? ''}`,
      ),
    ).toEqual([]);
  });
});
