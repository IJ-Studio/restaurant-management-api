-- Reversa de 2026-11-05-motivo-cancelacion.sql (borra los motivos guardados: exportarlos antes).
alter table public.ordenes drop column if exists motivo_cancelacion, drop column if exists cancelado_por, drop column if exists cancelado_en;
alter table public.reservaciones drop column if exists motivo_cancelacion, drop column if exists cancelado_por, drop column if exists cancelado_en;
