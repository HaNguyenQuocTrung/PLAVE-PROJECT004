-- Read-only verification for migration 0004.
-- This query does not execute any application RPC.
with expected_tables(table_name) as (
  values
    ('learning_units'::text),
    ('questions'::text),
    ('question_solutions'::text),
    ('practice_attempts'::text),
    ('practice_answers'::text)
),
table_state as (
  select
    expected.table_name,
    relation.oid is not null as table_exists,
    coalesce(relation.relrowsecurity, false) as rls_enabled,
    coalesce(relation.relforcerowsecurity, false) as rls_forced
  from expected_tables as expected
  left join pg_catalog.pg_class as relation
    on relation.oid = pg_catalog.to_regclass(
      pg_catalog.format('public.%I', expected.table_name)
    )
),
seed_metrics as (
  select
    (
      select count(*)
      from public.learning_units as u
      where u.slug = 'grade-1-numbers-to-10'
    ) as learning_unit_count,
    (
      select count(*)
      from public.questions as q
      where q.unit_slug = 'grade-1-numbers-to-10'
    ) as question_count,
    (
      select count(*)
      from public.question_solutions as s
      join public.questions as q on q.code = s.question_id
      where q.unit_slug = 'grade-1-numbers-to-10'
    ) as solution_count,
    (
      select count(*)
      from public.practice_attempts
    ) as attempt_count,
    (
      select count(*)
      from public.practice_answers
    ) as answer_count
),
question_metrics as (
  select
    count(*) filter (
      where q.question_type = 'MULTIPLE_CHOICE'
    ) as multiple_choice_count,
    count(*) filter (
      where q.question_type = 'NUMBER_INPUT'
    ) as number_input_count,
    count(*) filter (
      where q.published
    ) as published_count,
    count(*) - count(distinct q.code) as duplicate_code_count,
    count(*) - count(distinct q.prompt) as duplicate_prompt_count
  from public.questions as q
  where q.unit_slug = 'grade-1-numbers-to-10'
),
skill_metrics as (
  select
    q.skill_code,
    count(*) as question_count
  from public.questions as q
  where q.unit_slug = 'grade-1-numbers-to-10'
  group by q.skill_code
),
integrity_metrics as (
  select
    (
      select count(*)
      from public.learning_units as u
      where u.slug = 'grade-1-numbers-to-10'
        and not (
          u.grade = 1
          and u.published
          and u.total_questions = 24
          and jsonb_array_length(u.learning_objectives) >= 1
          and jsonb_array_length(u.lesson_content -> 'sections') >= 6
          and jsonb_array_length(
            u.lesson_content -> 'worked_examples'
          ) >= 2
        )
    ) as invalid_unit_count,
    (
      select count(*)
      from public.questions as q
      where q.unit_slug = 'grade-1-numbers-to-10'
        and q.question_type = 'MULTIPLE_CHOICE'
        and (
          q.options is null
          or jsonb_typeof(q.options) <> 'object'
          or not (q.options ?& array['A', 'B', 'C', 'D'])
          or (
            q.options - array['A', 'B', 'C', 'D']::text[]
          ) <> '{}'::jsonb
          or jsonb_typeof(q.options -> 'A') <> 'string'
          or jsonb_typeof(q.options -> 'B') <> 'string'
          or jsonb_typeof(q.options -> 'C') <> 'string'
          or jsonb_typeof(q.options -> 'D') <> 'string'
          or btrim(q.options ->> 'A') = ''
          or btrim(q.options ->> 'B') = ''
          or btrim(q.options ->> 'C') = ''
          or btrim(q.options ->> 'D') = ''
        )
    ) as invalid_mcq_options_count,
    (
      select count(*)
      from public.questions as q
      where q.unit_slug = 'grade-1-numbers-to-10'
        and q.question_type = 'NUMBER_INPUT'
        and q.options is not null
    ) as invalid_number_options_count,
    (
      select count(*)
      from public.questions as q
      left join public.question_solutions as s
        on s.question_id = q.code
      where q.unit_slug = 'grade-1-numbers-to-10'
        and s.question_id is null
    ) as missing_solution_count,
    (
      select count(*)
      from public.questions as q
      join public.question_solutions as s on s.question_id = q.code
      where q.unit_slug = 'grade-1-numbers-to-10'
        and (
          jsonb_typeof(s.solution_steps) <> 'array'
          or jsonb_array_length(s.solution_steps) < 2
          or (
            q.question_type = 'MULTIPLE_CHOICE'
            and (
              s.correct_answer !~ '^[A-D]$'
              or not (q.options ? s.correct_answer)
            )
          )
          or (
            q.question_type = 'NUMBER_INPUT'
            and s.correct_answer !~ '^(0|[1-9]|10)$'
          )
        )
    ) as invalid_solution_count
),
database_invariants as (
  select
    exists (
      select 1
      from pg_catalog.pg_index as index_row
      where index_row.indexrelid = pg_catalog.to_regclass(
        'public.practice_attempts_one_in_progress_idx'
      )
        and index_row.indisunique
        and index_row.indpred is not null
    ) as one_in_progress_unique_index,
    exists (
      select 1
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = pg_catalog.to_regclass(
        'public.practice_answers'
      )
        and constraint_row.conname = 'practice_answers_pkey'
        and constraint_row.contype = 'p'
    ) as immutable_answer_primary_key,
    exists (
      select 1
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = pg_catalog.to_regclass(
        'public.practice_attempts'
      )
        and constraint_row.conname =
          'practice_attempts_question_order_check'
        and constraint_row.contype = 'c'
    ) as question_order_constraint,
    (
      select count(*) = 4
      from pg_catalog.pg_trigger as trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgname in (
          'learning_units_set_updated_at',
          'questions_set_updated_at',
          'question_solutions_set_updated_at',
          'practice_attempts_set_updated_at'
        )
    ) as updated_at_triggers
),
policy_rows as (
  select
    policy.tablename,
    policy.policyname,
    policy.cmd,
    policy.roles
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename in (
      'learning_units',
      'questions',
      'question_solutions',
      'practice_attempts',
      'practice_answers'
    )
),
table_grant_rows as (
  select
    grant_row.table_name,
    grant_row.grantee,
    grant_row.privilege_type
  from information_schema.table_privileges as grant_row
  where grant_row.table_schema = 'public'
    and grant_row.table_name in (
      'learning_units',
      'questions',
      'question_solutions',
      'practice_attempts',
      'practice_answers'
    )
    and grant_row.grantee in ('PUBLIC', 'anon', 'authenticated')
),
rpc_rows as (
  select
    routine.oid,
    routine.proname,
    pg_catalog.pg_get_function_identity_arguments(
      routine.oid
    ) as identity_arguments,
    pg_catalog.pg_get_function_result(
      routine.oid
    ) as result_type,
    pg_catalog.pg_get_userbyid(routine.proowner) as function_owner,
    routine.prosecdef as security_definer,
    routine.proconfig as function_config
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname in (
      'start_or_resume_practice',
      'submit_practice_answer',
      'get_practice_review'
    )
),
rpc_acl as (
  select
    rpc.proname,
    rpc.identity_arguments,
    pg_catalog.has_function_privilege(
      'authenticated',
      rpc.oid,
      'EXECUTE'
    ) as authenticated_execute,
    pg_catalog.has_function_privilege(
      'anon',
      rpc.oid,
      'EXECUTE'
    ) as anon_execute,
    exists (
      select 1
      from pg_catalog.aclexplode(
        coalesce(
          routine.proacl,
          pg_catalog.acldefault('f', routine.proowner)
        )
      ) as function_acl
      where function_acl.grantee = 0
        and function_acl.privilege_type = 'EXECUTE'
    ) as public_execute
  from rpc_rows as rpc
  join pg_catalog.pg_proc as routine on routine.oid = rpc.oid
),
overall_status as (
  select
    (
      (select bool_and(state.table_exists) from table_state as state)
      and (select bool_and(state.rls_enabled) from table_state as state)
      and metrics.learning_unit_count = 1
      and metrics.question_count = 24
      and metrics.solution_count = 24
      and metrics.attempt_count = 0
      and metrics.answer_count = 0
      and questions.multiple_choice_count = 16
      and questions.number_input_count = 8
      and questions.published_count = 24
      and questions.duplicate_code_count = 0
      and questions.duplicate_prompt_count = 0
      and integrity.invalid_unit_count = 0
      and integrity.invalid_mcq_options_count = 0
      and integrity.invalid_number_options_count = 0
      and integrity.missing_solution_count = 0
      and integrity.invalid_solution_count = 0
      and invariants.one_in_progress_unique_index
      and invariants.immutable_answer_primary_key
      and invariants.question_order_constraint
      and invariants.updated_at_triggers
      and (
        select count(*) = 4
          and bool_and(skills.question_count = 6)
        from skill_metrics as skills
      )
      and (
        select count(*) = 4
          and bool_and(
            policies.cmd = 'SELECT'
            and policies.roles = array['authenticated']::name[]
          )
        from policy_rows as policies
      )
      and (
        select count(*) = 4
          and bool_and(
            grants.grantee = 'authenticated'
            and grants.privilege_type = 'SELECT'
            and grants.table_name <> 'question_solutions'
          )
        from table_grant_rows as grants
      )
      and (
        select count(*) = 3
          and bool_and(
            rpc.security_definer
            and coalesce(
              array_to_string(rpc.function_config, ','),
              ''
            ) like '%search_path=%'
          )
        from rpc_rows as rpc
      )
      and (
        select count(*) = 3
          and bool_and(
            acl.authenticated_execute
            and not acl.anon_execute
            and not acl.public_execute
          )
        from rpc_acl as acl
      )
    ) as all_checks_pass
  from seed_metrics as metrics
  cross join question_metrics as questions
  cross join integrity_metrics as integrity
  cross join database_invariants as invariants
)
select
  1 as section_number,
  'tables_and_rls'::text as section_name,
  coalesce(
    (
      select jsonb_agg(
        pg_catalog.jsonb_build_object(
          'table_name', state.table_name,
          'exists', state.table_exists,
          'rls_enabled', state.rls_enabled,
          'rls_forced', state.rls_forced
        )
        order by state.table_name
      )
      from table_state as state
    ),
    '[]'::jsonb
  ) as result_json

union all

select
  2,
  'seed_counts',
  pg_catalog.to_jsonb(metrics)
from seed_metrics as metrics

union all

select
  3,
  'question_distribution',
  pg_catalog.jsonb_build_object(
    'multiple_choice', questions.multiple_choice_count,
    'number_input', questions.number_input_count,
    'published', questions.published_count,
    'duplicate_codes', questions.duplicate_code_count,
    'duplicate_prompts', questions.duplicate_prompt_count,
    'skills', coalesce(
      (
        select jsonb_agg(
          pg_catalog.jsonb_build_object(
            'skill_code', skills.skill_code,
            'question_count', skills.question_count
          )
          order by skills.skill_code
        )
        from skill_metrics as skills
      ),
      '[]'::jsonb
    )
  )
from question_metrics as questions

union all

select
  4,
  'content_integrity',
  pg_catalog.to_jsonb(integrity)
from integrity_metrics as integrity

union all

select
  5,
  'database_invariants',
  pg_catalog.to_jsonb(invariants)
from database_invariants as invariants

union all

select
  6,
  'rls_policies',
  coalesce(
    (
      select jsonb_agg(
        pg_catalog.jsonb_build_object(
          'table_name', policies.tablename,
          'policy_name', policies.policyname,
          'command', policies.cmd,
          'roles', policies.roles
        )
        order by policies.tablename, policies.policyname
      )
      from policy_rows as policies
    ),
    '[]'::jsonb
  )

union all

select
  7,
  'table_privileges',
  coalesce(
    (
      select jsonb_agg(
        pg_catalog.jsonb_build_object(
          'table_name', grants.table_name,
          'grantee', grants.grantee,
          'privilege', grants.privilege_type
        )
        order by
          grants.table_name,
          grants.grantee,
          grants.privilege_type
      )
      from table_grant_rows as grants
    ),
    '[]'::jsonb
  )

union all

select
  8,
  'rpc_metadata',
  coalesce(
    (
      select jsonb_agg(
        pg_catalog.jsonb_build_object(
          'function_name', rpc.proname,
          'identity_arguments', rpc.identity_arguments,
          'result_type', rpc.result_type,
          'function_owner', rpc.function_owner,
          'security_definer', rpc.security_definer,
          'function_config', rpc.function_config
        )
        order by rpc.proname
      )
      from rpc_rows as rpc
    ),
    '[]'::jsonb
  )

union all

select
  9,
  'rpc_execute_privileges',
  coalesce(
    (
      select jsonb_agg(
        pg_catalog.jsonb_build_object(
          'function_name', acl.proname,
          'identity_arguments', acl.identity_arguments,
          'authenticated_execute', acl.authenticated_execute,
          'anon_execute', acl.anon_execute,
          'public_execute', acl.public_execute
        )
        order by acl.proname
      )
      from rpc_acl as acl
    ),
    '[]'::jsonb
  )

union all

select
  10,
  'overall',
  pg_catalog.jsonb_build_object(
    'all_checks_pass', status.all_checks_pass
  )
from overall_status as status

order by section_number;
