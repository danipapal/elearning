-- =====================================================================
-- Fase 5: cuestionarios y certificados
-- Ejecutar una sola vez en Supabase > SQL Editor, después de la 0004.
-- =====================================================================

create type public.question_type as enum ('single', 'multiple', 'true_false');

-- ---------------------------------------------------------------------
-- Cuestionarios: uno por lección de tipo "quiz"
-- ---------------------------------------------------------------------
create table public.quizzes (
  lesson_id      uuid primary key references public.lessons (id) on delete cascade,
  passing_score  integer not null default 70 check (passing_score between 0 and 100),
  max_attempts   integer check (max_attempts is null or max_attempts between 1 and 100),
  updated_at     timestamptz not null default now()
);

create table public.quiz_questions (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.quizzes (lesson_id) on delete cascade,
  type         public.question_type not null default 'single',
  prompt       text not null check (char_length(prompt) between 1 and 1000),
  explanation  text not null default '' check (char_length(explanation) <= 1000),
  position     integer not null default 0
);

create index quiz_questions_lesson_idx on public.quiz_questions (lesson_id, position);

create table public.quiz_options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.quiz_questions (id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 500),
  is_correct   boolean not null default false,
  position     integer not null default 0
);

create index quiz_options_question_idx on public.quiz_options (question_id, position);

create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  lesson_id   uuid not null references public.quizzes (lesson_id) on delete cascade,
  score       integer not null check (score between 0 and 100),
  passed      boolean not null,
  answers     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index quiz_attempts_user_idx on public.quiz_attempts (user_id, lesson_id);
create index quiz_attempts_lesson_idx on public.quiz_attempts (lesson_id);

create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;

-- Se leen con el mismo permiso que la lección. Escriben solo los admins
-- (con admin_save_quiz). Las respuestas correctas (is_correct) NO se pueden
-- leer desde el navegador: ver permisos por columna abajo.
create policy "quizzes: leer si tiene acceso" on public.quizzes
  for select to anon, authenticated using (public.can_access_lesson(lesson_id));
create policy "quiz_questions: leer si tiene acceso" on public.quiz_questions
  for select to anon, authenticated using (public.can_access_lesson(lesson_id));
create policy "quiz_options: leer si tiene acceso" on public.quiz_options
  for select to anon, authenticated using (
    exists (
      select 1 from public.quiz_questions q
      where q.id = question_id and public.can_access_lesson(q.lesson_id)
    )
  );
create policy "quiz_attempts: leer los propios o admin" on public.quiz_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.quizzes, public.quiz_questions, public.quiz_options, public.quiz_attempts
  from anon, authenticated;
grant select on public.quizzes to anon, authenticated;
-- La explicación de cada pregunta se ve recién después de responder (quiz_review).
grant select (id, lesson_id, type, prompt, position) on public.quiz_questions to anon, authenticated;
grant select (id, question_id, label, position) on public.quiz_options to anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant all on public.quizzes, public.quiz_questions, public.quiz_options, public.quiz_attempts
  to service_role;

-- Una lección con cuestionario solo se completa aprobándolo (submit_quiz).
drop policy if exists "lesson_progress: marcar lección accesible" on public.lesson_progress;
create policy "lesson_progress: marcar lección accesible" on public.lesson_progress
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_access_lesson(lesson_id)
    and not exists (select 1 from public.quizzes z where z.lesson_id = lesson_progress.lesson_id)
  );
drop policy if exists "lesson_progress: desmarcar el propio" on public.lesson_progress;
create policy "lesson_progress: desmarcar el propio" on public.lesson_progress
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and not exists (select 1 from public.quizzes z where z.lesson_id = lesson_progress.lesson_id)
  );

-- ---------------------------------------------------------------------
-- Cuestionarios: funciones
-- ---------------------------------------------------------------------

-- Cuestionario completo con las respuestas correctas, para el editor.
create or replace function public.admin_get_quiz(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return (
    select jsonb_build_object(
      'passing_score', z.passing_score,
      'max_attempts', z.max_attempts,
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', q.id, 'type', q.type, 'prompt', q.prompt, 'explanation', q.explanation,
          'options', coalesce((
            select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'is_correct', o.is_correct)
                             order by o.position)
            from public.quiz_options o where o.question_id = q.id), '[]')
        ) order by q.position)
        from public.quiz_questions q where q.lesson_id = z.lesson_id), '[]')
    )
    from public.quizzes z where z.lesson_id = p_lesson_id
  );
end;
$$;

-- Guarda el cuestionario entero (reemplaza preguntas y opciones).
-- p_quiz: {passing_score, max_attempts, questions: [{type, prompt, explanation,
--          options: [{label, is_correct}]}]}
create or replace function public.admin_save_quiz(p_lesson_id uuid, p_quiz jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_qpos integer := 0;
  v_opos integer;
  v_correct integer;
  v_total integer;
  v_type public.question_type;
begin
  perform public.assert_admin();
  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'La lección no existe.' using errcode = 'P0002';
  end if;
  if jsonb_array_length(coalesce(p_quiz -> 'questions', '[]')) > 100 then
    raise exception 'Máximo 100 preguntas.' using errcode = '22023';
  end if;

  insert into public.quizzes (lesson_id, passing_score, max_attempts)
  values (p_lesson_id, (p_quiz ->> 'passing_score')::integer, (p_quiz ->> 'max_attempts')::integer)
  on conflict (lesson_id) do update
    set passing_score = excluded.passing_score, max_attempts = excluded.max_attempts;

  delete from public.quiz_questions where lesson_id = p_lesson_id;

  for v_question in select * from jsonb_array_elements(coalesce(p_quiz -> 'questions', '[]')) loop
    v_type := (v_question ->> 'type')::public.question_type;
    select count(*), count(*) filter (where (o ->> 'is_correct')::boolean)
      into v_total, v_correct
    from jsonb_array_elements(coalesce(v_question -> 'options', '[]')) o;
    if v_total < 2 or v_total > 10 or v_correct < 1
       or (v_type <> 'multiple' and v_correct <> 1)
       or (v_type = 'true_false' and v_total <> 2) then
      raise exception 'La pregunta % no tiene opciones válidas.', v_qpos + 1 using errcode = '22023';
    end if;

    insert into public.quiz_questions (lesson_id, type, prompt, explanation, position)
    values (p_lesson_id, v_type, v_question ->> 'prompt', coalesce(v_question ->> 'explanation', ''), v_qpos)
    returning id into v_question_id;

    v_opos := 0;
    for v_option in select * from jsonb_array_elements(v_question -> 'options') loop
      insert into public.quiz_options (question_id, label, is_correct, position)
      values (v_question_id, v_option ->> 'label', (v_option ->> 'is_correct')::boolean, v_opos);
      v_opos := v_opos + 1;
    end loop;
    v_qpos := v_qpos + 1;
  end loop;

  perform public.write_audit('update', 'quizzes', p_lesson_id::text,
    (select title from public.lessons where id = p_lesson_id),
    jsonb_build_object('questions', v_qpos));
end;
$$;

-- Quita el cuestionario de una lección (por ejemplo, si cambia de tipo).
create or replace function public.admin_delete_quiz(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  delete from public.quizzes where lesson_id = p_lesson_id;
end;
$$;

-- Corrige un intento en el servidor. p_answers: {"<question_id>": ["<option_id>", ...]}
-- Devuelve la nota y, si aprobó o no le quedan intentos, las respuestas correctas.
create or replace function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_quiz public.quizzes;
  v_course uuid;
  v_used integer;
  v_total integer := 0;
  v_ok integer := 0;
  v_score integer;
  v_passed boolean;
  v_results jsonb := '[]';
  v_question record;
  v_selected uuid[];
  v_correct uuid[];
  v_is_ok boolean;
  v_reveal boolean;
begin
  if v_uid is null then
    raise exception 'Iniciá sesión para responder.' using errcode = '42501';
  end if;
  if pg_column_size(p_answers) > 20000 then
    raise exception 'Respuestas inválidas.' using errcode = '22023';
  end if;
  select * into v_quiz from public.quizzes where lesson_id = p_lesson_id;
  if v_quiz is null then
    raise exception 'El cuestionario no existe.' using errcode = 'P0002';
  end if;
  select m.course_id into v_course
  from public.lessons l join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id;
  if not public.can_access_lesson(p_lesson_id)
     or not (public.is_enrolled(v_course) or public.is_admin()) then
    raise exception 'No tenés acceso a este cuestionario.' using errcode = '42501';
  end if;

  -- Bloquea intentos simultáneos del mismo alumno.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || p_lesson_id::text, 0));
  select count(*) into v_used from public.quiz_attempts
  where user_id = v_uid and lesson_id = p_lesson_id;
  if v_quiz.max_attempts is not null and v_used >= v_quiz.max_attempts then
    raise exception 'Ya usaste todos los intentos.' using errcode = '22023';
  end if;

  for v_question in
    select q.id from public.quiz_questions q where q.lesson_id = p_lesson_id order by q.position
  loop
    v_total := v_total + 1;
    select coalesce(array_agg(distinct x::uuid), '{}') into v_selected
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_answers -> v_question.id::text) = 'array'
           then p_answers -> v_question.id::text else '[]' end) x
    where x ~ '^[0-9a-fA-F-]{36}$';
    select coalesce(array_agg(o.id), '{}') into v_correct
    from public.quiz_options o where o.question_id = v_question.id and o.is_correct;
    v_is_ok := v_selected <@ v_correct and v_correct <@ v_selected;
    if v_is_ok then v_ok := v_ok + 1; end if;
    v_results := v_results || jsonb_build_object('question_id', v_question.id, 'correct', v_is_ok);
  end loop;

  if v_total = 0 then
    raise exception 'El cuestionario no tiene preguntas.' using errcode = '22023';
  end if;
  v_score := round(100.0 * v_ok / v_total);
  v_passed := v_score >= v_quiz.passing_score;

  insert into public.quiz_attempts (user_id, lesson_id, score, passed, answers)
  values (v_uid, p_lesson_id, v_score, v_passed, coalesce(p_answers, '{}'));
  if v_passed then
    insert into public.lesson_progress (user_id, lesson_id) values (v_uid, p_lesson_id)
    on conflict do nothing;
  end if;

  v_used := v_used + 1;
  v_reveal := v_passed or (v_quiz.max_attempts is not null and v_used >= v_quiz.max_attempts);
  return jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'correct_count', v_ok,
    'total', v_total,
    'attempts_used', v_used,
    'max_attempts', v_quiz.max_attempts,
    'results', v_results,
    'correct_options', case when v_reveal then (
      select coalesce(jsonb_agg(o.id), '[]') from public.quiz_options o
      join public.quiz_questions q on q.id = o.question_id
      where q.lesson_id = p_lesson_id and o.is_correct) end
  );
end;
$$;

-- Respuestas correctas de un cuestionario ya aprobado o sin intentos (para repasar).
create or replace function public.quiz_review(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_max integer;
  v_used integer;
  v_passed boolean;
begin
  select max_attempts into v_max from public.quizzes where lesson_id = p_lesson_id;
  select count(*), coalesce(bool_or(passed), false) into v_used, v_passed
  from public.quiz_attempts where user_id = v_uid and lesson_id = p_lesson_id;
  if not (v_passed or (v_max is not null and v_used >= v_max) or public.is_admin()) then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'correct_options', coalesce(jsonb_agg(o.id), '[]'),
      'explanations', (
        select coalesce(jsonb_object_agg(q.id, q.explanation), '{}')
        from public.quiz_questions q where q.lesson_id = p_lesson_id and q.explanation <> ''))
    from public.quiz_options o
    join public.quiz_questions q on q.id = o.question_id
    where q.lesson_id = p_lesson_id and o.is_correct
  );
end;
$$;

-- Duplicar curso: igual que en la 0002, pero también copia los cuestionarios.
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

      -- Copia el cuestionario, si la lección tiene uno.
      if exists (select 1 from public.quizzes where lesson_id = v_lesson.id) then
        perform public.admin_save_quiz(v_new_lesson, public.admin_get_quiz(v_lesson.id));
      end if;
    end loop;
  end loop;

  return v_new_course;
end;
$$;

-- ---------------------------------------------------------------------
-- Certificados
-- ---------------------------------------------------------------------
create table public.certificates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete cascade,
  code          text not null unique,
  -- Copia del nombre y del curso al momento de emitirlo.
  full_name     text not null,
  course_title  text not null,
  issued_at     timestamptz not null default now(),
  unique (user_id, course_id)
);

create index certificates_course_idx on public.certificates (course_id);

create trigger audit_certificates after delete on public.certificates
  for each row execute function public.audit_trigger();

alter table public.certificates enable row level security;

create policy "certificates: leer los propios o admin" on public.certificates
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "certificates: admin borra" on public.certificates
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.certificates from anon, authenticated;
grant select, delete on public.certificates to authenticated;
grant all on public.certificates to service_role;

-- Código legible y único, por ejemplo 7F3A-92C1-B04E.
create or replace function public.new_certificate_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(regexp_replace(left(replace(gen_random_uuid()::text, '-', ''), 12), '(.{4})(.{4})(.{4})', '\1-\2-\3'));
$$;

-- Emite el certificado si el usuario completó todas las lecciones del curso.
create or replace function public.issue_certificate_if_complete(p_user_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_done integer;
begin
  select count(*) into v_total
  from public.lessons l join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id;
  select count(*) into v_done
  from public.lesson_progress p
  join public.lessons l on l.id = p.lesson_id
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and p.user_id = p_user_id;
  if v_total = 0 or v_done < v_total then
    return;
  end if;
  if not exists (
    select 1 from public.enrollments e
    where e.user_id = p_user_id and e.course_id = p_course_id and e.status = 'active'
  ) then
    return;
  end if;
  insert into public.certificates (user_id, course_id, code, full_name, course_title)
  select p_user_id, p_course_id, public.new_certificate_code(),
         coalesce(nullif(p.full_name, ''), split_part(u.email, '@', 1)), c.title
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join public.courses c
  where p.id = p_user_id and c.id = p_course_id
  on conflict (user_id, course_id) do nothing;
end;
$$;

create or replace function public.certificate_on_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.issue_certificate_if_complete(
    new.user_id,
    (select m.course_id from public.lessons l join public.modules m on m.id = l.module_id
     where l.id = new.lesson_id));
  return null;
end;
$$;

create trigger lesson_progress_certificate
  after insert on public.lesson_progress
  for each row execute function public.certificate_on_progress();

revoke execute on function public.new_certificate_code() from public, anon, authenticated;
revoke execute on function public.issue_certificate_if_complete(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.certificate_on_progress() from public, anon, authenticated;

-- Verificación pública: cualquiera con el código puede comprobarlo.
create or replace function public.verify_certificate(p_code text)
returns table (code text, full_name text, course_title text, course_slug text, issued_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.code, c.full_name, c.course_title, co.slug, c.issued_at
  from public.certificates c
  left join public.courses co on co.id = c.course_id and co.status = 'published'
  where c.code = upper(trim(p_code));
$$;

-- Certificados ya ganados antes de esta migración.
do $$
begin
  perform public.issue_certificate_if_complete(e.user_id, e.course_id) from public.enrollments e;
end;
$$;

-- ---------------------------------------------------------------------
-- Plantilla del certificado (una sola fila)
-- ---------------------------------------------------------------------
create table public.certificate_settings (
  id               boolean primary key default true check (id),
  title            text not null default 'Certificado de finalización' check (char_length(title) <= 80),
  recipient_label  text not null default 'Se otorga a' check (char_length(recipient_label) <= 80),
  body             text not null default 'por haber completado satisfactoriamente el curso {curso}.'
                     check (char_length(body) <= 400),
  signer_name      text not null default '' check (char_length(signer_name) <= 80),
  signer_title     text not null default '' check (char_length(signer_title) <= 80),
  logo_path        text,
  signature_path   text,
  updated_at       timestamptz not null default now()
);

insert into public.certificate_settings default values;

create trigger certificate_settings_set_updated_at
  before update on public.certificate_settings
  for each row execute function public.set_updated_at();
create trigger audit_certificate_settings after update on public.certificate_settings
  for each row execute function public.audit_trigger();

alter table public.certificate_settings enable row level security;

create policy "certificate_settings: leer" on public.certificate_settings
  for select to anon, authenticated using (true);
create policy "certificate_settings: admin edita" on public.certificate_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.certificate_settings from anon, authenticated;
grant select on public.certificate_settings to anon, authenticated;
grant update (title, recipient_label, body, signer_name, signer_title, logo_path, signature_path)
  on public.certificate_settings to authenticated;
grant all on public.certificate_settings to service_role;

-- ---------------------------------------------------------------------
-- Estadísticas y fichas: cuestionarios y certificados
-- ---------------------------------------------------------------------

-- Resultados por cuestionario (panel): intentos, promedio y aprobados.
create or replace function public.admin_quiz_stats()
returns table (
  lesson_id uuid,
  lesson_title text,
  course_title text,
  attempts bigint,
  students bigint,
  average_score numeric,
  passed_students bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select l.id, l.title, c.title,
    count(a.id),
    count(distinct a.user_id),
    round(avg(a.score), 1),
    count(distinct a.user_id) filter (where a.passed)
  from public.quizzes z
  join public.lessons l on l.id = z.lesson_id
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  left join public.quiz_attempts a on a.lesson_id = z.lesson_id
  group by l.id, l.title, c.title
  order by c.title, l.title;
end;
$$;

-- Resultados de un usuario en cada cuestionario (ficha).
create or replace function public.admin_user_quizzes(p_user_id uuid)
returns table (
  lesson_id uuid,
  lesson_title text,
  course_title text,
  attempts bigint,
  best_score integer,
  passed boolean,
  last_attempt_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select l.id, l.title, c.title, count(*), max(a.score), bool_or(a.passed), max(a.created_at)
  from public.quiz_attempts a
  join public.lessons l on l.id = a.lesson_id
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where a.user_id = p_user_id
  group by l.id, l.title, c.title
  order by max(a.created_at) desc;
end;
$$;

revoke execute on function public.admin_get_quiz(uuid) from public, anon;
revoke execute on function public.admin_save_quiz(uuid, jsonb) from public, anon;
revoke execute on function public.admin_delete_quiz(uuid) from public, anon;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
revoke execute on function public.quiz_review(uuid) from public, anon;
revoke execute on function public.verify_certificate(text) from public;
revoke execute on function public.admin_quiz_stats() from public, anon;
revoke execute on function public.admin_user_quizzes(uuid) from public, anon;

grant execute on function public.admin_get_quiz(uuid) to authenticated;
grant execute on function public.admin_save_quiz(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
grant execute on function public.quiz_review(uuid) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.admin_quiz_stats() to authenticated;
grant execute on function public.admin_user_quizzes(uuid) to authenticated;
