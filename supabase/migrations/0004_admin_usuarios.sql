-- =====================================================================
-- Fase 4: administración de usuarios, auditoría y estadísticas
-- Ejecutar una sola vez en Supabase > SQL Editor, después de la 0003.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuarios suspendidos: pierden el acceso al contenido
-- ---------------------------------------------------------------------

-- ¿El usuario actual tiene la cuenta activa?
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

revoke execute on function public.is_active_user() from public;
grant execute on function public.is_active_user() to anon, authenticated;

-- Igual que en la 0003, pero exige que la cuenta esté activa.
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
  join public.profiles p on p.id = e.user_id and p.status = 'active'
  where m.id = p_module_id
    and e.user_id = (select auth.uid())
    and e.status = 'active'
    and (e.expires_at is null or e.expires_at > now());
$$;

create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.enrollments
    where course_id = p_course_id
      and user_id = (select auth.uid())
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

drop policy "enrollments: inscripción gratuita propia" on public.enrollments;
create policy "enrollments: inscripción gratuita propia" on public.enrollments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and source = 'free'
    and status = 'active'
    and expires_at is null
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published' and c.access_type = 'free'
    )
  );

-- ---------------------------------------------------------------------
-- Registro de auditoría
-- ---------------------------------------------------------------------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,          -- insert, update, delete, o una acción con nombre
  entity_type  text not null,          -- tabla o tipo de objeto
  entity_id    text,
  summary      text not null default '',
  details      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_id);
create index audit_log_user_idx on public.audit_log ((details ->> 'user_id'));

alter table public.audit_log enable row level security;

-- Solo los admins leen. Nadie escribe directo: lo hacen los triggers y las
-- funciones de abajo. Nadie puede editar ni borrar entradas.
create policy "audit_log: admin lee" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
grant select on public.audit_log to service_role;

-- Uso interno: no se otorga a anon/authenticated.
create or replace function public.write_audit(
  p_action text, p_entity_type text, p_entity_id text, p_summary text, p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, summary, details)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_summary, ''), coalesce(p_details, '{}'));
$$;

revoke execute on function public.write_audit(text, text, text, text, jsonb) from public, anon, authenticated;

-- Trigger genérico: registra los cambios que hace un admin desde el panel.
-- Ignora cambios que solo tocan el orden o fechas automáticas.
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changed text[];
  v_details jsonb := '{}';
begin
  if (select auth.uid()) is null or not public.is_admin() then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}') into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from v_old -> n.key
      and n.key not in ('updated_at', 'position', 'last_lesson_id', 'last_accessed_at');
    if cardinality(v_changed) = 0 then
      return null;
    end if;
    v_details := jsonb_build_object('changed', to_jsonb(v_changed));
    if 'role' = any (v_changed) or 'status' = any (v_changed) then
      v_details := v_details || jsonb_build_object(
        'from', jsonb_build_object('role', v_old -> 'role', 'status', v_old -> 'status'),
        'to', jsonb_build_object('role', v_new -> 'role', 'status', v_new -> 'status'));
    end if;
  end if;

  if tg_table_name = 'profiles' then
    v_details := v_details || jsonb_build_object('user_id', v_row ->> 'id');
  elsif v_row ? 'user_id' then
    v_details := v_details || jsonb_build_object('user_id', v_row ->> 'user_id');
  end if;
  if v_row ? 'course_id' then
    v_details := v_details || jsonb_build_object('course_id', v_row ->> 'course_id');
  end if;
  if v_row ? 'expires_at' and v_row ->> 'expires_at' is not null then
    v_details := v_details || jsonb_build_object('expires_at', v_row ->> 'expires_at');
  end if;

  perform public.write_audit(
    lower(tg_op), tg_table_name, v_row ->> 'id',
    coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'file_name', v_row ->> 'full_name', ''),
    v_details);
  return null;
end;
$$;

revoke execute on function public.audit_trigger() from public, anon, authenticated;

create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_trigger();
create trigger audit_courses after insert or update or delete on public.courses
  for each row execute function public.audit_trigger();
create trigger audit_modules after insert or update or delete on public.modules
  for each row execute function public.audit_trigger();
create trigger audit_lessons after insert or update or delete on public.lessons
  for each row execute function public.audit_trigger();
create trigger audit_lesson_attachments after insert or update or delete on public.lesson_attachments
  for each row execute function public.audit_trigger();
create trigger audit_enrollments after insert or update or delete on public.enrollments
  for each row execute function public.audit_trigger();
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- Funciones de administración de usuarios
-- Todas verifican el rol adentro: aunque alguien las llame directo por la
-- API, sin ser admin reciben un error.
-- ---------------------------------------------------------------------

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No tenés permisos para esta acción.' using errcode = '42501';
  end if;
end;
$$;

-- Reglas para tocar la cuenta de otro usuario:
-- - nadie se modifica a sí mismo desde el panel (evita quedarse afuera);
-- - solo un superadmin toca a otros admins o da roles de admin.
create or replace function public.assert_can_manage(p_user uuid, p_new_role public.user_role default null)
returns public.user_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  perform public.assert_admin();
  if p_user = (select auth.uid()) then
    raise exception 'No podés hacer esto con tu propia cuenta.' using errcode = '42501';
  end if;
  select role into v_role from public.profiles where id = p_user;
  if v_role is null then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;
  if (v_role in ('admin', 'superadmin') or p_new_role in ('admin', 'superadmin'))
     and not public.is_superadmin() then
    raise exception 'Solo un superadministrador puede gestionar administradores.' using errcode = '42501';
  end if;
  return v_role;
end;
$$;

revoke execute on function public.assert_admin() from public, anon;
revoke execute on function public.assert_can_manage(uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.assert_admin() to authenticated;

-- Listado de usuarios con email y filtros. total_count = total sin paginar.
create or replace function public.admin_list_users(
  p_search text default null,
  p_role public.user_role default null,
  p_status public.user_status default null,
  p_course_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  status public.user_status,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  enrollments_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select
    p.id, u.email::text, p.full_name, p.role, p.status, p.created_at,
    u.last_sign_in_at, u.email_confirmed_at,
    (select count(*) from public.enrollments e where e.user_id = p.id),
    count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  where (p_search is null or p_search = ''
         or p.full_name ilike '%' || p_search || '%'
         or u.email ilike '%' || p_search || '%')
    and (p_role is null or p.role = p_role)
    and (p_status is null or p.status = p_status)
    and (p_from is null or p.created_at >= p_from)
    and (p_to is null or p.created_at < p_to + 1)
    and (p_course_id is null or exists (
      select 1 from public.enrollments e where e.user_id = p.id and e.course_id = p_course_id))
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 5000) offset greatest(p_offset, 0);
end;
$$;

-- Un usuario con su email (ficha).
create or replace function public.admin_get_user(p_user_id uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  status public.user_status,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select p.id, u.email::text, p.full_name, p.role, p.status, p.created_at,
         u.last_sign_in_at, u.email_confirmed_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id;
end;
$$;

-- Cursos de uno o todos los usuarios con su progreso (ficha y exportación).
create or replace function public.admin_enrollment_progress(
  p_user_id uuid default null,
  p_course_id uuid default null
)
returns table (
  enrollment_id uuid,
  user_id uuid,
  email text,
  full_name text,
  course_id uuid,
  course_title text,
  course_slug text,
  source public.enrollment_source,
  status public.enrollment_status,
  enrolled_at timestamptz,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  total_lessons bigint,
  completed_lessons bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select
    e.id, e.user_id, u.email::text, p.full_name, c.id, c.title, c.slug,
    e.source, e.status, e.enrolled_at, e.expires_at, e.last_accessed_at,
    (select count(*) from public.lessons l join public.modules m on m.id = l.module_id
      where m.course_id = c.id),
    (select count(*) from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
      join public.modules m on m.id = l.module_id
      where m.course_id = c.id and lp.user_id = e.user_id)
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  join public.profiles p on p.id = e.user_id
  join auth.users u on u.id = e.user_id
  where (p_user_id is null or e.user_id = p_user_id)
    and (p_course_id is null or e.course_id = p_course_id)
  order by e.enrolled_at desc;
end;
$$;

-- Últimas lecciones completadas por un usuario (historial de la ficha).
create or replace function public.admin_user_activity(p_user_id uuid, p_limit integer default 30)
returns table (
  completed_at timestamptz,
  lesson_id uuid,
  lesson_title text,
  course_title text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select lp.completed_at, l.id, l.title, c.title
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where lp.user_id = p_user_id
  order by lp.completed_at desc
  limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_can_manage(p_user_id, p_role);
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- Suspender también bloquea el inicio de sesión y cierra sus sesiones.
create or replace function public.admin_set_status(p_user_id uuid, p_status public.user_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_can_manage(p_user_id);
  update public.profiles set status = p_status where id = p_user_id;
  if p_status = 'suspended' then
    -- Fecha lejana (Supabase Auth no acepta 'infinity').
    update auth.users set banned_until = now() + interval '100 years' where id = p_user_id;
    delete from auth.sessions where user_id = p_user_id;
  else
    update auth.users set banned_until = null where id = p_user_id;
  end if;
end;
$$;

-- Elimina la cuenta por completo (perfil, inscripciones y progreso en cascada).
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_name text;
begin
  perform public.assert_can_manage(p_user_id);
  select u.email, p.full_name into v_email, v_name
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = p_user_id;
  perform public.write_audit('delete_user', 'profiles', p_user_id::text, v_name,
    jsonb_build_object('user_id', p_user_id, 'email', v_email));
  delete from auth.users where id = p_user_id;
end;
$$;

-- Inscripción manual (o renovación). Si ya estaba inscrito, la reactiva y
-- actualiza el vencimiento.
create or replace function public.admin_enroll(
  p_user_id uuid, p_course_id uuid, p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  insert into public.enrollments (user_id, course_id, source, status, expires_at)
  values (p_user_id, p_course_id, 'manual', 'active', p_expires_at)
  on conflict (user_id, course_id) do update
    set status = 'active', expires_at = excluded.expires_at;
end;
$$;

-- Inscripción masiva por email. Devuelve el resultado de cada email.
create or replace function public.admin_enroll_emails(
  p_course_id uuid, p_emails text[], p_expires_at timestamptz default null
)
returns table (email text, result text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_user uuid;
  v_exists boolean;
begin
  perform public.assert_admin();
  if cardinality(p_emails) > 1000 then
    raise exception 'Máximo 1000 emails por archivo.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'El curso no existe.' using errcode = 'P0002';
  end if;
  foreach v_email in array p_emails loop
    v_email := lower(trim(v_email));
    select u.id into v_user from auth.users u where lower(u.email) = v_email;
    if v_user is null then
      email := v_email; result := 'not_found';
    else
      select exists (
        select 1 from public.enrollments e
        where e.user_id = v_user and e.course_id = p_course_id and e.status = 'active'
          and (e.expires_at is null or e.expires_at > now())
      ) into v_exists;
      perform public.admin_enroll(v_user, p_course_id, p_expires_at);
      email := v_email; result := case when v_exists then 'updated' else 'enrolled' end;
    end if;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Estadísticas del dashboard
-- ---------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform public.assert_admin();
  with course_totals as (
    select m.course_id, count(l.id) as total
    from public.modules m join public.lessons l on l.module_id = m.id
    group by m.course_id
  ),
  user_course_done as (
    select lp.user_id, m.course_id, count(*) as done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    join public.modules m on m.id = l.module_id
    group by lp.user_id, m.course_id
  )
  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'students_total', (select count(*) from public.profiles where role = 'student'),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'enrollments_total', (select count(*) from public.enrollments),
    'enrollments_7d', (select count(*) from public.enrollments where enrolled_at > now() - interval '7 days'),
    'courses_published', (select count(*) from public.courses where status = 'published'),
    'lessons_completed', (select count(*) from public.lesson_progress),
    'courses_completed', (
      select count(*) from user_course_done d
      join course_totals t on t.course_id = d.course_id
      join public.enrollments e on e.user_id = d.user_id and e.course_id = d.course_id
      where d.done >= t.total and t.total > 0),
    'users_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week), '[]')
      from (
        select gs::date as week,
               (select count(*) from public.profiles p
                where p.created_at >= gs and p.created_at < gs + interval '7 days') as n
        from generate_series(date_trunc('week', now()) - interval '7 weeks',
                             date_trunc('week', now()), interval '1 week') gs
      ) w),
    'enrollments_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week), '[]')
      from (
        select gs::date as week,
               (select count(*) from public.enrollments e
                where e.enrolled_at >= gs and e.enrolled_at < gs + interval '7 days') as n
        from generate_series(date_trunc('week', now()) - interval '7 weeks',
                             date_trunc('week', now()), interval '1 week') gs
      ) w),
    'top_lessons', (
      select coalesce(jsonb_agg(t order by t.completed desc), '[]')
      from (
        select l.title as lesson, c.title as course, count(*) as completed
        from public.lesson_progress lp
        join public.lessons l on l.id = lp.lesson_id
        join public.modules m on m.id = l.module_id
        join public.courses c on c.id = m.course_id
        group by l.id, l.title, c.title
        order by count(*) desc
        limit 10
      ) t)
  ) into v;
  return v;
end;
$$;

-- Embudo de un curso: cuántos inscritos completaron cada lección, en orden.
-- Sirve para ver en qué lección abandonan.
create or replace function public.admin_course_funnel(p_course_id uuid)
returns table (
  lesson_id uuid,
  lesson_title text,
  module_title text,
  enrolled bigint,
  completed bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select l.id, l.title, m.title,
    (select count(*) from public.enrollments e where e.course_id = p_course_id),
    (select count(*) from public.lesson_progress lp
      join public.enrollments e on e.user_id = lp.user_id and e.course_id = p_course_id
      where lp.lesson_id = l.id)
  from public.modules m
  join public.lessons l on l.module_id = m.id
  where m.course_id = p_course_id
  order by m.position, l.position;
end;
$$;

revoke execute on function public.admin_list_users(text, public.user_role, public.user_status, uuid, date, date, integer, integer) from public, anon;
revoke execute on function public.admin_get_user(uuid) from public, anon;
revoke execute on function public.admin_enrollment_progress(uuid, uuid) from public, anon;
revoke execute on function public.admin_user_activity(uuid, integer) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_set_status(uuid, public.user_status) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
revoke execute on function public.admin_enroll(uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.admin_enroll_emails(uuid, text[], timestamptz) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_course_funnel(uuid) from public, anon;

grant execute on function public.admin_list_users(text, public.user_role, public.user_status, uuid, date, date, integer, integer) to authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;
grant execute on function public.admin_enrollment_progress(uuid, uuid) to authenticated;
grant execute on function public.admin_user_activity(uuid, integer) to authenticated;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_status(uuid, public.user_status) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_enroll(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.admin_enroll_emails(uuid, text[], timestamptz) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_course_funnel(uuid) to authenticated;
