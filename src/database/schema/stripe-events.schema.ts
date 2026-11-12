import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Eventos de Stripe ya procesados (DT-D10). El `event_id` es UNIQUE: un
 * reenvío del webhook no vuelve a ejecutar el cobro. La migración vive en
 * `src/database/sql/2026-10-25-stripe-events.sql` y la aplica una persona.
 */
export const stripeEvents = pgTable('stripe_events', {
  eventId: text('event_id').primaryKey().notNull(),
  type: text(),
  processedAt: timestamp('processed_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
});
