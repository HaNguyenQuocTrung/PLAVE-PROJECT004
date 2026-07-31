begin;

create table public.teacher_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null
    references public.teacher_profiles(user_id) on delete cascade,
  creation_request_id uuid not null,
  grade smallint not null check (grade between 1 and 9),
  question_type text not null
    check (question_type in ('MULTIPLE_CHOICE', 'NUMBER_INPUT')),
  prompt text not null,
  options jsonb,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'ARCHIVED')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_questions_teacher_request_unique
    unique (teacher_id, creation_request_id),
  constraint teacher_questions_prompt_check
    check (
      prompt = btrim(prompt)
      and char_length(prompt) between 3 and 500
    ),
  constraint teacher_questions_options_check
    check (
      (
        question_type = 'MULTIPLE_CHOICE'
        and options is not null
        and jsonb_typeof(options) = 'object'
        and options ?& array['A', 'B', 'C', 'D']
        and (
          options - array['A', 'B', 'C', 'D']::text[]
        ) = '{}'::jsonb
        and jsonb_typeof(options -> 'A') = 'string'
        and jsonb_typeof(options -> 'B') = 'string'
        and jsonb_typeof(options -> 'C') = 'string'
        and jsonb_typeof(options -> 'D') = 'string'
        and btrim(options ->> 'A') <> ''
        and btrim(options ->> 'B') <> ''
        and btrim(options ->> 'C') <> ''
        and btrim(options ->> 'D') <> ''
        and char_length(options ->> 'A') <= 200
        and char_length(options ->> 'B') <= 200
        and char_length(options ->> 'C') <= 200
        and char_length(options ->> 'D') <= 200
      )
      or (
        question_type = 'NUMBER_INPUT'
        and options is null
      )
    ),
  constraint teacher_questions_status_time_check
    check (
      (status = 'ACTIVE' and archived_at is null)
      or (status = 'ARCHIVED' and archived_at is not null)
    )
);

create table public.teacher_question_solutions (
  question_id uuid primary key
    references public.teacher_questions(id) on delete restrict,
  correct_answer text not null,
  solution_steps jsonb not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_question_solutions_answer_check
    check (
      correct_answer = upper(btrim(correct_answer))
      and char_length(correct_answer) between 1 and 20
    ),
  constraint teacher_question_solutions_explanation_check
    check (
      explanation = btrim(explanation)
      and char_length(explanation) between 3 and 500
    )
);

create table public.teacher_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null
    references public.teacher_profiles(user_id) on delete cascade,
  classroom_id uuid not null
    references public.classrooms(id) on delete restrict,
  creation_request_id uuid not null,
  title text not null,
  instructions text,
  due_at timestamptz,
  status text not null default 'PUBLISHED'
    check (status in ('PUBLISHED', 'CLOSED')),
  total_count smallint not null check (total_count between 1 and 50),
  published_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_assignments_teacher_request_unique
    unique (teacher_id, creation_request_id),
  constraint teacher_assignments_title_check
    check (
      title = btrim(title)
      and char_length(title) between 3 and 120
    ),
  constraint teacher_assignments_instructions_check
    check (
      instructions is null
      or (
        instructions = btrim(instructions)
        and char_length(instructions) between 1 and 1000
      )
    ),
  constraint teacher_assignments_due_check
    check (due_at is null or due_at >= published_at),
  constraint teacher_assignments_status_time_check
    check (
      (status = 'PUBLISHED' and closed_at is null)
      or (
        status = 'CLOSED'
        and closed_at is not null
        and closed_at >= published_at
      )
    )
);

create table public.teacher_assignment_items (
  assignment_id uuid not null
    references public.teacher_assignments(id) on delete restrict,
  question_id uuid not null
    references public.teacher_questions(id) on delete restrict,
  display_order smallint not null check (display_order between 1 and 50),
  points smallint not null default 1 check (points = 1),
  created_at timestamptz not null default now(),
  primary key (assignment_id, question_id),
  unique (assignment_id, display_order)
);

create table public.assignment_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid not null
    references public.teacher_assignments(id) on delete restrict,
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS', 'SUBMITTED')),
  total_count smallint not null check (total_count between 1 and 50),
  answered_count smallint not null default 0,
  correct_count smallint,
  score_percent numeric(5, 2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id),
  constraint assignment_submissions_counts_check
    check (
      answered_count between 0 and total_count
      and (
        correct_count is null
        or correct_count between 0 and answered_count
      )
    ),
  constraint assignment_submissions_lifecycle_check
    check (
      (
        status = 'IN_PROGRESS'
        and submitted_at is null
        and correct_count is null
        and score_percent is null
      )
      or (
        status = 'SUBMITTED'
        and submitted_at is not null
        and answered_count = total_count
        and correct_count is not null
        and score_percent is not null
        and score_percent between 0 and 100
      )
    )
);

create table public.assignment_answers (
  submission_id uuid not null
    references public.assignment_submissions(id) on delete restrict,
  question_id uuid not null
    references public.teacher_questions(id) on delete restrict,
  normalized_answer text not null,
  is_correct boolean,
  saved_at timestamptz not null default now(),
  graded_at timestamptz,
  primary key (submission_id, question_id),
  constraint assignment_answers_value_check
    check (
      normalized_answer = upper(btrim(normalized_answer))
      and char_length(normalized_answer) between 1 and 20
    ),
  constraint assignment_answers_grading_check
    check (
      (is_correct is null and graded_at is null)
      or (is_correct is not null and graded_at is not null)
    )
);

create index teacher_questions_owner_grade_status_idx
on public.teacher_questions (
  teacher_id,
  grade,
  status,
  created_at desc
);

create index teacher_assignments_owner_published_idx
on public.teacher_assignments (
  teacher_id,
  published_at desc
);

create index teacher_assignments_classroom_published_idx
on public.teacher_assignments (
  classroom_id,
  published_at desc
);

create index assignment_submissions_assignment_status_idx
on public.assignment_submissions (
  assignment_id,
  status,
  updated_at desc
);

create index assignment_submissions_student_updated_idx
on public.assignment_submissions (
  student_id,
  updated_at desc
);

create function private.is_nonempty_text_array(
  p_value jsonb,
  p_minimum integer,
  p_maximum integer,
  p_item_maximum integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(p_value) = 'array'
    and jsonb_array_length(p_value) between p_minimum and p_maximum
    and not exists (
      select 1
      from jsonb_array_elements(p_value) as item(value)
      where
        jsonb_typeof(item.value) <> 'string'
        or btrim(item.value #>> '{}') = ''
        or char_length(item.value #>> '{}') > p_item_maximum
    );
$$;

alter table public.teacher_question_solutions
add constraint teacher_question_solutions_steps_check
check (
  private.is_nonempty_text_array(solution_steps, 2, 8, 300)
);

create function private.normalize_assignment_answer(
  p_question_type text,
  p_answer text
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_answer text;
begin
  if p_answer is null or char_length(p_answer) not between 1 and 20 then
    raise exception 'Invalid assignment answer';
  end if;

  if p_question_type = 'MULTIPLE_CHOICE' then
    v_answer := upper(btrim(p_answer));
    if v_answer !~ '^[A-D]$' then
      raise exception 'Invalid assignment answer';
    end if;
    return v_answer;
  end if;

  if p_question_type = 'NUMBER_INPUT' then
    v_answer := btrim(p_answer);
    if
      v_answer !~ '^-?[0-9]{1,6}$'
      or v_answer::integer not between -100000 and 100000
    then
      raise exception 'Invalid assignment answer';
    end if;
    return v_answer::integer::text;
  end if;

  raise exception 'Invalid assignment answer';
end;
$$;

create function private.enforce_teacher_question_integrity()
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
    return new;
  end if;

  if
    old.status = 'ACTIVE'
    and new.status = 'ARCHIVED'
    and new.archived_at is not null
  then
    return new;
  end if;

  raise exception 'Invalid question transition';
end;
$$;

create function private.enforce_teacher_question_solution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_type text;
  v_normalized_answer text;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Question solution cannot change';
  end if;

  select question.question_type
  into v_question_type
  from public.teacher_questions as question
  where question.id = new.question_id;

  if v_question_type is null then
    raise exception 'Question solution unavailable';
  end if;

  v_normalized_answer := private.normalize_assignment_answer(
    v_question_type,
    new.correct_answer
  );
  if new.correct_answer <> v_normalized_answer then
    raise exception 'Question solution unavailable';
  end if;

  return new;
end;
$$;

create function private.enforce_teacher_assignment_integrity()
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
    or new.due_at is distinct from old.due_at
    or new.total_count is distinct from old.total_count
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Published assignment cannot change';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if
    old.status = 'PUBLISHED'
    and new.status = 'CLOSED'
    and new.closed_at is not null
  then
    return new;
  end if;

  raise exception 'Invalid assignment transition';
end;
$$;

create function private.enforce_teacher_assignment_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_valid boolean := false;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Assignment items cannot change';
  end if;

  select exists (
    select 1
    from public.teacher_assignments as assignment
    join public.classrooms as classroom
      on classroom.id = assignment.classroom_id
    join public.teacher_questions as question
      on question.id = new.question_id
    join public.teacher_question_solutions as solution
      on solution.question_id = question.id
    where
      assignment.id = new.assignment_id
      and assignment.status = 'PUBLISHED'
      and assignment.teacher_id = question.teacher_id
      and classroom.grade = question.grade
      and question.status = 'ACTIVE'
  )
  into v_item_valid;

  if not v_item_valid then
    raise exception 'Assignment item unavailable';
  end if;

  return new;
end;
$$;

create function private.enforce_assignment_submission_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_valid boolean := false;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.teacher_assignments as assignment
      join public.classroom_memberships as membership
        on membership.classroom_id = assignment.classroom_id
      join public.profiles as profile
        on profile.user_id = new.student_id
      where
        assignment.id = new.assignment_id
        and assignment.status = 'PUBLISHED'
        and assignment.total_count = new.total_count
        and membership.student_id = new.student_id
        and membership.status = 'APPROVED'
        and profile.role = 'STUDENT'
        and profile.onboarding_completed
    )
    into v_student_valid;

    if not v_student_valid or new.status <> 'IN_PROGRESS' then
      raise exception 'Assignment submission unavailable';
    end if;
    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.assignment_id is distinct from old.assignment_id
    or new.student_id is distinct from old.student_id
    or new.total_count is distinct from old.total_count
    or new.started_at is distinct from old.started_at
  then
    raise exception 'Assignment submission identity cannot change';
  end if;

  if old.status = 'SUBMITTED' then
    if new is distinct from old then
      raise exception 'Submitted assignment cannot change';
    end if;
    return new;
  end if;

  if old.status = new.status then
    if
      new.correct_count is not null
      or new.score_percent is not null
      or new.submitted_at is not null
    then
      raise exception 'Draft assignment cannot be graded';
    end if;
    return new;
  end if;

  if
    old.status = 'IN_PROGRESS'
    and new.status = 'SUBMITTED'
    and new.submitted_at is not null
    and new.answered_count = new.total_count
    and new.correct_count is not null
    and new.score_percent is not null
  then
    return new;
  end if;

  raise exception 'Invalid assignment submission transition';
end;
$$;

create function private.enforce_assignment_answer_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_status text;
  v_question_type text;
  v_normalized_answer text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Assignment answer cannot be deleted';
  end if;

  select
    submission.status,
    question.question_type
  into
    v_submission_status,
    v_question_type
  from public.assignment_submissions as submission
  join public.teacher_assignment_items as item
    on item.assignment_id = submission.assignment_id
  join public.teacher_questions as question
    on question.id = item.question_id
  where
    submission.id = new.submission_id
    and item.question_id = new.question_id;

  if v_submission_status is null or v_question_type is null then
    raise exception 'Assignment answer unavailable';
  end if;

  if tg_op = 'UPDATE' and v_submission_status <> 'IN_PROGRESS' then
    raise exception 'Submitted assignment cannot change';
  end if;

  if
    tg_op = 'UPDATE'
    and (
      new.submission_id is distinct from old.submission_id
      or new.question_id is distinct from old.question_id
    )
  then
    raise exception 'Assignment answer identity cannot change';
  end if;

  v_normalized_answer := private.normalize_assignment_answer(
    v_question_type,
    new.normalized_answer
  );
  if new.normalized_answer <> v_normalized_answer then
    raise exception 'Assignment answer unavailable';
  end if;

  if tg_op = 'INSERT' and (new.is_correct is not null or new.graded_at is not null) then
    raise exception 'Draft assignment cannot be graded';
  end if;

  return new;
end;
$$;

create trigger teacher_questions_set_updated_at
before update on public.teacher_questions
for each row execute function private.set_updated_at();

create trigger teacher_questions_enforce_integrity
before insert or update on public.teacher_questions
for each row execute function private.enforce_teacher_question_integrity();

create trigger teacher_question_solutions_set_updated_at
before update on public.teacher_question_solutions
for each row execute function private.set_updated_at();

create trigger teacher_question_solutions_enforce_integrity
before insert or update or delete on public.teacher_question_solutions
for each row execute function private.enforce_teacher_question_solution();

create trigger teacher_assignments_set_updated_at
before update on public.teacher_assignments
for each row execute function private.set_updated_at();

create trigger teacher_assignments_enforce_integrity
before insert or update on public.teacher_assignments
for each row execute function private.enforce_teacher_assignment_integrity();

create trigger teacher_assignment_items_enforce_integrity
before insert or update or delete on public.teacher_assignment_items
for each row execute function private.enforce_teacher_assignment_item();

create trigger assignment_submissions_set_updated_at
before update on public.assignment_submissions
for each row execute function private.set_updated_at();

create trigger assignment_submissions_enforce_lifecycle
before insert or update on public.assignment_submissions
for each row execute function private.enforce_assignment_submission_lifecycle();

create trigger assignment_answers_enforce_integrity
before insert or update or delete on public.assignment_answers
for each row execute function private.enforce_assignment_answer_integrity();

create function public.create_teacher_question(
  p_grade smallint,
  p_question_type text,
  p_prompt text,
  p_options jsonb,
  p_correct_answer text,
  p_solution_steps jsonb,
  p_explanation text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_type text;
  v_prompt text;
  v_options jsonb;
  v_correct_answer text;
  v_steps jsonb;
  v_explanation text;
  v_question_id uuid;
  v_created_at timestamptz;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  v_type := upper(btrim(coalesce(p_question_type, '')));
  v_prompt := btrim(regexp_replace(coalesce(p_prompt, ''), '[[:space:]]+', ' ', 'g'));
  v_explanation := btrim(
    regexp_replace(coalesce(p_explanation, ''), '[[:space:]]+', ' ', 'g')
  );
  v_steps := p_solution_steps;

  if
    p_request_id is null
    or p_grade is null
    or p_grade not between 1 and 9
    or v_type not in ('MULTIPLE_CHOICE', 'NUMBER_INPUT')
    or char_length(v_prompt) not between 3 and 500
    or char_length(v_explanation) not between 3 and 500
    or not private.is_nonempty_text_array(v_steps, 2, 8, 300)
  then
    raise exception 'Question request unavailable';
  end if;

  if v_type = 'MULTIPLE_CHOICE' then
    v_options := p_options;
    if
      v_options is null
      or jsonb_typeof(v_options) <> 'object'
      or not (v_options ?& array['A', 'B', 'C', 'D'])
      or (
        v_options - array['A', 'B', 'C', 'D']::text[]
      ) <> '{}'::jsonb
    then
      raise exception 'Question request unavailable';
    end if;
  else
    if p_options is not null then
      raise exception 'Question request unavailable';
    end if;
    v_options := null;
  end if;

  v_correct_answer := private.normalize_assignment_answer(
    v_type,
    p_correct_answer
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'teacher-question:'
      || v_teacher_user_id::text
      || ':'
      || p_request_id::text,
      0
    )
  );

  select question.id
  into v_question_id
  from public.teacher_questions as question
  where
    question.teacher_id = v_teacher_user_id
    and question.creation_request_id = p_request_id;

  if v_question_id is null then
    insert into public.teacher_questions (
      teacher_id,
      creation_request_id,
      grade,
      question_type,
      prompt,
      options
    )
    values (
      v_teacher_user_id,
      p_request_id,
      p_grade,
      v_type,
      v_prompt,
      v_options
    )
    returning id, created_at
    into v_question_id, v_created_at;

    insert into public.teacher_question_solutions (
      question_id,
      correct_answer,
      solution_steps,
      explanation
    )
    values (
      v_question_id,
      v_correct_answer,
      v_steps,
      v_explanation
    );
  end if;

  return (
    select jsonb_build_object(
      'question_id', question.id,
      'grade', question.grade,
      'question_type', question.question_type,
      'prompt', question.prompt,
      'options', question.options,
      'correct_answer', solution.correct_answer,
      'solution_steps', solution.solution_steps,
      'explanation', solution.explanation,
      'status', question.status,
      'created_at', question.created_at
    )
    from public.teacher_questions as question
    join public.teacher_question_solutions as solution
      on solution.question_id = question.id
    where
      question.id = v_question_id
      and question.teacher_id = v_teacher_user_id
  );
end;
$$;

create function public.get_my_teacher_questions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_questions jsonb := '[]'::jsonb;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', question.id,
        'grade', question.grade,
        'question_type', question.question_type,
        'prompt', question.prompt,
        'options', question.options,
        'correct_answer', solution.correct_answer,
        'solution_steps', solution.solution_steps,
        'explanation', solution.explanation,
        'status', question.status,
        'created_at', question.created_at
      )
      order by question.created_at desc, question.id
    ),
    '[]'::jsonb
  )
  into v_questions
  from public.teacher_questions as question
  join public.teacher_question_solutions as solution
    on solution.question_id = question.id
  where question.teacher_id = v_teacher_user_id;

  return jsonb_build_object('questions', v_questions);
end;
$$;

create function public.archive_teacher_question(
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
    status = 'ARCHIVED',
    archived_at = now()
  where
    question.id = p_question_id
    and question.teacher_id = v_teacher_user_id
    and question.status = 'ACTIVE';

  get diagnostics v_affected_count = row_count;
  if v_affected_count = 1 then
    return jsonb_build_object('status', 'ARCHIVED');
  end if;

  select question.status
  into v_status
  from public.teacher_questions as question
  where
    question.id = p_question_id
    and question.teacher_id = v_teacher_user_id;

  if v_status = 'ARCHIVED' then
    return jsonb_build_object('status', 'ARCHIVED');
  end if;

  raise exception 'Question state unavailable';
end;
$$;

create function public.publish_teacher_assignment(
  p_classroom_id uuid,
  p_title text,
  p_instructions text,
  p_due_at timestamptz,
  p_question_ids uuid[],
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
  v_title text;
  v_instructions text;
  v_grade smallint;
  v_question_count integer := 0;
  v_assignment_id uuid;
  v_published_at timestamptz;
begin
  v_teacher_user_id := private.require_classroom_actor('TEACHER');
  v_title := btrim(regexp_replace(coalesce(p_title, ''), '[[:space:]]+', ' ', 'g'));
  v_instructions := nullif(
    btrim(regexp_replace(coalesce(p_instructions, ''), '[[:space:]]+', ' ', 'g')),
    ''
  );

  if
    p_classroom_id is null
    or p_request_id is null
    or char_length(v_title) not between 3 and 120
    or (v_instructions is not null and char_length(v_instructions) > 1000)
    or p_question_ids is null
    or cardinality(p_question_ids) not between 1 and 50
    or array_position(p_question_ids, null) is not null
    or (
      select count(distinct question_id)
      from unnest(p_question_ids) as question_id
    ) <> cardinality(p_question_ids)
  then
    raise exception 'Assignment request unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'teacher-assignment:'
      || v_teacher_user_id::text
      || ':'
      || p_request_id::text,
      0
    )
  );

  select assignment.id
  into v_assignment_id
  from public.teacher_assignments as assignment
  where
    assignment.teacher_id = v_teacher_user_id
    and assignment.creation_request_id = p_request_id;

  if v_assignment_id is not null then
    return (
      select jsonb_build_object(
        'assignment_id', assignment.id,
        'classroom_name', classroom.name,
        'title', assignment.title,
        'status', assignment.status,
        'total_count', assignment.total_count,
        'due_at', assignment.due_at,
        'published_at', assignment.published_at
      )
      from public.teacher_assignments as assignment
      join public.classrooms as classroom
        on classroom.id = assignment.classroom_id
      where
        assignment.id = v_assignment_id
        and assignment.teacher_id = v_teacher_user_id
    );
  end if;

  select classroom.grade
  into v_grade
  from public.classrooms as classroom
  where
    classroom.id = p_classroom_id
    and classroom.teacher_id = v_teacher_user_id
    and classroom.status = 'ACTIVE';

  if v_grade is null then
    raise exception 'Assignment request unavailable';
  end if;

  select count(*)
  into v_question_count
  from public.teacher_questions as question
  join public.teacher_question_solutions as solution
    on solution.question_id = question.id
  where
    question.id = any(p_question_ids)
    and question.teacher_id = v_teacher_user_id
    and question.grade = v_grade
    and question.status = 'ACTIVE';

  if v_question_count <> cardinality(p_question_ids) then
    raise exception 'Assignment request unavailable';
  end if;

  v_published_at := now();
  if p_due_at is not null and p_due_at < v_published_at then
    raise exception 'Assignment request unavailable';
  end if;

  insert into public.teacher_assignments (
    teacher_id,
    classroom_id,
    creation_request_id,
    title,
    instructions,
    due_at,
    total_count,
    published_at
  )
  values (
    v_teacher_user_id,
    p_classroom_id,
    p_request_id,
    v_title,
    v_instructions,
    p_due_at,
    cardinality(p_question_ids),
    v_published_at
  )
  returning id
  into v_assignment_id;

  insert into public.teacher_assignment_items (
    assignment_id,
    question_id,
    display_order
  )
  select
    v_assignment_id,
    ordered.question_id,
    ordered.ordinality::smallint
  from unnest(p_question_ids) with ordinality
    as ordered(question_id, ordinality);

  return (
    select jsonb_build_object(
      'assignment_id', assignment.id,
      'classroom_name', classroom.name,
      'title', assignment.title,
      'status', assignment.status,
      'total_count', assignment.total_count,
      'due_at', assignment.due_at,
      'published_at', assignment.published_at
    )
    from public.teacher_assignments as assignment
    join public.classrooms as classroom
      on classroom.id = assignment.classroom_id
    where
      assignment.id = v_assignment_id
      and assignment.teacher_id = v_teacher_user_id
  );
end;
$$;

create function public.get_my_teacher_assignments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_teacher_user_id uuid;
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
        'total_count', assignment.total_count,
        'published_at', assignment.published_at,
        'submitted_count', (
          select count(*)
          from public.assignment_submissions as submission
          where
            submission.assignment_id = assignment.id
            and submission.status = 'SUBMITTED'
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

create function public.get_teacher_assignment_roster(
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
    'total_count', assignment.total_count,
    'published_at', assignment.published_at
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

create function public.get_my_student_assignments()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
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

create function public.start_or_resume_assignment_submission(
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

  select assignment.total_count
  into v_total_count
  from public.teacher_assignments as assignment
  join public.classroom_memberships as membership
    on membership.classroom_id = assignment.classroom_id
    and membership.student_id = v_student_user_id
    and membership.status = 'APPROVED'
  where
    assignment.id = p_assignment_id
    and assignment.status = 'PUBLISHED';

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

create function public.get_assignment_submission_state(
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

create function public.save_assignment_draft_answer(
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
  v_question_type text;
  v_normalized_answer text;
  v_answered_count smallint;
  v_total_count smallint;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
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
    and assignment.status = 'PUBLISHED';

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

create function public.submit_assignment_submission(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_user_id uuid;
  v_status text;
  v_total_count smallint;
  v_answered_count smallint;
  v_correct_count smallint;
  v_score_percent numeric(5, 2);
  v_submitted_at timestamptz;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');
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

create function public.get_assignment_submission_review(
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
  v_submission_id uuid;
  v_assignment jsonb;
  v_correct_count smallint;
  v_total_count smallint;
  v_score_percent numeric(5, 2);
  v_submitted_at timestamptz;
  v_answers jsonb := '[]'::jsonb;
begin
  v_student_user_id := private.require_classroom_actor('STUDENT');

  select
    submission.id,
    submission.correct_count,
    submission.total_count,
    submission.score_percent,
    submission.submitted_at,
    jsonb_build_object(
      'assignment_id', assignment.id,
      'classroom_name', classroom.name,
      'teacher_display_name', teacher.full_name,
      'title', assignment.title,
      'instructions', assignment.instructions,
      'due_at', assignment.due_at,
      'published_at', assignment.published_at
    )
  into
    v_submission_id,
    v_correct_count,
    v_total_count,
    v_score_percent,
    v_submitted_at,
    v_assignment
  from public.assignment_submissions as submission
  join public.teacher_assignments as assignment
    on assignment.id = submission.assignment_id
  join public.classrooms as classroom
    on classroom.id = assignment.classroom_id
  join public.teacher_profiles as teacher
    on teacher.user_id = assignment.teacher_id
  where
    submission.assignment_id = p_assignment_id
    and submission.student_id = v_student_user_id
    and submission.status = 'SUBMITTED';

  if v_submission_id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'display_order', item.display_order,
        'question_type', question.question_type,
        'prompt', question.prompt,
        'options', question.options,
        'student_answer', answer.normalized_answer,
        'is_correct', answer.is_correct,
        'correct_answer', solution.correct_answer,
        'solution_steps', solution.solution_steps,
        'explanation', solution.explanation
      )
      order by item.display_order
    ),
    '[]'::jsonb
  )
  into v_answers
  from public.teacher_assignment_items as item
  join public.teacher_questions as question
    on question.id = item.question_id
  join public.teacher_question_solutions as solution
    on solution.question_id = item.question_id
  join public.assignment_answers as answer
    on answer.submission_id = v_submission_id
    and answer.question_id = item.question_id
  where item.assignment_id = p_assignment_id;

  return jsonb_build_object(
    'assignment', v_assignment,
    'correct_count', v_correct_count,
    'total_count', v_total_count,
    'score_percent', v_score_percent,
    'submitted_at', v_submitted_at,
    'answers', v_answers
  );
end;
$$;

alter table public.teacher_questions enable row level security;
alter table public.teacher_question_solutions enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.teacher_assignment_items enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assignment_answers enable row level security;

revoke all on table public.teacher_questions from public;
revoke all on table public.teacher_questions from anon;
revoke all on table public.teacher_questions from authenticated;
revoke all on table public.teacher_question_solutions from public;
revoke all on table public.teacher_question_solutions from anon;
revoke all on table public.teacher_question_solutions from authenticated;
revoke all on table public.teacher_assignments from public;
revoke all on table public.teacher_assignments from anon;
revoke all on table public.teacher_assignments from authenticated;
revoke all on table public.teacher_assignment_items from public;
revoke all on table public.teacher_assignment_items from anon;
revoke all on table public.teacher_assignment_items from authenticated;
revoke all on table public.assignment_submissions from public;
revoke all on table public.assignment_submissions from anon;
revoke all on table public.assignment_submissions from authenticated;
revoke all on table public.assignment_answers from public;
revoke all on table public.assignment_answers from anon;
revoke all on table public.assignment_answers from authenticated;

revoke all
on function private.is_nonempty_text_array(jsonb, integer, integer, integer)
from public;
revoke all
on function private.is_nonempty_text_array(jsonb, integer, integer, integer)
from anon;
revoke all
on function private.is_nonempty_text_array(jsonb, integer, integer, integer)
from authenticated;
revoke all
on function private.normalize_assignment_answer(text, text)
from public;
revoke all
on function private.normalize_assignment_answer(text, text)
from anon;
revoke all
on function private.normalize_assignment_answer(text, text)
from authenticated;
revoke all on function private.enforce_teacher_question_integrity() from public;
revoke all on function private.enforce_teacher_question_integrity() from anon;
revoke all
on function private.enforce_teacher_question_integrity()
from authenticated;
revoke all on function private.enforce_teacher_question_solution() from public;
revoke all on function private.enforce_teacher_question_solution() from anon;
revoke all
on function private.enforce_teacher_question_solution()
from authenticated;
revoke all on function private.enforce_teacher_assignment_integrity() from public;
revoke all on function private.enforce_teacher_assignment_integrity() from anon;
revoke all
on function private.enforce_teacher_assignment_integrity()
from authenticated;
revoke all on function private.enforce_teacher_assignment_item() from public;
revoke all on function private.enforce_teacher_assignment_item() from anon;
revoke all
on function private.enforce_teacher_assignment_item()
from authenticated;
revoke all
on function private.enforce_assignment_submission_lifecycle()
from public;
revoke all
on function private.enforce_assignment_submission_lifecycle()
from anon;
revoke all
on function private.enforce_assignment_submission_lifecycle()
from authenticated;
revoke all
on function private.enforce_assignment_answer_integrity()
from public;
revoke all
on function private.enforce_assignment_answer_integrity()
from anon;
revoke all
on function private.enforce_assignment_answer_integrity()
from authenticated;

revoke all
on function public.create_teacher_question(
  smallint, text, text, jsonb, text, jsonb, text, uuid
)
from public;
revoke all
on function public.create_teacher_question(
  smallint, text, text, jsonb, text, jsonb, text, uuid
)
from anon;
revoke all
on function public.create_teacher_question(
  smallint, text, text, jsonb, text, jsonb, text, uuid
)
from authenticated;
grant execute
on function public.create_teacher_question(
  smallint, text, text, jsonb, text, jsonb, text, uuid
)
to authenticated;

revoke all on function public.get_my_teacher_questions() from public;
revoke all on function public.get_my_teacher_questions() from anon;
revoke all on function public.get_my_teacher_questions() from authenticated;
grant execute on function public.get_my_teacher_questions() to authenticated;

revoke all on function public.archive_teacher_question(uuid) from public;
revoke all on function public.archive_teacher_question(uuid) from anon;
revoke all
on function public.archive_teacher_question(uuid)
from authenticated;
grant execute
on function public.archive_teacher_question(uuid)
to authenticated;

revoke all
on function public.publish_teacher_assignment(
  uuid, text, text, timestamptz, uuid[], uuid
)
from public;
revoke all
on function public.publish_teacher_assignment(
  uuid, text, text, timestamptz, uuid[], uuid
)
from anon;
revoke all
on function public.publish_teacher_assignment(
  uuid, text, text, timestamptz, uuid[], uuid
)
from authenticated;
grant execute
on function public.publish_teacher_assignment(
  uuid, text, text, timestamptz, uuid[], uuid
)
to authenticated;

revoke all on function public.get_my_teacher_assignments() from public;
revoke all on function public.get_my_teacher_assignments() from anon;
revoke all
on function public.get_my_teacher_assignments()
from authenticated;
grant execute
on function public.get_my_teacher_assignments()
to authenticated;

revoke all
on function public.get_teacher_assignment_roster(uuid)
from public;
revoke all
on function public.get_teacher_assignment_roster(uuid)
from anon;
revoke all
on function public.get_teacher_assignment_roster(uuid)
from authenticated;
grant execute
on function public.get_teacher_assignment_roster(uuid)
to authenticated;

revoke all on function public.get_my_student_assignments() from public;
revoke all on function public.get_my_student_assignments() from anon;
revoke all
on function public.get_my_student_assignments()
from authenticated;
grant execute
on function public.get_my_student_assignments()
to authenticated;

revoke all
on function public.start_or_resume_assignment_submission(uuid)
from public;
revoke all
on function public.start_or_resume_assignment_submission(uuid)
from anon;
revoke all
on function public.start_or_resume_assignment_submission(uuid)
from authenticated;
grant execute
on function public.start_or_resume_assignment_submission(uuid)
to authenticated;

revoke all
on function public.get_assignment_submission_state(uuid)
from public;
revoke all
on function public.get_assignment_submission_state(uuid)
from anon;
revoke all
on function public.get_assignment_submission_state(uuid)
from authenticated;
grant execute
on function public.get_assignment_submission_state(uuid)
to authenticated;

revoke all
on function public.save_assignment_draft_answer(uuid, uuid, text)
from public;
revoke all
on function public.save_assignment_draft_answer(uuid, uuid, text)
from anon;
revoke all
on function public.save_assignment_draft_answer(uuid, uuid, text)
from authenticated;
grant execute
on function public.save_assignment_draft_answer(uuid, uuid, text)
to authenticated;

revoke all
on function public.submit_assignment_submission(uuid)
from public;
revoke all
on function public.submit_assignment_submission(uuid)
from anon;
revoke all
on function public.submit_assignment_submission(uuid)
from authenticated;
grant execute
on function public.submit_assignment_submission(uuid)
to authenticated;

revoke all
on function public.get_assignment_submission_review(uuid)
from public;
revoke all
on function public.get_assignment_submission_review(uuid)
from anon;
revoke all
on function public.get_assignment_submission_review(uuid)
from authenticated;
grant execute
on function public.get_assignment_submission_review(uuid)
to authenticated;

comment on table public.teacher_question_solutions is
  'Private Teacher answer keys; never directly selectable by browser roles.';
comment on table public.teacher_assignment_items is
  'Immutable question order for a published Teacher assignment.';
comment on table public.assignment_answers is
  'Student drafts graded only inside the final-submit RPC.';

do $validation$
declare
  v_table_count integer := 0;
  v_rls_count integer := 0;
  v_public_function_count integer := 0;
  v_security_definer_count integer := 0;
  v_safe_search_path_count integer := 0;
  v_trigger_count integer := 0;
begin
  select
    count(*),
    count(*) filter (where relation.relrowsecurity)
  into
    v_table_count,
    v_rls_count
  from pg_catalog.pg_class as relation
  where
    relation.relnamespace = 'public'::regnamespace
    and relation.relname in (
      'teacher_questions',
      'teacher_question_solutions',
      'teacher_assignments',
      'teacher_assignment_items',
      'assignment_submissions',
      'assignment_answers'
    );

  if v_table_count <> 6 or v_rls_count <> 6 then
    raise exception 'Assignment table security validation failed';
  end if;

  select count(*)
  into v_trigger_count
  from pg_catalog.pg_trigger as trigger_definition
  where
    not trigger_definition.tgisinternal
    and trigger_definition.tgenabled <> 'D'
    and trigger_definition.tgname in (
      'teacher_questions_enforce_integrity',
      'teacher_question_solutions_enforce_integrity',
      'teacher_assignments_enforce_integrity',
      'teacher_assignment_items_enforce_integrity',
      'assignment_submissions_enforce_lifecycle',
      'assignment_answers_enforce_integrity'
    );

  if v_trigger_count <> 6 then
    raise exception 'Assignment lifecycle validation failed';
  end if;

  select
    count(*),
    count(*) filter (where procedure.prosecdef),
    count(*) filter (
      where coalesce(
        procedure.proconfig,
        array[]::text[]
      ) @> array['search_path=""']::text[]
    )
  into
    v_public_function_count,
    v_security_definer_count,
    v_safe_search_path_count
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'public'::regnamespace
    and procedure.proname in (
      'create_teacher_question',
      'get_my_teacher_questions',
      'archive_teacher_question',
      'publish_teacher_assignment',
      'get_my_teacher_assignments',
      'get_teacher_assignment_roster',
      'get_my_student_assignments',
      'start_or_resume_assignment_submission',
      'get_assignment_submission_state',
      'save_assignment_draft_answer',
      'submit_assignment_submission',
      'get_assignment_submission_review'
    );

  if
    v_public_function_count <> 12
    or v_security_definer_count <> 12
    or v_safe_search_path_count <> 12
  then
    raise exception 'Assignment RPC security validation failed';
  end if;

  if
    has_table_privilege(
      'authenticated',
      'public.teacher_questions',
      'SELECT,INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.teacher_question_solutions',
      'SELECT,INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.teacher_assignments',
      'SELECT,INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.teacher_assignment_items',
      'SELECT,INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.assignment_submissions',
      'SELECT,INSERT,UPDATE,DELETE'
    )
    or has_table_privilege(
      'authenticated',
      'public.assignment_answers',
      'SELECT,INSERT,UPDATE,DELETE'
    )
  then
    raise exception 'Direct assignment table privilege detected';
  end if;

  if
    not has_function_privilege(
      'authenticated',
      'public.create_teacher_question(smallint,text,text,jsonb,text,jsonb,text,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.publish_teacher_assignment(uuid,text,text,timestamptz,uuid[],uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.get_assignment_submission_state(uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.submit_assignment_submission(uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.create_teacher_question(smallint,text,text,jsonb,text,jsonb,text,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.get_assignment_submission_review(uuid)',
      'EXECUTE'
    )
  then
    raise exception 'Assignment function grant validation failed';
  end if;

  if exists (
    select 1
    from public.teacher_assignment_items as item
    join public.teacher_assignments as assignment
      on assignment.id = item.assignment_id
    join public.classrooms as classroom
      on classroom.id = assignment.classroom_id
    join public.teacher_questions as question
      on question.id = item.question_id
    where
      assignment.teacher_id <> question.teacher_id
      or classroom.grade <> question.grade
  ) then
    raise exception 'Invalid assignment item detected';
  end if;

  if exists (
    select 1
    from public.assignment_submissions as submission
    where
      submission.answered_count > submission.total_count
      or (
        submission.status = 'SUBMITTED'
        and (
          submission.correct_count is null
          or submission.submitted_at is null
        )
      )
  ) then
    raise exception 'Invalid assignment submission detected';
  end if;
end;
$validation$;

commit;
