-- Registro de consentimientos y preferencias de privacidad (derechos ARCO: oposición).
-- Bitácora de solo inserción: el estado vigente de cada tipo es su fila más reciente.
-- Aditiva y compatible con el API desplegado: se aplica ANTES de desplegar el API que la usa.
-- La aplica una persona; el API nunca ejecuta migraciones. Reversa: 2026-11-13-consentimientos.reversa.sql
create table if not exists public.consentimientos (
  id bigint generated always as identity primary key,
  user_id integer not null references public.users (id) on delete cascade,
  tipo text not null check (tipo in ('aviso_privacidad', 'notificaciones_push', 'reportes_errores')),
  otorgado boolean not null,
  -- Versión del aviso de privacidad aceptado; nula en las preferencias.
  version text,
  origen text not null check (origen in ('movil', 'web')),
  creado_en timestamptz not null default now()
);

-- Cubre la clave foránea y la consulta del estado vigente (última fila por usuario y tipo).
create index if not exists idx_consentimientos_user_tipo
  on public.consentimientos (user_id, tipo, creado_en desc);

alter table public.consentimientos enable row level security;
drop policy if exists acceso_roles_backend on public.consentimientos;
create policy acceso_roles_backend on public.consentimientos for all
  to sgr_backend, sgr_migraciones, sgr_solo_lectura, sgr_cocina, sgr_punto_venta, admin_role, operator_role, readonly_role
  using (true) with check (true);
