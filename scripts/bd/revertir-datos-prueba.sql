-- Reversa de limpiar-datos-prueba.sql para un lote:
--   psql "$URL" -v ON_ERROR_STOP=1 -v lote=AAAAMMDD-HHMM -f scripts/bd/revertir-datos-prueba.sql
-- Reinserta los pedidos con sus ids (padres primero), restaura el estado de cuentas y mesas y
-- borra el lote del archivo. Falla sin cambiar nada si algún id ya está ocupado.
begin;
insert into ordenes overriding system value select (jsonb_populate_record(null::ordenes, fila)).* from pruebas.archivo where lote = :'lote' and tabla = 'ordenes';
insert into orden_items overriding system value select (jsonb_populate_record(null::orden_items, fila)).* from pruebas.archivo where lote = :'lote' and tabla = 'orden_items';
insert into pagos overriding system value select (jsonb_populate_record(null::pagos, fila)).* from pruebas.archivo where lote = :'lote' and tabla = 'pagos';
insert into facturas overriding system value select (jsonb_populate_record(null::facturas, fila)).* from pruebas.archivo where lote = :'lote' and tabla = 'facturas';
insert into solicitudes_factura overriding system value select (jsonb_populate_record(null::solicitudes_factura, fila)).* from pruebas.archivo where lote = :'lote' and tabla = 'solicitudes_factura';
update estatus_mesa e set orden_id = (a.fila->>'orden_id')::uuid
  from pruebas.archivo a where a.lote = :'lote' and a.tabla = 'estatus_mesa' and (a.fila->>'id')::int = e.id;
update users u set is_active = (a.fila->>'is_active')::boolean
  from pruebas.archivo a where a.lote = :'lote' and a.tabla = 'users' and (a.fila->>'id')::int = u.id;
update mesas m set activa = (a.fila->>'activa')::boolean
  from pruebas.archivo a where a.lote = :'lote' and a.tabla = 'mesas' and (a.fila->>'id')::int = m.id;
delete from pruebas.archivo where lote = :'lote';
commit;
