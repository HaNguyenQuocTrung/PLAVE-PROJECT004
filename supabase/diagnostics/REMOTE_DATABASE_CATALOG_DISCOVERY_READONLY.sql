-- PLAVE remote catalog discovery, Phase 1.
--
-- This script discovers relation/function/policy/index metadata only. It does
-- not query any application relation, execute application functions, inspect
-- row content, or return PII. Expected application object names appear only
-- as catalog filters or to_regclass() inputs.

begin transaction read only;

with
relevant_tables as (
  select
    namespace.nspname::text as schema_name,
    relation.relname::text as table_name,
    relation.relrowsecurity as rls_enabled,
    relation.relforcerowsecurity as force_rls_enabled,
    statistics.n_live_tup::bigint as approximate_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  left join pg_catalog.pg_stat_user_tables as statistics
    on statistics.relid = relation.oid
  where relation.relkind in ('r', 'p')
    and (
      (
        namespace.nspname = 'auth'
        and relation.relname = 'users'
      )
      or (
        namespace.nspname = 'public'
        and (
          relation.relname in (
            'profiles',
            'student_profiles',
            'teacher_profiles',
            'parent_student_connections',
            'learning_units',
            'questions',
            'question_solutions',
            'practice_attempts',
            'practice_answers',
            'diagnostic_attempts',
            'diagnostic_answers',
            'adaptive_practice_releases',
            'adaptive_practice_attempts',
            'adaptive_practice_answers'
          )
          or relation.relname ilike '%parent%'
          or relation.relname ilike '%student%'
          or relation.relname ilike '%teacher%'
          or relation.relname ilike '%attempt%'
          or relation.relname ilike '%answer%'
          or relation.relname ilike '%progress%'
          or relation.relname ilike '%master%'
          or relation.relname ilike '%release%'
        )
      )
    )
),
session_row as (
  select
    'SESSION'::text as section,
    'TRANSACTION'::text as object_type,
    'pg_catalog'::text as schema_name,
    'transaction_read_only'::text as object_name,
    current_setting('transaction_read_only')::text as detail,
    null::bigint as approximate_count
),
migration_schema_rows as (
  select
    'MIGRATION_TRACKING'::text as section,
    'SCHEMA'::text as object_type,
    namespace.nspname::text as schema_name,
    namespace.nspname::text as object_name,
    'schema name contains migration'::text as detail,
    null::bigint as approximate_count
  from pg_catalog.pg_namespace as namespace
  where namespace.nspname ilike '%migration%'
),
migration_table_rows as (
  select
    'MIGRATION_TRACKING'::text as section,
    'TABLE'::text as object_type,
    namespace.nspname::text as schema_name,
    relation.relname::text as object_name,
    'table name matches migration/schema-version/version discovery'
      ::text as detail,
    statistics.n_live_tup::bigint as approximate_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  left join pg_catalog.pg_stat_user_tables as statistics
    on statistics.relid = relation.oid
  where relation.relkind in ('r', 'p')
    and (
      relation.relname ilike '%migration%'
      or relation.relname ilike '%schema_version%'
      or relation.relname = 'version'
      or relation.relname ilike '%version_history%'
    )
),
common_migration_relation_rows as (
  select
    'MIGRATION_TRACKING'::text as section,
    'TO_REGCLASS'::text as object_type,
    split_part(candidate.relation_name, '.', 1)::text as schema_name,
    candidate.relation_name::text as object_name,
    case
      when to_regclass(candidate.relation_name) is null
        then 'ABSENT'
      else 'PRESENT_AS_' || to_regclass(candidate.relation_name)::text
    end::text as detail,
    null::bigint as approximate_count
  from (
    values
      ('supabase_migrations.schema_migrations'),
      ('supabase_migrations.migrations'),
      ('public.schema_migrations'),
      ('public.migrations'),
      ('public.schema_version'),
      ('public.flyway_schema_history')
  ) as candidate(relation_name)
),
expected_relation_rows as (
  select
    'EXPECTED_OBJECT_PRESENCE'::text as section,
    expected.release_group::text as object_type,
    split_part(expected.relation_name, '.', 1)::text as schema_name,
    expected.relation_name::text as object_name,
    case
      when to_regclass(expected.relation_name) is null
        then 'ABSENT'
      else 'PRESENT_AS_' || to_regclass(expected.relation_name)::text
    end::text as detail,
    null::bigint as approximate_count
  from (
    values
      ('0035_BASE_TABLE', 'public.learning_units'),
      ('0035_BASE_TABLE', 'public.questions'),
      ('0035_BASE_TABLE', 'public.question_solutions'),
      ('0036_TABLE', 'public.adaptive_practice_releases'),
      ('0036_TABLE', 'public.adaptive_practice_attempts'),
      ('0036_TABLE', 'public.adaptive_practice_answers')
  ) as expected(release_group, relation_name)
),
application_table_rows as (
  select
    'APPLICATION_TABLES'::text as section,
    'TABLE'::text as object_type,
    table_info.schema_name,
    table_info.table_name as object_name,
    (
      'rls=' || table_info.rls_enabled::text
      || ';force_rls=' || table_info.force_rls_enabled::text
      || ';count_source=pg_stat_user_tables'
    )::text as detail,
    table_info.approximate_count
  from relevant_tables as table_info
),
application_column_rows as (
  select
    'STRUCTURAL_COLUMNS'::text as section,
    'COLUMN'::text as object_type,
    namespace.nspname::text as schema_name,
    relation.relname::text || '.' || attribute.attname::text as object_name,
    (
      'type=' || pg_catalog.format_type(
        attribute.atttypid,
        attribute.atttypmod
      )
      || ';nullable=' || (not attribute.attnotnull)::text
    )::text as detail,
    null::bigint as approximate_count
  from pg_catalog.pg_attribute as attribute
  join pg_catalog.pg_class as relation
    on relation.oid = attribute.attrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  join relevant_tables as table_info
    on table_info.schema_name = namespace.nspname
    and table_info.table_name = relation.relname
  where attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname in (
      'published',
      'grade',
      'created_at',
      'updated_at',
      'started_at',
      'completed_at',
      'answered_at',
      'status',
      'total_questions',
      'publication_status',
      'student_visibility',
      'runtime_enabled',
      'controlled_pilot_enabled',
      'retention_runtime_enabled',
      'content_version',
      'release_candidate_id',
      'unit_slug'
    )
),
adaptive_function_rows as (
  select
    'ADAPTIVE_FUNCTIONS'::text as section,
    case
      when namespace.nspname = 'public'
        then 'PUBLIC_RPC'
      else 'PRIVATE_HELPER'
    end::text as object_type,
    namespace.nspname::text as schema_name,
    procedure.proname::text as object_name,
    (
      'arguments='
      || pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      || ';security_definer=' || procedure.prosecdef::text
      || ';volatility=' || procedure.provolatile::text
    )::text as detail,
    null::bigint as approximate_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where (
    namespace.nspname = 'public'
    and procedure.proname in (
      'start_or_resume_adaptive_practice',
      'submit_adaptive_practice_answer',
      'get_adaptive_practice_state'
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
),
adaptive_policy_rows as (
  select
    'ADAPTIVE_POLICIES'::text as section,
    'POLICY'::text as object_type,
    policy.schemaname::text as schema_name,
    policy.policyname::text as object_name,
    (
      'table=' || policy.tablename
      || ';command=' || policy.cmd
      || ';permissive=' || policy.permissive
    )::text as detail,
    null::bigint as approximate_count
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
),
adaptive_grant_rows as (
  select
    'ADAPTIVE_GRANTS'::text as section,
    'TABLE_GRANT'::text as object_type,
    grant_row.table_schema::text as schema_name,
    grant_row.table_name::text as object_name,
    (
      'grantee=' || grant_row.grantee
      || ';privilege=' || grant_row.privilege_type
      || ';grantable=' || grant_row.is_grantable
    )::text as detail,
    null::bigint as approximate_count
  from information_schema.role_table_grants as grant_row
  where grant_row.table_schema = 'public'
    and grant_row.table_name in (
      'question_solutions',
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
),
adaptive_index_rows as (
  select
    'ADAPTIVE_INDEXES'::text as section,
    'INDEX'::text as object_type,
    namespace.nspname::text as schema_name,
    index_relation.relname::text as object_name,
    (
      'table=' || table_relation.relname
      || ';unique=' || index_metadata.indisunique::text
      || ';valid=' || index_metadata.indisvalid::text
    )::text as detail,
    null::bigint as approximate_count
  from pg_catalog.pg_index as index_metadata
  join pg_catalog.pg_class as index_relation
    on index_relation.oid = index_metadata.indexrelid
  join pg_catalog.pg_class as table_relation
    on table_relation.oid = index_metadata.indrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = table_relation.relnamespace
  where namespace.nspname = 'public'
    and table_relation.relname in (
      'adaptive_practice_releases',
      'adaptive_practice_attempts',
      'adaptive_practice_answers'
    )
)
select
  output.section,
  output.object_type,
  output.schema_name,
  output.object_name,
  output.detail,
  output.approximate_count
from (
  select * from session_row
  union all
  select * from migration_schema_rows
  union all
  select * from migration_table_rows
  union all
  select * from common_migration_relation_rows
  union all
  select * from expected_relation_rows
  union all
  select * from application_table_rows
  union all
  select * from application_column_rows
  union all
  select * from adaptive_function_rows
  union all
  select * from adaptive_policy_rows
  union all
  select * from adaptive_grant_rows
  union all
  select * from adaptive_index_rows
) as output
order by
  output.section,
  output.object_type,
  output.schema_name,
  output.object_name,
  output.detail;

rollback;
