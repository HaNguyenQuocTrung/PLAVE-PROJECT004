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
    'The post-apply verification session must remain read-only.'::text
      as notes

  union all

  select
    'ELIGIBILITY_SCHEMA',
    'pilot_members_table',
    count(*)::bigint,
    1::bigint,
    'Exactly one database-side pilot membership table.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'
    and relation.relkind = 'r'

  union all

  select
    'ELIGIBILITY_SCHEMA',
    'rls_and_force_rls',
    count(*)::bigint,
    1::bigint,
    'Pilot membership must enable and force RLS.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'
    and relation.relrowsecurity is true
    and relation.relforcerowsecurity is true

  union all

  select
    'ELIGIBILITY_SCHEMA',
    'named_constraints',
    count(*)::bigint,
    2::bigint,
    'Primary key and bundle-hash constraints are present.'
  from pg_catalog.pg_constraint as constraint_record
  join pg_catalog.pg_class as relation
    on relation.oid = constraint_record.conrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname = 'adaptive_practice_pilot_members'
    and constraint_record.conname in (
      'adaptive_practice_pilot_members_pkey',
      'adaptive_pilot_member_bundle_hash_check'
    )

  union all

  select
    'ELIGIBILITY_SCHEMA',
    'membership_rows',
    count(*)::bigint,
    0::bigint,
    'Migration 0037 must not seed a pilot member.'
  from public.adaptive_practice_pilot_members

  union all

  select
    'ELIGIBILITY_SECURITY',
    'browser_table_privileges',
    count(*)::bigint,
    0::bigint,
    'Browser roles must have no direct privilege on pilot membership.'
  from information_schema.role_table_grants as table_grant
  where
    table_grant.table_schema = 'public'
    and table_grant.table_name =
      'adaptive_practice_pilot_members'
    and table_grant.grantee in ('PUBLIC', 'anon', 'authenticated')

  union all

  select
    'ELIGIBILITY_SECURITY',
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
    'Browser roles still cannot read private solutions directly.'

  union all

  select
    'ELIGIBILITY_FUNCTIONS',
    'public_rpc_exact_signatures',
    count(*)::bigint,
    4::bigint,
    'Availability plus the three adaptive runtime RPC signatures.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join (
    values
      (
        'get_adaptive_controlled_pilot_availability',
        'text'
      ),
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
    'ELIGIBILITY_FUNCTIONS',
    'public_rpc_secure_definer_search_path',
    count(*)::bigint,
    4::bigint,
    'Every public adaptive RPC is SECURITY DEFINER with empty search_path.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join (
    values
      (
        'get_adaptive_controlled_pilot_availability',
        'text'
      ),
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
    'ELIGIBILITY_FUNCTIONS',
    'authenticated_rpc_execute_only',
    count(*)::bigint,
    4::bigint,
    'Authenticated may execute each public RPC; anon may not.'
  from (
    values
      (
        'public.get_adaptive_controlled_pilot_availability(text)'
      ),
      ('public.start_or_resume_adaptive_practice(text,uuid)'),
      ('public.get_adaptive_practice_state(uuid)'),
      (
        'public.submit_adaptive_practice_answer'
        || '(uuid,text,text,integer,uuid)'
      )
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
    'ELIGIBILITY_FUNCTIONS',
    'private_helper_exact_signatures',
    count(*)::bigint,
    5::bigint,
    'Four corrected-0036 helpers plus the membership helper.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join (
    values
      ('adaptive_hash_text', 'text'),
      ('get_adaptive_skill_mastery', 'uuid'),
      ('plan_adaptive_practice_transition', 'uuid'),
      ('build_adaptive_practice_response', 'uuid, jsonb'),
      (
        'is_adaptive_controlled_pilot_member',
        'uuid, text, text, text, text, text'
      )
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
    'ELIGIBILITY_FUNCTIONS',
    'browser_private_helper_execute_privileges',
    count(*)::bigint,
    0::bigint,
    'Browser roles may not execute any private adaptive helper.'
  from (
    values
      ('private.adaptive_hash_text(text)'),
      ('private.get_adaptive_skill_mastery(uuid)'),
      ('private.plan_adaptive_practice_transition(uuid)'),
      ('private.build_adaptive_practice_response(uuid,jsonb)'),
      (
        'private.is_adaptive_controlled_pilot_member'
        || '(uuid,text,text,text,text,text)'
      )
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
    'ELIGIBILITY_FUNCTIONS',
    'membership_and_role_guards',
    count(*)::bigint,
    3::bigint,
    'Availability/start/submit enforce auth, Student grade and membership.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%auth.uid()%'
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%is_adaptive_controlled_pilot_member%'
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%role = ''student''%'
    and (
      (
        procedure.proname =
          'get_adaptive_controlled_pilot_availability'
        and pg_catalog.oidvectortypes(procedure.proargtypes) = 'text'
        and lower(pg_catalog.pg_get_functiondef(procedure.oid))
          like '%student.grade = 2%'
      )
      or (
        procedure.proname =
          'start_or_resume_adaptive_practice'
        and pg_catalog.oidvectortypes(procedure.proargtypes) =
          'text, uuid'
        and lower(pg_catalog.pg_get_functiondef(procedure.oid))
          like '%v_student_grade <> 2%'
      )
      or (
        procedure.proname =
          'submit_adaptive_practice_answer'
        and pg_catalog.oidvectortypes(procedure.proargtypes) =
          'uuid, text, text, integer, uuid'
        and lower(pg_catalog.pg_get_functiondef(procedure.oid))
          like '%student.grade = 2%'
      )
    )

  union all

  select
    'ELIGIBILITY_FUNCTIONS',
    'hidden_candidate_runtime_guards',
    count(*)::bigint,
    3::bigint,
    'Availability/start/submit require hidden DRAFT activation flags.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and (
      procedure.proname =
        'get_adaptive_controlled_pilot_availability'
      or procedure.proname =
        'start_or_resume_adaptive_practice'
      or procedure.proname =
        'submit_adaptive_practice_answer'
    )
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%publication_status = ''draft''%'
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%student_visibility = ''hidden''%'
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%runtime_enabled%'
    and lower(pg_catalog.pg_get_functiondef(procedure.oid))
      like '%controlled_pilot_enabled%'

  union all

  select
    'ELIGIBILITY_FUNCTIONS',
    'unpublished_bank_contract',
    count(*)::bigint,
    3::bigint,
    'Planner/start/submit use the frozen unpublished bank without publication bypass.'
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
        not like '%and question.published%'
    )
    or (
      namespace.nspname = 'public'
      and procedure.proname =
        'start_or_resume_adaptive_practice'
      and pg_catalog.oidvectortypes(procedure.proargtypes) =
        'text, uuid'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        not like '%and unit.published%'
    )
    or (
      namespace.nspname = 'public'
      and procedure.proname =
        'submit_adaptive_practice_answer'
      and pg_catalog.oidvectortypes(procedure.proargtypes) =
        'uuid, text, text, integer, uuid'
      and lower(pg_catalog.pg_get_functiondef(procedure.oid))
        not like '%and question.published%'
    )

  union all

  select
    'RELEASE_BINDING',
    'pilot_capable_visibility_constraint',
    count(*)::bigint,
    1::bigint,
    'DRAFT/HIDDEN permits only paired runtime/pilot flags; retention stays off.'
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
    )) like '%runtime_enabled = controlled_pilot_enabled%'
    and lower(pg_catalog.pg_get_constraintdef(
      constraint_record.oid
    )) like '%not retention_runtime_enabled%'

  union all

  select
    'RELEASE_BINDING',
    'frozen_hidden_release_flags_off',
    count(*)::bigint,
    1::bigint,
    'Candidate binding stays frozen, DRAFT/HIDDEN and inactive.'
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
    and release.publication_status = 'DRAFT'
    and release.student_visibility = 'HIDDEN'
    and not release.runtime_enabled
    and not release.controlled_pilot_enabled
    and not release.retention_runtime_enabled

  union all

  select
    'RELEASE_BINDING',
    'activation_flags_true',
    count(*)::bigint,
    0::bigint,
    'All database activation flags remain false.'
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
    'Migration 0037 must not seed an adaptive attempt.'
  from public.adaptive_practice_attempts

  union all

  select
    'ADAPTIVE_DATA',
    'answer_evidence_rows',
    count(*)::bigint,
    0::bigint,
    'Migration 0037 must not seed adaptive answer evidence.'
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
