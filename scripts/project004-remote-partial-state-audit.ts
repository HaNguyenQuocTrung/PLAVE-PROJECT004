import { readFileSync } from "node:fs";

import {
  createAuditedRemoteIncidentRunner,
  type IncidentAuditCommandCounts,
} from "./project004-remote-dev-audited-runner.ts";
import {
  buildProject004ForeignObjectInspectionSql,
  buildProject004PrefixObjectInventory,
  type Project004PrefixObject,
} from "./project004-remote-dev-baseline.ts";
import {
  RemoteDevGuardFailure,
  assertLocalIsolation,
  assertRemoteDevTarget,
  buildRemoteDatabaseEnvironment,
  createCanonicalRemoteDevCommandRunner,
  loadAndVerifyMigrationPlan,
  verifyProjectRecords,
  type MigrationPlan,
  type RemoteDevPrivateConfig,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import {
  parseSafeForeignObjectInspection,
  type SafeForeignObjectInspection,
} from "./inspect-project004-remote-foreign-object.ts";
import {
  queryRemoteEmptyCounts,
  toRemoteDevRootFailureCode,
  type RemoteDevCheckState,
  type RemoteDevCommandRunner,
  type RemoteEmptyCounts,
} from "./project004-remote-dev-operations.ts";
import { runCanonicalSupabaseCliAuthCheck } from "./project004-supabase-cli-auth.ts";

export type IncidentMigrationAudit = {
  count: number;
  firstLast: string;
  contiguousPrefix: RemoteDevCheckState;
  prefixLast: string;
  missingMigrations: string;
  foreignMigrations: number;
  duplicateVersions: number;
  outOfOrderVersions: number | "NOT_AVAILABLE";
  checksumDriftCount: number | "NOT_AVAILABLE";
  checksumMetadata: "AVAILABLE" | "NOT_AVAILABLE";
};

export type IncidentSchemaAudit = {
  expectedForPrefix: number;
  observedCanonical: number;
  extraObjects: number;
  missingObjects: number;
  rlsPrivateBoundary: RemoteDevCheckState;
};

export type IncidentDataAudit = {
  authUsers: number;
  storageObjects: number;
  syntheticUsers: number;
  curriculumCounts: string;
  releaseState: string;
  runtimeState: string;
  pilotState: string;
};

export type StaticDryRunAudit = {
  dryRunArgvContract: RemoteDevCheckState;
  sanitizedDryRunArgvEvidence:
    | "supabase/db/push/--dry-run"
    | "UNVERIFIED";
  childProcessSequence: RemoteDevCheckState;
  dryRunOutputParser: RemoteDevCheckState;
  fallbackMutationPath: "NOT_FOUND" | "FOUND";
  hiddenSchemaPushPath: "NOT_FOUND" | "FOUND";
  priorCapturedArgv: "NOT_RECORDED";
};

export type RemotePartialStateAuditReport = {
  ok: boolean;
  rootFailureCode: string;
  currentRunMutationPerformed: "NO";
  preexistingRemoteApplicationState:
    | "YES"
    | "NO"
    | "NOT_RUN";
  project004Canonical: RemoteDevCheckState;
  remoteIdentityGuard: RemoteDevCheckState;
  localMigrationChecksums: RemoteDevCheckState;
  baselineCounts: RemoteEmptyCounts | null;
  migration: IncidentMigrationAudit | null;
  schema: IncidentSchemaAudit | null;
  data: IncidentDataAudit | null;
  foreignClassification: string;
  recoveryEligible: "YES" | "NO";
  commandCounts: IncidentAuditCommandCounts;
  staticDryRunAudit: StaticDryRunAudit;
};

type MigrationHistoryRow = {
  version?: unknown;
  duplicate_count?: unknown;
  checksum?: unknown;
  order_index?: unknown;
};

type IncidentObjectQueryResult = {
  expectedForPrefix: number;
  observedCanonical: number;
  observedExpected: number;
  missingObjects: number;
  futureCanonicalObjects: number;
  rlsGaps: number;
  privateGrantLeaks: number;
  authTriggerCount: number;
};

type IncidentDataQueryResult = {
  releaseTablePresent: number;
  adaptiveTablePresent: number;
  legacyUnits: number;
  legacyQuestions: number;
  legacySolutions: number;
  releaseRows: number;
  releaseUnits: number;
  releaseQuestions: number;
  releaseSolutions: number;
  releaseOutcomes: number;
  draftInactiveReleases: number;
  activeOrOtherReleases: number;
  adaptiveReleaseRows: number;
  adaptiveEnabledRows: number;
  pilotMembers: number;
  runtimeSecrets: number;
  publishedLegacyUnits: number;
  publishedLegacyQuestions: number;
  syntheticUsers: number;
};

function emptyIncidentCommandCounts(): IncidentAuditCommandCounts {
  return {
    projectList: 0,
    readOnlySql: 0,
    mutation: 0,
    unexpected: 0,
  };
}

function configFromEnvironment(
  environment: NodeJS.ProcessEnv,
): RemoteDevPrivateConfig {
  return {
    projectName:
      environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
    projectRef:
      environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "",
    databasePassword:
      environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
    environmentClass:
      environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
  };
}

function lastOutputLine(stdout: string) {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}

function runReadOnlySql(
  sql: string,
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv,
  runner: RemoteDevCommandRunner,
) {
  return runner(
    "psql",
    [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    buildRemoteDatabaseEnvironment(config, environment),
  );
}

function requireOutput(
  result: SafeCommandResult,
  failureCode: string,
) {
  if (!result.ok) throw new RemoteDevGuardFailure(failureCode);
  const output = lastOutputLine(result.stdout);
  if (!output) throw new RemoteDevGuardFailure(failureCode);
  return output;
}

function parseNonNegativeFields(
  output: string,
  expected: number,
  failureCode: string,
) {
  const values = output.split("|").map(Number);
  if (
    values.length !== expected ||
    values.some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    throw new RemoteDevGuardFailure(failureCode);
  }
  return values;
}

const migrationMetadataSql = String.raw`
begin read only;
set local statement_timeout = '15s';
select coalesce(
  json_agg(column_name order by ordinal_position)::text,
  '[]'
)
from information_schema.columns
where table_schema = 'supabase_migrations'
  and table_name = 'schema_migrations';
commit;
`;

function migrationHistorySql(
  checksumColumn: string | null,
  orderColumn: string | null,
) {
  const checksumExpression = checksumColumn
    ? `coalesce(${checksumColumn}::text, 'NONE')`
    : "'NONE'";
  const orderExpression = orderColumn
    ? `row_number() over (order by ${orderColumn}, version)`
    : "null";
  return `
begin read only;
set local statement_timeout = '15s';
select coalesce(
  json_agg(
    json_build_object(
      'version', history.version,
      'duplicate_count', history.duplicate_count,
      'checksum', history.checksum_value,
      'order_index', history.order_index
    )
    order by history.version, history.order_index nulls last
  )::text,
  '[]'
)
from (
  select
    version::text as version,
    count(*) over (partition by version)::integer
      as duplicate_count,
    ${checksumExpression} as checksum_value,
    ${orderExpression} as order_index
  from supabase_migrations.schema_migrations
) as history;
commit;
`;
}

function safeVersionBoundary(version: string | undefined) {
  if (!version) return "NONE";
  return /^\d{4}$/u.test(version) ? version : "FOREIGN";
}

function normalizeRemoteChecksum(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/^\\x/u, "");
  return /^[0-9a-f]{64}$/u.test(normalized)
    ? normalized
    : null;
}

export function classifyIncidentMigrationHistory(
  rawRows: unknown,
  plan: MigrationPlan,
  checksumMetadata: boolean,
  orderMetadata: boolean,
): IncidentMigrationAudit {
  if (!Array.isArray(rawRows)) {
    throw new RemoteDevGuardFailure(
      "INCIDENT_MIGRATION_HISTORY_INVALID",
    );
  }
  const rows = rawRows as MigrationHistoryRow[];
  const canonical = plan.migrations.map((entry) => entry.version);
  const canonicalSet = new Set(canonical);
  const appliedCanonical = new Set<string>();
  const duplicateCounts = new Map<string, number>();
  let duplicateVersions = 0;
  let foreignMigrations = 0;
  for (const row of rows) {
    if (
      typeof row.version !== "string" ||
      !Number.isInteger(row.duplicate_count) ||
      Number(row.duplicate_count) < 1
    ) {
      throw new RemoteDevGuardFailure(
        "INCIDENT_MIGRATION_HISTORY_INVALID",
      );
    }
    const duplicateCount = Number(row.duplicate_count);
    duplicateCounts.set(row.version, duplicateCount);
    if (canonicalSet.has(row.version)) {
      appliedCanonical.add(row.version);
    } else {
      foreignMigrations += 1;
    }
  }
  for (const duplicateCount of duplicateCounts.values()) {
    duplicateVersions += Math.max(duplicateCount - 1, 0);
  }
  let prefixLength = 0;
  while (
    canonical[prefixLength] &&
    appliedCanonical.has(canonical[prefixLength] ?? "")
  ) {
    prefixLength += 1;
  }
  const contiguousPrefix =
    [...appliedCanonical].every(
      (version) =>
        canonical.indexOf(version) >= 0 &&
        canonical.indexOf(version) < prefixLength,
    ) && duplicateVersions === 0;
  const missing = canonical.filter(
    (version) => !appliedCanonical.has(version),
  );
  const orderedRows = rows
    .filter(
      (row) =>
        typeof row.version === "string" &&
        canonicalSet.has(row.version),
    )
    .sort(
      (left, right) =>
        Number(left.order_index) - Number(right.order_index),
    );
  let outOfOrderVersions: number | "NOT_AVAILABLE" =
    "NOT_AVAILABLE";
  if (
    orderMetadata &&
    orderedRows.every(
      (row) =>
        Number.isInteger(row.order_index) &&
        Number(row.order_index) > 0,
    )
  ) {
    let previousIndex = -1;
    outOfOrderVersions = 0;
    for (const row of orderedRows) {
      const index = canonical.indexOf(String(row.version));
      if (index <= previousIndex) outOfOrderVersions += 1;
      previousIndex = index;
    }
  }
  let checksumDriftCount: number | "NOT_AVAILABLE" =
    "NOT_AVAILABLE";
  if (checksumMetadata) {
    const canonicalRows = rows.filter(
      (row) =>
        typeof row.version === "string" &&
        canonicalSet.has(row.version),
    );
    const checksums = canonicalRows.map((row) =>
      normalizeRemoteChecksum(row.checksum),
    );
    if (checksums.every((checksum) => checksum !== null)) {
      checksumDriftCount = canonicalRows.filter((row, index) => {
        const expected = plan.migrations.find(
          (entry) => entry.version === row.version,
        )?.sha256;
        return checksums[index] !== expected;
      }).length;
    }
  }
  const sortedVersions = rows
    .map((row) => String(row.version))
    .sort();
  return {
    count: rows.length,
    firstLast:
      rows.length === 0
        ? "NONE/NONE"
        : `${safeVersionBoundary(sortedVersions[0])}/${safeVersionBoundary(sortedVersions.at(-1))}`,
    contiguousPrefix: contiguousPrefix ? "PASS" : "FAIL",
    prefixLast:
      prefixLength === 0
        ? "NONE"
        : (canonical[prefixLength - 1] ?? "NONE"),
    missingMigrations:
      missing.length === 0 ? "NONE" : missing.join(","),
    foreignMigrations,
    duplicateVersions,
    outOfOrderVersions,
    checksumDriftCount,
    checksumMetadata: checksumDriftCount === "NOT_AVAILABLE"
      ? "NOT_AVAILABLE"
      : "AVAILABLE",
  };
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function objectValues(objects: readonly Project004PrefixObject[]) {
  if (objects.length === 0) {
    return "('NONE', 'public', '', '')";
  }
  return objects
    .map(
      (object) =>
        `(${sqlText(object.category)}, ${sqlText(object.schema)}, ${sqlText(object.relation)}, ${sqlText(object.name)})`,
    )
    .join(",\n    ");
}

export function buildIncidentObjectAuditSql(
  expected: readonly Project004PrefixObject[],
  full: readonly Project004PrefixObject[],
) {
  return `
begin read only;
set local statement_timeout = '20s';
with
expected_objects(category, schema_name, relation_name, object_name) as (
  values
    ${objectValues(expected)}
),
full_objects(category, schema_name, relation_name, object_name) as (
  values
    ${objectValues(full)}
),
observed_objects as (
  select distinct
    'RELATION'::text as category,
    namespace.nspname::text as schema_name,
    relation.relname::text as relation_name,
    relation.relname::text as object_name
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where relation.relkind in ('r', 'p')
    and ('RELATION', namespace.nspname, relation.relname, relation.relname)
      in (select * from full_objects)

  union

  select distinct
    'ROUTINE',
    namespace.nspname,
    '',
    procedure.proname
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where ('ROUTINE', namespace.nspname, '', procedure.proname)
    in (select * from full_objects)

  union

  select distinct
    'POLICY',
    namespace.nspname,
    relation.relname,
    policy.polname
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as relation
    on relation.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where ('POLICY', namespace.nspname, relation.relname, policy.polname)
    in (select * from full_objects)

  union

  select distinct
    'TRIGGER',
    namespace.nspname,
    relation.relname,
    trigger.tgname
  from pg_catalog.pg_trigger as trigger
  join pg_catalog.pg_class as relation
    on relation.oid = trigger.tgrelid
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where not trigger.tgisinternal
    and ('TRIGGER', namespace.nspname, relation.relname, trigger.tgname)
      in (select * from full_objects)
),
missing_objects as (
  select * from expected_objects
  except
  select * from observed_objects
),
future_objects as (
  select * from observed_objects
  except
  select * from expected_objects
),
rls_gaps as (
  select count(*)::integer as value
  from expected_objects as expected
  join pg_catalog.pg_namespace as namespace
    on namespace.nspname = expected.schema_name
  join pg_catalog.pg_class as relation
    on relation.relnamespace = namespace.oid
    and relation.relname = expected.relation_name
    and relation.relkind in ('r', 'p')
  where expected.category = 'RELATION'
    and expected.schema_name in ('public', 'private')
    and not relation.relrowsecurity
),
private_grant_leaks as (
  select count(*)::integer as value
  from information_schema.role_table_grants
  where table_schema = 'private'
    and lower(grantee) in ('anon', 'authenticated', 'public')
),
auth_trigger as (
  select count(*)::integer as value
  from pg_catalog.pg_trigger
  where tgrelid = 'auth.users'::regclass
    and tgname = 'on_auth_user_created'
    and not tgisinternal
)
select concat_ws(
  '|',
  (select count(*) from expected_objects),
  (select count(*) from observed_objects),
  (
    select count(*)
    from observed_objects
    where (category, schema_name, relation_name, object_name)
      in (select * from expected_objects)
  ),
  (select count(*) from missing_objects),
  (select count(*) from future_objects),
  rls_gaps.value,
  private_grant_leaks.value,
  auth_trigger.value
)
from rls_gaps, private_grant_leaks, auth_trigger;
commit;
`;
}

function dynamicCount(
  table: string,
  query = `select count(*) as value from ${table}`,
) {
  return `case
    when pg_catalog.to_regclass(${sqlText(table)}) is null then 0
    else (
      (
        pg_catalog.xpath(
          '/table/row/value/text()',
          pg_catalog.query_to_xml(
            ${sqlText(query)},
            false,
            false,
            ''
          )
        )
      )[1]::text
    )::bigint
  end`;
}

const syntheticTables = [
  "public.profiles",
  "public.student_profiles",
  "public.learning_goals",
  "public.parent_student_connections",
  "public.parent_student_lookup_failures",
  "public.parent_goal_suggestions",
  "public.teacher_invitations",
  "public.teacher_profiles",
  "public.classrooms",
  "public.classroom_memberships",
  "public.teacher_questions",
  "public.teacher_question_solutions",
  "public.teacher_assignments",
  "public.teacher_assignment_items",
  "public.assignment_submissions",
  "public.assignment_answers",
  "public.practice_attempts",
  "public.practice_answers",
  "public.diagnostic_attempts",
  "public.diagnostic_answers",
  "public.curriculum_attempts",
  "public.curriculum_answers",
  "public.student_curriculum_unit_progress",
  "public.student_curriculum_outcome_progress",
  "public.student_curriculum_skill_progress",
  "public.adaptive_practice_attempts",
  "public.adaptive_practice_answers",
  "public.adaptive_practice_pilot_members",
  "public.teacher_curriculum_assignment_drafts",
  "public.teacher_curriculum_assignment_draft_items",
  "private.assignment_submission_mutations",
  "public.student_assignment_outcome_progress",
  "public.student_assignment_skill_progress",
  "public.curriculum_generated_questions",
  "private.curriculum_generated_solutions",
  "public.curriculum_generated_answers",
] as const;

export function buildIncidentDataAuditSql() {
  const syntheticExpression = syntheticTables
    .map((table) => `(${dynamicCount(table)})`)
    .join(" +\n    ");
  return `
begin read only;
set local statement_timeout = '30s';
select concat_ws(
  '|',
  case when pg_catalog.to_regclass('public.curriculum_releases')
    is null then 0 else 1 end,
  case when pg_catalog.to_regclass('public.adaptive_practice_releases')
    is null then 0 else 1 end,
  ${dynamicCount("public.learning_units")},
  ${dynamicCount("public.questions")},
  ${dynamicCount("public.question_solutions")},
  ${dynamicCount("public.curriculum_releases")},
  ${dynamicCount("public.curriculum_release_units")},
  ${dynamicCount("public.curriculum_release_questions")},
  ${dynamicCount("private.curriculum_release_solutions")},
  ${dynamicCount(
    "public.curriculum_release_questions",
    "select count(distinct expanded.outcome_id) as value from public.curriculum_release_questions as question cross join unnest(question.official_outcome_ids) as expanded(outcome_id)",
  )},
  ${dynamicCount(
    "public.curriculum_releases",
    "select count(*) as value from public.curriculum_releases where status = 'DRAFT' and activation_state = 'INACTIVE'",
  )},
  ${dynamicCount(
    "public.curriculum_releases",
    "select count(*) as value from public.curriculum_releases where status <> 'DRAFT' or activation_state <> 'INACTIVE'",
  )},
  ${dynamicCount("public.adaptive_practice_releases")},
  ${dynamicCount(
    "public.adaptive_practice_releases",
    "select count(*) as value from public.adaptive_practice_releases where runtime_enabled or controlled_pilot_enabled or retention_runtime_enabled or publication_status <> 'DRAFT' or student_visibility <> 'HIDDEN'",
  )},
  ${dynamicCount("public.adaptive_practice_pilot_members")},
  ${dynamicCount("private.curriculum_generation_runtime_secret")},
  ${dynamicCount(
    "public.learning_units",
    "select count(*) as value from public.learning_units where published",
  )},
  ${dynamicCount(
    "public.questions",
    "select count(*) as value from public.questions where published",
  )},
  ${syntheticExpression}
);
commit;
`;
}

function parseObjectAudit(output: string): IncidentObjectQueryResult {
  const [
    expectedForPrefix,
    observedCanonical,
    observedExpected,
    missingObjects,
    futureCanonicalObjects,
    rlsGaps,
    privateGrantLeaks,
    authTriggerCount,
  ] = parseNonNegativeFields(
    output,
    8,
    "INCIDENT_OBJECT_AUDIT_INVALID",
  );
  return {
    expectedForPrefix,
    observedCanonical,
    observedExpected,
    missingObjects,
    futureCanonicalObjects,
    rlsGaps,
    privateGrantLeaks,
    authTriggerCount,
  };
}

function parseDataAudit(output: string): IncidentDataQueryResult {
  const values = parseNonNegativeFields(
    output,
    19,
    "INCIDENT_DATA_AUDIT_INVALID",
  );
  const [
    releaseTablePresent,
    adaptiveTablePresent,
    legacyUnits,
    legacyQuestions,
    legacySolutions,
    releaseRows,
    releaseUnits,
    releaseQuestions,
    releaseSolutions,
    releaseOutcomes,
    draftInactiveReleases,
    activeOrOtherReleases,
    adaptiveReleaseRows,
    adaptiveEnabledRows,
    pilotMembers,
    runtimeSecrets,
    publishedLegacyUnits,
    publishedLegacyQuestions,
    syntheticUsers,
  ] = values;
  return {
    releaseTablePresent,
    adaptiveTablePresent,
    legacyUnits,
    legacyQuestions,
    legacySolutions,
    releaseRows,
    releaseUnits,
    releaseQuestions,
    releaseSolutions,
    releaseOutcomes,
    draftInactiveReleases,
    activeOrOtherReleases,
    adaptiveReleaseRows,
    adaptiveEnabledRows,
    pilotMembers,
    runtimeSecrets,
    publishedLegacyUnits,
    publishedLegacyQuestions,
    syntheticUsers,
  };
}

export function auditPriorDryRunConstruction(
  candidateRoot = process.cwd(),
): StaticDryRunAudit {
  const { root } = loadAndVerifyMigrationPlan(candidateRoot);
  const operations = readFileSync(
    `${root}/scripts/project004-remote-dev-operations.ts`,
    "utf8",
  );
  const auditedRunner = readFileSync(
    `${root}/scripts/project004-remote-dev-audited-runner.ts`,
    "utf8",
  );
  const apply = readFileSync(
    `${root}/scripts/project004-remote-dev-apply-once.ts`,
    "utf8",
  );
  const dryRunArgvContract =
    /\["db",\s*"push",\s*"--dry-run"\]/u.test(operations) &&
    /args\[2\]\s*===\s*"--dry-run"/u.test(auditedRunner) &&
    /counts[.]dryRun\s*\+=\s*1/u.test(auditedRunner);
  const schemaPushIsCountedBeforeDelegate =
    /counts[.]schemaPush\s*\+=\s*1;[\s\S]{0,180}delegate\(/u.test(
      auditedRunner,
    );
  const actualPushUsesAuditedRunner =
    /audited[.]runner\([\s\S]{0,100}\["db",\s*"push"\]/u.test(
      apply,
    );
  const guardedDryRunStart = operations.indexOf(
    "export function executeGuardedDryRun",
  );
  const guardedDryRunSource =
    guardedDryRunStart < 0
      ? ""
      : operations.slice(guardedDryRunStart);
  const dryRunSequence =
    /withEphemeralRemoteCliMetadata\(/u.test(auditedRunner) &&
    /executeGuardedDryRun\(\{[\s\S]{0,500}preflight,/u.test(
      auditedRunner,
    ) &&
    /options[?][.]preflight\s*[?][?]\s*runRemoteDevPreflight\(/u.test(
      guardedDryRunSource,
    ) &&
    /const result = runner\(\s*"supabase",\s*\["db", "push", "--dry-run"\]/u.test(
      guardedDryRunSource,
    );
  const outputParser =
    /verifyProject004DryRunResult\(\s*result,\s*preflight[.]plan/u.test(
      operations,
    ) &&
    /normalizeDryRunOutput\(\s*result[.]stdout,\s*result[.]stderr/u.test(
      operations,
    ) &&
    /parseCanonicalMigrationFilename/u.test(operations) &&
    /successSignature/u.test(operations) &&
    /migrationEntries[.]length !== expectedFiles[.]length/u.test(
      operations,
    ) &&
    /DRY_RUN_MIGRATION_PLAN_MISMATCH/u.test(operations) &&
    /DRY_RUN_SEED_DETECTED/u.test(operations) &&
    /DRY_RUN_UNEXPECTED_OPERATION/u.test(operations);
  const authorizedDryRunStart = auditedRunner.indexOf(
    "export function executeAuthorizedRemoteDevDryRun",
  );
  const authorizedDryRunSource =
    authorizedDryRunStart < 0
      ? ""
      : auditedRunner.slice(authorizedDryRunStart);
  const fallbackMutationPath =
    /\["db",\s*"push"\](?!\s*,\s*"--dry-run")/u.test(
      authorizedDryRunSource,
    );
  return {
    dryRunArgvContract: dryRunArgvContract ? "PASS" : "FAIL",
    sanitizedDryRunArgvEvidence: dryRunArgvContract
      ? "supabase/db/push/--dry-run"
      : "UNVERIFIED",
    childProcessSequence: dryRunSequence ? "PASS" : "FAIL",
    dryRunOutputParser: outputParser ? "PASS" : "FAIL",
    fallbackMutationPath: fallbackMutationPath
      ? "FOUND"
      : "NOT_FOUND",
    hiddenSchemaPushPath:
      schemaPushIsCountedBeforeDelegate &&
      actualPushUsesAuditedRunner
        ? "NOT_FOUND"
        : "FOUND",
    priorCapturedArgv: "NOT_RECORDED",
  };
}

function emptyReport(
  staticDryRunAudit: StaticDryRunAudit,
): RemotePartialStateAuditReport {
  return {
    ok: false,
    rootFailureCode: "INCIDENT_AUDIT_NOT_RUN",
    currentRunMutationPerformed: "NO",
    preexistingRemoteApplicationState: "NOT_RUN",
    project004Canonical: "PASS",
    remoteIdentityGuard: "NOT_RUN",
    localMigrationChecksums: "PASS",
    baselineCounts: null,
    migration: null,
    schema: null,
    data: null,
    foreignClassification: "NOT_RUN",
    recoveryEligible: "NO",
    commandCounts: emptyIncidentCommandCounts(),
    staticDryRunAudit,
  };
}

function failureCode(error: unknown) {
  if (error instanceof RemoteDevGuardFailure) {
    const mapped = toRemoteDevRootFailureCode(error.code);
    return mapped === "UNCLASSIFIED_FAILURE" ? error.code : mapped;
  }
  return "INCIDENT_AUDIT_UNCLASSIFIED_FAILURE";
}

export function executeRemotePartialStateIncidentAudit(options: {
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
}): RemotePartialStateAuditReport {
  const environment = options.environment;
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const staticDryRunAudit =
    auditPriorDryRunConstruction(candidateRoot);
  const report = emptyReport(staticDryRunAudit);
  const delegate =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  const audited = createAuditedRemoteIncidentRunner(delegate);
  report.commandCounts = audited.counts;
  try {
    const { root, plan } =
      loadAndVerifyMigrationPlan(candidateRoot);
    const config = configFromEnvironment(environment);
    assertRemoteDevTarget(config);
    assertLocalIsolation(config, candidateRoot);
    const auth = runCanonicalSupabaseCliAuthCheck({
      environment,
      candidateRoot,
      runner: audited.runner,
    });
    verifyProjectRecords(auth.projects, config);
    report.remoteIdentityGuard = "PASS";

    const baseline = queryRemoteEmptyCounts(
      config,
      environment,
      audited.runner,
      candidateRoot,
      plan,
    );
    report.baselineCounts = baseline;

    const metadataOutput = requireOutput(
      runReadOnlySql(
        migrationMetadataSql,
        config,
        environment,
        audited.runner,
      ),
      "INCIDENT_MIGRATION_METADATA_UNAVAILABLE",
    );
    let columns: unknown;
    try {
      columns = JSON.parse(metadataOutput);
    } catch {
      throw new RemoteDevGuardFailure(
        "INCIDENT_MIGRATION_METADATA_INVALID",
      );
    }
    if (
      !Array.isArray(columns) ||
      columns.some((column) => typeof column !== "string") ||
      !columns.includes("version")
    ) {
      throw new RemoteDevGuardFailure(
        "INCIDENT_MIGRATION_METADATA_INVALID",
      );
    }
    const checksumColumn =
      ["checksum", "sha256", "file_sha256"].find((column) =>
        columns.includes(column),
      ) ?? null;
    const orderColumn =
      ["inserted_at", "created_at", "applied_at"].find((column) =>
        columns.includes(column),
      ) ?? null;
    const historyOutput = requireOutput(
      runReadOnlySql(
        migrationHistorySql(checksumColumn, orderColumn),
        config,
        environment,
        audited.runner,
      ),
      "INCIDENT_MIGRATION_HISTORY_UNAVAILABLE",
    );
    let historyRows: unknown;
    try {
      historyRows = JSON.parse(historyOutput);
    } catch {
      throw new RemoteDevGuardFailure(
        "INCIDENT_MIGRATION_HISTORY_INVALID",
      );
    }
    const migration = classifyIncidentMigrationHistory(
      historyRows,
      plan,
      checksumColumn !== null,
      orderColumn !== null,
    );
    report.migration = migration;

    const prefixCount =
      migration.prefixLast === "NONE"
        ? 0
        : Number(migration.prefixLast);
    const expectedObjects =
      buildProject004PrefixObjectInventory(
        root,
        plan,
        prefixCount,
      );
    const fullObjects = buildProject004PrefixObjectInventory(
      root,
      plan,
      plan.migrationCount,
    );
    const objectAudit = parseObjectAudit(
      requireOutput(
        runReadOnlySql(
          buildIncidentObjectAuditSql(
            expectedObjects,
            fullObjects,
          ),
          config,
          environment,
          audited.runner,
        ),
        "INCIDENT_OBJECT_AUDIT_UNAVAILABLE",
      ),
    );
    if (
      objectAudit.expectedForPrefix !== expectedObjects.length ||
      objectAudit.observedExpected + objectAudit.missingObjects !==
        objectAudit.expectedForPrefix
    ) {
      throw new RemoteDevGuardFailure(
        "INCIDENT_OBJECT_AUDIT_INCONSISTENT",
      );
    }
    const extraObjects =
      objectAudit.futureCanonicalObjects +
      baseline.foreignApplicationObjects;
    const rlsPrivateBoundary =
      objectAudit.missingObjects === 0 &&
      objectAudit.rlsGaps === 0 &&
      objectAudit.privateGrantLeaks === 0 &&
      objectAudit.authTriggerCount === 1
        ? "PASS"
        : "FAIL";
    report.schema = {
      expectedForPrefix: objectAudit.expectedForPrefix,
      observedCanonical: objectAudit.observedCanonical,
      extraObjects,
      missingObjects: objectAudit.missingObjects,
      rlsPrivateBoundary,
    };

    const rawData = parseDataAudit(
      requireOutput(
        runReadOnlySql(
          buildIncidentDataAuditSql(),
          config,
          environment,
          audited.runner,
        ),
        "INCIDENT_DATA_AUDIT_UNAVAILABLE",
      ),
    );
    const releaseState =
      rawData.releaseTablePresent === 0
        ? "NOT_PRESENT"
        : rawData.releaseRows === 0
          ? "EMPTY"
          : rawData.draftInactiveReleases ===
                rawData.releaseRows &&
              rawData.activeOrOtherReleases === 0
            ? "DRAFT/INACTIVE"
            : "ACTIVE_OR_MIXED";
    const runtimeRows =
      rawData.activeOrOtherReleases +
      rawData.adaptiveEnabledRows +
      rawData.runtimeSecrets +
      rawData.publishedLegacyUnits +
      rawData.publishedLegacyQuestions;
    const runtimeState =
      rawData.releaseTablePresent === 0 &&
      rawData.adaptiveTablePresent === 0
        ? "NOT_PRESENT"
        : runtimeRows === 0
          ? "false"
          : "true";
    const pilotState =
      rawData.adaptiveTablePresent === 0
        ? "NOT_PRESENT"
        : rawData.adaptiveEnabledRows === 0 &&
            rawData.pilotMembers === 0
          ? "DISABLED"
          : "ENABLED_OR_POPULATED";
    report.data = {
      authUsers: baseline.authUserCount,
      storageObjects: baseline.storageObjectCount,
      syntheticUsers: rawData.syntheticUsers,
      curriculumCounts:
        `LEGACY:${rawData.legacyUnits}/${rawData.legacyQuestions}/${rawData.legacySolutions};` +
        `RELEASE:${rawData.releaseUnits}/${rawData.releaseQuestions}/${rawData.releaseSolutions}/${rawData.releaseOutcomes}`,
      releaseState,
      runtimeState,
      pilotState,
    };

    if (baseline.foreignApplicationObjects > 0) {
      const rawForeign = requireOutput(
        runReadOnlySql(
          buildProject004ForeignObjectInspectionSql(root, plan),
          config,
          environment,
          audited.runner,
        ),
        "INCIDENT_FOREIGN_OBJECT_AUDIT_UNAVAILABLE",
      );
      const foreign: SafeForeignObjectInspection =
        parseSafeForeignObjectInspection(rawForeign);
      report.foreignClassification =
        foreign.platformConfigurationProvenance ===
        "SUPABASE_AUTOMATIC_RLS"
          ? "SUPABASE_AUTOMATIC_RLS"
          : `${foreign.objectCategory}/${foreign.schemaCategory}/${foreign.ownerCategory}`;
    } else {
      report.foreignClassification = "NONE";
    }

    report.preexistingRemoteApplicationState =
      migration.count > 0 ||
      baseline.plaveApplicationObjects > 0 ||
      baseline.foreignApplicationObjects > 0
        ? "YES"
        : "NO";
    report.recoveryEligible =
      migration.count === 38 &&
      migration.contiguousPrefix === "PASS" &&
      migration.prefixLast === "0038" &&
      migration.missingMigrations === "0039,0040" &&
      migration.foreignMigrations === 0 &&
      migration.duplicateVersions === 0 &&
      migration.outOfOrderVersions === 0 &&
      migration.checksumDriftCount === 0 &&
      objectAudit.missingObjects === 0 &&
      extraObjects === 0 &&
      baseline.authUserCount === 0 &&
      baseline.storageObjectCount === 0 &&
      rawData.syntheticUsers === 0 &&
      rlsPrivateBoundary === "PASS" &&
      staticDryRunAudit.dryRunArgvContract === "PASS" &&
      staticDryRunAudit.childProcessSequence === "PASS" &&
      staticDryRunAudit.dryRunOutputParser === "PASS" &&
      staticDryRunAudit.fallbackMutationPath === "NOT_FOUND" &&
      staticDryRunAudit.hiddenSchemaPushPath === "NOT_FOUND"
        ? "YES"
        : "NO";
    report.rootFailureCode =
      report.preexistingRemoteApplicationState === "YES"
        ? "REMOTE_PARTIAL_STATE_CONFIRMED"
        : "INCIDENT_STATE_NOT_REPRODUCED";
    report.ok =
      audited.counts.mutation === 0 &&
      audited.counts.unexpected === 0;
    return report;
  } catch (error) {
    report.rootFailureCode = failureCode(error);
    return report;
  }
}
