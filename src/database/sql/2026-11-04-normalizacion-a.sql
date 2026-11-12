-- Normalización de datos existentes, parte A (compatible con el API y la web desplegados):
-- recorta, junta espacios y tabuladores repetidos y deja NULL los vacíos (solo en columnas que
-- admiten NULL). No toca facturas, pagos ni reembolsos. Guarda cada valor previo en
-- respaldo_20261104.normalizacion_previa. Reversa: 2026-11-04-normalizacion-a.reversa.sql
create table if not exists respaldo_20261104.normalizacion_previa (
  parte text not null, tabla text not null, columna text not null, id text not null, valor text,
  tomado_en timestamptz not null default now()
);
alter table respaldo_20261104.normalizacion_previa enable row level security;
do $$
declare r record; nuevo text; nulo boolean;
begin
  for r in select * from (values ('users','name'),('users','lastname'),('users','phone'),('users','email'),('clientes','notas'),('clientes','razon_social'),('clientes','rfc'),('clientes','ciudad'),('clientes','colonia'),('clientes','alergias'),('direcciones_cliente','alias'),('direcciones_cliente','linea1'),('direcciones_cliente','linea2'),('direcciones_cliente','colonia'),('direcciones_cliente','referencias'),('direcciones_cliente','ciudad'),('direcciones_cliente','estado'),('direcciones_cliente','codigo_postal'),('perfiles_facturacion','rfc'),('perfiles_facturacion','razon_social'),('perfiles_facturacion','email'),('reservaciones','cliente_nombre'),('reservaciones','cliente_telefono'),('reservaciones','cliente_email'),('reservaciones','notas'),('reservaciones','ocasion'),('reservaciones','peticiones_especiales'),('platillos','nombre'),('platillos','descripcion_corta'),('platillos','descripcion'),('empleados','nombre'),('puestos','nombre'),('departamentos','nombre'),('ordenes','notas_cliente'),('ordenes','notas_cocina'),('orden_items','notas'),('cierres_caja','notas'),('inventario_mermas','justification')) v(t, c) loop
    select is_nullable = 'YES' into nulo from information_schema.columns
      where table_schema = 'public' and table_name = r.t and column_name = r.c;
    nuevo := case when nulo
      then format('nullif(btrim(regexp_replace(%I, ''[ \t]+'', '' '', ''g'')), '''')', r.c)
      else format('btrim(regexp_replace(%I, ''[ \t]+'', '' '', ''g''))', r.c) end;
    execute format('insert into respaldo_20261104.normalizacion_previa (parte, tabla, columna, id, valor)
      select ''A'', %L, %L, id::text, %I from public.%I where %I is distinct from %s', r.t, r.c, r.c, r.t, r.c, nuevo);
    execute format('update public.%I set %I = %s where %I is distinct from %s', r.t, r.c, nuevo, r.c, nuevo);
  end loop;
end $$;
