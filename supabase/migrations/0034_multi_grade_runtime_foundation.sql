begin;

-- Keep the verified Grade 1 rows unchanged while allowing later units to
-- define their own bounded question totals.
alter table public.learning_units
  drop constraint if exists learning_units_total_questions_check;
alter table public.learning_units
  add constraint learning_units_total_questions_check
  check (total_questions between 1 and 100);

alter table public.questions
  drop constraint if exists questions_display_order_check;
alter table public.questions
  add constraint questions_display_order_check
  check (display_order between 1 and 100);

alter table public.practice_attempts
  drop constraint if exists practice_attempts_total_questions_check;
alter table public.practice_attempts
  drop constraint if exists practice_attempts_answered_count_check;
alter table public.practice_attempts
  drop constraint if exists practice_attempts_question_order_check;
alter table public.practice_attempts
  drop constraint if exists practice_attempts_completion_check;

alter table public.practice_attempts
  alter column total_questions drop default;

alter table public.practice_attempts
  add constraint practice_attempts_total_questions_check
  check (total_questions between 1 and 100),
  add constraint practice_attempts_answered_count_check
  check (answered_count between 0 and total_questions),
  add constraint practice_attempts_question_order_check
  check (
    cardinality(question_order) = total_questions
    and array_position(question_order, null) is null
  ),
  add constraint practice_attempts_completion_check
  check (
    (
      status = 'IN_PROGRESS'
      and completed_at is null
      and answered_count < total_questions
    )
    or (
      status = 'COMPLETED'
      and completed_at is not null
      and answered_count = total_questions
    )
  );

create or replace function public.start_or_resume_practice(
  p_unit_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_normalized_unit_slug text;
  v_student_count bigint := 0;
  v_student_grade smallint;
  v_unit_count bigint := 0;
  v_unit_grade smallint;
  v_unit_total_questions smallint;
  v_prerequisite_unit_slug text;
  v_prerequisite_completed_count bigint := 0;
  v_attempt_id uuid;
  v_attempt_status text;
  v_question_order text[];
  v_total_questions smallint;
  v_answered_count smallint;
  v_correct_count smallint;
  v_started_at timestamptz;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_normalized_unit_slug := lower(btrim(coalesce(p_unit_slug, '')));

  select
    count(*),
    max(student.grade)
  into
    v_student_count,
    v_student_grade
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;

  if v_student_count <> 1 or v_student_grade is null then
    raise exception 'Student access required';
  end if;

  select
    count(*),
    max(unit.grade),
    max(unit.total_questions),
    max(unit.prerequisite_unit_slug)
  into
    v_unit_count,
    v_unit_grade,
    v_unit_total_questions,
    v_prerequisite_unit_slug
  from public.learning_units as unit
  where unit.slug = v_normalized_unit_slug
    and unit.published;

  if
    v_unit_count <> 1
    or v_unit_grade <> v_student_grade
    or v_unit_total_questions not between 1 and 100
  then
    raise exception 'Unit unavailable';
  end if;

  if v_prerequisite_unit_slug is not null then
    select count(*)
    into v_prerequisite_completed_count
    from public.practice_attempts as prerequisite_attempt
    where prerequisite_attempt.student_id = v_current_user_id
      and prerequisite_attempt.unit_slug = v_prerequisite_unit_slug
      and prerequisite_attempt.status = 'COMPLETED';

    if v_prerequisite_completed_count < 1 then
      raise exception 'Prerequisite required';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_current_user_id::text || ':' || v_normalized_unit_slug,
      0
    )
  );

  select
    attempt.id,
    attempt.status,
    attempt.question_order,
    attempt.total_questions,
    attempt.answered_count,
    attempt.correct_count,
    attempt.started_at
  into
    v_attempt_id,
    v_attempt_status,
    v_question_order,
    v_total_questions,
    v_answered_count,
    v_correct_count,
    v_started_at
  from public.practice_attempts as attempt
  where attempt.student_id = v_current_user_id
    and attempt.unit_slug = v_normalized_unit_slug
    and attempt.status = 'IN_PROGRESS'
  order by attempt.started_at desc, attempt.id desc
  limit 1;

  if v_attempt_id is null then
    select array_agg(question.code order by random())
    into v_question_order
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where question.unit_slug = v_normalized_unit_slug
      and question.published;

    if
      coalesce(cardinality(v_question_order), 0)
      <> v_unit_total_questions
    then
      raise exception 'Unit unavailable';
    end if;

    v_attempt_id := extensions.gen_random_uuid();
    v_attempt_status := 'IN_PROGRESS';
    v_total_questions := v_unit_total_questions;
    v_answered_count := 0;
    v_correct_count := 0;
    v_started_at := now();

    insert into public.practice_attempts (
      id,
      student_id,
      unit_slug,
      status,
      question_order,
      total_questions,
      answered_count,
      correct_count,
      started_at
    )
    values (
      v_attempt_id,
      v_current_user_id,
      v_normalized_unit_slug,
      v_attempt_status,
      v_question_order,
      v_total_questions,
      v_answered_count,
      v_correct_count,
      v_started_at
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'attempt_id', v_attempt_id,
    'unit_slug', v_normalized_unit_slug,
    'status', v_attempt_status,
    'question_order', to_jsonb(v_question_order),
    'total_questions', v_total_questions,
    'answered_count', v_answered_count,
    'correct_count', v_correct_count,
    'started_at', v_started_at
  );
end;
$$;

revoke all on function public.start_or_resume_practice(text) from public;
revoke all on function public.start_or_resume_practice(text) from anon;
grant execute on function public.start_or_resume_practice(text)
  to authenticated;

create or replace function public.submit_practice_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_attempt_status text;
  v_unit_slug text;
  v_question_order text[];
  v_total_questions smallint;
  v_question_type text;
  v_normalized_answer text;
  v_correct_answer text;
  v_solution_steps jsonb;
  v_explanation text;
  v_hint text;
  v_is_correct boolean;
  v_existing_answer_count bigint := 0;
  v_answered_count bigint := 0;
  v_correct_count bigint := 0;
  v_completed boolean := false;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'Practice unavailable';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_attempt_id::text, 1)
  );

  select
    attempt.status,
    attempt.unit_slug,
    attempt.question_order,
    attempt.total_questions,
    attempt.answered_count,
    attempt.correct_count
  into
    v_attempt_status,
    v_unit_slug,
    v_question_order,
    v_total_questions,
    v_answered_count,
    v_correct_count
  from public.practice_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_attempt_status is null or v_total_questions is null then
    raise exception 'Practice unavailable';
  end if;

  select count(*)
  into v_existing_answer_count
  from public.practice_answers as answer
  where answer.attempt_id = p_attempt_id
    and answer.question_id = p_question_id;

  if v_existing_answer_count = 1 then
    select
      answer.is_correct,
      solution.correct_answer,
      solution.solution_steps,
      solution.explanation,
      solution.hint
    into
      v_is_correct,
      v_correct_answer,
      v_solution_steps,
      v_explanation,
      v_hint
    from public.practice_answers as answer
    join public.question_solutions as solution
      on solution.question_id = answer.question_id
    where answer.attempt_id = p_attempt_id
      and answer.question_id = p_question_id;

    return pg_catalog.jsonb_build_object(
      'is_correct', v_is_correct,
      'correct_answer', v_correct_answer,
      'solution_steps', v_solution_steps,
      'explanation', v_explanation,
      'hint', v_hint,
      'answered_count', v_answered_count,
      'correct_count', v_correct_count,
      'completed', v_attempt_status = 'COMPLETED'
    );
  end if;

  if v_attempt_status <> 'IN_PROGRESS' then
    raise exception 'Practice unavailable';
  end if;

  if
    p_question_id is null
    or not (p_question_id = any(v_question_order))
  then
    raise exception 'Question unavailable';
  end if;

  select
    question.question_type,
    solution.correct_answer,
    solution.solution_steps,
    solution.explanation,
    solution.hint
  into
    v_question_type,
    v_correct_answer,
    v_solution_steps,
    v_explanation,
    v_hint
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.code = p_question_id
    and question.unit_slug = v_unit_slug;

  if v_question_type is null then
    raise exception 'Question unavailable';
  end if;

  if p_answer is null or char_length(p_answer) not between 1 and 20 then
    raise exception 'Invalid answer';
  end if;

  if v_question_type = 'MULTIPLE_CHOICE' then
    v_normalized_answer := upper(btrim(p_answer));
    if v_normalized_answer !~ '^[A-D]$' then
      raise exception 'Invalid answer';
    end if;
  elsif v_question_type = 'NUMBER_INPUT' then
    v_normalized_answer := btrim(p_answer);
    if v_normalized_answer !~ '^[0-9]{1,6}$' then
      raise exception 'Invalid answer';
    end if;
    v_normalized_answer := v_normalized_answer::integer::text;
  else
    raise exception 'Question unavailable';
  end if;

  v_is_correct := v_normalized_answer = v_correct_answer;

  insert into public.practice_answers (
    attempt_id,
    question_id,
    normalized_answer,
    is_correct
  )
  values (
    p_attempt_id,
    p_question_id,
    v_normalized_answer,
    v_is_correct
  );

  select
    count(*),
    count(*) filter (where answer.is_correct)
  into
    v_answered_count,
    v_correct_count
  from public.practice_answers as answer
  where answer.attempt_id = p_attempt_id;

  if v_answered_count > v_total_questions then
    raise exception 'Practice unavailable';
  end if;

  v_completed := v_answered_count = v_total_questions;

  update public.practice_attempts as attempt
  set
    answered_count = v_answered_count::smallint,
    correct_count = v_correct_count::smallint,
    status = case
      when v_completed then 'COMPLETED'
      else 'IN_PROGRESS'
    end,
    completed_at = case
      when v_completed then now()
      else null
    end
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id
    and attempt.status = 'IN_PROGRESS';

  return pg_catalog.jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_answer', v_correct_answer,
    'solution_steps', v_solution_steps,
    'explanation', v_explanation,
    'hint', v_hint,
    'answered_count', v_answered_count,
    'correct_count', v_correct_count,
    'completed', v_completed
  );
end;
$$;

revoke all on function public.submit_practice_answer(uuid, text, text)
  from public;
revoke all on function public.submit_practice_answer(uuid, text, text)
  from anon;
grant execute on function public.submit_practice_answer(uuid, text, text)
  to authenticated;

do $validation$
declare
  v_grade_one_unit_count bigint := 0;
  v_function_count bigint := 0;
  v_constraint_count bigint := 0;
  v_start_definition text;
  v_submit_definition text;
begin
  select count(*)
  into v_grade_one_unit_count
  from public.learning_units as unit
  where unit.grade = 1
    and unit.published
    and unit.total_questions = 24;

  if v_grade_one_unit_count <> 13 then
    raise exception 'Multi-grade foundation Grade 1 preservation failed';
  end if;

  select count(*)
  into v_constraint_count
  from pg_catalog.pg_constraint as constraint_row
  join pg_catalog.pg_class as relation
    on relation.oid = constraint_row.conrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and constraint_row.convalidated
    and constraint_row.conname in (
      'learning_units_total_questions_check',
      'questions_display_order_check',
      'practice_attempts_total_questions_check',
      'practice_attempts_answered_count_check',
      'practice_attempts_question_order_check',
      'practice_attempts_completion_check'
    );

  if v_constraint_count <> 6 then
    raise exception 'Multi-grade foundation constraint validation failed';
  end if;

  if exists (
    select 1
    from public.practice_attempts as attempt
    where
      attempt.total_questions not between 1 and 100
      or cardinality(attempt.question_order) <> attempt.total_questions
      or attempt.answered_count not between 0 and attempt.total_questions
      or attempt.correct_count not between 0 and attempt.answered_count
      or (
        attempt.status = 'IN_PROGRESS'
        and (
          attempt.completed_at is not null
          or attempt.answered_count >= attempt.total_questions
        )
      )
      or (
        attempt.status = 'COMPLETED'
        and (
          attempt.completed_at is null
          or attempt.answered_count <> attempt.total_questions
        )
      )
  ) then
    raise exception 'Multi-grade foundation attempt preservation failed';
  end if;

  select
    count(*),
    max(pg_catalog.pg_get_functiondef(procedure.oid))
  into
    v_function_count,
    v_start_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'start_or_resume_practice'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_unit_slug text';

  if
    v_function_count <> 1
    or v_start_definition is null
    or pg_catalog.strpos(v_start_definition, 'SECURITY DEFINER') = 0
    or pg_catalog.strpos(v_start_definition, 'SET search_path TO ''''') = 0
    or pg_catalog.strpos(v_start_definition, 'auth.uid()') = 0
    or pg_catalog.strpos(
      v_start_definition,
      'v_unit_grade <> v_student_grade'
    ) = 0
    or pg_catalog.strpos(
      v_start_definition,
      'v_unit_total_questions <> 24'
    ) <> 0
    or pg_catalog.strpos(
      v_start_definition,
      'prerequisite_attempt.status = ''COMPLETED'''
    ) = 0
  then
    raise exception 'Multi-grade start RPC validation failed';
  end if;

  select
    count(*),
    max(pg_catalog.pg_get_functiondef(procedure.oid))
  into
    v_function_count,
    v_submit_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'submit_practice_answer'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_attempt_id uuid, p_question_id text, p_answer text';

  if
    v_function_count <> 1
    or v_submit_definition is null
    or pg_catalog.strpos(v_submit_definition, 'SECURITY DEFINER') = 0
    or pg_catalog.strpos(v_submit_definition, 'SET search_path TO ''''') = 0
    or pg_catalog.strpos(v_submit_definition, 'auth.uid()') = 0
    or pg_catalog.strpos(
      v_submit_definition,
      'attempt.student_id = v_current_user_id'
    ) = 0
    or pg_catalog.strpos(
      v_submit_definition,
      'v_answered_count = v_total_questions'
    ) = 0
    or pg_catalog.strpos(
      v_submit_definition,
      'v_answered_count = 24'
    ) <> 0
    or pg_catalog.strpos(v_submit_definition, '^[0-9]{1,6}$') = 0
  then
    raise exception 'Multi-grade submit RPC validation failed';
  end if;

  if
    pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.practice_attempts',
      'INSERT,UPDATE,DELETE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.practice_answers',
      'INSERT,UPDATE,DELETE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.submit_practice_answer(uuid,text,text)',
      'EXECUTE'
    )
    or exists (
      select 1
      from pg_catalog.pg_proc as procedure
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) as privilege
      where procedure.oid in (
        'public.start_or_resume_practice(text)'::regprocedure,
        'public.submit_practice_answer(uuid,text,text)'::regprocedure
      )
        and privilege.grantee = 0
        and privilege.privilege_type = 'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.submit_practice_answer(uuid,text,text)',
      'EXECUTE'
    )
  then
    raise exception 'Multi-grade foundation privilege validation failed';
  end if;
end;
$validation$;

commit;
