-- Quién registró cada merma, por id (Prioridad 1.2). Antes solo quedaba el nombre en reported_by,
-- que puede cambiar. Aditiva y nula: las mermas antiguas conservan su nombre y quedan sin id.
-- Reversa: 2026-11-05-mermas-autor.reversa.sql
alter table public.inventario_mermas
  add column if not exists reportado_por_id integer references public.users(id) on delete set null;
create index if not exists idx_inventario_mermas_reportado_por_id on public.inventario_mermas (reportado_por_id);
