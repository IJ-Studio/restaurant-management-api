-- Teléfonos existentes a E.164 (NP-06), igual que la normalización del API: 10 dígitos → +52…,
-- 52 + 10 dígitos → +52…, con «+» y 10 a 15 dígitos → sin separadores. Lo que no encaja se deja
-- igual (va a la lista de datos faltantes). Compatible con el API desplegado (PATCH /users/:id ya
-- exige E.164). Guarda los valores previos (parte 'T'). Reversa: 2026-11-05-telefonos-e164.reversa.sql
do $$
declare r record; nuevo text; expr text;
begin
  nuevo := $f$case
    when %1$I ~ '^\+\d{10,15}$' then %1$I
    when %1$I like '+%%' and length(regexp_replace(%1$I, '\D', '', 'g')) between 10 and 15 then '+' || regexp_replace(%1$I, '\D', '', 'g')
    when length(regexp_replace(%1$I, '\D', '', 'g')) = 10 then '+52' || regexp_replace(%1$I, '\D', '', 'g')
    when length(regexp_replace(%1$I, '\D', '', 'g')) = 12 and regexp_replace(%1$I, '\D', '', 'g') like '52%%' then '+' || regexp_replace(%1$I, '\D', '', 'g')
    else %1$I end$f$;
  for r in select * from (values ('users', 'phone'), ('reservaciones', 'cliente_telefono')) v(t, c) loop
    expr := format(nuevo, r.c);
    execute format('insert into respaldo_20261104.normalizacion_previa (parte, tabla, columna, id, valor)
      select ''T'', %L, %L, id::text, %I from public.%I where %I is distinct from (%s)', r.t, r.c, r.c, r.t, r.c, expr);
    execute format('update public.%I set %I = (%s) where %I is distinct from (%s)', r.t, r.c, expr, r.c, expr);
  end loop;
end $$;
