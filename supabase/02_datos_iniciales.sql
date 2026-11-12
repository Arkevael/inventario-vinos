-- =====================================================================
-- Datos iniciales: Viñedo Paraíso (lista de stock) y Viña San Pedro
-- (cotización N° 45997, precios sin IGV). Ejecutar DESPUÉS de 01_esquema.sql.
-- Se puede correr más de una vez: no duplica productos.
-- =====================================================================
insert into public.vinedos (nombre) values ('Viñedo Paraíso'), ('Viña San Pedro')
on conflict (nombre) do nothing;

insert into public.productos (vinedo_id, nombre, cantidad, precio, orden)
select (select id from public.vinedos where nombre = 'Viñedo Paraíso'), x.nombre, x.cantidad, x.precio, x.orden
from (values
  ('Caja Borgoña x 12 bot marrón', 250, 55, 1),
  ('Caja Mistela x 12 bot marrón', 200, 55, 2),
  ('Caja Borgoña 4x4', 100, 66, 3),
  ('Caja Mistela 4x4', 100, 66, 4),
  ('Pavona Borgoña x 5 lt', 100, 29, 5),
  ('Pavona Mistela x 5 lt', 100, 29, 6),
  ('Espumante', 100, 85, 7),
  ('Borgoña 9x2', 150, 88, 8),
  ('Mistela 9x2', 150, 88, 9),
  ('Caja P.A. x 12 bot', 60, 80, 10),
  ('Caja Higo x 12 bot marrón', 60, 70, 11),
  ('Caja Durazno x 12 bot marrón', 20, 55, 12),
  ('Caja Rosé x 12 bot marrón', 20, 55, 13),
  ('Caja Maracuyá x 12 bot', 10, 80, 14),
  ('Caja Borgoña x 12 bot caja blanca', 100, 65, 15),
  ('Caja blanca Mistela x 12 bot', 40, 65, 16),
  ('Caja Pack', 40, 85, 17),
  ('Caja Borgoña Galoncito', 100, 52, 18),
  ('Caja Vargas x 12 bot vestido', 40, 80, 19),
  ('Caja Borgoña x 12 bot vestida', 20, 77, 20),
  ('Caja Borgoña 6 x 1.5 vestido', 50, 77, 21),
  ('Caja Mistela 6 x 1.5 vestido', 20, 77, 22),
  ('Caja Borgoña 4x4 vestido', 30, 77, 23),
  ('Caja Mistela 4x4 vestido', 20, 77, 24),
  ('Caja Borgoña 9x2 vestido', 20, 108, 25),
  ('Caja Mistela 9x2 vestido', 20, 108, 26),
  ('Pavona Borgoña vestida', 40, 34, 27),
  ('Pavona Mistela x 5 lt vestido', 20, 34, 28),
  ('Caja BB Borgoña', 4, 85, 29),
  ('Caja x 12 bot muestra', 52, 0, 30)
) as x(nombre, cantidad, precio, orden)
on conflict (vinedo_id, nombre) do nothing;

insert into public.productos (vinedo_id, nombre, cantidad, precio, orden)
select (select id from public.vinedos where nombre = 'Viña San Pedro'), x.nombre, x.cantidad, x.precio, x.orden
from (values
  ('Sol de América Mistela 750 ml x 12 bot verde', 150, 55, 1),
  ('Sol de América Borgoña 1.5 L x 6 bot (orejita)', 80, 66, 2),
  ('Sol de América Borgoña 1.5 L x 6 bot vestida (orejita)', 60, 78, 3),
  ('Sol de América Mistela 1.5 L x 6 bot (orejita)', 50, 66, 4),
  ('Sol de América Mistela 1.5 L x 6 bot vestida (orejita)', 30, 78, 5),
  ('Sol de América Mistela 2.0 L x 9 bot (pavita)', 40, 90, 6),
  ('Sol de América Mistela 2.0 L x 9 bot vestida (pavita)', 20, 105, 7),
  ('Sol de América Borgoña 4.0 L x 4 bot vestida (dama juana)', 60, 77, 8),
  ('Sol de América Mistela 4.0 L x 4 bot (dama juana)', 40, 67, 9),
  ('Sol de América Mistela 4.0 L x 4 bot vestida (dama juana)', 60, 77, 10),
  ('Sol de América Borgoña 750 ml x 12 bot verde', 80, 55, 11),
  ('Sol de América Borgoña 4.0 L x 4 bot (dama juana)', 50, 67, 12)
) as x(nombre, cantidad, precio, orden)
on conflict (vinedo_id, nombre) do nothing;
