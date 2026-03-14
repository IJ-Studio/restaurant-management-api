import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

type ColumnMeta = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  is_identity: 'YES' | 'NO';
  is_generated: 'ALWAYS' | 'NEVER';
  ordinal_position: number;
};

@Injectable()
export class PlatillosService {
  private readonly tableSchema = 'public';
  private readonly tableName = 'platillos';

  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async getSchema() {
    const columnsResult = await this.db.execute<ColumnMeta>(
      sql`
        select
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          is_identity,
          is_generated,
          ordinal_position
        from information_schema.columns
        where table_schema = ${this.tableSchema}
          and table_name = ${this.tableName}
        order by ordinal_position
      `,
    );

    const columns = columnsResult as unknown as ColumnMeta[];
    if (columns.length === 0) {
      throw new BadRequestException(
        `No existe la tabla ${this.tableSchema}.${this.tableName} (o no tienes permisos)`,
      );
    }
    return { schema: this.tableSchema, table: this.tableName, columns };
  }

  async buildImportTemplate() {
    const { columns } = await this.getSchema();
    const templateColumns = this.getTemplateColumns(columns);
    const csv = toCsv([templateColumns], []);
    return {
      filename: `template_${this.tableName}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    };
  }

  async buildImportTemplateJson() {
    const { columns } = await this.getSchema();
    const templateColumns = this.getTemplateColumns(columns);
    const templateRow = Object.fromEntries(
      templateColumns.map((c) => [c, '']),
    ) as Record<string, unknown>;

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      schema: this.tableSchema,
      table: this.tableName,
      columns: templateColumns,
      rows: [templateRow],
    };

    return {
      filename: `template_${this.tableName}_${new Date().toISOString().slice(0, 10)}.json`,
      json: JSON.stringify(payload, bigintJsonReplacer, 2),
    };
  }

  async exportCsv() {
    const { columns } = await this.getSchema();
    const columnNames = columns.map((c) => c.column_name);

    const selectColumns = sql.join(
      columnNames.map((c) => sql`${sql.identifier(c)}`),
      sql`, `,
    );

    const rowsResult = await this.db.execute<Record<string, unknown>>(
      sql`select ${selectColumns} from ${sql.identifier(this.tableSchema)}.${sql.identifier(this.tableName)}`,
    );

    const rows = rowsResult as unknown as Array<Record<string, unknown>>;
    const csv = toCsv([columnNames], rows.map((r) => columnNames.map((c) => r[c])));
    return {
      filename: `${this.tableName}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    };
  }

  async exportJson() {
    const { columns } = await this.getSchema();
    const columnNames = columns.map((c) => c.column_name);

    const selectColumns = sql.join(
      columnNames.map((c) => sql`${sql.identifier(c)}`),
      sql`, `,
    );

    const rowsResult = await this.db.execute<Record<string, unknown>>(
      sql`select ${selectColumns} from ${sql.identifier(this.tableSchema)}.${sql.identifier(this.tableName)}`,
    );
    const rows = rowsResult as unknown as Array<Record<string, unknown>>;

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      schema: this.tableSchema,
      table: this.tableName,
      rows: rows.map((r) => sanitizeRowForJson(r)),
    };

    return {
      filename: `${this.tableName}_${new Date().toISOString().slice(0, 10)}.json`,
      json: JSON.stringify(payload, bigintJsonReplacer, 2),
    };
  }

  async importCsv(csvText: string, mode: 'insert' | 'upsert') {
    const { columns } = await this.getSchema();
    const colByName = new Map(columns.map((c) => [c.column_name, c] as const));

    const parsed = parseCsv(csvText);
    if (parsed.rows.length === 0) {
      return { inserted: 0, updated: 0, message: 'CSV vacío' };
    }
    if (parsed.headers.length === 0) {
      throw new BadRequestException('CSV inválido: no tiene encabezados');
    }
    if (parsed.rows.length > 2000) {
      throw new BadRequestException('CSV demasiado grande (máx 2000 filas)');
    }

    const headers = parsed.headers;
    for (const h of headers) {
      if (!colByName.has(h)) {
        throw new BadRequestException(`Columna desconocida en CSV: ${h}`);
      }
    }

    const normalizedRows = parsed.rows.map((row, rowIdx) => {
      const record: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        try {
          record[h] = castValue(row[i] ?? '', colByName.get(h)!);
        } catch (e: any) {
          const msg = e?.message ? String(e.message) : 'valor inválido';
          throw new BadRequestException(
            `Fila ${rowIdx + 2}, columna "${h}": ${msg}`,
          );
        }
      }
      return record;
    });

    return this.insertRows(headers, normalizedRows, mode);
  }

  async importJson(body: unknown, mode: 'insert' | 'upsert') {
    const { columns } = await this.getSchema();
    const colByName = new Map(columns.map((c) => [c.column_name, c] as const));

    const records = parseJsonPayload(body);
    if (records.length === 0) return { inserted: 0, updated: 0, message: 'JSON vacío' };
    if (records.length > 2000) {
      throw new BadRequestException('JSON demasiado grande (máx 2000 filas)');
    }

    const headerSet = new Set<string>();
    for (const r of records) Object.keys(r).forEach((k) => headerSet.add(k));
    const headers = Array.from(headerSet);
    if (headers.length === 0) {
      throw new BadRequestException('JSON inválido: no tiene columnas');
    }

    for (const h of headers) {
      if (!colByName.has(h)) {
        throw new BadRequestException(`Columna desconocida en JSON: ${h}`);
      }
    }

    const normalizedRows = records.map((row, rowIdx) => {
      const record: Record<string, unknown> = {};
      for (const h of headers) {
        try {
          record[h] = castJsonValue(row[h], colByName.get(h)!);
        } catch (e: any) {
          const msg = e?.message ? String(e.message) : 'valor inválido';
          throw new BadRequestException(
            `Fila ${rowIdx + 1}, columna "${h}": ${msg}`,
          );
        }
      }
      return record;
    });

    return this.insertRows(headers, normalizedRows, mode);
  }

  async importExcel(buffer: Buffer, mode: 'insert' | 'upsert') {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('El archivo Excel está vacío');

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell: any) => {
      if (cell.value) headers.push(String(cell.value).trim());
    });

    if (headers.length === 0) {
      throw new BadRequestException('El Excel no tiene encabezados');
    }

    const { columns } = await this.getSchema();
    const colByName = new Map(columns.map((c) => [c.column_name, c] as const));

    // Validar que todas las columnas existan
    for (const h of headers) {
      if (!colByName.has(h)) {
        throw new BadRequestException(`Columna desconocida en Excel: ${h}`);
      }
    }

    const normalizedRows: Array<Record<string, unknown>> = [];

    sheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip header

      const record: Record<string, unknown> = {};
      let hasContent = false;

      headers.forEach((header, colIndex) => {
        const cellValue = row.getCell(colIndex + 1).value;

        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          hasContent = true;
          try {
            record[header] = castJsonValue(cellValue, colByName.get(header)!);
          } catch (e: any) {
            const msg = e?.message ? String(e.message) : 'valor inválido';
            throw new BadRequestException(
              `Fila ${rowNumber}, columna "${header}": ${msg}`,
            );
          }
        }
      });

      if (hasContent) {
        normalizedRows.push(record);
      }
    });

    if (normalizedRows.length === 0) {
      throw new BadRequestException('El Excel no contiene datos válidos');
    }

    return this.insertRows(headers, normalizedRows, mode);
  }

  private async insertRows(
    headers: string[],
    normalizedRows: Array<Record<string, unknown>>,
    mode: 'insert' | 'upsert',
  ) {
    const hasId = headers.includes('id');
    const hasCodigo = headers.includes('codigo');
    const canUpsert = mode === 'upsert' && (hasId || hasCodigo);
    const conflictColumn = hasId ? 'id' : 'codigo';

    const targetColumns = headers;
    const columnIdentifiers = targetColumns.map((c) => sql.identifier(c));

    const valuesSql = sql.join(
      normalizedRows.map((row) => {
        const valueChunks = targetColumns.map((c) => valueToSql(row[c]));
        return sql`(${sql.join(valueChunks, sql`, `)})`;
      }),
      sql`, `,
    );

    const conflictSql = canUpsert
      ? sql`
          on conflict (${sql.identifier(conflictColumn)}) do update set
          ${sql.join(
            targetColumns
              .filter((c) => c !== conflictColumn)
              .map(
                (c) =>
                  sql`${sql.identifier(c)} = ${sql.raw('excluded')}.${sql.identifier(c)}`,
              ),
            sql`, `,
          )}
        `
      : sql``;

    const returningSql = canUpsert
      ? sql`returning (xmax = 0) as inserted`
      : sql`returning 1`;

    const result = await this.db.execute<Record<string, unknown>>(
      sql`
        insert into ${sql.identifier(this.tableSchema)}.${sql.identifier(this.tableName)}
        (${sql.join(columnIdentifiers.map((c) => sql`${c}`), sql`, `)})
        values ${valuesSql}
        ${conflictSql}
        ${returningSql}
      `,
    );

    const rows = result as unknown as Array<Record<string, unknown>>;
    if (!canUpsert) return { inserted: rows.length, updated: 0 };

    const inserted = rows.filter((r) => r.inserted === true).length;
    const updated = rows.length - inserted;
    return { inserted, updated };
  }

  private getTemplateColumns(columns: ColumnMeta[]): string[] {
    const excluded = new Set([
      'id',
      'creado_en',
      'actualizado_en',
      'created_at',
      'updated_at',
      'fecha_alta',
    ]);

    const allowed = columns.filter((c) => {
      if (c.is_identity === 'YES') return false;
      if (c.is_generated === 'ALWAYS') return false;
      if (excluded.has(c.column_name)) return false;
      return true;
    });

    const byName = new Map(allowed.map((c) => [c.column_name, c] as const));

    const required = allowed
      .filter((c) => c.is_nullable === 'NO' && !c.column_default)
      .sort((a, b) => a.ordinal_position - b.ordinal_position)
      .map((c) => c.column_name);

    const preferred = [
      'categoria_id',
      'nombre',
      'descripcion_corta',
      'descripcion',
      'precio',
      'tiempo_preparacion',
      'disponible',
      'imagen_url',
      'codigo',
      'es_vegetariano',
      'es_vegano',
      'es_sin_gluten',
      'es_picante',
      'nivel_picante',
      'es_popular',
    ].filter((c) => byName.has(c));

    const out: string[] = [];
    for (const c of [...required, ...preferred]) {
      if (!out.includes(c)) out.push(c);
    }
    return out;
  }

  async getAllPlatillos() {
    const { columns } = await this.getSchema();
    const columnNames = columns.map((c) => c.column_name);

    const selectColumns = sql.join(
      columnNames.map((c) => sql`${sql.identifier(c)}`),
      sql`, `,
    );

    const rowsResult = await this.db.execute<Record<string, unknown>>(
      sql`select ${selectColumns} from ${sql.identifier(this.tableSchema)}.${sql.identifier(this.tableName)}`,
    );

    return rowsResult as unknown as Array<Record<string, unknown>>;
  }
}

const DB_DEFAULT = Symbol('db_default');

function castValue(raw: string, column: ColumnMeta): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return column.column_default ? DB_DEFAULT : null;
  if (trimmed.toLowerCase() === 'null') return null;

  const type = column.data_type.toLowerCase();
  const udt = column.udt_name.toLowerCase();

  if (type === 'boolean') {
    const v = trimmed.toLowerCase();
    return v === 'true' || v === 't' || v === '1' || v === 'yes' || v === 'si';
  }

  if (
    type === 'smallint' ||
    type === 'integer' ||
    type === 'bigint' ||
    udt === 'int2' ||
    udt === 'int4' ||
    udt === 'int8'
  ) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      throw new BadRequestException(
        `Valor inválido para entero en "${column.column_name}": "${trimmed}"`,
      );
    }
    return n;
  }

  if (
    type === 'json' ||
    type === 'jsonb' ||
    udt === 'json' ||
    udt === 'jsonb'
  ) {
    return JSON.parse(trimmed);
  }

  return trimmed;
}

function castJsonValue(value: unknown, column: ColumnMeta): unknown {
  if (value === undefined) return column.column_default ? DB_DEFAULT : null;
  if (value === null) return null;
  if (typeof value === 'string') return castValue(value, column);

  const type = column.data_type.toLowerCase();
  const udt = column.udt_name.toLowerCase();

  if (type === 'boolean' && typeof value === 'boolean') return value;
  if (
    (type === 'smallint' ||
      type === 'integer' ||
      type === 'bigint' ||
      udt === 'int2' ||
      udt === 'int4' ||
      udt === 'int8') &&
    typeof value === 'number'
  ) {
    return value;
  }
  if (
    (type === 'json' || type === 'jsonb' || udt === 'json' || udt === 'jsonb') &&
    typeof value === 'object'
  ) {
    return value;
  }

  return value;
}

function valueToSql(value: unknown) {
  if (value === DB_DEFAULT) return sql.raw('default');
  if (value === undefined || value === null) return sql.raw('NULL');
  return sql`${value}`;
}

function parseJsonPayload(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body.filter((x) => x && typeof x === 'object') as Array<
      Record<string, unknown>
    >;
  }
  if (body && typeof body === 'object') {
    const maybeRows = (body as any).rows;
    if (Array.isArray(maybeRows)) {
      return maybeRows.filter((x) => x && typeof x === 'object') as Array<
        Record<string, unknown>
      >;
    }
  }
  throw new BadRequestException(
    'JSON inválido: envía un array de objetos o un objeto con { rows: [...] }',
  );
}

function sanitizeRowForJson(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? v.toString() : v;
  }
  return out;
}

function bigintJsonReplacer(_: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const grid = csvToGrid(text);
  const nonEmpty = grid.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1);
  return { headers, rows };
}

function toCsv(headers: string[][], rows: unknown[][]): string {
  const allRows = [...headers, ...rows];
  return (
    '\ufeff' +
    allRows
      .map((r) => r.map((v) => csvCell(v)).join(','))
      .join('\n')
      .concat('\n')
  );
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'bigint') s = value.toString();
  else if (typeof value === 'object') s = JSON.stringify(value);
  else s = String(value);

  const mustQuote = /[",\r\n]/.test(s);
  if (!mustQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function csvToGrid(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      currentRow.push(current);
      current = '';
      continue;
    }

    if (ch === '\r') continue;
    if (ch === '\n') {
      currentRow.push(current);
      rows.push(currentRow);
      currentRow = [];
      current = '';
      continue;
    }

    current += ch;
  }

  currentRow.push(current);
  rows.push(currentRow);
  return rows;
}
