import {
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './public.schema';

// Tokens de notificaciones push (Expo) del personal: un token pertenece a un solo usuario a la vez
// (si el dispositivo cambia de cuenta, el token pasa a la última que inició sesión en él).
export const dispositivosPush = pgTable(
  'dispositivos_push',
  {
    id: serial().primaryKey().notNull(),
    userId: integer('user_id').notNull(),
    token: varchar({ length: 255 }).notNull(),
    platform: varchar({ length: 10 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'dispositivos_push_user_id_fkey',
    }).onDelete('cascade'),
    unique('dispositivos_push_token_key').on(table.token),
    index('dispositivos_push_user_id_idx').on(table.userId),
  ],
);
