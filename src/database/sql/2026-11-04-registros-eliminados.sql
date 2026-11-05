-- Registros dados de baja (tanda autónoma, 2026-11-04). Cada borrado del API guarda aquí la fila
-- completa antes de quitarla, con su motivo y su autor, y se puede restaurar.
-- Los datos sensibles se guardan tal como estaban en la fila (cifrados si la columna lo está).
-- Facturas, pagos y reembolsos no se borran nunca: el API no tiene rutas para ello.
-- Reversa: 2026-11-04-registros-eliminados.reversa.sql
CREATE TABLE IF NOT EXISTS registros_eliminados (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabla_origen varchar(63) NOT NULL,
  registro_id text NOT NULL,
  datos jsonb NOT NULL,
  motivo varchar(300),
  autor_id integer REFERENCES users(id) ON DELETE SET NULL,
  eliminado_en timestamptz NOT NULL DEFAULT now(),
  restaurado_en timestamptz,
  restaurado_por integer REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_registros_eliminados_origen ON registros_eliminados (tabla_origen, registro_id);
CREATE INDEX IF NOT EXISTS idx_registros_eliminados_autor_id ON registros_eliminados (autor_id);
CREATE INDEX IF NOT EXISTS idx_registros_eliminados_restaurado_por ON registros_eliminados (restaurado_por);
-- Sin políticas: cerrada al Data API; el API entra con un rol con BYPASSRLS.
ALTER TABLE registros_eliminados ENABLE ROW LEVEL SECURITY;
