-- =====================================================================
-- Fase 2: cursos, módulos, lecciones, adjuntos y archivos (Storage)
-- Ejecutar una sola vez en Supabase > SQL Editor, después de la 0001.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.course_level as enum ('all', 'beginner', 'intermediate', 'advanced');
-- En la fase 1 solo se usa 'free' (gratuito con registro).
create type public.course_access as enum ('free', 'paid', 'membership', 'invite');
-- 'quiz' se usa a partir de la fase 5.
create type public.lesson_type as enum ('video', 'text', 'pdf', 'mixed', 'quiz');
create type public.video_provider as enum ('vimeo', 'youtube');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at  timestamptz not null default now()
);

create table public.courses (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (char_length(title) between 1 and 160),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description    text not null default '' check (char_length(short_description) <= 300),
  description          text not null default '' check (char_length(description) <= 50000),
  cover_path           text check (cover_path is null or char_length(cover_path) <= 300),
  intro_video_url      text check (intro_video_url is null or char_length(intro_video_url) <= 500),
  intro_video_provider public.video_provider,
  category_id          uuid references public.categories (id) on delete set null,
  level                public.course_level not null default 'all',
  language             text not null default 'es' check (char_length(language) <= 10),
  instructor_id        uuid references public.profiles (id) on delete set null,
  requirements         text[] not null default '{}',
  learning_objectives  text[] not null default '{}',
  faqs                 jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  access_type          public.course_access not null default 'free',
  price_cents          integer check (price_cents is null or price_cents >= 0),
  currency             text not null default 'USD' check (char_length(currency) = 3),
  status               public.course_status not null default 'draft',
  published_at         timestamptz,
  created_by           uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index courses_status_idx on public.courses (status);
create index courses_category_idx on public.courses (category_id);

create table public.modules (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references public.courses (id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 160),
  position            integer not null default 0,
  -- Liberación programada (drip): días después de la inscripción. 0 = inmediato.
  release_after_days  integer not null default 0 check (release_after_days between 0 and 3650),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index modules_course_idx on public.modules (course_id, position);

create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references public.modules (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 160),
  type              public.lesson_type not null default 'video',
  video_url         text check (video_url is null or char_length(video_url) <= 500),
  video_provider    public.video_provider,
  duration_seconds  integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  content           text not null default '' check (char_length(content) <= 100000),
  is_preview        boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index lessons_module_idx on public.lessons (module_id, position);

create table public.lesson_attachments (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  file_path   text not null check (char_length(file_path) <= 300),
  file_name   text not null check (char_length(file_name) between 1 and 200),
  size_bytes  bigint not null default 0 check (size_bytes >= 0),
  mime_type   text not null default 'application/pdf',
  created_at  timestamptz not null default now()
);

create index lesson_attachments_lesson_idx on public.lesson_attachments (lesson_id);

-- updated_at automático (la función se creó en la 0001)
create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger modules_set_updated_at before update on public.modules
  for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------

-- ¿El curso está publicado? (security definer para usarla dentro de RLS
-- sin depender de los permisos de quien consulta)
create or replace function public.is_course_published(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses where id = p_course_id and status = 'published'
  );
$$;

-- Duplica un curso completo (módulos, lecciones y adjuntos) como borrador.
-- security invoker: corre con los permisos de quien la llama, así que RLS
-- exige que sea administrador.
create or replace function public.duplicate_course(p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_course uuid;
  v_module record;
  v_new_module uuid;
  v_lesson record;
  v_new_lesson uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.courses (
    title, slug, short_description, description, cover_path, intro_video_url,
    intro_video_provider, category_id, level, language, instructor_id, requirements,
    learning_objectives, faqs, access_type, price_cents, currency, status
  )
  select
    left(title || ' (copia)', 160),
    left(slug, 140) || '-copia-' || substr(md5(random()::text), 1, 6),
    short_description, description, cover_path, intro_video_url,
    intro_video_provider, category_id, level, language, instructor_id, requirements,
    learning_objectives, faqs, access_type, price_cents, currency, 'draft'
  from public.courses
  where id = p_course_id
  returning id into v_new_course;

  if v_new_course is null then
    raise exception 'Curso no encontrado' using errcode = 'P0002';
  end if;

  for v_module in
    select * from public.modules where course_id = p_course_id order by position
  loop
    insert into public.modules (course_id, title, position, release_after_days)
    values (v_new_course, v_module.title, v_module.position, v_module.release_after_days)
    returning id into v_new_module;

    for v_lesson in
      select * from public.lessons where module_id = v_module.id order by position
    loop
      insert into public.lessons (
        module_id, title, type, video_url, video_provider, duration_seconds,
        content, is_preview, position
      )
      values (
        v_new_module, v_lesson.title, v_lesson.type, v_lesson.video_url,
        v_lesson.video_provider, v_lesson.duration_seconds, v_lesson.content,
        v_lesson.is_preview, v_lesson.position
      )
      returning id into v_new_lesson;

      -- Los archivos se comparten: el registro apunta al mismo PDF.
      insert into public.lesson_attachments (lesson_id, file_path, file_name, size_bytes, mime_type)
      select v_new_lesson, file_path, file_name, size_bytes, mime_type
      from public.lesson_attachments
      where lesson_id = v_lesson.id;
    end loop;
  end loop;

  return v_new_course;
end;
$$;

-- Las políticas de lectura pública llaman a is_admin(): los visitantes
-- también deben poder ejecutarla (para ellos siempre devuelve false).
grant execute on function public.is_admin() to anon;

revoke execute on function public.is_course_published(uuid) from public;
grant execute on function public.is_course_published(uuid) to anon, authenticated;
revoke execute on function public.duplicate_course(uuid) from public, anon;
grant execute on function public.duplicate_course(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_attachments enable row level security;

-- Categorías: todos leen, solo administradores escriben.
create policy "categories: leer" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admin inserta" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "categories: admin edita" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categories: admin borra" on public.categories
  for delete to authenticated using ((select public.is_admin()));

-- Cursos: publicados visibles para todos; borradores y archivados solo admin.
create policy "courses: leer publicados o admin" on public.courses
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "courses: admin inserta" on public.courses
  for insert to authenticated with check ((select public.is_admin()));
create policy "courses: admin edita" on public.courses
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "courses: admin borra" on public.courses
  for delete to authenticated using ((select public.is_admin()));

-- Módulos: visibles si el curso está publicado (temario público).
create policy "modules: leer si curso publicado o admin" on public.modules
  for select to anon, authenticated
  using (public.is_course_published(course_id) or (select public.is_admin()));
create policy "modules: admin inserta" on public.modules
  for insert to authenticated with check ((select public.is_admin()));
create policy "modules: admin edita" on public.modules
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "modules: admin borra" on public.modules
  for delete to authenticated using ((select public.is_admin()));

-- Lecciones: el contenido solo lo ven administradores y, si es vista previa
-- de un curso publicado, cualquiera. (En la fase 3 se suman los inscritos.)
create policy "lessons: leer vista previa o admin" on public.lessons
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or (
      is_preview
      and exists (
        select 1 from public.modules m
        where m.id = module_id and public.is_course_published(m.course_id)
      )
    )
  );
create policy "lessons: admin inserta" on public.lessons
  for insert to authenticated with check ((select public.is_admin()));
create policy "lessons: admin edita" on public.lessons
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "lessons: admin borra" on public.lessons
  for delete to authenticated using ((select public.is_admin()));

-- Adjuntos: mismas reglas que la lección a la que pertenecen.
create policy "lesson_attachments: leer vista previa o admin" on public.lesson_attachments
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_id and l.is_preview and public.is_course_published(m.course_id)
    )
  );
create policy "lesson_attachments: admin inserta" on public.lesson_attachments
  for insert to authenticated with check ((select public.is_admin()));
create policy "lesson_attachments: admin borra" on public.lesson_attachments
  for delete to authenticated using ((select public.is_admin()));

-- Permisos explícitos (no dependemos de "Automatically expose new tables").
grant select on public.categories, public.courses, public.modules, public.lessons,
  public.lesson_attachments to anon, authenticated;
grant insert, update, delete on public.categories, public.courses, public.modules,
  public.lessons to authenticated;
grant insert, delete on public.lesson_attachments to authenticated;
grant all on public.categories, public.courses, public.modules, public.lessons,
  public.lesson_attachments to service_role;

-- ---------------------------------------------------------------------
-- Storage: portadas (públicas) y material de cursos (privado)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-covers', 'course-covers', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('course-files', 'course-files', false, 52428800,
    array['application/pdf'])
on conflict (id) do nothing;

-- Portadas: cualquiera las ve (bucket público); solo admin sube o borra.
create policy "course-covers: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-covers' and (select public.is_admin()));
create policy "course-covers: admin edita" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-covers' and (select public.is_admin()));
create policy "course-covers: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-covers' and (select public.is_admin()));

-- Material (PDF): privado. Solo admin; los alumnos lo descargarán con
-- enlaces firmados de corta duración generados en el servidor (fase 3).
create policy "course-files: admin lee" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-files' and (select public.is_admin()));
create policy "course-files: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-files' and (select public.is_admin()));
create policy "course-files: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-files' and (select public.is_admin()));
