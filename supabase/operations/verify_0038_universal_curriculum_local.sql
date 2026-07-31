\set ON_ERROR_STOP on

-- Run only against a disposable loopback database after:
-- 1. migrations 0001-0038;
-- 2. tests/fixtures/0035-remote-history-baseline.sql;
-- 3. an ACTIVE local materialization;
-- The transaction rolls back all synthetic journey evidence.

begin;
\ir ../../tests/fixtures/universal-curriculum-local-users.sql

do $integration$
declare
  v_grade integer;
  v_user_id uuid;
  v_unit_id text;
  v_state jsonb;
  v_resumed jsonb;
  v_attempt_id uuid;
  v_question_id text;
  v_answer_type text;
  v_correct_answer text;
  v_wrong_answer text;
  v_submission_id uuid;
  v_revision integer;
  v_before_evidence integer;
  v_after_evidence integer;
  v_progress jsonb;
  v_history jsonb;
  v_fixture_attempts_before integer;
  v_fixture_answers_before integer;
  v_fixture_attempts_after integer;
  v_fixture_answers_after integer;
begin
  select count(*) into v_fixture_attempts_before
  from public.practice_attempts
  where student_id = '30000000-0000-4000-8000-000000000001';
  select count(*) into v_fixture_answers_before
  from public.practice_answers as answer
  join public.practice_attempts as attempt on attempt.id = answer.attempt_id
  where attempt.student_id = '30000000-0000-4000-8000-000000000001';
  if v_fixture_attempts_before <> 18 or v_fixture_answers_before <> 340 then
    raise exception 'CURRICULUM:LEGACY_FIXTURE_PRECONDITION_FAILED';
  end if;

  -- Grade 1 remains on the verified legacy fixed-practice runtime.
  perform set_config(
    'request.jwt.claim.sub',
    '41000000-0000-4000-8000-000000000001',
    true
  );
  v_state := public.start_or_resume_practice('grade-1-numbers-to-10');
  v_attempt_id := (v_state ->> 'attempt_id')::uuid;
  for v_question_id in
    select jsonb_array_elements_text(v_state -> 'question_order')
  loop
    select solution.correct_answer into v_correct_answer
    from public.question_solutions as solution
    where solution.question_id = v_question_id;
    perform public.submit_practice_answer(
      v_attempt_id,
      v_question_id,
      v_correct_answer
    );
  end loop;
  select public.get_student_curriculum_progress() into v_progress;
  select public.get_student_curriculum_history() into v_history;
  if
    v_progress ->> 'compatibility_mode' <> 'LEGACY_GRADE1_AGGREGATED'
    or jsonb_array_length(v_history -> 'attempts') = 0
  then
    raise exception 'CURRICULUM:GRADE1_COMPATIBILITY_FAILED';
  end if;

  -- Grades 2-9 use release-bound universal attempts.
  for v_grade in 2..9 loop
    v_user_id := format(
      '41000000-0000-4000-8000-%s',
      lpad(v_grade::text, 12, '0')
    )::uuid;
    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    select unit.unit_id into v_unit_id
    from public.curriculum_release_units as unit
    join public.curriculum_releases as release
      on release.release_id = unit.release_id
    where unit.grade = v_grade
      and release.status = 'ACTIVE'
      and release.activation_state = 'ACTIVE'
    order by unit.display_order
    limit 1;

    v_state := public.start_or_resume_curriculum_unit(
      v_unit_id,
      extensions.gen_random_uuid()
    );
    v_attempt_id := (v_state ->> 'attempt_id')::uuid;
    if
      v_state -> 'feedback' <> 'null'::jsonb
      or v_state -> 'current_question' ? 'correct_answer'
      or v_state -> 'current_question' ? 'solution_steps'
    then
      raise exception 'CURRICULUM:SOLUTION_PRELOAD_DETECTED';
    end if;

    v_resumed := public.start_or_resume_curriculum_unit(
      v_unit_id,
      extensions.gen_random_uuid()
    );
    if v_resumed ->> 'attempt_id' <> v_attempt_id::text then
      raise exception 'CURRICULUM:RESUME_IDENTITY_FAILED';
    end if;

    while v_state ->> 'status' = 'IN_PROGRESS' loop
      v_question_id := v_state #>> '{current_question,question_id}';
      v_revision := (v_state ->> 'revision')::integer;
      select
        question.answer_type,
        solution.correct_answer
      into
        v_answer_type,
        v_correct_answer
      from public.curriculum_release_questions as question
      join private.curriculum_release_solutions as solution
        on solution.release_id = question.release_id
        and solution.question_id = question.question_id
      where question.release_id = v_state ->> 'release_id'
        and question.question_id = v_question_id;

      if (v_state ->> 'answered_count')::integer = 0 then
        v_wrong_answer := case
          when v_answer_type = 'MULTIPLE_CHOICE'
            then case when upper(v_correct_answer) = 'A' then 'B' else 'A' end
          else '__not_the_expected_answer__'
        end;
        v_submission_id := extensions.gen_random_uuid();
        v_state := public.submit_curriculum_answer(
          v_attempt_id,
          v_question_id,
          v_wrong_answer,
          v_revision,
          v_submission_id
        );
        if
          (v_state #>> '{feedback,is_correct}')::boolean
          or v_state #>> '{feedback,correct_answer}' is null
          or v_state #> '{feedback,solution_steps}' is null
        then
          raise exception 'CURRICULUM:INCORRECT_FEEDBACK_FAILED';
        end if;
        select count(*) into v_before_evidence
        from public.curriculum_answers
        where attempt_id = v_attempt_id;
        -- Regression for PostgreSQL rowtype handling in the idempotent branch:
        -- the replay must load the public question and private solution into
        -- separate %rowtype variables and return the exact prior result.
        v_resumed := public.submit_curriculum_answer(
          v_attempt_id,
          v_question_id,
          v_wrong_answer,
          v_revision,
          v_submission_id
        );
        if
          v_resumed ->> 'attempt_id' <> v_attempt_id::text
          or (v_resumed ->> 'revision')::integer
            <> (v_state ->> 'revision')::integer
          or v_resumed #>> '{feedback,question_id}' <> v_question_id
          or (v_resumed #>> '{feedback,is_correct}')::boolean
          or v_resumed #>> '{feedback,correct_answer}' is null
          or v_resumed #> '{feedback,solution_steps}' is null
        then
          raise exception 'CURRICULUM:IDEMPOTENT_REPLAY_STATE_MISMATCH';
        end if;
        select count(*) into v_after_evidence
        from public.curriculum_answers
        where attempt_id = v_attempt_id;
        if v_before_evidence <> v_after_evidence then
          raise exception 'CURRICULUM:IDEMPOTENCY_EVIDENCE_DUPLICATED';
        end if;
        begin
          perform public.submit_curriculum_answer(
            v_attempt_id,
            v_question_id,
            v_correct_answer,
            v_revision,
            v_submission_id
          );
          raise exception 'CURRICULUM:IDEMPOTENCY_CONFLICT_NOT_RAISED';
        exception
          when others then
            if sqlerrm <> 'CURRICULUM:IDEMPOTENCY_CONFLICT' then raise; end if;
        end;

        begin
          perform public.submit_curriculum_answer(
            v_attempt_id,
            v_state #>> '{current_question,question_id}',
            'A',
            v_revision,
            extensions.gen_random_uuid()
          );
          raise exception 'CURRICULUM:CAS_CONFLICT_NOT_RAISED';
        exception
          when others then
            if sqlerrm <> 'CURRICULUM:REVISION_CONFLICT' then raise; end if;
        end;
        v_state := public.get_curriculum_attempt_state(v_attempt_id);
      else
        v_state := public.submit_curriculum_answer(
          v_attempt_id,
          v_question_id,
          v_correct_answer,
          v_revision,
          extensions.gen_random_uuid()
        );
        if not (v_state #>> '{feedback,is_correct}')::boolean then
          raise exception 'CURRICULUM:CORRECT_SUBMISSION_FAILED';
        end if;
        v_state := public.get_curriculum_attempt_state(v_attempt_id);
      end if;
    end loop;

    if
      v_state ->> 'status' <> 'COMPLETED'
      or (v_state ->> 'answered_count')::integer <> 12
    then
      raise exception 'CURRICULUM:UNIT_COMPLETION_FAILED';
    end if;
    v_progress := public.get_student_curriculum_progress();
    v_history := public.get_student_curriculum_history();
    if
      jsonb_array_length(v_progress -> 'outcomes') = 0
      or jsonb_array_length(v_progress -> 'skills') = 0
      or jsonb_array_length(v_history -> 'attempts') = 0
    then
      raise exception 'CURRICULUM:PROGRESS_HISTORY_FAILED';
    end if;
  end loop;

  select count(*) into v_fixture_attempts_after
  from public.practice_attempts
  where student_id = '30000000-0000-4000-8000-000000000001';
  select count(*) into v_fixture_answers_after
  from public.practice_answers as answer
  join public.practice_attempts as attempt on attempt.id = answer.attempt_id
  where attempt.student_id = '30000000-0000-4000-8000-000000000001';
  if
    v_fixture_attempts_after <> v_fixture_attempts_before
    or v_fixture_answers_after <> v_fixture_answers_before
  then
    raise exception 'CURRICULUM:LEGACY_FIXTURE_MUTATED';
  end if;

  -- A Student cannot start a unit from another registered grade.
  perform set_config(
    'request.jwt.claim.sub',
    '41000000-0000-4000-8000-000000000002',
    true
  );
  select unit.unit_id into v_unit_id
  from public.curriculum_release_units as unit
  join public.curriculum_releases as release
    on release.release_id = unit.release_id
  where unit.grade = 3
    and release.status = 'ACTIVE'
    and release.activation_state = 'ACTIVE'
  order by unit.display_order
  limit 1;
  begin
    perform public.start_or_resume_curriculum_unit(
      v_unit_id,
      extensions.gen_random_uuid()
    );
    raise exception 'CURRICULUM:WRONG_GRADE_START_NOT_DENIED';
  exception
    when others then
      if sqlerrm <> 'CURRICULUM:UNIT_UNAVAILABLE' then raise; end if;
  end;

  -- Cross-user ownership denial.
  perform set_config(
    'request.jwt.claim.sub',
    '41000000-0000-4000-8000-000000000003',
    true
  );
  begin
    perform public.get_curriculum_attempt_state(v_attempt_id);
    raise exception 'CURRICULUM:CROSS_USER_READ_NOT_DENIED';
  exception
    when others then
      if sqlerrm <> 'CURRICULUM:ATTEMPT_NOT_FOUND' then raise; end if;
  end;

  -- Parent and Teacher are denied the Student runtime.
  foreach v_user_id in array array[
    '42000000-0000-4000-8000-000000000001'::uuid,
    '43000000-0000-4000-8000-000000000001'::uuid
  ] loop
    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    begin
      perform public.get_student_curriculum_progress();
      raise exception 'CURRICULUM:ROLE_ACCESS_NOT_DENIED';
    exception
      when others then
      if sqlerrm <> 'CURRICULUM:FORBIDDEN' then raise; end if;
    end;
  end loop;

  -- Missing JWT identity is denied before any runtime data is returned.
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.get_student_curriculum_progress();
    raise exception 'CURRICULUM:ANON_ACCESS_NOT_DENIED';
  exception
    when others then
      if sqlerrm <> 'CURRICULUM:UNAUTHENTICATED' then raise; end if;
  end;
end;
$integration$;

-- Browser roles cannot mutate authoritative evidence or read solutions.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '41000000-0000-4000-8000-000000000002',
  true
);

do $privilege_checks$
begin
  begin
    perform 1 from private.curriculum_release_solutions limit 1;
    raise exception 'CURRICULUM:PRIVATE_SOLUTION_READ_NOT_DENIED';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.curriculum_answers where false;
    raise exception 'CURRICULUM:DIRECT_ANSWER_MUTATION_NOT_DENIED';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.student_curriculum_outcome_progress
    set evidence_count = evidence_count
    where false;
    raise exception 'CURRICULUM:DIRECT_PROGRESS_MUTATION_NOT_DENIED';
  exception when insufficient_privilege then null;
  end;
end;
$privilege_checks$;

reset role;
rollback;

\echo 'Universal curriculum disposable DB integration: PASS'
