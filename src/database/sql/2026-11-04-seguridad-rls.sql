-- Alertas de seguridad de Supabase (2026-11-04).
-- 1) RLS en las tablas de public que no lo tenían: anon y authenticated (Data API) dejan de leer y escribir.
--    postgres y service_role tienen BYPASSRLS: el API (Drizzle y supabase-js con service_role) no cambia.
--    Los roles propios de mínimo privilegio (sgr_*, *_role) reciben una política que conserva su acceso;
--    lo que pueden hacer lo siguen limitando sus GRANT.
-- 2) Vistas con security_invoker. 3) search_path fijo en la función del disparador. 4) unaccent fuera de public.
-- Reversa: 2026-11-04-seguridad-rls.reversa.sql
begin;
do $$
declare t text;
begin
  foreach t in array array['alergenos','areas_salon','backups','categorias_estacion','categorias_gasto','categorias_ingrediente','categorias_menu','cierres_caja','clientes','combos','cupones','departamentos','direcciones_cliente','empleados','estaciones_cocina','estatus_mesa','facturas','grupos_modificadores','horarios','horarios_especiales','ingredientes','inventario_mermas','inventario_ordenes','inventario_productos','inventario_proveedor_producto','inventario_proveedores','logs_auditoria','menus_del_dia','menus_del_dia_items','mesas','metodos_pago','metodos_pago_guardados','modificadores','nomina','orden_items','ordenes','pagos','perfiles_facturacion','platillos','platillos_alergenos','platillos_modificadores','promociones','proveedores','proveedores_ingredientes','puestos','recetas','recetas_ingredientes','reembolsos','reservaciones','restaurante','roles','subcategorias_menu','system_settings','unidades_medida','users','variantes_platillo','ventas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists acceso_roles_backend on public.%I', t);
    execute format('create policy acceso_roles_backend on public.%I for all to sgr_backend, sgr_migraciones, sgr_solo_lectura, sgr_cocina, sgr_punto_venta, admin_role, operator_role, readonly_role using (true) with check (true)', t);
  end loop;
end $$;

alter view public.v_ordenes_detalle set (security_invoker = true);
alter view public.v_stock_ingredientes set (security_invoker = true);
alter view public.v_ventas_platillo set (security_invoker = true);
alter view public.v_ventas_por_dia set (security_invoker = true);
alter view public.v_usuarios_perfil set (security_invoker = true);

alter function public.fn_actualizar_timestamp() set search_path = '';

create schema if not exists extensions;
alter extension unaccent set schema extensions;
commit;
