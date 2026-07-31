begin;

create or replace function public.get_parent_child_grade1_completion_summary(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_parent_count bigint := 0;
  v_student_user_id uuid;
  v_total_unit_count integer := 0;
  v_completed_unit_count integer := 0;
  v_completion_percent integer := 0;
  v_units jsonb;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select count(*)
  into v_parent_count
  from public.profiles as profile
  where profile.user_id = v_current_user_id
    and profile.role = 'PARENT'
    and profile.onboarding_completed;

  if v_parent_count <> 1 then
    raise exception 'Learning summary unavailable';
  end if;

  select connection.student_user_id
  into v_student_user_id
  from public.parent_student_connections as connection
  join public.student_profiles as student
    on student.user_id = connection.student_user_id
  where connection.id = p_connection_id
    and connection.parent_user_id = v_current_user_id
    and connection.status = 'APPROVED'
    and student.grade = 1;

  if v_student_user_id is null then
    raise exception 'Learning summary unavailable';
  end if;

  with unit_progress as (
    select
      unit.display_order,
      unit.title,
      exists (
        select 1
        from public.practice_attempts as completed_attempt
        where completed_attempt.student_id = v_student_user_id
          and completed_attempt.unit_slug = unit.slug
          and completed_attempt.status = 'COMPLETED'
      ) as is_completed,
      exists (
        select 1
        from public.practice_attempts as active_attempt
        where active_attempt.student_id = v_student_user_id
          and active_attempt.unit_slug = unit.slug
          and active_attempt.status = 'IN_PROGRESS'
      ) as has_in_progress_attempt,
      (
        unit.prerequisite_unit_slug is null
        or exists (
          select 1
          from public.practice_attempts as prerequisite_attempt
          where prerequisite_attempt.student_id = v_student_user_id
            and prerequisite_attempt.unit_slug =
              unit.prerequisite_unit_slug
            and prerequisite_attempt.status = 'COMPLETED'
        )
      ) as is_unlocked
    from public.learning_units as unit
    where unit.grade = 1
      and unit.published
  ),
  progress_totals as (
    select
      count(*)::integer as total_unit_count,
      count(*) filter (where progress.is_completed)::integer
        as completed_unit_count
    from unit_progress as progress
  )
  select
    totals.total_unit_count,
    totals.completed_unit_count,
    case
      when totals.total_unit_count = 0 then 0
      else pg_catalog.round(
        100.0 * totals.completed_unit_count / totals.total_unit_count
      )::integer
    end,
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'title', progress.title,
        'status', case
          when progress.has_in_progress_attempt then 'IN_PROGRESS'
          when progress.is_completed then 'COMPLETED'
          when progress.is_unlocked then 'AVAILABLE'
          else 'LOCKED'
        end,
        'is_completed', progress.is_completed,
        'has_in_progress_attempt', progress.has_in_progress_attempt
      )
      order by progress.display_order
    )
  into
    v_total_unit_count,
    v_completed_unit_count,
    v_completion_percent,
    v_units
  from unit_progress as progress
  cross join progress_totals as totals
  group by totals.total_unit_count, totals.completed_unit_count;

  if
    v_total_unit_count <> 13
    or v_units is null
    or pg_catalog.jsonb_array_length(v_units) <> 13
  then
    raise exception 'Learning summary unavailable';
  end if;

  return pg_catalog.jsonb_build_object(
    'total_unit_count', v_total_unit_count,
    'completed_unit_count', v_completed_unit_count,
    'completion_percent', v_completion_percent,
    'is_complete', v_completed_unit_count = v_total_unit_count,
    'units', v_units
  );
end;
$$;

revoke all on function public.get_parent_child_grade1_completion_summary(uuid)
  from public;
revoke all on function public.get_parent_child_grade1_completion_summary(uuid)
  from anon;
grant execute
  on function public.get_parent_child_grade1_completion_summary(uuid)
  to authenticated;

do $validation$
declare
  v_grade_one_unit_count bigint := 0;
  v_function_count bigint := 0;
  v_function_is_secure boolean := false;
  v_function_has_safe_search_path boolean := false;
  v_function_definition text;
  v_public_can_execute boolean := false;
begin
  select count(*)
  into v_grade_one_unit_count
  from public.learning_units as unit
  where unit.grade = 1
    and unit.published
    and unit.total_questions = 24;

  if v_grade_one_unit_count <> 13 then
    raise exception 'Grade 1 completion catalog validation failed';
  end if;

  select
    count(*),
    pg_catalog.bool_and(procedure.prosecdef),
    pg_catalog.bool_and(
      procedure.proconfig @> array['search_path=""']::text[]
    ),
    max(pg_catalog.pg_get_functiondef(procedure.oid))
  into
    v_function_count,
    v_function_is_secure,
    v_function_has_safe_search_path,
    v_function_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname =
      'get_parent_child_grade1_completion_summary'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid) =
      'p_connection_id uuid';

  if
    v_function_count <> 1
    or not v_function_is_secure
    or not v_function_has_safe_search_path
    or v_function_definition is null
    or pg_catalog.strpos(
      v_function_definition,
      'auth.uid()'
    ) = 0
    or pg_catalog.strpos(
      v_function_definition,
      'question_solutions'
    ) <> 0
    or pg_catalog.strpos(
      v_function_definition,
      'practice_answers'
    ) <> 0
    or pg_catalog.strpos(
      v_function_definition,
      'diagnostic_answers'
    ) <> 0
  then
    raise exception 'Grade 1 completion RPC security validation failed';
  end if;

  select exists (
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
        'public.get_parent_child_grade1_completion_summary(uuid)'
          ::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  )
  into v_public_can_execute;

  if
    v_public_can_execute
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_parent_child_grade1_completion_summary(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_parent_child_grade1_completion_summary(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'Grade 1 completion RPC grant validation failed';
  end if;
end;
$validation$;

commit;
