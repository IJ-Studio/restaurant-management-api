import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './public.schema';

/**
 * Filas dadas de baja, con su motivo y su autor, para consultarlas o restaurarlas.
 * Migración: `src/database/sql/2026-11-04-registros-eliminados.sql` (con su reversa).
 */
export const registrosEliminados = pgTable(
  'registros_eliminados',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    tablaOrigen: varchar('tabla_origen', { length: 63 }).notNull(),
    registroId: text('registro_id').notNull(),
    datos: jsonb().notNull(),
    motivo: varchar({ length: 300 }),
    autorId: integer('autor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eliminadoEn: timestamp('eliminado_en', {
      withTimezone: true,
      mode: 'string',
    })
      .defaultNow()
      .notNull(),
    restauradoEn: timestamp('restaurado_en', {
      withTimezone: true,
      mode: 'string',
    }),
    restauradoPor: integer('restaurado_por').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('idx_registros_eliminados_origen').on(
      table.tablaOrigen,
      table.registroId,
    ),
    index('idx_registros_eliminados_autor_id').on(table.autorId),
    index('idx_registros_eliminados_restaurado_por').on(table.restauradoPor),
  ],
);
