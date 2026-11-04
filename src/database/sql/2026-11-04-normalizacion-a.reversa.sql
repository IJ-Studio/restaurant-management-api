-- Reversa de 2026-11-04-normalizacion-a.sql: devuelve cada valor previo guardado.
do $$
declare r record;
begin
  for r in select distinct tabla, columna from respaldo_20261104.normalizacion_previa where parte = 'A' loop
    execute format('update public.%I t set %I = p.valor from respaldo_20261104.normalizacion_previa p
      where p.parte = ''A'' and p.tabla = %L and p.columna = %L and t.id::text = p.id', r.tabla, r.columna, r.tabla, r.columna);
  end loop;
  delete from respaldo_20261104.normalizacion_previa where parte = 'A';
end $$;
