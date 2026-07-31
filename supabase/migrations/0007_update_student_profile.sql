begin;

create function public.update_student_profile(
  p_full_name text,
  p_birth_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_normalized_name text;
  v_profile_count bigint := 0;
  v_current_role text;
  v_onboarding_completed boolean := false;
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
    hashtextextended(v_current_user_id::text, 7)
  );

  select
    count(*),
    max(p.role),
    coalesce(bool_or(p.onboarding_completed), false)
  into
    v_profile_count,
    v_current_role,
    v_onboarding_completed
  from public.profiles as p
  where p.user_id = v_current_user_id;

  if
    v_profile_count <> 1
    or v_current_role <> 'STUDENT'
    or not v_onboarding_completed
  then
    raise exception 'Student profile unavailable';
  end if;

  select count(*)
  into v_student_profile_count
  from public.student_profiles as sp
  where sp.user_id = v_current_user_id;

  if v_student_profile_count <> 1 then
    raise exception 'Student profile unavailable';
  end if;

  -- Avoid changing updated_at when a repeated request contains the same value.
  update public.profiles as p
  set full_name = v_normalized_name
  where
    p.user_id = v_current_user_id
    and p.full_name is distinct from v_normalized_name;

  update public.student_profiles as sp
  set birth_date = p_birth_date
  where
    sp.user_id = v_current_user_id
    and sp.birth_date is distinct from p_birth_date;
end;
$$;

comment on function public.update_student_profile(text, date) is
  'Updates only auth.uid() Student full name and optional birth date after onboarding.';

revoke all on function public.update_student_profile(text, date) from public;
revoke all on function public.update_student_profile(text, date) from anon;
revoke all on function public.update_student_profile(text, date)
  from authenticated;
grant execute on function public.update_student_profile(text, date)
  to authenticated;

do $validation$
declare
  v_function_count integer := 0;
  v_security_definer boolean := false;
  v_safe_search_path boolean := false;
begin
  select
    count(*),
    coalesce(bool_or(p.prosecdef), false),
    coalesce(
      bool_or(
        coalesce(p.proconfig, array[]::text[])
          @> array['search_path=""']::text[]
      ),
      false
    )
  into
    v_function_count,
    v_security_definer,
    v_safe_search_path
  from pg_catalog.pg_proc as p
  where
    p.oid = 'public.update_student_profile(text,date)'::regprocedure
    and p.prorettype = 'void'::regtype;

  if
    v_function_count <> 1
    or not v_security_definer
    or not v_safe_search_path
  then
    raise exception 'update_student_profile function validation failed';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.update_student_profile(text,date)',
    'EXECUTE'
  ) then
    raise exception 'authenticated execute validation failed';
  end if;

  if has_function_privilege(
    'anon',
    'public.update_student_profile(text,date)',
    'EXECUTE'
  ) then
    raise exception 'anon execute revocation validation failed';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as p
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        p.proacl,
        pg_catalog.acldefault('f', p.proowner)
      )
    ) as function_acl
    where
      p.oid = 'public.update_student_profile(text,date)'::regprocedure
      and function_acl.grantee = 0
      and function_acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'public execute revocation validation failed';
  end if;

  if
    has_table_privilege(
      'authenticated',
      'public.profiles',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.student_profiles',
      'UPDATE'
    )
  then
    raise exception 'direct profile update privilege detected';
  end if;
end;
$validation$;

commit;
