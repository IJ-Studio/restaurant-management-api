-- Política acceso_roles_backend en las tablas creadas después de 2026-11-04-seguridad-rls.sql
-- (revisión del paquete del API). Sin ella, si el API entrara con un rol propio sin BYPASSRLS
-- (sgr_backend y demás), las bajas, el webhook de Stripe, los reportes y los tokens de la móvil
-- fallarían. anon y authenticated siguen sin acceso. Reversa: 2026-11-05-rls-tablas-nuevas.reversa.sql
do $$
declare t text;
begin
  foreach t in array array['registros_eliminados', 'stripe_events', 'reportes_problemas', 'device_tokens'] loop
    execute format('drop policy if exists acceso_roles_backend on public.%I', t);
    execute format('create policy acceso_roles_backend on public.%I for all to sgr_backend, sgr_migraciones, sgr_solo_lectura, sgr_cocina, sgr_punto_venta, admin_role, operator_role, readonly_role using (true) with check (true)', t);
  end loop;
end $$;
