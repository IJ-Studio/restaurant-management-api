import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { empleados, users } from './public.schema';

/**
 * Sumas y restas a la nómina (Prioridad 3.1). Inmutable: la BD impide editar o borrar y valida
 * que una corrección sea el movimiento inverso exacto. Migración:
 * `src/database/sql/2026-11-05-nomina-movimientos.sql`.
 */
export const nominaMovimientos = pgTable(
  'nomina_movimientos',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    empleadoId: uuid('empleado_id')
      .notNull()
      .references(() => empleados.id),
    tipo: varchar({ length: 5 }).notNull(),
    concepto: varchar({ length: 30 }).notNull(),
    monto: numeric({ precision: 10, scale: 2 }).notNull(),
    periodoInicio: date('periodo_inicio').notNull(),
    periodoFin: date('periodo_fin').notNull(),
    fecha: date().defaultNow().notNull(),
    justificacion: text().notNull(),
    autorId: integer('autor_id')
      .notNull()
      .references(() => users.id),
    corrigeId: bigint('corrige_id', { mode: 'number' })
      .unique()
      .references((): AnyPgColumn => nominaMovimientos.id),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_nomina_movimientos_empleado').on(
      table.empleadoId,
      table.periodoInicio,
    ),
    index('idx_nomina_movimientos_autor_id').on(table.autorId),
  ],
);
