-- Reportes de problemas desde la web (D-34 del rediseño). La aplica una persona; el API nunca
-- ejecuta migraciones. Reversa: 2026-11-03-reportes-problemas.reversa.sql.
-- Sin datos personales: solo el tipo, la descripción y la pantalla donde pasó.
CREATE TABLE IF NOT EXISTS reportes_problemas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo varchar(20) NOT NULL CHECK (tipo IN ('no-funciona', 'dato-incorrecto', 'accesibilidad', 'otro')),
  descripcion text NOT NULL CHECK (char_length(descripcion) BETWEEN 10 AND 1000),
  ruta varchar(300) NOT NULL CHECK (ruta LIKE '/%'),
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- Se revisan del más reciente al más antiguo.
CREATE INDEX IF NOT EXISTS reportes_problemas_creado_en_idx ON reportes_problemas (creado_en DESC);

-- Sin políticas: la anon key de Supabase no puede leerlos ni escribirlos; el API entra como dueño de la tabla.
ALTER TABLE reportes_problemas ENABLE ROW LEVEL SECURITY;
