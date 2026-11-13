-- Tokens de refresco: permiten renovar la sesión sin volver a escribir la contraseña cuando el
-- token de acceso caduca o el servidor se reinicia. Solo se guarda el hash SHA-256 del token.
-- Aditiva y compatible con el API desplegado: se aplica ANTES de desplegar el API que la usa
-- (sin ella el login sigue funcionando, pero sin refresco).
-- La aplica una persona; el API nunca ejecuta migraciones. Reversa: 2026-11-13-refresh-tokens.reversa.sql
create table if not exists public.refresh_tokens (
  id bigint generated always as identity primary key,
  user_id integer not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  -- Un token se usa una sola vez: al renovarse queda revocado y se emite otro.
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Cubre la clave foránea, la revocación de todos los tokens de un usuario y la limpieza.
create index if not exists idx_refresh_tokens_user on public.refresh_tokens (user_id);

alter table public.refresh_tokens enable row level security;
drop policy if exists acceso_roles_backend on public.refresh_tokens;
create policy acceso_roles_backend on public.refresh_tokens for all
  to sgr_backend, sgr_migraciones, sgr_solo_lectura, sgr_cocina, sgr_punto_venta, admin_role, operator_role, readonly_role
  using (true) with check (true);
