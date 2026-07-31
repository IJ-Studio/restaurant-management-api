#!/bin/bash
# Prueba de reproducibilidad: aplica las migraciones de Drizzle, en orden,
# contra un Postgres 16 vacío (contenedor Docker local desechable). Confirma
# que el esquema versionado en src/database/drizzle/migrations/ reconstruye
# la base de datos completa desde cero, sin depender de que ya exista nada.
#
# Requiere Docker corriendo. No toca la base de datos real.
#
# USO: bash scripts/test-migrations-empty-db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../src/database/drizzle/migrations"
CONTAINER_NAME=ecbd_migration_test
DB_PASSWORD=test
DB_PORT=5433

echo "--- Removing any leftover container ---"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "--- Starting empty Postgres 16 container ---"
docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -p "$DB_PORT:5432" \
  postgres:16 >/dev/null

echo "--- Waiting for Postgres to accept connections ---"
until docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

echo "--- Enabling required extensions (uuid-ossp for uuid_generate_v4) ---"
docker exec "$CONTAINER_NAME" psql -U postgres -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

for f in "$MIGRATIONS_DIR"/*.sql; do
  name=$(basename "$f")
  echo "--- Applying $name ---"
  docker exec -i "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 < "$f"
  echo "$name applied OK."
done

echo "--- Tablas y vistas creadas ---"
docker exec "$CONTAINER_NAME" psql -U postgres -t -c \
  "select table_type, count(*) from information_schema.tables where table_schema='public' group by table_type;"

echo "--- Limpiando contenedor de prueba ---"
docker rm -f "$CONTAINER_NAME" >/dev/null

echo "--- OK: migraciones reproducen el esquema completo desde una base vacía ---"
