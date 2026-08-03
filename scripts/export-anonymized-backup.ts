/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// Genera el respaldo anonimizado de la base de datos para el ZIP de entrega
// (carpeta `02_Base_Datos/`). Es DISTINTO del respaldo automático de
// producción (`backups.service.ts`), que solo quita `password` de `users` y
// deja el resto de los datos reales tal cual — ese respaldo automático es
// para restaurar el sistema en producción, no para repartirse en una entrega
// académica.
//
// Este script es de SOLO LECTURA sobre la base de datos: nunca hace INSERT,
// UPDATE ni DELETE. Solo hace SELECT y escribe un archivo JSON local.
//
// USO:
//   pnpm ts-node -r tsconfig-paths/register scripts/export-anonymized-backup.ts
//
// QUÉ SE ANONIMIZA (y por qué se decidió este alcance — ver discusión en
// sesión: el checklist original solo pedía `clientes`/`users`/`reservaciones`,
// pero quedó desactualizado frente a las tablas de facturación/Stripe que se
// formalizaron después en la migración `0001_clean_ironclad.sql`):
//
//   users               -> name, lastname, email, phone
//                          (password NUNCA se exporta, igual que el respaldo
//                          de producción)
//   reservaciones       -> cliente_nombre, cliente_telefono, cliente_email
//                          (se anonimizan TODAS las filas por igual, sin
//                          distinguir es_sintetica, para no tener que
//                          documentar una excepción — las 450 sintéticas ya
//                          eran datos falsos, así que no pierden nada real)
//   clientes            -> rfc, razon_social, stripe_customer_id
//   facturas             -> rfc_receptor, razon_social
//   perfiles_facturacion -> rfc, razon_social, email, codigo_postal_fiscal
//   direcciones_cliente  -> linea1, linea2, colonia, codigo_postal
//                          (ciudad/estado se dejan — no identifican a una
//                          persona por sí solos)
//   metodos_pago_guardados -> stripe_customer_id, stripe_payment_method_id,
//                          ultimos_4 (son referencias a Stripe reales; no
//                          tiene sentido "anonimizarlas" con un valor
//                          realista, se redactan directamente)
//
// MÉTODO: pseudónimos DETERMINISTAS derivados del id de cada fila (no de una
// tabla de nombres reales, no es reversible hacia el dato original salvo que
// ya conozcas el id). La gracia de que sean deterministas es que el mismo
// row_id siempre produce el mismo pseudónimo, así que si se corre el script
// dos veces contra la misma base de datos, el resultado es idéntico — mismo
// criterio de reproducibilidad que el resto del proyecto (seed=77 en RF,
// K-Means y datos sintéticos). No se usa un contador global ni Math.random().

import 'dotenv/config';
import postgres from 'postgres';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Utilidades de pseudonimización ──────────────────────────────────────────

// Convierte cualquier id (uuid o número) en un entero estable de 6 dígitos,
// para usarlo como sufijo de nombre/correo/teléfono. No es criptográfico:
// solo necesita ser determinista y suficientemente disperso para que ids
// distintos casi nunca choquen en el mismo respaldo.
function seqFromId(id: string | number): number {
  const str = String(id).replace(/-/g, '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 1_000_000;
}

function pseudoNombre(id: string | number, prefijo: string): string {
  return `${prefijo} ${String(seqFromId(id)).padStart(6, '0')}`;
}

function pseudoEmail(id: string | number, prefijo: string): string {
  return `${prefijo.toLowerCase()}${String(seqFromId(id)).padStart(6, '0')}@ejemplo.com`;
}

function pseudoTelefono(id: string | number): string {
  return `55${String(seqFromId(id)).padStart(8, '0')}`;
}

// Placeholder con forma de RFC (13 caracteres, como el campo real) pero
// obviamente falso — no se intenta simular un RFC válido.
function pseudoRfc(id: string | number): string {
  return `ANON${String(seqFromId(id)).padStart(9, '0')}`;
}

const REDACTADO = '[REDACTADO]';

// ── Anonimizadores por tabla ─────────────────────────────────────────────

type Fila = Record<string, unknown>;

const ANONIMIZADORES: Record<string, ((fila: Fila) => Fila) | undefined> = {
  users: (fila) => {
    const { password: _password, id, ...resto } = fila;
    return {
      ...resto,
      id,
      name: pseudoNombre(id as number, 'Usuario'),
      lastname: '',
      email: pseudoEmail(id as number, 'usuario'),
      phone: pseudoTelefono(id as number),
    };
  },
  reservaciones: (fila) => {
    if (!fila.cliente_nombre && !fila.cliente_telefono && !fila.cliente_email) {
      return fila;
    }
    return {
      ...fila,
      cliente_nombre: pseudoNombre(fila.id as string, 'Cliente'),
      cliente_telefono: fila.cliente_telefono
        ? pseudoTelefono(fila.id as string)
        : fila.cliente_telefono,
      cliente_email: fila.cliente_email
        ? pseudoEmail(fila.id as string, 'reserva')
        : fila.cliente_email,
    };
  },
  clientes: (fila) => ({
    ...fila,
    rfc: fila.rfc ? pseudoRfc(fila.id as string) : fila.rfc,
    razon_social: fila.razon_social
      ? pseudoNombre(fila.id as string, 'Empresa')
      : fila.razon_social,
    stripe_customer_id: fila.stripe_customer_id
      ? REDACTADO
      : fila.stripe_customer_id,
  }),
  facturas: (fila) => ({
    ...fila,
    rfc_receptor: fila.rfc_receptor
      ? pseudoRfc(fila.id as string)
      : fila.rfc_receptor,
    razon_social: fila.razon_social
      ? pseudoNombre(fila.id as string, 'Empresa')
      : fila.razon_social,
  }),
  perfiles_facturacion: (fila) => ({
    ...fila,
    rfc: pseudoRfc(fila.id as string),
    razon_social: pseudoNombre(fila.id as string, 'Empresa'),
    email: fila.email
      ? pseudoEmail(fila.id as string, 'facturacion')
      : fila.email,
    codigo_postal_fiscal: '00000',
  }),
  direcciones_cliente: (fila) => ({
    ...fila,
    linea1: fila.linea1
      ? `Calle Falsa ${seqFromId(fila.id as number)}`
      : fila.linea1,
    linea2: fila.linea2 ? REDACTADO : fila.linea2,
    colonia: fila.colonia ? 'Colonia Centro' : fila.colonia,
    codigo_postal: fila.codigo_postal ? '00000' : fila.codigo_postal,
  }),
  metodos_pago_guardados: (fila) => ({
    ...fila,
    stripe_customer_id: REDACTADO,
    stripe_payment_method_id: REDACTADO,
    ultimos_4: fila.ultimos_4 ? '0000' : fila.ultimos_4,
  }),
};

// ── Construcción del payload (reutilizable sin conexión a BD) ──────────────
//
// Separado de `main()` a propósito: cuando la única vía de acceso a la BD
// disponible es un conector MCP de solo-lectura (sin `DATABASE_URL` local),
// otro script puede volcar las tablas crudas vía MCP y llamar a
// `construirPayload()` con esos datos ya en memoria, reusando exactamente
// esta misma lógica de anonimización — no una reimplementación aparte.

function construirPayload(tablasCrudas: Record<string, Fila[]>) {
  const tables: Record<string, { count: number; data: Fila[] }> = {};
  let totalAnonimizadas = 0;

  for (const [table_name, rows] of Object.entries(tablasCrudas)) {
    const anonimizador = ANONIMIZADORES[table_name];
    const data = anonimizador ? rows.map((r) => anonimizador(r)) : rows;
    if (anonimizador) totalAnonimizadas += rows.length;
    tables[table_name] = { count: data.length, data };
  }

  return {
    payload: {
      exportedAt: new Date().toISOString(),
      version: '1.0-anonimizado',
      tablasAnonimizadas: Object.keys(ANONIMIZADORES),
      tables,
    },
    totalAnonimizadas,
  };
}

// ── Generación del .sql equivalente ─────────────────────────────────────
//
// Mismo contenido que el JSON, en formato INSERT para poder restaurarse con
// `psql` directamente. El orden de las tablas NO respeta dependencias de
// llave foránea (no vale la pena mantener un grafo de dependencias a mano
// para 56 tablas) — en vez de eso, el dump desactiva la verificación de FK
// mientras inserta (`session_replication_role = replica`, la misma técnica
// que usa `pg_dump --disable-triggers`) y la reactiva al final. Requiere
// que quien lo ejecute sea dueño de las tablas (el rol de migraciones lo
// es) — no funciona con un rol de solo `anon`/`authenticated`.

function sqlEscapeValue(valor: unknown): string {
  if (valor === null || valor === undefined) return 'NULL';
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? String(valor) : 'NULL';
  }
  if (typeof valor === 'bigint') return valor.toString();
  if (Array.isArray(valor) || typeof valor === 'object') {
    return `'${JSON.stringify(valor).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof valor === 'string') return `'${valor.replace(/'/g, "''")}'`;
  throw new Error(`Tipo de valor no soportado en el dump SQL: ${typeof valor}`);
}

function generarSql(payload: {
  exportedAt: string;
  tables: Record<string, { count: number; data: Fila[] }>;
}): string {
  const lineas: string[] = [
    '-- Respaldo anonimizado de la base de datos (El Quijote) — solo para',
    '-- la entrega académica, no para restaurar producción.',
    `-- Generado: ${payload.exportedAt}`,
    '--',
    '-- Cómo usarlo contra una base de datos vacía:',
    '--   1. Aplicar las migraciones (0000_loud_rattler.sql, 0001_clean_ironclad.sql)',
    '--      para crear el esquema — ver scripts/test-migrations-empty-db.sh.',
    '--   2. psql "$DATABASE_URL" -f backup_anonimizado_<fecha>.sql',
    '--',
    '-- Desactiva la verificación de FK mientras inserta en vez de ordenar',
    '-- las 56 tablas por dependencias a mano (misma técnica que',
    '-- pg_dump --disable-triggers). Necesita ejecutarse con un rol dueño',
    '-- de las tablas (el rol de migraciones), no con anon/authenticated.',
    '',
    'begin;',
    'set session_replication_role = replica;',
    '',
  ];

  for (const [tableName, { data }] of Object.entries(payload.tables)) {
    if (data.length === 0) continue;

    const columnas = Object.keys(data[0]);
    lineas.push(`-- ${tableName} (${data.length} filas)`);
    for (const fila of data) {
      const valores = columnas.map((c) => sqlEscapeValue(fila[c]));
      lineas.push(
        `insert into "${tableName}" (${columnas.map((c) => `"${c}"`).join(', ')}) values (${valores.join(', ')});`,
      );
    }
    lineas.push('');
  }

  lineas.push('set session_replication_role = origin;');
  lineas.push('commit;');

  return lineas.join('\n');
}

function escribirPayload(payload: {
  exportedAt: string;
  tables: Record<string, { count: number; data: Fila[] }>;
}): { jsonPath: string; sqlPath: string } {
  const outDir = join(__dirname, '..', '..', '02_Base_Datos');
  mkdirSync(outDir, { recursive: true });

  const fecha = new Date().toISOString().slice(0, 10);
  const jsonPath = join(outDir, `backup_anonimizado_${fecha}.json`);
  const sqlPath = join(outDir, `backup_anonimizado_${fecha}.sql`);

  writeFileSync(
    jsonPath,
    JSON.stringify(
      payload,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  );
  writeFileSync(sqlPath, generarSql(payload));

  return { jsonPath, sqlPath };
}

// ── Export (camino con DATABASE_URL local) ──────────────────────────────

async function main() {
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
    const tableNames = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `;

    const tablasCrudas: Record<string, Fila[]> = {};
    for (const { table_name } of tableNames) {
      tablasCrudas[table_name] = await sql<Fila[]>`
        select * from ${sql('public')}.${sql(table_name)}
      `;
    }

    const { payload, totalAnonimizadas } = construirPayload(tablasCrudas);
    const { jsonPath, sqlPath } = escribirPayload(payload);

    console.log(`Respaldo anonimizado (JSON): ${jsonPath}`);
    console.log(`Respaldo anonimizado (SQL):  ${sqlPath}`);
    console.log(`Tablas exportadas: ${Object.keys(tablasCrudas).length}`);
    console.log(`Filas pasadas por un anonimizador: ${totalAnonimizadas}`);
    console.log('Tablas anonimizadas:', Object.keys(ANONIMIZADORES).join(', '));
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export {
  seqFromId,
  pseudoNombre,
  pseudoEmail,
  pseudoTelefono,
  pseudoRfc,
  ANONIMIZADORES,
  construirPayload,
  escribirPayload,
};
export type { Fila };
