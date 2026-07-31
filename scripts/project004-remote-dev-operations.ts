import { buildProject004RemoteBaselineClassificationSql } from "./project004-remote-dev-baseline.ts";
import { loadAndVerifyCleanDisposableProofReceipt } from "./project004-clean-disposable-proof.ts";
import { buildUniversalCurriculumRelease } from "../lib/curriculum-runtime/release.ts";
import {
  project004LegacyDraftUnitSlug,
  project004LegacyPublishedUnitSlugs,
} from "./project004-content-precondition-contract.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import {
  Project004PostTransactionValidationError,
  verifyProject004PostTransactionCounts,
  type Project004PostTransactionCounts,
} from "./project004-post-transaction-validation.ts";
import {
  RemoteDevGuardFailure,
  assertLinkedTarget,
  assertLocalIsolation,
  assertRemoteDevTarget,
  buildMigrationPlanFingerprint,
  buildRemoteDatabaseEnvironment,
  createCanonicalRemoteDevCommandRunner,
  loadAndVerifyMigrationPlan,
  parseCanonicalMigrationFilename,
  project004RemoteDevContract,
  runCapturedCommand,
  type MigrationPlan,
  type RemoteDevPrivateConfig,
  type RemoteDevSafeFailureDetail,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import {
  assertResolvedRemoteDatabaseEndpoint,
  buildResolvedRemoteCliEnvironment,
  buildResolvedRemoteDatabaseEnvironment,
  resolveProject004RemoteDatabaseEndpoint,
  selectProject004ConnectivityProject,
  type ResolvedRemoteDatabaseEndpoint,
} from "./project004-remote-connectivity-resolver.ts";
import { runCanonicalSupabaseCliAuthCheck } from "./project004-supabase-cli-auth.ts";

export type RemoteEmptyCounts = {
  platformBaselineObjects: number;
  plaveApplicationObjects: number;
  foreignApplicationObjects: number;
  authUserCount: number;
  storageObjectCount: number;
  migrationTableExists: number;
  migrationHistoryCount: number;
  plaveMigrationHistoryCount: number;
  foreignMigrationHistoryCount: number;
};

export type RemotePostApplyCounts =
  Project004PostTransactionCounts;

export const project004PostApplyPayloadSentinel =
  "PROJECT004_POST_TRANSACTION_V1";
export const project004PostApplyPayloadVersion = "V1";
export const project004PostApplyPayloadFieldCount = 38;

export type Project004PostApplyParserFailureCode =
  | "NONE"
  | "QUERY_EXIT_FAILED"
  | "PAYLOAD_SENTINEL_MISSING"
  | "PAYLOAD_SENTINEL_DUPLICATE"
  | "PAYLOAD_VERSION_MISMATCH"
  | "PAYLOAD_FIELD_COUNT_INVALID"
  | "PAYLOAD_VALUE_INVALID";

export type Project004PostApplyParserEvidence = {
  queryExit: "PASS" | "FAIL";
  payloadSentinelCount: number;
  payloadFieldCount: number;
  payloadVersion: string;
  parserFailureCode: Project004PostApplyParserFailureCode;
};

export type Project004PostApplyQueryResult = {
  ok: boolean;
  stdout: string;
  stderr?: string;
  timedOut?: boolean;
  childExited?: boolean;
};

export type Project004DryRunParserFailureCode =
  | "NONE"
  | "QUERY_EXIT_FAILED"
  | "OUTPUT_EMPTY"
  | "SUCCESS_SIGNATURE_MISSING"
  | "MIGRATION_SECTION_MISSING"
  | "MIGRATION_ENTRY_INVALID"
  | "MIGRATION_COUNT_MISMATCH"
  | "MIGRATION_DUPLICATE"
  | "MIGRATION_FOREIGN"
  | "MIGRATION_OUT_OF_ORDER"
  | "MIGRATION_FILENAME_MISMATCH"
  | "SEED_OPERATION_DETECTED"
  | "DESTRUCTIVE_OPERATION_DETECTED";

export type Project004DryRunParserEvidence = {
  queryExit: "PASS" | "FAIL";
  successSignature: "PASS" | "FAIL";
  migrationHeaderCount: number;
  observedMigrationCount: number;
  observedFirstLast: string;
  duplicateMigrationCount: number;
  foreignMigrationCount: number;
  migrationOrder: "PASS" | "FAIL" | "NOT_RUN";
  canonicalPlanChecksums: "PASS" | "FAIL";
  seedOperationCount: number;
  destructiveOperationCount: number;
  parserFailureCode: Project004DryRunParserFailureCode;
};

export class Project004DryRunParserError extends RemoteDevGuardFailure {
  readonly evidence: Project004DryRunParserEvidence;

  constructor(
    rootCode: string,
    evidence: Project004DryRunParserEvidence,
  ) {
    super(rootCode);
    this.evidence = evidence;
  }
}

export type Project004PostApplyQueryRequest = {
  sql: string;
  machineOutput: true;
};

export class Project004PostApplyResponseError extends RemoteDevGuardFailure {
  readonly evidence: Project004PostApplyParserEvidence;
  readonly queryTimedOut: boolean;
  readonly queryChildExited: boolean;

  constructor(
    evidence: Project004PostApplyParserEvidence,
    query?: Project004PostApplyQueryResult,
  ) {
    super("POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID");
    this.evidence = evidence;
    this.queryTimedOut = query?.timedOut === true;
    this.queryChildExited = query?.childExited !== false;
  }
}

export class Project004PostApplyValidationError extends Project004PostTransactionValidationError {
  readonly counts: Project004PostTransactionCounts;

  constructor(
    source: Project004PostTransactionValidationError,
    counts: Project004PostTransactionCounts,
  ) {
    super({
      id: source.validationId,
      observed: source.observed,
      expected: source.expected,
    });
    this.counts = counts;
  }
}

export type RemoteDevCommandRunner = (
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
  input?: string,
) => SafeCommandResult;

export type PreflightCheckName =
  | "REMOTE_TARGET_GUARD"
  | "CLI_AUTHENTICATION"
  | "REMOTE_PROJECT_IDENTITY"
  | "REMOTE_DATABASE_CONNECTIVITY"
  | "REMOTE_EMPTY"
  | "LOCAL_MIGRATIONS_0001_0040"
  | "CLEAN_DISPOSABLE_PROOF"
  | "LOCAL_DATABASE_ISOLATED"
  | "OWNER_RUNTIME_ISOLATED";

export const preflightCheckNames: readonly PreflightCheckName[] = [
  "REMOTE_TARGET_GUARD",
  "CLI_AUTHENTICATION",
  "REMOTE_PROJECT_IDENTITY",
  "REMOTE_DATABASE_CONNECTIVITY",
  "REMOTE_EMPTY",
  "LOCAL_MIGRATIONS_0001_0040",
  "CLEAN_DISPOSABLE_PROOF",
  "LOCAL_DATABASE_ISOLATED",
  "OWNER_RUNTIME_ISOLATED",
];

export type RemoteDevCheckState = "PASS" | "FAIL" | "NOT_RUN";

export type RemoteDevPreflightResult = {
  ok: boolean;
  checks: Record<PreflightCheckName, boolean>;
  checkStates: Record<PreflightCheckName, RemoteDevCheckState>;
  project004Canonical: RemoteDevCheckState;
  counts: RemoteEmptyCounts | null;
  plan: MigrationPlan | null;
  resolvedEndpoint: ResolvedRemoteDatabaseEndpoint | null;
  failureCode: string | null;
  failureDetail: RemoteDevSafeFailureDetail | null;
};

export type LocalRemoteDevPreflightResult = {
  ok: boolean;
  project004Canonical: RemoteDevCheckState;
  localMigrationChecksums: RemoteDevCheckState;
  cleanDisposableProof: RemoteDevCheckState;
  plan: MigrationPlan | null;
  failureCode: string | null;
  failureDetail: RemoteDevSafeFailureDetail | null;
};

const publicFailureCodes = new Set([
  "CLI_NOT_AUTHENTICATED",
  "CLI_AUTH_CONTEXT_MISMATCH",
  "CLI_AUTH_OUTPUT_UNRECOGNIZED",
  "CLI_SESSION_EXPIRED",
  "PROJECT_REF_INVALID_FORMAT",
  "PROJECT_NOT_FOUND_OR_UNAUTHORIZED",
  "REMOTE_NAME_MISMATCH",
  "DATABASE_PASSWORD_REJECTED",
  "LOCAL_CHECKSUM_MISMATCH",
  "CLEAN_DISPOSABLE_PROOF_RECEIPT_INVALID",
  "CLEAN_DISPOSABLE_PROOF_RECEIPT_UNAVAILABLE",
  "REMOTE_NOT_EMPTY",
  "SECURE_PROMPT_CANCELLED",
  "SECURE_TTY_UNAVAILABLE",
  "SECURE_TTY_CONFIGURATION_FAILED",
  "SECURE_TTY_READ_FAILED",
  "SECURE_PROMPT_TIMEOUT",
  "CLI_OUTPUT_UNRECOGNIZED",
  "PROJECT004_CANONICAL_MISMATCH",
  "LOCAL_RUNTIME_ISOLATION_FAILED",
  "REMOTE_DATABASE_UNAVAILABLE",
  "PROJECT_NOT_ACTIVE",
  "DNS_RESOLUTION_FAILED",
  "NETWORK_UNREACHABLE",
  "TLS_FAILED",
  "DATABASE_PASSWORD_INVALID",
  "DIRECT_IPV6_UNAVAILABLE",
  "POOLER_UNAVAILABLE",
  "CONNECTION_TIMEOUT",
  "DATABASE_CONNECTION_REFUSED",
  "DATABASE_ERROR_UNRECOGNIZED",
  "REMOTE_CONNECTIVITY_ENDPOINT_INVALID",
  "LINKED_TARGET_MISMATCH",
  "GUARDED_LINK_FAILED",
  "SECURE_PROJECT_CONTEXT_FAILED",
  "DRY_RUN_COMMAND_FAILED",
  "DRY_RUN_OUTPUT_UNRECOGNIZED",
  "LOCAL_RUNTIME_CHANGED",
  "UNEXPECTED_OPERATION_DETECTED",
  "APPLY_OWNER_APPROVAL_REQUIRED",
  "APPLY_PREFLIGHT_FAILED",
  "APPLY_PRECONDITION_CHANGED",
  "DRY_RUN_FINGERPRINT_MISMATCH",
  "REMOTE_SCHEMA_APPLY_FAILED",
  "REMOTE_CONTENT_TRANSACTION_FAILED",
  "REMOTE_CONTENT_ROLLBACK_UNCONFIRMED",
  "REMOTE_CONTENT_SOURCE_INVALID",
  "POST_APPLY_DIAGNOSTIC_UNAVAILABLE",
  "POST_APPLY_DIAGNOSTIC_MISMATCH",
  "POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID",
  "UNCLASSIFIED_FAILURE",
] as const);

export function toRemoteDevRootFailureCode(code: string) {
  if (publicFailureCodes.has(code as never)) return code;
  switch (code) {
    case "REMOTE_PROJECT_REF_INVALID":
      return "PROJECT_REF_INVALID_FORMAT";
    case "REMOTE_TARGET_NAME_REJECTED":
    case "REMOTE_TARGET_FROZEN":
    case "REMOTE_ENVIRONMENT_CLASS_REJECTED":
      return "REMOTE_NAME_MISMATCH";
    case "REMOTE_DATABASE_PASSWORD_INVALID":
    case "REMOTE_DATABASE_PASSWORD_REJECTED":
      return "DATABASE_PASSWORD_REJECTED";
    case "CLI_AUTHENTICATION_FAILED":
      return "CLI_NOT_AUTHENTICATED";
    case "CLI_OUTPUT_UNRECOGNIZED":
      return "CLI_AUTH_OUTPUT_UNRECOGNIZED";
    case "REMOTE_PROJECT_IDENTITY_MISMATCH":
      return "REMOTE_NAME_MISMATCH";
    case "REMOTE_TARGET_NOT_EMPTY":
      return "REMOTE_NOT_EMPTY";
    case "LOCAL_MIGRATION_PLAN_INVALID":
    case "LOCAL_MIGRATION_SET_CHANGED":
    case "LOCAL_MIGRATION_CHECKSUM_CHANGED":
    case "REMOTE_CONTENT_PLAN_INVALID":
      return "LOCAL_CHECKSUM_MISMATCH";
    case "LOCAL_OWNER_RUNTIME_ISOLATION_FAILED":
    case "LOCAL_DATABASE_TARGETED":
      return "LOCAL_RUNTIME_ISOLATION_FAILED";
    case "LINKED_TARGET_ALREADY_EXISTS":
    case "EPHEMERAL_LINK_CHANNEL_FAILED":
    case "PERSISTENT_LINK_DISABLED":
      return "SECURE_PROJECT_CONTEXT_FAILED";
    case "REMOTE_EMPTY_RESPONSE_INVALID":
    case "REMOTE_MIGRATION_RESPONSE_INVALID":
    case "REMOTE_MIGRATION_INSPECTION_FAILED":
      return "CLI_OUTPUT_UNRECOGNIZED";
    case "DRY_RUN_MIGRATION_PLAN_MISMATCH":
    case "DRY_RUN_SEED_DETECTED":
    case "DRY_RUN_UNEXPECTED_OPERATION":
      return "DRY_RUN_OUTPUT_UNRECOGNIZED";
    default:
      return "UNCLASSIFIED_FAILURE";
  }
}

function failureInformation(error: unknown) {
  if (error instanceof RemoteDevGuardFailure) {
    return {
      failureCode: toRemoteDevRootFailureCode(error.code),
      failureDetail: error.detail,
    };
  }
  return {
    failureCode: "UNCLASSIFIED_FAILURE",
    failureDetail: null,
  };
}

const migrationCountSql = String.raw`
begin read only;
set local statement_timeout = '15s';
select concat_ws(
  '|',
  count(*)::integer,
  count(*) filter (
    where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
  )::integer
)
from supabase_migrations.schema_migrations;
commit;
`;

function outputValues(stdout: string) {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}

function parseNonNegativeIntegers(
  raw: string | undefined,
  count: number,
  failureCode: string,
) {
  const values = raw?.split("|").map(Number) ?? [];
  if (
    values.length !== count ||
    values.some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    throw new RemoteDevGuardFailure(failureCode);
  }
  return values;
}

function runPsqlScalar(
  sql: string,
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv,
  runner: RemoteDevCommandRunner,
  resolvedEndpoint?: ResolvedRemoteDatabaseEndpoint,
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
    resolvedEndpoint
      ? buildResolvedRemoteDatabaseEnvironment(
          config,
          resolvedEndpoint,
          environment,
        )
      : buildRemoteDatabaseEnvironment(config, environment),
  );
}

function isDatabasePasswordRejection(result: SafeCommandResult) {
  return /(?:password authentication failed|invalid password|authentication failed)/iu.test(
    `${result.stdout}\n${result.stderr}`,
  );
}

export function parseRemoteBaselineCounts(
  catalogOutput: string,
  migrationOutput?: string,
): RemoteEmptyCounts {
  const [
    platformBaselineObjects,
    plaveApplicationObjects,
    foreignApplicationObjects,
    authUserCount,
    storageObjectCount,
    migrationTableExists,
  ] = parseNonNegativeIntegers(
    outputValues(catalogOutput),
    6,
    "REMOTE_EMPTY_RESPONSE_INVALID",
  );
  let migrationHistoryCount = 0;
  let plaveMigrationHistoryCount = 0;
  if (migrationTableExists === 1) {
    [
      migrationHistoryCount,
      plaveMigrationHistoryCount,
    ] = parseNonNegativeIntegers(
      outputValues(migrationOutput ?? ""),
      2,
      "REMOTE_MIGRATION_RESPONSE_INVALID",
    );
  } else if (migrationTableExists !== 0) {
    throw new RemoteDevGuardFailure(
      "REMOTE_MIGRATION_RESPONSE_INVALID",
    );
  }
  const foreignMigrationHistoryCount =
    migrationHistoryCount - plaveMigrationHistoryCount;
  if (foreignMigrationHistoryCount < 0) {
    throw new RemoteDevGuardFailure(
      "REMOTE_MIGRATION_RESPONSE_INVALID",
    );
  }
  return {
    platformBaselineObjects,
    plaveApplicationObjects,
    foreignApplicationObjects,
    authUserCount,
    storageObjectCount,
    migrationTableExists,
    migrationHistoryCount,
    plaveMigrationHistoryCount,
    foreignMigrationHistoryCount,
  };
}

export function queryRemoteEmptyCounts(
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv = process.env,
  runner: RemoteDevCommandRunner = runCapturedCommand,
  candidateRoot = process.cwd(),
  verifiedPlan?: MigrationPlan,
  resolvedEndpoint?: ResolvedRemoteDatabaseEndpoint,
) {
  const verified =
    verifiedPlan === undefined
      ? loadAndVerifyMigrationPlan(candidateRoot)
      : {
          root: assertProject004Workspace(candidateRoot),
          plan: verifiedPlan,
        };
  const catalogResult = runPsqlScalar(
    buildProject004RemoteBaselineClassificationSql(
      verified.root,
      verified.plan,
    ),
    config,
    environment,
    runner,
    resolvedEndpoint,
  );
  if (!catalogResult.ok) {
    throw new RemoteDevGuardFailure(
      isDatabasePasswordRejection(catalogResult)
        ? "REMOTE_DATABASE_PASSWORD_REJECTED"
        : "REMOTE_DATABASE_UNAVAILABLE",
    );
  }
  const catalogValues = parseNonNegativeIntegers(
    outputValues(catalogResult.stdout),
    6,
    "REMOTE_EMPTY_RESPONSE_INVALID",
  );
  const migrationTableExists = catalogValues[5] ?? -1;
  let migrationOutput: string | undefined;
  if (migrationTableExists === 1) {
    const migrationResult = runPsqlScalar(
      migrationCountSql,
      config,
      environment,
      runner,
      resolvedEndpoint,
    );
    if (!migrationResult.ok) {
      throw new RemoteDevGuardFailure(
        isDatabasePasswordRejection(migrationResult)
          ? "REMOTE_DATABASE_PASSWORD_REJECTED"
          : "REMOTE_MIGRATION_INSPECTION_FAILED",
      );
    }
    migrationOutput = migrationResult.stdout;
  }
  return parseRemoteBaselineCounts(
    catalogResult.stdout,
    migrationOutput,
  );
}

export function isRemoteEmpty(counts: RemoteEmptyCounts) {
  return (
    counts.plaveApplicationObjects === 0 &&
    counts.foreignApplicationObjects === 0 &&
    counts.authUserCount === 0 &&
    counts.storageObjectCount === 0 &&
    counts.migrationHistoryCount === 0
  );
}

export function runLocalRemoteDevPreflight(
  candidateRoot = process.cwd(),
): LocalRemoteDevPreflightResult {
  try {
    assertProject004Workspace(candidateRoot);
  } catch {
    return {
      ok: false,
      project004Canonical: "FAIL",
      localMigrationChecksums: "NOT_RUN",
      cleanDisposableProof: "NOT_RUN",
      plan: null,
      failureCode: "PROJECT004_CANONICAL_MISMATCH",
      failureDetail: null,
    };
  }

  try {
    const { plan } = loadAndVerifyMigrationPlan(candidateRoot);
    try {
      loadAndVerifyCleanDisposableProofReceipt(candidateRoot);
    } catch (error) {
      const failure = failureInformation(error);
      return {
        ok: false,
        project004Canonical: "PASS",
        localMigrationChecksums: "PASS",
        cleanDisposableProof: "FAIL",
        plan,
        failureCode:
          failure.failureCode === "UNCLASSIFIED_FAILURE"
            ? "CLEAN_DISPOSABLE_PROOF_RECEIPT_INVALID"
            : failure.failureCode,
        failureDetail: null,
      };
    }
    return {
      ok: true,
      project004Canonical: "PASS",
      localMigrationChecksums: "PASS",
      cleanDisposableProof: "PASS",
      plan,
      failureCode: null,
      failureDetail: null,
    };
  } catch (error) {
    const failure = failureInformation(error);
    return {
      ok: false,
      project004Canonical: "PASS",
      localMigrationChecksums: "FAIL",
      cleanDisposableProof: "NOT_RUN",
      plan: null,
      failureCode:
        failure.failureCode === "UNCLASSIFIED_FAILURE"
          ? "LOCAL_CHECKSUM_MISMATCH"
          : failure.failureCode,
      failureDetail:
        failure.failureDetail ?? {
          migrationVersion: "PLAN",
          relativePath: project004RemoteDevContract.migrationPlan,
          mismatchType: "UNREADABLE_OR_INVALID",
        },
    };
  }
}

export function runRemoteDevPreflight(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
  resolvedEndpoint?: ResolvedRemoteDatabaseEndpoint;
}): RemoteDevPreflightResult {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const runner =
    options?.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  const checks = Object.fromEntries(
    preflightCheckNames.map((name) => [name, false]),
  ) as Record<PreflightCheckName, boolean>;
  const checkStates = Object.fromEntries(
    preflightCheckNames.map((name) => [name, "NOT_RUN"]),
  ) as Record<PreflightCheckName, RemoteDevCheckState>;
  const local = runLocalRemoteDevPreflight(candidateRoot);
  checkStates.LOCAL_MIGRATIONS_0001_0040 =
    local.localMigrationChecksums;
  checks.LOCAL_MIGRATIONS_0001_0040 =
    local.localMigrationChecksums === "PASS";
  checkStates.CLEAN_DISPOSABLE_PROOF =
    local.cleanDisposableProof;
  checks.CLEAN_DISPOSABLE_PROOF =
    local.cleanDisposableProof === "PASS";
  const plan = local.plan;
  let counts: RemoteEmptyCounts | null = null;
  let resolvedEndpoint: ResolvedRemoteDatabaseEndpoint | null =
    null;
  let failureCode = local.failureCode;
  let failureDetail = local.failureDetail;

  if (local.ok) {
    try {
      const config = {
        projectName:
          environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
        projectRef:
          environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "",
        databasePassword:
          environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
        environmentClass:
          environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
      };
      checkStates.REMOTE_TARGET_GUARD = "FAIL";
      assertRemoteDevTarget(config);
      checks.REMOTE_TARGET_GUARD = true;
      checkStates.REMOTE_TARGET_GUARD = "PASS";

      checkStates.LOCAL_DATABASE_ISOLATED = "FAIL";
      assertLocalIsolation(config, candidateRoot);
      checks.LOCAL_DATABASE_ISOLATED = true;
      checks.OWNER_RUNTIME_ISOLATED = true;
      checkStates.LOCAL_DATABASE_ISOLATED = "PASS";
      checkStates.OWNER_RUNTIME_ISOLATED = "PASS";

      checkStates.CLI_AUTHENTICATION = "FAIL";
      const auth = runCanonicalSupabaseCliAuthCheck({
        environment,
        candidateRoot,
        runner,
      });
      checks.CLI_AUTHENTICATION = true;
      checkStates.CLI_AUTHENTICATION = "PASS";

      checkStates.REMOTE_PROJECT_IDENTITY = "FAIL";
      const project = selectProject004ConnectivityProject(
        auth.projects,
        config,
      );
      checks.REMOTE_PROJECT_IDENTITY = true;
      checkStates.REMOTE_PROJECT_IDENTITY = "PASS";

      checkStates.REMOTE_DATABASE_CONNECTIVITY = "FAIL";
      if (options?.resolvedEndpoint) {
        assertResolvedRemoteDatabaseEndpoint(
          config,
          options.resolvedEndpoint,
        );
        resolvedEndpoint = options.resolvedEndpoint;
      } else {
        resolvedEndpoint =
          resolveProject004RemoteDatabaseEndpoint({
            config,
            project,
            environment,
            runner,
          }).endpoint;
      }
      checks.REMOTE_DATABASE_CONNECTIVITY = true;
      checkStates.REMOTE_DATABASE_CONNECTIVITY = "PASS";

      checkStates.REMOTE_EMPTY = "FAIL";
      counts = queryRemoteEmptyCounts(
        config,
        environment,
        runner,
        candidateRoot,
        plan ?? undefined,
        resolvedEndpoint,
      );
      if (!isRemoteEmpty(counts)) {
        throw new RemoteDevGuardFailure(
          "REMOTE_TARGET_NOT_EMPTY",
        );
      }
      checks.REMOTE_EMPTY = true;
      checkStates.REMOTE_EMPTY = "PASS";
    } catch (error) {
      const failure = failureInformation(error);
      failureCode = failure.failureCode;
      failureDetail = failure.failureDetail;
    }
  }

  return {
    ok: preflightCheckNames.every(
      (name) => checkStates[name] === "PASS",
    ),
    checks,
    checkStates,
    project004Canonical: local.project004Canonical,
    counts,
    plan,
    resolvedEndpoint,
    failureCode,
    failureDetail,
  };
}

export function renderRemoteDevPreflight(
  result: RemoteDevPreflightResult,
) {
  const lines = preflightCheckNames.map(
    (name) => `${name}=${result.checkStates[name]}`,
  );
  lines.push(
    `REMOTE_DATABASE_ENDPOINT_MODE=${
      result.resolvedEndpoint?.mode ?? "NOT_RUN"
    }`,
  );
  if (result.counts) {
    lines.push(
      `PLATFORM_BASELINE_OBJECTS=${result.counts.platformBaselineObjects}`,
      `PLAVE_APPLICATION_OBJECTS=${result.counts.plaveApplicationObjects}`,
      `FOREIGN_APPLICATION_OBJECTS=${result.counts.foreignApplicationObjects}`,
      `AUTH_USER_COUNT=${result.counts.authUserCount}`,
      `STORAGE_OBJECT_COUNT=${result.counts.storageObjectCount}`,
      `MIGRATION_HISTORY_COUNT=${result.counts.migrationHistoryCount}`,
      `PLAVE_MIGRATION_HISTORY_COUNT=${result.counts.plaveMigrationHistoryCount}`,
      `FOREIGN_MIGRATION_HISTORY_COUNT=${result.counts.foreignMigrationHistoryCount}`,
      `REMOTE_BASELINE_CLASSIFICATION=${
        isRemoteEmpty(result.counts) ? "PASS" : "FAIL"
      }`,
    );
  }
  if (result.plan) {
    lines.push(
      `LOCAL_MIGRATIONS_COUNT=${result.plan.migrationCount}`,
    );
  }
  if (result.failureDetail) {
    lines.push(
      `LOCAL_MIGRATION_MISMATCH_VERSION=${result.failureDetail.migrationVersion}`,
      `LOCAL_MIGRATION_MISMATCH_PATH=${result.failureDetail.relativePath}`,
      `LOCAL_MIGRATION_MISMATCH_TYPE=${result.failureDetail.mismatchType}`,
    );
  }
  lines.push(
    `ROOT_FAILURE_CODE=${result.failureCode ?? "NONE"}`,
  );
  lines.push(
    `PROJECT004_REMOTE_DEV_PREFLIGHT=${result.ok ? "PASS" : "FAIL"}`,
  );
  return `${lines.join("\n")}\n`;
}

const ansiOscPattern =
  /\u001B\][^\u0007]*?(?:\u0007|\u001B\\)/gu;
const ansiCsiPattern =
  /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const dryRunOpeningSignature =
  "DRY RUN: migrations will *not* be pushed to the database.";
const dryRunMigrationHeader =
  "Would push these migrations:";
const dryRunFinishedSignature =
  "Finished supabase db push.";

function normalizeDryRunOutput(
  stdout: string,
  stderr: string,
) {
  const terminalText = `${stdout}\n${stderr}`
    .replace(ansiOscPattern, "")
    .replace(ansiCsiPattern, "")
    .replaceAll("\u0008", "");
  return terminalText
    .split(/\r?\n/u)
    .map((line) => line.split("\r").at(-1) ?? "")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣷⣯⣟⡿⢿⣻⣽⣾]\s*/u.test(
          line,
        ) &&
        !/^(?:\[[=#>.\s-]+\]|\d{1,3}%)\s*\d{0,3}%?$/u.test(
          line,
        ),
    );
}

function exactLineCount(
  lines: readonly string[],
  expected: string,
) {
  return lines.filter((line) => line === expected).length;
}

function canonicalPlanChecksumContract(plan: MigrationPlan) {
  return (
    plan.migrationCount ===
      project004RemoteDevContract.migrationCount &&
    plan.migrations.length ===
      project004RemoteDevContract.migrationCount &&
    buildMigrationPlanFingerprint(plan) ===
      plan.migrationPlanFingerprintSha256 &&
    plan.migrations.every((entry, index) => {
      const parsed = parseCanonicalMigrationFilename(
        entry.file,
      );
      return (
        entry.order === index + 1 &&
        parsed?.version === entry.version &&
        /^[a-f0-9]{64}$/u.test(entry.sha256)
      );
    })
  );
}

function countDuplicates(values: readonly string[]) {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const value of values) {
    if (seen.has(value)) duplicates += 1;
    seen.add(value);
  }
  return duplicates;
}

function dryRunParserFailure(
  evidence: Project004DryRunParserEvidence,
): never {
  const rootCode =
    evidence.parserFailureCode === "QUERY_EXIT_FAILED"
      ? "DRY_RUN_COMMAND_FAILED"
      : evidence.parserFailureCode ===
          "SEED_OPERATION_DETECTED"
        ? "DRY_RUN_SEED_DETECTED"
        : evidence.parserFailureCode ===
            "DESTRUCTIVE_OPERATION_DETECTED"
          ? "DRY_RUN_UNEXPECTED_OPERATION"
          : evidence.parserFailureCode ===
                "MIGRATION_COUNT_MISMATCH" ||
              evidence.parserFailureCode ===
                "MIGRATION_DUPLICATE" ||
              evidence.parserFailureCode ===
                "MIGRATION_FOREIGN" ||
              evidence.parserFailureCode ===
                "MIGRATION_OUT_OF_ORDER" ||
              evidence.parserFailureCode ===
                "MIGRATION_FILENAME_MISMATCH" ||
              evidence.parserFailureCode ===
                "MIGRATION_ENTRY_INVALID"
            ? "DRY_RUN_MIGRATION_PLAN_MISMATCH"
            : "DRY_RUN_OUTPUT_UNRECOGNIZED";
  throw new Project004DryRunParserError(
    rootCode,
    evidence,
  );
}

export function inspectProject004DryRunResult(
  result: SafeCommandResult,
  plan: MigrationPlan,
): Project004DryRunParserEvidence {
  const lines = normalizeDryRunOutput(
    result.stdout,
    result.stderr,
  );
  const migrationHeaderIndexes = lines
    .map((line, index) =>
      line === dryRunMigrationHeader ? index : -1,
    )
    .filter((index) => index >= 0);
  const migrationEntries: string[] = [];
  if (migrationHeaderIndexes.length === 1) {
    for (
      let index = (migrationHeaderIndexes[0] ?? -1) + 1;
      index < lines.length;
      index += 1
    ) {
      const line = lines[index] ?? "";
      const bullet =
        /^[•]\s+(\S+[.]sql)(?:\s+\(hash update\))?$/u.exec(
          line,
        );
      if (bullet?.[1]) {
        migrationEntries.push(bullet[1]);
        continue;
      }
      if (migrationEntries.length > 0) break;
    }
  }
  const parsedEntries = migrationEntries.map((file) =>
    parseCanonicalMigrationFilename(file),
  );
  const parsedVersions = parsedEntries
    .map((entry) => entry?.version ?? "")
    .filter(Boolean);
  const expectedFiles = plan.migrations.map(
    (entry) => entry.file,
  );
  const expectedVersions = plan.migrations.map(
    (entry) => entry.version,
  );
  const expectedFileSet = new Set(expectedFiles);
  const invalidEntryCount = parsedEntries.filter(
    (entry) => entry === null,
  ).length;
  const foreignMigrationCount = migrationEntries.filter(
    (file, index) =>
      parsedEntries[index] === null ||
      !expectedFileSet.has(file),
  ).length;
  const duplicateMigrationCount = countDuplicates(
    parsedVersions,
  );
  const migrationOrder =
    parsedVersions.length === 0
      ? ("NOT_RUN" as const)
      : parsedVersions.length === expectedVersions.length &&
          parsedVersions.every(
            (version, index) =>
              version === expectedVersions[index],
          )
        ? ("PASS" as const)
        : ("FAIL" as const);
  const canonicalPlanChecksums =
    canonicalPlanChecksumContract(plan) ? "PASS" : "FAIL";
  const normalizedText = lines.join("\n");
  const seedOperationCount = lines.filter((line) =>
    /(?:Would seed these files:|include[-_ ]?seed|seed[.]sql)/iu.test(
      line,
    ),
  ).length;
  const destructiveOperationCount = lines.filter((line) =>
    /\b(?:db\s+reset|db\s+pull|migration\s+repair|drop\s+(?:database|schema)|truncate\s+table|delete\s+from\s+supabase_migrations)\b/iu.test(
      line,
    ),
  ).length;
  const successSignature =
    exactLineCount(lines, dryRunOpeningSignature) === 1 &&
    exactLineCount(lines, dryRunFinishedSignature) === 1
      ? "PASS"
      : "FAIL";
  let parserFailureCode: Project004DryRunParserFailureCode =
    "NONE";
  if (!result.ok) {
    parserFailureCode = "QUERY_EXIT_FAILED";
  } else if (normalizedText.length === 0) {
    parserFailureCode = "OUTPUT_EMPTY";
  } else if (destructiveOperationCount > 0) {
    parserFailureCode = "DESTRUCTIVE_OPERATION_DETECTED";
  } else if (seedOperationCount > 0) {
    parserFailureCode = "SEED_OPERATION_DETECTED";
  } else if (successSignature === "FAIL") {
    parserFailureCode = "SUCCESS_SIGNATURE_MISSING";
  } else if (migrationHeaderIndexes.length !== 1) {
    parserFailureCode = "MIGRATION_SECTION_MISSING";
  } else if (
    canonicalPlanChecksums === "FAIL" ||
    invalidEntryCount > 0
  ) {
    parserFailureCode = "MIGRATION_ENTRY_INVALID";
  } else if (duplicateMigrationCount > 0) {
    parserFailureCode = "MIGRATION_DUPLICATE";
  } else if (foreignMigrationCount > 0) {
    parserFailureCode = "MIGRATION_FOREIGN";
  } else if (migrationEntries.length !== expectedFiles.length) {
    parserFailureCode = "MIGRATION_COUNT_MISMATCH";
  } else if (migrationOrder === "FAIL") {
    parserFailureCode = "MIGRATION_OUT_OF_ORDER";
  } else if (
    migrationEntries.some(
      (file, index) => file !== expectedFiles[index],
    )
  ) {
    parserFailureCode = "MIGRATION_FILENAME_MISMATCH";
  }
  return {
    queryExit: result.ok ? "PASS" : "FAIL",
    successSignature,
    migrationHeaderCount: migrationHeaderIndexes.length,
    observedMigrationCount: migrationEntries.length,
    observedFirstLast:
      parsedVersions.length > 0
        ? `${parsedVersions[0]}/${parsedVersions.at(-1)}`
        : "NONE",
    duplicateMigrationCount,
    foreignMigrationCount,
    migrationOrder,
    canonicalPlanChecksums,
    seedOperationCount,
    destructiveOperationCount,
    parserFailureCode,
  };
}

export function verifyProject004DryRunResult(
  result: SafeCommandResult,
  plan: MigrationPlan,
) {
  const evidence = inspectProject004DryRunResult(
    result,
    plan,
  );
  if (evidence.parserFailureCode !== "NONE") {
    dryRunParserFailure(evidence);
  }
  return evidence;
}

export function verifyDryRunOutput(
  rawOutput: string,
  plan: MigrationPlan,
) {
  return verifyProject004DryRunResult(
    {
      ok: true,
      stdout: rawOutput,
      stderr: "",
    },
    plan,
  );
}

export function executeGuardedDryRun(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
  preflight?: RemoteDevPreflightResult;
}) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const runner =
    options?.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  const preflight =
    options?.preflight ??
    runRemoteDevPreflight({
      environment,
      candidateRoot,
      runner,
    });
  if (
    !preflight.ok ||
    !preflight.plan ||
    !preflight.resolvedEndpoint
  ) {
    throw new RemoteDevGuardFailure(
      preflight.failureCode ?? "DRY_RUN_PREFLIGHT_FAILED",
    );
  }
  const config = {
    projectName:
      environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
    projectRef:
      environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "",
    databasePassword:
      environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
    environmentClass:
      environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
  };
  const root = assertLocalIsolation(config, candidateRoot);
  assertLinkedTarget(root, config);
  const cliEnvironment = buildResolvedRemoteCliEnvironment(
    config,
    preflight.resolvedEndpoint,
    environment,
  );
  const result = runner(
    "supabase",
    ["db", "push", "--dry-run"],
    cliEnvironment,
  );
  const parserEvidence = verifyProject004DryRunResult(
    result,
    preflight.plan,
  );
  return {
    migrationCount: preflight.plan.migrationCount,
    firstMigration:
      preflight.plan.migrations[0]?.version ?? "",
    lastMigration:
      preflight.plan.migrations.at(-1)?.version ?? "",
    parserEvidence,
  };
}

export function executeGuardedLink(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
}) {
  void options;
  throw new RemoteDevGuardFailure(
    "PERSISTENT_LINK_DISABLED",
  );
}

function diagnosticSqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

const diagnosticRelease =
  buildUniversalCurriculumRelease();
const diagnosticReleaseRow = diagnosticRelease.release;
const diagnosticPublishedLegacySlugs =
  project004LegacyPublishedUnitSlugs
    .map(diagnosticSqlText)
    .join(",");

export const project004PostApplyDiagnosticSql = String.raw`
begin read only;
set local statement_timeout = '30s';
with migration_rows as (
  select
    count(*)::integer as total,
    count(*) filter (
      where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
    )::integer as canonical,
    coalesce(min(version), 'NONE') as first_version,
    coalesce(max(version), 'NONE') as last_version
  from supabase_migrations.schema_migrations
),
canonical_release as (
  select release.release_id
  from public.curriculum_releases as release
  where
    release.release_id =
      ${diagnosticSqlText(diagnosticReleaseRow.releaseId)}
    and release.content_version =
      ${diagnosticSqlText(diagnosticReleaseRow.contentVersion)}
    and release.curriculum_source_fingerprint =
      ${diagnosticSqlText(
        diagnosticReleaseRow.curriculumSourceFingerprint,
      )}
    and release.generator_version =
      ${diagnosticSqlText(diagnosticReleaseRow.generatorVersion)}
    and release.deterministic_seed =
      ${diagnosticSqlText(diagnosticReleaseRow.deterministicSeed)}
    and release.mastery_policy_version =
      ${diagnosticSqlText(
        diagnosticReleaseRow.masteryPolicyVersion,
      )}
    and release.public_payload_sha256 =
      ${diagnosticSqlText(
        diagnosticRelease.hashes.publicPayloadSha256,
      )}
    and release.private_solution_sha256 =
      ${diagnosticSqlText(
        diagnosticRelease.hashes.privateSolutionSha256,
      )}
    and release.bundle_sha256 =
      ${diagnosticSqlText(
        diagnosticRelease.hashes.bundleSha256,
      )}
    and release.status = 'DRAFT'
    and release.activation_state = 'INACTIVE'
    and release.activated_at is null
),
release_counts as (
  select
    count(*)::integer as releases,
    count(*) filter (
      where status = 'DRAFT' and activation_state = 'INACTIVE'
    )::integer as draft_inactive_releases,
    count(*) filter (
      where status = 'ACTIVE' or activation_state = 'ACTIVE'
    )::integer as active_releases
  from public.curriculum_releases
),
adaptive_counts as (
  select
    count(*)::integer as releases,
    count(*) filter (
      where
        unit_slug =
          ${diagnosticSqlText(project004LegacyDraftUnitSlug)}
        and release_candidate_id = 'g2-numbers-to-1000-rc1'
        and content_version = 'g2n1000-1.0.0-rc.1'
        and bundle_sha256 =
          '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530'
        and policy_version =
          'g2n1000-adaptive-policy-1.0.0-pilot'
        and not runtime_enabled
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
outcome_counts as (
  select count(distinct expanded.outcome_id)::integer as value
  from public.curriculum_release_questions as question
  join canonical_release as release
    on release.release_id = question.release_id
  cross join unnest(question.official_outcome_ids)
    as expanded(outcome_id)
),
legacy_counts as (
  select
    (select count(*) from public.learning_units)::integer
      as units,
    (
      select count(*)
      from public.learning_units
      where published
    )::integer as published_units,
    (select count(*) from public.questions)::integer
      as questions,
    (
      select count(*)
      from public.questions
      where published
    )::integer as published_questions,
    (select count(*) from public.question_solutions)::integer
      as solutions,
    (
      select count(*)
      from public.grade1_diagnostic_blueprint
    )::integer as diagnostic_rows
),
legacy_noncanonical as (
  select count(*)::integer as value
  from (
    select unit.slug
    from public.learning_units as unit
    where not (
      (
        unit.grade = 1
        and unit.published
        and unit.total_questions = 24
        and unit.slug = any(
          array[${diagnosticPublishedLegacySlugs}]::text[]
        )
      )
      or (
        unit.slug =
          ${diagnosticSqlText(project004LegacyDraftUnitSlug)}
        and unit.grade = 2
        and not unit.published
        and unit.total_questions = 24
      )
    )
    union all
    select question.code
    from public.questions as question
    left join public.learning_units as unit
      on unit.slug = question.unit_slug
    where
      question.display_order not between 1 and 24
      or unit.slug is null
      or not (
        (
          unit.grade = 1
          and unit.published
          and question.published
          and unit.slug = any(
            array[${diagnosticPublishedLegacySlugs}]::text[]
          )
        )
        or (
          unit.slug =
            ${diagnosticSqlText(project004LegacyDraftUnitSlug)}
          and unit.grade = 2
          and not unit.published
          and not question.published
        )
      )
    union all
    select grouped.unit_slug
    from (
      select question.unit_slug, count(*) as value
      from public.questions as question
      group by question.unit_slug
    ) as grouped
    where grouped.value <> 24
    union all
    select question.code
    from public.questions as question
    left join public.question_solutions as solution
      on solution.question_id = question.code
    where solution.question_id is null
  ) as noncanonical
),
synthetic_user_counts as (
  select (
    (select count(*) from public.profiles)
    + (select count(*) from public.student_profiles)
    + (select count(*) from public.learning_goals)
    + (select count(*) from public.parent_student_connections)
    + (select count(*) from public.parent_student_lookup_failures)
    + (select count(*) from public.parent_goal_suggestions)
    + (select count(*) from public.teacher_invitations)
    + (select count(*) from public.teacher_profiles)
    + (select count(*) from public.classrooms)
    + (select count(*) from public.classroom_memberships)
    + (select count(*) from public.teacher_questions)
    + (select count(*) from public.teacher_question_solutions)
    + (select count(*) from public.teacher_assignments)
    + (select count(*) from public.teacher_assignment_items)
    + (select count(*) from public.assignment_submissions)
    + (select count(*) from public.assignment_answers)
    + (select count(*) from public.practice_attempts)
    + (select count(*) from public.practice_answers)
    + (select count(*) from public.diagnostic_attempts)
    + (select count(*) from public.diagnostic_answers)
    + (select count(*) from public.curriculum_attempts)
    + (select count(*) from public.curriculum_answers)
    + (select count(*) from public.student_curriculum_unit_progress)
    + (select count(*) from public.student_curriculum_outcome_progress)
    + (select count(*) from public.student_curriculum_skill_progress)
    + (select count(*) from public.adaptive_practice_attempts)
    + (select count(*) from public.adaptive_practice_answers)
    + (
      select count(*)
      from public.teacher_curriculum_assignment_drafts
    )
    + (
      select count(*)
      from public.teacher_curriculum_assignment_draft_items
    )
    + (
      select count(*)
      from private.assignment_submission_mutations
    )
    + (
      select count(*)
      from public.student_assignment_outcome_progress
    )
    + (
      select count(*)
      from public.student_assignment_skill_progress
    )
  )::integer as value
),
on_demand_runtime_counts as (
  select (
    (select count(*) from private.curriculum_generation_runtime_secret)
    + (select count(*) from public.curriculum_generated_questions)
    + (select count(*) from private.curriculum_generated_solutions)
    + (select count(*) from public.curriculum_generated_answers)
  )::integer as value
),
rls_gaps as (
  select count(*)::integer as value
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'private')
    and relation.relkind in ('r', 'p')
    and not relation.relrowsecurity
    and not exists (
      select 1
      from pg_catalog.pg_depend as dependency
      where dependency.classid = 'pg_class'::regclass
        and dependency.objid = relation.oid
        and dependency.deptype = 'e'
    )
),
private_grant_leaks as (
  select count(*)::integer as value
  from information_schema.role_table_grants
  where table_schema = 'private'
    and lower(grantee) in ('anon', 'authenticated', 'public')
),
required_tables as (
  select count(*)::integer as value
  from unnest(array[
    'public.adaptive_practice_releases',
    'public.adaptive_practice_attempts',
    'public.adaptive_practice_answers',
    'public.adaptive_practice_pilot_members',
    'public.curriculum_releases',
    'public.curriculum_release_units',
    'public.curriculum_release_questions',
    'private.curriculum_release_solutions',
    'public.curriculum_legacy_grade1_outcome_mappings',
    'public.curriculum_attempts',
    'public.curriculum_answers',
    'public.student_curriculum_unit_progress',
    'public.student_curriculum_outcome_progress',
    'public.student_curriculum_skill_progress',
    'public.teacher_curriculum_assignment_drafts',
    'public.teacher_curriculum_assignment_draft_items',
    'private.assignment_submission_mutations',
    'public.student_assignment_outcome_progress',
    'public.student_assignment_skill_progress',
    'private.curriculum_generation_runtime_secret',
    'public.curriculum_generated_questions',
    'private.curriculum_generated_solutions',
    'public.curriculum_generated_answers'
  ]) as required(name)
  where pg_catalog.to_regclass(required.name) is not null
),
required_functions as (
  select count(distinct procedure.proname)::integer as value
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('public', 'private')
    and procedure.proname in (
      'start_or_resume_adaptive_practice',
      'get_adaptive_practice_state',
      'submit_adaptive_practice_answer',
      'get_adaptive_controlled_pilot_availability',
      'start_or_resume_curriculum_unit',
      'get_curriculum_attempt_state',
      'submit_curriculum_answer',
      'get_student_curriculum_progress',
      'get_student_curriculum_history',
      'get_teacher_curriculum_catalog',
      'create_teacher_curriculum_assignment_draft',
      'publish_teacher_curriculum_assignment_draft',
      'get_parent_child_universal_progress',
      'start_or_resume_generated_curriculum',
      'get_generated_curriculum_attempt_state',
      'submit_generated_curriculum_answer',
      'get_my_generated_curriculum_evidence',
      'get_parent_child_generated_curriculum_progress'
    )
),
auth_triggers as (
  select count(*)::integer as value
  from pg_catalog.pg_trigger
  where tgrelid = 'auth.users'::regclass
    and tgname = 'on_auth_user_created'
    and not tgisinternal
),
pgcrypto_extensions as (
  select count(*)::integer as value
  from pg_catalog.pg_extension
  where extname = 'pgcrypto'
)
select concat_ws(
  '|',
  ${diagnosticSqlText(project004PostApplyPayloadSentinel)},
  migration_rows.total,
  migration_rows.canonical,
  migration_rows.first_version,
  migration_rows.last_version,
  release_counts.releases,
  (select count(*) from canonical_release),
  release_counts.draft_inactive_releases,
  release_counts.active_releases,
  (
    select count(*)
    from public.curriculum_release_units as unit
    join canonical_release as release
      on release.release_id = unit.release_id
  ),
  (
    select count(*)
    from public.curriculum_release_questions as question
    join canonical_release as release
      on release.release_id = question.release_id
  ),
  (
    select count(*)
    from private.curriculum_release_solutions as solution
    join canonical_release as release
      on release.release_id = solution.release_id
  ),
  outcome_counts.value,
  (
    (select count(*) from public.curriculum_releases)
    - (select count(*) from canonical_release)
    + (select count(*) from public.curriculum_release_units)
    - (
      select count(*)
      from public.curriculum_release_units as unit
      join canonical_release as release
        on release.release_id = unit.release_id
    )
    + (select count(*) from public.curriculum_release_questions)
    - (
      select count(*)
      from public.curriculum_release_questions as question
      join canonical_release as release
        on release.release_id = question.release_id
    )
    + (select count(*) from private.curriculum_release_solutions)
    - (
      select count(*)
      from private.curriculum_release_solutions as solution
      join canonical_release as release
        on release.release_id = solution.release_id
    )
  ),
  legacy_counts.units,
  legacy_counts.published_units,
  legacy_counts.questions,
  legacy_counts.published_questions,
  legacy_counts.solutions,
  legacy_counts.diagnostic_rows,
  legacy_noncanonical.value,
  (
    legacy_counts.units
    + (select count(*) from public.curriculum_release_units)
  ),
  (
    legacy_counts.questions
    + (select count(*) from public.curriculum_release_questions)
  ),
  (
    legacy_counts.solutions
    + (select count(*) from private.curriculum_release_solutions)
  ),
  (select count(*) from auth.users),
  (select count(*) from storage.objects),
  synthetic_user_counts.value,
  adaptive_counts.releases,
  adaptive_counts.exact_disabled,
  adaptive_counts.enabled,
  (select count(*) from public.adaptive_practice_pilot_members),
  (select count(*) from private.curriculum_generation_runtime_secret),
  on_demand_runtime_counts.value,
  rls_gaps.value,
  private_grant_leaks.value,
  required_tables.value,
  required_functions.value,
  auth_triggers.value,
  pgcrypto_extensions.value
)
from migration_rows, release_counts, adaptive_counts, outcome_counts,
  legacy_counts, legacy_noncanonical, synthetic_user_counts,
  on_demand_runtime_counts, rls_gaps, private_grant_leaks,
  required_tables, required_functions, auth_triggers,
  pgcrypto_extensions;
commit;
`;

export function queryRemotePostApplyCounts(
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv = process.env,
  runner: RemoteDevCommandRunner = runCapturedCommand,
  resolvedEndpoint?: ResolvedRemoteDatabaseEndpoint,
) {
  const result = runPsqlScalar(
    project004PostApplyDiagnosticSql,
    config,
    environment,
    runner,
    resolvedEndpoint,
  );
  if (!result.ok) {
    throw new RemoteDevGuardFailure(
      "POST_APPLY_DIAGNOSTIC_UNAVAILABLE",
    );
  }
  return parseProject004PostApplyCounts(result.stdout);
}

export function parseProject004PostApplyCounts(
  rawOutput: string,
) {
  return parseProject004PostApplyResponse(
    rawOutput,
    "PASS",
  ).counts;
}

function payloadVersion(value: string) {
  const match =
    /^PROJECT004_POST_TRANSACTION_(V[0-9]+)$/u.exec(value);
  return match?.[1] ?? "UNKNOWN";
}

function parserFailure(
  evidence: Project004PostApplyParserEvidence,
  query?: Project004PostApplyQueryResult,
): never {
  throw new Project004PostApplyResponseError(
    evidence,
    query,
  );
}

export function inspectProject004PostApplyResponse(
  rawOutput: string,
  queryExit: "PASS" | "FAIL" = "PASS",
): Project004PostApplyParserEvidence {
  const lines = rawOutput
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const payloadRows = lines.filter((line) =>
    /^PROJECT004_POST_TRANSACTION_V[0-9]+(?:\||$)/u.test(
      line,
    ),
  );
  const selected = payloadRows[0] ?? "";
  const fields = selected ? selected.split("|") : [];
  const version = payloadVersion(fields[0] ?? "");
  let parserFailureCode:
    Project004PostApplyParserFailureCode = "NONE";
  if (queryExit === "FAIL") {
    parserFailureCode = "QUERY_EXIT_FAILED";
  } else if (payloadRows.length === 0) {
    parserFailureCode = "PAYLOAD_SENTINEL_MISSING";
  } else if (payloadRows.length > 1) {
    parserFailureCode = "PAYLOAD_SENTINEL_DUPLICATE";
  } else if (
    fields[0] !== project004PostApplyPayloadSentinel
  ) {
    parserFailureCode = "PAYLOAD_VERSION_MISMATCH";
  } else if (
    fields.length - 1 !==
    project004PostApplyPayloadFieldCount
  ) {
    parserFailureCode = "PAYLOAD_FIELD_COUNT_INVALID";
  }
  return {
    queryExit,
    payloadSentinelCount: payloadRows.length,
    payloadFieldCount: Math.max(0, fields.length - 1),
    payloadVersion: version,
    parserFailureCode,
  };
}

function parseProject004PostApplyResponse(
  rawOutput: string,
  queryExit: "PASS" | "FAIL",
  query?: Project004PostApplyQueryResult,
) {
  const evidence = inspectProject004PostApplyResponse(
    rawOutput,
    queryExit,
  );
  if (evidence.parserFailureCode !== "NONE") {
    parserFailure(evidence, query);
  }
  const payloadRow = rawOutput
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) =>
      line.startsWith(
        `${project004PostApplyPayloadSentinel}|`,
      ),
    );
  const fields = payloadRow?.split("|").slice(1) ?? [];
  if (
    fields.length !== project004PostApplyPayloadFieldCount ||
    !/^\d{4}$/u.test(fields[2] ?? "") ||
    !/^\d{4}$/u.test(fields[3] ?? "")
  ) {
    parserFailure(
      {
        ...evidence,
        parserFailureCode: "PAYLOAD_VALUE_INVALID",
      },
      query,
    );
  }
  const numericValues = fields
    .filter((_, index) => index !== 2 && index !== 3)
    .map(Number);
  if (
    numericValues.some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    parserFailure(
      {
        ...evidence,
        parserFailureCode: "PAYLOAD_VALUE_INVALID",
      },
      query,
    );
  }
  const [
    migrationRows,
    canonicalMigrationRows,
    releases,
    canonicalReleaseRows,
    draftInactiveReleases,
    activeReleases,
    units,
    publicQuestions,
    privateSolutions,
    officialOutcomes,
    foreignReleaseContentRows,
    legacyLearningUnits,
    publishedLearningUnits,
    legacyQuestions,
    publishedQuestions,
    legacySolutions,
    diagnosticBlueprintRows,
    legacyNonCanonicalRows,
    physicalUnitRows,
    physicalQuestionRows,
    physicalSolutionRows,
    authUsers,
    storageObjects,
    syntheticUserRows,
    adaptiveReleaseRows,
    adaptiveExactDisabledRows,
    adaptiveEnabledRows,
    adaptivePilotRows,
    runtimeSecretRows,
    onDemandRuntimeRows,
    rlsGaps,
    privateGrantLeaks,
    requiredTables,
    requiredFunctions,
    authTriggers,
    pgcryptoExtensions,
  ] = numericValues;
  const counts = {
    migrationRows,
    canonicalMigrationRows,
    migrationFirst: fields[2] ?? "",
    migrationLast: fields[3] ?? "",
    releases,
    canonicalReleaseRows,
    draftInactiveReleases,
    activeReleases,
    units,
    publicQuestions,
    privateSolutions,
    officialOutcomes,
    foreignReleaseContentRows,
    legacyLearningUnits,
    publishedLearningUnits,
    legacyQuestions,
    publishedQuestions,
    legacySolutions,
    diagnosticBlueprintRows,
    legacyNonCanonicalRows,
    physicalUnitRows,
    physicalQuestionRows,
    physicalSolutionRows,
    authUsers,
    storageObjects,
    syntheticUserRows,
    adaptiveReleaseRows,
    adaptiveExactDisabledRows,
    adaptiveEnabledRows,
    adaptivePilotRows,
    runtimeSecretRows,
    onDemandRuntimeRows,
    rlsGaps,
    privateGrantLeaks,
    requiredTables,
    requiredFunctions,
    authTriggers,
    pgcryptoExtensions,
  } satisfies RemotePostApplyCounts;
  return { counts, evidence };
}

export function verifyRemotePostApplyCounts(
  counts: RemotePostApplyCounts,
) {
  return verifyProject004PostTransactionCounts(counts);
}

export async function executeProject004PostTransactionVerifier(
  execute: (
    request: Project004PostApplyQueryRequest,
  ) =>
    | Project004PostApplyQueryResult
    | Promise<Project004PostApplyQueryResult>,
) {
  const query = await execute({
    sql: project004PostApplyDiagnosticSql,
    machineOutput: true,
  });
  const queryExit =
    query.ok && query.childExited !== false
      ? "PASS"
      : "FAIL";
  const parsed = parseProject004PostApplyResponse(
    query.stdout,
    queryExit,
    query,
  );
  try {
    verifyRemotePostApplyCounts(parsed.counts);
  } catch (error) {
    if (
      error instanceof
      Project004PostTransactionValidationError
    ) {
      throw new Project004PostApplyValidationError(
        error,
        parsed.counts,
      );
    }
    throw error;
  }
  return {
    query,
    counts: parsed.counts,
    parserEvidence: parsed.evidence,
  };
}

export function executeReadOnlyPostApplyDiagnostic(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
}) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const runner =
    options?.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  const config = {
    projectName:
      environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
    projectRef:
      environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "",
    databasePassword:
      environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
    environmentClass:
      environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
  };
  assertRemoteDevTarget(config);
  loadAndVerifyMigrationPlan(candidateRoot);
  assertLocalIsolation(config, candidateRoot);
  const auth = runCanonicalSupabaseCliAuthCheck({
    environment,
    candidateRoot,
    runner,
  });
  const project = selectProject004ConnectivityProject(
    auth.projects,
    config,
  );
  const resolvedEndpoint =
    resolveProject004RemoteDatabaseEndpoint({
      config,
      project,
      environment,
      runner,
    }).endpoint;
  const counts = queryRemotePostApplyCounts(
    config,
    environment,
    runner,
    resolvedEndpoint,
  );
  verifyRemotePostApplyCounts(counts);
  return counts;
}
