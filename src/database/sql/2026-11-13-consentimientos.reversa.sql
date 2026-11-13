-- Reversa de 2026-11-13-consentimientos.sql. Borra el registro de consentimientos: respaldar antes
-- (`create table respaldo.consentimientos as table public.consentimientos`) si ya tiene filas.
drop table if exists public.consentimientos;
