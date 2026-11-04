-- Correo único sin distinguir mayúsculas (revisión del paquete). Compatible con el API desplegado:
-- si alguien se registra con un correo que solo difiere en mayúsculas, el alta falla con 23505 y
-- el API ya responde el mensaje genérico. También sirve al login, que compara lower(email).
-- Antes de aplicar: 0 duplicados de lower(email). Reversa: 2026-11-05-email-unico-minusculas.reversa.sql
create unique index if not exists users_email_lower_key on public.users (lower(email));
