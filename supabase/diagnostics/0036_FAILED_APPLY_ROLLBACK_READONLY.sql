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
    'The rollback audit session must remain read-only.'::text as notes

  union all

  select
    'ADAPTIVE_CATALOG',
    'tables_present',
    count(*)::bigint,
    0::bigint,
    'Any adaptive table means rollback is not clean.'
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
    and relation.relkind in ('r', 'p')

  union all

  select
    'ADAPTIVE_CATALOG',
    'relations_with_possible_rows',
    count(*)::bigint,
    0::bigint,
    'Catalog estimate only; any adaptive relation already blocks rerun.'
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
    and relation.relkind in ('r', 'p')
    and relation.reltuples <> 0

  union all

  select
    'ADAPTIVE_CATALOG',
    'public_rpcs_present',
    count(*)::bigint,
    0::bigint,
    'Any adaptive public RPC means rollback is not clean.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname in (
      'start_or_resume_adaptive_practice',
      'get_adaptive_practice_state',
      'submit_adaptive_practice_answer'
    )

  union all

  select
    'ADAPTIVE_CATALOG',
    'private_helpers_present',
    count(*)::bigint,
    0::bigint,
    'Any adaptive private helper means rollback is not clean.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'private'
    and procedure.proname in (
      'adaptive_hash_text',
      'get_adaptive_skill_mastery',
      'plan_adaptive_practice_transition',
      'build_adaptive_practice_response'
    )

  union all

  select
    'ADAPTIVE_CATALOG',
    'policies_present',
    count(*)::bigint,
    0::bigint,
    'Any adaptive policy means rollback is not clean.'
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and (
      policy.polname like 'adaptive_practice_%'
      or relation.relname in (
        'adaptive_practice_releases',
        'adaptive_practice_attempts',
        'adaptive_practice_answers'
      )
    )

  union all

  select
    'ADAPTIVE_CATALOG',
    'indexes_present',
    count(*)::bigint,
    0::bigint,
    'Any adaptive index means rollback is not clean.'
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
    'ADAPTIVE_CATALOG',
    'browser_grants_present',
    count(*)::bigint,
    0::bigint,
    'Any browser table privilege on an adaptive table means rollback is not clean.'
  from information_schema.role_table_grants as table_grant
  where
    table_grant.table_schema = 'public'
    and table_grant.table_name in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
    and table_grant.grantee in ('PUBLIC', 'anon', 'authenticated')

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
    'GRADE2_BASELINE',
    'unpublished_units',
    count(*)::bigint,
    1::bigint,
    'The frozen Grade 2 unit must remain unpublished.'
  from public.learning_units
  where
    slug = 'grade-2-numbers-to-1000'
    and grade = 2
    and published is false

  union all

  select
    'GRADE2_BASELINE',
    'unpublished_questions',
    count(*)::bigint,
    24::bigint,
    'The frozen Grade 2 questions must remain unpublished.'
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and published is false

  union all

  select
    'GRADE2_BASELINE',
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
    'Remote-only RLS drift objects must remain absent.'
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
