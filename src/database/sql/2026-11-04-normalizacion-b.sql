-- Normalización de datos existentes, parte B: MAYÚSCULAS en textos de negocio y correos en
-- minúsculas. NO APLICADA: la web y la móvil desplegadas muestran los textos tal cual, así que
-- se aplica solo cuando estén desplegados el API de fix/api-correcciones y los clientes con el
-- formato «Primera mayúscula». Teléfonos y códigos postales no cambian de caja.
-- Antes: comprobar que no hay correos duplicados al pasarlos a minúsculas (hoy, 0).
-- Reversa: 2026-11-04-normalizacion-b.reversa.sql
do $$
declare r record; nuevo text;
begin
  for r in select * from (values ('users','name'),('users','lastname'),('users','phone'),('users','email'),('clientes','notas'),('clientes','razon_social'),('clientes','rfc'),('clientes','ciudad'),('clientes','colonia'),('clientes','alergias'),('direcciones_cliente','alias'),('direcciones_cliente','linea1'),('direcciones_cliente','linea2'),('direcciones_cliente','colonia'),('direcciones_cliente','referencias'),('direcciones_cliente','ciudad'),('direcciones_cliente','estado'),('direcciones_cliente','codigo_postal'),('perfiles_facturacion','rfc'),('perfiles_facturacion','razon_social'),('perfiles_facturacion','email'),('reservaciones','cliente_nombre'),('reservaciones','cliente_telefono'),('reservaciones','cliente_email'),('reservaciones','notas'),('reservaciones','ocasion'),('reservaciones','peticiones_especiales'),('platillos','nombre'),('platillos','descripcion_corta'),('platillos','descripcion'),('empleados','nombre'),('puestos','nombre'),('departamentos','nombre'),('ordenes','notas_cliente'),('ordenes','notas_cocina'),('orden_items','notas'),('cierres_caja','notas'),('inventario_mermas','justification')) v(t, c) loop
    continue when r.c in ('phone', 'cliente_telefono', 'codigo_postal');
    nuevo := case when r.c like '%email%' then format('lower(%I)', r.c) else format('upper(%I)', r.c) end;
    execute format('insert into respaldo_20261104.normalizacion_previa (parte, tabla, columna, id, valor)
      select ''B'', %L, %L, id::text, %I from public.%I where %I <> %s', r.t, r.c, r.c, r.t, r.c, nuevo);
    execute format('update public.%I set %I = %s where %I <> %s', r.t, r.c, nuevo, r.c, nuevo);
  end loop;
end $$;
