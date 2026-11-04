import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Reportes de problemas que envían las personas desde la web (D-34). Sin datos
 * personales. La migración vive en `src/database/sql/2026-11-03-reportes-problemas.sql`
 * (con su reversa) y la aplica una persona.
 */
export const reportesProblemas = pgTable(
  'reportes_problemas',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    tipo: varchar({ length: 20 }).notNull(),
    descripcion: text().notNull(),
    ruta: varchar({ length: 300 }).notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('reportes_problemas_creado_en_idx').on(table.creadoEn.desc()),
  ],
);
