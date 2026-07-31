begin;

create function public.get_parent_child_learning_dashboard(
  p_connection_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_connection_count bigint := 0;
  v_student_user_id uuid;
  v_student_count bigint := 0;
  v_student_name text;
  v_student_grade smallint;
  v_completed_attempt_count bigint := 0;
  v_total_answered bigint := 0;
  v_total_correct bigint := 0;
  v_average_accuracy numeric;
  v_last_activity_at timestamptz;
  v_current_practice jsonb;
  v_skills jsonb := '[]'::jsonb;
  v_recent_attempts jsonb := '[]'::jsonb;
  v_goals jsonb := '[]'::jsonb;
begin
  -- This helper requires auth.uid(), an onboarded profile and the PARENT role.
  v_parent_user_id := private.require_connection_actor('PARENT');

  select
    count(*),
    max(connection.student_user_id::text)::uuid
  into
    v_connection_count,
    v_student_user_id
  from public.parent_student_connections as connection
  where
    connection.id = p_connection_id
    and connection.parent_user_id = v_parent_user_id
    and connection.status = 'APPROVED';

  if v_connection_count <> 1 or v_student_user_id is null then
    raise exception 'Learning dashboard unavailable';
  end if;

  select
    count(*),
    coalesce(max(profile.full_name), 'Học sinh'),
    max(student.grade)
  into
    v_student_count,
    v_student_name,
    v_student_grade
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where
    profile.user_id = v_student_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;

  if
    v_student_count <> 1
    or v_student_grade is null
  then
    raise exception 'Learning dashboard unavailable';
  end if;

  select count(*)
  into v_completed_attempt_count
  from public.practice_attempts as attempt
  where
    attempt.student_id = v_student_user_id
    and attempt.status = 'COMPLETED';

  select
    count(*),
    count(*) filter (where answer.is_correct)
  into
    v_total_answered,
    v_total_correct
  from public.practice_answers as answer
  join public.practice_attempts as attempt
    on attempt.id = answer.attempt_id
  where attempt.student_id = v_student_user_id;

  v_average_accuracy := case
    when v_total_answered = 0 then null
    else round(
      v_total_correct::numeric * 100 / v_total_answered::numeric,
      1
    )
  end;

  select max(activity.activity_at)
  into v_last_activity_at
  from (
    select max(attempt.updated_at) as activity_at
    from public.practice_attempts as attempt
    where attempt.student_id = v_student_user_id

    union all

    select max(answer.answered_at) as activity_at
    from public.practice_answers as answer
    join public.practice_attempts as attempt
      on attempt.id = answer.attempt_id
    where attempt.student_id = v_student_user_id
  ) as activity;

  select jsonb_build_object(
    'unit_title', unit.title,
    'answered_count', attempt.answered_count,
    'total_questions', attempt.total_questions,
    'correct_count', attempt.correct_count,
    'updated_at', attempt.updated_at
  )
  into v_current_practice
  from public.practice_attempts as attempt
  join public.learning_units as unit
    on unit.slug = attempt.unit_slug
  where
    attempt.student_id = v_student_user_id
    and attempt.status = 'IN_PROGRESS'
  order by
    attempt.updated_at desc,
    attempt.started_at desc,
    attempt.id desc
  limit 1;

  with skill_catalog (
    skill_code,
    display_order
  ) as (
    values
      ('COUNT_RECOGNIZE'::text, 1),
      ('READ_WRITE_MATCH'::text, 2),
      ('SEQUENCE_COMPARE_ORDER'::text, 3),
      ('COMPOSE_DECOMPOSE'::text, 4)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'skill_code', skill.skill_code,
        'answered_count', stats.answered_count,
        'correct_count', stats.correct_count,
        'accuracy_percent', case
          when stats.answered_count = 0 then null
          else round(
            stats.correct_count::numeric
            * 100
            / stats.answered_count::numeric,
            1
          )
        end
      )
      order by skill.display_order
    ),
    '[]'::jsonb
  )
  into v_skills
  from skill_catalog as skill
  cross join lateral (
    select
      count(*) as answered_count,
      count(*) filter (where answer.is_correct) as correct_count
    from public.practice_answers as answer
    join public.practice_attempts as attempt
      on attempt.id = answer.attempt_id
    join public.questions as question
      on question.code = answer.question_id
    where
      attempt.student_id = v_student_user_id
      and question.skill_code = skill.skill_code
  ) as stats;

  with numbered_attempts as (
    select
      attempt.unit_slug,
      attempt.status,
      attempt.total_questions,
      attempt.answered_count,
      attempt.correct_count,
      attempt.started_at,
      attempt.completed_at,
      attempt.updated_at,
      row_number() over (
        partition by attempt.unit_slug
        order by attempt.started_at, attempt.id
      ) as attempt_number
    from public.practice_attempts as attempt
    where attempt.student_id = v_student_user_id
  )
  select coalesce(
    jsonb_agg(
      recent.item
      order by recent.activity_at desc, recent.started_at desc
    ),
    '[]'::jsonb
  )
  into v_recent_attempts
  from (
    select
      coalesce(numbered.completed_at, numbered.updated_at) as activity_at,
      numbered.started_at,
      jsonb_build_object(
        'unit_title', unit.title,
        'attempt_number', numbered.attempt_number,
        'status', numbered.status,
        'answered_count', numbered.answered_count,
        'total_questions', numbered.total_questions,
        'correct_count', numbered.correct_count,
        'accuracy_percent', case
          when numbered.answered_count = 0 then null
          else round(
            numbered.correct_count::numeric
            * 100
            / numbered.answered_count::numeric,
            1
          )
        end,
        'activity_at', coalesce(
          numbered.completed_at,
          numbered.updated_at
        ),
        'completed_at', numbered.completed_at
      ) as item
    from numbered_attempts as numbered
    join public.learning_units as unit
      on unit.slug = numbered.unit_slug
    order by
      coalesce(numbered.completed_at, numbered.updated_at) desc,
      numbered.started_at desc
    limit 5
  ) as recent;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', goal.title,
        'target_count', goal.target_count,
        'target_date', goal.target_date,
        'status', goal.status,
        'completed_at', goal.completed_at
      )
      order by
        case when goal.status = 'ACTIVE' then 0 else 1 end,
        coalesce(goal.completed_at, goal.created_at) desc
    ),
    '[]'::jsonb
  )
  into v_goals
  from public.learning_goals as goal
  where
    goal.student_id = v_student_user_id
    and goal.status in ('ACTIVE', 'COMPLETED');

  return jsonb_build_object(
    'student', jsonb_build_object(
      'display_name', v_student_name,
      'grade', v_student_grade
    ),
    'summary', jsonb_build_object(
      'completed_attempt_count', v_completed_attempt_count,
      'total_answered', v_total_answered,
      'total_correct', v_total_correct,
      'average_accuracy_percent', v_average_accuracy,
      'last_activity_at', v_last_activity_at
    ),
    'current_practice', v_current_practice,
    'skills', v_skills,
    'recent_attempts', v_recent_attempts,
    'goals', v_goals
  );
end;
$$;

revoke all on function public.get_parent_child_learning_dashboard(uuid)
  from public;
revoke all on function public.get_parent_child_learning_dashboard(uuid)
  from anon;
revoke all on function public.get_parent_child_learning_dashboard(uuid)
  from authenticated;
grant execute
on function public.get_parent_child_learning_dashboard(uuid)
to authenticated;

comment on function public.get_parent_child_learning_dashboard(uuid) is
  'Returns read-only aggregate learning data only for an onboarded Parent with an approved owned connection; never returns identities, answers, solutions or question IDs.';

do $validation$
declare
  v_function_count integer := 0;
  v_function_is_security_definer boolean := false;
  v_function_has_safe_search_path boolean := false;
  v_public_can_execute boolean := false;
begin
  select
    count(*),
    coalesce(bool_and(procedure.prosecdef), false),
    coalesce(
      bool_and(
        procedure.proconfig @> array['search_path=""']::text[]
      ),
      false
    )
  into
    v_function_count,
    v_function_is_security_definer,
    v_function_has_safe_search_path
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname = 'get_parent_child_learning_dashboard'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_connection_id uuid';

  if
    v_function_count <> 1
    or not v_function_is_security_definer
    or not v_function_has_safe_search_path
  then
    raise exception 'Parent learning dashboard function validation failed';
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
        'public.get_parent_child_learning_dashboard(uuid)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  )
  into v_public_can_execute;

  if
    v_public_can_execute
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_parent_child_learning_dashboard(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_parent_child_learning_dashboard(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'Parent learning dashboard grant validation failed';
  end if;
end;
$validation$;

commit;
