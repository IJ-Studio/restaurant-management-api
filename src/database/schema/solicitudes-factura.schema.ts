import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { facturas, ordenes, users } from './public.schema';

export type EstatusSolicitudFactura = 'pendiente' | 'emitida' | 'rechazada';

/** Cola de solicitudes de factura. Migración: `src/database/sql/2026-11-14-solicitudes-factura.sql`. */
export const solicitudesFactura = pgTable(
  'solicitudes_factura',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    ordenId: uuid('orden_id')
      .notNull()
      .unique()
      .references(() => ordenes.id, { onDelete: 'cascade' }),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    datos: jsonb().$type<Record<string, string>>().notNull(),
    estatus: text()
      .$type<EstatusSolicitudFactura>()
      .notNull()
      .default('pendiente'),
    motivo: text(),
    facturaId: uuid('factura_id').references(() => facturas.id, {
      onDelete: 'set null',
    }),
    atendidaPor: integer('atendida_por').references(() => users.id, {
      onDelete: 'set null',
    }),
    atendidaEn: timestamp('atendida_en', {
      withTimezone: true,
      mode: 'string',
    }),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_solicitudes_factura_estatus').on(table.estatus, table.creadoEn),
    index('idx_solicitudes_factura_usuario').on(table.usuarioId),
    index('idx_solicitudes_factura_factura').on(table.facturaId),
    index('idx_solicitudes_factura_atendida_por').on(table.atendidaPor),
  ],
);
