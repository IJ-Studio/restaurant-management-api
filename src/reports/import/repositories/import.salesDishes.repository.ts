import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../database/constants';
import * as schema from '../../../database/schema/public.schema';

export type SalesDishRow = Record<string, any>;

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
export class ImportSalesDishesRepository {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async importSalesByDish(
    data: SalesDishRow[],
    mode: 'insert' | 'upsert' = 'insert',
  ) {
    if (data.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    // Get schema for the view/table
    const tableSchema = 'public';
    const tableName = 'v_ventas_platillo';

    const columns = await this.getTableColumns(tableSchema, tableName);
    const colByName = new Map(columns.map((c) => [c.column_name, c] as const));

    // Validate all columns in data exist in schema
    const dataKeys = new Set(Object.keys(data[0] || {}));
    for (const key of dataKeys) {
      if (!colByName.has(key)) {
        throw new BadRequestException(`Columna desconocida: ${key}`);
      }
    }

    const result = await this.insertOrUpsertRows(
      tableSchema,
      'ventas_platillo', // real table name for insert
      Array.from(dataKeys),
      data,
      columns,
      mode,
    );

    return result;
  }

  async importSalesByDay(
    data: SalesDishRow[],
    mode: 'insert' | 'upsert' = 'insert',
  ) {
    if (data.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    const tableSchema = 'public';
    const tableName = 'v_ventas_por_dia';

    const columns = await this.getTableColumns(tableSchema, tableName);
    const colByName = new Map(columns.map((c) => [c.column_name, c] as const));

    const dataKeys = new Set(Object.keys(data[0] || {}));
    for (const key of dataKeys) {
      if (!colByName.has(key)) {
        throw new BadRequestException(`Columna desconocida: ${key}`);
      }
    }

    const result = await this.insertOrUpsertRows(
      tableSchema,
      'ventas_por_dia', // real table name for insert
      Array.from(dataKeys),
      data,
      columns,
      mode,
    );

    return result;
  }

  private async getTableColumns(
    schema: string,
    table: string,
  ): Promise<ColumnMeta[]> {
    const result = await this.db.execute<ColumnMeta>(
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
        where table_schema = ${schema}
          and table_name = ${table}
        order by ordinal_position
      `,
    );

    return result as unknown as ColumnMeta[];
  }

  private async insertOrUpsertRows(
    schema: string,
    table: string,
    headers: string[],
    rows: SalesDishRow[],
    columns: ColumnMeta[],
    mode: 'insert' | 'upsert',
  ) {
    const colByName = new Map(columns.map((c) => [c.column_name, c] as const));

    // Normalize and cast values
    const normalizedRows = rows.map((row, rowIdx) => {
      const record: Record<string, unknown> = {};
      for (const h of headers) {
        try {
          record[h] = this.castValue(row[h], colByName.get(h)!);
        } catch (e: any) {
          const msg = e?.message ? String(e.message) : 'valor inválido';
          throw new BadRequestException(
            `Fila ${rowIdx + 1}, columna "${h}": ${msg}`,
          );
        }
      }
      return record;
    });

    // Build INSERT query
    const columnIdentifiers = headers.map((c) => sql.identifier(c));
    const valuesSql = sql.join(
      normalizedRows.map((row) => {
        const valueChunks = headers.map((c) =>
          row[c] === undefined || row[c] === null ? sql`NULL` : sql`${row[c]}`,
        );
        return sql`(${sql.join(valueChunks, sql`, `)})`;
      }),
      sql`, `,
    );

    const upsertClause =
      mode === 'upsert' && headers.includes('id')
        ? sql`
          on conflict (${sql.identifier('id')}) do update set
          ${sql.join(
            headers
              .filter((c) => c !== 'id')
              .map(
                (c) =>
                  sql`${sql.identifier(c)} = ${sql.raw('excluded')}.${sql.identifier(c)}`,
              ),
            sql`, `,
          )}
        `
        : sql``;

    try {
      const result = await this.db.execute(
        sql`
          insert into ${sql.identifier(schema)}.${sql.identifier(table)}
          (${sql.join(columnIdentifiers, sql`, `)})
          values ${valuesSql}
          ${upsertClause}
          returning 1
        `,
      );

      return {
        inserted: (result as any).length,
        updated: 0,
        skipped: 0,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Error al insertar datos: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private castValue(value: any, column: ColumnMeta): unknown {
    if (value === null || value === undefined) {
      return column.column_default ? undefined : null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return column.column_default ? undefined : null;
      }

      const type = column.data_type.toLowerCase();
      const udt = column.udt_name.toLowerCase();

      if (type === 'boolean') {
        const v = trimmed.toLowerCase();
        return (
          v === 'true' || v === 't' || v === '1' || v === 'yes' || v === 'si'
        );
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
        try {
          return JSON.parse(trimmed);
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    // Handle typed values from Excel
    const type = column.data_type.toLowerCase();
    const udt = column.udt_name.toLowerCase();

    if (type === 'boolean' && typeof value === 'boolean') {
      return value;
    }

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
      (type === 'json' ||
        type === 'jsonb' ||
        udt === 'json' ||
        udt === 'jsonb') &&
      typeof value === 'object'
    ) {
      return value;
    }

    return value;
  }
}
