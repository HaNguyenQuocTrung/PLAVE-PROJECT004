-- READ-ONLY diagnostic for the live onboarding function.
-- Every statement is SELECT-only and returns no user identifiers or profile PII.

-- 1. All public.complete_onboarding overloads and PostgREST argument identity.
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
order by p.oid::regprocedure::text;

-- 2. Safe live-definition fingerprint and markers distinguishing 0001 vs 0002.
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
order by p.oid::regprocedure::text;

-- 3. Owner and RLS state of public.profiles.
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
  and c.relkind in ('r', 'p');

-- 4. Every live RLS policy on public.profiles.
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
order by policyname;

-- 5. Effective table grants relevant to the API roles.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 6. PII-free profile aggregate. No UUID, email, name, or date is returned.
select
  role,
  onboarding_completed,
  count(*)::bigint as profile_count
from public.profiles
group by role, onboarding_completed
order by role, onboarding_completed;

-- 7. PII-free totals to detect partial onboarding writes.
select
  (select count(*)::bigint from public.profiles) as profiles_total,
  (select count(*)::bigint from public.student_profiles)
    as student_profiles_total,
  (select count(*)::bigint from public.learning_goals)
    as learning_goals_total;

-- 8. PII-free referential summary proving whether profile IDs match auth users.
select
  count(*)::bigint as profiles_total,
  count(u.id)::bigint as profiles_with_matching_auth_user,
  count(*) filter (where u.id is null)::bigint
    as profiles_without_matching_auth_user,
  count(*) filter (
    where u.id is not null
      and upper(coalesce(u.raw_user_meta_data ->> 'role', '')) = p.role
  )::bigint as profiles_with_matching_auth_role,
  count(*) filter (
    where u.id is not null
      and upper(coalesce(u.raw_user_meta_data ->> 'role', '')) <> p.role
  )::bigint as profiles_with_mismatched_auth_role
from public.profiles as p
left join auth.users as u
  on u.id = p.user_id;
