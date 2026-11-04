import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './public.schema';

/**
 * Token de Expo Push de cada dispositivo del personal (HU-07). El `token` es
 * UNIQUE: si otra persona inicia sesión en el mismo celular, el token cambia de
 * dueño. La migración vive en `src/database/sql/2026-10-26-device-tokens.sql`
 * y la aplica una persona.
 */
export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: serial().primaryKey().notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar({ length: 255 }).notNull().unique(),
    platform: varchar({ length: 10 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('device_tokens_user_id_idx').on(table.userId)],
);
