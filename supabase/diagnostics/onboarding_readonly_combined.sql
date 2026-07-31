-- READ-ONLY combined diagnostic for the live onboarding function.
-- One top-level SELECT returns eight rows. No result contains profile PII.

with
function_overload_rows as (
  select
    p.oid::regprocedure::text as overload,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_function_arguments(p.oid) as arguments_with_defaults,
    p.pronargs as input_argument_count,
    p.pronargdefaults as default_argument_count,
    p.proargnames as argument_names,
    (
      p.proargnames =
      array['p_full_name', 'p_grade', 'p_birth_date']::text[]
    ) as matches_application_rpc_keys,
    pg_get_userbyid(p.proowner) as function_owner,
    p.prosecdef as is_security_definer,
    p.proconfig as function_settings,
    p.proacl::text as function_acl,
    has_function_privilege('authenticated', p.oid, 'EXECUTE')
      as authenticated_can_execute,
    has_function_privilege('anon', p.oid, 'EXECUTE')
      as anon_can_execute,
    count(*) over () as overload_count
  from pg_proc as p
  join pg_namespace as n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'complete_onboarding'
),
section_1 as (
  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.overload),
    '[]'::jsonb
  ) as result_json
  from function_overload_rows as r
),
function_fingerprint_rows as (
  select
    p.oid::regprocedure::text as overload,
    md5(pg_get_functiondef(p.oid)) as definition_md5,
    md5(p.prosrc) as body_md5,
    position('pg_advisory_xact_lock' in p.prosrc) > 0
      as uses_advisory_transaction_lock,
    position('hashtextextended' in p.prosrc) > 0
      as uses_per_user_lock_key,
    p.prosrc ~* 'for[[:space:]]+update[[:space:]]*;'
      as contains_executable_for_update,
    (
      position('pg_advisory_xact_lock' in p.prosrc) > 0
      and not (
        p.prosrc ~* 'for[[:space:]]+update[[:space:]]*;'
      )
    ) as matches_0002_locking_shape
  from pg_proc as p
  join pg_namespace as n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'complete_onboarding'
),
section_2 as (
  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.overload),
    '[]'::jsonb
  ) as result_json
  from function_fingerprint_rows as r
),
profiles_table_rows as (
  select
    c.oid::regclass::text as table_name,
    pg_get_userbyid(c.relowner) as table_owner,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    c.relacl::text as table_acl
  from pg_class as c
  join pg_namespace as n
    on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles'
    and c.relkind in ('r', 'p')
),
section_3 as (
  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.table_name),
    '[]'::jsonb
  ) as result_json
  from profiles_table_rows as r
),
profiles_policy_rows as (
  select
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles'
),
section_4 as (
  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.policyname),
    '[]'::jsonb
  ) as result_json
  from profiles_policy_rows as r
),
profiles_grant_rows as (
  select
    grantee,
    privilege_type,
    is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'profiles'
    and grantee in ('anon', 'authenticated')
),
section_5 as (
  select coalesce(
    jsonb_agg(
      to_jsonb(r)
      order by r.grantee, r.privilege_type
    ),
    '[]'::jsonb
  ) as result_json
  from profiles_grant_rows as r
),
profile_aggregate_rows as (
  select
    role,
    onboarding_completed,
    count(*)::bigint as profile_count
  from public.profiles
  group by role, onboarding_completed
),
section_6 as (
  select coalesce(
    jsonb_agg(
      to_jsonb(r)
      order by r.role, r.onboarding_completed
    ),
    '[]'::jsonb
  ) as result_json
  from profile_aggregate_rows as r
),
section_7 as (
  select jsonb_build_array(
    jsonb_build_object(
      'profiles_total',
      (select count(*)::bigint from public.profiles),
      'student_profiles_total',
      (select count(*)::bigint from public.student_profiles),
      'learning_goals_total',
      (select count(*)::bigint from public.learning_goals)
    )
  ) as result_json
),
section_8 as (
  select jsonb_build_array(
    jsonb_build_object(
      'profiles_total',
      count(*)::bigint,
      'profiles_with_matching_auth_user',
      count(u.id)::bigint,
      'profiles_without_matching_auth_user',
      count(*) filter (where u.id is null)::bigint,
      'profiles_with_matching_auth_role',
      count(*) filter (
        where u.id is not null
          and upper(coalesce(u.raw_user_meta_data ->> 'role', '')) = p.role
      )::bigint,
      'profiles_with_mismatched_auth_role',
      count(*) filter (
        where u.id is not null
          and upper(coalesce(u.raw_user_meta_data ->> 'role', '')) <> p.role
      )::bigint
    )
  ) as result_json
  from public.profiles as p
  left join auth.users as u
    on u.id = p.user_id
),
combined_sections as (
  select
    1 as section_number,
    'function_overloads'::text as section_name,
    result_json
  from section_1

  union all

  select
    2,
    'function_definition_fingerprint',
    result_json
  from section_2

  union all

  select
    3,
    'profiles_table_owner_and_rls',
    result_json
  from section_3

  union all

  select
    4,
    'profiles_policies',
    result_json
  from section_4

  union all

  select
    5,
    'profiles_api_role_grants',
    result_json
  from section_5

  union all

  select
    6,
    'profiles_role_onboarding_aggregate',
    result_json
  from section_6

  union all

  select
    7,
    'private_table_totals',
    result_json
  from section_7

  union all

  select
    8,
    'profile_auth_referential_aggregate',
    result_json
  from section_8
)
select
  section_number,
  section_name,
  result_json
from combined_sections
order by section_number;
