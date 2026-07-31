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
    'GRADE1_BASELINE',
    'published_units',
    count(*)::bigint,
    13::bigint,
    'Published Grade 1 learning units.'
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
    'GRADE2_CANDIDATE',
    'unit_rows',
    count(*)::bigint,
    1::bigint,
    'Expected frozen candidate unit slug.'
  from public.learning_units
  where
    slug = 'grade-2-numbers-to-1000'
    and grade = 2
    and display_order = 1
    and total_questions = 24
    and prerequisite_unit_slug is null

  union all

  select
    'GRADE2_CANDIDATE',
    'published_units',
    count(*)::bigint,
    0::bigint,
    'The candidate must remain DRAFT/HIDDEN.'
  from public.learning_units
  where
    slug = 'grade-2-numbers-to-1000'
    and published is true

  union all

  select
    'GRADE2_CANDIDATE',
    'question_rows',
    count(*)::bigint,
    24::bigint,
    'Frozen release-bank size.'
  from public.questions
  where unit_slug = 'grade-2-numbers-to-1000'

  union all

  select
    'GRADE2_CANDIDATE',
    'published_questions',
    count(*)::bigint,
    0::bigint,
    'Student catalog visibility requires published questions.'
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and published is true

  union all

  select
    'GRADE2_CANDIDATE',
    'solution_mappings',
    count(*)::bigint,
    24::bigint,
    'Count only; no answer or solution payload is selected.'
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-2-numbers-to-1000'

  union all

  select
    'GRADE2_CANDIDATE',
    'multiple_choice_questions',
    count(*)::bigint,
    16::bigint,
    'Frozen answer-type distribution.'
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and question_type = 'MULTIPLE_CHOICE'

  union all

  select
    'GRADE2_CANDIDATE',
    'number_input_questions',
    count(*)::bigint,
    8::bigint,
    'Frozen answer-type distribution.'
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and question_type = 'NUMBER_INPUT'

  union all

  select
    'GRADE2_CANDIDATE',
    'skills_with_six_questions',
    count(*)::bigint,
    4::bigint,
    'Each frozen skill family must contain six questions.'
  from (
    select skill_code
    from public.questions
    where unit_slug = 'grade-2-numbers-to-1000'
    group by skill_code
    having count(*) = 6
  ) as valid_skill

  union all

  select
    'GRADE2_CANDIDATE',
    'practice_attempts',
    count(*)::bigint,
    0::bigint,
    'A hidden candidate must have no Student practice attempt.'
  from public.practice_attempts
  where unit_slug = 'grade-2-numbers-to-1000'

  union all

  select
    'HISTORY_BASELINE',
    'practice_attempts',
    count(*)::bigint,
    18::bigint,
    'Locked pre-operation aggregate from the verified backup.'
  from public.practice_attempts

  union all

  select
    'HISTORY_BASELINE',
    'practice_answers',
    count(*)::bigint,
    340::bigint,
    'Locked pre-operation aggregate; no answer payload is selected.'
  from public.practice_answers

  union all

  select
    'HISTORY_BASELINE',
    'diagnostic_attempts',
    count(*)::bigint,
    1::bigint,
    'Locked pre-operation aggregate from the verified backup.'
  from public.diagnostic_attempts

  union all

  select
    'HISTORY_BASELINE',
    'diagnostic_answers',
    count(*)::bigint,
    24::bigint,
    'Locked pre-operation aggregate; no answer payload is selected.'
  from public.diagnostic_answers

  union all

  select
    'SECURITY',
    'catalog_tables_with_rls',
    count(*)::bigint,
    2::bigint,
    'learning_units and questions must both keep RLS enabled.'
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname = 'public'
    and relation.relname in ('learning_units', 'questions')
    and relation.relrowsecurity is true

  union all

  select
    'SECURITY',
    'published_only_catalog_policies',
    count(*)::bigint,
    2::bigint,
    'Authenticated catalog policies must remain publication-gated.'
  from pg_catalog.pg_policies
  where
    schemaname = 'public'
    and tablename in ('learning_units', 'questions')
    and roles::text ~ 'authenticated'
    and qual ~ 'published'

  union all

  select
    'SECURITY',
    'browser_solution_select_grants',
    (
      case
        when pg_catalog.has_table_privilege(
          'anon',
          'public.question_solutions',
          'select'
        ) then 1 else 0
      end
      +
      case
        when pg_catalog.has_table_privilege(
          'authenticated',
          'public.question_solutions',
          'select'
        ) then 1 else 0
      end
    )::bigint,
    0::bigint,
    'Neither browser role may directly read private solutions.'

  union all

  select
    'DRAFT_0036',
    'adaptive_tables_present',
    count(*)::bigint,
    0::bigint,
    'Migration 0036 must remain absent.'
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
    'DRAFT_0036',
    'adaptive_functions_present',
    count(*)::bigint,
    0::bigint,
    'No 0036 public RPC or private planner helper may exist.'
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    (
      namespace.nspname = 'public'
      and procedure.proname in (
        'start_or_resume_adaptive_practice',
        'get_adaptive_practice_state',
        'submit_adaptive_practice_answer'
      )
    )
    or (
      namespace.nspname = 'private'
      and procedure.proname in (
        'adaptive_hash_text',
        'get_adaptive_skill_mastery',
        'plan_adaptive_practice_transition',
        'build_adaptive_practice_response'
      )
    )

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
