-- PLAVE remote catalog classification for public.rls_auto_enable().
--
-- This diagnostic reads PostgreSQL catalogs only. It does not execute the
-- target function, inspect application rows, or return application data.

begin transaction read only;

with
target_functions as (
  select
    procedure.oid,
    procedure.proowner,
    procedure.prorettype,
    procedure.prolang,
    procedure.prosecdef,
    procedure.proconfig,
    procedure.proacl
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'rls_auto_enable'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid) = ''
),
target as (
  select *
  from target_functions
  order by oid
  limit 1
),
function_acl as (
  select
    case
      when expanded_acl.grantee = 0 then 'PUBLIC'
      else grantee_role.rolname
    end::text as grantee_name,
    expanded_acl.privilege_type::text as privilege_type,
    expanded_acl.is_grantable as is_grantable
  from target
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      target.proacl,
      pg_catalog.acldefault('f', target.proowner)
    )
  ) as expanded_acl
  left join pg_catalog.pg_roles as grantee_role
    on grantee_role.oid = expanded_acl.grantee
),
function_dependencies as (
  select
    dependency.deptype,
    dependency.refclassid,
    dependency.refobjid,
    dependency.refobjsubid,
    pg_catalog.pg_describe_object(
      dependency.refclassid,
      dependency.refobjid,
      dependency.refobjsubid
    )::text as referenced_object,
    extension.oid is not null as is_extension_dependency
  from target
  join pg_catalog.pg_depend as dependency
    on dependency.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
    and dependency.objid = target.oid
  left join pg_catalog.pg_extension as extension
    on dependency.refclassid =
      'pg_catalog.pg_extension'::pg_catalog.regclass
    and extension.oid = dependency.refobjid
),
referencing_event_triggers as (
  select
    event_trigger.evtname::text as trigger_name,
    event_trigger.evtenabled::text as enabled_state,
    event_trigger.evtevent::text as event_name,
    coalesce(
      pg_catalog.array_to_string(event_trigger.evttags, ','),
      ''
    )::text as event_tags
  from target
  join pg_catalog.pg_event_trigger as event_trigger
    on event_trigger.evtfoid = target.oid
)
select
  'RLS_AUTO_ENABLE_CLASSIFICATION'::text as section,
  (select count(*) from target_functions)::bigint as matching_function_count,
  exists(select 1 from target) as function_exists,
  (
    select owner_role.rolname
    from target
    join pg_catalog.pg_roles as owner_role
      on owner_role.oid = target.proowner
  )::text as owner_name,
  (
    select pg_catalog.format_type(target.prorettype, null)
    from target
  )::text as return_type,
  (
    select language.lanname
    from target
    join pg_catalog.pg_language as language
      on language.oid = target.prolang
  )::text as language_name,
  (select target.prosecdef from target) as security_definer,
  (
    select pg_catalog.array_to_string(target.proconfig, ',')
    from target
  )::text as function_config,
  (
    select case
      when target.proconfig @> array['search_path=pg_catalog']::text[]
        then 'pg_catalog'
      else null
    end
    from target
  )::text as effective_declared_search_path,
  (
    select pg_catalog.md5(pg_catalog.pg_get_functiondef(target.oid))
    from target
  )::text as definition_fingerprint_md5,
  (
    select pg_catalog.md5(
      pg_catalog.regexp_replace(
        pg_catalog.lower(pg_catalog.pg_get_functiondef(target.oid)),
        '\s+',
        ' ',
        'g'
      )
    )
    from target
  )::text as normalized_definition_fingerprint_md5,
  (
    select coalesce(
      pg_catalog.string_agg(
        function_acl.grantee_name
        || ':' || function_acl.privilege_type
        || ':grantable=' || function_acl.is_grantable::text,
        ';' order by
          function_acl.grantee_name,
          function_acl.privilege_type
      ),
      'NONE'
    )
    from function_acl
  )::text as execute_acl,
  (
    select count(*)
    from function_dependencies
  )::bigint as dependency_count,
  (
    select count(*)
    from function_dependencies
    where function_dependencies.is_extension_dependency
      or function_dependencies.deptype = 'e'
  )::bigint as extension_dependency_count,
  (
    select coalesce(
      pg_catalog.string_agg(
        function_dependencies.deptype::text
        || ':' || function_dependencies.referenced_object,
        ';' order by
          function_dependencies.deptype,
          function_dependencies.referenced_object
      ),
      'NONE'
    )
    from function_dependencies
  )::text as dependency_summary,
  (
    select count(*)
    from referencing_event_triggers
  )::bigint as event_trigger_count,
  (
    select count(*)
    from referencing_event_triggers
    where referencing_event_triggers.enabled_state <> 'D'
  )::bigint as active_event_trigger_count,
  (
    select coalesce(
      pg_catalog.string_agg(
        referencing_event_triggers.trigger_name
        || ':enabled=' || referencing_event_triggers.enabled_state
        || ':event=' || referencing_event_triggers.event_name
        || ':tags=' || referencing_event_triggers.event_tags,
        ';' order by referencing_event_triggers.trigger_name
      ),
      'NONE'
    )
    from referencing_event_triggers
  )::text as event_trigger_summary;

rollback;
