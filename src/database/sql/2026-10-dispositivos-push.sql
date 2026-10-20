-- HU-07 (#74): tokens de notificaciones push del personal.
-- Script manual e idempotente: el snapshot de drizzle-kit (meta/) está desfasado respecto al esquema
-- real, así que `drizzle-kit generate` arrastraría tablas ajenas. Ejecutar una vez en cada base (staging/prod).
CREATE TABLE IF NOT EXISTS dispositivos_push (
  id          serial PRIMARY KEY,
  user_id     integer      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       varchar(255) NOT NULL,
  platform    varchar(10)  NOT NULL,
  created_at  timestamp    NOT NULL DEFAULT now(),
  updated_at  timestamp    NOT NULL DEFAULT now(),
  CONSTRAINT dispositivos_push_token_key UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS dispositivos_push_user_id_idx ON dispositivos_push (user_id);
