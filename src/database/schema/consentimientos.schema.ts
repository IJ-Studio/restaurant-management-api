import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { users } from './public.schema';

export const CONSENT_TYPES = [
  'aviso_privacidad',
  'notificaciones_push',
  'reportes_errores',
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_ORIGINS = ['movil', 'web'] as const;
export type ConsentOrigin = (typeof CONSENT_ORIGINS)[number];

/**
 * Registro de consentimientos y preferencias de privacidad (derechos ARCO). Solo se insertan
 * filas: el estado vigente de cada tipo es su fila más reciente. La migración vive en
 * `src/database/sql/2026-11-13-consentimientos.sql` y la aplica una persona.
 */
export const consentimientos = pgTable(
  'consentimientos',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tipo: text().$type<ConsentType>().notNull(),
    otorgado: boolean().notNull(),
    version: text(),
    origen: text().$type<ConsentOrigin>().notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_consentimientos_user_tipo').on(
      table.userId,
      table.tipo,
      table.creadoEn.desc(),
    ),
  ],
);
