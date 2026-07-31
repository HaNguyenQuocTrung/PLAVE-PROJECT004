begin;

create function public.get_teacher_class_gradebook(
  p_classroom_id uuid,
  p_assignment_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_classroom jsonb;
  v_assignments jsonb := '[]'::jsonb;
  v_selected_assignment_id uuid;
  v_selected_assignment jsonb;
  v_students jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select jsonb_build_object(
    'classroom_name', classroom.name,
    'grade', classroom.grade,
    'student_count', (
      select count(*)
      from public.classroom_memberships as membership
      where
        membership.classroom_id = classroom.id
        and membership.status = 'APPROVED'
    )
  )
  into v_classroom
  from public.classrooms as classroom
  where
    classroom.id = p_classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE';

  if v_classroom is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assignment_id', assignment.id,
        'title', assignment.title,
        'status', assignment.status,
        'total_count', assignment.total_count,
        'published_at', assignment.published_at,
        'due_at', assignment.due_at,
        'submitted_count', (
          select count(*)
          from public.assignment_submissions as submission
          join public.classroom_memberships as membership
            on membership.classroom_id = assignment.classroom_id
            and membership.student_id = submission.student_id
            and membership.status = 'APPROVED'
          where
            submission.assignment_id = assignment.id
            and submission.status = 'SUBMITTED'
        )
      )
      order by assignment.published_at desc, assignment.id
    ),
    '[]'::jsonb
  )
  into v_assignments
  from public.teacher_assignments as assignment
  where
    assignment.classroom_id = p_classroom_id
    and assignment.teacher_id = v_teacher_user_id;

  if p_assignment_id is null then
    select assignment.id
    into v_selected_assignment_id
    from public.teacher_assignments as assignment
    where
      assignment.classroom_id = p_classroom_id
      and assignment.teacher_id = v_teacher_user_id
    order by assignment.published_at desc, assignment.id
    limit 1;
  else
    select assignment.id
    into v_selected_assignment_id
    from public.teacher_assignments as assignment
    where
      assignment.id = p_assignment_id
      and assignment.classroom_id = p_classroom_id
      and assignment.teacher_id = v_teacher_user_id;

    if v_selected_assignment_id is null then
      return null;
    end if;
  end if;

  if v_selected_assignment_id is not null then
    select jsonb_build_object(
      'assignment_id', assignment.id,
      'title', assignment.title,
      'status', assignment.status,
      'total_count', assignment.total_count,
      'published_at', assignment.published_at,
      'due_at', assignment.due_at
    )
    into v_selected_assignment
    from public.teacher_assignments as assignment
    where
      assignment.id = v_selected_assignment_id
      and assignment.classroom_id = p_classroom_id
      and assignment.teacher_id = v_teacher_user_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'student_display_name',
            coalesce(nullif(btrim(profile.full_name), ''), 'Học sinh'),
          'submission_status',
            coalesce(submission.status, 'NOT_STARTED'),
          'answered_count',
            coalesce(submission.answered_count, 0),
          'total_count',
            assignment.total_count,
          'correct_count',
            case
              when submission.status = 'SUBMITTED'
                then submission.correct_count
              else null
            end,
          'score_percent',
            case
              when submission.status = 'SUBMITTED'
                then submission.score_percent
              else null
            end,
          'submitted_at',
            case
              when submission.status = 'SUBMITTED'
                then submission.submitted_at
              else null
            end
        )
        order by profile.full_name, membership.requested_at
      ),
      '[]'::jsonb
    )
    into v_students
    from public.teacher_assignments as assignment
    join public.classroom_memberships as membership
      on membership.classroom_id = assignment.classroom_id
      and membership.status = 'APPROVED'
    join public.profiles as profile
      on profile.user_id = membership.student_id
    left join public.assignment_submissions as submission
      on submission.assignment_id = assignment.id
      and submission.student_id = membership.student_id
    where
      assignment.id = v_selected_assignment_id
      and assignment.classroom_id = p_classroom_id
      and assignment.teacher_id = v_teacher_user_id;
  end if;

  return jsonb_build_object(
    'classroom', v_classroom,
    'assignments', v_assignments,
    'selected_assignment', v_selected_assignment,
    'students', v_students
  );
end;
$$;

create function public.get_teacher_assignment_analysis(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_classroom_id uuid;
  v_assignment jsonb;
  v_student_count bigint := 0;
  v_not_started_count bigint := 0;
  v_in_progress_count bigint := 0;
  v_submitted_count bigint := 0;
  v_average_score_percent numeric(5, 2);
  v_completion_rate numeric(5, 2);
  v_questions jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select
    assignment.classroom_id,
    jsonb_build_object(
      'assignment_title', assignment.title,
      'classroom_name', classroom.name,
      'grade', classroom.grade,
      'status', assignment.status,
      'total_count', assignment.total_count,
      'published_at', assignment.published_at,
      'due_at', assignment.due_at
    )
  into
    v_classroom_id,
    v_assignment
  from public.teacher_assignments as assignment
  join public.classrooms as classroom
    on classroom.id = assignment.classroom_id
  where
    assignment.id = p_assignment_id
    and assignment.teacher_id = v_teacher_user_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE';

  if v_assignment is null or v_classroom_id is null then
    return null;
  end if;

  select
    count(*),
    count(*) filter (where submission.id is null),
    count(*) filter (where submission.status = 'IN_PROGRESS'),
    count(*) filter (where submission.status = 'SUBMITTED'),
    round(
      avg(submission.score_percent)
        filter (where submission.status = 'SUBMITTED'),
      2
    )
  into
    v_student_count,
    v_not_started_count,
    v_in_progress_count,
    v_submitted_count,
    v_average_score_percent
  from public.classroom_memberships as membership
  left join public.assignment_submissions as submission
    on submission.assignment_id = p_assignment_id
    and submission.student_id = membership.student_id
  where
    membership.classroom_id = v_classroom_id
    and membership.status = 'APPROVED';

  v_completion_rate := case
    when v_student_count = 0 then null
    else round((v_submitted_count::numeric * 100) / v_student_count, 2)
  end;

  with question_statistics as (
    select
      item.display_order,
      question.question_type,
      question.prompt,
      count(answer.question_id) as answered_count,
      count(answer.question_id)
        filter (where answer.is_correct) as correct_count,
      count(answer.question_id)
        filter (where answer.is_correct = false) as incorrect_count
    from public.teacher_assignment_items as item
    join public.teacher_questions as question
      on question.id = item.question_id
    left join public.classroom_memberships as membership
      on membership.classroom_id = v_classroom_id
      and membership.status = 'APPROVED'
    left join public.assignment_submissions as submission
      on submission.assignment_id = p_assignment_id
      and submission.student_id = membership.student_id
      and submission.status = 'SUBMITTED'
    left join public.assignment_answers as answer
      on answer.submission_id = submission.id
      and answer.question_id = item.question_id
      and answer.is_correct is not null
    where item.assignment_id = p_assignment_id
    group by
      item.display_order,
      question.question_type,
      question.prompt
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'display_order', statistic.display_order,
        'question_type', statistic.question_type,
        'prompt', statistic.prompt,
        'answered_count', statistic.answered_count,
        'correct_count', statistic.correct_count,
        'incorrect_count', statistic.incorrect_count,
        'accuracy_percent',
          case
            when statistic.answered_count = 0 then null
            else round(
              (
                statistic.correct_count::numeric
                * 100
              ) / statistic.answered_count,
              2
            )
          end,
        'insight_status',
          case
            when v_submitted_count < 3 then 'INSUFFICIENT_DATA'
            when statistic.answered_count = 0 then 'INSUFFICIENT_DATA'
            when (
              statistic.correct_count::numeric
              * 100
            ) / statistic.answered_count < 50 then 'NEEDS_REVIEW'
            else 'ON_TRACK'
          end
      )
      order by
        statistic.incorrect_count desc,
        statistic.display_order
    ),
    '[]'::jsonb
  )
  into v_questions
  from question_statistics as statistic;

  return jsonb_build_object(
    'assignment', v_assignment,
    'student_count', v_student_count,
    'not_started_count', v_not_started_count,
    'in_progress_count', v_in_progress_count,
    'submitted_count', v_submitted_count,
    'average_score_percent', v_average_score_percent,
    'completion_rate', v_completion_rate,
    'minimum_submissions_for_insight', 3,
    'review_accuracy_threshold', 50,
    'questions', v_questions
  );
end;
$$;

revoke all
on function public.get_teacher_class_gradebook(uuid, uuid)
from public;
revoke all
on function public.get_teacher_class_gradebook(uuid, uuid)
from anon;
revoke all
on function public.get_teacher_class_gradebook(uuid, uuid)
from authenticated;
grant execute
on function public.get_teacher_class_gradebook(uuid, uuid)
to authenticated;

revoke all
on function public.get_teacher_assignment_analysis(uuid)
from public;
revoke all
on function public.get_teacher_assignment_analysis(uuid)
from anon;
revoke all
on function public.get_teacher_assignment_analysis(uuid)
from authenticated;
grant execute
on function public.get_teacher_assignment_analysis(uuid)
to authenticated;

comment on function public.get_teacher_class_gradebook(uuid, uuid) is
  'Read-only Teacher-owned class gradebook for current APPROVED members.';
comment on function public.get_teacher_assignment_analysis(uuid) is
  'Read-only aggregate analytics over SUBMITTED work by current APPROVED members.';

do $validation$
declare
  v_function_count integer := 0;
  v_security_definer_count integer := 0;
  v_safe_search_path_count integer := 0;
  v_sensitive_output_count integer := 0;
begin
  select
    count(*),
    count(*) filter (where procedure.prosecdef),
    count(*) filter (
      where coalesce(
        procedure.proconfig,
        array[]::text[]
      ) @> array['search_path=""']::text[]
    ),
    count(*) filter (
      where
        pg_catalog.pg_get_functiondef(procedure.oid)
          ~ '\m(normalized_answer|correct_answer|solution_steps)\M'
    )
  into
    v_function_count,
    v_security_definer_count,
    v_safe_search_path_count,
    v_sensitive_output_count
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'public'::regnamespace
    and procedure.proname in (
      'get_teacher_class_gradebook',
      'get_teacher_assignment_analysis'
    );

  if
    v_function_count <> 2
    or v_security_definer_count <> 2
    or v_safe_search_path_count <> 2
    or v_sensitive_output_count <> 0
  then
    raise exception 'Teacher gradebook RPC validation failed';
  end if;

  if
    not has_function_privilege(
      'authenticated',
      'public.get_teacher_class_gradebook(uuid,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.get_teacher_assignment_analysis(uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.get_teacher_class_gradebook(uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.get_teacher_assignment_analysis(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'Teacher gradebook function grant validation failed';
  end if;

  if
    has_table_privilege(
      'authenticated',
      'public.teacher_question_solutions',
      'SELECT'
    )
    or has_table_privilege(
      'authenticated',
      'public.assignment_answers',
      'SELECT'
    )
  then
    raise exception 'Sensitive assignment table privilege detected';
  end if;
end;
$validation$;

commit;
