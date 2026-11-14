-- Prepara una base vacía para cargar test/db/esquema.sql (estructura de la base de pruebas, sin datos).
-- Uso, con un usuario con permisos de superusuario en tu Postgres local (16 o más):
--   createdb quijote_local
--   psql -v ON_ERROR_STOP=1 -d quijote_local -f test/db/preparar.sql
--   psql -v ON_ERROR_STOP=1 -d quijote_local -f test/db/esquema.sql
--   psql -v ON_ERROR_STOP=1 -v clave_pruebas='…' -d quijote_local -f test/db/semilla.sql
drop schema if exists public cascade;
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
-- Roles que nombran las políticas RLS (sin login: solo para que el esquema cargue).
do $$
declare r text;
begin
  foreach r in array array['admin_role','operator_role','readonly_role','sgr_backend','sgr_cocina',
                           'sgr_migraciones','sgr_punto_venta','sgr_solo_lectura'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end $$;
