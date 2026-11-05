-- Reversa de 2026-11-05-rls-tablas-nuevas.sql
do $$
declare t text;
begin
  foreach t in array array['registros_eliminados', 'stripe_events', 'reportes_problemas', 'device_tokens'] loop
    execute format('drop policy if exists acceso_roles_backend on public.%I', t);
  end loop;
end $$;
