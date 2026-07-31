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
  current_user_id uuid := auth.uid();
  current_role text;
  normalized_name text;
  insert_attempt smallint;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  normalized_name := btrim(
    regexp_replace(coalesce(p_full_name, ''), '[[:space:]]+', ' ', 'g')
  );

  if char_length(normalized_name) not between 2 and 100 then
    raise exception 'Invalid full name';
  end if;

  if p_birth_date is not null and p_birth_date > current_date then
    raise exception 'Invalid birth date';
  end if;

  -- Serialize onboarding per user without SELECT FOR UPDATE. Row-locking SELECT
  -- also invokes UPDATE RLS policies, while profiles intentionally has no
  -- client UPDATE policy.
  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text, 0)
  );

  select role
    into current_role
    from public.profiles
    where user_id = current_user_id;

  if not found or current_role not in ('STUDENT', 'PARENT') then
    raise exception 'Profile unavailable';
  end if;

  if current_role = 'STUDENT' then
    if p_grade is null or p_grade not between 1 and 9 then
      raise exception 'Invalid grade';
    end if;

    update public.student_profiles
      set grade = p_grade,
          birth_date = p_birth_date
      where user_id = current_user_id;

    if not found then
      for insert_attempt in 1..5 loop
        begin
          insert into public.student_profiles (
            user_id,
            grade,
            birth_date,
            student_code
          )
          values (
            current_user_id,
            p_grade,
            p_birth_date,
            private.generate_student_code()
          );
          exit;
        exception
          when unique_violation then
            if insert_attempt = 5 then
              raise;
            end if;
        end;
      end loop;
    end if;
  elsif p_grade is not null or p_birth_date is not null then
    raise exception 'Parent onboarding does not accept student fields';
  end if;

  update public.profiles
    set full_name = normalized_name,
        onboarding_completed = true
    where user_id = current_user_id;
end;
$$;

comment on function public.complete_onboarding(text, smallint, date) is
  'Completes only auth.uid() onboarding; serializes per user without requiring a client UPDATE policy on profiles.';

revoke all on function public.complete_onboarding(text, smallint, date)
  from public;
revoke all on function public.complete_onboarding(text, smallint, date)
  from anon;
grant execute on function public.complete_onboarding(text, smallint, date)
  to authenticated;
