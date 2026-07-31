-- PLAVE remote database aggregate audit, Phase 2.
--
-- Relation allowlist is based on the successful catalog-first Phase 1 run.
-- This script returns counts and date-level aggregates only. It never selects
-- identifiers, PII, answer values, prompts, correct answers, solutions or
-- authentication metadata.

begin transaction read only;

with
session_metric as (
  select
    'SESSION'::text as section,
    'transaction_read_only'::text as metric,
    null::bigint as exact_count,
    case
      when current_setting('transaction_read_only') = 'on'
        then 'READ_ONLY_CONFIRMED'
      else 'READ_ONLY_NOT_CONFIRMED'
    end::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    'Must be READ_ONLY_CONFIRMED before interpreting any other row.'
      ::text as notes
),
identity_metrics as (
  select
    'IDENTITY'::text as section,
    'auth_users_total'::text as metric,
    count(*)::bigint as exact_count,
    'EXACT_COUNT'::text as status,
    min(created_at)::date as earliest_date,
    max(created_at)::date as latest_date,
    'Aggregate only; no auth identity fields selected.'::text as notes
  from auth.users

  union all

  select
    'IDENTITY',
    'auth_users_created_last_7_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from auth.users
  where created_at >= now() - interval '7 days'

  union all

  select
    'IDENTITY',
    'auth_users_created_last_30_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from auth.users
  where created_at >= now() - interval '30 days'

  union all

  select
    'IDENTITY',
    'profiles_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'No profile fields selected.'
  from public.profiles

  union all

  select
    'IDENTITY',
    'profiles_student_role',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate role count only.'
  from public.profiles
  where role = 'STUDENT'

  union all

  select
    'IDENTITY',
    'profiles_parent_role',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate role count only.'
  from public.profiles
  where role = 'PARENT'

  union all

  select
    'IDENTITY',
    'profiles_teacher_role',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate role count only.'
  from public.profiles
  where role = 'TEACHER'

  union all

  select
    'IDENTITY',
    'student_profiles_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'No Student identity fields selected.'
  from public.student_profiles

  union all

  select
    'IDENTITY',
    'teacher_profiles_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'No Teacher identity fields selected.'
  from public.teacher_profiles

  union all

  select
    'IDENTITY',
    'parent_student_connections_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Connection identities are not selected.'
  from public.parent_student_connections

  union all

  select
    'IDENTITY',
    'parent_student_connections_approved',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate lifecycle count only.'
  from public.parent_student_connections
  where status = 'APPROVED'
),
practice_metrics as (
  select
    'LEARNING_HISTORY'::text as section,
    'practice_attempts_total'::text as metric,
    count(*)::bigint as exact_count,
    'EXACT_COUNT'::text as status,
    min(started_at)::date as earliest_date,
    max(started_at)::date as latest_date,
    'Attempt ownership and question order are not selected.'::text as notes
  from public.practice_attempts

  union all

  select
    'LEARNING_HISTORY',
    'practice_attempts_completed',
    count(*)::bigint,
    'EXACT_COUNT',
    min(started_at)::date,
    max(started_at)::date,
    'Aggregate status count only.'
  from public.practice_attempts
  where status = 'COMPLETED'

  union all

  select
    'LEARNING_HISTORY',
    'practice_attempts_in_progress',
    count(*)::bigint,
    'EXACT_COUNT',
    min(started_at)::date,
    max(started_at)::date,
    'Aggregate status count only.'
  from public.practice_attempts
  where status = 'IN_PROGRESS'

  union all

  select
    'LEARNING_HISTORY',
    'practice_attempts_abandoned',
    0::bigint,
    'NOT_SUPPORTED_BY_CONFIRMED_SCHEMA',
    null::date,
    null::date,
    'Confirmed fixed-practice status contract has no ABANDONED value.'

  union all

  select
    'LEARNING_HISTORY',
    'practice_attempts_started_last_7_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from public.practice_attempts
  where started_at >= now() - interval '7 days'

  union all

  select
    'LEARNING_HISTORY',
    'practice_attempts_started_last_30_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from public.practice_attempts
  where started_at >= now() - interval '30 days'

  union all

  select
    'LEARNING_HISTORY',
    'practice_answers_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(answered_at)::date,
    max(answered_at)::date,
    'Answer values and correctness are not selected.'
  from public.practice_answers

  union all

  select
    'LEARNING_HISTORY',
    'practice_answers_last_7_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from public.practice_answers
  where answered_at >= now() - interval '7 days'

  union all

  select
    'LEARNING_HISTORY',
    'practice_answers_last_30_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from public.practice_answers
  where answered_at >= now() - interval '30 days'
),
diagnostic_metrics as (
  select
    'DIAGNOSTIC_HISTORY'::text as section,
    'diagnostic_attempts_total'::text as metric,
    count(*)::bigint as exact_count,
    'EXACT_COUNT'::text as status,
    min(started_at)::date as earliest_date,
    max(started_at)::date as latest_date,
    'No recommendation or item-level data selected.'::text as notes
  from public.diagnostic_attempts

  union all

  select
    'DIAGNOSTIC_HISTORY',
    'diagnostic_attempts_completed',
    count(*)::bigint,
    'EXACT_COUNT',
    min(started_at)::date,
    max(started_at)::date,
    'Aggregate status count only.'
  from public.diagnostic_attempts
  where status = 'COMPLETED'

  union all

  select
    'DIAGNOSTIC_HISTORY',
    'diagnostic_attempts_in_progress',
    count(*)::bigint,
    'EXACT_COUNT',
    min(started_at)::date,
    max(started_at)::date,
    'Aggregate status count only.'
  from public.diagnostic_attempts
  where status = 'IN_PROGRESS'

  union all

  select
    'DIAGNOSTIC_HISTORY',
    'diagnostic_attempts_started_last_7_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from public.diagnostic_attempts
  where started_at >= now() - interval '7 days'

  union all

  select
    'DIAGNOSTIC_HISTORY',
    'diagnostic_attempts_started_last_30_days',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Relative to database now(); aggregate only.'
  from public.diagnostic_attempts
  where started_at >= now() - interval '30 days'

  union all

  select
    'DIAGNOSTIC_HISTORY',
    'diagnostic_answers_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(answered_at)::date,
    max(answered_at)::date,
    'Answer values and correctness are not selected.'
  from public.diagnostic_answers
),
parent_teacher_metrics as (
  select
    'PARENT_TEACHER'::text as section,
    'parent_goal_suggestions_total'::text as metric,
    count(*)::bigint as exact_count,
    'EXACT_COUNT'::text as status,
    min(created_at)::date as earliest_date,
    max(created_at)::date as latest_date,
    'No message, title or participant identity selected.'::text as notes
  from public.parent_goal_suggestions

  union all

  select
    'PARENT_TEACHER',
    'parent_goal_suggestions_pending',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.parent_goal_suggestions
  where status = 'PENDING'

  union all

  select
    'PARENT_TEACHER',
    'parent_goal_suggestions_accepted',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.parent_goal_suggestions
  where status = 'ACCEPTED'

  union all

  select
    'PARENT_TEACHER',
    'parent_goal_suggestions_declined',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.parent_goal_suggestions
  where status = 'DECLINED'

  union all

  select
    'PARENT_TEACHER',
    'parent_goal_suggestions_withdrawn',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.parent_goal_suggestions
  where status = 'WITHDRAWN'

  union all

  select
    'PARENT_TEACHER',
    'teacher_questions_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Prompts, options and ownership are not selected.'
  from public.teacher_questions

  union all

  select
    'PARENT_TEACHER',
    'teacher_questions_active',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.teacher_questions
  where status = 'ACTIVE'

  union all

  select
    'PARENT_TEACHER',
    'teacher_questions_archived',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.teacher_questions
  where status = 'ARCHIVED'

  union all

  select
    'PARENT_TEACHER',
    'teacher_question_solution_mappings',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Solution payload is not selected.'
  from public.teacher_question_solutions

  union all

  select
    'PARENT_TEACHER',
    'teacher_assignments_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Title, instructions, ownership and classroom are not selected.'
  from public.teacher_assignments

  union all

  select
    'PARENT_TEACHER',
    'teacher_assignments_published',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.teacher_assignments
  where status = 'PUBLISHED'

  union all

  select
    'PARENT_TEACHER',
    'teacher_assignments_closed',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Aggregate status count only.'
  from public.teacher_assignments
  where status = 'CLOSED'

  union all

  select
    'PARENT_TEACHER',
    'teacher_assignment_items_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(created_at)::date,
    max(created_at)::date,
    'Assignment and question identifiers are not selected.'
  from public.teacher_assignment_items

  union all

  select
    'PARENT_TEACHER',
    'assignment_answers_total',
    count(*)::bigint,
    'EXACT_COUNT',
    min(saved_at)::date,
    max(saved_at)::date,
    'Answer values, correctness and identifiers are not selected.'
  from public.assignment_answers
),
content_metrics as (
  select
    'CONTENT_BASELINE'::text as section,
    'learning_units_total'::text as metric,
    count(*)::bigint as exact_count,
    'EXACT_COUNT'::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    'No title, lesson content or objectives selected.'::text as notes
  from public.learning_units

  union all

  select
    'CONTENT_BASELINE',
    'learning_units_published',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Aggregate publication count only.'
  from public.learning_units
  where published

  union all

  select
    'CONTENT_BASELINE',
    'learning_units_unpublished',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Aggregate publication count only.'
  from public.learning_units
  where not published

  union all

  select
    'CONTENT_BASELINE',
    'grade1_learning_units_total',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Grade filter only.'
  from public.learning_units
  where grade = 1

  union all

  select
    'CONTENT_BASELINE',
    'grade1_learning_units_published',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Grade and publication filters only.'
  from public.learning_units
  where grade = 1
    and published

  union all

  select
    'CONTENT_BASELINE',
    'questions_total',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Prompt, options and visual payload are not selected.'
  from public.questions

  union all

  select
    'CONTENT_BASELINE',
    'questions_published',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Aggregate publication count only.'
  from public.questions
  where published

  union all

  select
    'CONTENT_BASELINE',
    'questions_unpublished',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Aggregate publication count only.'
  from public.questions
  where not published

  union all

  select
    'CONTENT_BASELINE',
    'questions_mapped_to_grade1_units',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Count-only join on unit slug.'
  from public.questions as question
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where unit.grade = 1

  union all

  select
    'CONTENT_BASELINE',
    'question_solutions_total',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Solution payload is not selected.'
  from public.question_solutions

  union all

  select
    'CONTENT_BASELINE',
    'solutions_mapped_to_grade1_questions',
    count(*)::bigint,
    'EXACT_COUNT',
    null::date,
    null::date,
    'Count-only joins; no solution payload selected.'
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where unit.grade = 1
),
grade2_content_fingerprint as (
  select
    (
      select count(*)
      from public.learning_units
      where slug = 'grade-2-numbers-to-1000'
    )::bigint as unit_rows,
    (
      select count(*)
      from public.learning_units
      where slug = 'grade-2-numbers-to-1000'
        and grade = 2
        and total_questions = 24
        and not published
    )::bigint as exact_draft_unit_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
    )::bigint as question_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and not published
    )::bigint as unpublished_question_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and code ~ '^g2-num1000-[a-z0-9]+-[0-9]{2}$'
    )::bigint as release_code_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and question_type = 'MULTIPLE_CHOICE'
    )::bigint as mcq_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and question_type = 'NUMBER_INPUT'
    )::bigint as number_input_rows,
    (
      select count(*)
      from public.question_solutions as solution
      join public.questions as question
        on question.code = solution.question_id
      where question.unit_slug = 'grade-2-numbers-to-1000'
    )::bigint as solution_rows,
    (
      select count(distinct skill_code)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and skill_code in (
          'NUMBER_RECOGNITION_TO_1000',
          'READ_WRITE_TO_1000',
          'PLACE_VALUE_TO_1000',
          'SEQUENCE_TO_1000'
        )
    )::bigint as expected_distinct_skills,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and skill_code = 'NUMBER_RECOGNITION_TO_1000'
    )::bigint as recognition_skill_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and skill_code = 'READ_WRITE_TO_1000'
    )::bigint as read_write_skill_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and skill_code = 'PLACE_VALUE_TO_1000'
    )::bigint as place_value_skill_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and skill_code = 'SEQUENCE_TO_1000'
    )::bigint as sequence_skill_rows,
    (
      select count(distinct visual_spec ->> 'kind')
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and visual_spec ->> 'kind' in (
          'NUMBER_CARD',
          'PLACE_VALUE_CHART',
          'NUMBER_LINE'
        )
    )::bigint as expected_distinct_visual_kinds,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and visual_spec ->> 'kind' = 'NUMBER_CARD'
    )::bigint as number_card_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and visual_spec ->> 'kind' = 'PLACE_VALUE_CHART'
    )::bigint as place_value_chart_rows,
    (
      select count(*)
      from public.questions
      where unit_slug = 'grade-2-numbers-to-1000'
        and visual_spec ->> 'kind' = 'NUMBER_LINE'
    )::bigint as number_line_rows,
    (
      select count(*)
      from pg_catalog.pg_proc as procedure
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'private'
        and procedure.proname = 'is_valid_grade2_number_visual_spec'
        and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
          = 'p_visual jsonb'
    )::bigint as grade2_visual_validator_functions,
    (
      select count(*)
      from pg_catalog.pg_constraint as constraint_row
      join pg_catalog.pg_class as relation
        on relation.oid = constraint_row.conrelid
      join pg_catalog.pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = 'questions'
        and constraint_row.conname = 'questions_visual_spec_check'
        and pg_catalog.pg_get_constraintdef(constraint_row.oid)
          like '%is_valid_grade2_number_visual_spec%'
    )::bigint as grade2_visual_constraint_rows
),
grade2_content_metrics as (
  select
    '0035_CONTENT'::text as section,
    metric.metric,
    metric.exact_count,
    'EXACT_COUNT'::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    'Presence fingerprint only; no prompt, solution or visual payload selected.'
      ::text as notes
  from grade2_content_fingerprint as fingerprint
  cross join lateral (
    values
      ('unit_rows', fingerprint.unit_rows),
      ('exact_draft_unit_rows', fingerprint.exact_draft_unit_rows),
      ('question_rows', fingerprint.question_rows),
      ('unpublished_question_rows', fingerprint.unpublished_question_rows),
      ('release_code_rows', fingerprint.release_code_rows),
      ('mcq_rows', fingerprint.mcq_rows),
      ('number_input_rows', fingerprint.number_input_rows),
      ('solution_mapping_rows', fingerprint.solution_rows),
      ('expected_distinct_skills', fingerprint.expected_distinct_skills),
      ('skill_number_recognition_rows', fingerprint.recognition_skill_rows),
      ('skill_read_write_rows', fingerprint.read_write_skill_rows),
      ('skill_place_value_rows', fingerprint.place_value_skill_rows),
      ('skill_sequence_rows', fingerprint.sequence_skill_rows),
      (
        'expected_distinct_visual_kinds',
        fingerprint.expected_distinct_visual_kinds
      ),
      ('visual_number_card_rows', fingerprint.number_card_rows),
      (
        'visual_place_value_chart_rows',
        fingerprint.place_value_chart_rows
      ),
      ('visual_number_line_rows', fingerprint.number_line_rows),
      (
        'grade2_visual_validator_functions',
        fingerprint.grade2_visual_validator_functions
      ),
      (
        'grade2_visual_constraint_rows',
        fingerprint.grade2_visual_constraint_rows
      )
  ) as metric(metric, exact_count)
),
grade2_content_conclusion as (
  select
    '0035_CONTENT'::text as section,
    '0035_content_conclusion'::text as metric,
    fingerprint.question_rows::bigint as exact_count,
    case
      when
        fingerprint.unit_rows = 0
        and fingerprint.question_rows = 0
        and fingerprint.solution_rows = 0
        and fingerprint.expected_distinct_skills = 0
        and fingerprint.grade2_visual_validator_functions = 0
        and fingerprint.grade2_visual_constraint_rows = 0
      then '0035_CONTENT_ABSENT'
      when
        fingerprint.unit_rows = 1
        and fingerprint.exact_draft_unit_rows = 1
        and fingerprint.question_rows = 24
        and fingerprint.unpublished_question_rows = 24
        and fingerprint.release_code_rows = 24
        and fingerprint.mcq_rows = 16
        and fingerprint.number_input_rows = 8
        and fingerprint.solution_rows = 24
        and fingerprint.expected_distinct_skills = 4
        and fingerprint.recognition_skill_rows = 6
        and fingerprint.read_write_skill_rows = 6
        and fingerprint.place_value_skill_rows = 6
        and fingerprint.sequence_skill_rows = 6
        and fingerprint.expected_distinct_visual_kinds = 3
        and fingerprint.number_card_rows = 6
        and fingerprint.place_value_chart_rows = 12
        and fingerprint.number_line_rows = 6
        and fingerprint.grade2_visual_validator_functions = 1
        and fingerprint.grade2_visual_constraint_rows = 1
      then '0035_CONTENT_PRESENT'
      else '0035_CONTENT_PARTIAL'
    end::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    (
      'Content presence does not prove migration execution. Candidate ID and '
      || 'content version are not stored by draft 0035 itself.'
    )::text as notes
  from grade2_content_fingerprint as fingerprint
),
grade2_release_metadata_note as (
  select
    '0035_CONTENT'::text as section,
    'release_candidate_and_content_version_rows'::text as metric,
    null::bigint as exact_count,
    'NOT_STORED_BY_0035'::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    (
      'Draft 0035 stores the unit/question/solution footprint but has no '
      || 'release metadata table. That table belongs to draft 0036, which '
      || 'Phase 1 found absent.'
    )::text as notes
),
adaptive_schema_fingerprint as (
  select
    (
      (to_regclass('public.adaptive_practice_releases') is not null)::integer
      + (
        to_regclass('public.adaptive_practice_attempts') is not null
      )::integer
      + (
        to_regclass('public.adaptive_practice_answers') is not null
      )::integer
    )::bigint as table_count,
    (
      (
        to_regprocedure(
          'public.start_or_resume_adaptive_practice(text,uuid)'
        ) is not null
      )::integer
      + (
        to_regprocedure(
          'public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid)'
        ) is not null
      )::integer
      + (
        to_regprocedure(
          'public.get_adaptive_practice_state(uuid)'
        ) is not null
      )::integer
    )::bigint as public_rpc_count,
    (
      (
        to_regprocedure('private.adaptive_hash_text(text)') is not null
      )::integer
      + (
        to_regprocedure(
          'private.get_adaptive_skill_mastery(uuid)'
        ) is not null
      )::integer
      + (
        to_regprocedure(
          'private.plan_adaptive_practice_transition(uuid)'
        ) is not null
      )::integer
      + (
        to_regprocedure(
          'private.build_adaptive_practice_response(uuid,jsonb)'
        ) is not null
      )::integer
    )::bigint as private_helper_count
),
adaptive_schema_metrics as (
  select
    '0036_SCHEMA'::text as section,
    'adaptive_table_count'::text as metric,
    fingerprint.table_count::bigint as exact_count,
    'CATALOG_EXACT'::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    'Presence only; absent relations are never queried.'::text as notes
  from adaptive_schema_fingerprint as fingerprint

  union all

  select
    '0036_SCHEMA',
    'adaptive_public_rpc_count',
    fingerprint.public_rpc_count,
    'CATALOG_EXACT',
    null::date,
    null::date,
    'Functions are not executed.'
  from adaptive_schema_fingerprint as fingerprint

  union all

  select
    '0036_SCHEMA',
    'adaptive_private_helper_count',
    fingerprint.private_helper_count,
    'CATALOG_EXACT',
    null::date,
    null::date,
    'Functions are not executed.'
  from adaptive_schema_fingerprint as fingerprint
),
adaptive_schema_conclusion as (
  select
    '0036_SCHEMA'::text as section,
    '0036_schema_conclusion'::text as metric,
    (
      fingerprint.table_count
      + fingerprint.public_rpc_count
      + fingerprint.private_helper_count
    )::bigint as exact_count,
    case
      when
        fingerprint.table_count = 0
        and fingerprint.public_rpc_count = 0
        and fingerprint.private_helper_count = 0
      then '0036_SCHEMA_ABSENT'
      when
        fingerprint.table_count = 3
        and fingerprint.public_rpc_count = 3
        and fingerprint.private_helper_count = 4
      then '0036_SCHEMA_PRESENT'
      else '0036_SCHEMA_PARTIAL'
    end::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    'Schema presence does not prove migration-history state.'::text as notes
  from adaptive_schema_fingerprint as fingerprint
),
grant_metric as (
  select
    'SECURITY_METADATA'::text as section,
    'question_solutions_browser_select_grants'::text as metric,
    count(*)::bigint as exact_count,
    case
      when count(*) = 0
        then 'NO_BROWSER_SELECT_GRANT_OBSERVED'
      else 'BROWSER_SELECT_GRANT_OBSERVED'
    end::text as status,
    null::date as earliest_date,
    null::date as latest_date,
    (
      'Counts only anon/authenticated SELECT grants. postgres ownership and '
      || 'service_role privileges are not interpreted as browser exposure or '
      || 'runtime service-role use.'
    )::text as notes
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'question_solutions'
    and grantee in ('anon', 'authenticated')
    and privilege_type = 'SELECT'
)
select
  output.section,
  output.metric,
  output.exact_count,
  output.status,
  output.earliest_date,
  output.latest_date,
  output.notes
from (
  select * from session_metric
  union all
  select * from identity_metrics
  union all
  select * from practice_metrics
  union all
  select * from diagnostic_metrics
  union all
  select * from parent_teacher_metrics
  union all
  select * from content_metrics
  union all
  select * from grade2_content_metrics
  union all
  select * from grade2_content_conclusion
  union all
  select * from grade2_release_metadata_note
  union all
  select * from adaptive_schema_metrics
  union all
  select * from adaptive_schema_conclusion
  union all
  select * from grant_metric
) as output
order by output.section, output.metric;

rollback;
