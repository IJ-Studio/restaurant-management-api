-- Tokens de notificaciones push del personal (HU-07, issue #74).
-- La aplica una persona; el API nunca ejecuta migraciones.
CREATE TABLE IF NOT EXISTS device_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Un dispositivo tiene un solo token; si otra persona inicia sesión en él, el token cambia de dueño.
  token varchar(255) NOT NULL UNIQUE,
  platform varchar(10) NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens (user_id);

-- Sin políticas: la anon key de Supabase no puede leer los tokens; el API entra como dueño de la tabla.
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
