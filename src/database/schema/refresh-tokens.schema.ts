import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { users } from './public.schema';

/**
 * Tokens de refresco (un solo uso, con rotación). Solo se guarda el hash SHA-256. La migración
 * vive en `src/database/sql/2026-11-13-refresh-tokens.sql` y la aplica una persona.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('idx_refresh_tokens_user').on(table.userId)],
);
