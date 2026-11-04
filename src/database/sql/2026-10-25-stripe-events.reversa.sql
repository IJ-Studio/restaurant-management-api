-- Reversa de 2026-10-25-stripe-events.sql. Borra la tabla: los reenvíos de webhooks ya procesados se volverían a ejecutar.
DROP TABLE IF EXISTS stripe_events;
