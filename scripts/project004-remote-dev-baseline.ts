import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { MigrationPlan } from "./project004-remote-dev-guard.ts";

type QualifiedObject = {
  schema: "public" | "private";
  name: string;
};

export type Project004PrefixObject = {
  category: "RELATION" | "ROUTINE" | "POLICY" | "TRIGGER";
  schema: "auth" | "public" | "private";
  relation: string;
  name: string;
};

export type Project004RemoteObjectInventory = {
  relations: QualifiedObject[];
  routines: QualifiedObject[];
  triggers: string[];
};

const platformSchemaNames = [
  "_analytics",
  "_realtime",
  "analytics",
  "auth",
  "cron",
  "extensions",
  "graphql",
  "graphql_public",
  "net",
  "pgbouncer",
  "pgmq",
  "pgmq_public",
  "pgsodium",
  "pgsodium_masks",
  "pooler",
  "realtime",
  "storage",
  "supabase_functions",
  "supabase_migrations",
  "supabase_vault",
  "vault",
] as const;

function collectQualifiedObjects(
  source: string,
  pattern: RegExp,
) {
  const objects = new Map<string, QualifiedObject>();
  for (const match of source.matchAll(pattern)) {
    const schema = match[1];
    const name = match[2];
    if (
      (schema === "public" || schema === "private") &&
      name &&
      /^[a-z][a-z0-9_]*$/u.test(name)
    ) {
      objects.set(`${schema}.${name}`, { schema, name });
    }
  }
  return objects;
}

export function buildProject004RemoteObjectInventory(
  root: string,
  plan: MigrationPlan,
): Project004RemoteObjectInventory {
  const source = plan.migrations
    .map((entry) =>
      readFileSync(
        join(root, "supabase/migrations", entry.file),
        "utf8",
      ),
    )
    .join("\n");
  const relations = collectQualifiedObjects(
    source,
    /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(public|private)[.]([a-z][a-z0-9_]*)/giu,
  );
  const routines = collectQualifiedObjects(
    source,
    /\bcreate\s+(?:or\s+replace\s+)?function\s+(public|private)[.]([a-z][a-z0-9_]*)/giu,
  );
  const triggers = new Set<string>();
  for (const match of source.matchAll(
    /\bcreate\s+(?:or\s+replace\s+)?trigger\s+([a-z][a-z0-9_]*)/giu,
  )) {
    const name = match[1];
    if (name) triggers.add(name);
  }
  return {
    relations: [...relations.values()].sort((left, right) =>
      `${left.schema}.${left.name}`.localeCompare(
        `${right.schema}.${right.name}`,
      ),
    ),
    routines: [...routines.values()].sort((left, right) =>
      `${left.schema}.${left.name}`.localeCompare(
        `${right.schema}.${right.name}`,
      ),
    ),
    triggers: [...triggers].sort(),
  };
}

export function buildProject004PrefixObjectInventory(
  root: string,
  plan: MigrationPlan,
  migrationCount: number,
) {
  if (
    !Number.isInteger(migrationCount) ||
    migrationCount < 0 ||
    migrationCount > plan.migrations.length
  ) {
    throw new Error("REMOTE_PREFIX_INVENTORY_INVALID");
  }
  const source = plan.migrations
    .slice(0, migrationCount)
    .map((entry) =>
      readFileSync(
        join(root, "supabase/migrations", entry.file),
        "utf8",
      ),
    )
    .join("\n");
  const objects = new Map<string, Project004PrefixObject>();
  for (const relation of collectQualifiedObjects(
    source,
    /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(public|private)[.]([a-z][a-z0-9_]*)/giu,
  ).values()) {
    const object: Project004PrefixObject = {
      category: "RELATION",
      schema: relation.schema,
      relation: relation.name,
      name: relation.name,
    };
    objects.set(
      `${object.category}|${object.schema}|${object.relation}|${object.name}`,
      object,
    );
  }
  for (const routine of collectQualifiedObjects(
    source,
    /\bcreate\s+(?:or\s+replace\s+)?function\s+(public|private)[.]([a-z][a-z0-9_]*)/giu,
  ).values()) {
    const object: Project004PrefixObject = {
      category: "ROUTINE",
      schema: routine.schema,
      relation: "",
      name: routine.name,
    };
    objects.set(
      `${object.category}|${object.schema}|${object.relation}|${object.name}`,
      object,
    );
  }
  for (const match of source.matchAll(
    /\bcreate\s+policy\s+([a-z][a-z0-9_]*)\s+on\s+(public|private)[.]([a-z][a-z0-9_]*)/giu,
  )) {
    const name = match[1];
    const schema = match[2];
    const relation = match[3];
    if (
      name &&
      relation &&
      (schema === "public" || schema === "private")
    ) {
      const object: Project004PrefixObject = {
        category: "POLICY",
        schema,
        relation,
        name,
      };
      objects.set(
        `${object.category}|${object.schema}|${object.relation}|${object.name}`,
        object,
      );
    }
  }
  for (const match of source.matchAll(
    /\bcreate\s+(?:or\s+replace\s+)?trigger\s+([a-z][a-z0-9_]*)[\s\S]*?\bon\s+(auth|public|private)[.]([a-z][a-z0-9_]*)/giu,
  )) {
    const name = match[1];
    const schema = match[2];
    const relation = match[3];
    if (
      name &&
      relation &&
      (schema === "auth" ||
        schema === "public" ||
        schema === "private")
    ) {
      const object: Project004PrefixObject = {
        category: "TRIGGER",
        schema,
        relation,
        name,
      };
      objects.set(
        `${object.category}|${object.schema}|${object.relation}|${object.name}`,
        object,
      );
    }
  }
  return [...objects.values()].sort((left, right) =>
    `${left.category}|${left.schema}|${left.relation}|${left.name}`.localeCompare(
      `${right.category}|${right.schema}|${right.relation}|${right.name}`,
    ),
  );
}

function quotedSqlValue(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/u.test(value)) {
    throw new Error("REMOTE_BASELINE_INVENTORY_INVALID");
  }
  return `'${value}'`;
}

function qualifiedValues(objects: QualifiedObject[]) {
  return objects
    .map(
      (object) =>
        `(${quotedSqlValue(object.schema)}, ${quotedSqlValue(object.name)})`,
    )
    .join(",\n    ");
}

function scalarValues(values: readonly string[]) {
  return values.map((value) => `(${quotedSqlValue(value)})`).join(",\n    ");
}

export function buildProject004RemoteBaselineClassificationSql(
  root: string,
  plan: MigrationPlan,
) {
  const inventory = buildProject004RemoteObjectInventory(root, plan);
  if (
    inventory.relations.length === 0 ||
    inventory.routines.length === 0 ||
    inventory.triggers.length === 0
  ) {
    throw new Error("REMOTE_BASELINE_INVENTORY_EMPTY");
  }

  return String.raw`
begin read only;
set local statement_timeout = '15s';
with
platform_schema_names(name) as (
  values
    ${scalarValues(platformSchemaNames)}
),
plave_relations(schema_name, object_name) as (
  values
    ${qualifiedValues(inventory.relations)}
),
plave_routines(schema_name, object_name) as (
  values
    ${qualifiedValues(inventory.routines)}
),
plave_triggers(object_name) as (
  values
    ${scalarValues(inventory.triggers)}
),
extension_schema_oids(oid) as (
  select extension.extnamespace
  from pg_catalog.pg_extension as extension
),
platform_schema_oids(oid) as (
  select namespace.oid
  from pg_catalog.pg_namespace as namespace
  where namespace.nspname not in ('public', 'private')
    and (
      namespace.nspname ~ '^pg_'
      or namespace.nspname = 'information_schema'
      or namespace.nspname in (
        select name from platform_schema_names
      )
      or namespace.oid in (
        select oid from extension_schema_oids
      )
    )
),
schema_objects as (
  select
    0::integer as plave_count,
    count(*) filter (
      where namespace.nspname in ('public', 'private')
        or namespace.oid in (select oid from platform_schema_oids)
    )::integer as platform_count,
    count(*) filter (
      where namespace.nspname not in ('public', 'private')
        and namespace.oid not in (
          select oid from platform_schema_oids
        )
    )::integer as foreign_count
  from pg_catalog.pg_namespace as namespace
),
relation_objects as (
  select
    count(*) filter (
      where (namespace.nspname, relation.relname) in (
        select schema_name, object_name from plave_relations
      )
    )::integer as plave_count,
    count(*) filter (
      where (namespace.nspname, relation.relname) not in (
        select schema_name, object_name from plave_relations
      )
        and (
          namespace.oid in (select oid from platform_schema_oids)
          or exists (
            select 1
            from pg_catalog.pg_depend as dependency
            where dependency.classid = 'pg_class'::regclass
              and dependency.objid = relation.oid
              and dependency.deptype = 'e'
          )
        )
    )::integer as platform_count,
    count(*) filter (
      where (namespace.nspname, relation.relname) not in (
        select schema_name, object_name from plave_relations
      )
        and namespace.oid not in (
          select oid from platform_schema_oids
        )
        and not exists (
          select 1
          from pg_catalog.pg_depend as dependency
          where dependency.classid = 'pg_class'::regclass
            and dependency.objid = relation.oid
            and dependency.deptype = 'e'
        )
    )::integer as foreign_count
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where relation.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
),
automatic_rls_routine_oids(oid) as (
  select procedure.oid
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = procedure.proowner
  join pg_catalog.pg_language as language
    on language.oid = procedure.prolang
  where namespace.nspname = 'public'
    and procedure.proname = 'rls_auto_enable'
    and pg_catalog.pg_get_function_identity_arguments(
      procedure.oid
    ) = ''
    and pg_catalog.format_type(
      procedure.prorettype,
      null
    ) = 'event_trigger'
    and language.lanname = 'plpgsql'
    and procedure.prosecdef
    and procedure.proconfig @>
      array['search_path=pg_catalog']::text[]
    and (
      owner_role.rolsuper
      or owner_role.rolname in ('postgres', 'supabase_admin')
    )
    and not exists (
      select 1
      from pg_catalog.pg_depend as dependency
      left join pg_catalog.pg_extension as extension
        on dependency.refclassid = 'pg_extension'::regclass
        and extension.oid = dependency.refobjid
      where dependency.classid = 'pg_proc'::regclass
        and dependency.objid = procedure.oid
        and (
          dependency.deptype = 'e'
          or extension.oid is not null
        )
    )
    and (
      select count(*)
      from pg_catalog.pg_event_trigger as event_trigger
      where event_trigger.evtfoid = procedure.oid
        and event_trigger.evtenabled <> 'D'
        and event_trigger.evtevent = 'ddl_command_end'
        and event_trigger.evttags @> array[
          'CREATE TABLE',
          'CREATE TABLE AS',
          'SELECT INTO'
        ]::text[]
    ) = 1
),
routine_objects as (
  select
    count(*) filter (
      where (namespace.nspname, procedure.proname) in (
        select schema_name, object_name from plave_routines
      )
    )::integer as plave_count,
    count(*) filter (
      where (namespace.nspname, procedure.proname) not in (
        select schema_name, object_name from plave_routines
      )
        and (
          namespace.oid in (select oid from platform_schema_oids)
          or procedure.oid in (
            select oid from automatic_rls_routine_oids
          )
          or exists (
            select 1
            from pg_catalog.pg_depend as dependency
            where dependency.classid = 'pg_proc'::regclass
              and dependency.objid = procedure.oid
              and dependency.deptype = 'e'
          )
        )
    )::integer as platform_count,
    count(*) filter (
      where (namespace.nspname, procedure.proname) not in (
        select schema_name, object_name from plave_routines
      )
        and namespace.oid not in (
          select oid from platform_schema_oids
        )
        and procedure.oid not in (
          select oid from automatic_rls_routine_oids
        )
        and not exists (
          select 1
          from pg_catalog.pg_depend as dependency
          where dependency.classid = 'pg_proc'::regclass
            and dependency.objid = procedure.oid
            and dependency.deptype = 'e'
        )
    )::integer as foreign_count
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
),
policy_objects as (
  select
    count(*) filter (
      where (namespace.nspname, relation.relname) in (
        select schema_name, object_name from plave_relations
      )
    )::integer as plave_count,
    count(*) filter (
      where (namespace.nspname, relation.relname) not in (
        select schema_name, object_name from plave_relations
      )
        and namespace.oid in (
          select oid from platform_schema_oids
        )
    )::integer as platform_count,
    count(*) filter (
      where (namespace.nspname, relation.relname) not in (
        select schema_name, object_name from plave_relations
      )
        and namespace.oid not in (
          select oid from platform_schema_oids
        )
    )::integer as foreign_count
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
),
trigger_objects as (
  select
    count(*) filter (
      where trigger.tgname in (
        select object_name from plave_triggers
      )
        or (namespace.nspname, relation.relname) in (
          select schema_name, object_name from plave_relations
        )
    )::integer as plave_count,
    count(*) filter (
      where trigger.tgname not in (
        select object_name from plave_triggers
      )
        and (namespace.nspname, relation.relname) not in (
          select schema_name, object_name from plave_relations
        )
        and namespace.oid in (
          select oid from platform_schema_oids
        )
    )::integer as platform_count,
    count(*) filter (
      where trigger.tgname not in (
        select object_name from plave_triggers
      )
        and (namespace.nspname, relation.relname) not in (
          select schema_name, object_name from plave_relations
        )
        and namespace.oid not in (
          select oid from platform_schema_oids
        )
    )::integer as foreign_count
  from pg_catalog.pg_trigger as trigger
  join pg_catalog.pg_class as relation
    on relation.oid = trigger.tgrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where not trigger.tgisinternal
),
extension_objects as (
  select
    0::integer as plave_count,
    count(*)::integer as platform_count,
    0::integer as foreign_count
  from pg_catalog.pg_extension
),
classified_objects as (
  select * from schema_objects
  union all select * from relation_objects
  union all select * from routine_objects
  union all select * from policy_objects
  union all select * from trigger_objects
  union all select * from extension_objects
),
object_totals as (
  select
    sum(platform_count)::integer as platform_count,
    sum(plave_count)::integer as plave_count,
    sum(foreign_count)::integer as foreign_count
  from classified_objects
),
auth_users as (
  select count(*)::integer as value from auth.users
),
storage_objects as (
  select (
    (select count(*) from storage.buckets)
    + (select count(*) from storage.objects)
  )::integer as value
)
select concat_ws(
  '|',
  object_totals.platform_count,
  object_totals.plave_count,
  object_totals.foreign_count,
  auth_users.value,
  storage_objects.value,
  case
    when pg_catalog.to_regclass(
      'supabase_migrations.schema_migrations'
    ) is null then 0
    else 1
  end
)
from object_totals, auth_users, storage_objects;
commit;
`;
}

export function buildProject004ForeignObjectInspectionSql(
  root: string,
  plan: MigrationPlan,
) {
  const inventory = buildProject004RemoteObjectInventory(root, plan);
  return String.raw`
begin read only;
set local statement_timeout = '15s';
with
platform_schema_names(name) as (
  values
    ${scalarValues(platformSchemaNames)}
),
plave_relations(schema_name, object_name) as (
  values
    ${qualifiedValues(inventory.relations)}
),
plave_routines(schema_name, object_name) as (
  values
    ${qualifiedValues(inventory.routines)}
),
plave_triggers(object_name) as (
  values
    ${scalarValues(inventory.triggers)}
),
extension_schema_oids(oid) as (
  select extension.extnamespace
  from pg_catalog.pg_extension as extension
),
platform_schema_oids(oid) as (
  select namespace.oid
  from pg_catalog.pg_namespace as namespace
  where namespace.nspname not in ('public', 'private')
    and (
      namespace.nspname ~ '^pg_'
      or namespace.nspname = 'information_schema'
      or namespace.nspname in (
        select name from platform_schema_names
      )
      or namespace.oid in (
        select oid from extension_schema_oids
      )
    )
),
foreign_objects as (
  select
    'SCHEMA'::text as object_category,
    namespace.nspname::text as schema_name,
    namespace.nspname::text as object_name,
    namespace.nspowner as owner_oid,
    'pg_namespace'::regclass as class_oid,
    namespace.oid as object_oid
  from pg_catalog.pg_namespace as namespace
  where namespace.nspname not in ('public', 'private')
    and namespace.oid not in (
      select oid from platform_schema_oids
    )

  union all

  select
    'RELATION',
    namespace.nspname,
    relation.relname,
    relation.relowner,
    'pg_class'::regclass,
    relation.oid
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where relation.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
    and (namespace.nspname, relation.relname) not in (
      select schema_name, object_name from plave_relations
    )
    and namespace.oid not in (
      select oid from platform_schema_oids
    )
    and not exists (
      select 1
      from pg_catalog.pg_depend as dependency
      where dependency.classid = 'pg_class'::regclass
        and dependency.objid = relation.oid
        and dependency.deptype = 'e'
    )

  union all

  select
    'ROUTINE',
    namespace.nspname,
    procedure.proname,
    procedure.proowner,
    'pg_proc'::regclass,
    procedure.oid
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where (namespace.nspname, procedure.proname) not in (
      select schema_name, object_name from plave_routines
    )
    and namespace.oid not in (
      select oid from platform_schema_oids
    )
    and not exists (
      select 1
      from pg_catalog.pg_depend as dependency
      where dependency.classid = 'pg_proc'::regclass
        and dependency.objid = procedure.oid
        and dependency.deptype = 'e'
    )

  union all

  select
    'POLICY',
    namespace.nspname,
    policy.polname,
    relation.relowner,
    'pg_policy'::regclass,
    policy.oid
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where (namespace.nspname, relation.relname) not in (
      select schema_name, object_name from plave_relations
    )
    and namespace.oid not in (
      select oid from platform_schema_oids
    )

  union all

  select
    'TRIGGER',
    namespace.nspname,
    trigger.tgname,
    relation.relowner,
    'pg_trigger'::regclass,
    trigger.oid
  from pg_catalog.pg_trigger as trigger
  join pg_catalog.pg_class as relation
    on relation.oid = trigger.tgrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where not trigger.tgisinternal
    and trigger.tgname not in (
      select object_name from plave_triggers
    )
    and (namespace.nspname, relation.relname) not in (
      select schema_name, object_name from plave_relations
    )
    and namespace.oid not in (
      select oid from platform_schema_oids
    )
),
target as (
  select *
  from foreign_objects
  order by object_category, schema_name, object_name, object_oid
  limit 1
),
target_owner as (
  select
    case
      when owner_role.rolsuper
        or owner_role.rolname in ('postgres', 'supabase_admin')
        then 'PLATFORM_SUPERUSER'
      when owner_role.rolname like 'supabase_%'
        or owner_role.rolname like 'pg_%'
        then 'PLATFORM_SERVICE_ROLE'
      else 'APPLICATION_OR_UNKNOWN_OWNER'
    end::text as owner_category
  from target
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = target.owner_oid
),
target_dependencies as (
  select
    count(*) filter (
      where dependency.deptype = 'e'
        or extension.oid is not null
    )::integer as extension_dependency_count
  from target
  left join pg_catalog.pg_depend as dependency
    on dependency.classid = target.class_oid
    and dependency.objid = target.object_oid
  left join pg_catalog.pg_extension as extension
    on dependency.refclassid = 'pg_extension'::regclass
    and extension.oid = dependency.refobjid
),
routine_shape as (
  select
    procedure.oid,
    pg_catalog.format_type(procedure.prorettype, null)::text
      as return_type,
    language.lanname::text as language_name,
    procedure.prosecdef as security_definer,
    procedure.proconfig,
    (
      select count(*)::integer
      from pg_catalog.pg_event_trigger as event_trigger
      where event_trigger.evtfoid = procedure.oid
        and event_trigger.evtenabled <> 'D'
        and event_trigger.evtevent = 'ddl_command_end'
        and event_trigger.evttags @> array[
          'CREATE TABLE',
          'CREATE TABLE AS',
          'SELECT INTO'
        ]::text[]
    ) as matching_active_event_triggers
  from target
  join pg_catalog.pg_proc as procedure
    on target.object_category = 'ROUTINE'
    and procedure.oid = target.object_oid
  join pg_catalog.pg_language as language
    on language.oid = procedure.prolang
),
classification as (
  select
    (select count(*) from foreign_objects)::integer
      as foreign_object_count,
    target.object_category,
    case
      when target.schema_name = 'public'
        then 'PUBLIC_APPLICATION_SURFACE'
      when target.schema_name = 'private'
        then 'PRIVATE_APPLICATION_SURFACE'
      else 'FOREIGN_SCHEMA'
    end::text as schema_category,
    coalesce(
      (select owner_category from target_owner),
      'UNKNOWN_OWNER'
    )::text as owner_category,
    coalesce(
      (
        select extension_dependency_count
        from target_dependencies
      ),
      0
    )::integer as extension_dependency_count,
    case
      when target.object_category = 'ROUTINE'
        and target.schema_name = 'public'
        and target.object_name = 'rls_auto_enable'
        and routine_shape.return_type = 'event_trigger'
        and routine_shape.language_name = 'plpgsql'
        and routine_shape.security_definer
        and routine_shape.proconfig @>
          array['search_path=pg_catalog']::text[]
        and routine_shape.matching_active_event_triggers = 1
        and (
          select owner_category from target_owner
        ) = 'PLATFORM_SUPERUSER'
        and (
          select extension_dependency_count
          from target_dependencies
        ) = 0
        then 'SUPABASE_AUTOMATIC_RLS'
      else 'UNCONFIRMED'
    end::text as platform_configuration_provenance,
    case
      when target.object_category = 'ROUTINE'
        and target.schema_name = 'public'
        and target.object_name = 'rls_auto_enable'
        then 'public.rls_auto_enable()'
      else 'HASH:' || md5(
        target.object_category || ':' ||
        target.schema_name || ':' ||
        target.object_name
      )
    end::text as safe_object_identifier,
    case
      when (
        target.schema_name,
        target.object_name
      ) in (
        select schema_name, object_name from plave_relations
        union
        select schema_name, object_name from plave_routines
      )
        or target.object_name in (
          select object_name from plave_triggers
        )
        then 'YES'
      else 'NO'
    end::text as plave_migration_conflict,
    coalesce(
      routine_shape.matching_active_event_triggers,
      0
    )::integer as matching_active_event_trigger_count
  from target
  left join routine_shape on true
)
select concat_ws(
  '|',
  'INSPECTION_V1',
  classification.foreign_object_count,
  classification.object_category,
  classification.schema_category,
  classification.owner_category,
  classification.extension_dependency_count,
  classification.platform_configuration_provenance,
  case
    when classification.platform_configuration_provenance =
      'SUPABASE_AUTOMATIC_RLS' then 'YES'
    else 'NO'
  end,
  case
    when classification.platform_configuration_provenance =
      'SUPABASE_AUTOMATIC_RLS'
      then 'NO_DIRECT_CATALOG_DEPENDENCY'
    else 'UNCONFIRMED'
  end,
  classification.safe_object_identifier,
  classification.plave_migration_conflict,
  classification.matching_active_event_trigger_count
)
from classification;
rollback;
`;
}
