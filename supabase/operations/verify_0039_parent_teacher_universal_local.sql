\set ON_ERROR_STOP on

-- Run only against the disposable PROJECT004 loopback Supabase database.
-- Migration 0039 must already be applied and the 0038 release bank must be
-- materialized. All identities, links, classes, assignments and evidence
-- below are rolled back. The release activation is also rolled back.

begin;

do $preflight$
declare
  v_units integer;
  v_questions integer;
  v_solutions integer;
  v_outcomes integer;
  v_legacy_attempts integer;
  v_legacy_answers integer;
begin
  select count(*) into v_units
  from public.curriculum_release_units;
  select count(*) into v_questions
  from public.curriculum_release_questions;
  select count(*) into v_solutions
  from private.curriculum_release_solutions;
  select count(distinct outcome_id) into v_outcomes
  from public.curriculum_release_units as unit
  cross join lateral unnest(unit.official_outcome_ids)
    as outcome(outcome_id);
  if
    v_units <> 171
    or v_questions <> 2052
    or v_solutions <> 2052
    or v_outcomes <> 546
  then
    raise exception 'COLLABORATION:RELEASE_COUNTS_FAILED';
  end if;

  select count(*) into v_legacy_attempts
  from public.practice_attempts
  where student_id = '30000000-0000-4000-8000-000000000001';
  select count(*) into v_legacy_answers
  from public.practice_answers as answer
  join public.practice_attempts as attempt on attempt.id = answer.attempt_id
  where attempt.student_id = '30000000-0000-4000-8000-000000000001';
  if v_legacy_attempts <> 18 or v_legacy_answers <> 340 then
    raise exception 'COLLABORATION:LEGACY_BASELINE_FAILED';
  end if;

  if exists (
    select 1 from public.curriculum_releases
    where status = 'ACTIVE' or activation_state = 'ACTIVE'
  ) then
    raise exception 'COLLABORATION:RELEASE_NOT_INACTIVE_AT_START';
  end if;

  update public.curriculum_releases
  set
    status = 'ACTIVE',
    activation_state = 'ACTIVE',
    activated_at = now()
  where release_id = (
    select release_id
    from public.curriculum_releases
    order by created_at desc
    limit 1
  )
    and status = 'DRAFT'
    and activation_state = 'INACTIVE';
  if not found then
    raise exception 'COLLABORATION:LOCAL_ACTIVATION_FAILED';
  end if;
end;
$preflight$;

\ir ../../tests/fixtures/parent-teacher-universal-local-users.sql

create temporary table per_grade_acceptance_evidence (
  grade smallint primary key check (grade between 1 and 9),
  curriculum_visible boolean not null default false,
  independent_practice_started boolean not null default false,
  database_graded_answer boolean not null default false,
  attempt_history_persisted boolean not null default false,
  unit_outcome_skill_progress boolean not null default false,
  linked_parent_progress boolean not null default false,
  unlinked_parent_denied boolean not null default false,
  teacher_assignment_published boolean not null default false,
  student_assignment_submitted boolean not null default false,
  teacher_gradebook_evidence boolean not null default false,
  wrong_grade_cross_classroom_denied boolean not null default false,
  no_solution_leak_before_submit boolean not null default false
) on commit drop;

insert into per_grade_acceptance_evidence (grade)
select grade from generate_series(1, 9) as grade;

create temporary table synthetic_assignment_map (
  grade smallint primary key,
  teacher_id uuid not null,
  classroom_id uuid not null,
  student_id uuid not null,
  unit_id text not null,
  draft_id uuid not null,
  assignment_id uuid not null
) on commit drop;

do $independent_grade_journeys$
declare
  v_grade smallint;
  v_student_id uuid;
  v_unit_id text;
  v_state jsonb;
  v_result jsonb;
  v_progress jsonb;
  v_history jsonb;
  v_attempt_id uuid;
  v_question_id text;
  v_correct_answer text;
  v_revision integer;
begin
  for v_grade in 1..9 loop
    v_student_id := format(
      '51000000-0000-4000-8000-%s',
      lpad(v_grade::text, 12, '0')
    )::uuid;
    perform set_config('request.jwt.claim.sub', v_student_id::text, true);

    if v_grade = 1 then
      select unit.slug into v_unit_id
      from public.learning_units as unit
      where unit.grade = 1 and unit.published
      order by unit.display_order
      limit 1;
      if
        v_unit_id is null
        or exists (
          select 1 from public.learning_units
          where slug = v_unit_id and grade <> v_grade
        )
      then
        raise exception 'PER_GRADE:GRADE_1_CURRICULUM_FAILED';
      end if;
      update per_grade_acceptance_evidence
      set curriculum_visible = true where grade = v_grade;

      v_state := public.start_or_resume_practice(v_unit_id);
      v_attempt_id := (v_state ->> 'attempt_id')::uuid;
      v_question_id := v_state -> 'question_order' ->> 0;
      if
        v_attempt_id is null
        or v_question_id is null
        or v_state::text like '%correct_answer%'
        or v_state::text like '%solution_steps%'
      then
        raise exception 'PER_GRADE:GRADE_1_START_OR_SOLUTION_BOUNDARY_FAILED';
      end if;
      update per_grade_acceptance_evidence
      set
        independent_practice_started = true,
        no_solution_leak_before_submit = true
      where grade = v_grade;

      select solution.correct_answer into v_correct_answer
      from public.question_solutions as solution
      where solution.question_id = v_question_id;
      v_result := public.submit_practice_answer(
        v_attempt_id, v_question_id, v_correct_answer
      );
      if
        not (v_result ->> 'is_correct')::boolean
        or not exists (
          select 1 from public.practice_answers
          where attempt_id = v_attempt_id
            and question_id = v_question_id
            and is_correct
        )
      then
        raise exception 'PER_GRADE:GRADE_1_DATABASE_GRADING_FAILED';
      end if;
    else
      select unit.unit_id into v_unit_id
      from public.curriculum_release_units as unit
      join public.curriculum_releases as release
        on release.release_id = unit.release_id
      where unit.grade = v_grade
        and release.status = 'ACTIVE'
        and release.activation_state = 'ACTIVE'
      order by unit.display_order
      limit 1;
      if
        v_unit_id is null
        or exists (
          select 1
          from public.curriculum_release_units
          where unit_id = v_unit_id and grade <> v_grade
        )
      then
        raise exception 'PER_GRADE:GRADE_%_CURRICULUM_FAILED', v_grade;
      end if;
      update per_grade_acceptance_evidence
      set curriculum_visible = true where grade = v_grade;

      v_state := public.start_or_resume_curriculum_unit(
        v_unit_id, extensions.gen_random_uuid()
      );
      v_attempt_id := (v_state ->> 'attempt_id')::uuid;
      v_question_id := v_state #>> '{current_question,question_id}';
      v_revision := (v_state ->> 'revision')::integer;
      if
        v_attempt_id is null
        or v_question_id is null
        or v_state -> 'feedback' <> 'null'::jsonb
        or v_state -> 'current_question' ? 'correct_answer'
        or v_state -> 'current_question' ? 'solution_steps'
      then
        raise exception 'PER_GRADE:GRADE_%_START_OR_SOLUTION_BOUNDARY_FAILED',
          v_grade;
      end if;
      update per_grade_acceptance_evidence
      set
        independent_practice_started = true,
        no_solution_leak_before_submit = true
      where grade = v_grade;

      select solution.correct_answer into v_correct_answer
      from private.curriculum_release_solutions as solution
      where solution.release_id = v_state ->> 'release_id'
        and solution.question_id = v_question_id;
      v_result := public.submit_curriculum_answer(
        v_attempt_id,
        v_question_id,
        v_correct_answer,
        v_revision,
        extensions.gen_random_uuid()
      );
      if
        not (v_result #>> '{feedback,is_correct}')::boolean
        or not exists (
          select 1 from public.curriculum_answers
          where attempt_id = v_attempt_id
            and question_id = v_question_id
            and is_correct
        )
      then
        raise exception 'PER_GRADE:GRADE_%_DATABASE_GRADING_FAILED', v_grade;
      end if;
    end if;

    update per_grade_acceptance_evidence
    set database_graded_answer = true
    where grade = v_grade;

    v_progress := public.get_student_curriculum_progress();
    v_history := public.get_student_curriculum_history();
    if
      (v_progress ->> 'grade')::smallint <> v_grade
      or (v_history ->> 'grade')::smallint <> v_grade
      or jsonb_array_length(v_history -> 'attempts') = 0
      or jsonb_array_length(v_progress -> 'units') = 0
      or jsonb_array_length(v_progress -> 'outcomes') = 0
      or jsonb_array_length(v_progress -> 'skills') = 0
    then
      raise exception 'PER_GRADE:GRADE_%_PROGRESS_HISTORY_FAILED', v_grade;
    end if;
    update per_grade_acceptance_evidence
    set
      attempt_history_persisted = true,
      unit_outcome_skill_progress = true
    where grade = v_grade;
  end loop;
end;
$independent_grade_journeys$;

do $teacher_creation$
declare
  v_grade smallint;
  v_teacher_id uuid;
  v_classroom_id uuid;
  v_student_id uuid;
  v_unit_id text;
  v_catalog jsonb;
  v_draft jsonb;
  v_published jsonb;
  v_wrong_question_id text;
begin
  for v_grade in 1..9 loop
    v_teacher_id := case when v_grade <= 5
      then '53000000-0000-4000-8000-000000000001'::uuid
      else '53000000-0000-4000-8000-000000000002'::uuid
    end;
    v_classroom_id := format(
      '54000000-0000-4000-8000-%s',
      lpad(v_grade::text, 12, '0')
    )::uuid;
    v_student_id := format(
      '51000000-0000-4000-8000-%s',
      lpad(v_grade::text, 12, '0')
    )::uuid;
    select unit.unit_id into v_unit_id
    from public.curriculum_release_units as unit
    join public.curriculum_releases as release
      on release.release_id = unit.release_id
    where unit.grade = v_grade
      and release.status = 'ACTIVE'
      and release.activation_state = 'ACTIVE'
    order by unit.display_order
    limit 1;

    perform set_config('request.jwt.claim.sub', v_teacher_id::text, true);
    v_catalog := public.get_teacher_curriculum_catalog(
      p_classroom_id => v_classroom_id,
      p_unit_id => v_unit_id,
      p_domain => null::text,
      p_outcome_id => null::text,
      p_skill_id => null::text,
      p_limit => 24::integer,
      p_offset => 0::integer
    );
    if
      (v_catalog ->> 'grade')::smallint <> v_grade
      or jsonb_array_length(v_catalog -> 'questions') = 0
      or v_catalog::text like '%correct_answer%'
      or v_catalog::text like '%solution_steps%'
    then
      raise exception 'COLLABORATION:TEACHER_CATALOG_FAILED';
    end if;

    v_draft := public.create_teacher_curriculum_assignment_draft(
      p_classroom_id => v_classroom_id,
      p_title => format('Bài synthetic Lớp %s', v_grade)::text,
      p_instructions => 'Làm bài theo nhịp học phù hợp.'::text,
      p_due_at => null::timestamptz,
      p_selection_mode => 'DETERMINISTIC'::text,
      p_unit_id => v_unit_id,
      p_outcome_id => null::text,
      p_skill_id => null::text,
      p_question_ids => null::text[],
      p_question_count => 2::smallint,
      p_deterministic_seed =>
        format('synthetic-grade-%s-v1', v_grade)::text,
      p_request_id => extensions.gen_random_uuid()
    );
    if
      v_draft ->> 'status' <> 'DRAFT'
      or (v_draft ->> 'item_count')::integer <> 2
    then
      raise exception 'COLLABORATION:DRAFT_CREATE_FAILED';
    end if;

    v_published := public.publish_teacher_curriculum_assignment_draft(
      p_draft_id => (v_draft ->> 'draft_id')::uuid,
      p_request_id => extensions.gen_random_uuid()
    );
    if
      v_published ->> 'status' <> 'PUBLISHED'
      or (v_published ->> 'total_count')::integer <> 2
    then
      raise exception 'COLLABORATION:PUBLISH_FAILED';
    end if;

    insert into synthetic_assignment_map (
      grade, teacher_id, classroom_id, student_id, unit_id,
      draft_id, assignment_id
    ) values (
      v_grade, v_teacher_id, v_classroom_id, v_student_id, v_unit_id,
      (v_draft ->> 'draft_id')::uuid,
      (v_published ->> 'assignment_id')::uuid
    );
    update per_grade_acceptance_evidence
    set teacher_assignment_published = true
    where grade = v_grade;
  end loop;

  -- A different Teacher cannot browse or publish against another
  -- Teacher's classroom.
  perform set_config(
    'request.jwt.claim.sub',
    '53000000-0000-4000-8000-000000000002',
    true
  );
  begin
    perform public.get_teacher_curriculum_catalog(
      p_classroom_id =>
        '54000000-0000-4000-8000-000000000002'::uuid,
      p_unit_id => null::text,
      p_domain => null::text,
      p_outcome_id => null::text,
      p_skill_id => null::text,
      p_limit => 24::integer,
      p_offset => 0::integer
    );
    raise exception 'COLLABORATION:CROSS_TEACHER_NOT_DENIED';
  exception when others then
    if sqlerrm <> 'Curriculum catalog unavailable' then raise; end if;
  end;

  -- A Grade 3 question cannot be smuggled into a Grade 2 classroom.
  select question.question_id into v_wrong_question_id
  from public.curriculum_release_questions as question
  join public.curriculum_release_units as unit
    on unit.release_id = question.release_id
    and unit.unit_id = question.unit_id
  join public.curriculum_releases as release
    on release.release_id = question.release_id
  where unit.grade = 3
    and release.status = 'ACTIVE'
    and release.activation_state = 'ACTIVE'
  order by unit.display_order, question.display_order
  limit 1;
  perform set_config(
    'request.jwt.claim.sub',
    '53000000-0000-4000-8000-000000000001',
    true
  );
  begin
    perform public.create_teacher_curriculum_assignment_draft(
      p_classroom_id =>
        '54000000-0000-4000-8000-000000000002'::uuid,
      p_title => 'Sai lớp synthetic'::text,
      p_instructions => null::text,
      p_due_at => null::timestamptz,
      p_selection_mode => 'MANUAL'::text,
      p_unit_id => null::text,
      p_outcome_id => null::text,
      p_skill_id => null::text,
      p_question_ids => array[v_wrong_question_id]::text[],
      p_question_count => 1::smallint,
      p_deterministic_seed => 'manual-selection-v1'::text,
      p_request_id => extensions.gen_random_uuid()
    );
    raise exception 'COLLABORATION:WRONG_GRADE_NOT_DENIED';
  exception when others then
    if sqlerrm <> 'Curriculum draft selection unavailable' then raise; end if;
  end;
end;
$teacher_creation$;

do $student_journeys$
declare
  v_row record;
  v_start jsonb;
  v_state jsonb;
  v_saved jsonb;
  v_replay jsonb;
  v_submitted jsonb;
  v_submission_id uuid;
  v_question jsonb;
  v_question_id uuid;
  v_question_type text;
  v_correct_answer text;
  v_answer text;
  v_revision integer;
  v_save_key uuid;
  v_submit_key uuid;
  v_question_index integer;
  v_independent_before bigint;
  v_independent_after bigint;
begin
  select count(*) into v_independent_before
  from public.curriculum_answers
  where attempt_id in (
    select id from public.curriculum_attempts
    where student_id::text like '51000000-0000-4000-8000-%'
  );

  for v_row in select * from synthetic_assignment_map order by grade loop
    perform set_config(
      'request.jwt.claim.sub',
      v_row.student_id::text,
      true
    );
    v_start := public.start_or_resume_assignment_submission(
      v_row.assignment_id
    );
    v_submission_id := (v_start ->> 'submission_id')::uuid;
    v_state := public.get_assignment_submission_state(v_row.assignment_id);
    if
      v_state ->> 'submission_id' <> v_submission_id::text
      or v_state::text like '%correct_answer%'
      or v_state::text like '%solution_steps%'
      or jsonb_array_length(v_state -> 'questions') <> 2
    then
      raise exception 'COLLABORATION:STUDENT_STATE_FAILED';
    end if;

    v_question_index := 0;
    for v_question in
      select value
      from jsonb_array_elements(v_state -> 'questions')
      order by (value ->> 'display_order')::integer
    loop
      v_question_index := v_question_index + 1;
      v_question_id := (v_question ->> 'question_id')::uuid;
      v_question_type := v_question ->> 'question_type';
      select solution.correct_answer into v_correct_answer
      from public.teacher_question_solutions as solution
      where solution.question_id = v_question_id;
      v_answer := v_correct_answer;
      if v_row.grade = 7 and v_question_index = 1 then
        v_answer := case
          when v_question_type = 'MULTIPLE_CHOICE'
            then case when v_correct_answer = 'a' then 'B' else 'A' end
          else '__synthetic_wrong__'
        end;
      end if;

      v_revision := (v_state ->> 'revision')::integer;
      v_save_key := extensions.gen_random_uuid();
      v_saved := public.save_assignment_draft_answer_v2(
        v_submission_id,
        v_question_id,
        v_answer,
        v_revision,
        v_save_key
      );
      if
        not (v_saved ->> 'saved')::boolean
        or (v_saved ->> 'revision')::integer <> v_revision + 1
      then
        raise exception 'COLLABORATION:SAVE_FAILED';
      end if;

      if v_question_index = 1 then
        v_replay := public.save_assignment_draft_answer_v2(
          v_submission_id,
          v_question_id,
          v_answer,
          v_revision,
          v_save_key
        );
        if
          not (v_replay ->> 'replayed')::boolean
          or (v_replay ->> 'revision')::integer
            <> (v_saved ->> 'revision')::integer
        then
          raise exception 'COLLABORATION:SAVE_IDEMPOTENCY_FAILED';
        end if;
        begin
          perform public.save_assignment_draft_answer_v2(
            v_submission_id,
            v_question_id,
            v_answer,
            v_revision,
            extensions.gen_random_uuid()
          );
          raise exception 'COLLABORATION:CAS_NOT_DENIED';
        exception when others then
          if sqlerrm <> 'ASSIGNMENT:STATE_CONFLICT' then raise; end if;
        end;
      end if;

      v_state := public.get_assignment_submission_state(v_row.assignment_id);

      -- Grade 2 retries the first draft answer before final submit.
      if v_row.grade = 2 and v_question_index = 1 then
        v_answer := case
          when v_question_type = 'MULTIPLE_CHOICE'
            then case when v_correct_answer = 'a' then 'B' else 'A' end
          else '__synthetic_wrong__'
        end;
        v_saved := public.save_assignment_draft_answer_v2(
          v_submission_id,
          v_question_id,
          v_answer,
          (v_state ->> 'revision')::integer,
          extensions.gen_random_uuid()
        );
        v_saved := public.save_assignment_draft_answer_v2(
          v_submission_id,
          v_question_id,
          v_correct_answer,
          (v_saved ->> 'revision')::integer,
          extensions.gen_random_uuid()
        );
        v_state := public.get_assignment_submission_state(
          v_row.assignment_id
        );
      end if;

    end loop;

    v_state := public.get_assignment_submission_state(v_row.assignment_id);
    v_submit_key := extensions.gen_random_uuid();
    v_submitted := public.submit_assignment_submission_v2(
      v_submission_id,
      (v_state ->> 'revision')::integer,
      v_submit_key
    );
    if
      v_submitted ->> 'status' <> 'SUBMITTED'
      or (v_submitted ->> 'total_count')::integer <> 2
    then
      raise exception 'COLLABORATION:SUBMIT_FAILED';
    end if;
    v_replay := public.submit_assignment_submission_v2(
      v_submission_id,
      (v_state ->> 'revision')::integer,
      v_submit_key
    );
    if
      not (v_replay ->> 'replayed')::boolean
      or v_replay ->> 'score_percent'
        <> v_submitted ->> 'score_percent'
    then
      raise exception 'COLLABORATION:SUBMIT_IDEMPOTENCY_FAILED';
    end if;

    if not exists (
      select 1 from public.student_assignment_outcome_progress
      where student_id = v_row.student_id
        and assignment_id = v_row.assignment_id
    ) or not exists (
      select 1 from public.student_assignment_skill_progress
      where student_id = v_row.student_id
        and assignment_id = v_row.assignment_id
    ) then
      raise exception 'COLLABORATION:ASSIGNMENT_EVIDENCE_FAILED';
    end if;
    update per_grade_acceptance_evidence
    set student_assignment_submitted = true
    where grade = v_row.grade;
  end loop;

  select count(*) into v_independent_after
  from public.curriculum_answers
  where attempt_id in (
    select id from public.curriculum_attempts
    where student_id::text like '51000000-0000-4000-8000-%'
  );
  if v_independent_after <> v_independent_before then
    raise exception 'COLLABORATION:INDEPENDENT_EVIDENCE_MIXED';
  end if;

  -- For every grade, a Student from a different grade/classroom is denied.
  for v_row in select * from synthetic_assignment_map order by grade loop
    perform set_config(
      'request.jwt.claim.sub',
      format(
        '51000000-0000-4000-8000-%s',
        lpad(
          (case when v_row.grade = 9 then 1 else v_row.grade + 1 end)::text,
          12,
          '0'
        )
      ),
      true
    );
    begin
      perform public.start_or_resume_assignment_submission(
        v_row.assignment_id
      );
      raise exception 'COLLABORATION:CROSS_CLASSROOM_NOT_DENIED';
    exception when others then
      if sqlerrm <> 'Assignment unavailable' then raise; end if;
    end;
    update per_grade_acceptance_evidence
    set wrong_grade_cross_classroom_denied = true
    where grade = v_row.grade;
  end loop;
end;
$student_journeys$;

do $parent_and_teacher_reads$
declare
  v_row record;
  v_parent_id uuid;
  v_unlinked_parent_id uuid;
  v_connection_id uuid;
  v_child_progress jsonb;
  v_teacher_evidence jsonb;
begin
  for v_row in select * from synthetic_assignment_map order by grade loop
    v_parent_id := case when v_row.grade % 2 = 1
      then '52000000-0000-4000-8000-000000000001'::uuid
      else '52000000-0000-4000-8000-000000000002'::uuid
    end;
    v_unlinked_parent_id := case when v_row.grade % 2 = 1
      then '52000000-0000-4000-8000-000000000002'::uuid
      else '52000000-0000-4000-8000-000000000001'::uuid
    end;
    v_connection_id := format(
      '52100000-0000-4000-8000-%s',
      lpad(v_row.grade::text, 12, '0')
    )::uuid;

    perform set_config(
      'request.jwt.claim.sub', v_parent_id::text, true
    );
    v_child_progress :=
      public.get_parent_child_universal_progress(v_connection_id);
    if
      (v_child_progress #>> '{student,grade}')::smallint <> v_row.grade
      or (v_child_progress #>> '{summary,attempt_count}')::integer < 1
      or (v_child_progress #>> '{assignment_summary,attempt_count}')::integer
        <> 1
      or jsonb_array_length(v_child_progress -> 'outcomes') = 0
      or jsonb_array_length(v_child_progress -> 'skills') = 0
      or v_child_progress::text like '%correct_answer%'
      or v_child_progress::text like '%solution_steps%'
      or v_child_progress::text like '%normalized_correct_answer%'
    then
      raise exception 'PER_GRADE:GRADE_%_LINKED_PARENT_FAILED', v_row.grade;
    end if;
    update per_grade_acceptance_evidence
    set linked_parent_progress = true
    where grade = v_row.grade;

    perform set_config(
      'request.jwt.claim.sub', v_unlinked_parent_id::text, true
    );
    begin
      perform public.get_parent_child_universal_progress(v_connection_id);
      raise exception 'COLLABORATION:UNLINKED_CHILD_NOT_DENIED';
    exception when others then
      if sqlerrm <> 'PARENT_PROGRESS:FORBIDDEN' then raise; end if;
    end;
    update per_grade_acceptance_evidence
    set unlinked_parent_denied = true
    where grade = v_row.grade;

    perform set_config(
      'request.jwt.claim.sub', v_row.teacher_id::text, true
    );
    v_teacher_evidence :=
      public.get_teacher_assignment_curriculum_evidence(
        v_row.assignment_id
      );
    if
      v_teacher_evidence is null
      or jsonb_array_length(v_teacher_evidence -> 'outcomes') = 0
      or jsonb_array_length(v_teacher_evidence -> 'skills') = 0
      or (v_teacher_evidence ->> 'mastery_claim')::boolean
    then
      raise exception 'PER_GRADE:GRADE_%_TEACHER_EVIDENCE_FAILED',
        v_row.grade;
    end if;
    update per_grade_acceptance_evidence
    set teacher_gradebook_evidence = true
    where grade = v_row.grade;

    perform set_config(
      'request.jwt.claim.sub',
      case when v_row.teacher_id =
        '53000000-0000-4000-8000-000000000001'::uuid
        then '53000000-0000-4000-8000-000000000002'
        else '53000000-0000-4000-8000-000000000001'
      end,
      true
    );
    if public.get_teacher_assignment_curriculum_evidence(
      v_row.assignment_id
    ) is not null then
      raise exception 'COLLABORATION:CROSS_TEACHER_GRADEBOOK_NOT_DENIED';
    end if;
  end loop;

  for v_row in
    select *
    from (values
      (
        '52100000-0000-4000-8000-000000000010'::uuid,
        '52000000-0000-4000-8000-000000000002'::uuid,
        'PENDING'::text
      ),
      (
        '52100000-0000-4000-8000-000000000011'::uuid,
        '52000000-0000-4000-8000-000000000001'::uuid,
        'REJECTED'::text
      ),
      (
        '52100000-0000-4000-8000-000000000012'::uuid,
        '52000000-0000-4000-8000-000000000002'::uuid,
        'REVOKED'::text
      )
    ) as denied(connection_id, parent_id, expected_status)
  loop
    if not exists (
      select 1
      from public.parent_student_connections as connection
      where connection.id = v_row.connection_id
        and connection.status = v_row.expected_status
    ) then
      raise exception 'COLLABORATION:DENIED_CONNECTION_STATE_MISMATCH';
    end if;
    perform set_config(
      'request.jwt.claim.sub', v_row.parent_id::text, true
    );
    begin
      perform public.get_parent_child_universal_progress(
        v_row.connection_id
      );
      raise exception 'COLLABORATION:INACTIVE_CONNECTION_READ_ALLOWED';
    exception when others then
      if sqlerrm <> 'PARENT_PROGRESS:FORBIDDEN' then raise; end if;
    end;
    perform set_config('request.jwt.claim.sub', '', true);
  end loop;
end;
$parent_and_teacher_reads$;

do $lifecycle_and_integrity$
declare
  v_assignment_id uuid;
  v_legacy_attempts integer;
  v_legacy_answers integer;
begin
  select assignment_id into v_assignment_id
  from synthetic_assignment_map where grade = 9;
  perform set_config(
    'request.jwt.claim.sub',
    '53000000-0000-4000-8000-000000000002',
    true
  );
  perform public.close_teacher_assignment(v_assignment_id);
  perform set_config(
    'request.jwt.claim.sub',
    '51000000-0000-4000-8000-000000000009',
    true
  );
  begin
    perform public.start_or_resume_assignment_submission(v_assignment_id);
    raise exception 'COLLABORATION:CLOSED_START_NOT_DENIED';
  exception when others then
    if sqlerrm <> 'Assignment unavailable' then raise; end if;
  end;

  perform set_config(
    'request.jwt.claim.sub',
    '53000000-0000-4000-8000-000000000002',
    true
  );
  perform public.reopen_teacher_assignment(
    p_assignment_id => v_assignment_id,
    p_due_at => null::timestamptz
  );
  perform set_config(
    'request.jwt.claim.sub',
    '51000000-0000-4000-8000-000000000009',
    true
  );
  perform public.start_or_resume_assignment_submission(v_assignment_id);

  select count(*) into v_legacy_attempts
  from public.practice_attempts
  where student_id = '30000000-0000-4000-8000-000000000001';
  select count(*) into v_legacy_answers
  from public.practice_answers as answer
  join public.practice_attempts as attempt on attempt.id = answer.attempt_id
  where attempt.student_id = '30000000-0000-4000-8000-000000000001';
  if v_legacy_attempts <> 18 or v_legacy_answers <> 340 then
    raise exception 'COLLABORATION:LEGACY_HISTORY_MUTATED';
  end if;
end;
$lifecycle_and_integrity$;

set local role authenticated;
do $set_browser_claim$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '52000000-0000-4000-8000-000000000001',
    true
  );
end;
$set_browser_claim$;

do $browser_privilege_denials$
begin
  begin
    perform 1 from private.curriculum_release_solutions limit 1;
    raise exception 'COLLABORATION:PRIVATE_RELEASE_SOLUTION_READ_ALLOWED';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.teacher_question_solutions limit 1;
    raise exception 'COLLABORATION:ASSIGNMENT_SOLUTION_READ_ALLOWED';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.student_assignment_outcome_progress
    set evidence_count = evidence_count
    where false;
    raise exception 'COLLABORATION:PARENT_PROGRESS_MUTATION_ALLOWED';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.assignment_submissions
    set score_percent = score_percent
    where false;
    raise exception 'COLLABORATION:AUTHORITATIVE_MUTATION_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end;
$browser_privilege_denials$;

reset role;

do $per_grade_matrix_complete$
begin
  if exists (
    select 1
    from per_grade_acceptance_evidence
    where not (
      curriculum_visible
      and independent_practice_started
      and database_graded_answer
      and attempt_history_persisted
      and unit_outcome_skill_progress
      and linked_parent_progress
      and unlinked_parent_denied
      and teacher_assignment_published
      and student_assignment_submitted
      and teacher_gradebook_evidence
      and wrong_grade_cross_classroom_denied
      and no_solution_leak_before_submit
    )
  ) then
    raise exception 'PER_GRADE:ACCEPTANCE_MATRIX_INCOMPLETE';
  end if;
end;
$per_grade_matrix_complete$;

\pset format unaligned
\pset tuples_only on
select concat(
  'PER_GRADE_EVIDENCE_JSON=',
  jsonb_build_object(
  'evidenceType', 'LIVE_LOCAL_DATABASE',
  'grades', jsonb_agg(jsonb_build_object(
    'grade', grade,
    'evidenceType', 'LIVE_LOCAL_DATABASE',
    'curriculumVisible', case when curriculum_visible then 'PASS' else 'FAIL' end,
    'independentPracticeStarted', case when independent_practice_started then 'PASS' else 'FAIL' end,
    'databaseGradedAnswer', case when database_graded_answer then 'PASS' else 'FAIL' end,
    'attemptHistoryPersisted', case when attempt_history_persisted then 'PASS' else 'FAIL' end,
    'unitOutcomeSkillProgress', case when unit_outcome_skill_progress then 'PASS' else 'FAIL' end,
    'linkedParentProgress', case when linked_parent_progress then 'PASS' else 'FAIL' end,
    'unlinkedParentDenied', case when unlinked_parent_denied then 'PASS' else 'FAIL' end,
    'teacherAssignmentPublished', case when teacher_assignment_published then 'PASS' else 'FAIL' end,
    'studentAssignmentSubmitted', case when student_assignment_submitted then 'PASS' else 'FAIL' end,
    'teacherGradebookEvidence', case when teacher_gradebook_evidence then 'PASS' else 'FAIL' end,
    'wrongGradeCrossClassroomDenied', case when wrong_grade_cross_classroom_denied then 'PASS' else 'FAIL' end,
    'noSolutionLeakBeforeSubmit', case when no_solution_leak_before_submit then 'PASS' else 'FAIL' end,
    'overall', case when (
      curriculum_visible
      and independent_practice_started
      and database_graded_answer
      and attempt_history_persisted
      and unit_outcome_skill_progress
      and linked_parent_progress
      and unlinked_parent_denied
      and teacher_assignment_published
      and student_assignment_submitted
      and teacher_gradebook_evidence
      and wrong_grade_cross_classroom_denied
      and no_solution_leak_before_submit
    ) then 'PASS' else 'FAIL' end
  ) order by grade)
  )::text
)
from per_grade_acceptance_evidence;
\pset tuples_only off
\pset format aligned

rollback;

\echo 'Parent/Teacher universal disposable DB integration: PASS'
