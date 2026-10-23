-- =====================================================================
-- Fase 3: inscripciones, progreso y acceso del alumno al contenido
-- Ejecutar una sola vez en Supabase > SQL Editor, después de la 0002.
-- =====================================================================

create type public.enrollment_source as enum ('free', 'manual', 'purchase', 'subscription');
create type public.enrollment_status as enum ('active', 'cancelled', 'expired');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.enrollments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  course_id         uuid not null references public.courses (id) on delete cascade,
  source            public.enrollment_source not null default 'free',
  status            public.enrollment_status not null default 'active',
  enrolled_at       timestamptz not null default now(),
  expires_at        timestamptz,
  -- Para el botón "Continuar donde lo dejé"
  last_lesson_id    uuid references public.lessons (id) on delete set null,
  last_accessed_at  timestamptz,
  unique (user_id, course_id)
);

create index enrollments_course_idx on public.enrollments (course_id);

create table public.lesson_progress (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

-- ---------------------------------------------------------------------
-- Funciones de acceso (security definer: se usan dentro de RLS)
-- ---------------------------------------------------------------------

-- Fecha en que el usuario actual puede ver un módulo (inscripción + días de
-- liberación). null si no está inscrito o la inscripción no está vigente.
create or replace function public.module_unlock_at(p_module_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select e.enrolled_at + make_interval(days => m.release_after_days)
  from public.modules m
  join public.courses c on c.id = m.course_id and c.status = 'published'
  join public.enrollments e on e.course_id = m.course_id
  where m.id = p_module_id
    and e.user_id = (select auth.uid())
    and e.status = 'active'
    and (e.expires_at is null or e.expires_at > now());
$$;

-- ¿El usuario actual puede ver el contenido de esta lección?
-- Admin, vista previa de curso publicado, o inscrito con el módulo liberado.
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id and c.status = 'published'
    where l.id = p_lesson_id
      and (
        l.is_preview
        or coalesce(public.module_unlock_at(m.id) <= now(), false)
      )
  );
$$;

-- ¿El usuario actual está inscrito (vigente) en el curso?
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = p_course_id
      and user_id = (select auth.uid())
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

-- Temario público de un curso publicado: títulos, tipos y duraciones, sin
-- el contenido. Para el usuario actual agrega si completó cada lección y
-- cuándo se libera cada módulo.
create or replace function public.course_outline(p_course_id uuid)
returns table (
  module_id uuid,
  module_title text,
  module_position integer,
  release_after_days integer,
  unlock_at timestamptz,
  lesson_id uuid,
  lesson_title text,
  lesson_type public.lesson_type,
  lesson_position integer,
  duration_seconds integer,
  is_preview boolean,
  completed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id, m.title, m.position, m.release_after_days,
    public.module_unlock_at(m.id),
    l.id, l.title, l.type, l.position, l.duration_seconds, l.is_preview,
    exists (
      select 1 from public.lesson_progress p
      where p.lesson_id = l.id and p.user_id = (select auth.uid())
    )
  from public.modules m
  join public.courses c on c.id = m.course_id
  left join public.lessons l on l.module_id = m.id
  where m.course_id = p_course_id
    and (c.status = 'published' or public.is_admin())
  order by m.position, l.position;
$$;

-- Nombre y foto del instructor de un curso publicado (los perfiles no son
-- públicos; esto expone solo esos dos datos).
create or replace function public.course_instructor(p_course_id uuid)
returns table (full_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name, p.avatar_url
  from public.courses c
  join public.profiles p on p.id = c.instructor_id
  where c.id = p_course_id and c.status = 'published';
$$;

-- Cursos del usuario actual con su progreso (panel "Mi aprendizaje").
create or replace function public.my_learning()
returns table (
  course_id uuid,
  title text,
  slug text,
  cover_path text,
  enrolled_at timestamptz,
  last_lesson_id uuid,
  last_accessed_at timestamptz,
  total_lessons bigint,
  completed_lessons bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.title, c.slug, c.cover_path, e.enrolled_at, e.last_lesson_id, e.last_accessed_at,
    (select count(*) from public.lessons l join public.modules m on m.id = l.module_id
      where m.course_id = c.id),
    (select count(*) from public.lesson_progress p
      join public.lessons l on l.id = p.lesson_id
      join public.modules m on m.id = l.module_id
      where m.course_id = c.id and p.user_id = e.user_id)
  from public.enrollments e
  join public.courses c on c.id = e.course_id and c.status = 'published'
  where e.user_id = (select auth.uid())
    and e.status = 'active'
    and (e.expires_at is null or e.expires_at > now())
  order by coalesce(e.last_accessed_at, e.enrolled_at) desc;
$$;

-- ¿El usuario actual puede descargar este archivo de material?
create or replace function public.can_download_file(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_attachments a
    where a.file_path = p_path and public.can_access_lesson(a.lesson_id)
  );
$$;

revoke execute on function public.module_unlock_at(uuid) from public;
revoke execute on function public.can_access_lesson(uuid) from public;
revoke execute on function public.is_enrolled(uuid) from public;
revoke execute on function public.course_outline(uuid) from public;
revoke execute on function public.course_instructor(uuid) from public;
revoke execute on function public.my_learning() from public;
revoke execute on function public.can_download_file(text) from public;
grant execute on function public.module_unlock_at(uuid) to anon, authenticated;
grant execute on function public.can_access_lesson(uuid) to anon, authenticated;
grant execute on function public.is_enrolled(uuid) to anon, authenticated;
grant execute on function public.course_outline(uuid) to anon, authenticated;
grant execute on function public.course_instructor(uuid) to anon, authenticated;
grant execute on function public.my_learning() to authenticated;
grant execute on function public.can_download_file(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS: inscripciones y progreso
-- ---------------------------------------------------------------------
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

create policy "enrollments: leer las propias o admin" on public.enrollments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- El alumno solo puede inscribirse a sí mismo, gratis, en un curso
-- publicado y gratuito. Las demás altas (manual, compra) las hace un admin.
create policy "enrollments: inscripción gratuita propia" on public.enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and source = 'free'
    and status = 'active'
    and expires_at is null
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published' and c.access_type = 'free'
    )
  );
create policy "enrollments: admin inserta" on public.enrollments
  for insert to authenticated with check ((select public.is_admin()));

-- El alumno solo actualiza "dónde quedó" (ver permisos por columna abajo).
create policy "enrollments: actualizar la propia o admin" on public.enrollments
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "enrollments: admin borra" on public.enrollments
  for delete to authenticated using ((select public.is_admin()));

create policy "lesson_progress: leer el propio o admin" on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "lesson_progress: marcar lección accesible" on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_access_lesson(lesson_id));
create policy "lesson_progress: desmarcar el propio" on public.lesson_progress
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Supabase puede dar permisos completos por defecto a anon/authenticated:
-- se quitan primero para que el permiso por columna de abajo sea el único.
revoke all on public.enrollments, public.lesson_progress from anon, authenticated;
grant select, insert, delete on public.enrollments to authenticated;
grant update (last_lesson_id, last_accessed_at) on public.enrollments to authenticated;
grant select, insert, delete on public.lesson_progress to authenticated;
grant all on public.enrollments, public.lesson_progress to service_role;

-- ---------------------------------------------------------------------
-- Acceso al contenido para alumnos inscritos (reemplaza las de la 0002)
-- ---------------------------------------------------------------------
drop policy "lessons: leer vista previa o admin" on public.lessons;
create policy "lessons: leer si tiene acceso" on public.lessons
  for select to anon, authenticated
  using (public.can_access_lesson(id));

drop policy "lesson_attachments: leer vista previa o admin" on public.lesson_attachments;
create policy "lesson_attachments: leer si tiene acceso a la lección" on public.lesson_attachments
  for select to anon, authenticated
  using (public.can_access_lesson(lesson_id));

-- PDF privados: el servidor genera enlaces firmados de corta duración en
-- nombre del alumno, así que necesita permiso de lectura sobre ese archivo.
drop policy "course-files: admin lee" on storage.objects;
create policy "course-files: leer si tiene acceso" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'course-files' and public.can_download_file(name));
