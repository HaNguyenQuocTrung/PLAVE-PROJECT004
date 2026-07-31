begin;

create or replace function private.enforce_teacher_question_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_active boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.teacher_profiles as teacher
      join public.profiles as profile
        on profile.user_id = teacher.user_id
      where
        teacher.user_id = new.teacher_id
        and teacher.activation_status = 'ACTIVE'
        and profile.role = 'TEACHER'
        and profile.onboarding_completed
    )
    into v_teacher_active;

    if not v_teacher_active or new.status <> 'ACTIVE' then
      raise exception 'Question owner unavailable';
    end if;
    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.teacher_id is distinct from old.teacher_id
    or new.creation_request_id is distinct from old.creation_request_id
    or new.grade is distinct from old.grade
    or new.question_type is distinct from old.question_type
    or new.prompt is distinct from old.prompt
    or new.options is distinct from old.options
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Question content cannot change';
  end if;

  if old.status = new.status then
    if
      (
        new.status = 'ACTIVE'
        and new.archived_at is not null
      )
      or (
        new.status = 'ARCHIVED'
        and new.archived_at is null
      )
    then
      raise exception 'Invalid question state';
    end if;
    return new;
  end if;

  if
    old.status = 'ACTIVE'
    and new.status = 'ARCHIVED'
    and new.archived_at is not null
  then
    return new;
  end if;

  if
    old.status = 'ARCHIVED'
    and new.status = 'ACTIVE'
    and new.archived_at is null
  then
    return new;
  end if;

  raise exception 'Invalid question transition';
end;
$$;

create function public.restore_teacher_question(
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_affected_count bigint := 0;
  v_status text;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  perform pg_advisory_xact_lock(
    hashtextextended('teacher-question:' || p_question_id::text, 1)
  );

  update public.teacher_questions as question
  set
    status = 'ACTIVE',
    archived_at = null
  where
    question.id = p_question_id
    and question.teacher_id = v_teacher_user_id
    and question.status = 'ARCHIVED';

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return jsonb_build_object('status', 'ACTIVE');
  end if;

  select question.status
  into v_status
  from public.teacher_questions as question
  where
    question.id = p_question_id
    and question.teacher_id = v_teacher_user_id;

  if v_status = 'ACTIVE' then
    return jsonb_build_object('status', 'ACTIVE');
  end if;

  raise exception 'Question state unavailable';
end;
$$;

revoke all
on function public.restore_teacher_question(uuid)
from public;
revoke all
on function public.restore_teacher_question(uuid)
from anon;
revoke all
on function public.restore_teacher_question(uuid)
from authenticated;
grant execute
on function public.restore_teacher_question(uuid)
to authenticated;

comment on function public.restore_teacher_question(uuid)
is 'Restore an owned archived Teacher question for future assignments.';

do $validation$
declare
  v_trigger_definition text;
  v_restore_definition text;
begin
  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_trigger_definition
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'private'::regnamespace
    and procedure.proname = 'enforce_teacher_question_integrity'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid) = '';

  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_restore_definition
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'public'::regnamespace
    and procedure.proname = 'restore_teacher_question'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_question_id uuid';

  if
    v_trigger_definition is null
    or v_trigger_definition !~ 'old[.]status = ''ARCHIVED'''
    or v_trigger_definition !~ 'new[.]status = ''ACTIVE'''
    or v_trigger_definition !~ 'new[.]archived_at is null'
  then
    raise exception 'Teacher question restore transition validation failed';
  end if;

  if
    v_restore_definition is null
    or v_restore_definition !~ 'require_classroom_actor[(]''TEACHER''[)]'
    or v_restore_definition !~ 'question[.]teacher_id = v_teacher_user_id'
    or v_restore_definition !~ 'question[.]status = ''ARCHIVED'''
    or v_restore_definition !~* 'archived_at = null'
  then
    raise exception 'Teacher question restore function validation failed';
  end if;

  if
    not has_function_privilege(
      'authenticated',
      'public.restore_teacher_question(uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.restore_teacher_question(uuid)',
      'EXECUTE'
    )
    or exists (
      select 1
      from pg_catalog.pg_proc as procedure
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) as privilege
      where
        procedure.oid =
          'public.restore_teacher_question(uuid)'::regprocedure
        and privilege.grantee = 0
        and privilege.privilege_type = 'EXECUTE'
    )
    or has_table_privilege(
      'authenticated',
      'public.teacher_questions',
      'INSERT,UPDATE,DELETE'
    )
  then
    raise exception 'Teacher question restore privilege validation failed';
  end if;

  if exists (
    select 1
    from public.teacher_questions as question
    where
      (
        question.status = 'ACTIVE'
        and question.archived_at is not null
      )
      or (
        question.status = 'ARCHIVED'
        and question.archived_at is null
      )
  ) then
    raise exception 'Invalid Teacher question lifecycle data detected';
  end if;
end;
$validation$;

commit;
