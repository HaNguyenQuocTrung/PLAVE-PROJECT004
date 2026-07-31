begin;

alter table public.profiles
  add column registration_grade smallint;

alter table public.profiles
  add constraint profiles_registration_grade_check
  check (
    registration_grade is null
    or registration_grade between 1 and 9
  );

comment on column public.profiles.registration_grade is
  'Student grade captured at public registration. Clients have no direct profile update permission.';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_role text;
  v_registration_grade smallint;
  v_registration_grade_text text;
begin
  v_requested_role := upper(
    coalesce(new.raw_user_meta_data ->> 'role', '')
  );

  -- Fail closed: public metadata can never create a privileged role.
  if v_requested_role not in ('STUDENT', 'PARENT') then
    raise exception 'Unsupported public registration role';
  end if;

  if v_requested_role = 'STUDENT' then
    v_registration_grade_text := btrim(
      coalesce(new.raw_user_meta_data ->> 'grade', '')
    );

    if v_registration_grade_text !~ '^[1-9]$' then
      raise exception 'Invalid student registration grade';
    end if;

    v_registration_grade := v_registration_grade_text::smallint;
  end if;

  insert into public.profiles (
    user_id,
    role,
    registration_grade
  )
  values (
    new.id,
    v_requested_role,
    v_registration_grade
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

-- Preserve a valid grade for existing Student accounts that have not completed
-- onboarding. Invalid or missing metadata remains null and therefore fails closed.
with valid_registration_grades as (
  select
    u.id as user_id,
    case
      when btrim(
        coalesce(u.raw_user_meta_data ->> 'grade', '')
      ) ~ '^[1-9]$'
      then (u.raw_user_meta_data ->> 'grade')::smallint
      else null
    end as registration_grade
  from auth.users as u
)
update public.profiles as p
set registration_grade = v.registration_grade
from valid_registration_grades as v
where
  p.user_id = v.user_id
  and p.role = 'STUDENT'
  and not p.onboarding_completed
  and p.registration_grade is null
  and v.registration_grade is not null;

create or replace function public.complete_onboarding(
  p_full_name text,
  p_grade smallint default null,
  p_birth_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_current_role text;
  v_normalized_name text;
  v_insert_attempt smallint;
  v_profile_count bigint := 0;
  v_profile_onboarding_completed boolean := false;
  v_registration_grade smallint;
  v_student_profile_count bigint := 0;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_normalized_name := btrim(
    regexp_replace(coalesce(p_full_name, ''), '[[:space:]]+', ' ', 'g')
  );

  if char_length(v_normalized_name) not between 2 and 100 then
    raise exception 'Invalid full name';
  end if;

  if p_birth_date is not null and p_birth_date > current_date then
    raise exception 'Invalid birth date';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_current_user_id::text, 0)
  );

  select
    count(*),
    max(p.role),
    coalesce(bool_or(p.onboarding_completed), false),
    max(p.registration_grade)
  into
    v_profile_count,
    v_current_role,
    v_profile_onboarding_completed,
    v_registration_grade
  from public.profiles as p
  where p.user_id = v_current_user_id;

  if
    v_profile_count <> 1
    or v_current_role not in ('STUDENT', 'PARENT')
  then
    raise exception 'Profile unavailable';
  end if;

  -- Completed profiles are immutable through onboarding retries.
  if v_profile_onboarding_completed then
    return;
  end if;

  if v_current_role = 'STUDENT' then
    if
      v_registration_grade is null
      or v_registration_grade not between 1 and 9
    then
      raise exception 'Registration grade unavailable';
    end if;

    -- The parameter remains for API compatibility, but it cannot override the
    -- server-persisted registration grade.
    if p_grade is distinct from v_registration_grade then
      raise exception 'Invalid grade';
    end if;

    update public.student_profiles as sp
    set
      grade = v_registration_grade,
      birth_date = p_birth_date
    where sp.user_id = v_current_user_id;

    get diagnostics v_student_profile_count = row_count;

    if v_student_profile_count = 0 then
      for v_insert_attempt in 1..5 loop
        begin
          insert into public.student_profiles (
            user_id,
            grade,
            birth_date,
            student_code
          )
          values (
            v_current_user_id,
            v_registration_grade,
            p_birth_date,
            private.generate_student_code()
          );
          exit;
        exception
          when unique_violation then
            if v_insert_attempt = 5 then
              raise;
            end if;
        end;
      end loop;
    end if;
  elsif p_grade is not null or p_birth_date is not null then
    raise exception 'Parent onboarding does not accept student fields';
  end if;

  update public.profiles as p
  set
    full_name = v_normalized_name,
    onboarding_completed = true
  where p.user_id = v_current_user_id;
end;
$$;

comment on function public.complete_onboarding(text, smallint, date) is
  'Completes auth.uid() onboarding using the immutable server-persisted registration grade for Students.';

revoke all on function public.complete_onboarding(text, smallint, date)
  from public;
revoke all on function public.complete_onboarding(text, smallint, date)
  from anon;
grant execute on function public.complete_onboarding(text, smallint, date)
  to authenticated;

do $validation$
declare
  v_complete_onboarding_count integer;
  v_complete_onboarding_security_definer boolean;
  v_registration_trigger_count integer;
begin
  if not exists (
    select 1
    from pg_catalog.pg_attribute as a
    where
      a.attrelid = 'public.profiles'::regclass
      and a.attname = 'registration_grade'
      and a.atttypid = 'smallint'::regtype
      and not a.attisdropped
  ) then
    raise exception 'registration_grade column validation failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint as c
    join pg_catalog.pg_attribute as a
      on a.attrelid = c.conrelid
      and a.attname = 'registration_grade'
      and not a.attisdropped
    where
      c.conrelid = 'public.profiles'::regclass
      and c.conname = 'profiles_registration_grade_check'
      and c.contype = 'c'
      and c.convalidated
      and c.conkey = array[a.attnum]
  ) then
    raise exception 'registration_grade constraint validation failed';
  end if;

  if exists (
    select 1
    from public.profiles as p
    where
      p.registration_grade is not null
      and p.registration_grade not between 1 and 9
  ) then
    raise exception 'invalid registration_grade data detected';
  end if;

  select
    count(*),
    coalesce(bool_or(p.prosecdef), false)
  into
    v_complete_onboarding_count,
    v_complete_onboarding_security_definer
  from pg_catalog.pg_proc as p
  where
    p.oid = 'public.complete_onboarding(text,smallint,date)'::regprocedure;

  if
    v_complete_onboarding_count <> 1
    or not v_complete_onboarding_security_definer
  then
    raise exception 'complete_onboarding function validation failed';
  end if;

  select count(*)
  into v_registration_trigger_count
  from pg_catalog.pg_trigger as t
  where
    t.tgrelid = 'auth.users'::regclass
    and t.tgname = 'on_auth_user_created'
    and not t.tgisinternal
    and t.tgenabled <> 'D';

  if v_registration_trigger_count <> 1 then
    raise exception 'auth registration trigger validation failed';
  end if;

  if pg_catalog.pg_get_functiondef(
    'public.handle_new_auth_user()'::regprocedure
  ) not ilike '%registration_grade%' then
    raise exception 'registration grade trigger source validation failed';
  end if;

  if pg_catalog.pg_get_functiondef(
    'public.complete_onboarding(text,smallint,date)'::regprocedure
  ) not ilike '%p_grade is distinct from v_registration_grade%' then
    raise exception 'server-side registration grade guard validation failed';
  end if;
end;
$validation$;

commit;
