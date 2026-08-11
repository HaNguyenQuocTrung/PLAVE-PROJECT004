import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import {
  buildUniversalCurriculumRelease,
} from "../lib/curriculum-runtime/release.ts";
import {
  generatedPersistenceMigrationBoundary,
  loadGeneratedPersistenceMigrationInventory,
} from "./project004-generated-persistence-migration-inventory.ts";
import {
  buildProject004PrefixSemanticFingerprintSql,
  parsePrefixSemanticFingerprint,
} from "./project004-prefix-semantic-fingerprint.ts";
import {
  buildResolvedRemoteDatabaseEnvironment,
  resolveProject004RemoteDatabaseEndpoint,
  selectProject004ConnectivityProject,
  type ResolvedRemoteDatabaseEndpoint,
} from "./project004-remote-connectivity-resolver.ts";
import {
  assertLocalIsolation,
  assertRemoteDevTarget,
  buildMigrationPlanFingerprint,
  createCanonicalRemoteDevCommandRunner,
  project004RemoteDevContract,
  type MigrationPlan,
  type RemoteDevPrivateConfig,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import {
  loadProject004RemoteRuntimeConfigFile,
} from "./project004-remote-runtime-connection.ts";
import {
  type RemoteDevCheckState,
  type RemoteDevCommandRunner,
} from "./project004-remote-dev-operations.ts";
import {
  isReadOnlySqlCommand,
} from "./project004-remote-dev-audited-runner.ts";
import { runCanonicalSupabaseCliAuthCheck } from "./project004-supabase-cli-auth.ts";
import {
  buildProject004UniversalActivationPsqlInvocation,
} from "./project004-universal-activation-execution.ts";

const release = buildUniversalCurriculumRelease();
const releaseRow = release.release;

export const project004Migration0041Contract = {
  version: "PROJECT004_REMOTE_MIGRATION_0041_V1",
  targetName: "plave-project004-dev-clean",
  environmentClass: "EMPTY_DEVELOPMENT",
  migrationVersion: "0041",
  migrationName: "generated_practice_semantic_provenance",
  migrationFilename:
    generatedPersistenceMigrationBoundary.migration0041,
  migrationSha256:
    generatedPersistenceMigrationBoundary.migration0041Sha256,
  prefixMigrationCount: 40,
  prefixFirst: "0001",
  prefixLast: "0040",
  prefixSchemaFingerprintSha256:
    project004RemoteDevContract.schemaSemanticFingerprintSha256,
  expectedExistingAttemptRows: 5,
  expectedExistingLearningHistoryRows: 41,
  approval:
    `PROJECT004_REMOTE_MIGRATION_0041_${generatedPersistenceMigrationBoundary.migration0041Sha256.toUpperCase()}_APPLY_ONCE`,
  authorizationStatus:
    "OWNER_APPROVED_FOR_ONE_TIME_APPLY" as
      | "OWNER_APPROVAL_REQUIRED"
      | "OWNER_APPROVED_FOR_ONE_TIME_APPLY",
  approvalReceipt:
    ".project004-remote-migration-0041-approval.local",
} as const;

export type Migration0041RemotePhase =
  | "BEFORE_0041"
  | "ALREADY_APPLIED"
  | "PARTIAL_OR_DRIFTED"
  | "NOT_RUN";

export type Migration0041RemoteQueryStage =
  | "NOT_RUN"
  | "NONE"
  | "CONNECTION_PROBE"
  | "SERVER_CAPABILITY"
  | "MIGRATION_HISTORY_DISCOVERY"
  | "MIGRATION_HISTORY_READ"
  | "SCHEMA_DISCOVERY"
  | "TABLE_CONTRACT"
  | "COLUMN_PROVENANCE"
  | "CONSTRAINT_DISCOVERY"
  | "TRIGGER_DISCOVERY"
  | "FUNCTION_DISCOVERY"
  | "RELEASE_DIAGNOSTIC"
  | "RLS_DIAGNOSTIC";

export type Migration0041RemoteQueryStatementClass =
  | "NOT_RUN"
  | "NONE"
  | "READ_ONLY_CONNECTION_PROBE"
  | "SERVER_CAPABILITY_QUERY"
  | "MIGRATION_HISTORY_CATALOG_QUERY"
  | "MIGRATION_HISTORY_SELECT"
  | "SCHEMA_CATALOG_QUERY"
  | "TABLE_CONTRACT_QUERY"
  | "COLUMN_CATALOG_QUERY"
  | "CONSTRAINT_CATALOG_QUERY"
  | "TRIGGER_CATALOG_QUERY"
  | "FUNCTION_CATALOG_QUERY"
  | "RELEASE_AGGREGATE_QUERY"
  | "RLS_CATALOG_QUERY"
  | "RESPONSE_PARSER";

export type Migration0041RemoteQueryStderrClass =
  | "NOT_RUN"
  | "NONE"
  | "PERMISSION_DENIED"
  | "UNDEFINED_TABLE"
  | "UNDEFINED_COLUMN"
  | "STATEMENT_TIMEOUT"
  | "CONNECTION_FAILURE"
  | "TLS_FAILURE"
  | "AUTHENTICATION_FAILURE"
  | "SQL_ERROR"
  | "OUTPUT_UNRECOGNIZED";

export type Migration0041MissingRoutineClass =
  | "NOT_RUN"
  | "NONE"
  | "ENCODE_WRONG_SCHEMA"
  | "DIGEST_ARRAY_INPUT"
  | "UNSUPPORTED_ROUTINE_SIGNATURE";

export type Migration0041ChecksumCapability =
  | "NOT_RUN"
  | "UNAVAILABLE"
  | "CHECKSUM_TEXT"
  | "CHECKSUM_BYTEA";

export type Migration0041RemoteQueryDiagnostic = {
  sqlstate: string;
  failureStage: Migration0041RemoteQueryStage;
  failedStatementClass:
    Migration0041RemoteQueryStatementClass;
  preconditionId: string;
  stderrClass: Migration0041RemoteQueryStderrClass;
  connectionVerified: RemoteDevCheckState;
  readOnlyVerified: RemoteDevCheckState;
  missingRoutineClass: Migration0041MissingRoutineClass;
};

export type Migration0041RemoteCounts = {
  migrationCount: number;
  prefixMigrationCount: number;
  migrationFirst: string;
  migrationLast: string;
  migration0041Count: number;
  foreignMigrationCount: number;
  migration0041ChecksumMatches: number;
  migration0041SourceHashMatches: number;
  missingMigrationCount: number;
  duplicateMigrationCount: number;
  tableCount: number;
  provenanceFieldCount: number;
  supportFieldCount: number;
  provenanceConstraintCount: number;
  provenanceTriggerCount: number;
  provenanceFunctionCount: number;
  oldStartAuthenticatedExecute: number;
  semanticStartAuthenticatedExecute: number;
  functionGrantLeakCount: number;
  partialProvenanceRowCount: number;
  generatedQuestionRows: number;
  legacyQuestionRows: number;
  pendingQuestionRows: number;
  semanticQuestionRows: number;
  attemptRows: number;
  privateSolutionRows: number;
  generatedAnswerRows: number;
  materializedAnswerRows: number;
  learningHistoryRows: number;
  exactActiveReleaseCount: number;
  otherReleaseCount: number;
  releaseUnits: number;
  releaseQuestions: number;
  releaseSolutions: number;
  releaseOutcomes: number;
  legacyUnits: number;
  legacyQuestions: number;
  legacySolutions: number;
  legacyDiagnosticRows: number;
  adaptiveReleaseCount: number;
  adaptiveExactDisabledCount: number;
  adaptiveEnabledCount: number;
  rlsGapCount: number;
  privateGrantLeakCount: number;
  primaryKeyContractCount: number;
};

export type Migration0041PreflightReport = {
  ok: boolean;
  project004Canonical: RemoteDevCheckState;
  remoteIdentityGuard: RemoteDevCheckState;
  endpointMode: "DIRECT" | "POOLER_SESSION" | "NOT_RUN";
  localPrefixChecksums: RemoteDevCheckState;
  localMigration0041Checksum: RemoteDevCheckState;
  prefixSchemaFingerprint: RemoteDevCheckState | "NOT_APPLICABLE";
  remoteMigration0041Checksum:
    | RemoteDevCheckState
    | "NOT_APPLICABLE"
    | "UNAVAILABLE";
  remoteMigration0041SourceHash:
    | RemoteDevCheckState
    | "NOT_APPLICABLE"
    | "UNAVAILABLE";
  generatedRuntimeRemoteOff: RemoteDevCheckState;
  remotePhase: Migration0041RemotePhase;
  migration0041Eligible: "YES" | "NO";
  releaseContract: RemoteDevCheckState;
  grade1Boundary: RemoteDevCheckState;
  adaptivePilotDisabled: RemoteDevCheckState;
  rlsPrivateBoundary: RemoteDevCheckState;
  counts: Migration0041RemoteCounts | null;
  config: RemoteDevPrivateConfig | null;
  resolvedEndpoint: ResolvedRemoteDatabaseEndpoint | null;
  rootFailureCode: string;
  currentRunMutationPerformed: "NO";
  remoteQuery: Migration0041RemoteQueryDiagnostic;
  remoteMigrationChecksumCapability:
    Migration0041ChecksumCapability;
};

export type Migration0041FailureStage =
  | "NONE"
  | "PSQL_INVOCATION"
  | "PRECONDITION"
  | "MIGRATION_DDL"
  | "POSTCONDITION"
  | "MIGRATION_HISTORY"
  | "TRANSACTION_COMMIT"
  | "RESPONSE_PARSER";

export type Migration0041FailedStatementClass =
  | "NONE"
  | "PSQL_PROCESS"
  | "PRECONDITION_DO_BLOCK"
  | "MIGRATION_DDL"
  | "POSTCONDITION_DO_BLOCK"
  | "MIGRATION_HISTORY_INSERT"
  | "TRANSACTION_CONTROL"
  | "RESPONSE_SENTINEL";

export type Migration0041TransactionDiagnostic = {
  ok: boolean;
  sqlstate: string;
  failureStage: Migration0041FailureStage;
  failedStatementClass: Migration0041FailedStatementClass;
  preconditionId: string;
  parserFailureCode: string;
  sentinelCount: number;
};

export type Migration0041OperationReport = {
  ok: boolean;
  status: "APPLIED" | "ALREADY_APPLIED" | "FAILED";
  preflight: Migration0041PreflightReport;
  postflight: Migration0041PreflightReport | null;
  applyAttempts: number;
  approvalConsumed: boolean;
  postApplyDiagnostic: RemoteDevCheckState;
  historyCountsUnchanged: RemoteDevCheckState;
  transactionRollback:
    | "PASS"
    | "NOT_RUN"
    | "NOT_APPLICABLE"
    | "UNVERIFIED";
  sqlstate: string;
  failureStage: Migration0041FailureStage;
  failedStatementClass: Migration0041FailedStatementClass;
  preconditionId: string;
  currentRunMutationPerformed: "NO" | "YES" | "POSSIBLE";
  rootFailureCode: string;
};

type LocalMigration0041Contract = {
  root: string;
  plan: MigrationPlan;
  migrationSource: string;
  migrationBody: string;
};

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function integer(value: string | undefined) {
  if (!/^\d+$/u.test(value ?? "")) {
    throw new Error("MIGRATION_0041_PREFLIGHT_PAYLOAD_INVALID");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("MIGRATION_0041_PREFLIGHT_PAYLOAD_INVALID");
  }
  return parsed;
}

function stripMigrationTransaction(source: string) {
  const trimmed = source.trim();
  const leading = /^begin;\s*/iu.exec(trimmed);
  const trailing = /\s*commit;$/iu.exec(trimmed);
  if (!leading || !trailing || trailing.index <= leading[0].length) {
    throw new Error("MIGRATION_0041_TRANSACTION_BOUNDARY_INVALID");
  }
  return trimmed.slice(leading[0].length, trailing.index).trim();
}

export function loadMigration0041LocalContract(
  candidateRoot = process.cwd(),
): LocalMigration0041Contract {
  const inventory =
    loadGeneratedPersistenceMigrationInventory(candidateRoot);
  const plan = JSON.parse(
    readFileSync(
      resolve(
        inventory.root,
        project004RemoteDevContract.migrationPlan,
      ),
      "utf8",
    ),
  ) as MigrationPlan;
  const prefix = inventory.entries.slice(0, 40);
  if (
    plan.project !== "PLAVE-PROJECT004" ||
    plan.targetName !== project004Migration0041Contract.targetName ||
    plan.migrationCount !== 40 ||
    plan.migrations.length !== 40 ||
    plan.seedIncluded ||
    plan.activationIncluded ||
    plan.publicationIncluded ||
    buildMigrationPlanFingerprint(plan) !==
      plan.migrationPlanFingerprintSha256 ||
    prefix.some((entry, index) => {
      const planned = plan.migrations[index];
      return (
        planned?.version !== entry.version ||
        planned.file !== entry.filename ||
        planned.sha256 !== entry.sha256
      );
    })
  ) {
    throw new Error("LOCAL_MIGRATIONS_0001_0040_DRIFT");
  }
  const migration = inventory.entries.find(
    (entry) => entry.version === "0041",
  );
  if (
    migration?.version !== "0041" ||
    migration.filename !==
      project004Migration0041Contract.migrationFilename ||
    migration.sha256 !==
      project004Migration0041Contract.migrationSha256
  ) {
    throw new Error("LOCAL_MIGRATION_0041_CHECKSUM_DRIFT");
  }
  const migrationSource = readFileSync(
    migration.absolutePath,
    "utf8",
  );
  return {
    root: inventory.root,
    plan,
    migrationSource,
    migrationBody: stripMigrationTransaction(migrationSource),
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

function runtimeProfileIsSafelyOff(
  root: string,
  config: RemoteDevPrivateConfig,
) {
  const runtime = loadProject004RemoteRuntimeConfigFile(root);
  return (
    runtime.targetName ===
      project004Migration0041Contract.targetName &&
    runtime.projectRef === config.projectRef &&
    runtime.generatedPracticeRuntimeEnabled === "false" &&
    runtime.generatedPracticeMode === "OFF" &&
    runtime.grade2NumbersTo1000Enabled === "false" &&
    runtime.adaptivePracticeRuntimeEnabled === "false" &&
    runtime.controlledPilotEnabled === "false" &&
    runtime.retentionRuntimeEnabled === "false" &&
    runtime.adaptivePilotUserIds === ""
  );
}

const provenanceFields = [
  "semantic_variant_id",
  "semantic_variant_version",
  "solver_version",
  "solver_receipt_hash",
  "difficulty_policy_version",
  "seed_fingerprint",
  "ast_hash",
  "visual_hash",
] as const;

const provenanceConstraints = [
  "curriculum_generated_question_source_check",
  "curriculum_generated_question_provenance_text_check",
  "curriculum_generated_question_provenance_hash_check",
] as const;

const provenanceTriggers = [
  "curriculum_generated_question_pending_insert_guard",
  "curriculum_generated_question_provenance_complete",
  "curriculum_generated_question_provenance_immutable",
] as const;

const provenanceFunctions = [
  "enforce_generated_question_provenance",
  "guard_pending_semantic_insert",
  "prevent_generated_provenance_mutation",
] as const;

function sqlList(values: readonly string[]) {
  return values.map(sqlText).join(", ");
}

export const migration0041RemoteQueryStages = [
  "CONNECTION_PROBE",
  "SERVER_CAPABILITY",
  "MIGRATION_HISTORY_DISCOVERY",
  "MIGRATION_HISTORY_READ",
  "SCHEMA_DISCOVERY",
  "TABLE_CONTRACT",
  "COLUMN_PROVENANCE",
  "CONSTRAINT_DISCOVERY",
  "TRIGGER_DISCOVERY",
  "FUNCTION_DISCOVERY",
  "RELEASE_DIAGNOSTIC",
  "RLS_DIAGNOSTIC",
] as const satisfies readonly Migration0041RemoteQueryStage[];

type ExecutableMigration0041RemoteQueryStage =
  (typeof migration0041RemoteQueryStages)[number];

const remoteQueryStatementClass: Record<
  ExecutableMigration0041RemoteQueryStage,
  Migration0041RemoteQueryStatementClass
> = {
  CONNECTION_PROBE: "READ_ONLY_CONNECTION_PROBE",
  SERVER_CAPABILITY: "SERVER_CAPABILITY_QUERY",
  MIGRATION_HISTORY_DISCOVERY:
    "MIGRATION_HISTORY_CATALOG_QUERY",
  MIGRATION_HISTORY_READ: "MIGRATION_HISTORY_SELECT",
  SCHEMA_DISCOVERY: "SCHEMA_CATALOG_QUERY",
  TABLE_CONTRACT: "TABLE_CONTRACT_QUERY",
  COLUMN_PROVENANCE: "COLUMN_CATALOG_QUERY",
  CONSTRAINT_DISCOVERY: "CONSTRAINT_CATALOG_QUERY",
  TRIGGER_DISCOVERY: "TRIGGER_CATALOG_QUERY",
  FUNCTION_DISCOVERY: "FUNCTION_CATALOG_QUERY",
  RELEASE_DIAGNOSTIC: "RELEASE_AGGREGATE_QUERY",
  RLS_DIAGNOSTIC: "RLS_CATALOG_QUERY",
};

type MigrationHistoryDiscovery = {
  tableExists: number;
  versionColumnExists: number;
  versionTextCompatible: number;
  statementsTextArray: number;
  statementsText: number;
  nameColumnExists: number;
  nameTextCompatible: number;
  checksumColumnExists: number;
  checksumTextCompatible: number;
  checksumByteaCompatible: number;
};

function remoteQuerySentinel(
  stage: ExecutableMigration0041RemoteQueryStage,
) {
  return `${project004Migration0041Contract.version}:QUERY:${stage}`;
}

function readOnlyRemoteQuery(
  stage: ExecutableMigration0041RemoteQueryStage,
  query: string,
) {
  return String.raw`
begin read only;
set local statement_timeout = '30s';
${query.trim()}
rollback;
`;
}

function queryPayload(
  stage: ExecutableMigration0041RemoteQueryStage,
  expressions: readonly string[],
  from = "",
) {
  return readOnlyRemoteQuery(
    stage,
    `select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  ${expressions.join(",\n  ")}
)${from ? `\n${from}` : ""};`,
  );
}

const canonicalPrefixVersionValues = Array.from(
  { length: 40 },
  (_, index) => `('${String(index + 1).padStart(4, "0")}')`,
).join(",\n    ");

export function buildMigration0041RemoteQuerySql(options: {
  stage: ExecutableMigration0041RemoteQueryStage;
  migrationHistory?: MigrationHistoryDiscovery;
}) {
  const stage = options.stage;
  if (stage === "CONNECTION_PROBE") {
    return queryPayload(stage, ["1"]);
  }
  if (stage === "SERVER_CAPABILITY") {
    return queryPayload(stage, [
      "case when current_setting('transaction_read_only') = 'on' then 1 else 0 end",
      "case when current_setting('server_version_num')::integer >= 150000 then 1 else 0 end",
    ]);
  }
  if (stage === "MIGRATION_HISTORY_DISCOVERY") {
    return queryPayload(
      stage,
      [
        "case when count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations') > 0 then 1 else 0 end",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'version')::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'version' and data_type in ('text', 'character varying') and udt_name in ('text', 'varchar'))::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'statements' and data_type = 'ARRAY' and udt_name = '_text')::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'statements' and data_type in ('text', 'character varying') and udt_name in ('text', 'varchar'))::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'name')::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'name' and data_type in ('text', 'character varying') and udt_name in ('text', 'varchar'))::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'checksum')::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'checksum' and data_type in ('text', 'character varying') and udt_name in ('text', 'varchar'))::integer",
        "count(*) filter (where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'checksum' and data_type = 'bytea' and udt_name = 'bytea')::integer",
      ],
      "from information_schema.columns",
    );
  }
  if (stage === "MIGRATION_HISTORY_READ") {
    const discovery = options.migrationHistory;
    if (
      !discovery ||
      discovery.tableExists !== 1 ||
      discovery.versionColumnExists !== 1 ||
      discovery.versionTextCompatible !== 1
    ) {
      throw new Error(
        "MIGRATION_0041_HISTORY_DISCOVERY_REQUIRED",
      );
    }
    const sourceHashExpression =
      discovery.statementsTextArray === 1
        ? `count(*) filter (
      where version::text = '0041'
        and cardinality(statements) = 1
        and pg_catalog.encode(
          extensions.digest(
            statements[1]::text,
            'sha256'::text
          ),
          'hex'::text
        ) = ${sqlText(project004Migration0041Contract.migrationSha256)}
    )::integer`
        : discovery.statementsText === 1
          ? `count(*) filter (
      where version::text = '0041'
        and pg_catalog.encode(
          extensions.digest(
            statements::text,
            'sha256'::text
          ),
          'hex'::text
        ) = ${sqlText(project004Migration0041Contract.migrationSha256)}
    )::integer`
          : "0";
    const checksumExpression =
      discovery.checksumTextCompatible === 1
        ? `count(*) filter (
      where version::text = '0041'
        and pg_catalog.lower(checksum::text) =
          ${sqlText(project004Migration0041Contract.migrationSha256)}
    )::integer`
        : discovery.checksumByteaCompatible === 1
          ? `count(*) filter (
      where version::text = '0041'
        and pg_catalog.encode(
          checksum::bytea,
          'hex'::text
        ) = ${sqlText(project004Migration0041Contract.migrationSha256)}
    )::integer`
          : "0";
    return readOnlyRemoteQuery(
      stage,
      String.raw`
with expected_prefix(version) as (
  values
    ${canonicalPrefixVersionValues}
),
history(version) as (
  select version::text
  from supabase_migrations.schema_migrations
)
select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  count(*)::integer,
  count(*) filter (
    where version::text ~
      '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
  )::integer,
  coalesce(min(version::text), 'NONE'),
  coalesce(max(version::text), 'NONE'),
  count(*) filter (where version::text = '0041')::integer,
  count(*) filter (
    where version::text !~
      '^(000[1-9]|00[12][0-9]|003[0-9]|0040|0041)$'
  )::integer,
  (
    select count(*)
    from expected_prefix as expected
    left join history
      on history.version = expected.version
    where history.version is null
  )::integer,
  (
    select count(*)
    from (
      select history.version
      from history
      group by history.version
      having count(*) > 1
    ) as duplicate
  )::integer,
  ${sourceHashExpression},
  ${checksumExpression}
)
from supabase_migrations.schema_migrations;`,
    );
  }
  if (stage === "SCHEMA_DISCOVERY") {
    return queryPayload(
      stage,
      [
        "count(*) filter (where table_schema = 'public' and table_name = 'curriculum_generated_questions')::integer",
        "count(*) filter (where table_schema = 'private' and table_name = 'curriculum_generated_solutions')::integer",
        "count(*) filter (where table_schema = 'public' and table_name = 'curriculum_generated_answers')::integer",
      ],
      "from information_schema.tables",
    );
  }
  if (stage === "TABLE_CONTRACT") {
    return readOnlyRemoteQuery(
      stage,
      String.raw`
with primary_key_contract as (
  select count(*)::integer as value
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid =
      pg_catalog.to_regclass('public.curriculum_generated_questions')
    and constraint_row.contype = 'p'
    and pg_catalog.pg_get_constraintdef(
      constraint_row.oid,
      true
    ) = 'PRIMARY KEY (attempt_id, question_id)'
),
history_rows as (
  select
    (select count(*) from public.curriculum_attempts)::integer as attempts,
    (
      select count(*)
      from private.curriculum_generated_solutions
    )::integer as private_solutions,
    (
      select count(*)
      from public.curriculum_generated_answers
    )::integer as generated_answers,
    (select count(*) from public.curriculum_answers)::integer
      as materialized_answers,
    (
      (select count(*) from public.practice_attempts)
      + (select count(*) from public.practice_answers)
      + (select count(*) from public.diagnostic_attempts)
      + (select count(*) from public.diagnostic_answers)
      + (select count(*) from public.adaptive_practice_attempts)
      + (select count(*) from public.adaptive_practice_answers)
      + (select count(*) from public.curriculum_attempts)
      + (select count(*) from public.curriculum_answers)
      + (select count(*) from public.curriculum_generated_answers)
      + (select count(*) from public.student_curriculum_unit_progress)
      + (
        select count(*)
        from public.student_curriculum_outcome_progress
      )
      + (select count(*) from public.student_curriculum_skill_progress)
      + (select count(*) from public.assignment_submissions)
      + (select count(*) from public.assignment_answers)
      + (
        select count(*)
        from public.student_assignment_outcome_progress
      )
      + (
        select count(*)
        from public.student_assignment_skill_progress
      )
    )::integer as learning_history_rows
)
select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  primary_key_contract.value,
  history_rows.attempts,
  history_rows.private_solutions,
  history_rows.generated_answers,
  history_rows.materialized_answers,
  history_rows.learning_history_rows
)
from primary_key_contract
cross join history_rows;`,
    );
  }
  if (stage === "COLUMN_PROVENANCE") {
    return readOnlyRemoteQuery(
      stage,
      String.raw`
with column_state as (
  select
    count(*) filter (
      where column_name in (${sqlList(provenanceFields)})
    )::integer as provenance_fields,
    count(*) filter (
      where column_name in (
        'question_source',
        'semantic_provenance_locked'
      )
    )::integer as support_fields
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'curriculum_generated_questions'
),
question_rows as (
  select
    count(*)::integer as total,
    count(*) filter (
      where coalesce(
        pg_catalog.to_jsonb(question) ->> 'question_source',
        'LEGACY_GENERATED_V1'
      ) = 'LEGACY_GENERATED_V1'
    )::integer as legacy_rows,
    count(*) filter (
      where pg_catalog.to_jsonb(question) ->> 'question_source' =
        'PENDING_SEMANTIC_V1'
    )::integer as pending_rows,
    count(*) filter (
      where pg_catalog.to_jsonb(question) ->> 'question_source' =
        'SEMANTIC_GENERATED_V1'
    )::integer as semantic_rows,
    count(*) filter (
      where (
        select count(*)
        from jsonb_each(pg_catalog.to_jsonb(question)) as item(key, value)
        where item.key in (${sqlList(provenanceFields)})
          and item.value <> 'null'::jsonb
      ) between 1 and 7
      or (
        pg_catalog.to_jsonb(question) ->> 'question_source' =
          'SEMANTIC_GENERATED_V1'
        and (
          select count(*)
          from jsonb_each(pg_catalog.to_jsonb(question)) as item(key, value)
          where item.key in (${sqlList(provenanceFields)})
            and item.value <> 'null'::jsonb
        ) <> 8
      )
      or (
        coalesce(
          pg_catalog.to_jsonb(question) ->> 'question_source',
          'LEGACY_GENERATED_V1'
        ) = 'LEGACY_GENERATED_V1'
        and (
          select count(*)
          from jsonb_each(pg_catalog.to_jsonb(question)) as item(key, value)
          where item.key in (${sqlList(provenanceFields)})
            and item.value <> 'null'::jsonb
        ) <> 0
      )
    )::integer as partial_rows
  from public.curriculum_generated_questions as question
)
select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  column_state.provenance_fields,
  column_state.support_fields,
  question_rows.partial_rows,
  question_rows.total,
  question_rows.legacy_rows,
  question_rows.pending_rows,
  question_rows.semantic_rows
)
from column_state
cross join question_rows;`,
    );
  }
  if (stage === "CONSTRAINT_DISCOVERY") {
    return queryPayload(
      stage,
      [
        "count(*) filter (where constraint_row.conname in (" +
          sqlList(provenanceConstraints) +
          "))::integer",
      ],
      `from pg_catalog.pg_constraint as constraint_row
where constraint_row.conrelid =
  pg_catalog.to_regclass('public.curriculum_generated_questions')`,
    );
  }
  if (stage === "TRIGGER_DISCOVERY") {
    return queryPayload(
      stage,
      [
        "count(*) filter (where trigger_row.tgname in (" +
          sqlList(provenanceTriggers) +
          "))::integer",
      ],
      `from pg_catalog.pg_trigger as trigger_row
where trigger_row.tgrelid =
  pg_catalog.to_regclass('public.curriculum_generated_questions')
  and not trigger_row.tgisinternal`,
    );
  }
  if (stage === "FUNCTION_DISCOVERY") {
    return readOnlyRemoteQuery(
      stage,
      String.raw`
with function_state as (
  select (
    count(*) filter (
      where namespace.nspname = 'private'
        and procedure.proname in (${sqlList(provenanceFunctions)})
        and not procedure.prosecdef
        and procedure.proconfig @> array['search_path=""']::text[]
    )
    + count(*) filter (
      where namespace.nspname = 'public'
        and procedure.proname =
          'start_or_resume_semantic_generated_curriculum'
        and pg_catalog.pg_get_function_identity_arguments(
          procedure.oid
        ) = 'p_snapshot jsonb, p_signature text, p_idempotency_key uuid'
        and procedure.prosecdef
        and procedure.proconfig @> array['search_path=""']::text[]
    )
  )::integer as value
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
),
function_grants as (
  select
    case when coalesce(pg_catalog.has_function_privilege(
      'authenticated',
      pg_catalog.to_regprocedure(
        'public.start_or_resume_generated_curriculum(jsonb,text,uuid)'
      ),
      'EXECUTE'
    ), false) then 1 else 0 end as old_authenticated,
    case when coalesce(pg_catalog.has_function_privilege(
      'authenticated',
      pg_catalog.to_regprocedure(
        'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
      ),
      'EXECUTE'
    ), false) then 1 else 0 end as semantic_authenticated,
    (
      case when coalesce(pg_catalog.has_function_privilege(
        'anon',
        pg_catalog.to_regprocedure(
          'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
        ),
        'EXECUTE'
      ), false) then 1 else 0 end
      + (
        select count(*)
        from pg_catalog.pg_proc as procedure
        where procedure.oid = pg_catalog.to_regprocedure(
          'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
        )
          and exists (
            select 1
            from pg_catalog.aclexplode(
              coalesce(
                procedure.proacl,
                pg_catalog.acldefault('f', procedure.proowner)
              )
            ) as privilege
            where privilege.grantee = 0
              and privilege.privilege_type = 'EXECUTE'
          )
      )
      + (
        select count(*)
        from pg_catalog.pg_proc as procedure
        join pg_catalog.pg_namespace as namespace
          on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'private'
          and procedure.proname in (${sqlList(provenanceFunctions)})
          and pg_catalog.has_function_privilege(
            'authenticated',
            procedure.oid,
            'EXECUTE'
          )
      )
    )::integer as leak_count
)
select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  function_state.value,
  function_grants.old_authenticated,
  function_grants.semantic_authenticated,
  function_grants.leak_count
)
from function_state
cross join function_grants;`,
    );
  }
  if (stage === "RELEASE_DIAGNOSTIC") {
    return readOnlyRemoteQuery(
      stage,
      String.raw`
with exact_release as (
  select release.release_id
  from public.curriculum_releases as release
  where release.release_id = ${sqlText(releaseRow.releaseId)}
    and release.content_version =
      ${sqlText(releaseRow.contentVersion)}
    and release.curriculum_source_fingerprint =
      ${sqlText(releaseRow.curriculumSourceFingerprint)}
    and release.generator_version =
      ${sqlText(releaseRow.generatorVersion)}
    and release.deterministic_seed =
      ${sqlText(releaseRow.deterministicSeed)}
    and release.mastery_policy_version =
      ${sqlText(releaseRow.masteryPolicyVersion)}
    and release.public_payload_sha256 =
      ${sqlText(release.hashes.publicPayloadSha256)}
    and release.private_solution_sha256 =
      ${sqlText(release.hashes.privateSolutionSha256)}
    and release.bundle_sha256 =
      ${sqlText(release.hashes.bundleSha256)}
    and release.status = 'ACTIVE'
    and release.activation_state = 'ACTIVE'
    and release.activated_at is not null
    and release.retired_at is null
),
release_counts as (
  select
    count(*) filter (
      where release_id in (select release_id from exact_release)
    )::integer as exact_active,
    count(*) filter (
      where release_id <> ${sqlText(releaseRow.releaseId)}
    )::integer as other_releases
  from public.curriculum_releases
),
bank_counts as (
  select
    (
      select count(*) from public.curriculum_release_units
      where release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as units,
    (
      select count(*) from public.curriculum_release_questions
      where release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as questions,
    (
      select count(*) from private.curriculum_release_solutions
      where release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as solutions,
    (
      select count(distinct expanded.outcome_id)
      from public.curriculum_release_units as unit
      cross join unnest(unit.official_outcome_ids)
        as expanded(outcome_id)
      where unit.release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as outcomes
),
legacy_counts as (
  select
    (select count(*) from public.learning_units)::integer as units,
    (select count(*) from public.questions)::integer as questions,
    (select count(*) from public.question_solutions)::integer as solutions,
    (
      select count(*) from public.grade1_diagnostic_blueprint
    )::integer as diagnostic_rows
),
adaptive_counts as (
  select
    count(*)::integer as total,
    count(*) filter (
      where not runtime_enabled
        and not controlled_pilot_enabled
        and not retention_runtime_enabled
        and publication_status = 'DRAFT'
        and student_visibility = 'HIDDEN'
    )::integer as exact_disabled,
    count(*) filter (
      where runtime_enabled
        or controlled_pilot_enabled
        or retention_runtime_enabled
        or publication_status <> 'DRAFT'
        or student_visibility <> 'HIDDEN'
    )::integer as enabled
  from public.adaptive_practice_releases
)
select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  release_counts.exact_active,
  release_counts.other_releases,
  bank_counts.units,
  bank_counts.questions,
  bank_counts.solutions,
  bank_counts.outcomes,
  legacy_counts.units,
  legacy_counts.questions,
  legacy_counts.solutions,
  legacy_counts.diagnostic_rows,
  adaptive_counts.total,
  adaptive_counts.exact_disabled,
  adaptive_counts.enabled
)
from release_counts
cross join bank_counts
cross join legacy_counts
cross join adaptive_counts;`,
    );
  }
  if (stage === "RLS_DIAGNOSTIC") {
    return readOnlyRemoteQuery(
      stage,
      String.raw`
with rls_gaps as (
  select count(*)::integer as value
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where (namespace.nspname, relation.relname) in (
    ('public', 'curriculum_generated_questions'),
    ('private', 'curriculum_generated_solutions'),
    ('public', 'curriculum_generated_answers')
  )
    and (not relation.relrowsecurity or not relation.relforcerowsecurity)
),
private_grant_leaks as (
  select count(*)::integer as value
  from information_schema.role_table_grants
  where table_schema = 'private'
    and table_name = 'curriculum_generated_solutions'
    and lower(grantee) in ('anon', 'authenticated', 'public')
    and privilege_type in (
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'
    )
)
select concat_ws(
  '|',
  ${sqlText(remoteQuerySentinel(stage))},
  rls_gaps.value,
  private_grant_leaks.value
)
from rls_gaps
cross join private_grant_leaks;`,
    );
  }
  throw new Error("MIGRATION_0041_QUERY_STAGE_INVALID");
}

export function buildMigration0041RemotePreflightSql() {
  return String.raw`
begin read only;
set local statement_timeout = '30s';
with
migration_state as (
  select
    count(*)::integer as total,
    count(*) filter (
      where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
    )::integer as prefix_count,
    coalesce(min(version), 'NONE') as first_version,
    coalesce(max(version), 'NONE') as last_version,
    count(*) filter (where version = '0041')::integer as migration_0041_count,
    count(*) filter (
      where version !~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040|0041)$'
    )::integer as foreign_count,
    count(*) filter (
      where version = '0041'
        and name = ${sqlText(project004Migration0041Contract.migrationName)}
        and cardinality(statements) = 1
        and pg_catalog.encode(
          extensions.digest(
            statements[1]::text,
            'sha256'::text
          ),
          'hex'::text
        ) = ${sqlText(project004Migration0041Contract.migrationSha256)}
    )::integer as checksum_matches
  from supabase_migrations.schema_migrations
),
table_state as (
  select count(*)::integer as table_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name = 'curriculum_generated_questions'
),
column_state as (
  select
    count(*) filter (
      where column_name in (${sqlList(provenanceFields)})
    )::integer as provenance_fields,
    count(*) filter (
      where column_name in (
        'question_source',
        'semantic_provenance_locked'
      )
    )::integer as support_fields
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'curriculum_generated_questions'
),
constraint_state as (
  select count(*)::integer as value
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid =
      pg_catalog.to_regclass('public.curriculum_generated_questions')
    and constraint_row.conname in (${sqlList(provenanceConstraints)})
),
trigger_state as (
  select count(*)::integer as value
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid =
      pg_catalog.to_regclass('public.curriculum_generated_questions')
    and not trigger_row.tgisinternal
    and trigger_row.tgname in (${sqlList(provenanceTriggers)})
),
function_state as (
  select (
    count(*) filter (
      where namespace.nspname = 'private'
        and procedure.proname in (${sqlList(provenanceFunctions)})
        and not procedure.prosecdef
        and procedure.proconfig @> array['search_path=""']::text[]
    )
    + count(*) filter (
      where namespace.nspname = 'public'
        and procedure.proname =
          'start_or_resume_semantic_generated_curriculum'
        and pg_catalog.pg_get_function_identity_arguments(
          procedure.oid
        ) = 'p_snapshot jsonb, p_signature text, p_idempotency_key uuid'
        and procedure.prosecdef
        and procedure.proconfig @> array['search_path=""']::text[]
    )
  )::integer as value
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
),
function_grants as (
  select
    case when coalesce(pg_catalog.has_function_privilege(
      'authenticated',
      pg_catalog.to_regprocedure(
        'public.start_or_resume_generated_curriculum(jsonb,text,uuid)'
      ),
      'EXECUTE'
    ), false) then 1 else 0 end as old_authenticated,
    case when coalesce(pg_catalog.has_function_privilege(
      'authenticated',
      pg_catalog.to_regprocedure(
        'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
      ),
      'EXECUTE'
    ), false) then 1 else 0 end as semantic_authenticated,
    (
      case when coalesce(pg_catalog.has_function_privilege(
        'anon',
        pg_catalog.to_regprocedure(
          'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
        ),
        'EXECUTE'
      ), false) then 1 else 0 end
      + (
        select count(*)
        from pg_catalog.pg_proc as procedure
        where procedure.oid = pg_catalog.to_regprocedure(
          'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
        )
          and exists (
            select 1
            from pg_catalog.aclexplode(
              coalesce(
                procedure.proacl,
                pg_catalog.acldefault('f', procedure.proowner)
              )
            ) as privilege
            where privilege.grantee = 0
              and privilege.privilege_type = 'EXECUTE'
          )
      )
      + (
        select count(*)
        from pg_catalog.pg_proc as procedure
        join pg_catalog.pg_namespace as namespace
          on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'private'
          and procedure.proname in (${sqlList(provenanceFunctions)})
          and pg_catalog.has_function_privilege(
            'authenticated',
            procedure.oid,
            'EXECUTE'
          )
      )
    )::integer as leak_count
),
question_rows as (
  select
    count(*)::integer as total,
    count(*) filter (
      where coalesce(
        pg_catalog.to_jsonb(question) ->> 'question_source',
        'LEGACY_GENERATED_V1'
      ) = 'LEGACY_GENERATED_V1'
    )::integer as legacy_rows,
    count(*) filter (
      where pg_catalog.to_jsonb(question) ->> 'question_source' =
        'PENDING_SEMANTIC_V1'
    )::integer as pending_rows,
    count(*) filter (
      where pg_catalog.to_jsonb(question) ->> 'question_source' =
        'SEMANTIC_GENERATED_V1'
    )::integer as semantic_rows,
    count(*) filter (
      where (
        select count(*)
        from jsonb_each(pg_catalog.to_jsonb(question)) as item(key, value)
        where item.key in (${sqlList(provenanceFields)})
          and item.value <> 'null'::jsonb
      ) between 1 and 7
      or (
        pg_catalog.to_jsonb(question) ->> 'question_source' =
          'SEMANTIC_GENERATED_V1'
        and (
          select count(*)
          from jsonb_each(pg_catalog.to_jsonb(question)) as item(key, value)
          where item.key in (${sqlList(provenanceFields)})
            and item.value <> 'null'::jsonb
        ) <> 8
      )
      or (
        coalesce(
          pg_catalog.to_jsonb(question) ->> 'question_source',
          'LEGACY_GENERATED_V1'
        ) = 'LEGACY_GENERATED_V1'
        and (
          select count(*)
          from jsonb_each(pg_catalog.to_jsonb(question)) as item(key, value)
          where item.key in (${sqlList(provenanceFields)})
            and item.value <> 'null'::jsonb
        ) <> 0
      )
    )::integer as partial_rows
  from public.curriculum_generated_questions as question
),
history_rows as (
  select
    (select count(*) from public.curriculum_attempts)::integer as attempts,
    (
      select count(*) from private.curriculum_generated_solutions
    )::integer as private_solutions,
    (
      select count(*) from public.curriculum_generated_answers
    )::integer as generated_answers,
    (select count(*) from public.curriculum_answers)::integer
      as materialized_answers,
    (
      (select count(*) from public.practice_attempts)
      + (select count(*) from public.practice_answers)
      + (select count(*) from public.diagnostic_attempts)
      + (select count(*) from public.diagnostic_answers)
      + (select count(*) from public.adaptive_practice_attempts)
      + (select count(*) from public.adaptive_practice_answers)
      + (select count(*) from public.curriculum_attempts)
      + (select count(*) from public.curriculum_answers)
      + (select count(*) from public.curriculum_generated_answers)
      + (
        select count(*)
        from public.student_curriculum_unit_progress
      )
      + (
        select count(*)
        from public.student_curriculum_outcome_progress
      )
      + (
        select count(*)
        from public.student_curriculum_skill_progress
      )
      + (select count(*) from public.assignment_submissions)
      + (select count(*) from public.assignment_answers)
      + (
        select count(*)
        from public.student_assignment_outcome_progress
      )
      + (
        select count(*)
        from public.student_assignment_skill_progress
      )
    )::integer as learning_history_rows
),
exact_release as (
  select release.release_id
  from public.curriculum_releases as release
  where release.release_id = ${sqlText(releaseRow.releaseId)}
    and release.content_version =
      ${sqlText(releaseRow.contentVersion)}
    and release.curriculum_source_fingerprint =
      ${sqlText(releaseRow.curriculumSourceFingerprint)}
    and release.generator_version =
      ${sqlText(releaseRow.generatorVersion)}
    and release.deterministic_seed =
      ${sqlText(releaseRow.deterministicSeed)}
    and release.mastery_policy_version =
      ${sqlText(releaseRow.masteryPolicyVersion)}
    and release.public_payload_sha256 =
      ${sqlText(release.hashes.publicPayloadSha256)}
    and release.private_solution_sha256 =
      ${sqlText(release.hashes.privateSolutionSha256)}
    and release.bundle_sha256 =
      ${sqlText(release.hashes.bundleSha256)}
    and release.status = 'ACTIVE'
    and release.activation_state = 'ACTIVE'
    and release.activated_at is not null
    and release.retired_at is null
),
release_counts as (
  select
    count(*) filter (
      where release_id in (select release_id from exact_release)
    )::integer as exact_active,
    count(*) filter (
      where release_id <> ${sqlText(releaseRow.releaseId)}
    )::integer as other_releases
  from public.curriculum_releases
),
bank_counts as (
  select
    (
      select count(*) from public.curriculum_release_units
      where release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as units,
    (
      select count(*) from public.curriculum_release_questions
      where release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as questions,
    (
      select count(*) from private.curriculum_release_solutions
      where release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as solutions,
    (
      select count(distinct expanded.outcome_id)
      from public.curriculum_release_units as unit
      cross join unnest(unit.official_outcome_ids)
        as expanded(outcome_id)
      where unit.release_id = ${sqlText(releaseRow.releaseId)}
    )::integer as outcomes
),
legacy_counts as (
  select
    (select count(*) from public.learning_units)::integer as units,
    (select count(*) from public.questions)::integer as questions,
    (select count(*) from public.question_solutions)::integer as solutions,
    (
      select count(*) from public.grade1_diagnostic_blueprint
    )::integer as diagnostic_rows
),
adaptive_counts as (
  select
    count(*)::integer as total,
    count(*) filter (
      where not runtime_enabled
        and not controlled_pilot_enabled
        and not retention_runtime_enabled
        and publication_status = 'DRAFT'
        and student_visibility = 'HIDDEN'
    )::integer as exact_disabled,
    count(*) filter (
      where runtime_enabled
        or controlled_pilot_enabled
        or retention_runtime_enabled
        or publication_status <> 'DRAFT'
        or student_visibility <> 'HIDDEN'
    )::integer as enabled
  from public.adaptive_practice_releases
),
rls_gaps as (
  select count(*)::integer as value
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where (namespace.nspname, relation.relname) in (
    ('public', 'curriculum_generated_questions'),
    ('private', 'curriculum_generated_solutions'),
    ('public', 'curriculum_generated_answers')
  )
    and (not relation.relrowsecurity or not relation.relforcerowsecurity)
),
private_grant_leaks as (
  select count(*)::integer as value
  from information_schema.role_table_grants
  where table_schema = 'private'
    and table_name = 'curriculum_generated_solutions'
    and lower(grantee) in ('anon', 'authenticated', 'public')
    and privilege_type in (
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'
    )
),
primary_key_contract as (
  select count(*)::integer as value
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid =
      pg_catalog.to_regclass('public.curriculum_generated_questions')
    and constraint_row.contype = 'p'
    and pg_catalog.pg_get_constraintdef(
      constraint_row.oid,
      true
    ) = 'PRIMARY KEY (attempt_id, question_id)'
)
select concat_ws(
  '|',
  '${project004Migration0041Contract.version}:PREFLIGHT',
  migration.total,
  migration.prefix_count,
  migration.first_version,
  migration.last_version,
  migration.migration_0041_count,
  migration.foreign_count,
  migration.checksum_matches,
  table_state.table_count,
  column_state.provenance_fields,
  column_state.support_fields,
  constraint_state.value,
  trigger_state.value,
  function_state.value,
  function_grants.old_authenticated,
  function_grants.semantic_authenticated,
  function_grants.leak_count,
  question_rows.partial_rows,
  question_rows.total,
  question_rows.legacy_rows,
  question_rows.pending_rows,
  question_rows.semantic_rows,
  history_rows.attempts,
  history_rows.private_solutions,
  history_rows.generated_answers,
  history_rows.materialized_answers,
  history_rows.learning_history_rows,
  release_counts.exact_active,
  release_counts.other_releases,
  bank_counts.units,
  bank_counts.questions,
  bank_counts.solutions,
  bank_counts.outcomes,
  legacy_counts.units,
  legacy_counts.questions,
  legacy_counts.solutions,
  legacy_counts.diagnostic_rows,
  adaptive_counts.total,
  adaptive_counts.exact_disabled,
  adaptive_counts.enabled,
  rls_gaps.value,
  private_grant_leaks.value,
  primary_key_contract.value
)
from migration_state as migration
cross join table_state
cross join column_state
cross join constraint_state
cross join trigger_state
cross join function_state
cross join function_grants
cross join question_rows
cross join history_rows
cross join release_counts
cross join bank_counts
cross join legacy_counts
cross join adaptive_counts
cross join rls_gaps
cross join private_grant_leaks
cross join primary_key_contract;
rollback;
`;
}

export function parseMigration0041RemotePreflight(
  output: string,
): Migration0041RemoteCounts {
  const rows = output
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) =>
      line.startsWith(
        `${project004Migration0041Contract.version}:PREFLIGHT|`,
      )
    );
  if (rows.length !== 1) {
    throw new Error("MIGRATION_0041_PREFLIGHT_PAYLOAD_INVALID");
  }
  const fields = rows[0]?.split("|") ?? [];
  if (fields.length !== 43) {
    throw new Error("MIGRATION_0041_PREFLIGHT_PAYLOAD_INVALID");
  }
  return {
    migrationCount: integer(fields[1]),
    prefixMigrationCount: integer(fields[2]),
    migrationFirst: fields[3] ?? "",
    migrationLast: fields[4] ?? "",
    migration0041Count: integer(fields[5]),
    foreignMigrationCount: integer(fields[6]),
    migration0041ChecksumMatches: integer(fields[7]),
    migration0041SourceHashMatches: integer(fields[7]),
    missingMigrationCount: 0,
    duplicateMigrationCount: 0,
    tableCount: integer(fields[8]),
    provenanceFieldCount: integer(fields[9]),
    supportFieldCount: integer(fields[10]),
    provenanceConstraintCount: integer(fields[11]),
    provenanceTriggerCount: integer(fields[12]),
    provenanceFunctionCount: integer(fields[13]),
    oldStartAuthenticatedExecute: integer(fields[14]),
    semanticStartAuthenticatedExecute: integer(fields[15]),
    functionGrantLeakCount: integer(fields[16]),
    partialProvenanceRowCount: integer(fields[17]),
    generatedQuestionRows: integer(fields[18]),
    legacyQuestionRows: integer(fields[19]),
    pendingQuestionRows: integer(fields[20]),
    semanticQuestionRows: integer(fields[21]),
    attemptRows: integer(fields[22]),
    privateSolutionRows: integer(fields[23]),
    generatedAnswerRows: integer(fields[24]),
    materializedAnswerRows: integer(fields[25]),
    learningHistoryRows: integer(fields[26]),
    exactActiveReleaseCount: integer(fields[27]),
    otherReleaseCount: integer(fields[28]),
    releaseUnits: integer(fields[29]),
    releaseQuestions: integer(fields[30]),
    releaseSolutions: integer(fields[31]),
    releaseOutcomes: integer(fields[32]),
    legacyUnits: integer(fields[33]),
    legacyQuestions: integer(fields[34]),
    legacySolutions: integer(fields[35]),
    legacyDiagnosticRows: integer(fields[36]),
    adaptiveReleaseCount: integer(fields[37]),
    adaptiveExactDisabledCount: integer(fields[38]),
    adaptiveEnabledCount: integer(fields[39]),
    rlsGapCount: integer(fields[40]),
    privateGrantLeakCount: integer(fields[41]),
    primaryKeyContractCount: integer(fields[42]),
  };
}

class Migration0041RemoteQueryError extends Error {
  readonly diagnostic: Migration0041RemoteQueryDiagnostic;

  constructor(
    code: string,
    diagnostic: Migration0041RemoteQueryDiagnostic,
  ) {
    super(code);
    this.diagnostic = diagnostic;
  }
}

function emptyRemoteQueryDiagnostic():
  Migration0041RemoteQueryDiagnostic {
  return {
    sqlstate: "NOT_RUN",
    failureStage: "NOT_RUN",
    failedStatementClass: "NOT_RUN",
    preconditionId: "NOT_RUN",
    stderrClass: "NOT_RUN",
    connectionVerified: "NOT_RUN",
    readOnlyVerified: "NOT_RUN",
    missingRoutineClass: "NOT_RUN",
  };
}

export function classifyMigration0041MissingRoutine(
  result: SafeCommandResult,
): Migration0041MissingRoutineClass {
  if (remoteQuerySqlstate(result) !== "42883") return "NONE";
  const output = `${result.stdout}\n${result.stderr}`
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
  if (/extensions[.]encode\s*\(\s*bytea/iu.test(output)) {
    return "ENCODE_WRONG_SCHEMA";
  }
  if (/digest\s*\(\s*(?:text|character varying)\[\]/iu.test(output)) {
    return "DIGEST_ARRAY_INPUT";
  }
  return "UNSUPPORTED_ROUTINE_SIGNATURE";
}

function remoteQuerySqlstate(result: SafeCommandResult) {
  const output = `${result.stdout}\n${result.stderr}`
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
  return (
    output.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5}):/iu)?.[1] ??
    output.match(
      /\bSQLSTATE(?:\s*[:=]|\s+)([0-9A-Z]{5})\b/iu,
    )?.[1] ??
    "UNKNOWN"
  ).toUpperCase();
}

export function classifyMigration0041RemoteQueryStderr(
  result: SafeCommandResult,
): Migration0041RemoteQueryStderrClass {
  const sqlstate = remoteQuerySqlstate(result);
  const output = `${result.stdout}\n${result.stderr}`;
  if (
    result.timedOut ||
    sqlstate === "57014" ||
    /statement timeout|canceling statement due to/iu.test(output)
  ) {
    return "STATEMENT_TIMEOUT";
  }
  if (
    sqlstate === "28P01" ||
    /password authentication failed|invalid password/iu.test(output)
  ) {
    return "AUTHENTICATION_FAILURE";
  }
  if (
    sqlstate === "42501" ||
    /permission denied|must be owner|insufficient privilege/iu.test(
      output,
    )
  ) {
    return "PERMISSION_DENIED";
  }
  if (
    sqlstate === "42P01" ||
    /relation .* does not exist/iu.test(output)
  ) {
    return "UNDEFINED_TABLE";
  }
  if (
    sqlstate === "42703" ||
    /column .* does not exist/iu.test(output)
  ) {
    return "UNDEFINED_COLUMN";
  }
  if (
    /ssl error|tls error|certificate|ssl handshake/iu.test(output)
  ) {
    return "TLS_FAILURE";
  }
  if (
    sqlstate.startsWith("08") ||
    /connection refused|connection timed out|server closed the connection|could not connect/iu.test(
      output,
    )
  ) {
    return "CONNECTION_FAILURE";
  }
  return "SQL_ERROR";
}

function remoteQueryFailureCode(
  stderrClass: Migration0041RemoteQueryStderrClass,
) {
  const codes: Partial<
    Record<Migration0041RemoteQueryStderrClass, string>
  > = {
    PERMISSION_DENIED:
      "MIGRATION_0041_QUERY_PERMISSION_DENIED",
    UNDEFINED_TABLE:
      "MIGRATION_0041_QUERY_UNDEFINED_TABLE",
    UNDEFINED_COLUMN:
      "MIGRATION_0041_QUERY_UNDEFINED_COLUMN",
    STATEMENT_TIMEOUT:
      "MIGRATION_0041_QUERY_TIMEOUT",
    CONNECTION_FAILURE:
      "MIGRATION_0041_QUERY_CONNECTION_FAILED",
    TLS_FAILURE: "MIGRATION_0041_QUERY_TLS_FAILED",
    AUTHENTICATION_FAILURE:
      "MIGRATION_0041_QUERY_AUTHENTICATION_FAILED",
    OUTPUT_UNRECOGNIZED:
      "MIGRATION_0041_QUERY_OUTPUT_UNRECOGNIZED",
    SQL_ERROR: "MIGRATION_0041_QUERY_SQL_ERROR",
  };
  return codes[stderrClass] ?? "MIGRATION_0041_REMOTE_QUERY_FAILED";
}

function parseRemoteQueryPayload(
  result: SafeCommandResult,
  stage: ExecutableMigration0041RemoteQueryStage,
  expectedValueCount: number,
  queryState: Migration0041RemoteQueryDiagnostic,
) {
  const statementClass = remoteQueryStatementClass[stage];
  if (!result.ok) {
    const stderrClass =
      classifyMigration0041RemoteQueryStderr(result);
    const missingRoutineClass =
      classifyMigration0041MissingRoutine(result);
    throw new Migration0041RemoteQueryError(
      missingRoutineClass === "NONE"
        ? remoteQueryFailureCode(stderrClass)
        : "MIGRATION_0041_QUERY_ROUTINE_UNSUPPORTED",
      {
        ...queryState,
        sqlstate: remoteQuerySqlstate(result),
        failureStage: stage,
        failedStatementClass: statementClass,
        preconditionId: "NONE",
        stderrClass,
        missingRoutineClass,
      },
    );
  }
  const sentinel = remoteQuerySentinel(stage);
  const rows = `${result.stdout}\n${result.stderr}`
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${sentinel}|`));
  const fields = rows[0]?.split("|") ?? [];
  if (
    rows.length !== 1 ||
    fields.length !== expectedValueCount + 1
  ) {
    throw new Migration0041RemoteQueryError(
      "MIGRATION_0041_QUERY_OUTPUT_UNRECOGNIZED",
      {
        ...queryState,
        sqlstate: "NONE",
        failureStage: stage,
        failedStatementClass: "RESPONSE_PARSER",
        preconditionId: `${stage}_PAYLOAD`,
        stderrClass: "OUTPUT_UNRECOGNIZED",
        missingRoutineClass: "NONE",
      },
    );
  }
  return fields.slice(1);
}

function stageIntegers(
  result: SafeCommandResult,
  stage: ExecutableMigration0041RemoteQueryStage,
  expectedValueCount: number,
  queryState: Migration0041RemoteQueryDiagnostic,
) {
  return parseRemoteQueryPayload(
    result,
    stage,
    expectedValueCount,
    queryState,
  ).map((value) => integer(value));
}

function throwRemoteQueryPrecondition(
  stage: ExecutableMigration0041RemoteQueryStage,
  preconditionId: string,
  queryState: Migration0041RemoteQueryDiagnostic,
  code: string,
): never {
  throw new Migration0041RemoteQueryError(code, {
    ...queryState,
    sqlstate: "NONE",
    failureStage: stage,
    failedStatementClass: remoteQueryStatementClass[stage],
    preconditionId,
    stderrClass: "NONE",
    missingRoutineClass: "NONE",
  });
}

function emptyRemoteCounts(): Migration0041RemoteCounts {
  return {
    migrationCount: 0,
    prefixMigrationCount: 0,
    migrationFirst: "NONE",
    migrationLast: "NONE",
    migration0041Count: 0,
    foreignMigrationCount: 0,
    migration0041ChecksumMatches: 0,
    migration0041SourceHashMatches: 0,
    missingMigrationCount: 0,
    duplicateMigrationCount: 0,
    tableCount: 0,
    provenanceFieldCount: 0,
    supportFieldCount: 0,
    provenanceConstraintCount: 0,
    provenanceTriggerCount: 0,
    provenanceFunctionCount: 0,
    oldStartAuthenticatedExecute: 0,
    semanticStartAuthenticatedExecute: 0,
    functionGrantLeakCount: 0,
    partialProvenanceRowCount: 0,
    generatedQuestionRows: 0,
    legacyQuestionRows: 0,
    pendingQuestionRows: 0,
    semanticQuestionRows: 0,
    attemptRows: 0,
    privateSolutionRows: 0,
    generatedAnswerRows: 0,
    materializedAnswerRows: 0,
    learningHistoryRows: 0,
    exactActiveReleaseCount: 0,
    otherReleaseCount: 0,
    releaseUnits: 0,
    releaseQuestions: 0,
    releaseSolutions: 0,
    releaseOutcomes: 0,
    legacyUnits: 0,
    legacyQuestions: 0,
    legacySolutions: 0,
    legacyDiagnosticRows: 0,
    adaptiveReleaseCount: 0,
    adaptiveExactDisabledCount: 0,
    adaptiveEnabledCount: 0,
    rlsGapCount: 0,
    privateGrantLeakCount: 0,
    primaryKeyContractCount: 0,
  };
}

function executeMigration0041RemoteStateQueries(options: {
  runner: RemoteDevCommandRunner;
  config: RemoteDevPrivateConfig;
  endpoint: ResolvedRemoteDatabaseEndpoint;
  environment: NodeJS.ProcessEnv;
  diagnostic: Migration0041RemoteQueryDiagnostic;
}) {
  const counts = emptyRemoteCounts();
  const queryState = options.diagnostic;
  const execute = (
    stage: ExecutableMigration0041RemoteQueryStage,
    history?: MigrationHistoryDiscovery,
  ) =>
    runPsql(
      options.runner,
      buildMigration0041RemoteQuerySql({
        stage,
        migrationHistory: history,
      }),
      options.config,
      options.endpoint,
      options.environment,
    );

  const connection = stageIntegers(
    execute("CONNECTION_PROBE"),
    "CONNECTION_PROBE",
    1,
    queryState,
  );
  if (connection[0] !== 1) {
    throwRemoteQueryPrecondition(
      "CONNECTION_PROBE",
      "READ_ONLY_SELECT_1",
      queryState,
      "MIGRATION_0041_QUERY_CONNECTION_PROBE_REJECTED",
    );
  }
  queryState.connectionVerified = "PASS";

  const capability = stageIntegers(
    execute("SERVER_CAPABILITY"),
    "SERVER_CAPABILITY",
    2,
    queryState,
  );
  if (capability[0] !== 1) {
    throwRemoteQueryPrecondition(
      "SERVER_CAPABILITY",
      "TRANSACTION_READ_ONLY",
      queryState,
      "MIGRATION_0041_QUERY_NOT_READ_ONLY",
    );
  }
  if (capability[1] !== 1) {
    throwRemoteQueryPrecondition(
      "SERVER_CAPABILITY",
      "POSTGRES_VERSION",
      queryState,
      "MIGRATION_0041_SERVER_CAPABILITY_REJECTED",
    );
  }
  queryState.readOnlyVerified = "PASS";

  const discoveryValues = stageIntegers(
    execute("MIGRATION_HISTORY_DISCOVERY"),
    "MIGRATION_HISTORY_DISCOVERY",
    10,
    queryState,
  );
  const discovery: MigrationHistoryDiscovery = {
    tableExists: discoveryValues[0] ?? 0,
    versionColumnExists: discoveryValues[1] ?? 0,
    versionTextCompatible: discoveryValues[2] ?? 0,
    statementsTextArray: discoveryValues[3] ?? 0,
    statementsText: discoveryValues[4] ?? 0,
    nameColumnExists: discoveryValues[5] ?? 0,
    nameTextCompatible: discoveryValues[6] ?? 0,
    checksumColumnExists: discoveryValues[7] ?? 0,
    checksumTextCompatible: discoveryValues[8] ?? 0,
    checksumByteaCompatible: discoveryValues[9] ?? 0,
  };
  if (discovery.tableExists !== 1) {
    throwRemoteQueryPrecondition(
      "MIGRATION_HISTORY_DISCOVERY",
      "MIGRATION_HISTORY_TABLE",
      queryState,
      "MIGRATION_0041_HISTORY_TABLE_UNAVAILABLE",
    );
  }
  if (discovery.versionColumnExists !== 1) {
    throwRemoteQueryPrecondition(
      "MIGRATION_HISTORY_DISCOVERY",
      "MIGRATION_HISTORY_VERSION_COLUMN",
      queryState,
      "MIGRATION_0041_HISTORY_VERSION_UNAVAILABLE",
    );
  }
  if (discovery.versionTextCompatible !== 1) {
    throwRemoteQueryPrecondition(
      "MIGRATION_HISTORY_DISCOVERY",
      "MIGRATION_HISTORY_VERSION_TYPE",
      queryState,
      "MIGRATION_0041_HISTORY_VERSION_TYPE_UNSUPPORTED",
    );
  }

  const historyResult = execute(
    "MIGRATION_HISTORY_READ",
    discovery,
  );
  const historyPayload = parseRemoteQueryPayload(
    historyResult,
    "MIGRATION_HISTORY_READ",
    10,
    queryState,
  );
  counts.migrationCount = integer(historyPayload[0]);
  counts.prefixMigrationCount = integer(historyPayload[1]);
  counts.migrationFirst = historyPayload[2] ?? "";
  counts.migrationLast = historyPayload[3] ?? "";
  counts.migration0041Count = integer(historyPayload[4]);
  counts.foreignMigrationCount = integer(historyPayload[5]);
  counts.missingMigrationCount = integer(historyPayload[6]);
  counts.duplicateMigrationCount = integer(historyPayload[7]);
  counts.migration0041SourceHashMatches = integer(
    historyPayload[8],
  );
  counts.migration0041ChecksumMatches = integer(
    historyPayload[9],
  );

  const schema = stageIntegers(
    execute("SCHEMA_DISCOVERY"),
    "SCHEMA_DISCOVERY",
    3,
    queryState,
  );
  if (schema.some((value) => value !== 1)) {
    throwRemoteQueryPrecondition(
      "SCHEMA_DISCOVERY",
      "GENERATED_PRACTICE_SCHEMA",
      queryState,
      "MIGRATION_0041_REQUIRED_SCHEMA_UNAVAILABLE",
    );
  }
  counts.tableCount = schema[0] ?? 0;

  const table = stageIntegers(
    execute("TABLE_CONTRACT"),
    "TABLE_CONTRACT",
    6,
    queryState,
  );
  [
    counts.primaryKeyContractCount,
    counts.attemptRows,
    counts.privateSolutionRows,
    counts.generatedAnswerRows,
    counts.materializedAnswerRows,
    counts.learningHistoryRows,
  ] = table;

  const columns = stageIntegers(
    execute("COLUMN_PROVENANCE"),
    "COLUMN_PROVENANCE",
    7,
    queryState,
  );
  [
    counts.provenanceFieldCount,
    counts.supportFieldCount,
    counts.partialProvenanceRowCount,
    counts.generatedQuestionRows,
    counts.legacyQuestionRows,
    counts.pendingQuestionRows,
    counts.semanticQuestionRows,
  ] = columns;

  [counts.provenanceConstraintCount] = stageIntegers(
    execute("CONSTRAINT_DISCOVERY"),
    "CONSTRAINT_DISCOVERY",
    1,
    queryState,
  );
  [counts.provenanceTriggerCount] = stageIntegers(
    execute("TRIGGER_DISCOVERY"),
    "TRIGGER_DISCOVERY",
    1,
    queryState,
  );
  const functions = stageIntegers(
    execute("FUNCTION_DISCOVERY"),
    "FUNCTION_DISCOVERY",
    4,
    queryState,
  );
  [
    counts.provenanceFunctionCount,
    counts.oldStartAuthenticatedExecute,
    counts.semanticStartAuthenticatedExecute,
    counts.functionGrantLeakCount,
  ] = functions;

  const releaseValues = stageIntegers(
    execute("RELEASE_DIAGNOSTIC"),
    "RELEASE_DIAGNOSTIC",
    13,
    queryState,
  );
  [
    counts.exactActiveReleaseCount,
    counts.otherReleaseCount,
    counts.releaseUnits,
    counts.releaseQuestions,
    counts.releaseSolutions,
    counts.releaseOutcomes,
    counts.legacyUnits,
    counts.legacyQuestions,
    counts.legacySolutions,
    counts.legacyDiagnosticRows,
    counts.adaptiveReleaseCount,
    counts.adaptiveExactDisabledCount,
    counts.adaptiveEnabledCount,
  ] = releaseValues;

  [
    counts.rlsGapCount,
    counts.privateGrantLeakCount,
  ] = stageIntegers(
    execute("RLS_DIAGNOSTIC"),
    "RLS_DIAGNOSTIC",
    2,
    queryState,
  );
  queryState.sqlstate = "NONE";
  queryState.failureStage = "NONE";
  queryState.failedStatementClass = "NONE";
  queryState.preconditionId = "NONE";
  queryState.stderrClass = "NONE";
  queryState.missingRoutineClass = "NONE";
  const checksumCapability: Migration0041ChecksumCapability =
    discovery.checksumTextCompatible === 1
      ? "CHECKSUM_TEXT"
      : discovery.checksumByteaCompatible === 1
        ? "CHECKSUM_BYTEA"
        : "UNAVAILABLE";
  return { counts, checksumCapability };
}

function commonRemoteStatePass(counts: Migration0041RemoteCounts) {
  return (
    counts.prefixMigrationCount === 40 &&
    counts.foreignMigrationCount === 0 &&
    counts.missingMigrationCount === 0 &&
    counts.duplicateMigrationCount === 0 &&
    counts.tableCount === 1 &&
    counts.partialProvenanceRowCount === 0 &&
    counts.primaryKeyContractCount === 1
  );
}

export function classifyMigration0041RemotePhase(
  counts: Migration0041RemoteCounts,
) {
  const common = commonRemoteStatePass(counts);
  const before =
    common &&
    counts.migrationCount === 40 &&
    counts.migrationFirst === "0001" &&
    counts.migrationLast === "0040" &&
    counts.migration0041Count === 0 &&
    counts.migration0041ChecksumMatches === 0 &&
    counts.migration0041SourceHashMatches === 0 &&
    counts.provenanceFieldCount === 0 &&
    counts.supportFieldCount === 0 &&
    counts.provenanceConstraintCount === 0 &&
    counts.provenanceTriggerCount === 0 &&
    counts.provenanceFunctionCount === 0 &&
    counts.oldStartAuthenticatedExecute === 1 &&
    counts.semanticStartAuthenticatedExecute === 0 &&
    counts.functionGrantLeakCount === 0 &&
    counts.generatedQuestionRows === counts.legacyQuestionRows &&
    counts.pendingQuestionRows === 0 &&
    counts.semanticQuestionRows === 0;
  if (before) return "BEFORE_0041" as const;
  const applied =
    common &&
    counts.migrationCount === 41 &&
    counts.migrationFirst === "0001" &&
    counts.migrationLast === "0041" &&
    counts.migration0041Count === 1 &&
    (counts.migration0041ChecksumMatches === 1 ||
      counts.migration0041SourceHashMatches === 1) &&
    counts.provenanceFieldCount === 8 &&
    counts.supportFieldCount === 2 &&
    counts.provenanceConstraintCount === 3 &&
    counts.provenanceTriggerCount === 3 &&
    counts.provenanceFunctionCount === 4 &&
    counts.oldStartAuthenticatedExecute === 0 &&
    counts.semanticStartAuthenticatedExecute === 1 &&
    counts.functionGrantLeakCount === 0 &&
    counts.pendingQuestionRows === 0 &&
    counts.generatedQuestionRows ===
      counts.legacyQuestionRows + counts.semanticQuestionRows;
  return applied
    ? ("ALREADY_APPLIED" as const)
    : ("PARTIAL_OR_DRIFTED" as const);
}

function emptyPreflight(
  rootFailureCode = "MIGRATION_0041_PREFLIGHT_NOT_RUN",
): Migration0041PreflightReport {
  return {
    ok: false,
    project004Canonical: "NOT_RUN",
    remoteIdentityGuard: "NOT_RUN",
    endpointMode: "NOT_RUN",
    localPrefixChecksums: "NOT_RUN",
    localMigration0041Checksum: "NOT_RUN",
    prefixSchemaFingerprint: "NOT_APPLICABLE",
    remoteMigration0041Checksum: "NOT_APPLICABLE",
    remoteMigration0041SourceHash: "NOT_APPLICABLE",
    generatedRuntimeRemoteOff: "NOT_RUN",
    remotePhase: "NOT_RUN",
    migration0041Eligible: "NO",
    releaseContract: "NOT_RUN",
    grade1Boundary: "NOT_RUN",
    adaptivePilotDisabled: "NOT_RUN",
    rlsPrivateBoundary: "NOT_RUN",
    counts: null,
    config: null,
    resolvedEndpoint: null,
    rootFailureCode,
    currentRunMutationPerformed: "NO",
    remoteQuery: emptyRemoteQueryDiagnostic(),
    remoteMigrationChecksumCapability: "NOT_RUN",
  };
}

function runPsql(
  runner: RemoteDevCommandRunner,
  sql: string,
  config: RemoteDevPrivateConfig,
  endpoint: ResolvedRemoteDatabaseEndpoint,
  environment: NodeJS.ProcessEnv,
) {
  const invocation =
    buildProject004UniversalActivationPsqlInvocation(sql);
  return runner(
    "psql",
    invocation.args,
    buildResolvedRemoteDatabaseEnvironment(
      config,
      endpoint,
      environment,
    ),
    invocation.input,
  );
}

function safeFailureCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /^[A-Z][A-Z0-9_:]{2,120}$/u.test(message)
    ? message
    : "MIGRATION_0041_PREFLIGHT_FAILED";
}

export function executeMigration0041RemotePreflight(options: {
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
  semanticFingerprintVerifier?: (output: string) => boolean;
}): Migration0041PreflightReport {
  const report = emptyPreflight();
  const candidateRoot = options.candidateRoot ?? process.cwd();
  let local: LocalMigration0041Contract;
  try {
    local = loadMigration0041LocalContract(candidateRoot);
    report.project004Canonical = "PASS";
    report.localPrefixChecksums = "PASS";
    report.localMigration0041Checksum = "PASS";
  } catch (error) {
    const code = safeFailureCode(error);
    const identityFailure =
      code.startsWith("PROJECT004_IDENTITY:");
    report.project004Canonical = identityFailure
      ? "FAIL"
      : "PASS";
    report.localPrefixChecksums = identityFailure
      ? "NOT_RUN"
      : code === "LOCAL_MIGRATIONS_0001_0040_DRIFT"
        ? "FAIL"
        : "NOT_RUN";
    report.localMigration0041Checksum =
      identityFailure
        ? "NOT_RUN"
        : code === "LOCAL_MIGRATIONS_0001_0040_DRIFT"
          ? "PASS"
          : code.includes("MIGRATION_0041_CHECKSUM")
            ? "FAIL"
            : "NOT_RUN";
    report.rootFailureCode = code;
    return report;
  }
  const runner =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(local.root);
  try {
    const config = configFromEnvironment(options.environment);
    assertRemoteDevTarget(config);
    assertLocalIsolation(config, local.root);
    if (!runtimeProfileIsSafelyOff(local.root, config)) {
      throw new Error("REMOTE_GENERATED_RUNTIME_NOT_OFF");
    }
    report.generatedRuntimeRemoteOff = "PASS";
    const auth = runCanonicalSupabaseCliAuthCheck({
      environment: options.environment,
      candidateRoot: local.root,
      runner,
    });
    const project = selectProject004ConnectivityProject(
      auth.projects,
      config,
    );
    report.remoteIdentityGuard = "PASS";
    const resolution = resolveProject004RemoteDatabaseEndpoint({
      config,
      project,
      environment: options.environment,
      runner,
    });
    report.endpointMode = resolution.endpoint.mode;
    report.config = config;
    report.resolvedEndpoint = resolution.endpoint;
    const remoteState = executeMigration0041RemoteStateQueries({
      runner,
      config,
      endpoint: resolution.endpoint,
      environment: options.environment,
      diagnostic: report.remoteQuery,
    });
    const counts = remoteState.counts;
    report.remoteMigrationChecksumCapability =
      remoteState.checksumCapability;
    report.counts = counts;
    report.remotePhase = classifyMigration0041RemotePhase(counts);
    report.releaseContract =
      counts.exactActiveReleaseCount === 1 &&
      counts.otherReleaseCount === 0 &&
      counts.releaseUnits === 171 &&
      counts.releaseQuestions === 2052 &&
      counts.releaseSolutions === 2052 &&
      counts.releaseOutcomes === 546
        ? "PASS"
        : "FAIL";
    report.grade1Boundary =
      counts.legacyUnits === 14 &&
      counts.legacyQuestions === 336 &&
      counts.legacySolutions === 336 &&
      counts.legacyDiagnosticRows === 24
        ? "PASS"
        : "FAIL";
    report.adaptivePilotDisabled =
      counts.adaptiveReleaseCount === 1 &&
      counts.adaptiveExactDisabledCount === 1 &&
      counts.adaptiveEnabledCount === 0
        ? "PASS"
        : "FAIL";
    report.rlsPrivateBoundary =
      counts.rlsGapCount === 0 &&
      counts.privateGrantLeakCount === 0 &&
      counts.functionGrantLeakCount === 0
        ? "PASS"
        : "FAIL";
    if (report.remotePhase === "PARTIAL_OR_DRIFTED") {
      const has0041 = counts.migration0041Count > 0;
      report.remoteMigration0041Checksum = has0041
        ? report.remoteMigrationChecksumCapability === "UNAVAILABLE"
          ? "UNAVAILABLE"
          : counts.migration0041ChecksumMatches === 1
            ? "PASS"
            : "FAIL"
        : "NOT_APPLICABLE";
      report.remoteMigration0041SourceHash = has0041
        ? counts.migration0041SourceHashMatches === 1
          ? "PASS"
          : "FAIL"
        : "NOT_APPLICABLE";
      report.rootFailureCode =
        has0041 &&
        counts.migration0041SourceHashMatches !== 1 &&
        counts.migration0041ChecksumMatches !== 1
          ? "REMOTE_MIGRATION_0041_SOURCE_OR_CHECKSUM_DRIFT"
          : "MIGRATION_0041_PARTIAL_SCHEMA";
      return report;
    }
    if (
      report.releaseContract !== "PASS" ||
      report.grade1Boundary !== "PASS" ||
      report.adaptivePilotDisabled !== "PASS" ||
      report.rlsPrivateBoundary !== "PASS"
    ) {
      throw new Error("MIGRATION_0041_REMOTE_CONTRACT_DRIFT");
    }
    if (report.remotePhase === "BEFORE_0041") {
      const semanticResult = runPsql(
        runner,
        buildProject004PrefixSemanticFingerprintSql(
          local.root,
          40,
          { root: local.root, plan: local.plan },
        ),
        config,
        resolution.endpoint,
        options.environment,
      );
      if (!semanticResult.ok) {
        throw new Error(
          "MIGRATION_0041_PREFIX_FINGERPRINT_QUERY_FAILED",
        );
      }
      const semanticPass =
        options.semanticFingerprintVerifier?.(
          semanticResult.stdout,
        ) ??
        parsePrefixSemanticFingerprint(
          semanticResult.stdout,
        ).overallSha256 ===
          project004Migration0041Contract
            .prefixSchemaFingerprintSha256;
      if (!semanticPass) {
        report.prefixSchemaFingerprint = "FAIL";
        throw new Error("MIGRATION_0041_PREFIX_FINGERPRINT_DRIFT");
      }
      report.prefixSchemaFingerprint = "PASS";
      report.remoteMigration0041Checksum = "NOT_APPLICABLE";
      report.remoteMigration0041SourceHash = "NOT_APPLICABLE";
      report.migration0041Eligible = "YES";
    } else {
      report.prefixSchemaFingerprint = "NOT_APPLICABLE";
      report.remoteMigration0041Checksum =
        report.remoteMigrationChecksumCapability === "UNAVAILABLE"
          ? "UNAVAILABLE"
          : counts.migration0041ChecksumMatches === 1
            ? "PASS"
            : "FAIL";
      report.remoteMigration0041SourceHash =
        counts.migration0041SourceHashMatches === 1
          ? "PASS"
          : "UNAVAILABLE";
      report.migration0041Eligible = "NO";
    }
    report.ok = true;
    report.rootFailureCode =
      report.remotePhase === "ALREADY_APPLIED"
        ? "ALREADY_APPLIED"
        : "NONE";
    return report;
  } catch (error) {
    if (error instanceof Migration0041RemoteQueryError) {
      report.remoteQuery = error.diagnostic;
    }
    report.rootFailureCode = safeFailureCode(error);
    return report;
  }
}

function dollarQuotedMigrationSource(source: string) {
  const delimiter = "$plave_migration_0041_source$";
  if (source.includes(delimiter)) {
    throw new Error("MIGRATION_0041_SOURCE_DELIMITER_COLLISION");
  }
  return `${delimiter}${source}${delimiter}`;
}

export function buildMigration0041ControlledApplySql(
  local: LocalMigration0041Contract,
) {
  const sourceLiteral = dollarQuotedMigrationSource(
    local.migrationSource,
  );
  return String.raw`
\set ON_ERROR_STOP on
\echo ${project004Migration0041Contract.version}:STAGE|PRECONDITION
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(
    'project004-clean-remote-migration-0041',
    0
  )
);
do $precondition$
begin
  if (
    select count(*) <> 40
      or count(*) filter (
        where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
      ) <> 40
      or coalesce(min(version), 'NONE') <> '0001'
      or coalesce(max(version), 'NONE') <> '0040'
    from supabase_migrations.schema_migrations
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:MIGRATION_PREFIX';
  end if;
  if to_regclass('public.curriculum_generated_questions') is null then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:ATTEMPT_ITEM_TABLE';
  end if;
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'curriculum_generated_questions'
      and column_name in (
        ${sqlList([...provenanceFields, "question_source", "semantic_provenance_locked"])}
      )
  ) <> 0 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:NO_PARTIAL_SCHEMA';
  end if;
  if
    (select count(*) from public.curriculum_attempts) <>
      ${project004Migration0041Contract.expectedExistingAttemptRows}
    or (
      (select count(*) from public.practice_attempts)
      + (select count(*) from public.practice_answers)
      + (select count(*) from public.diagnostic_attempts)
      + (select count(*) from public.diagnostic_answers)
      + (select count(*) from public.adaptive_practice_attempts)
      + (select count(*) from public.adaptive_practice_answers)
      + (select count(*) from public.curriculum_attempts)
      + (select count(*) from public.curriculum_answers)
      + (select count(*) from public.curriculum_generated_answers)
      + (select count(*) from public.student_curriculum_unit_progress)
      + (
        select count(*)
        from public.student_curriculum_outcome_progress
      )
      + (select count(*) from public.student_curriculum_skill_progress)
      + (select count(*) from public.assignment_submissions)
      + (select count(*) from public.assignment_answers)
      + (
        select count(*)
        from public.student_assignment_outcome_progress
      )
      + (
        select count(*)
        from public.student_assignment_skill_progress
      )
    ) <> ${project004Migration0041Contract.expectedExistingLearningHistoryRows}
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:HISTORY_BASELINE';
  end if;
  if (
    select count(*) from public.curriculum_releases
    where release_id = ${sqlText(releaseRow.releaseId)}
      and content_version =
        ${sqlText(releaseRow.contentVersion)}
      and curriculum_source_fingerprint =
        ${sqlText(releaseRow.curriculumSourceFingerprint)}
      and generator_version =
        ${sqlText(releaseRow.generatorVersion)}
      and deterministic_seed =
        ${sqlText(releaseRow.deterministicSeed)}
      and mastery_policy_version =
        ${sqlText(releaseRow.masteryPolicyVersion)}
      and public_payload_sha256 =
        ${sqlText(release.hashes.publicPayloadSha256)}
      and private_solution_sha256 =
        ${sqlText(release.hashes.privateSolutionSha256)}
      and bundle_sha256 =
        ${sqlText(release.hashes.bundleSha256)}
      and status = 'ACTIVE'
      and activation_state = 'ACTIVE'
      and activated_at is not null
      and retired_at is null
  ) <> 1 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:ACTIVE_RELEASE';
  end if;
  if (
    select count(*) from public.curriculum_release_units
    where release_id = ${sqlText(releaseRow.releaseId)}
  ) <> 171
    or (
      select count(*) from public.curriculum_release_questions
      where release_id = ${sqlText(releaseRow.releaseId)}
    ) <> 2052
    or (
      select count(*) from private.curriculum_release_solutions
      where release_id = ${sqlText(releaseRow.releaseId)}
    ) <> 2052
    or (
      select count(distinct expanded.outcome_id)
      from public.curriculum_release_units as unit
      cross join unnest(unit.official_outcome_ids)
        as expanded(outcome_id)
      where unit.release_id = ${sqlText(releaseRow.releaseId)}
    ) <> 546
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:RELEASE_BANK';
  end if;
  if
    (select count(*) from public.learning_units) <> 14
    or (select count(*) from public.questions) <> 336
    or (select count(*) from public.question_solutions) <> 336
    or (
      select count(*) from public.grade1_diagnostic_blueprint
    ) <> 24
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:GRADE1_BOUNDARY';
  end if;
  if
    (select count(*) from public.adaptive_practice_releases) <> 1
    or (
      select count(*) from public.adaptive_practice_releases
      where not runtime_enabled
        and not controlled_pilot_enabled
        and not retention_runtime_enabled
        and publication_status = 'DRAFT'
        and student_visibility = 'HIDDEN'
    ) <> 1
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:ADAPTIVE_PILOT';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where (namespace.nspname, relation.relname) in (
      ('public', 'curriculum_generated_questions'),
      ('private', 'curriculum_generated_solutions'),
      ('public', 'curriculum_generated_answers')
    )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) or exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'curriculum_generated_solutions'
      and lower(grantee) in ('anon', 'authenticated', 'public')
      and privilege_type in (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'
      )
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:PRECONDITION:PRIVATE_BOUNDARY';
  end if;
end;
$precondition$;
  create temporary table migration_0041_history_boundary
on commit drop as
select
  (select count(*) from public.curriculum_attempts) as attempts,
  (
    select count(*) from public.curriculum_generated_questions
  ) as generated_questions,
  (
    select count(*) from private.curriculum_generated_solutions
  ) as private_solutions,
  (
    select count(*) from public.curriculum_generated_answers
  ) as generated_answers,
  (select count(*) from public.curriculum_answers) as materialized_answers,
  (
    (select count(*) from public.practice_attempts)
    + (select count(*) from public.practice_answers)
    + (select count(*) from public.diagnostic_attempts)
    + (select count(*) from public.diagnostic_answers)
    + (select count(*) from public.adaptive_practice_attempts)
    + (select count(*) from public.adaptive_practice_answers)
    + (select count(*) from public.curriculum_attempts)
    + (select count(*) from public.curriculum_answers)
    + (select count(*) from public.curriculum_generated_answers)
    + (select count(*) from public.student_curriculum_unit_progress)
    + (
      select count(*)
      from public.student_curriculum_outcome_progress
    )
    + (select count(*) from public.student_curriculum_skill_progress)
    + (select count(*) from public.assignment_submissions)
    + (select count(*) from public.assignment_answers)
    + (
      select count(*)
      from public.student_assignment_outcome_progress
    )
    + (
      select count(*)
      from public.student_assignment_skill_progress
    )
  ) as learning_history_rows;
\echo ${project004Migration0041Contract.version}:STAGE|MIGRATION_DDL
${local.migrationBody}
\echo ${project004Migration0041Contract.version}:STAGE|POSTCONDITION
do $postcondition$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'curriculum_generated_questions'
      and column_name in (${sqlList(provenanceFields)})
  ) <> 8
    or (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'curriculum_generated_questions'
        and column_name in (
          'question_source',
          'semantic_provenance_locked'
        )
    ) <> 2
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:PROVENANCE_FIELDS';
  end if;
  if (
    select count(*)
    from pg_catalog.pg_constraint
    where conrelid =
        'public.curriculum_generated_questions'::regclass
      and conname in (${sqlList(provenanceConstraints)})
  ) <> 3 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:CONSTRAINTS';
  end if;
  if (
    select count(*)
    from pg_catalog.pg_trigger
    where tgrelid =
        'public.curriculum_generated_questions'::regclass
      and not tgisinternal
      and tgname in (${sqlList(provenanceTriggers)})
  ) <> 3 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:TRIGGERS';
  end if;
  if (
    select (
      count(*) filter (
        where namespace.nspname = 'private'
          and procedure.proname in (${sqlList(provenanceFunctions)})
          and not procedure.prosecdef
          and procedure.proconfig @>
            array['search_path=""']::text[]
      )
      + count(*) filter (
        where namespace.nspname = 'public'
          and procedure.proname =
            'start_or_resume_semantic_generated_curriculum'
          and pg_catalog.pg_get_function_identity_arguments(
            procedure.oid
          ) =
            'p_snapshot jsonb, p_signature text, p_idempotency_key uuid'
          and procedure.prosecdef
          and procedure.proconfig @>
            array['search_path=""']::text[]
      )
    )
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
  ) <> 4 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:FUNCTIONS';
  end if;
  if pg_catalog.has_function_privilege(
    'authenticated',
    'public.start_or_resume_generated_curriculum(jsonb,text,uuid)',
    'EXECUTE'
  )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)',
      'EXECUTE'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:RPC_GRANTS';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc as procedure
    where procedure.oid = pg_catalog.to_regprocedure(
      'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
    )
      and exists (
        select 1
        from pg_catalog.aclexplode(
          coalesce(
            procedure.proacl,
            pg_catalog.acldefault('f', procedure.proowner)
          )
        ) as privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )
  ) or exists (
    select 1
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (${sqlList(provenanceFunctions)})
      and pg_catalog.has_function_privilege(
        'authenticated',
        procedure.oid,
        'EXECUTE'
      )
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:FUNCTION_GRANTS';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where (namespace.nspname, relation.relname) in (
      ('public', 'curriculum_generated_questions'),
      ('private', 'curriculum_generated_solutions'),
      ('public', 'curriculum_generated_answers')
    )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:RLS';
  end if;
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'curriculum_generated_solutions'
      and lower(grantee) in ('anon', 'authenticated', 'public')
      and privilege_type in (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'
      )
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:PRIVATE_GRANTS';
  end if;
  if exists (
    select 1
    from migration_0041_history_boundary as boundary
    where boundary.attempts <>
        (select count(*) from public.curriculum_attempts)
      or boundary.generated_questions <>
        (
          select count(*)
          from public.curriculum_generated_questions
        )
      or boundary.private_solutions <>
        (
          select count(*)
          from private.curriculum_generated_solutions
        )
      or boundary.generated_answers <>
        (
          select count(*)
          from public.curriculum_generated_answers
        )
      or boundary.materialized_answers <>
        (select count(*) from public.curriculum_answers)
      or boundary.learning_history_rows <> (
        (select count(*) from public.practice_attempts)
        + (select count(*) from public.practice_answers)
        + (select count(*) from public.diagnostic_attempts)
        + (select count(*) from public.diagnostic_answers)
        + (select count(*) from public.adaptive_practice_attempts)
        + (select count(*) from public.adaptive_practice_answers)
        + (select count(*) from public.curriculum_attempts)
        + (select count(*) from public.curriculum_answers)
        + (
          select count(*)
          from public.curriculum_generated_answers
        )
        + (
          select count(*)
          from public.student_curriculum_unit_progress
        )
        + (
          select count(*)
          from public.student_curriculum_outcome_progress
        )
        + (
          select count(*)
          from public.student_curriculum_skill_progress
        )
        + (select count(*) from public.assignment_submissions)
        + (select count(*) from public.assignment_answers)
        + (
          select count(*)
          from public.student_assignment_outcome_progress
        )
        + (
          select count(*)
          from public.student_assignment_skill_progress
        )
      )
  ) then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:POSTCONDITION:HISTORY_COUNTS';
  end if;
end;
$postcondition$;
\echo ${project004Migration0041Contract.version}:STAGE|MIGRATION_HISTORY
insert into supabase_migrations.schema_migrations(
  version,
  statements,
  name
)
values (
  '0041',
  array[${sourceLiteral}]::text[],
  ${sqlText(project004Migration0041Contract.migrationName)}
);
do $history$
begin
  if (
    select count(*)
    from supabase_migrations.schema_migrations
    where version = '0041'
      and name =
        ${sqlText(project004Migration0041Contract.migrationName)}
      and cardinality(statements) = 1
      and pg_catalog.encode(
        extensions.digest(
          statements[1]::text,
          'sha256'::text
        ),
        'hex'::text
      ) = ${sqlText(project004Migration0041Contract.migrationSha256)}
  ) <> 1 then
    raise exception using errcode = 'P0001',
      message = 'PROJECT004_0041:HISTORY:CHECKSUM';
  end if;
end;
$history$;
\echo ${project004Migration0041Contract.version}:STAGE|TRANSACTION_COMMIT
commit;
select '${project004Migration0041Contract.version}:COMMIT|0041|${project004Migration0041Contract.migrationSha256}';
`;
}

const applyPsqlArgs = [
  "--no-psqlrc",
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--set",
  "ON_ERROR_STOP=1",
  "--set",
  "VERBOSITY=verbose",
] as const;

function combinedOutput(result: SafeCommandResult) {
  return `${result.stdout}\n${result.stderr}`
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
}

function sqlstate(output: string) {
  return (
    output.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5}):/iu)?.[1] ??
    output.match(/\bSQLSTATE(?:\s*[:=]|\s+)([0-9A-Z]{5})\b/iu)?.[1] ??
    "UNKNOWN"
  ).toUpperCase();
}

export function parseMigration0041TransactionResponse(
  result: SafeCommandResult,
): Migration0041TransactionDiagnostic {
  const output = combinedOutput(result);
  const sentinel =
    `${project004Migration0041Contract.version}:COMMIT|0041|` +
    project004Migration0041Contract.migrationSha256;
  const sentinelCount = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line === sentinel).length;
  if (result.ok && sentinelCount === 1) {
    return {
      ok: true,
      sqlstate: "NONE",
      failureStage: "NONE",
      failedStatementClass: "NONE",
      preconditionId: "NONE",
      parserFailureCode: "NONE",
      sentinelCount,
    };
  }
  const observedStage =
    [...output.matchAll(
      new RegExp(
        `${project004Migration0041Contract.version}:STAGE[|]([A-Z_]+)`,
        "gu",
      ),
    )].at(-1)?.[1] ?? "NONE";
  const preconditionId =
    output.match(
      /PROJECT004_0041:PRECONDITION:([A-Z0-9_]+)/u,
    )?.[1] ?? "NONE";
  let failureStage: Migration0041FailureStage = "PSQL_INVOCATION";
  let failedStatementClass: Migration0041FailedStatementClass =
    "PSQL_PROCESS";
  if (observedStage === "PRECONDITION") {
    failureStage = "PRECONDITION";
    failedStatementClass = "PRECONDITION_DO_BLOCK";
  } else if (observedStage === "MIGRATION_DDL") {
    failureStage = "MIGRATION_DDL";
    failedStatementClass = "MIGRATION_DDL";
  } else if (observedStage === "POSTCONDITION") {
    failureStage = "POSTCONDITION";
    failedStatementClass = "POSTCONDITION_DO_BLOCK";
  } else if (observedStage === "MIGRATION_HISTORY") {
    failureStage = "MIGRATION_HISTORY";
    failedStatementClass = "MIGRATION_HISTORY_INSERT";
  } else if (observedStage === "TRANSACTION_COMMIT") {
    failureStage = "TRANSACTION_COMMIT";
    failedStatementClass = "TRANSACTION_CONTROL";
  } else if (result.ok) {
    failureStage = "RESPONSE_PARSER";
    failedStatementClass = "RESPONSE_SENTINEL";
  }
  return {
    ok: false,
    sqlstate: result.ok ? "NONE" : sqlstate(output),
    failureStage,
    failedStatementClass,
    preconditionId,
    parserFailureCode:
      result.ok
        ? sentinelCount === 0
          ? "MIGRATION_0041_COMMIT_SENTINEL_MISSING"
          : "MIGRATION_0041_COMMIT_SENTINEL_DUPLICATE"
        : result.timedOut
          ? "MIGRATION_0041_TRANSACTION_TIMEOUT"
          : sqlstate(output) === "UNKNOWN"
            ? "MIGRATION_0041_PSQL_FAILURE_UNCLASSIFIED"
            : "NONE",
    sentinelCount,
  };
}

type AuditedMigration0041Counts = {
  projectList: number;
  readOnlySql: number;
  applyTransaction: number;
  applyTransactionSucceeded: number;
  unexpected: number;
};

function isReadOnlyInput(sql: string | undefined) {
  return (
    typeof sql === "string" &&
    /\bbegin\s+read\s+only\s*;/iu.test(sql) &&
    !/\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke)\b/iu.test(
      sql
        .replace(/--[^\n]*(?:\n|$)/gu, "\n")
        .replace(/'(?:''|[^'])*'/gu, "''"),
    )
  );
}

export function createAuditedMigration0041Runner(options: {
  delegate: RemoteDevCommandRunner;
  applySqlSha256: string;
}) {
  const counts: AuditedMigration0041Counts = {
    projectList: 0,
    readOnlySql: 0,
    applyTransaction: 0,
    applyTransactionSucceeded: 0,
    unexpected: 0,
  };
  const runner: RemoteDevCommandRunner = (
    command,
    args,
    environment,
    input,
  ) => {
    if (
      command === "supabase" &&
      args.join("\0") ===
        ["projects", "list", "--output", "json"].join("\0")
    ) {
      counts.projectList += 1;
      return options.delegate(command, args, environment, input);
    }
    if (
      command === "psql" &&
      (isReadOnlySqlCommand(args) || isReadOnlyInput(input))
    ) {
      counts.readOnlySql += 1;
      return options.delegate(command, args, environment, input);
    }
    if (
      command === "psql" &&
      args.join("\0") === [...applyPsqlArgs].join("\0") &&
      counts.applyTransaction === 0 &&
      typeof input === "string" &&
      createHash("sha256").update(input).digest("hex") ===
        options.applySqlSha256
    ) {
      counts.applyTransaction += 1;
      const result = options.delegate(
        command,
        args,
        environment,
        input,
      );
      if (result.ok) counts.applyTransactionSucceeded += 1;
      return result;
    }
    counts.unexpected += 1;
    return { ok: false, stdout: "", stderr: "" };
  };
  return { runner, counts };
}

export function approvalReceiptPath(
  candidateRoot = process.cwd(),
) {
  return resolve(
    candidateRoot,
    project004Migration0041Contract.approvalReceipt,
  );
}

export function consumeMigration0041Approval(
  candidateRoot = process.cwd(),
) {
  const path = approvalReceiptPath(candidateRoot);
  if (existsSync(path)) {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("MIGRATION_0041_APPROVAL_RECEIPT_INVALID");
    }
    return false;
  }
  writeFileSync(
    path,
    JSON.stringify({
      target: project004Migration0041Contract.targetName,
      migration: project004Migration0041Contract.migrationVersion,
      checksum: project004Migration0041Contract.migrationSha256,
      status: "CONSUMED",
    }),
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  chmodSync(path, 0o600);
  return true;
}

function emptyOperation(
  preflight: Migration0041PreflightReport,
): Migration0041OperationReport {
  return {
    ok: false,
    status: "FAILED",
    preflight,
    postflight: null,
    applyAttempts: 0,
    approvalConsumed: false,
    postApplyDiagnostic: "NOT_RUN",
    historyCountsUnchanged: "NOT_RUN",
    transactionRollback: "NOT_RUN",
    sqlstate: "NOT_RUN",
    failureStage: "NONE",
    failedStatementClass: "NONE",
    preconditionId: "NONE",
    currentRunMutationPerformed: "NO",
    rootFailureCode: preflight.rootFailureCode,
  };
}

function historyCountsUnchanged(
  before: Migration0041RemoteCounts,
  after: Migration0041RemoteCounts,
) {
  return (
    before.generatedQuestionRows === after.generatedQuestionRows &&
    before.attemptRows === after.attemptRows &&
    before.privateSolutionRows === after.privateSolutionRows &&
    before.generatedAnswerRows === after.generatedAnswerRows &&
    before.materializedAnswerRows === after.materializedAnswerRows &&
    before.learningHistoryRows === after.learningHistoryRows
  );
}

export function executeMigration0041ControlledApply(options: {
  environment: NodeJS.ProcessEnv;
  approval: string;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
  authorizationStatus?:
    | "OWNER_APPROVAL_REQUIRED"
    | "OWNER_APPROVED_FOR_ONE_TIME_APPLY";
  consumeApproval?: (root: string) => boolean;
  semanticFingerprintVerifier?: (output: string) => boolean;
}): Migration0041OperationReport {
  const root = options.candidateRoot ?? process.cwd();
  let local: LocalMigration0041Contract;
  try {
    local = loadMigration0041LocalContract(root);
  } catch {
    return emptyOperation(
      executeMigration0041RemotePreflight({
        environment: options.environment,
        candidateRoot: root,
        runner: options.runner,
        semanticFingerprintVerifier:
          options.semanticFingerprintVerifier,
      }),
    );
  }
  const applySql = buildMigration0041ControlledApplySql(local);
  const audited = createAuditedMigration0041Runner({
    delegate:
      options.runner ??
      createCanonicalRemoteDevCommandRunner(local.root),
    applySqlSha256: createHash("sha256")
      .update(applySql)
      .digest("hex"),
  });
  const preflight = executeMigration0041RemotePreflight({
    environment: options.environment,
    candidateRoot: local.root,
    runner: audited.runner,
    semanticFingerprintVerifier:
      options.semanticFingerprintVerifier,
  });
  const report = emptyOperation(preflight);
  if (
    preflight.ok &&
    preflight.remotePhase === "ALREADY_APPLIED"
  ) {
    report.ok = true;
    report.status = "ALREADY_APPLIED";
    report.postApplyDiagnostic = "PASS";
    report.historyCountsUnchanged = "PASS";
    report.postflight = preflight;
    report.transactionRollback = "NOT_APPLICABLE";
    report.sqlstate = "NONE";
    report.rootFailureCode = "ALREADY_APPLIED";
    return report;
  }
  if (
    !preflight.ok ||
    !preflight.config ||
    !preflight.resolvedEndpoint ||
    !preflight.counts
  ) {
    return report;
  }
  if (
    preflight.counts.attemptRows !==
      project004Migration0041Contract.expectedExistingAttemptRows ||
    preflight.counts.learningHistoryRows !==
      project004Migration0041Contract.expectedExistingLearningHistoryRows
  ) {
    report.rootFailureCode =
      "MIGRATION_0041_APPROVED_HISTORY_BASELINE_CHANGED";
    return report;
  }
  const authorizationStatus =
    options.authorizationStatus ??
    project004Migration0041Contract.authorizationStatus;
  if (
    authorizationStatus !==
      "OWNER_APPROVED_FOR_ONE_TIME_APPLY" ||
    options.approval !==
      project004Migration0041Contract.approval
  ) {
    report.rootFailureCode =
      "MIGRATION_0041_OWNER_APPROVAL_REQUIRED";
    return report;
  }
  const consume =
    options.consumeApproval ??
    consumeMigration0041Approval;
  if (!consume(local.root)) {
    report.rootFailureCode =
      "MIGRATION_0041_OWNER_APPROVAL_CONSUMED";
    return report;
  }
  report.approvalConsumed = true;
  report.applyAttempts = 1;
  const result = audited.runner(
    "psql",
    [...applyPsqlArgs],
    buildResolvedRemoteDatabaseEnvironment(
      preflight.config,
      preflight.resolvedEndpoint,
      options.environment,
    ),
    applySql,
  );
  const transaction =
    parseMigration0041TransactionResponse(result);
  report.sqlstate = transaction.sqlstate;
  report.failureStage = transaction.failureStage;
  report.failedStatementClass =
    transaction.failedStatementClass;
  report.preconditionId = transaction.preconditionId;
  report.currentRunMutationPerformed = transaction.ok
    ? "YES"
    : "POSSIBLE";
  const post = executeMigration0041RemotePreflight({
    environment: options.environment,
    candidateRoot: local.root,
    runner: audited.runner,
    semanticFingerprintVerifier:
      options.semanticFingerprintVerifier,
  });
  report.postflight = post;
  if (!transaction.ok) {
    if (
      post.ok &&
      post.remotePhase === "BEFORE_0041" &&
      post.counts &&
      historyCountsUnchanged(preflight.counts, post.counts)
    ) {
      report.transactionRollback = "PASS";
      report.historyCountsUnchanged = "PASS";
      report.currentRunMutationPerformed = "NO";
    } else {
      report.transactionRollback = "UNVERIFIED";
    }
    report.rootFailureCode =
      transaction.parserFailureCode !== "NONE"
        ? transaction.parserFailureCode
        : "MIGRATION_0041_TRANSACTION_FAILED";
    return report;
  }
  if (
    !post.ok ||
    post.remotePhase !== "ALREADY_APPLIED" ||
    !post.counts ||
    !historyCountsUnchanged(preflight.counts, post.counts) ||
    audited.counts.applyTransaction !== 1 ||
    audited.counts.applyTransactionSucceeded !== 1 ||
    audited.counts.unexpected !== 0
  ) {
    report.rootFailureCode =
      "MIGRATION_0041_POST_APPLY_DIAGNOSTIC_FAILED";
    return report;
  }
  report.ok = true;
  report.status = "APPLIED";
  report.postApplyDiagnostic = "PASS";
  report.historyCountsUnchanged = "PASS";
  report.transactionRollback = "NOT_APPLICABLE";
  report.sqlstate = "NONE";
  report.failureStage = "NONE";
  report.failedStatementClass = "NONE";
  report.preconditionId = "NONE";
  report.rootFailureCode = "NONE";
  return report;
}
