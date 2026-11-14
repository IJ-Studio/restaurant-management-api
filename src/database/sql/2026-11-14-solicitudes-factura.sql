-- Solicitudes de factura en cola (Fase 4.1): el cliente pide la factura al pagar y el administrador
-- la emite (Facturapi) o la rechaza con motivo. Aditiva y compatible con el API desplegado.
-- La aplica una persona. Reversa: 2026-11-14-solicitudes-factura.reversa.sql
create table if not exists public.solicitudes_factura (
  id bigint generated always as identity primary key,
  orden_id uuid not null unique references public.ordenes (id) on delete cascade,
  usuario_id integer not null references public.users (id) on delete cascade,
  -- Datos fiscales como los mandó el cliente (o el id de su perfil guardado).
  datos jsonb not null,
  estatus text not null default 'pendiente' check (estatus in ('pendiente', 'emitida', 'rechazada')),
  motivo text,
  factura_id uuid references public.facturas (id) on delete set null,
  atendida_por integer references public.users (id) on delete set null,
  atendida_en timestamptz,
  creado_en timestamptz not null default now()
);

-- La bandeja del administrador lista las pendientes por antigüedad; cubre también las claves foráneas.
create index if not exists idx_solicitudes_factura_estatus on public.solicitudes_factura (estatus, creado_en);
create index if not exists idx_solicitudes_factura_usuario on public.solicitudes_factura (usuario_id);
create index if not exists idx_solicitudes_factura_factura on public.solicitudes_factura (factura_id);
create index if not exists idx_solicitudes_factura_atendida_por on public.solicitudes_factura (atendida_por);

alter table public.solicitudes_factura enable row level security;
drop policy if exists acceso_roles_backend on public.solicitudes_factura;
create policy acceso_roles_backend on public.solicitudes_factura for all
  to sgr_backend, sgr_migraciones, sgr_solo_lectura, sgr_cocina, sgr_punto_venta, admin_role, operator_role, readonly_role
  using (true) with check (true);
