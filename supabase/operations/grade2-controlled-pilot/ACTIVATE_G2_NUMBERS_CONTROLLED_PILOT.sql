begin;

do $activation$
declare
  v_grade1_units_before bigint;
  v_grade1_questions_before bigint;
  v_grade1_solutions_before bigint;
  v_practice_attempts_before bigint;
  v_practice_answers_before bigint;
  v_diagnostic_attempts_before bigint;
  v_diagnostic_answers_before bigint;
  v_pilot_member_count bigint;
  v_valid_pilot_member_count bigint;
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

  if
    v_grade1_units_before <> 13
    or v_grade1_questions_before <> 312
    or v_grade1_solutions_before <> 312
  then
    raise exception 'PILOT:ACTIVATION_PRECONDITION:GRADE1_BASELINE_MISMATCH';
  end if;

  select count(*)
  into v_pilot_member_count
  from public.adaptive_practice_pilot_members as member
  where member.unit_slug = 'grade-2-numbers-to-1000'
    and member.enabled;

  select count(*)
  into v_valid_pilot_member_count
  from public.adaptive_practice_pilot_members as member
  join public.profiles as profile
    on profile.user_id = member.student_id
  join public.student_profiles as student
    on student.user_id = member.student_id
  where member.unit_slug = 'grade-2-numbers-to-1000'
    and member.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and member.content_version = 'g2n1000-1.0.0-rc.1'
    and member.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and member.policy_version =
      'g2n1000-adaptive-policy-1.0.0-pilot'
    and member.enabled
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 2;

  if
    v_pilot_member_count not between 1 and 5
    or v_valid_pilot_member_count <> v_pilot_member_count
  then
    raise exception 'PILOT:ACTIVATION_PRECONDITION:MEMBERSHIP_MISMATCH';
  end if;

  update public.adaptive_practice_releases as release
  set
    runtime_enabled = true,
    controlled_pilot_enabled = true,
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
    and not release.runtime_enabled
    and not release.controlled_pilot_enabled
    and not release.retention_runtime_enabled;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'PILOT:ACTIVATION_PRECONDITION:RELEASE_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.adaptive_practice_releases as release
    join public.learning_units as unit
      on unit.slug = release.unit_slug
    where release.unit_slug = 'grade-2-numbers-to-1000'
      and release.runtime_enabled
      and release.controlled_pilot_enabled
      and not release.retention_runtime_enabled
      and release.publication_status = 'DRAFT'
      and release.student_visibility = 'HIDDEN'
      and not unit.published
  ) or exists (
    select 1
    from public.questions as question
    where question.unit_slug = 'grade-2-numbers-to-1000'
      and question.published
  ) then
    raise exception 'PILOT:ACTIVATION_POSTCONDITION:VISIBILITY_MISMATCH';
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
  then
    raise exception 'PILOT:ACTIVATION_POSTCONDITION:HISTORY_CHANGED';
  end if;
end;
$activation$;

commit;
