import { createHash } from "node:crypto";

import {
  buildProject004PrefixObjectInventory,
} from "./project004-remote-dev-baseline.ts";
import {
  loadAndVerifyMigrationPlan,
  type MigrationPlan,
} from "./project004-remote-dev-guard.ts";

export const prefixSemanticFingerprintVersion =
  "PROJECT004_PREFIX_0038_SEMANTIC_V1";

export const prefixSemanticCategories = [
  "SCHEMA",
  "RELATION",
  "COLUMN",
  "CONSTRAINT",
  "INDEX",
  "FUNCTION",
  "TRIGGER",
  "POLICY",
  "SCHEMA_GRANT",
  "RELATION_GRANT",
  "FUNCTION_GRANT",
  "EXTENSION",
  "EXTENSION_DEPENDENCY",
] as const;

export type PrefixSemanticCategory =
  (typeof prefixSemanticCategories)[number];

export type PrefixSemanticCategoryFingerprint = {
  category: PrefixSemanticCategory;
  count: number;
  sha256: string;
};

export type PrefixSemanticFingerprint = {
  version: typeof prefixSemanticFingerprintVersion;
  categories: PrefixSemanticCategoryFingerprint[];
  overallSha256: string;
};

function sqlText(value: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(value)) {
    throw new Error("PREFIX_SEMANTIC_IDENTIFIER_INVALID");
  }
  return `'${value}'`;
}

function qualifiedValues(
  values: readonly { schema: string; name: string }[],
) {
  return values
    .map(
      (value) =>
        `(${sqlText(value.schema)}, ${sqlText(value.name)})`,
    )
    .join(",\n    ");
}

function normalizeSql(expression: string) {
  return `btrim(pg_catalog.regexp_replace(coalesce(${expression}, ''), '[[:space:]]+', ' ', 'g'))`;
}

export function buildCanonicalPrefixSourceFingerprint(
  plan: MigrationPlan,
  prefixCount = 38,
) {
  if (
    !Number.isInteger(prefixCount) ||
    prefixCount < 1 ||
    prefixCount > plan.migrations.length
  ) {
    throw new Error("PREFIX_SOURCE_FINGERPRINT_RANGE_INVALID");
  }
  const payload = [
    prefixSemanticFingerprintVersion,
    ...plan.migrations
      .slice(0, prefixCount)
      .map(
        (entry) =>
          `${entry.order}|${entry.version}|${entry.file}|${entry.sha256}`,
      ),
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function buildProject004PrefixSemanticFingerprintSql(
  candidateRoot = process.cwd(),
  prefixCount = 38,
  verifiedInventory?: {
    root: string;
    plan: MigrationPlan;
  },
) {
  const { root, plan } =
    verifiedInventory ??
    loadAndVerifyMigrationPlan(candidateRoot);
  const objects = buildProject004PrefixObjectInventory(
    root,
    plan,
    prefixCount,
  );
  const relationMap = new Map<
    string,
    { schema: string; name: string }
  >();
  const routineMap = new Map<
    string,
    { schema: string; name: string }
  >();
  for (const object of objects) {
    if (
      object.category === "RELATION" &&
      (object.schema === "public" ||
        object.schema === "private")
    ) {
      relationMap.set(`${object.schema}.${object.name}`, {
        schema: object.schema,
        name: object.name,
      });
    }
    if (
      object.category === "ROUTINE" &&
      (object.schema === "public" ||
        object.schema === "private")
    ) {
      routineMap.set(`${object.schema}.${object.name}`, {
        schema: object.schema,
        name: object.name,
      });
    }
  }
  const relations = [...relationMap.values()].sort((left, right) =>
    `${left.schema}.${left.name}`.localeCompare(
      `${right.schema}.${right.name}`,
    ),
  );
  const routines = [...routineMap.values()].sort((left, right) =>
    `${left.schema}.${left.name}`.localeCompare(
      `${right.schema}.${right.name}`,
    ),
  );
  if (relations.length === 0 || routines.length === 0) {
    throw new Error("PREFIX_SEMANTIC_INVENTORY_EMPTY");
  }
  const categories = prefixSemanticCategories
    .map((category) => `(${sqlText(category)})`)
    .join(",\n    ");
  const normalizedConstraint =
    normalizeSql("pg_catalog.pg_get_constraintdef(constraint_row.oid, true)");
  const normalizedIndex =
    normalizeSql("pg_catalog.pg_get_indexdef(index_relation.oid)");
  const normalizedDefault =
    normalizeSql(
      "pg_catalog.pg_get_expr(default_row.adbin, default_row.adrelid, true)",
    );
  const normalizedTrigger =
    normalizeSql(
      "pg_catalog.pg_get_triggerdef(trigger_row.oid, true)",
    );
  const normalizedPolicyUsing =
    normalizeSql(
      "pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid, true)",
    );
  const normalizedPolicyCheck =
    normalizeSql(
      "pg_catalog.pg_get_expr(policy_row.polwithcheck, policy_row.polrelid, true)",
    );
  const normalizedFunctionBody =
    normalizeSql("function_row.prosrc");

  return `
begin read only;
set local statement_timeout = '30s';
with
semantic_categories(category) as (
  values
    ${categories}
),
expected_relations(schema_name, object_name) as (
  values
    ${qualifiedValues(relations)}
),
expected_routines(schema_name, object_name) as (
  values
    ${qualifiedValues(routines)}
),
application_relations as (
  select
    relation.oid,
    namespace.nspname::text as schema_name,
    relation.relname::text as relation_name,
    relation.relowner,
    relation.relacl,
    relation.relkind,
    relation.relpersistence,
    relation.relrowsecurity,
    relation.relforcerowsecurity
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where relation.relkind in ('r', 'p')
    and (namespace.nspname, relation.relname) in (
      select schema_name, object_name from expected_relations
    )
),
application_functions as (
  select
    procedure.oid,
    namespace.nspname::text as schema_name,
    procedure.proname::text as function_name,
    procedure.proowner,
    procedure.proacl,
    procedure.prolang,
    procedure.prorettype,
    procedure.provolatile,
    procedure.proisstrict,
    procedure.prosecdef,
    procedure.proleakproof,
    procedure.proparallel,
    procedure.proconfig,
    procedure.prosrc,
    pg_catalog.pg_get_function_identity_arguments(
      procedure.oid
    )::text as identity_arguments
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where (namespace.nspname, procedure.proname) in (
    select schema_name, object_name from expected_routines
  )
),
semantic_rows(category, semantic_key, payload) as (
  select
    'SCHEMA',
    namespace.nspname,
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      case
        when owner_role.rolsuper then 'PLATFORM_SUPERUSER'
        when owner_role.rolname like 'supabase_%'
          or owner_role.rolname like 'pg_%'
          then 'PLATFORM_SERVICE_ROLE'
        else 'APPLICATION_OWNER'
      end
    )::text
  from pg_catalog.pg_namespace as namespace
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = namespace.nspowner
  where namespace.nspname in ('public', 'private')

  union all

  select
    'RELATION',
    relation.schema_name || '.' || relation.relation_name,
    pg_catalog.jsonb_build_array(
      relation.schema_name,
      relation.relation_name,
      relation.relkind,
      relation.relpersistence,
      relation.relrowsecurity,
      relation.relforcerowsecurity,
      case
        when owner_role.rolsuper then 'PLATFORM_SUPERUSER'
        when owner_role.rolname like 'supabase_%'
          or owner_role.rolname like 'pg_%'
          then 'PLATFORM_SERVICE_ROLE'
        else 'APPLICATION_OWNER'
      end
    )::text
  from application_relations as relation
  join pg_catalog.pg_roles as owner_role
    on owner_role.oid = relation.relowner

  union all

  select
    'COLUMN',
    relation.schema_name || '.' || relation.relation_name ||
      '.' || attribute.attnum::text,
    pg_catalog.jsonb_build_array(
      relation.schema_name,
      relation.relation_name,
      attribute.attnum,
      attribute.attname,
      pg_catalog.format_type(
        attribute.atttypid,
        attribute.atttypmod
      ),
      attribute.attnotnull,
      attribute.attidentity,
      attribute.attgenerated,
      ${normalizedDefault}
    )::text
  from application_relations as relation
  join pg_catalog.pg_attribute as attribute
    on attribute.attrelid = relation.oid
  left join pg_catalog.pg_attrdef as default_row
    on default_row.adrelid = relation.oid
    and default_row.adnum = attribute.attnum
  where attribute.attnum > 0
    and not attribute.attisdropped

  union all

  select
    'CONSTRAINT',
    relation.schema_name || '.' || relation.relation_name ||
      '.' || constraint_row.conname,
    pg_catalog.jsonb_build_array(
      relation.schema_name,
      relation.relation_name,
      constraint_row.conname,
      constraint_row.contype,
      constraint_row.condeferrable,
      constraint_row.condeferred,
      constraint_row.convalidated,
      ${normalizedConstraint}
    )::text
  from application_relations as relation
  join pg_catalog.pg_constraint as constraint_row
    on constraint_row.conrelid = relation.oid

  union all

  select
    'INDEX',
    relation.schema_name || '.' || relation.relation_name ||
      '.' || index_relation.relname,
    pg_catalog.jsonb_build_array(
      relation.schema_name,
      relation.relation_name,
      index_relation.relname,
      index_row.indisunique,
      index_row.indisprimary,
      index_row.indisvalid,
      index_row.indisready,
      ${normalizedIndex}
    )::text
  from application_relations as relation
  join pg_catalog.pg_index as index_row
    on index_row.indrelid = relation.oid
  join pg_catalog.pg_class as index_relation
    on index_relation.oid = index_row.indexrelid

  union all

  select
    'FUNCTION',
    function_row.schema_name || '.' ||
      function_row.function_name || '(' ||
      function_row.identity_arguments || ')',
    pg_catalog.jsonb_build_array(
      function_row.schema_name,
      function_row.function_name,
      function_row.identity_arguments,
      pg_catalog.format_type(
        function_row.prorettype,
        null
      ),
      language.lanname,
      function_row.provolatile,
      function_row.proisstrict,
      function_row.prosecdef,
      function_row.proleakproof,
      function_row.proparallel,
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            setting order by setting
          )
          from pg_catalog.unnest(
            function_row.proconfig
          ) as setting
        ),
        '[]'::jsonb
      ),
      pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(
            ${normalizedFunctionBody},
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
    )::text
  from application_functions as function_row
  join pg_catalog.pg_language as language
    on language.oid = function_row.prolang

  union all

  select
    'TRIGGER',
    namespace.nspname || '.' || relation.relname ||
      '.' || trigger_row.tgname,
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      relation.relname,
      trigger_row.tgname,
      trigger_row.tgenabled,
      ${normalizedTrigger}
    )::text
  from pg_catalog.pg_trigger as trigger_row
  join pg_catalog.pg_class as relation
    on relation.oid = trigger_row.tgrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where not trigger_row.tgisinternal
    and (
      relation.oid in (
        select oid from application_relations
      )
      or (
        namespace.nspname = 'auth'
        and relation.relname = 'users'
        and trigger_row.tgname = 'on_auth_user_created'
      )
    )

  union all

  select
    'POLICY',
    relation.schema_name || '.' || relation.relation_name ||
      '.' || policy_row.polname,
    pg_catalog.jsonb_build_array(
      relation.schema_name,
      relation.relation_name,
      policy_row.polname,
      policy_row.polpermissive,
      policy_row.polcmd,
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            coalesce(role_row.rolname, 'PUBLIC')
            order by coalesce(role_row.rolname, 'PUBLIC')
          )
          from pg_catalog.unnest(
            policy_row.polroles
          ) as policy_role(role_oid)
          left join pg_catalog.pg_roles as role_row
            on role_row.oid = policy_role.role_oid
        ),
        '[]'::jsonb
      ),
      ${normalizedPolicyUsing},
      ${normalizedPolicyCheck}
    )::text
  from application_relations as relation
  join pg_catalog.pg_policy as policy_row
    on policy_row.polrelid = relation.oid

  union all

  select
    'SCHEMA_GRANT',
    namespace.nspname || '.' ||
      case
        when acl.grantee = 0 then 'PUBLIC'
        when acl.grantee = namespace.nspowner then 'OWNER'
        when grantee_role.rolname in (
          'anon', 'authenticated', 'service_role'
        ) then grantee_role.rolname
        when grantee_role.rolsuper
          or grantee_role.rolname like 'supabase_%'
          or grantee_role.rolname like 'pg_%'
          then 'PLATFORM_ROLE'
        else 'OTHER_ROLE'
      end || '.' ||
      acl.privilege_type,
    pg_catalog.jsonb_build_array(
      namespace.nspname,
      case
        when acl.grantee = 0 then 'PUBLIC'
        when acl.grantee = namespace.nspowner then 'OWNER'
        when grantee_role.rolname in (
          'anon', 'authenticated', 'service_role'
        ) then grantee_role.rolname
        when grantee_role.rolsuper
          or grantee_role.rolname like 'supabase_%'
          or grantee_role.rolname like 'pg_%'
          then 'PLATFORM_ROLE'
        else 'OTHER_ROLE'
      end,
      acl.privilege_type,
      acl.is_grantable
    )::text
  from pg_catalog.pg_namespace as namespace
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      namespace.nspacl,
      pg_catalog.acldefault('n', namespace.nspowner)
    )
  ) as acl
  left join pg_catalog.pg_roles as grantee_role
    on grantee_role.oid = acl.grantee
  where namespace.nspname in ('public', 'private')

  union all

  select
    'RELATION_GRANT',
    relation.schema_name || '.' || relation.relation_name ||
      '.' || case
        when acl.grantee = 0 then 'PUBLIC'
        when acl.grantee = relation.relowner then 'OWNER'
        when grantee_role.rolname in (
          'anon', 'authenticated', 'service_role'
        ) then grantee_role.rolname
        when grantee_role.rolsuper
          or grantee_role.rolname like 'supabase_%'
          or grantee_role.rolname like 'pg_%'
          then 'PLATFORM_ROLE'
        else 'OTHER_ROLE'
      end ||
      '.' || acl.privilege_type,
    pg_catalog.jsonb_build_array(
      relation.schema_name,
      relation.relation_name,
      case
        when acl.grantee = 0 then 'PUBLIC'
        when acl.grantee = relation.relowner then 'OWNER'
        when grantee_role.rolname in (
          'anon', 'authenticated', 'service_role'
        ) then grantee_role.rolname
        when grantee_role.rolsuper
          or grantee_role.rolname like 'supabase_%'
          or grantee_role.rolname like 'pg_%'
          then 'PLATFORM_ROLE'
        else 'OTHER_ROLE'
      end,
      acl.privilege_type,
      acl.is_grantable
    )::text
  from application_relations as relation
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      relation.relacl,
      pg_catalog.acldefault('r', relation.relowner)
    )
  ) as acl
  left join pg_catalog.pg_roles as grantee_role
    on grantee_role.oid = acl.grantee

  union all

  select
    'FUNCTION_GRANT',
    function_row.schema_name || '.' ||
      function_row.function_name || '(' ||
      function_row.identity_arguments || ').' ||
      case
        when acl.grantee = 0 then 'PUBLIC'
        when acl.grantee = function_row.proowner then 'OWNER'
        when grantee_role.rolname in (
          'anon', 'authenticated', 'service_role'
        ) then grantee_role.rolname
        when grantee_role.rolsuper
          or grantee_role.rolname like 'supabase_%'
          or grantee_role.rolname like 'pg_%'
          then 'PLATFORM_ROLE'
        else 'OTHER_ROLE'
      end || '.' ||
      acl.privilege_type,
    pg_catalog.jsonb_build_array(
      function_row.schema_name,
      function_row.function_name,
      function_row.identity_arguments,
      case
        when acl.grantee = 0 then 'PUBLIC'
        when acl.grantee = function_row.proowner then 'OWNER'
        when grantee_role.rolname in (
          'anon', 'authenticated', 'service_role'
        ) then grantee_role.rolname
        when grantee_role.rolsuper
          or grantee_role.rolname like 'supabase_%'
          or grantee_role.rolname like 'pg_%'
          then 'PLATFORM_ROLE'
        else 'OTHER_ROLE'
      end,
      acl.privilege_type,
      acl.is_grantable
    )::text
  from application_functions as function_row
  cross join lateral pg_catalog.aclexplode(
    coalesce(
      function_row.proacl,
      pg_catalog.acldefault('f', function_row.proowner)
    )
  ) as acl
  left join pg_catalog.pg_roles as grantee_role
    on grantee_role.oid = acl.grantee

  union all

  select
    'EXTENSION',
    extension.extname,
    pg_catalog.jsonb_build_array(
      extension.extname,
      namespace.nspname,
      extension.extversion,
      extension.extrelocatable
    )::text
  from pg_catalog.pg_extension as extension
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = extension.extnamespace
  where extension.extname = 'pgcrypto'

  union all

  select
    'EXTENSION_DEPENDENCY',
    coalesce(
      dependency_relation.schema_name || '.' ||
        dependency_relation.relation_name,
      dependency_function.schema_name || '.' ||
        dependency_function.function_name || '(' ||
        dependency_function.identity_arguments || ')'
    ) || '.' || extension.extname,
    pg_catalog.jsonb_build_array(
      case dependency.classid
        when 'pg_class'::pg_catalog.regclass
          then 'RELATION'
        when 'pg_proc'::pg_catalog.regclass
          then 'FUNCTION'
        else 'OTHER'
      end,
      coalesce(
        dependency_relation.schema_name || '.' ||
          dependency_relation.relation_name,
        dependency_function.schema_name || '.' ||
          dependency_function.function_name || '(' ||
          dependency_function.identity_arguments || ')'
      ),
      extension.extname,
      dependency.deptype
    )::text
  from pg_catalog.pg_depend as dependency
  join pg_catalog.pg_extension as extension
    on dependency.refclassid =
      'pg_extension'::pg_catalog.regclass
    and extension.oid = dependency.refobjid
  left join application_relations as dependency_relation
    on dependency.classid = 'pg_class'::pg_catalog.regclass
    and dependency.objid = dependency_relation.oid
  left join application_functions as dependency_function
    on dependency.classid = 'pg_proc'::pg_catalog.regclass
    and dependency.objid = dependency_function.oid
  where (
    dependency_relation.oid is not null
    or dependency_function.oid is not null
  )
),
category_fingerprints as (
  select
    category.category,
    count(semantic_row.semantic_key)::integer as row_count,
    pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          coalesce(
            pg_catalog.string_agg(
              semantic_row.semantic_key ||
                pg_catalog.chr(31) ||
                semantic_row.payload,
              pg_catalog.chr(30)
              order by semantic_row.semantic_key,
                semantic_row.payload
            ),
            ''
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as fingerprint
  from semantic_categories as category
  left join semantic_rows as semantic_row
    on semantic_row.category = category.category
  group by category.category
)
select concat_ws(
  '|',
  '${prefixSemanticFingerprintVersion}',
  category,
  row_count,
  fingerprint
)
from category_fingerprints
order by category;
commit;
`;
}

export function buildProject004PrefixSemanticCategorySql(
  category: PrefixSemanticCategory,
  candidateRoot = process.cwd(),
  prefixCount = 38,
) {
  const sql = buildProject004PrefixSemanticFingerprintSql(
    candidateRoot,
    prefixCount,
  );
  const startToken =
    "semantic_rows(category, semantic_key, payload) as (\n";
  const endToken = "\n),\ncategory_fingerprints as (";
  const start = sql.indexOf(startToken);
  const end = sql.indexOf(
    endToken,
    start + startToken.length,
  );
  if (start < 0 || end < 0) {
    throw new Error(
      "PREFIX_SEMANTIC_CATEGORY_SQL_BOUNDARY_INVALID",
    );
  }
  const bodyStart = start + startToken.length;
  const branches = sql
    .slice(bodyStart, end)
    .split("\n\n  union all\n\n");
  const selected = branches.filter((branch) =>
    branch.includes(`select\n    '${category}',`),
  );
  if (selected.length !== 1) {
    throw new Error(
      "PREFIX_SEMANTIC_CATEGORY_SQL_SELECTION_INVALID",
    );
  }
  return `${sql.slice(0, bodyStart)}${selected[0]}${sql.slice(end)}`;
}

export function parsePrefixSemanticFingerprint(
  output: string,
): PrefixSemanticFingerprint {
  const categoryMap = new Map<
    PrefixSemanticCategory,
    PrefixSemanticCategoryFingerprint
  >();
  for (const rawLine of output.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match =
      /^PROJECT004_PREFIX_0038_SEMANTIC_V1\|([A-Z_]+)\|(\d+)\|([0-9a-f]{64})$/u.exec(
        line,
      );
    if (!match) {
      throw new Error("PREFIX_SEMANTIC_OUTPUT_INVALID");
    }
    const category = match[1] as PrefixSemanticCategory;
    if (
      !prefixSemanticCategories.includes(category) ||
      categoryMap.has(category)
    ) {
      throw new Error("PREFIX_SEMANTIC_OUTPUT_INVALID");
    }
    const count = Number(match[2]);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("PREFIX_SEMANTIC_OUTPUT_INVALID");
    }
    categoryMap.set(category, {
      category,
      count,
      sha256: match[3] ?? "",
    });
  }
  if (categoryMap.size !== prefixSemanticCategories.length) {
    throw new Error("PREFIX_SEMANTIC_OUTPUT_INCOMPLETE");
  }
  const categories = prefixSemanticCategories.map((category) => {
    const entry = categoryMap.get(category);
    if (!entry) {
      throw new Error("PREFIX_SEMANTIC_OUTPUT_INCOMPLETE");
    }
    return entry;
  });
  const overallSha256 = createHash("sha256")
    .update(
      categories
        .map(
          (entry) =>
            `${entry.category}|${entry.count}|${entry.sha256}`,
        )
        .join("\n"),
    )
    .digest("hex");
  return {
    version: prefixSemanticFingerprintVersion,
    categories,
    overallSha256,
  };
}

export function comparePrefixSemanticFingerprints(
  canonical: PrefixSemanticFingerprint,
  observed: PrefixSemanticFingerprint,
) {
  const mismatchedCategories =
    prefixSemanticCategories.filter((category) => {
      const expected = canonical.categories.find(
        (entry) => entry.category === category,
      );
      const actual = observed.categories.find(
        (entry) => entry.category === category,
      );
      return (
        expected?.count !== actual?.count ||
        expected?.sha256 !== actual?.sha256
      );
    });
  return {
    matches:
      canonical.version === observed.version &&
      canonical.overallSha256 === observed.overallSha256 &&
      mismatchedCategories.length === 0,
    mismatchCount: mismatchedCategories.length,
    mismatchedCategories,
  };
}
