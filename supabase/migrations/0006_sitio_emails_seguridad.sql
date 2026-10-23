-- =====================================================================
-- Fase 6: configuración del sitio, emails, privacidad y revisión de permisos
-- Ejecutar una sola vez en Supabase > SQL Editor, después de 0005.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Revisión de permisos
-- ---------------------------------------------------------------------

-- Las tablas de cursos tenían todos los permisos por defecto (incluido
-- TRUNCATE, que no respeta RLS). Se dejan solo los que se usan; RLS sigue
-- decidiendo qué filas puede leer o escribir cada uno.
revoke all on public.categories, public.courses, public.modules, public.lessons,
  public.lesson_attachments from anon, authenticated;
grant select on public.categories, public.courses, public.modules, public.lessons,
  public.lesson_attachments to anon, authenticated;
grant insert, update, delete on public.categories, public.courses, public.modules,
  public.lessons, public.lesson_attachments to authenticated;

-- Al inscribirse, el alumno no puede elegir la fecha de inscripción (con una
-- fecha vieja se saltearía la liberación gradual de módulos) ni la de
-- finalización de una lección: las pone la base.
revoke insert on public.enrollments, public.lesson_progress from authenticated;
grant insert (user_id, course_id, source) on public.enrollments to authenticated;
grant insert (user_id, lesson_id) on public.lesson_progress to authenticated;

-- Funciones internas que no tienen por qué poder llamarse desde la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.my_learning() from public, anon;

-- ---------------------------------------------------------------------
-- Configuración del sitio (una sola fila)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id             boolean primary key default true check (id),
  site_name      text not null default 'Plataforma de Cursos'
                   check (char_length(site_name) between 1 and 60),
  description    text not null default 'Cursos online para aprender a tu ritmo.'
                   check (char_length(description) <= 200),
  logo_path      text,
  primary_color  text not null default '#1d4ed8' check (primary_color ~ '^#[0-9a-f]{6}$'),
  contact_email  text not null default ''
                   check (contact_email = '' or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  instagram_url  text not null default '' check (instagram_url = '' or instagram_url ~ '^https://'),
  facebook_url   text not null default '' check (facebook_url = '' or facebook_url ~ '^https://'),
  youtube_url    text not null default '' check (youtube_url = '' or youtube_url ~ '^https://'),
  tiktok_url     text not null default '' check (tiktok_url = '' or tiktok_url ~ '^https://'),
  x_url          text not null default '' check (x_url = '' or x_url ~ '^https://'),
  linkedin_url   text not null default '' check (linkedin_url = '' or linkedin_url ~ '^https://'),
  whatsapp       text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
  -- null = se usa el texto modelo de la aplicación.
  terms_html     text check (char_length(terms_html) <= 100000),
  privacy_html   text check (char_length(privacy_html) <= 100000),
  updated_at     timestamptz not null default now()
);

insert into public.site_settings default values;

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: leer" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: admin edita" on public.site_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update (site_name, description, logo_path, primary_color, contact_email, instagram_url,
  facebook_url, youtube_url, tiktok_url, x_url, linkedin_url, whatsapp, terms_html, privacy_html)
  on public.site_settings to authenticated;
grant all on public.site_settings to service_role;

-- ---------------------------------------------------------------------
-- Plantillas de los emails que envía la aplicación
-- (los de verificación y recuperación los envía Supabase Auth)
-- ---------------------------------------------------------------------
create table public.email_templates (
  key           text primary key check (key in ('welcome', 'certificate')),
  subject       text not null check (char_length(subject) between 1 and 150),
  body_html     text not null check (char_length(body_html) <= 20000),
  button_label  text not null default '' check (char_length(button_label) <= 40),
  enabled       boolean not null default true,
  updated_at    timestamptz not null default now()
);

insert into public.email_templates (key, subject, body_html, button_label) values
  ('welcome',
   '¡Te damos la bienvenida a {sitio}!',
   '<p>Hola {nombre}:</p><p>Tu cuenta en {sitio} ya está activa. Ya podés explorar los cursos y empezar a aprender a tu ritmo.</p><p>¡Te esperamos!</p>',
   'Ver los cursos'),
  ('certificate',
   '¡Obtuviste tu certificado de {curso}!',
   '<p>Hola {nombre}:</p><p>¡Felicitaciones! Completaste el curso <strong>{curso}</strong> y ya tenés tu certificado. Podés descargarlo en PDF y compartirlo con su código de verificación.</p>',
   'Ver mi certificado');

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

-- Se leen con la sesión del propio alumno al enviarle su email.
create policy "email_templates: leer" on public.email_templates
  for select to authenticated using (true);
create policy "email_templates: admin edita" on public.email_templates
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.email_templates from anon, authenticated;
grant select on public.email_templates to authenticated;
grant update (subject, body_html, button_label, enabled) on public.email_templates to authenticated;
grant all on public.email_templates to service_role;

-- ---------------------------------------------------------------------
-- Preferencias y control de envíos
-- ---------------------------------------------------------------------
alter table public.profiles
  add column email_announcements boolean not null default true,
  add column welcome_email_sent_at timestamptz;
alter table public.certificates add column emailed_at timestamptz;

-- Los usuarios y certificados que ya existían no reciben emails retroactivos.
update public.profiles set welcome_email_sent_at = created_at;
update public.certificates set emailed_at = issued_at;

grant update (email_announcements) on public.profiles to authenticated;

-- Marca el email de bienvenida como enviado. Devuelve true solo la primera
-- vez, así no se manda dos veces aunque se llame en paralelo.
create or replace function public.claim_welcome_email()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set welcome_email_sent_at = now()
  where id = (select auth.uid()) and welcome_email_sent_at is null and status = 'active';
  return found;
end;
$$;

-- Certificados propios todavía no avisados por email; quedan marcados.
create or replace function public.claim_certificate_emails()
returns table (code text, course_title text, full_name text)
language sql
security definer
set search_path = ''
as $$
  update public.certificates c
  set emailed_at = now()
  where c.user_id = (select auth.uid()) and c.emailed_at is null
  returning c.code, c.course_title, c.full_name;
$$;

revoke execute on function public.claim_welcome_email() from public, anon;
revoke execute on function public.claim_certificate_emails() from public, anon;
grant execute on function public.claim_welcome_email() to authenticated;
grant execute on function public.claim_certificate_emails() to authenticated;

-- ---------------------------------------------------------------------
-- Anuncios por email
-- ---------------------------------------------------------------------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null check (char_length(subject) between 1 and 150),
  body_html   text not null check (char_length(body_html) <= 50000),
  course_id   uuid references public.courses (id) on delete set null,
  recipients  integer not null default 0 check (recipients >= 0),
  sent_by     uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index announcements_created_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;

create policy "announcements: admin lee" on public.announcements
  for select to authenticated using ((select public.is_admin()));
create policy "announcements: admin registra" on public.announcements
  for insert to authenticated
  with check ((select public.is_admin()) and sent_by = (select auth.uid()));

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to authenticated;
grant insert (subject, body_html, course_id, recipients, sent_by) on public.announcements to authenticated;
grant all on public.announcements to service_role;

-- Destinatarios de un anuncio: usuarios activos, con email confirmado y que
-- no se dieron de baja. Con curso: solo inscritos con acceso vigente.
create or replace function public.admin_announcement_recipients(p_course_id uuid default null)
returns table (email text, full_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select u.email::text, p.full_name
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.status = 'active'
    and p.email_announcements
    and u.email is not null
    and u.email_confirmed_at is not null
    and (p_course_id is null or exists (
      select 1 from public.enrollments e
      where e.user_id = p.id and e.course_id = p_course_id and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
    ))
  order by u.email;
end;
$$;

revoke execute on function public.admin_announcement_recipients(uuid) from public, anon;
grant execute on function public.admin_announcement_recipients(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Privacidad: el usuario elimina su propia cuenta
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role;
  v_name text;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Tenés que iniciar sesión.' using errcode = '42501';
  end if;
  select p.role, p.full_name, u.email into v_role, v_name, v_email
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = v_uid;
  if v_role = 'superadmin' and (
    select count(*) from public.profiles where role = 'superadmin' and status = 'active'
  ) <= 1 then
    raise exception 'Sos el único superadministrador: antes de eliminar tu cuenta, nombrá a otro.'
      using errcode = '42501';
  end if;
  perform public.write_audit('delete_self', 'profiles', v_uid::text, v_name,
    jsonb_build_object('user_id', v_uid, 'email', v_email));
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------

-- Igual que antes, pero ignora las marcas de envío de emails y usa el asunto
-- como resumen de los anuncios.
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
      and n.key not in ('updated_at', 'position', 'last_lesson_id', 'last_accessed_at',
                        'welcome_email_sent_at', 'emailed_at');
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
  if v_row ? 'course_id' and v_row ->> 'course_id' is not null then
    v_details := v_details || jsonb_build_object('course_id', v_row ->> 'course_id');
  end if;
  if v_row ? 'expires_at' and v_row ->> 'expires_at' is not null then
    v_details := v_details || jsonb_build_object('expires_at', v_row ->> 'expires_at');
  end if;
  if tg_table_name = 'announcements' then
    v_details := v_details || jsonb_build_object('recipients', v_row -> 'recipients');
  end if;

  perform public.write_audit(
    lower(tg_op), tg_table_name, coalesce(v_row ->> 'id', v_row ->> 'key'),
    coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'file_name', v_row ->> 'full_name',
             v_row ->> 'subject', ''),
    v_details);
  return null;
end;
$$;

revoke execute on function public.audit_trigger() from public, anon, authenticated;

create trigger audit_site_settings after update on public.site_settings
  for each row execute function public.audit_trigger();
create trigger audit_email_templates after update on public.email_templates
  for each row execute function public.audit_trigger();
create trigger audit_announcements after insert on public.announcements
  for each row execute function public.audit_trigger();
