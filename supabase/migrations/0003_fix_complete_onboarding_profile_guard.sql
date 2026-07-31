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

  -- Serialize onboarding per user without requiring an UPDATE policy or
  -- relying on PL/pgSQL's special FOUND variable for profile validation.
  perform pg_advisory_xact_lock(
    hashtextextended(v_current_user_id::text, 0)
  );

  select
    count(*),
    max(p.role),
    coalesce(bool_or(p.onboarding_completed), false)
  into
    v_profile_count,
    v_current_role,
    v_profile_onboarding_completed
  from public.profiles as p
  where p.user_id = v_current_user_id;

  if
    v_profile_count <> 1
    or v_current_role not in ('STUDENT', 'PARENT')
  then
    raise exception 'Profile unavailable';
  end if;

  -- A completed profile is immutable through onboarding retries.
  if v_profile_onboarding_completed then
    return;
  end if;

  if v_current_role = 'STUDENT' then
    if p_grade is null or p_grade not between 1 and 9 then
      raise exception 'Invalid grade';
    end if;

    update public.student_profiles as sp
      set grade = p_grade,
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
            p_grade,
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
    set full_name = v_normalized_name,
        onboarding_completed = true
    where p.user_id = v_current_user_id;
end;
$$;

comment on function public.complete_onboarding(text, smallint, date) is
  'Completes auth.uid() onboarding with an explicit aggregate profile guard and per-user transaction lock.';

revoke all on function public.complete_onboarding(text, smallint, date)
  from public;
revoke all on function public.complete_onboarding(text, smallint, date)
  from anon;
grant execute on function public.complete_onboarding(text, smallint, date)
  to authenticated;
