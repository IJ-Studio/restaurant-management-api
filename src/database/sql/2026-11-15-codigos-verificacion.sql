-- Códigos de un solo uso (OTP) para áreas sensibles del personal (Fase 4.8). SOLO DISEÑO: el API aún
-- no la usa; aditiva y compatible. La aplica una persona cuando se active la función.
-- Diseño en docs/otp-personal.md. Reversa: 2026-11-15-codigos-verificacion.reversa.sql
create table if not exists public.codigos_verificacion (
  id bigint generated always as identity primary key,
  usuario_id integer not null references public.users (id) on delete cascade,
  -- Área que protege: 'nomina', 'personal', 'cortes', 'facturas', 'ajustes'.
  proposito text not null,
  -- Solo el hash (SHA-256 del código + pepper del servidor); el código nunca se guarda.
  codigo_hash text not null,
  intentos smallint not null default 0 check (intentos between 0 and 5),
  expira_en timestamptz not null,
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);

-- Validar: el último código vigente de esa persona y ese propósito.
create index if not exists idx_codigos_verificacion_vigente
  on public.codigos_verificacion (usuario_id, proposito, creado_en desc) where usado_en is null;

alter table public.codigos_verificacion enable row level security;
drop policy if exists acceso_roles_backend on public.codigos_verificacion;
create policy acceso_roles_backend on public.codigos_verificacion for all
  to sgr_backend, sgr_migraciones, sgr_solo_lectura, sgr_cocina, sgr_punto_venta, admin_role, operator_role, readonly_role
  using (true) with check (true);
