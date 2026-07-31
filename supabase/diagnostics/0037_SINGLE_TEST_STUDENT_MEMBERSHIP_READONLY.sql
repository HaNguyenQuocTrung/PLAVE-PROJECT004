begin transaction read only;

-- Aggregate-only. No UUID, email, name, student code, answer, solution,
-- token, or row-level fingerprint is returned.
with candidate_rows as (
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
),
candidate_fingerprint as (
  select encode(
    extensions.digest(
      convert_to(string_agg(row_text, E'\n' order by code), 'UTF8'),
      'sha256'
    ),
    'hex'
  ) as value
  from candidate_rows
),
eligible_grade2 as (
  select auth_user.id
  from auth.users as auth_user
  join public.profiles as profile on profile.user_id = auth_user.id
  join public.student_profiles as student on student.user_id = auth_user.id
  where profile.role = 'STUDENT'
    and profile.onboarding_completed
    and student.grade = 2
),
observed as (
  select 'SESSION'::text as section, 'transaction_read_only'::text as metric,
    (current_setting('transaction_read_only') = 'on')::integer::bigint as exact_count,
    1::bigint as expected_count,
    'Read-only transaction.'::text as notes

  union all select 'SCHEMA', '0036_0037_required_columns',
    count(*)::bigint, 17,
    'Verifiable schema fingerprint; no Dashboard identity claim.'
  from information_schema.columns as column_info
  where column_info.table_schema = 'public'
    and (
      (column_info.table_name = 'adaptive_practice_releases'
       and column_info.column_name in (
         'unit_slug', 'release_candidate_id', 'content_version',
         'bundle_sha256', 'policy_version', 'runtime_enabled',
         'controlled_pilot_enabled', 'retention_runtime_enabled',
         'publication_status', 'student_visibility'
       ))
      or
      (column_info.table_name = 'adaptive_practice_pilot_members'
       and column_info.column_name in (
         'student_id', 'unit_slug', 'release_candidate_id',
         'content_version', 'bundle_sha256', 'policy_version', 'enabled'
       ))
    )

  union all select 'SCHEMA', '0036_0037_exact_total_columns',
    count(*)::bigint, 29,
    'Rejects missing or extra columns in the two controlled-pilot tables.'
  from information_schema.columns as column_info
  where column_info.table_schema = 'public'
    and column_info.table_name in (
      'adaptive_practice_releases',
      'adaptive_practice_pilot_members'
    )

  union all select 'ELIGIBILITY', 'eligible_onboarded_grade2_students',
    count(*)::bigint, 1,
    'Exactly one auth-backed onboarded Student Grade 2; identity hidden.'
  from eligible_grade2

  union all select 'MEMBERSHIP', 'exactly_one_member',
    count(*)::bigint, 1, 'Identity hidden.'
  from public.adaptive_practice_pilot_members

  union all select 'MEMBERSHIP', 'member_is_the_unique_eligible_grade2',
    count(*)::bigint, 1,
    'The sole membership maps to the sole eligible Grade 2 Student.'
  from public.adaptive_practice_pilot_members as member
  join eligible_grade2 as eligible on eligible.id = member.student_id
  where member.unit_slug = 'grade-2-numbers-to-1000'
    and member.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and member.content_version = 'g2n1000-1.0.0-rc.1'
    and member.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and member.policy_version = 'g2n1000-adaptive-policy-1.0.0-pilot'
    and member.enabled

  union all select 'GRADE2_CONTENT', 'unit_total',
    count(*)::bigint, 1, 'Detects extra Grade 2 units.'
  from public.learning_units where grade = 2

  union all select 'GRADE2_CONTENT', 'published_units',
    count(*)::bigint, 0, 'All Grade 2 units remain unpublished.'
  from public.learning_units where grade = 2 and published

  union all select 'GRADE2_CONTENT', 'question_total',
    count(*)::bigint, 24, 'Detects extra or partial Grade 2 question state.'
  from public.questions as question
  join public.learning_units as unit on unit.slug = question.unit_slug
  where unit.grade = 2

  union all select 'GRADE2_CONTENT', 'unpublished_questions',
    count(*)::bigint, 24, 'All Grade 2 questions remain unpublished.'
  from public.questions as question
  join public.learning_units as unit on unit.slug = question.unit_slug
  where unit.grade = 2 and not question.published

  union all select 'GRADE2_CONTENT', 'published_questions',
    count(*)::bigint, 0, 'Detects any accidentally published question.'
  from public.questions as question
  join public.learning_units as unit on unit.slug = question.unit_slug
  where unit.grade = 2 and question.published

  union all select 'GRADE2_CONTENT', 'solution_mappings',
    count(*)::bigint, 24, 'Count only; no solution payload returned.'
  from public.question_solutions as solution
  join public.questions as question on question.code = solution.question_id
  join public.learning_units as unit on unit.slug = question.unit_slug
  where unit.grade = 2

  union all select 'GRADE2_CONTENT', 'multiple_choice_questions',
    count(*)::bigint, 16, 'Frozen answer-type distribution.'
  from public.questions
  where unit_slug = 'grade-2-numbers-to-1000'
    and question_type = 'MULTIPLE_CHOICE'

  union all select 'GRADE2_CONTENT', 'number_input_questions',
    count(*)::bigint, 8, 'Frozen answer-type distribution.'
  from public.questions
  where unit_slug = 'grade-2-numbers-to-1000'
    and question_type = 'NUMBER_INPUT'

  union all select 'GRADE2_CONTENT', 'skill_families_with_six_questions',
    count(*)::bigint, 4, 'Exactly four skill families, six questions each.'
  from (
    select question.skill_code
    from public.questions as question
    where question.unit_slug = 'grade-2-numbers-to-1000'
    group by question.skill_code
    having count(*) = 6
  ) as exact_skill

  union all select 'CANDIDATE', 'frozen_release_binding',
    count(*)::bigint, 1,
    'Exact release/version/policy/bundle binding from migration 0036.'
  from public.adaptive_practice_releases as release
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

  union all select 'CANDIDATE', 'database_row_semantic_fingerprint',
    count(*) filter (
      where value =
        '0274b7f3b49830935dbb7120ecd661ec26ca725cf675f1429eea98d975d5b8d5'
    )::bigint,
    1,
    'Stable database-row fingerprint generated from canonical local source.'
  from candidate_fingerprint

  union all select 'CANDIDATE', 'full_original_bundle_recomputation_unsupported',
    0::bigint, 0::bigint,
    'PASS means explicitly unsupported: database lacks private audit/generator inputs.'

  union all select 'ACTIVATION', 'database_flags_true',
    count(*)::bigint, 0, 'All database activation flags remain false.'
  from public.adaptive_practice_releases
  where runtime_enabled or controlled_pilot_enabled or retention_runtime_enabled

  union all select 'ADAPTIVE_DATA', 'attempts',
    count(*)::bigint, 0, 'Membership setup seeds no attempt.'
  from public.adaptive_practice_attempts

  union all select 'ADAPTIVE_DATA', 'answer_evidence',
    count(*)::bigint, 0, 'Answers are the persisted adaptive evidence rows.'
  from public.adaptive_practice_answers

  union all select 'GRADE1_BASELINE', 'published_units',
    count(*)::bigint, 13, 'Frozen pre-membership aggregate.'
  from public.learning_units where grade = 1 and published

  union all select 'GRADE1_BASELINE', 'published_questions',
    count(*)::bigint, 312, 'Frozen pre-membership aggregate.'
  from public.questions as question
  join public.learning_units as unit on unit.slug = question.unit_slug
  where unit.grade = 1 and question.published

  union all select 'GRADE1_BASELINE', 'solution_mappings',
    count(*)::bigint, 312, 'Count only.'
  from public.question_solutions as solution
  join public.questions as question on question.code = solution.question_id
  join public.learning_units as unit on unit.slug = question.unit_slug
  where unit.grade = 1

  union all select 'HISTORY_BASELINE', 'practice_attempts',
    count(*)::bigint, 18, 'Frozen pre-membership aggregate.'
  from public.practice_attempts

  union all select 'HISTORY_BASELINE', 'practice_answers',
    count(*)::bigint, 340, 'Count only.'
  from public.practice_answers

  union all select 'HISTORY_BASELINE', 'diagnostic_attempts',
    count(*)::bigint, 1, 'Frozen pre-membership aggregate.'
  from public.diagnostic_attempts

  union all select 'HISTORY_BASELINE', 'diagnostic_answers',
    count(*)::bigint, 24, 'Count only.'
  from public.diagnostic_answers
)
select
  section,
  metric,
  exact_count,
  expected_count,
  case when exact_count = expected_count then 'PASS' else 'FAIL' end as status,
  notes
from observed
order by section, metric;

rollback;
