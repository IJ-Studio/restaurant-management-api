-- Motivo de cancelación obligatorio (Prioridad 3.3): quién canceló, cuándo y por qué, en pedidos y
-- reservas. Aditiva: columnas nulas (las cancelaciones antiguas no tienen motivo y no se inventa).
-- Reversa: 2026-11-05-motivo-cancelacion.reversa.sql
alter table public.ordenes
  add column if not exists motivo_cancelacion varchar(300),
  add column if not exists cancelado_por integer references public.users(id) on delete set null,
  add column if not exists cancelado_en timestamptz;
alter table public.reservaciones
  add column if not exists motivo_cancelacion varchar(300),
  add column if not exists cancelado_por integer references public.users(id) on delete set null,
  add column if not exists cancelado_en timestamptz;
create index if not exists idx_ordenes_cancelado_por on public.ordenes (cancelado_por);
create index if not exists idx_reservaciones_cancelado_por on public.reservaciones (cancelado_por);
