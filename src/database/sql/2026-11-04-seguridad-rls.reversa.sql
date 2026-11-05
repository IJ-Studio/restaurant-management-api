-- Reversa de 2026-11-04-seguridad-rls.sql
begin;
do $$
declare t text;
begin
  foreach t in array array['alergenos','areas_salon','backups','categorias_estacion','categorias_gasto','categorias_ingrediente','categorias_menu','cierres_caja','clientes','combos','cupones','departamentos','direcciones_cliente','empleados','estaciones_cocina','estatus_mesa','facturas','grupos_modificadores','horarios','horarios_especiales','ingredientes','inventario_mermas','inventario_ordenes','inventario_productos','inventario_proveedor_producto','inventario_proveedores','logs_auditoria','menus_del_dia','menus_del_dia_items','mesas','metodos_pago','metodos_pago_guardados','modificadores','nomina','orden_items','ordenes','pagos','perfiles_facturacion','platillos','platillos_alergenos','platillos_modificadores','promociones','proveedores','proveedores_ingredientes','puestos','recetas','recetas_ingredientes','reembolsos','reservaciones','restaurante','roles','subcategorias_menu','system_settings','unidades_medida','users','variantes_platillo','ventas'] loop
    execute format('drop policy if exists acceso_roles_backend on public.%I', t);
    execute format('alter table public.%I disable row level security', t);
  end loop;
end $$;

alter view public.v_ordenes_detalle reset (security_invoker);
alter view public.v_stock_ingredientes reset (security_invoker);
alter view public.v_ventas_platillo reset (security_invoker);
alter view public.v_ventas_por_dia reset (security_invoker);
alter view public.v_usuarios_perfil reset (security_invoker);

alter function public.fn_actualizar_timestamp() reset search_path;

alter extension unaccent set schema public;
commit;
