-- Fase 5: separa los datos de prueba sin perderlos. Uso (psql):
--   psql "$URL" -v ON_ERROR_STOP=1 -v lote=AAAAMMDD-HHMM -f scripts/bd/limpiar-datos-prueba.sql
-- Reversa exacta: scripts/bd/revertir-datos-prueba.sql con el mismo lote.
-- Marcadores: cuentas con correo @prueba.local y mesas de carga (número P01…P40, perf/ del API).
-- - Pedidos de prueba (y sus partidas, pagos, facturas y solicitudes): se archivan en pruebas.archivo y se borran.
-- - Cuentas y mesas de prueba: se desactivan (no se borran) y su estado anterior queda archivado.
-- Nada sale del esquema: el archivo vive en `pruebas`, sin acceso del API (RLS sin políticas).
begin;
select set_config('quijote.lote', :'lote', true);
create schema if not exists pruebas;
create table if not exists pruebas.archivo (
  lote text not null,
  tabla text not null,
  fila jsonb not null,
  archivado_en timestamptz not null default now()
);
alter table pruebas.archivo enable row level security;
create index if not exists archivo_lote_tabla on pruebas.archivo (lote, tabla);
do $$ begin
  if exists (select 1 from pruebas.archivo where lote = current_setting('quijote.lote')) then
    raise exception 'El lote % ya existe', current_setting('quijote.lote');
  end if;
end $$;

create temp table usuarios_prueba on commit drop as
  select id from users where email ilike '%@prueba.local';
create temp table mesas_prueba on commit drop as
  select id from mesas where numero ~ '^P[0-9]+$';
create temp table ordenes_prueba on commit drop as
  select id from ordenes
  where mesa_id in (select id from mesas_prueba)
     or atendido_por in (select id from usuarios_prueba)
     or cliente_id in (select id from clientes where user_id in (select id from usuarios_prueba));

-- Archivo (filas completas en JSON).
insert into pruebas.archivo (lote, tabla, fila)
select :'lote', 'orden_items', to_jsonb(t) from orden_items t where orden_id in (select id from ordenes_prueba)
union all select :'lote', 'pagos', to_jsonb(t) from pagos t where orden_id in (select id from ordenes_prueba)
union all select :'lote', 'facturas', to_jsonb(t) from facturas t where orden_id in (select id from ordenes_prueba)
union all select :'lote', 'solicitudes_factura', to_jsonb(t) from solicitudes_factura t where orden_id in (select id from ordenes_prueba)
union all select :'lote', 'estatus_mesa', to_jsonb(t) from estatus_mesa t where orden_id in (select id from ordenes_prueba)
union all select :'lote', 'ordenes', to_jsonb(t) from ordenes t where id in (select id from ordenes_prueba)
union all select :'lote', 'users', to_jsonb(t) from users t where id in (select id from usuarios_prueba)
union all select :'lote', 'mesas', to_jsonb(t) from mesas t where id in (select id from mesas_prueba);

-- Borrado de pedidos (hijos primero: pagos y facturas no tienen ON DELETE CASCADE).
delete from pagos where orden_id in (select id from ordenes_prueba);
delete from facturas where orden_id in (select id from ordenes_prueba);
delete from solicitudes_factura where orden_id in (select id from ordenes_prueba);
delete from orden_items where orden_id in (select id from ordenes_prueba);
update estatus_mesa set orden_id = null where orden_id in (select id from ordenes_prueba);
delete from ordenes where id in (select id from ordenes_prueba);

-- Cuentas y mesas: solo se desactivan.
update users set is_active = false where id in (select id from usuarios_prueba);
update mesas set activa = false where id in (select id from mesas_prueba);

select tabla, count(*) as archivadas from pruebas.archivo where lote = :'lote' group by tabla order by tabla;
commit;
