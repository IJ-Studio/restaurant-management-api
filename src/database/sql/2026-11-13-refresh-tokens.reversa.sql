-- Reversa de 2026-11-13-refresh-tokens.sql. Al borrarla, las sesiones abiertas dejan de renovarse
-- y cada persona vuelve a iniciar sesión cuando caduque su token de acceso.
drop table if exists public.refresh_tokens;
