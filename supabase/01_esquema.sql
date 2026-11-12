-- =====================================================================
-- Inventario de Vinos — esquema para Supabase
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Perfiles (un registro por cada usuario de Auth) ----------
create table if not exists public.perfiles (
  id      uuid primary key references auth.users(id) on delete cascade,
  nombre  text not null default '',
  email   text not null default '',
  rol     text not null default 'vendedor' check (rol in ('admin','vendedor')),
  activo  boolean not null default true,
  creado  timestamptz not null default now()
);

-- El PRIMER usuario que se registre queda como admin; los demás como vendedor.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.perfiles) then 'vendedor' else 'admin' end
  );
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

create or replace function public.es_activo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo);
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol = 'admin');
$$;

-- ---------- Viñedos ----------
create table if not exists public.vinedos (
  id      bigint generated always as identity primary key,
  nombre  text not null unique,
  creado  timestamptz not null default now()
);

-- ---------- Productos ----------
create table if not exists public.productos (
  id          bigint generated always as identity primary key,
  vinedo_id   bigint not null references public.vinedos(id) on delete restrict,
  nombre      text not null,
  cantidad    integer not null default 0 check (cantidad >= 0),
  minimo      integer not null default 10 check (minimo >= 0),
  precio      numeric(10,2) not null default 0 check (precio >= 0),
  orden       integer,
  actualizado timestamptz not null default now(),
  unique (vinedo_id, nombre)
);

-- ---------- Movimientos (historial de entradas y salidas) ----------
create table if not exists public.movimientos (
  id              bigint generated always as identity primary key,
  producto_id     bigint references public.productos(id) on delete set null,
  producto_nombre text not null,
  vinedo_nombre   text not null,
  delta           integer not null,
  cantidad_final  integer not null,
  usuario_id      uuid references public.perfiles(id) on delete set null,
  usuario_nombre  text not null default '',
  creado          timestamptz not null default now()
);
create index if not exists movimientos_creado_idx on public.movimientos (creado desc);

-- ---------- Cambiar stock (lo usan admin y vendedores) ----------
-- Suma o resta y deja registro en el historial. Nunca baja de 0.
create or replace function public.ajustar_stock(p_producto bigint, p_delta integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_prod productos%rowtype;
  v_nueva integer;
  v_real integer;
begin
  if not public.es_activo() then raise exception 'Usuario sin permiso'; end if;
  select * into v_prod from productos where id = p_producto for update;
  if not found then raise exception 'Producto no existe'; end if;
  v_nueva := greatest(0, v_prod.cantidad + p_delta);
  v_real := v_nueva - v_prod.cantidad;
  if v_real = 0 then return v_nueva; end if;
  update productos set cantidad = v_nueva, actualizado = now() where id = p_producto;
  insert into movimientos (producto_id, producto_nombre, vinedo_nombre, delta, cantidad_final, usuario_id, usuario_nombre)
  select v_prod.id, v_prod.nombre, v.nombre, v_real, v_nueva, auth.uid(),
         coalesce((select nombre from perfiles where id = auth.uid()), '')
  from vinedos v where v.id = v_prod.vinedo_id;
  return v_nueva;
end $$;

-- Fijar una cantidad exacta (cuando se escribe el número)
create or replace function public.fijar_stock(p_producto bigint, p_cantidad integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_actual integer;
begin
  if not public.es_activo() then raise exception 'Usuario sin permiso'; end if;
  select cantidad into v_actual from productos where id = p_producto;
  if not found then raise exception 'Producto no existe'; end if;
  return public.ajustar_stock(p_producto, greatest(0, p_cantidad) - v_actual);
end $$;

revoke execute on function public.ajustar_stock(bigint, integer) from anon;
revoke execute on function public.fijar_stock(bigint, integer) from anon;

-- ---------- Seguridad por filas (RLS) ----------
alter table public.perfiles    enable row level security;
alter table public.vinedos     enable row level security;
alter table public.productos   enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_admin());
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists vinedos_ver on public.vinedos;
create policy vinedos_ver on public.vinedos for select to authenticated using (public.es_activo());
drop policy if exists vinedos_admin on public.vinedos;
create policy vinedos_admin on public.vinedos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists productos_ver on public.productos;
create policy productos_ver on public.productos for select to authenticated using (public.es_activo());
drop policy if exists productos_admin on public.productos;
create policy productos_admin on public.productos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists movimientos_ver on public.movimientos;
create policy movimientos_ver on public.movimientos for select to authenticated using (public.es_activo());
-- Los movimientos solo se crean desde ajustar_stock (no hay política de insert).

-- ---------- Tiempo real (cambios se ven al instante en todos los celulares) ----------
do $$ begin
  begin alter publication supabase_realtime add table public.productos;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.movimientos; exception when duplicate_object then null; end;
end $$;
