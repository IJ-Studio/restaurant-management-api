-- Idempotencia de webhooks de Stripe (DT-D10).
-- La aplica una persona; el API nunca ejecuta migraciones.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id text PRIMARY KEY,
  type text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Sin políticas: la anon key no puede leerla ni escribirla; el API entra con un rol con BYPASSRLS.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
