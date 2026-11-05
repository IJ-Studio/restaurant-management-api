-- Tipo de categoría de la carta (Prioridad 5.1: «Platos de la casa» solo con comida). Se rellena a
-- partir del nombre real de cada categoría existente (2026-11-05): las 9 de bebidas y el resto de
-- comida. Las categorías nuevas quedan en NULL hasta que el admin las clasifique.
-- Reversa: 2026-11-05-categorias-tipo.reversa.sql
alter table public.categorias_menu add column if not exists tipo varchar(10)
  check (tipo in ('comida', 'bebida'));
update public.categorias_menu set tipo = 'bebida'
  where id in (1, 2, 3, 4, 5, 6, 7, 8, 9) and tipo is null;
update public.categorias_menu set tipo = 'comida'
  where id between 10 and 25 and tipo is null;
