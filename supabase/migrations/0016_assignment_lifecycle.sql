begin;

create or replace function private.enforce_teacher_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.classrooms as classroom
      join public.teacher_profiles as teacher
        on teacher.user_id = classroom.teacher_id
      join public.profiles as profile
        on profile.user_id = teacher.user_id
      where
        classroom.id = new.classroom_id
        and classroom.teacher_id = new.teacher_id
        and classroom.status = 'ACTIVE'
        and teacher.activation_status = 'ACTIVE'
        and profile.role = 'TEACHER'
        and profile.onboarding_completed
    )
    into v_owner_valid;

    if not v_owner_valid or new.status <> 'PUBLISHED' then
      raise exception 'Assignment owner unavailable';
    end if;
    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.teacher_id is distinct from old.teacher_id
    or new.classroom_id is distinct from old.classroom_id
    or new.creation_request_id is distinct from old.creation_request_id
    or new.title is distinct from old.title
    or new.instructions is distinct from old.instructions
    or new.total_count is distinct from old.total_count
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Published assignment cannot change';
  end if;

  if old.status = new.status then
    if
      (
        new.status = 'PUBLISHED'
        and new.closed_at is not null
      )
      or (
        new.status = 'CLOSED'
        and new.closed_at is distinct from old.closed_at
      )
    then
      raise exception 'Invalid assignment state';
    end if;
    return new;
  end if;

  if
    old.status = 'PUBLISHED'
    and new.status = 'CLOSED'
    and new.closed_at is not null
  then
    return new;
  end if;

  if
    old.status = 'CLOSED'
    and new.status = 'PUBLISHED'
    and new.closed_at is null
  then
    return new;
  end if;

  raise exception 'Invalid assignment transition';
end;
$$;

create or replace function public.get_my_teacher_assignments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_now timestamptz := now();
  v_assignments jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assignment_id', assignment.id,
        'classroom_name', classroom.name,
        'grade', classroom.grade,
        'title', assignment.title,
        'instructions', assignment.instructions,
        'due_at', assignment.due_at,
        'status', assignment.status,
        'effective_state',
          case
            when assignment.status = 'CLOSED' then 'CLOSED'
            when assignment.due_at is not null
              and assignment.due_at <= v_now then 'OVERDUE'
            else 'OPEN'
          end,
        'total_count', assignment.total_count,
        'published_at', assignment.published_at,
        'closed_at', assignment.closed_at,
        'server_now', v_now,
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
        ),
        'in_progress_count', (
          select count(*)
          from public.assignment_submissions as submission
          join public.classroom_memberships as membership
            on membership.classroom_id = assignment.classroom_id
            and membership.student_id = submission.student_id
            and membership.status = 'APPROVED'
          where
            submission.assignment_id = assignment.id
            and submission.status = 'IN_PROGRESS'
        ),
        'not_started_count', (
          select count(*)
          from public.classroom_memberships as membership
          where
            membership.classroom_id = assignment.classroom_id
            and membership.status = 'APPROVED'
            and not exists (
              select 1
              from public.assignment_submissions as submission
              where
                submission.assignment_id = assignment.id
                and submission.student_id = membership.student_id
            )
        ),
        'student_count', (
          select count(*)
          from public.classroom_memberships as membership
          where
            membership.classroom_id = assignment.classroom_id
            and membership.status = 'APPROVED'
        )
      )
      order by assignment.published_at desc, assignment.id
    ),
    '[]'::jsonb
  )
  into v_assignments
  from public.teacher_assignments as assignment
  join public.classrooms as classroom
    on classroom.id = assignment.classroom_id
  where assignment.teacher_id = v_teacher_user_id;

  return jsonb_build_object('assignments', v_assignments);
end;
$$;

create or replace function public.get_teacher_assignment_roster(
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
  v_now timestamptz := now();
  v_assignment jsonb;
  v_students jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select jsonb_build_object(
    'assignment_id', assignment.id,
    'classroom_name', classroom.name,
    'grade', classroom.grade,
    'title', assignment.title,
    'instructions', assignment.instructions,
    'due_at', assignment.due_at,
    'status', assignment.status,
    'effective_state',
      case
        when assignment.status = 'CLOSED' then 'CLOSED'
        when assignment.due_at is not null
          and assignment.due_at <= v_now then 'OVERDUE'
        else 'OPEN'
      end,
    'total_count', assignment.total_count,
    'published_at', assignment.published_at,
    'closed_at', assignment.closed_at,
    'server_now', v_now
  )
  into v_assignment
  from public.teacher_assignments as assignment
  join public.classrooms as classroom
    on classroom.id = assignment.classroom_id
  where
    assignment.id = p_assignment_id
    and assignment.teacher_id = v_teacher_user_id;

  if v_assignment is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'student_display_name', profile.full_name,
        'grade', student.grade,
        'submission_status', coalesce(submission.status, 'NOT_STARTED'),
        'answered_count', coalesce(submission.answered_count, 0),
        'correct_count', submission.correct_count,
        'total_count', assignment.total_count,
        'score_percent', submission.score_percent,
        'submitted_at', submission.submitted_at
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
  join public.student_profiles as student
    on student.user_id = membership.student_id
  join public.profiles as profile
    on profile.user_id = membership.student_id
  left join public.assignment_submissions as submission
    on submission.assignment_id = assignment.id
    and submission.student_id = membership.student_id
  where
    assignment.id = p_assignment_id
    and assignment.teacher_id = v_teacher_user_id;

  return jsonb_build_object(
    'assignment', v_assignment,
    'students', v_students
  );
end;
$$;

create or replace function public.get_my_student_assignments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_now timestamptz := now();
  v_assignments jsonb := '[]'::jsonb;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assignment_id', assignment.id,
        'classroom_name', classroom.name,
        'teacher_display_name', teacher.full_name,
        'title', assignment.title,
        'instructions', assignment.instructions,
        'due_at', assignment.due_at,
        'status', assignment.status,
        'effective_state',
          case
            when assignment.status = 'CLOSED' then 'CLOSED'
            when assignment.due_at is not null
              and assignment.due_at <= v_now then 'OVERDUE'
            else 'OPEN'
          end,
        'closed_at', assignment.closed_at,
        'server_now', v_now,
        'total_count', assignment.total_count,
        'published_at', assignment.published_at,
        'submission_status', coalesce(submission.status, 'NOT_STARTED'),
        'answered_count', coalesce(submission.answered_count, 0),
        'correct_count', submission.correct_count,
        'score_percent', submission.score_percent,
        'submitted_at', submission.submitted_at
      )
      order by assignment.published_at desc, assignment.id
    ),
    '[]'::jsonb
  )
  into v_assignments
  from public.teacher_assignments as assignment
  join public.classrooms as classroom
    on classroom.id = assignment.classroom_id
  join public.teacher_profiles as teacher
    on teacher.user_id = assignment.teacher_id
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  left join public.assignment_submissions as submission
    on submission.assignment_id = assignment.id
    and submission.student_id = v_student_user_id
  where assignment.status in ('PUBLISHED', 'CLOSED');

  return jsonb_build_object('assignments', v_assignments);
end;
$$;

create or replace function public.start_or_resume_assignment_submission(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_total_count smallint;
  v_submission_id uuid;
  v_status text;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
  perform pg_advisory_xact_lock(
    hashtextextended('teacher-assignment:' || p_assignment_id::text, 0)
  );

  select assignment.total_count
  into v_total_count
  from public.teacher_assignments as assignment
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  where
    assignment.id = p_assignment_id
    and assignment.status = 'PUBLISHED'
    and (
      assignment.due_at is null
      or assignment.due_at > now()
    );

  if v_total_count is null then
    raise exception 'Assignment unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'assignment-submission:'
      || p_assignment_id::text
      || ':'
      || v_student_user_id::text,
      0
    )
  );

  select submission.id, submission.status
  into v_submission_id, v_status
  from public.assignment_submissions as submission
  where
    submission.assignment_id = p_assignment_id
    and submission.student_id = v_student_user_id;

  if v_submission_id is null then
    insert into public.assignment_submissions (
      assignment_id,
      student_id,
      total_count
    )
    values (
      p_assignment_id,
      v_student_user_id,
      v_total_count
    )
    returning id, status
    into v_submission_id, v_status;
  end if;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'assignment_id', p_assignment_id,
    'status', v_status
  );
end;
$$;

create or replace function public.get_assignment_submission_state(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_now timestamptz := now();
  v_submission_id uuid;
  v_submission_status text;
  v_assignment jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_answered_count smallint;
  v_total_count smallint;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select
    submission.id,
    submission.status,
    submission.answered_count,
    submission.total_count,
    jsonb_build_object(
      'assignment_id', assignment.id,
      'classroom_name', classroom.name,
      'teacher_display_name', teacher.full_name,
      'title', assignment.title,
      'instructions', assignment.instructions,
      'due_at', assignment.due_at,
      'status', assignment.status,
      'effective_state',
        case
          when assignment.status = 'CLOSED' then 'CLOSED'
          when assignment.due_at is not null
            and assignment.due_at <= v_now then 'OVERDUE'
          else 'OPEN'
        end,
      'closed_at', assignment.closed_at,
      'server_now', v_now,
      'total_count', assignment.total_count,
      'published_at', assignment.published_at
    )
  into
    v_submission_id,
    v_submission_status,
    v_answered_count,
    v_total_count,
    v_assignment
  from public.assignment_submissions as submission
  join public.teacher_assignments as assignment
    on assignment.id = submission.assignment_id
  join public.classrooms as classroom
    on classroom.id = assignment.classroom_id
  join public.teacher_profiles as teacher
    on teacher.user_id = assignment.teacher_id
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  where
    submission.assignment_id = p_assignment_id
    and submission.student_id = v_student_user_id;

  if v_submission_id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', question.id,
        'display_order', item.display_order,
        'question_type', question.question_type,
        'prompt', question.prompt,
        'options', question.options,
        'draft_answer', answer.normalized_answer
      )
      order by item.display_order
    ),
    '[]'::jsonb
  )
  into v_questions
  from public.teacher_assignment_items as item
  join public.teacher_questions as question
    on question.id = item.question_id
  left join public.assignment_answers as answer
    on answer.submission_id = v_submission_id
    and answer.question_id = question.id
  where item.assignment_id = p_assignment_id;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'submission_status', v_submission_status,
    'answered_count', v_answered_count,
    'total_count', v_total_count,
    'assignment', v_assignment,
    'questions', v_questions
  );
end;
$$;

create or replace function public.save_assignment_draft_answer(
  p_submission_id uuid,
  p_question_id uuid,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_assignment_id uuid;
  v_question_type text;
  v_normalized_answer text;
  v_answered_count smallint;
  v_total_count smallint;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select submission.assignment_id
  into v_assignment_id
  from public.assignment_submissions as submission
  where
    submission.id = p_submission_id
    and submission.student_id = v_student_user_id;

  if v_assignment_id is null then
    raise exception 'Assignment unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('teacher-assignment:' || v_assignment_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('assignment-submission:' || p_submission_id::text, 0)
  );

  select
    question.question_type,
    submission.total_count
  into
    v_question_type,
    v_total_count
  from public.assignment_submissions as submission
  join public.teacher_assignments as assignment
    on assignment.id = submission.assignment_id
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  join public.teacher_assignment_items as item
    on item.assignment_id = assignment.id
    and item.question_id = p_question_id
  join public.teacher_questions as question
    on question.id = item.question_id
  where
    submission.id = p_submission_id
    and submission.student_id = v_student_user_id
    and submission.status = 'IN_PROGRESS'
    and assignment.status = 'PUBLISHED'
    and (
      assignment.due_at is null
      or assignment.due_at > now()
    );

  if v_question_type is null then
    raise exception 'Assignment unavailable';
  end if;

  v_normalized_answer := private.normalize_assignment_answer(
    v_question_type,
    p_answer
  );

  insert into public.assignment_answers (
    submission_id,
    question_id,
    normalized_answer
  )
  values (
    p_submission_id,
    p_question_id,
    v_normalized_answer
  )
  on conflict (submission_id, question_id)
  do update set
    normalized_answer = excluded.normalized_answer,
    saved_at = now();

  select count(*)::smallint
  into v_answered_count
  from public.assignment_answers as answer
  where answer.submission_id = p_submission_id;

  update public.assignment_submissions as submission
  set answered_count = v_answered_count
  where
    submission.id = p_submission_id
    and submission.student_id = v_student_user_id
    and submission.status = 'IN_PROGRESS';

  return jsonb_build_object(
    'question_id', p_question_id,
    'normalized_answer', v_normalized_answer,
    'answered_count', v_answered_count,
    'total_count', v_total_count
  );
end;
$$;

create or replace function public.submit_assignment_submission(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_assignment_id uuid;
  v_status text;
  v_total_count smallint;
  v_answered_count smallint;
  v_correct_count smallint;
  v_score_percent numeric(5, 2);
  v_submitted_at timestamptz;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select submission.assignment_id
  into v_assignment_id
  from public.assignment_submissions as submission
  where
    submission.id = p_submission_id
    and submission.student_id = v_student_user_id;

  if v_assignment_id is null then
    raise exception 'Assignment unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('teacher-assignment:' || v_assignment_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('assignment-submission:' || p_submission_id::text, 0)
  );

  select
    submission.status,
    submission.total_count,
    submission.answered_count,
    submission.correct_count,
    submission.score_percent,
    submission.submitted_at
  into
    v_status,
    v_total_count,
    v_answered_count,
    v_correct_count,
    v_score_percent,
    v_submitted_at
  from public.assignment_submissions as submission
  where
    submission.id = p_submission_id
    and submission.student_id = v_student_user_id;

  if v_status is null then
    raise exception 'Assignment unavailable';
  end if;

  if v_status = 'SUBMITTED' then
    return jsonb_build_object(
      'status', v_status,
      'correct_count', v_correct_count,
      'total_count', v_total_count,
      'score_percent', v_score_percent,
      'submitted_at', v_submitted_at
    );
  end if;

  if not exists (
    select 1
    from public.assignment_submissions as submission
    join public.teacher_assignments as assignment
      on assignment.id = submission.assignment_id
    join public.classroom_memberships as membership
      on membership.classroom_id = assignment.classroom_id
      and membership.student_id = v_student_user_id
      and membership.status = 'APPROVED'
    where
      submission.id = p_submission_id
      and submission.student_id = v_student_user_id
      and assignment.status = 'PUBLISHED'
      and (
        assignment.due_at is null
        or assignment.due_at > now()
      )
  ) then
    raise exception 'Assignment unavailable';
  end if;

  select count(*)::smallint
  into v_answered_count
  from public.assignment_answers as answer
  where answer.submission_id = p_submission_id;

  if v_answered_count <> v_total_count then
    raise exception 'Assignment answers incomplete';
  end if;

  v_submitted_at := now();
  update public.assignment_answers as answer
  set
    is_correct = (
      answer.normalized_answer = solution.correct_answer
    ),
    graded_at = v_submitted_at
  from public.teacher_question_solutions as solution
  where
    answer.submission_id = p_submission_id
    and solution.question_id = answer.question_id
    and answer.is_correct is null;

  select count(*) filter (where answer.is_correct)::smallint
  into v_correct_count
  from public.assignment_answers as answer
  where answer.submission_id = p_submission_id;

  v_score_percent := round(
    (v_correct_count::numeric * 100) / v_total_count,
    2
  );

  update public.assignment_submissions as submission
  set
    status = 'SUBMITTED',
    answered_count = v_total_count,
    correct_count = v_correct_count,
    score_percent = v_score_percent,
    submitted_at = v_submitted_at
  where
    submission.id = p_submission_id
    and submission.student_id = v_student_user_id
    and submission.status = 'IN_PROGRESS';

  return jsonb_build_object(
    'status', 'SUBMITTED',
    'correct_count', v_correct_count,
    'total_count', v_total_count,
    'score_percent', v_score_percent,
    'submitted_at', v_submitted_at
  );
end;
$$;

create function public.update_teacher_assignment_deadline(
  p_assignment_id uuid,
  p_due_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_now timestamptz := now();
  v_assignment_id uuid;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  if p_due_at is not null and p_due_at <= v_now then
    raise exception 'Assignment deadline unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('teacher-assignment:' || p_assignment_id::text, 0)
  );

  update public.teacher_assignments as assignment
  set due_at = p_due_at
  from public.classrooms as classroom
  where
    assignment.id = p_assignment_id
    and assignment.teacher_id = v_teacher_user_id
    and classroom.id = assignment.classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE'
  returning assignment.id
  into v_assignment_id;

  if v_assignment_id is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'assignment_id', assignment.id,
      'status', assignment.status,
      'due_at', assignment.due_at,
      'closed_at', assignment.closed_at,
      'effective_state',
        case
          when assignment.status = 'CLOSED' then 'CLOSED'
          when assignment.due_at is not null
            and assignment.due_at <= v_now then 'OVERDUE'
          else 'OPEN'
        end,
      'server_now', v_now
    )
    from public.teacher_assignments as assignment
    where
      assignment.id = v_assignment_id
      and assignment.teacher_id = v_teacher_user_id
  );
end;
$$;

create function public.close_teacher_assignment(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_now timestamptz := now();
  v_assignment_id uuid;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  perform pg_advisory_xact_lock(
    hashtextextended('teacher-assignment:' || p_assignment_id::text, 0)
  );

  update public.teacher_assignments as assignment
  set
    status = 'CLOSED',
    closed_at = v_now
  from public.classrooms as classroom
  where
    assignment.id = p_assignment_id
    and assignment.teacher_id = v_teacher_user_id
    and classroom.id = assignment.classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE'
    and assignment.status = 'PUBLISHED'
  returning assignment.id
  into v_assignment_id;

  if v_assignment_id is null then
    select assignment.id
    into v_assignment_id
    from public.teacher_assignments as assignment
    join public.classrooms as classroom
      on classroom.id = assignment.classroom_id
    where
      assignment.id = p_assignment_id
      and assignment.teacher_id = v_teacher_user_id
      and classroom.teacher_id = v_teacher_user_id
      and classroom.status = 'ACTIVE'
      and assignment.status = 'CLOSED';
  end if;

  if v_assignment_id is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'assignment_id', assignment.id,
      'status', assignment.status,
      'due_at', assignment.due_at,
      'closed_at', assignment.closed_at,
      'effective_state', 'CLOSED',
      'server_now', v_now
    )
    from public.teacher_assignments as assignment
    where
      assignment.id = v_assignment_id
      and assignment.teacher_id = v_teacher_user_id
  );
end;
$$;

create function public.reopen_teacher_assignment(
  p_assignment_id uuid,
  p_due_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_now timestamptz := now();
  v_assignment_id uuid;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  if p_due_at is not null and p_due_at <= v_now then
    raise exception 'Assignment deadline unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('teacher-assignment:' || p_assignment_id::text, 0)
  );

  update public.teacher_assignments as assignment
  set
    status = 'PUBLISHED',
    due_at = p_due_at,
    closed_at = null
  from public.classrooms as classroom
  where
    assignment.id = p_assignment_id
    and assignment.teacher_id = v_teacher_user_id
    and classroom.id = assignment.classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE'
    and (
      assignment.status = 'CLOSED'
      or (
        assignment.status = 'PUBLISHED'
        and assignment.due_at is not null
        and assignment.due_at <= v_now
      )
    )
  returning assignment.id
  into v_assignment_id;

  if v_assignment_id is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'assignment_id', assignment.id,
      'status', assignment.status,
      'due_at', assignment.due_at,
      'closed_at', assignment.closed_at,
      'effective_state', 'OPEN',
      'server_now', v_now
    )
    from public.teacher_assignments as assignment
    where
      assignment.id = v_assignment_id
      and assignment.teacher_id = v_teacher_user_id
  );
end;
$$;

revoke all
on function public.update_teacher_assignment_deadline(uuid, timestamptz)
from public;
revoke all
on function public.update_teacher_assignment_deadline(uuid, timestamptz)
from anon;
revoke all
on function public.update_teacher_assignment_deadline(uuid, timestamptz)
from authenticated;
grant execute
on function public.update_teacher_assignment_deadline(uuid, timestamptz)
to authenticated;

revoke all on function public.close_teacher_assignment(uuid) from public;
revoke all on function public.close_teacher_assignment(uuid) from anon;
revoke all
on function public.close_teacher_assignment(uuid)
from authenticated;
grant execute
on function public.close_teacher_assignment(uuid)
to authenticated;

revoke all
on function public.reopen_teacher_assignment(uuid, timestamptz)
from public;
revoke all
on function public.reopen_teacher_assignment(uuid, timestamptz)
from anon;
revoke all
on function public.reopen_teacher_assignment(uuid, timestamptz)
from authenticated;
grant execute
on function public.reopen_teacher_assignment(uuid, timestamptz)
to authenticated;

comment on function public.update_teacher_assignment_deadline(uuid, timestamptz)
is 'Teacher-owned assignment deadline update; null means no deadline.';
comment on function public.close_teacher_assignment(uuid)
is 'Teacher-owned immediate assignment close with idempotent CLOSED result.';
comment on function public.reopen_teacher_assignment(uuid, timestamptz)
is 'Teacher-owned reopen with a future deadline or explicit null deadline.';

do $validation$
declare
  v_public_function_count integer := 0;
  v_security_definer_count integer := 0;
  v_safe_search_path_count integer := 0;
  v_deadline_guard_count integer := 0;
  v_trigger_definition text;
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
      where pg_catalog.pg_get_functiondef(procedure.oid)
        ~ 'due_at is null[[:space:]]+or assignment[.]due_at > now[(][)]'
    )
  into
    v_public_function_count,
    v_security_definer_count,
    v_safe_search_path_count,
    v_deadline_guard_count
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'public'::regnamespace
    and procedure.proname in (
      'get_my_teacher_assignments',
      'get_teacher_assignment_roster',
      'get_my_student_assignments',
      'start_or_resume_assignment_submission',
      'get_assignment_submission_state',
      'save_assignment_draft_answer',
      'submit_assignment_submission',
      'update_teacher_assignment_deadline',
      'close_teacher_assignment',
      'reopen_teacher_assignment'
    );

  if
    v_public_function_count <> 10
    or v_security_definer_count <> 10
    or v_safe_search_path_count <> 10
    or v_deadline_guard_count <> 3
  then
    raise exception 'Assignment lifecycle function validation failed';
  end if;

  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_trigger_definition
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'private'::regnamespace
    and procedure.proname = 'enforce_teacher_assignment_integrity';

  if
    v_trigger_definition is null
    or v_trigger_definition !~ 'old[.]status = ''CLOSED'''
    or v_trigger_definition !~ 'new[.]status = ''PUBLISHED'''
    or v_trigger_definition !~ 'new[.]closed_at is null'
  then
    raise exception 'Assignment reopen transition validation failed';
  end if;

  if
    not has_function_privilege(
      'authenticated',
      'public.update_teacher_assignment_deadline(uuid,timestamptz)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.close_teacher_assignment(uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.reopen_teacher_assignment(uuid,timestamptz)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.update_teacher_assignment_deadline(uuid,timestamptz)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.close_teacher_assignment(uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.reopen_teacher_assignment(uuid,timestamptz)',
      'EXECUTE'
    )
  then
    raise exception 'Assignment lifecycle grant validation failed';
  end if;

  if
    has_table_privilege(
      'authenticated',
      'public.teacher_assignments',
      'INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.assignment_submissions',
      'INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.assignment_answers',
      'INSERT,UPDATE,DELETE'
    )
  then
    raise exception 'Direct assignment mutation privilege detected';
  end if;

  if exists (
    select 1
    from public.teacher_assignments as assignment
    where
      (
        assignment.status = 'PUBLISHED'
        and assignment.closed_at is not null
      )
      or (
        assignment.status = 'CLOSED'
        and assignment.closed_at is null
      )
  ) then
    raise exception 'Invalid assignment lifecycle data detected';
  end if;
end;
$validation$;

commit;
