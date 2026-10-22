-- =====================================================================
-- Fase 1: perfiles de usuario, roles y seguridad (RLS)
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- =====================================================================

-- Roles y estados posibles de un usuario
create type public.user_role as enum ('superadmin', 'admin', 'instructor', 'student');
create type public.user_status as enum ('active', 'suspended');

-- Perfil público de cada usuario (1 a 1 con auth.users)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 500),
  role        public.user_role   not null default 'student',
  status      public.user_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------
-- Funciones auxiliares
-- security definer + search_path vacío: se ejecutan con permisos del
-- dueño y sin riesgo de que alguien "inyecte" otro esquema.
-- ---------------------------------------------------------------------

-- ¿El usuario actual es administrador (o superadministrador) activo?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'superadmin')
      and status = 'active'
  );
$$;

-- ¿El usuario actual es superadministrador activo?
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'superadmin'
      and status = 'active'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene updated_at al día
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Cada usuario ve su propio perfil; los administradores ven todos.
create policy "profiles: leer el propio o ser admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Cada usuario puede editar su propio perfil...
create policy "profiles: editar el propio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ...pero solo las columnas nombre y foto. El rol y el estado NO se pueden
-- cambiar desde el navegador: solo desde el servidor (clave secreta) o SQL.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- No hay políticas de insert ni delete: los perfiles los crea el trigger
-- y se borran en cascada al eliminar el usuario de auth.users.
