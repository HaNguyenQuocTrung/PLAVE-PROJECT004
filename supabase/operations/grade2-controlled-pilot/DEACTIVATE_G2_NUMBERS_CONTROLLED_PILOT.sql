begin;

do $deactivation$
declare
  v_grade1_units_before bigint;
  v_grade1_questions_before bigint;
  v_grade1_solutions_before bigint;
  v_practice_attempts_before bigint;
  v_practice_answers_before bigint;
  v_diagnostic_attempts_before bigint;
  v_diagnostic_answers_before bigint;
  v_adaptive_attempts_before bigint;
  v_adaptive_answers_before bigint;
  v_updated_count bigint;
begin
  select count(*) into v_grade1_units_before
  from public.learning_units as unit
  where unit.grade = 1 and unit.published;
  select count(*) into v_grade1_questions_before
  from public.questions as question
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where unit.grade = 1 and question.published;
  select count(*) into v_grade1_solutions_before
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where unit.grade = 1;
  select count(*) into v_practice_attempts_before
  from public.practice_attempts;
  select count(*) into v_practice_answers_before
  from public.practice_answers;
  select count(*) into v_diagnostic_attempts_before
  from public.diagnostic_attempts;
  select count(*) into v_diagnostic_answers_before
  from public.diagnostic_answers;
  select count(*) into v_adaptive_attempts_before
  from public.adaptive_practice_attempts;
  select count(*) into v_adaptive_answers_before
  from public.adaptive_practice_answers;

  update public.adaptive_practice_releases as release
  set
    runtime_enabled = false,
    controlled_pilot_enabled = false,
    retention_runtime_enabled = false,
    updated_at = now()
  where release.unit_slug = 'grade-2-numbers-to-1000'
    and release.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and release.content_version = 'g2n1000-1.0.0-rc.1'
    and release.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and release.policy_version =
      'g2n1000-adaptive-policy-1.0.0-pilot'
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN'
    and release.runtime_enabled
    and release.controlled_pilot_enabled
    and not release.retention_runtime_enabled;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'PILOT:DEACTIVATION_PRECONDITION:RELEASE_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.adaptive_practice_releases as release
    join public.learning_units as unit
      on unit.slug = release.unit_slug
    where release.unit_slug = 'grade-2-numbers-to-1000'
      and not release.runtime_enabled
      and not release.controlled_pilot_enabled
      and not release.retention_runtime_enabled
      and release.publication_status = 'DRAFT'
      and release.student_visibility = 'HIDDEN'
      and not unit.published
  ) then
    raise exception 'PILOT:DEACTIVATION_POSTCONDITION:STATE_MISMATCH';
  end if;

  if
    (select count(*) from public.learning_units as unit
      where unit.grade = 1 and unit.published)
      <> v_grade1_units_before
    or (select count(*) from public.questions as question
      join public.learning_units as unit
        on unit.slug = question.unit_slug
      where unit.grade = 1 and question.published)
      <> v_grade1_questions_before
    or (select count(*) from public.question_solutions as solution
      join public.questions as question
        on question.code = solution.question_id
      join public.learning_units as unit
        on unit.slug = question.unit_slug
      where unit.grade = 1)
      <> v_grade1_solutions_before
    or (select count(*) from public.practice_attempts)
      <> v_practice_attempts_before
    or (select count(*) from public.practice_answers)
      <> v_practice_answers_before
    or (select count(*) from public.diagnostic_attempts)
      <> v_diagnostic_attempts_before
    or (select count(*) from public.diagnostic_answers)
      <> v_diagnostic_answers_before
    or (select count(*) from public.adaptive_practice_attempts)
      <> v_adaptive_attempts_before
    or (select count(*) from public.adaptive_practice_answers)
      <> v_adaptive_answers_before
  then
    raise exception 'PILOT:DEACTIVATION_POSTCONDITION:HISTORY_CHANGED';
  end if;
end;
$deactivation$;

commit;
