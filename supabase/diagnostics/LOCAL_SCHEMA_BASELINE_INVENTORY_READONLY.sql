-- Compare only verified local disposable databases.
-- The result contains object identities and definition hashes, never row data.

begin transaction read only;

select section, object_identity, definition_hash
from (
  select
    'SCHEMA'::text as section,
    namespace.nspname::text as object_identity,
    md5(
      concat_ws(
        '|',
        namespace.nspowner::regrole::text,
        coalesce(
          (
            select string_agg(
              concat_ws(
                ':',
                acl.grantee::regrole::text,
                acl.privilege_type,
                acl.is_grantable::text
              ),
              ',' order by
                acl.grantee::regrole::text,
                acl.privilege_type,
                acl.is_grantable
            )
            from pg_catalog.aclexplode(namespace.nspacl) as acl
            where acl.grantee <> namespace.nspowner
          ),
          ''
        )
      )
    ) as definition_hash
  from pg_catalog.pg_namespace as namespace
  where namespace.nspname in ('public', 'private')

  union all

  select
    'RELATION',
    concat_ws('.', namespace.nspname, relation.relname),
    md5(
      concat_ws(
        '|',
        relation.relkind::text,
        relation.relowner::regrole::text,
        relation.relrowsecurity::text,
        relation.relforcerowsecurity::text,
        coalesce(relation.relacl::text, '')
      )
    )
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    namespace.nspname in ('public', 'private')
    and relation.relkind in ('r', 'p', 'v', 'm', 'S')

  union all

  select
    'COLUMN',
    concat_ws(
      '.',
      namespace.nspname,
      relation.relname,
      attribute.attnum::text,
      attribute.attname
    ),
    md5(
      concat_ws(
        '|',
        pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
        attribute.attnotnull::text,
        attribute.attidentity::text,
        attribute.attgenerated::text,
        coalesce(
          pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid),
          ''
        )
      )
    )
  from pg_catalog.pg_attribute as attribute
  join pg_catalog.pg_class as relation
    on relation.oid = attribute.attrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  left join pg_catalog.pg_attrdef as default_value
    on
      default_value.adrelid = attribute.attrelid
      and default_value.adnum = attribute.attnum
  where
    namespace.nspname in ('public', 'private')
    and relation.relkind in ('r', 'p', 'v', 'm')
    and attribute.attnum > 0
    and not attribute.attisdropped

  union all

  select
    'CONSTRAINT',
    concat_ws(
      '.',
      namespace.nspname,
      relation.relname,
      constraint_record.conname
    ),
    md5(
      concat_ws(
        '|',
        constraint_record.contype::text,
        constraint_record.condeferrable::text,
        constraint_record.condeferred::text,
        constraint_record.convalidated::text,
        pg_catalog.pg_get_constraintdef(constraint_record.oid, true)
      )
    )
  from pg_catalog.pg_constraint as constraint_record
  join pg_catalog.pg_class as relation
    on relation.oid = constraint_record.conrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'private')

  union all

  select
    'INDEX',
    concat_ws('.', namespace.nspname, index_relation.relname),
    md5(
      concat_ws(
        '|',
        index_record.indisunique::text,
        index_record.indisprimary::text,
        index_record.indisvalid::text,
        pg_catalog.pg_get_indexdef(index_record.indexrelid)
      )
    )
  from pg_catalog.pg_index as index_record
  join pg_catalog.pg_class as index_relation
    on index_relation.oid = index_record.indexrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = index_relation.relnamespace
  where namespace.nspname in ('public', 'private')

  union all

  select
    'FUNCTION',
    concat_ws(
      '.',
      namespace.nspname,
      function_record.proname,
      pg_catalog.pg_get_function_identity_arguments(function_record.oid)
    ),
    md5(
      concat_ws(
        '|',
        function_record.prokind::text,
        function_record.prosecdef::text,
        function_record.provolatile::text,
        function_record.proowner::regrole::text,
        coalesce(function_record.proconfig::text, ''),
        coalesce(function_record.proacl::text, ''),
        pg_catalog.pg_get_functiondef(function_record.oid)
      )
    )
  from pg_catalog.pg_proc as function_record
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = function_record.pronamespace
  where namespace.nspname in ('public', 'private')

  union all

  select
    'POLICY',
    concat_ws('.', namespace.nspname, relation.relname, policy.polname),
    md5(
      concat_ws(
        '|',
        policy.polcmd::text,
        policy.polpermissive::text,
        policy.polroles::text,
        coalesce(pg_catalog.pg_get_expr(policy.polqual, policy.polrelid), ''),
        coalesce(
          pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid),
          ''
        )
      )
    )
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'private')

  union all

  select
    'TRIGGER',
    concat_ws('.', namespace.nspname, relation.relname, trigger_record.tgname),
    md5(pg_catalog.pg_get_triggerdef(trigger_record.oid, true))
  from pg_catalog.pg_trigger as trigger_record
  join pg_catalog.pg_class as relation
    on relation.oid = trigger_record.tgrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where
    not trigger_record.tgisinternal
    and (
      namespace.nspname in ('public', 'private')
      or (
        namespace.nspname = 'auth'
        and relation.relname = 'users'
      )
    )

  union all

  select
    'TYPE',
    concat_ws('.', namespace.nspname, type_record.typname),
    md5(
      concat_ws(
        '|',
        type_record.typtype::text,
        type_record.typcategory::text,
        coalesce(
          (
            select string_agg(
              enum_record.enumlabel,
              ',' order by enum_record.enumsortorder
            )
            from pg_catalog.pg_enum as enum_record
            where enum_record.enumtypid = type_record.oid
          ),
          ''
        )
      )
    )
  from pg_catalog.pg_type as type_record
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = type_record.typnamespace
  where
    namespace.nspname in ('public', 'private')
    and type_record.typtype in ('e', 'd')

  union all

  select
    'DEFAULT_ACL',
    concat_ws(
      '.',
      default_acl.defaclrole::regrole::text,
      namespace.nspname,
      default_acl.defaclobjtype::text
    ),
    md5(coalesce(default_acl.defaclacl::text, ''))
  from pg_catalog.pg_default_acl as default_acl
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = default_acl.defaclnamespace
  where
    namespace.nspname in ('public', 'private')
    and default_acl.defaclrole::regrole::text = 'postgres'
) as inventory
order by section, object_identity;

rollback;
