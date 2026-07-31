begin;

create function public.get_parent_child_weekly_summary(
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
  v_report_end timestamptz := now();
  v_report_start_date date;
  v_report_end_date date;
  v_report_start timestamptz;
  v_completed_attempt_count bigint := 0;
  v_total_answered bigint := 0;
  v_total_correct bigint := 0;
  v_accuracy_percent numeric;
  v_active_day_count bigint := 0;
  v_completed_goal_count bigint := 0;
  v_last_activity_at timestamptz;
  v_skills jsonb := '[]'::jsonb;
begin
  -- The helper requires auth.uid(), completed onboarding and the PARENT role.
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
    raise exception 'Weekly learning summary unavailable';
  end if;

  -- Seven calendar days in Vietnam, including today. The browser does not
  -- decide the official reporting window.
  v_report_end_date :=
    (v_report_end at time zone 'Asia/Ho_Chi_Minh')::date;
  v_report_start_date := v_report_end_date - 6;
  v_report_start :=
    v_report_start_date::timestamp at time zone 'Asia/Ho_Chi_Minh';

  select count(*)
  into v_completed_attempt_count
  from public.practice_attempts as attempt
  where
    attempt.student_id = v_student_user_id
    and attempt.status = 'COMPLETED'
    and attempt.completed_at >= v_report_start
    and attempt.completed_at <= v_report_end;

  select
    count(*),
    count(*) filter (where answer.is_correct)
  into
    v_total_answered,
    v_total_correct
  from public.practice_answers as answer
  join public.practice_attempts as attempt
    on attempt.id = answer.attempt_id
  where
    attempt.student_id = v_student_user_id
    and attempt.status = 'COMPLETED'
    and attempt.completed_at >= v_report_start
    and attempt.completed_at <= v_report_end;

  v_accuracy_percent := case
    when v_total_answered = 0 then null
    else round(
      v_total_correct::numeric * 100 / v_total_answered::numeric,
      1
    )
  end;

  select count(distinct activity.activity_date)
  into v_active_day_count
  from (
    select
      (answer.answered_at at time zone 'Asia/Ho_Chi_Minh')::date
        as activity_date
    from public.practice_answers as answer
    join public.practice_attempts as attempt
      on attempt.id = answer.attempt_id
    where
      attempt.student_id = v_student_user_id
      and attempt.status = 'COMPLETED'
      and attempt.completed_at >= v_report_start
      and attempt.completed_at <= v_report_end
      and answer.answered_at >= v_report_start
      and answer.answered_at <= v_report_end

    union

    select
      (attempt.completed_at at time zone 'Asia/Ho_Chi_Minh')::date
        as activity_date
    from public.practice_attempts as attempt
    where
      attempt.student_id = v_student_user_id
      and attempt.status = 'COMPLETED'
      and attempt.completed_at >= v_report_start
      and attempt.completed_at <= v_report_end
  ) as activity;

  select count(*)
  into v_completed_goal_count
  from public.learning_goals as goal
  where
    goal.student_id = v_student_user_id
    and goal.status = 'COMPLETED'
    and goal.completed_at >= v_report_start
    and goal.completed_at <= v_report_end;

  select max(activity.activity_at)
  into v_last_activity_at
  from (
    select max(attempt.completed_at) as activity_at
    from public.practice_attempts as attempt
    where
      attempt.student_id = v_student_user_id
      and attempt.status = 'COMPLETED'
      and attempt.completed_at >= v_report_start
      and attempt.completed_at <= v_report_end

    union all

    select max(answer.answered_at) as activity_at
    from public.practice_answers as answer
    join public.practice_attempts as attempt
      on attempt.id = answer.attempt_id
    where
      attempt.student_id = v_student_user_id
      and attempt.status = 'COMPLETED'
      and attempt.completed_at >= v_report_start
      and attempt.completed_at <= v_report_end
      and answer.answered_at >= v_report_start
      and answer.answered_at <= v_report_end
  ) as activity;

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
      and attempt.status = 'COMPLETED'
      and attempt.completed_at >= v_report_start
      and attempt.completed_at <= v_report_end
      and question.skill_code = skill.skill_code
  ) as stats;

  return jsonb_build_object(
    'period', jsonb_build_object(
      'timezone', 'Asia/Ho_Chi_Minh',
      'start_date', v_report_start_date,
      'end_date', v_report_end_date
    ),
    'metrics', jsonb_build_object(
      'completed_attempt_count', v_completed_attempt_count,
      'total_answered', v_total_answered,
      'total_correct', v_total_correct,
      'accuracy_percent', v_accuracy_percent,
      'active_day_count', v_active_day_count,
      'completed_goal_count', v_completed_goal_count,
      'last_activity_at', v_last_activity_at
    ),
    'skills', v_skills
  );
end;
$$;

revoke all on function public.get_parent_child_weekly_summary(uuid)
  from public;
revoke all on function public.get_parent_child_weekly_summary(uuid)
  from anon;
revoke all on function public.get_parent_child_weekly_summary(uuid)
  from authenticated;
grant execute
on function public.get_parent_child_weekly_summary(uuid)
to authenticated;

comment on function public.get_parent_child_weekly_summary(uuid) is
  'Returns a seven-calendar-day, read-only aggregate for an onboarded Parent with an approved owned connection; never returns identities or per-question data.';

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
    and procedure.proname = 'get_parent_child_weekly_summary'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_connection_id uuid';

  if
    v_function_count <> 1
    or not v_function_is_security_definer
    or not v_function_has_safe_search_path
  then
    raise exception 'Parent weekly summary function validation failed';
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
        'public.get_parent_child_weekly_summary(uuid)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  )
  into v_public_can_execute;

  if
    v_public_can_execute
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_parent_child_weekly_summary(uuid)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_parent_child_weekly_summary(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'Parent weekly summary grant validation failed';
  end if;
end;
$validation$;

commit;
