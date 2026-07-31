begin;

-- OWNER-ONLY, SINGLE-USE TEMPLATE FOR CONTROLLED DEV.
-- PostgreSQL cannot independently discover a Supabase Dashboard project ref.
-- The Owner must also compare the SQL Editor URL with the authorized project
-- ref before execution. The confirmation below is an explicit human lock;
-- the schema/candidate fingerprint below is the independently verifiable lock.
do $membership$
declare
  v_owner_project_confirmation constant text :=
    '<OWNER_CONFIRM_AUTHORIZED_SUPABASE_PROJECT_REF>';
  v_student_id constant uuid := '<OWNER_PRIVATE_STUDENT_UUID>'::uuid;
  v_authorized_project_ref constant text := 'ujmwuhwfwbrmudtmmkes';
  v_expected_candidate_fingerprint constant text :=
    '0274b7f3b49830935dbb7120ecd661ec26ca725cf675f1429eea98d975d5b8d5';
  v_eligible_grade2_count bigint := 0;
  v_selected_eligible_count bigint := 0;
  v_membership_count bigint := 0;
  v_candidate_count bigint := 0;
  v_schema_column_count bigint := 0;
  v_schema_total_column_count bigint := 0;
  v_candidate_fingerprint text;
  v_protected_before text;
  v_protected_after text;
  v_inserted_count bigint := 0;
begin
  if
    v_owner_project_confirmation like '<OWNER_%>'
    or v_owner_project_confirmation <> v_authorized_project_ref
  then
    raise exception 'PILOT:MEMBERSHIP:PROJECT_CONFIRMATION_REQUIRED_OR_WRONG';
  end if;

  if
    pg_catalog.to_regclass('public.adaptive_practice_pilot_members') is null
    or pg_catalog.to_regclass('public.adaptive_practice_releases') is null
    or pg_catalog.to_regclass('public.adaptive_practice_attempts') is null
    or pg_catalog.to_regclass('public.adaptive_practice_answers') is null
    or pg_catalog.to_regclass('public.learning_units') is null
    or pg_catalog.to_regclass('public.questions') is null
    or pg_catalog.to_regclass('public.question_solutions') is null
  then
    raise exception 'PILOT:MEMBERSHIP:0036_0037_SCHEMA_REQUIRED';
  end if;

  select count(*)
  into v_schema_column_count
  from information_schema.columns as column_info
  where column_info.table_schema = 'public'
    and (
      (
        column_info.table_name = 'adaptive_practice_releases'
        and column_info.column_name in (
          'unit_slug',
          'release_candidate_id',
          'content_version',
          'bundle_sha256',
          'policy_version',
          'runtime_enabled',
          'controlled_pilot_enabled',
          'retention_runtime_enabled',
          'publication_status',
          'student_visibility'
        )
      )
      or (
        column_info.table_name = 'adaptive_practice_pilot_members'
        and column_info.column_name in (
          'student_id',
          'unit_slug',
          'release_candidate_id',
          'content_version',
          'bundle_sha256',
          'policy_version',
          'enabled'
        )
      )
    );

  select count(*)
  into v_schema_total_column_count
  from information_schema.columns as column_info
  where column_info.table_schema = 'public'
    and column_info.table_name in (
      'adaptive_practice_releases',
      'adaptive_practice_pilot_members'
    );

  if
    v_schema_column_count <> 17
    or v_schema_total_column_count <> 29
  then
    raise exception 'PILOT:MEMBERSHIP:SCHEMA_FINGERPRINT_MISMATCH';
  end if;

  -- Fixed lock order. SHARE blocks concurrent INSERT/UPDATE/DELETE while this
  -- short controlled-dev transaction checks and mutates. The membership table
  -- needs SHARE ROW EXCLUSIVE because this transaction inserts one row.
  lock table auth.users in share mode;
  lock table public.profiles in share mode;
  lock table public.student_profiles in share mode;
  lock table public.learning_units in share mode;
  lock table public.questions in share mode;
  lock table public.question_solutions in share mode;
  lock table public.practice_attempts in share mode;
  lock table public.practice_answers in share mode;
  lock table public.diagnostic_attempts in share mode;
  lock table public.diagnostic_answers in share mode;
  lock table public.adaptive_practice_releases in share mode;
  lock table public.adaptive_practice_attempts in share mode;
  lock table public.adaptive_practice_answers in share mode;
  lock table public.adaptive_practice_pilot_members
    in share row exclusive mode;

  select count(*)
  into v_eligible_grade2_count
  from auth.users as auth_user
  join public.profiles as profile
    on profile.user_id = auth_user.id
  join public.student_profiles as student
    on student.user_id = auth_user.id
  where profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 2;

  select count(*)
  into v_selected_eligible_count
  from auth.users as auth_user
  join public.profiles as profile
    on profile.user_id = auth_user.id
  join public.student_profiles as student
    on student.user_id = auth_user.id
  where auth_user.id = v_student_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 2;

  if v_eligible_grade2_count <> 1 then
    raise exception 'PILOT:MEMBERSHIP:UNIQUE_ELIGIBLE_GRADE2_REQUIRED';
  end if;

  if v_selected_eligible_count <> 1 then
    raise exception 'PILOT:MEMBERSHIP:SELECTED_STUDENT_NOT_UNIQUE_ELIGIBLE';
  end if;

  select count(*)
  into v_membership_count
  from public.adaptive_practice_pilot_members;

  if v_membership_count <> 0 then
    raise exception 'PILOT:MEMBERSHIP:INITIAL_COUNT_NOT_ZERO';
  end if;

  select count(*)
  into v_candidate_count
  from public.adaptive_practice_releases as release
  join public.learning_units as unit
    on unit.slug = release.unit_slug
  where release.unit_slug = 'grade-2-numbers-to-1000'
    and release.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and release.content_version = 'g2n1000-1.0.0-rc.1'
    and release.release_seed = 'g2-review-number-language'
    and release.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and release.policy_version = 'g2n1000-adaptive-policy-1.0.0-pilot'
    and release.mode = 'ADAPTIVE'
    and release.min_questions = 12
    and release.max_questions = 24
    and release.required_skill_ids = array[
      'NUMBER_RECOGNITION_TO_1000',
      'READ_WRITE_TO_1000',
      'PLACE_VALUE_TO_1000',
      'SEQUENCE_TO_1000'
    ]::text[]
    and release.minimum_evidence_per_skill = 2
    and release.mastery_threshold = 0.75
    and release.recent_correct_requirement = 2
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN'
    and not release.runtime_enabled
    and not release.controlled_pilot_enabled
    and not release.retention_runtime_enabled
    and unit.grade = 2
    and unit.total_questions = 24
    and not unit.published;

  if v_candidate_count <> 1 then
    raise exception 'PILOT:MEMBERSHIP:FROZEN_RELEASE_BINDING_MISMATCH';
  end if;

  if
    (select count(*) from public.learning_units where grade = 2) <> 1
    or (select count(*) from public.learning_units
        where grade = 2 and published) <> 0
    or (select count(*) from public.questions as question
        join public.learning_units as unit on unit.slug = question.unit_slug
        where unit.grade = 2) <> 24
    or (select count(*) from public.questions as question
        join public.learning_units as unit on unit.slug = question.unit_slug
        where unit.grade = 2 and not question.published) <> 24
    or (select count(*) from public.questions as question
        join public.learning_units as unit on unit.slug = question.unit_slug
        where unit.grade = 2 and question.published) <> 0
    or (select count(*) from public.question_solutions as solution
        join public.questions as question on question.code = solution.question_id
        join public.learning_units as unit on unit.slug = question.unit_slug
        where unit.grade = 2) <> 24
    or (select count(*) from public.questions
        where unit_slug = 'grade-2-numbers-to-1000'
          and question_type = 'MULTIPLE_CHOICE') <> 16
    or (select count(*) from public.questions
        where unit_slug = 'grade-2-numbers-to-1000'
          and question_type = 'NUMBER_INPUT') <> 8
    or (select count(*) from (
          select question.skill_code
          from public.questions as question
          where question.unit_slug = 'grade-2-numbers-to-1000'
          group by question.skill_code
          having count(*) = 6
        ) as exact_skills) <> 4
    or (select count(*) from public.adaptive_practice_releases
        where runtime_enabled
          or controlled_pilot_enabled
          or retention_runtime_enabled) <> 0
    or (select count(*) from public.adaptive_practice_attempts) <> 0
    or (select count(*) from public.adaptive_practice_answers) <> 0
    or (select count(*) from public.learning_units
        where grade = 1 and published) <> 13
    or (select count(*) from public.questions as question
        join public.learning_units as unit on unit.slug = question.unit_slug
        where unit.grade = 1 and question.published) <> 312
    or (select count(*) from public.question_solutions as solution
        join public.questions as question on question.code = solution.question_id
        join public.learning_units as unit on unit.slug = question.unit_slug
        where unit.grade = 1) <> 312
    or (select count(*) from public.practice_attempts) <> 18
    or (select count(*) from public.practice_answers) <> 340
    or (select count(*) from public.diagnostic_attempts) <> 1
    or (select count(*) from public.diagnostic_answers) <> 24
  then
    raise exception 'PILOT:MEMBERSHIP:CONTENT_OR_HISTORY_BASELINE_MISMATCH';
  end if;

  with serialized as (
    select pg_catalog.concat_ws(
      ':',
      encode(convert_to(question.code, 'UTF8'), 'hex'),
      encode(convert_to(question.unit_slug, 'UTF8'), 'hex'),
      encode(convert_to(question.question_type, 'UTF8'), 'hex'),
      encode(convert_to(question.prompt, 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.options ->> 'A', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.options ->> 'B', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.options ->> 'C', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.options ->> 'D', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'kind', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'description', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'value', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'thousands', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'hundreds', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'tens', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'ones', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'start', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'end', ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(question.visual_spec ->> 'focusValue', ''), 'UTF8'), 'hex'),
      encode(convert_to(question.skill_code, 'UTF8'), 'hex'),
      encode(convert_to(question.difficulty, 'UTF8'), 'hex'),
      encode(convert_to(question.display_order::text, 'UTF8'), 'hex'),
      encode(convert_to(question.published::text, 'UTF8'), 'hex'),
      encode(convert_to(coalesce(solution.correct_answer, ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(solution.solution_steps ->> 0, ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(solution.solution_steps ->> 1, ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(solution.explanation, ''), 'UTF8'), 'hex'),
      encode(convert_to(coalesce(solution.hint, ''), 'UTF8'), 'hex')
    ) as row_text,
    question.code
    from public.questions as question
    left join public.question_solutions as solution
      on solution.question_id = question.code
    where question.unit_slug = 'grade-2-numbers-to-1000'
  )
  select encode(
    extensions.digest(
      convert_to(string_agg(row_text, E'\n' order by code), 'UTF8'),
      'sha256'
    ),
    'hex'
  )
  into v_candidate_fingerprint
  from serialized;

  if v_candidate_fingerprint <> v_expected_candidate_fingerprint then
    raise exception 'PILOT:MEMBERSHIP:CANDIDATE_SEMANTIC_FINGERPRINT_MISMATCH';
  end if;

  select encode(
    extensions.digest(
      convert_to(
        pg_catalog.concat_ws(
          E'\n',
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.slug)
           from public.learning_units as row_data where row_data.grade = 1),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.code)
           from public.questions as row_data
           join public.learning_units as unit on unit.slug = row_data.unit_slug
           where unit.grade = 1),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.question_id)
           from public.question_solutions as row_data
           join public.questions as question on question.code = row_data.question_id
           join public.learning_units as unit on unit.slug = question.unit_slug
           where unit.grade = 1),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.id)
           from public.practice_attempts as row_data),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.attempt_id, row_data.question_id)
           from public.practice_answers as row_data),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.id)
           from public.diagnostic_attempts as row_data),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.attempt_id, row_data.question_id)
           from public.diagnostic_answers as row_data)
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  into v_protected_before;

  insert into public.adaptive_practice_pilot_members (
    student_id,
    unit_slug,
    release_candidate_id,
    content_version,
    bundle_sha256,
    policy_version,
    enabled
  )
  values (
    v_student_id,
    'grade-2-numbers-to-1000',
    'g2-numbers-to-1000-rc1',
    'g2n1000-1.0.0-rc.1',
    '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530',
    'g2n1000-adaptive-policy-1.0.0-pilot',
    true
  );

  get diagnostics v_inserted_count = row_count;

  select encode(
    extensions.digest(
      convert_to(
        pg_catalog.concat_ws(
          E'\n',
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.slug)
           from public.learning_units as row_data where row_data.grade = 1),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.code)
           from public.questions as row_data
           join public.learning_units as unit on unit.slug = row_data.unit_slug
           where unit.grade = 1),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.question_id)
           from public.question_solutions as row_data
           join public.questions as question on question.code = row_data.question_id
           join public.learning_units as unit on unit.slug = question.unit_slug
           where unit.grade = 1),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.id)
           from public.practice_attempts as row_data),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.attempt_id, row_data.question_id)
           from public.practice_answers as row_data),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.id)
           from public.diagnostic_attempts as row_data),
          (select string_agg((to_jsonb(row_data) - 'created_at' - 'updated_at')::text, E'\n'
                             order by row_data.attempt_id, row_data.question_id)
           from public.diagnostic_answers as row_data)
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  into v_protected_after;

  if
    v_inserted_count <> 1
    or (select count(*) from public.adaptive_practice_pilot_members) <> 1
    or (select count(*) from public.adaptive_practice_pilot_members as member
        where member.student_id = v_student_id
          and member.unit_slug = 'grade-2-numbers-to-1000'
          and member.release_candidate_id = 'g2-numbers-to-1000-rc1'
          and member.content_version = 'g2n1000-1.0.0-rc.1'
          and member.bundle_sha256 =
            '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
          and member.policy_version = 'g2n1000-adaptive-policy-1.0.0-pilot'
          and member.enabled) <> 1
    or v_protected_after is distinct from v_protected_before
    or (select count(*) from public.adaptive_practice_releases
        where runtime_enabled
          or controlled_pilot_enabled
          or retention_runtime_enabled) <> 0
    or (select count(*) from public.adaptive_practice_attempts) <> 0
    or (select count(*) from public.adaptive_practice_answers) <> 0
  then
    raise exception 'PILOT:MEMBERSHIP:INSERT_OR_PROTECTED_STATE_POSTCONDITION_FAILED';
  end if;
end;
$membership$;

commit;
