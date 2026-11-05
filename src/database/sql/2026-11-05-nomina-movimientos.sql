-- Sumas y restas a la nómina del personal (Prioridad 3.1). Historial inmutable: no se edita ni se
-- borra; una corrección es un movimiento inverso (mismo empleado y monto, tipo contrario) que
-- apunta al que corrige. Solo controla la nómina: no ejecuta pagos.
-- Reversa: 2026-11-05-nomina-movimientos.reversa.sql
create table if not exists public.nomina_movimientos (
  id bigint generated always as identity primary key,
  empleado_id uuid not null references public.empleados(id),
  tipo varchar(5) not null check (tipo in ('suma', 'resta')),
  concepto varchar(30) not null check (concepto in (
    'bono', 'horas_extra', 'propina', 'reembolso', 'objeto_roto', 'danio', 'reparacion',
    'consumo', 'anticipo', 'faltante_caja', 'otro', 'correccion')),
  monto numeric(10, 2) not null check (monto > 0),
  periodo_inicio date not null,
  periodo_fin date not null,
  fecha date not null default current_date,
  justificacion text not null check (char_length(btrim(justificacion)) >= 5),
  autor_id integer not null references public.users(id),
  corrige_id bigint unique references public.nomina_movimientos(id),
  creado_en timestamptz not null default now(),
  check (periodo_fin >= periodo_inicio)
);
create index if not exists idx_nomina_movimientos_empleado on public.nomina_movimientos (empleado_id, periodo_inicio);
create index if not exists idx_nomina_movimientos_autor_id on public.nomina_movimientos (autor_id);

create or replace function public.fn_nomina_movimientos_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'El historial de nómina no se edita ni se borra: registra un movimiento inverso.'
    using errcode = 'P0001';
end $$;

create or replace function public.fn_nomina_movimientos_correccion() returns trigger
language plpgsql set search_path = '' as $$
declare original public.nomina_movimientos;
begin
  if new.corrige_id is null then return new; end if;
  select * into original from public.nomina_movimientos where id = new.corrige_id;
  if original.empleado_id <> new.empleado_id or original.monto <> new.monto or original.tipo = new.tipo
     or original.corrige_id is not null then
    raise exception 'Una corrección debe ser el movimiento inverso exacto de un movimiento original.'
      using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_nomina_movimientos_inmutable on public.nomina_movimientos;
create trigger trg_nomina_movimientos_inmutable before update or delete on public.nomina_movimientos
  for each row execute function public.fn_nomina_movimientos_inmutable();
drop trigger if exists trg_nomina_movimientos_correccion on public.nomina_movimientos;
create trigger trg_nomina_movimientos_correccion before insert on public.nomina_movimientos
  for each row execute function public.fn_nomina_movimientos_correccion();

revoke execute on function public.fn_nomina_movimientos_inmutable() from public, anon, authenticated;
revoke execute on function public.fn_nomina_movimientos_correccion() from public, anon, authenticated;

alter table public.nomina_movimientos enable row level security;
drop policy if exists acceso_roles_backend on public.nomina_movimientos;
create policy acceso_roles_backend on public.nomina_movimientos for all
  to sgr_backend, sgr_migraciones, sgr_solo_lectura, admin_role, operator_role, readonly_role
  using (true) with check (true);
