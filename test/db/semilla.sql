-- Datos sintéticos mínimos para la base local de pruebas (quijote_local). Nunca se aplica en producción.
-- Idempotente: se puede relanzar. Usuarios: <rol>@prueba.local, contraseña la que pases en -v clave_pruebas='…'.
-- baja@prueba.local es un mesero desechable para el flujo ARCO de Maestro (se elimina en la prueba).
-- Uso: psql -v ON_ERROR_STOP=1 -v clave_pruebas='…' -d quijote_local -f test/db/semilla.sql
begin;

insert into roles (id, name) values (1,'admin'),(2,'cajero'),(3,'mesero'),(4,'cocina'),(5,'cliente')
on conflict (id) do nothing;
select setval('roles_id_seq', 5);

insert into users (name, lastname, email, phone, password, verified, role_id)
select initcap(r), 'PRUEBA', r || '@prueba.local', '+5277100000' || n, extensions.crypt(:'clave_pruebas', extensions.gen_salt('bf', 10)), true, n
from (values ('admin',1),('cajero',2),('mesero',3),('cocina',4),('cliente',5),('baja',3)) v(r, n)
where not exists (select 1 from users u where u.email = v.r || '@prueba.local');

insert into restaurante (id) values (1) on conflict (id) do nothing;

insert into horarios (dia_semana, apertura, cierre, hora_cocina_cierre, cerrado)
select d, '08:00', '22:00', '21:30', false from generate_series(0, 6) d
where not exists (select 1 from horarios);

insert into areas_salon (id, nombre, capacidad) values (1,'SALÓN PRINCIPAL',40),(2,'TERRAZA',20)
on conflict (id) do nothing;
select setval('areas_salon_id_seq', 2);

insert into mesas (id, area_id, numero, nombre, capacidad) values
  (1,1,'A01','Mesa A01',2),(2,1,'A02','Mesa A02',4),(3,1,'A03','Mesa A03',4),
  (4,1,'A04','Mesa A04',6),(5,2,'B01','Mesa B01',4),(6,2,'B02','Mesa B02',8)
on conflict (id) do nothing;
select setval('mesas_id_seq', 6);
-- Mesas P01..P40 solo para las pruebas de carga de perf/ (cada usuario virtual usa una distinta).
insert into mesas (area_id, numero, nombre, capacidad)
select 2, 'P' || lpad(i::text, 2, '0'), 'Mesa de carga ' || i, 4 from generate_series(1, 40) i
where not exists (select 1 from mesas where numero = 'P01');
insert into estatus_mesa (mesa_id) select id from mesas m where not exists (select 1 from estatus_mesa e where e.mesa_id = m.id);

insert into categorias_menu (id, nombre, orden, tipo) values
  (1,'ENTRADAS',1,'comida'),(2,'PLATOS FUERTES',2,'comida'),(3,'BEBIDAS',3,'bebida')
on conflict (id) do nothing;
select setval('categorias_menu_id_seq', 3);

insert into platillos (id, categoria_id, nombre, descripcion, precio, disponible) values
  (1,1,'GUACAMOLE CON TOTOPOS','Aguacate, jitomate y cilantro',95,true),
  (2,1,'SOPA DE TORTILLA','Con aguacate, queso y crema',85,true),
  (3,2,'ENCHILADAS HUASTECAS','Cuatro piezas con cecina',165,true),
  (4,2,'ZACAHUIL','Porción con salsa de chile seco',140,true),
  (5,2,'ARRACHERA A LA PARRILLA','300 g con guarnición',245,true),
  (6,2,'MOLE DE OLLA','Platillo de temporada',150,false),
  (7,3,'AGUA DE JAMAICA','Vaso de 500 ml',35,true),
  (8,3,'CAFÉ DE OLLA','Taza',30,true)
on conflict (id) do nothing;
select setval('platillos_id_seq', (select max(id) from platillos));

insert into metodos_pago (id, nombre, tipo) values (1,'EFECTIVO','efectivo'),(2,'TARJETA','tarjeta'),(3,'TRANSFERENCIA','digital')
  -- Como producción: el webhook de Stripe registra el cobro con este método.
  ,(4,'Tarjeta en línea (Stripe)','online')
on conflict (id) do nothing;
update metodos_pago set aplica_propina = false where id = 4;
select setval('metodos_pago_id_seq', (select max(id) from metodos_pago));


-- El flujo ARCO de Maestro espera la cuenta desechable sin consentimientos (si una corrida falló a
-- medias, la cuenta sigue viva con el aviso ya aceptado).
delete from consentimientos where user_id in (select id from users where email = 'baja@prueba.local');

commit;

-- Pruebas de división, pagos y facturación (14-nov): precios que obligan a redondear centavos.
-- Sin id fijo: la carta importada ya ocupa los ids bajos.
insert into platillos (categoria_id, nombre, descripcion, precio, disponible)
select 1, v.nombre, v.descripcion, v.precio, true
from (values ('PRUEBA CENTAVOS','Total exacto de 100.01 para dividir entre 3',100.01),
             ('PRUEBA REFRESCO','Bebida de 25.50',25.50)) as v(nombre, descripcion, precio)
where not exists (select 1 from platillos p where p.nombre = v.nombre);
