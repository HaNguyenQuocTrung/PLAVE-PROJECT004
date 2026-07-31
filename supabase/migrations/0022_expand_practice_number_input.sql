begin;

-- NUMBER_INPUT originally belonged only to the foundation unit, so the
-- grading RPC limited every numeric response to 0..10. New published units
-- contain valid answers through 20. Keep correctness private and server-side,
-- but validate the input as a bounded non-negative integer instead of imposing
-- a curriculum-specific answer range at this shared boundary.
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
    attempt.answered_count,
    attempt.correct_count
  into
    v_attempt_status,
    v_unit_slug,
    v_question_order,
    v_answered_count,
    v_correct_count
  from public.practice_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_attempt_status is null then
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
    and question.unit_slug = v_unit_slug
    and question.published;

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

  v_completed := v_answered_count = 24;

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
    and attempt.student_id = v_current_user_id;

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
  function_count integer;
  function_definition text;
begin
  select
    count(*),
    min(pg_catalog.pg_get_functiondef(routine.oid))
  into function_count, function_definition
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'submit_practice_answer'
    and pg_catalog.pg_get_function_identity_arguments(routine.oid)
      = 'p_attempt_id uuid, p_question_id text, p_answer text';

  if
    function_count <> 1
    or function_definition not like '%SECURITY DEFINER%'
    or function_definition not like '%SET search_path TO ''''%'
    or function_definition not like '%^[0-9]{1,6}$%'
    or function_definition like '%not between 0 and 10%'
    or function_definition not like '%pa.student_id = v_current_user_id%'
      and function_definition not like
        '%attempt.student_id = v_current_user_id%'
    or function_definition not like '%pg_advisory_xact_lock%'
  then
    raise exception 'practice number input validation failed';
  end if;

  if
    not pg_catalog.has_function_privilege(
      'authenticated',
      'public.submit_practice_answer(uuid,text,text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.submit_practice_answer(uuid,text,text)',
      'EXECUTE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
  then
    raise exception 'practice grading permission validation failed';
  end if;
end;
$validation$;

commit;
