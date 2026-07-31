begin transaction read only;

with observed as (
  select
    'SESSION'::text as section,
    'transaction_read_only'::text as metric,
    case
      when pg_catalog.current_setting('transaction_read_only') = 'on'
        then 1::bigint
      else 0::bigint
    end as exact_count,
    1::bigint as expected_count,
    'The verification session must remain read-only.'::text as notes

  union all

  select
    'ADAPTIVE_SCHEMA',
    'tables',
    count(*)::bigint,
    3::bigint,
    'The three adaptive runtime tables.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
    and relation.relkind = 'r'

  union all

  select
    'ADAPTIVE_SCHEMA',
    'named_constraints',
    count(*)::bigint,
    16::bigint,
    'Required named release, attempt and answer constraints.'
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.conname in (
    'adaptive_release_candidate_id_check',
    'adaptive_release_content_version_check',
    'adaptive_release_seed_check',
    'adaptive_release_bundle_hash_check',
    'adaptive_release_policy_version_check',
    'adaptive_release_skill_coverage_check',
    'adaptive_release_visibility_check',
    'adaptive_attempt_release_candidate_id_check',
    'adaptive_attempt_content_version_check',
    'adaptive_attempt_bundle_hash_check',
    'adaptive_attempt_policy_version_check',
    'adaptive_attempt_planner_seed_check',
    'adaptive_attempt_skill_coverage_check',
    'adaptive_attempt_remediation_check',
    'adaptive_attempt_lifecycle_check',
    'adaptive_answer_normalized_check'
  )

  union all

  select
    'ADAPTIVE_SCHEMA',
    'explicit_indexes',
    count(*)::bigint,
    3::bigint,
    'Required concurrency and access-path indexes.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relkind = 'i'
    and relation.relname in (
      'adaptive_attempts_one_active_idx',
      'adaptive_attempts_student_started_idx',
      'adaptive_answers_attempt_sequence_idx'
    )

  union all

  select
    'ADAPTIVE_SECURITY',
    'rls_and_force_rls_tables',
    count(*)::bigint,
    3::bigint,
    'All adaptive tables must enable and force RLS.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
    and relation.relrowsecurity is true
    and relation.relforcerowsecurity is true

  union all

  select
    'ADAPTIVE_SECURITY',
    'owner_scoped_select_policies',
    count(*)::bigint,
    2::bigint,
    'Only the two expected owner-scoped policies are present.'
  from pg_catalog.pg_policies
  where
    schemaname = 'public'
    and policyname in (
      'adaptive_practice_attempts_select_own',
      'adaptive_practice_answers_select_own'
    )
    and cmd = 'SELECT'
    and roles::text ~ 'authenticated'
    and qual ~ 'auth[.]uid'

  union all

  select
    'ADAPTIVE_SECURITY',
    'browser_direct_mutation_privileges',
    count(*)::bigint,
    0::bigint,
    'Browser roles must not mutate adaptive tables directly.'
  from (
    values
      ('anon', 'public.adaptive_practice_releases'),
      ('anon', 'public.adaptive_practice_attempts'),
      ('anon', 'public.adaptive_practice_answers'),
      ('authenticated', 'public.adaptive_practice_releases'),
      ('authenticated', 'public.adaptive_practice_attempts'),
      ('authenticated', 'public.adaptive_practice_answers')
  ) as target(role_name, table_name)
  where
    pg_catalog.has_table_privilege(
      target.role_name,
      target.table_name,
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      target.role_name,
      target.table_name,
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      target.role_name,
      target.table_name,
      'DELETE'
    )

  union all

  select
    'ADAPTIVE_SECURITY',
    'browser_solution_select_privileges',
    (
      case
        when pg_catalog.has_table_privilege(
          'anon',
          'public.question_solutions',
          'SELECT'
        ) then 1 else 0
      end
      +
      case
        when pg_catalog.has_table_privilege(
          'authenticated',
          'public.question_solutions',
          'SELECT'
        ) then 1 else 0
      end
    )::bigint,
    0::bigint,
    'Browser roles must not read private solutions directly.'

  union all

  select
    'ADAPTIVE_FUNCTIONS',
    'public_rpc_exact_signatures',
    count(*)::bigint,
    3::bigint,
    'Exact public RPC name and argument-type contracts.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join (
    values
      ('start_or_resume_adaptive_practice', 'text, uuid'),
      ('get_adaptive_practice_state', 'uuid'),
      (
        'submit_adaptive_practice_answer',
        'uuid, text, text, integer, uuid'
      )
  ) as expected(function_name, argument_types)
    on expected.function_name = procedure.proname
    and expected.argument_types =
      pg_catalog.oidvectortypes(procedure.proargtypes)
  where namespace.nspname = 'public'

  union all

  select
    'ADAPTIVE_FUNCTIONS',
    'public_rpc_secure_definer_search_path',
    count(*)::bigint,
    3::bigint,
    'Every public adaptive RPC is SECURITY DEFINER with an empty search path.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join (
    values
      ('start_or_resume_adaptive_practice', 'text, uuid'),
      ('get_adaptive_practice_state', 'uuid'),
      (
        'submit_adaptive_practice_answer',
        'uuid, text, text, integer, uuid'
      )
  ) as expected(function_name, argument_types)
    on expected.function_name = procedure.proname
    and expected.argument_types =
      pg_catalog.oidvectortypes(procedure.proargtypes)
  where
    namespace.nspname = 'public'
    and procedure.prosecdef is true
    and procedure.proconfig = array['search_path=""']::text[]

  union all

  select
    'ADAPTIVE_FUNCTIONS',
    'authenticated_rpc_execute_only',
    count(*)::bigint,
    3::bigint,
    'Authenticated may execute each public RPC; anon may not.'
  from (
    values
      ('public.start_or_resume_adaptive_practice(text,uuid)'),
      ('public.get_adaptive_practice_state(uuid)'),
      ('public.submit_adaptive_practice_answer(uuid,text,text,integer,uuid)')
  ) as expected(signature)
  where
    pg_catalog.has_function_privilege(
      'authenticated',
      expected.signature,
      'EXECUTE'
    )
    and not pg_catalog.has_function_privilege(
      'anon',
      expected.signature,
      'EXECUTE'
    )

  union all

  select
    'ADAPTIVE_FUNCTIONS',
    'private_helper_exact_signatures',
    count(*)::bigint,
    4::bigint,
    'Exact private helper name and argument-type contracts.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join (
    values
      ('adaptive_hash_text', 'text'),
      ('get_adaptive_skill_mastery', 'uuid'),
      ('plan_adaptive_practice_transition', 'uuid'),
      ('build_adaptive_practice_response', 'uuid, jsonb')
  ) as expected(function_name, argument_types)
    on expected.function_name = procedure.proname
    and expected.argument_types =
      pg_catalog.oidvectortypes(procedure.proargtypes)
  where
    namespace.nspname = 'private'
    and procedure.prosecdef is false
    and procedure.proconfig = array['search_path=""']::text[]

  union all

  select
    'ADAPTIVE_FUNCTIONS',
    'browser_private_helper_execute_privileges',
    count(*)::bigint,
    0::bigint,
    'Neither browser role may execute private planner helpers.'
  from (
    values
      ('private.adaptive_hash_text(text)'),
      ('private.get_adaptive_skill_mastery(uuid)'),
      ('private.plan_adaptive_practice_transition(uuid)'),
      ('private.build_adaptive_practice_response(uuid,jsonb)')
  ) as expected(signature)
  where
    pg_catalog.has_function_privilege(
      'anon',
      expected.signature,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      expected.signature,
      'EXECUTE'
    )

  union all

  select
    'RELEASE_BINDING',
    'frozen_hidden_release',
    count(*)::bigint,
    1::bigint,
    'Exact candidate, content, bundle, policy and adaptive hypotheses.'
  from public.adaptive_practice_releases as release
  where
    release.unit_slug = 'grade-2-numbers-to-1000'
    and release.release_candidate_id = 'g2-numbers-to-1000-rc1'
    and release.content_version = 'g2n1000-1.0.0-rc.1'
    and release.release_seed = 'g2-review-number-language'
    and release.bundle_sha256 =
      '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
    and release.policy_version =
      'g2n1000-adaptive-policy-1.0.0-pilot'
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
    and release.runtime_enabled is false
    and release.controlled_pilot_enabled is false
    and release.retention_runtime_enabled is false
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN'

  union all

  select
    'RELEASE_BINDING',
    'activation_flags_true',
    count(*)::bigint,
    0::bigint,
    'All database activation flags must remain false.'
  from public.adaptive_practice_releases as release
  where
    release.runtime_enabled is true
    or release.controlled_pilot_enabled is true
    or release.retention_runtime_enabled is true

  union all

  select
    'ADAPTIVE_DATA',
    'attempt_rows',
    count(*)::bigint,
    0::bigint,
    'Migration 0036 must not seed an attempt.'
  from public.adaptive_practice_attempts

  union all

  select
    'ADAPTIVE_DATA',
    'answer_evidence_rows',
    count(*)::bigint,
    0::bigint,
    'Migration 0036 must not seed answer evidence.'
  from public.adaptive_practice_answers

  union all

  select
    'GRADE1_BASELINE',
    'published_units',
    count(*)::bigint,
    13::bigint,
    'Published Grade 1 units.'
  from public.learning_units
  where grade = 1 and published is true

  union all

  select
    'GRADE1_BASELINE',
    'published_questions',
    count(*)::bigint,
    312::bigint,
    'Published questions joined to published Grade 1 units.'
  from public.questions as question
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where
    unit.grade = 1
    and unit.published is true
    and question.published is true

  union all

  select
    'GRADE1_BASELINE',
    'solution_mappings',
    count(*)::bigint,
    312::bigint,
    'Count only; no solution payload is selected.'
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where unit.grade = 1

  union all

  select
    'HISTORY_BASELINE',
    'practice_attempts',
    count(*)::bigint,
    18::bigint,
    'Locked pre-operation aggregate.'
  from public.practice_attempts

  union all

  select
    'HISTORY_BASELINE',
    'practice_answers',
    count(*)::bigint,
    340::bigint,
    'Count only; no answer payload is selected.'
  from public.practice_answers

  union all

  select
    'HISTORY_BASELINE',
    'diagnostic_attempts',
    count(*)::bigint,
    1::bigint,
    'Locked pre-operation aggregate.'
  from public.diagnostic_attempts

  union all

  select
    'HISTORY_BASELINE',
    'diagnostic_answers',
    count(*)::bigint,
    24::bigint,
    'Count only; no answer payload is selected.'
  from public.diagnostic_answers

  union all

  select
    'GRADE2_CANDIDATE',
    'unit_rows',
    count(*)::bigint,
    1::bigint,
    'The frozen Grade 2 candidate unit.'
  from public.learning_units
  where
    slug = 'grade-2-numbers-to-1000'
    and grade = 2
    and published is false

  union all

  select
    'GRADE2_CANDIDATE',
    'question_rows',
    count(*)::bigint,
    24::bigint,
    'All candidate questions must remain unpublished.'
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and published is false

  union all

  select
    'GRADE2_CANDIDATE',
    'solution_mappings',
    count(*)::bigint,
    24::bigint,
    'Count only; no solution payload is selected.'
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-2-numbers-to-1000'

  union all

  select
    'REMOTE_DRIFT',
    'rls_auto_enable_objects',
    (
      (
        select count(*)
        from pg_catalog.pg_proc as procedure
        join pg_catalog.pg_namespace as namespace
          on namespace.oid = procedure.pronamespace
        where
          namespace.nspname = 'public'
          and procedure.proname = 'rls_auto_enable'
      )
      +
      (
        select count(*)
        from pg_catalog.pg_event_trigger
        where evtname = 'ensure_rls'
      )
    )::bigint,
    0::bigint,
    'The approved remote-only drift remediation must remain effective.'
)
select
  section,
  metric,
  exact_count,
  expected_count,
  case
    when exact_count = expected_count then 'PASS'
    else 'FAIL'
  end as status,
  notes
from observed
order by section, metric;

rollback;
