-- Reversa de 2026-11-05-nomina-movimientos.sql (borra el historial: exportarlo antes).
drop table if exists public.nomina_movimientos;
drop function if exists public.fn_nomina_movimientos_inmutable();
drop function if exists public.fn_nomina_movimientos_correccion();
