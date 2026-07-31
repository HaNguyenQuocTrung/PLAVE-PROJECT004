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
    'The failed-apply verification session must remain read-only.'::text
      as notes

  union all

  select
    '0037_ROLLBACK',
    'pilot_members_table_present',
    count(*)::bigint,
    0::bigint,
    'The new pilot membership table must be absent after rollback.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'
    and relation.relkind in ('r', 'p')

  union all

  select
    '0037_ROLLBACK',
    'availability_rpc_present',
    count(*)::bigint,
    0::bigint,
    'The new availability RPC must be absent after rollback.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname =
      'get_adaptive_controlled_pilot_availability'

  union all

  select
    '0037_ROLLBACK',
    'membership_helper_present',
    count(*)::bigint,
    0::bigint,
    'The new private membership helper must be absent after rollback.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'private'
    and procedure.proname =
      'is_adaptive_controlled_pilot_member'

  union all

  select
    '0037_ROLLBACK',
    'pilot_member_policies_present',
    count(*)::bigint,
    0::bigint,
    'No policy for the rolled-back table may remain.'
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'

  union all

  select
    '0037_ROLLBACK',
    'pilot_member_indexes_present',
    count(*)::bigint,
    0::bigint,
    'No index for the rolled-back table may remain.'
  from pg_catalog.pg_class as index_relation
  join pg_catalog.pg_index as index_record
    on index_record.indexrelid = index_relation.oid
  join pg_catalog.pg_class as table_relation
    on table_relation.oid = index_record.indrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = table_relation.relnamespace
  where
    namespace.nspname = 'public'
    and table_relation.relname = 'adaptive_practice_pilot_members'

  union all

  select
    '0037_ROLLBACK',
    'pilot_member_browser_grants_present',
    count(*)::bigint,
    0::bigint,
    'No browser grant for the rolled-back table may remain.'
  from information_schema.role_table_grants as table_grant
  where
    table_grant.table_schema = 'public'
    and table_grant.table_name =
      'adaptive_practice_pilot_members'
    and table_grant.grantee in ('PUBLIC', 'anon', 'authenticated')

  union all

  select
    '0037_ROLLBACK',
    'release_visibility_constraint_restored',
    count(*)::bigint,
    1::bigint,
    'The original 0036 DRAFT/HIDDEN deny-all constraint must remain.'
  from pg_catalog.pg_constraint as constraint_record
  join pg_catalog.pg_class as relation
    on relation.oid = constraint_record.conrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_releases'
    and constraint_record.conname =
      'adaptive_release_visibility_check'
    and lower(pg_catalog.pg_get_constraintdef(
      constraint_record.oid
    )) like '%not runtime_enabled%'
    and lower(pg_catalog.pg_get_constraintdef(
      constraint_record.oid
    )) like '%not controlled_pilot_enabled%'
    and lower(pg_catalog.pg_get_constraintdef(
      constraint_record.oid
    )) like '%not retention_runtime_enabled%'

  union all

  select
    '0037_ROLLBACK',
    '0036_function_bodies_restored',
    count(*)::bigint,
    3::bigint,
    'Planner/start/submit must retain their pre-0037 publication guards.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    (
      namespace.nspname = 'private'
      and procedure.proname =
        'plan_adaptive_practice_transition'
      and pg_catalog.oidvectortypes(procedure.proargtypes) = 'uuid'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        like '%and question.published%'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        not like '%is_adaptive_controlled_pilot_member%'
    )
    or (
      namespace.nspname = 'public'
      and procedure.proname =
        'start_or_resume_adaptive_practice'
      and pg_catalog.oidvectortypes(procedure.proargtypes) =
        'text, uuid'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        like '%and unit.published%'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        not like '%is_adaptive_controlled_pilot_member%'
    )
    or (
      namespace.nspname = 'public'
      and procedure.proname =
        'submit_adaptive_practice_answer'
      and pg_catalog.oidvectortypes(procedure.proargtypes) =
        'uuid, text, text, integer, uuid'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        like '%and question.published%'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        not like '%is_adaptive_controlled_pilot_member%'
    )

  union all

  select
    '0036_BASELINE',
    'adaptive_tables',
    count(*)::bigint,
    3::bigint,
    'The three corrected-0036 adaptive tables must remain.'
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
    '0036_BASELINE',
    'public_rpc_exact_signatures',
    count(*)::bigint,
    3::bigint,
    'The three corrected-0036 public RPC signatures must remain.'
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
    '0036_BASELINE',
    'private_helper_exact_signatures',
    count(*)::bigint,
    4::bigint,
    'The four corrected-0036 private helper signatures must remain.'
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
  where namespace.nspname = 'private'

  union all

  select
    'RELEASE_BINDING',
    'frozen_hidden_release_flags_off',
    count(*)::bigint,
    1::bigint,
    'Frozen release remains DRAFT/HIDDEN and inactive.'
  from public.adaptive_practice_releases as release
  where
    release.unit_slug = 'grade-2-numbers-to-1000'
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
    and not release.retention_runtime_enabled

  union all

  select
    'ADAPTIVE_DATA',
    'attempt_rows',
    count(*)::bigint,
    0::bigint,
    'A failed 0037 apply must not create an adaptive attempt.'
  from public.adaptive_practice_attempts

  union all

  select
    'ADAPTIVE_DATA',
    'answer_evidence_rows',
    count(*)::bigint,
    0::bigint,
    'A failed 0037 apply must not create adaptive answer evidence.'
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
    'Published Grade 1 questions.'
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
    'GRADE2_CANDIDATE',
    'unpublished_unit',
    count(*)::bigint,
    1::bigint,
    'The frozen Grade 2 unit remains unpublished.'
  from public.learning_units
  where
    slug = 'grade-2-numbers-to-1000'
    and grade = 2
    and published is false

  union all

  select
    'GRADE2_CANDIDATE',
    'unpublished_questions',
    count(*)::bigint,
    24::bigint,
    'The frozen Grade 2 questions remain unpublished.'
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
    'Approved remote-only RLS drift objects remain absent.'
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
