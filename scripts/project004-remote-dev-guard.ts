import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";
import { loadGeneratedPersistenceMigrationInventory } from "./project004-generated-persistence-migration-inventory.ts";

export const project004RemoteDevContract = {
  projectName: "plave-project004-dev-clean",
  retiredPartialProjectName: "plave-project004-dev",
  environmentClass: "EMPTY_DEVELOPMENT",
  migrationCount: 40,
  migrationFirst: "0001",
  migrationLast: "0040",
  migrationPlan:
    "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json",
  disposableProof:
    "docs/operations/PROJECT004_CLEAN_REMOTE_DISPOSABLE_PROOF.json",
  disposableProofReceipt:
    "docs/operations/PROJECT004_CLEAN_REMOTE_DISPOSABLE_PROOF_RECEIPT.json",
  schemaSemanticFingerprintSha256:
    "d81cbaa38b586207eb843d9c73356901aff257505086b7a4029d02fdc5e0e34c",
  cleanDisposableProofFingerprintSha256:
    "b84f19f47ff0e2fc6b2ca262d34e3d0eee2c8f595265b6d217541d66ce32dd50",
  linkedRefMarker: "supabase/.temp/project-ref",
  poolerUrlMarker: "supabase/.temp/pooler-url",
  linkApproval: "PROJECT004_REMOTE_DEV_LINK_APPROVED",
  applyApproval:
    "PROJECT004_CLEAN_REMOTE_APPLY_0001_0040_AND_DRAFT_CURRICULUM",
  applyAuthorizationStatus:
    "CONSUMED_REMOTE_PROVISIONED",
  forwardRecoveryApproval:
    "ARCHIVED_PARTIAL_REMOTE_RECOVERY_NOT_AUTHORIZED",
} as const;

export class RemoteDevGuardFailure extends Error {
  readonly code: string;
  readonly detail: RemoteDevSafeFailureDetail | null;

  constructor(
    code: string,
    detail: RemoteDevSafeFailureDetail | null = null,
  ) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

export type RemoteDevSafeFailureDetail = {
  migrationVersion: string;
  relativePath: string;
  mismatchType: string;
};

function fail(
  code: string,
  detail: RemoteDevSafeFailureDetail | null = null,
): never {
  throw new RemoteDevGuardFailure(code, detail);
}

const frozenTargetFragment = `project${"003"}`;
const productionLikePattern =
  /(?:^|[-_])(prod|production|live|main|primary)(?:$|[-_])/iu;

export type RemoteDevPrivateConfig = {
  projectName: string;
  projectRef: string;
  databasePassword: string;
  environmentClass: string;
};

export type MigrationPlanEntry = {
  order: number;
  version: string;
  file: string;
  sha256: string;
};

export type MigrationPlan = {
  project: string;
  targetName: string;
  status: string;
  migrationCount: number;
  migrationPlanFingerprintSha256: string;
  seedIncluded: boolean;
  activationIncluded: boolean;
  publicationIncluded: boolean;
  migrations: MigrationPlanEntry[];
  postMigrationContentTransaction: {
    source: string;
    releaseState: string;
    units: number;
    publicQuestions: number;
    privateSolutions: number;
    officialOutcomes: number;
    usesLocalDatabaseData: boolean;
    seedsUsersOrHistory: boolean;
  };
};

export type CanonicalMigrationFilename = {
  version: string;
  numericVersion: number;
  suffix: string;
  filename: string;
};

export type CanonicalMigrationDirectoryAudit = {
  discoveredFileCount: number;
  parsedCanonicalVersionCount: number;
  duplicateVersionCount: number;
  missingVersionCount: number;
  unparseableCount: number;
  normalizedFirst: string;
  normalizedLast: string;
  orderedFilenames: string[];
  badRelativePaths: string[];
};

export type CanonicalMigrationInventory = {
  root: string;
  plan: MigrationPlan;
  sourceAudit: CanonicalMigrationDirectoryAudit;
  entries: Array<
    MigrationPlanEntry & {
      absolutePath: string;
      relativePath: string;
    }
  >;
};

export type CanonicalMigrationCopyAudit = {
  sourceCount: number;
  copyCount: number;
  sourceFirst: string;
  sourceLast: string;
  copyFirst: string;
  copyLast: string;
  checksumMismatchCount: number;
  badRelativePaths: string[];
  pass: boolean;
};

export function normalizeCanonicalMigrationVersion(
  value: string,
) {
  if (!/^[0-9]{4}$/u.test(value)) return null;
  const numericVersion = Number(value);
  if (
    !Number.isSafeInteger(numericVersion) ||
    numericVersion < 1 ||
    numericVersion > 44 ||
    String(numericVersion).padStart(4, "0") !== value
  ) {
    return null;
  }
  return value;
}

export function buildMigrationPlanFingerprint(
  plan: MigrationPlan,
) {
  const payload = [
    "PROJECT004_CLEAN_REMOTE_APPLY_PLAN_V1",
    `target=${plan.targetName}`,
    `count=${plan.migrationCount}`,
    `seed=${plan.seedIncluded}`,
    ...plan.migrations.map(
      (entry) =>
        `${entry.order}|${entry.version}|${entry.file}|${entry.sha256}`,
    ),
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function parseCanonicalMigrationFilename(
  filename: string,
): CanonicalMigrationFilename | null {
  const match =
    /^([0-9]{4})_([a-z0-9]+(?:_[a-z0-9]+)*)[.]sql$/u.exec(
      filename,
    );
  if (!match) return null;
  const version = match[1] ?? "";
  const suffix = match[2] ?? "";
  const numericVersion = Number(version);
  if (
    normalizeCanonicalMigrationVersion(version) === null
  ) {
    return null;
  }
  return {
    version,
    numericVersion,
    suffix,
    filename,
  };
}

export function auditCanonicalMigrationDirectory(
  directory: string,
  relativePrefix = "supabase/migrations",
): CanonicalMigrationDirectoryAudit {
  const directoryEntries = readdirSync(directory, {
    withFileTypes: true,
  });
  const regularFiles = directoryEntries.filter((entry) =>
    entry.isFile(),
  );
  const parsed = regularFiles
    .map((entry) =>
      parseCanonicalMigrationFilename(entry.name),
    )
    .filter(
      (
        entry,
      ): entry is CanonicalMigrationFilename => entry !== null,
    );
  const versionCounts = new Map<string, number>();
  for (const entry of parsed) {
    versionCounts.set(
      entry.version,
      (versionCounts.get(entry.version) ?? 0) + 1,
    );
  }
  const expectedVersions = Array.from(
    {
      length: project004RemoteDevContract.migrationCount,
    },
    (_, index) => String(index + 1).padStart(4, "0"),
  );
  const missingVersions = expectedVersions.filter(
    (version) => !versionCounts.has(version),
  );
  const duplicateVersionCount = [...versionCounts.values()]
    .filter((count) => count > 1)
    .reduce((total, count) => total + count - 1, 0);
  const unparseableEntries = directoryEntries.filter(
    (entry) =>
      !entry.isFile() ||
      parseCanonicalMigrationFilename(entry.name) === null,
  );
  const ordered = [...parsed].sort(
    (left, right) =>
      left.numericVersion - right.numericVersion ||
      left.filename.localeCompare(right.filename),
  );
  return {
    discoveredFileCount: regularFiles.length,
    parsedCanonicalVersionCount: parsed.length,
    duplicateVersionCount,
    missingVersionCount: missingVersions.length,
    unparseableCount: unparseableEntries.length,
    normalizedFirst: ordered[0]?.version ?? "NOT_RUN",
    normalizedLast: ordered.at(-1)?.version ?? "NOT_RUN",
    orderedFilenames: ordered.map((entry) => entry.filename),
    badRelativePaths: [
      ...unparseableEntries.map(
        (entry) => `${relativePrefix}/${entry.name}`,
      ),
      ...missingVersions.map(
        (version) =>
          `${relativePrefix}/${version}_MISSING.sql`,
      ),
    ].sort(),
  };
}

function canonicalDirectoryAuditPass(
  audit: CanonicalMigrationDirectoryAudit,
) {
  return (
    audit.discoveredFileCount ===
      project004RemoteDevContract.migrationCount &&
    audit.parsedCanonicalVersionCount ===
      project004RemoteDevContract.migrationCount &&
    audit.duplicateVersionCount === 0 &&
    audit.missingVersionCount === 0 &&
    audit.unparseableCount === 0 &&
    audit.normalizedFirst ===
      project004RemoteDevContract.migrationFirst &&
    audit.normalizedLast ===
      project004RemoteDevContract.migrationLast
  );
}

export function readRemoteDevPrivateConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RemoteDevPrivateConfig {
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
  return config;
}

export function assertRemoteDevTarget(
  config: RemoteDevPrivateConfig,
) {
  const normalizedName = config.projectName.trim().toLowerCase();
  if (
    normalizedName ===
      project004RemoteDevContract.retiredPartialProjectName ||
    normalizedName.includes(frozenTargetFragment) ||
    config.projectRef.toLowerCase().includes(frozenTargetFragment)
  ) {
    fail("REMOTE_TARGET_FROZEN");
  }
  if (
    normalizedName !== project004RemoteDevContract.projectName ||
    productionLikePattern.test(normalizedName)
  ) {
    fail("REMOTE_TARGET_NAME_REJECTED");
  }
  if (
    config.environmentClass !==
    project004RemoteDevContract.environmentClass
  ) {
    fail("REMOTE_ENVIRONMENT_CLASS_REJECTED");
  }
  if (!/^[a-z0-9]{20}$/u.test(config.projectRef)) {
    fail("REMOTE_PROJECT_REF_INVALID");
  }
  if (
    config.databasePassword.length < 12 ||
    config.databasePassword.length > 256 ||
    /[\r\n\0]/u.test(config.databasePassword)
  ) {
    fail("REMOTE_DATABASE_PASSWORD_INVALID");
  }
}

export function loadAndVerifyMigrationPlan(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  // The provisioning plan is a finalized 0001-0040 Owner fixture. The live
  // repository has since advanced canonically through 0044, so validate the
  // entire modern inventory (including pinned 0041-0044 identities) before
  // comparing the immutable plan with its exact historical prefix. An isolated
  // frozen 0001-0040 fixture remains valid for historical operation tests.
  const migrationDirectory = resolve(root, "supabase/migrations");
  const currentFilenames = readdirSync(migrationDirectory)
    .filter((filename) => /^[0-9]{4}_[a-z0-9]+(?:_[a-z0-9]+)*[.]sql$/u.test(filename))
    .sort((left, right) => left.localeCompare(right));
  const supportedCurrentInventory =
    (currentFilenames.length === 44 &&
      currentFilenames.at(-1)?.startsWith("0044_")) ||
    (currentFilenames.length === 45 &&
      currentFilenames.at(-1) ===
        "0045_grades_2_9_local_public_release.sql");
  const actualFiles = supportedCurrentInventory
    ? loadGeneratedPersistenceMigrationInventory(root).entries
        .slice(0, project004RemoteDevContract.migrationCount)
        .map((entry) => entry.filename)
    : currentFilenames.length === project004RemoteDevContract.migrationCount
      ? currentFilenames
      : [];
  const plan = JSON.parse(
    readFileSync(
      resolve(root, project004RemoteDevContract.migrationPlan),
      "utf8",
    ),
  ) as MigrationPlan;
  if (
    plan.project !== "PLAVE-PROJECT004" ||
    plan.targetName !== project004RemoteDevContract.projectName ||
    plan.status !== "CLEAN_APPLY_PLAN" ||
    plan.migrationCount !==
      project004RemoteDevContract.migrationCount ||
    plan.seedIncluded ||
    plan.activationIncluded ||
    plan.publicationIncluded ||
    plan.migrations.length !==
      project004RemoteDevContract.migrationCount ||
    !/^[0-9a-f]{64}$/u.test(
      plan.migrationPlanFingerprintSha256,
    )
  ) {
    fail("LOCAL_MIGRATION_PLAN_INVALID", {
      migrationVersion: "PLAN",
      relativePath: project004RemoteDevContract.migrationPlan,
      mismatchType: "PLAN_INVALID",
    });
  }

  const plannedFiles = plan.migrations.map((entry) => entry.file);
  if (
    actualFiles.length !== project004RemoteDevContract.migrationCount ||
    actualFiles.join("\n") !== plannedFiles.join("\n")
  ) {
    const firstMismatchIndex = Array.from({
      length: Math.max(actualFiles.length, plannedFiles.length),
    }).findIndex(
      (_, index) => actualFiles[index] !== plannedFiles[index],
    );
    const mismatchFile =
      actualFiles[firstMismatchIndex] ??
      plannedFiles[firstMismatchIndex] ??
      "UNKNOWN";
    fail("LOCAL_MIGRATION_SET_CHANGED", {
      migrationVersion:
        /^\d{4}/u.exec(mismatchFile)?.[0] ?? "UNKNOWN",
      relativePath: `supabase/migrations/${mismatchFile}`,
      mismatchType:
        actualFiles.length < plannedFiles.length
          ? "MISSING_FILE"
          : actualFiles.length > plannedFiles.length
            ? "UNEXPECTED_FILE"
            : "FILE_ORDER_OR_NAME",
    });
  }

  for (const [index, entry] of plan.migrations.entries()) {
    const expectedVersion = String(index + 1).padStart(4, "0");
    const actualHash = createHash("sha256")
      .update(readFileSync(join(migrationDirectory, entry.file)))
      .digest("hex");
    const metadataMismatch =
      entry.order !== index + 1 ||
      entry.version !== expectedVersion ||
      !entry.file.startsWith(`${expectedVersion}_`) ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256);
    if (metadataMismatch || actualHash !== entry.sha256) {
      fail("LOCAL_MIGRATION_CHECKSUM_CHANGED", {
        migrationVersion: expectedVersion,
        relativePath: `supabase/migrations/${entry.file}`,
        mismatchType: metadataMismatch
          ? "PIN_METADATA_MISMATCH"
          : "CHECKSUM_MISMATCH",
      });
    }
  }
  if (
    buildMigrationPlanFingerprint(plan) !==
    plan.migrationPlanFingerprintSha256
  ) {
    fail("LOCAL_MIGRATION_PLAN_INVALID", {
      migrationVersion: "PLAN",
      relativePath: project004RemoteDevContract.migrationPlan,
      mismatchType: "MIGRATION_PLAN_FINGERPRINT_MISMATCH",
    });
  }

  const content = plan.postMigrationContentTransaction;
  if (
    content.source !== "DETERMINISTIC_REPOSITORY_CURRICULUM_ONLY" ||
    content.releaseState !== "DRAFT_INACTIVE" ||
    content.units !== 171 ||
    content.publicQuestions !== 2052 ||
    content.privateSolutions !== 2052 ||
    content.officialOutcomes !== 546 ||
    content.usesLocalDatabaseData ||
    content.seedsUsersOrHistory
  ) {
    fail("REMOTE_CONTENT_PLAN_INVALID");
  }
  return { root, plan };
}

export function loadCanonicalMigrationInventory(
  candidateRoot = process.cwd(),
): CanonicalMigrationInventory {
  const { root, plan } =
    loadAndVerifyMigrationPlan(candidateRoot);
  const prefix = plan.migrations.map((entry) => ({
    version: entry.version,
    filename: entry.file,
    absolutePath: resolve(root, "supabase/migrations", entry.file),
    sha256: entry.sha256,
  }));
  const sourceAudit: CanonicalMigrationDirectoryAudit = {
    discoveredFileCount: prefix.length,
    parsedCanonicalVersionCount: prefix.length,
    duplicateVersionCount: 0,
    missingVersionCount: 0,
    unparseableCount: 0,
    normalizedFirst: prefix[0]?.version ?? "NOT_RUN",
    normalizedLast: prefix.at(-1)?.version ?? "NOT_RUN",
    orderedFilenames: prefix.map((entry) => entry.filename),
    badRelativePaths: [],
  };
  return {
    root,
    plan,
    sourceAudit,
    entries: plan.migrations.map((entry, index) => ({
      ...entry,
      absolutePath: prefix[index]?.absolutePath ?? resolve(
        root,
        "supabase/migrations",
        entry.file,
      ),
      relativePath: `supabase/migrations/${entry.file}`,
    })),
  };
}

export function copyCanonicalMigrationInventory(
  destinationDirectory: string,
  candidateRoot = process.cwd(),
): CanonicalMigrationCopyAudit {
  const inventory =
    loadCanonicalMigrationInventory(candidateRoot);
  mkdirSync(destinationDirectory, {
    recursive: true,
    mode: 0o700,
  });
  if (readdirSync(destinationDirectory).length !== 0) {
    fail("CANONICAL_MIGRATION_COPY_TARGET_NOT_EMPTY");
  }
  for (const entry of inventory.entries) {
    copyFileSync(
      entry.absolutePath,
      resolve(destinationDirectory, entry.file),
    );
  }
  const copyAudit = auditCanonicalMigrationDirectory(
    destinationDirectory,
    "migrations",
  );
  let checksumMismatchCount = 0;
  const badRelativePaths = [...copyAudit.badRelativePaths];
  for (const entry of inventory.entries) {
    const copiedPath = resolve(
      destinationDirectory,
      entry.file,
    );
    if (
      !existsSync(copiedPath) ||
      createHash("sha256")
        .update(readFileSync(copiedPath))
        .digest("hex") !== entry.sha256
    ) {
      checksumMismatchCount += 1;
      badRelativePaths.push(`migrations/${entry.file}`);
    }
  }
  const audit = {
    sourceCount: inventory.sourceAudit.discoveredFileCount,
    copyCount: copyAudit.discoveredFileCount,
    sourceFirst: inventory.sourceAudit.normalizedFirst,
    sourceLast: inventory.sourceAudit.normalizedLast,
    copyFirst: copyAudit.normalizedFirst,
    copyLast: copyAudit.normalizedLast,
    checksumMismatchCount,
    badRelativePaths: [...new Set(badRelativePaths)].sort(),
    pass:
      canonicalDirectoryAuditPass(inventory.sourceAudit) &&
      canonicalDirectoryAuditPass(copyAudit) &&
      checksumMismatchCount === 0 &&
      inventory.sourceAudit.orderedFilenames.join("\n") ===
        copyAudit.orderedFilenames.join("\n"),
  } satisfies CanonicalMigrationCopyAudit;
  return audit;
}

export function assertLocalIsolation(
  config: RemoteDevPrivateConfig,
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const localConfig = readFileSync(
    resolve(root, "supabase/config.toml"),
    "utf8",
  );
  const ownerStart = readFileSync(
    resolve(root, "scripts/start-owner-local-demo.ts"),
    "utf8",
  );
  if (
    !/^project_id = "PLAVE-PROJECT004"$/mu.test(localConfig) ||
    !/^port = 54322$/mu.test(localConfig) ||
    !ownerStart.includes("assertProject004Workspace") ||
    ownerStart.includes(config.projectRef) ||
    ownerStart.includes(config.projectName) ||
    /\b(?:supabase\s+link|db\s+push)\b/iu.test(ownerStart)
  ) {
    fail("LOCAL_OWNER_RUNTIME_ISOLATION_FAILED");
  }
  const remoteHost = `db.${config.projectRef}.supabase.co`;
  if (
    ["127.0.0.1", "localhost", "::1"].includes(remoteHost) ||
    config.projectRef === "PLAVE-PROJECT004"
  ) {
    fail("LOCAL_DATABASE_TARGETED");
  }
  return root;
}

function cleanChildEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const childEnvironment = { ...environment };
  for (const key of [
    "DATABASE_URL",
    "PLAVE_LOCAL_DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PLAVE_PROJECT004_REMOTE_TARGET_NAME",
    "PLAVE_PROJECT004_REMOTE_PROJECT_REF",
    "PLAVE_PROJECT004_REMOTE_DB_PASSWORD",
    "PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS",
    "PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL",
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
  ]) {
    delete childEnvironment[key];
  }
  childEnvironment.SUPABASE_TELEMETRY_DISABLED = "true";
  return childEnvironment;
}

export function buildSupabaseCliEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const childEnvironment = cleanChildEnvironment(environment);
  delete childEnvironment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD;
  return childEnvironment;
}

export function buildRemoteDatabaseEnvironment(
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return {
    ...cleanChildEnvironment(environment),
    PGHOST: `db.${config.projectRef}.supabase.co`,
    PGPORT: "5432",
    PGUSER: "postgres",
    PGPASSWORD: config.databasePassword,
    PGDATABASE: "postgres",
    PGSSLMODE: "require",
    PGCONNECT_TIMEOUT: "10",
  };
}

export type SafeCommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
};

function runCapturedCommandInRoot(
  root: string,
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
  input?: string,
): SafeCommandResult {
  const timeout =
    command === "supabase" &&
    args.length === 2 &&
    args[0] === "db" &&
    args[1] === "push"
      ? 600_000
      : command === "psql" && args.includes("--file")
        ? 300_000
        : 30_000;
  const result = spawnSync(command, args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    ok: result.status === 0 && result.signal === null,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    timedOut:
      (result.error as NodeJS.ErrnoException | undefined)?.code ===
      "ETIMEDOUT",
  };
}

export function createCanonicalRemoteDevCommandRunner(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  return (
    command: string,
    args: string[],
    environment: NodeJS.ProcessEnv,
    input?: string,
  ) =>
    runCapturedCommandInRoot(
      root,
      command,
      args,
      environment,
      input,
    );
}

export function runCapturedCommand(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
  input?: string,
) {
  return runCapturedCommandInRoot(
    assertProject004Workspace(process.cwd()),
    command,
    args,
    environment,
    input,
  );
}

export type ProjectRecord = {
  id?: unknown;
  ref?: unknown;
  name?: unknown;
  status?: unknown;
  region?: unknown;
};

export function parseProjectsListOutput(rawOutput: string) {
  let records: unknown;
  try {
    records = JSON.parse(rawOutput);
  } catch {
    fail("CLI_OUTPUT_UNRECOGNIZED");
  }
  if (!Array.isArray(records)) {
    fail("CLI_OUTPUT_UNRECOGNIZED");
  }
  return records as ProjectRecord[];
}

export function verifyProjectRecords(
  records: readonly ProjectRecord[],
  config: RemoteDevPrivateConfig,
) {
  const matches = records.filter((record) => {
    const recordRef =
      typeof record.ref === "string"
        ? record.ref
        : typeof record.id === "string"
          ? record.id
          : "";
    return recordRef === config.projectRef;
  });
  if (matches.length === 0) {
    fail("PROJECT_NOT_FOUND_OR_UNAUTHORIZED");
  }
  if (matches.length !== 1) {
    fail("CLI_OUTPUT_UNRECOGNIZED");
  }
  if (
    matches[0]?.name !== project004RemoteDevContract.projectName
  ) {
    fail("REMOTE_NAME_MISMATCH");
  }
  const status =
    typeof matches[0].status === "string"
      ? matches[0].status.toUpperCase()
      : "";
  if (
    status &&
    !["ACTIVE_HEALTHY", "ACTIVE", "HEALTHY"].includes(status)
  ) {
    fail("PROJECT_NOT_FOUND_OR_UNAUTHORIZED");
  }
}

export function verifyProjectsListOutput(
  rawOutput: string,
  config: RemoteDevPrivateConfig,
) {
  verifyProjectRecords(parseProjectsListOutput(rawOutput), config);
}

export function readLinkedProjectRef(
  root: string,
) {
  try {
    return readFileSync(
      resolve(root, project004RemoteDevContract.linkedRefMarker),
      "utf8",
    ).trim();
  } catch {
    return null;
  }
}

const fifoWriterSource = String.raw`
const fs = require("node:fs");
const markerPath = process.argv[1];
const value = Buffer.from(
  process.env.PLAVE_EPHEMERAL_MARKER_VALUE || "",
  "utf8",
);
delete process.env.PLAVE_EPHEMERAL_MARKER_VALUE;
try {
  for (let index = 0; index < 8; index += 1) {
    fs.writeFileSync(markerPath, value);
    Atomics.wait(
      new Int32Array(new SharedArrayBuffer(4)),
      0,
      0,
      25,
    );
  }
} finally {
  value.fill(0);
}
`;

function createEphemeralMarkerChannel(
  root: string,
  relativeMarker: string,
  value: string,
) {
  const marker = resolve(root, relativeMarker);
  if (existsSync(marker)) {
    fail("LINKED_TARGET_ALREADY_EXISTS");
  }
  mkdirSync(resolve(marker, ".."), {
    recursive: true,
    mode: 0o700,
  });
  const fifoResult = spawnSync(
    "/usr/bin/mkfifo",
    ["-m", "600", marker],
    {
      cwd: root,
      env: cleanChildEnvironment(process.env),
      stdio: ["ignore", "ignore", "ignore"],
      timeout: 5_000,
    },
  );
  if (
    fifoResult.status !== 0 ||
    fifoResult.signal !== null ||
    !lstatSync(marker).isFIFO()
  ) {
    rmSync(marker, { force: true });
    fail("EPHEMERAL_LINK_CHANNEL_FAILED");
  }

  const writer = spawn(
    process.execPath,
    ["-e", fifoWriterSource, marker],
    {
      cwd: root,
      env: {
        ...cleanChildEnvironment(process.env),
        PLAVE_EPHEMERAL_MARKER_VALUE: `${value}\n`,
      },
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  return { marker, writer };
}

function assertPasswordlessPoolerUrl(
  value: string,
  projectRef: string,
) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("REMOTE_CONNECTIVITY_ENDPOINT_INVALID");
  }
  if (
    parsed.protocol !== "postgresql:" ||
    parsed.password !== "" ||
    parsed.port !== "5432" ||
    parsed.pathname !== "/postgres" ||
    parsed.searchParams.get("sslmode") !== "require" ||
    parsed.searchParams.size !== 1 ||
    parsed.username !== `postgres.${projectRef}` ||
    !/^aws-0-[a-z]{2}(?:-[a-z0-9]+)+-[0-9][.]pooler[.]supabase[.]com$/u.test(
      parsed.hostname,
    )
  ) {
    fail("REMOTE_CONNECTIVITY_ENDPOINT_INVALID");
  }
}

export function withEphemeralRemoteCliMetadata<T>(
  root: string,
  options: {
    projectRef: string;
    passwordlessPoolerUrl: string | null;
  },
  operation: () => T,
) {
  if (options.passwordlessPoolerUrl !== null) {
    assertPasswordlessPoolerUrl(
      options.passwordlessPoolerUrl,
      options.projectRef,
    );
  }
  const channels: Array<ReturnType<
    typeof createEphemeralMarkerChannel
  >> = [];

  try {
    channels.push(
      createEphemeralMarkerChannel(
        root,
        project004RemoteDevContract.linkedRefMarker,
        options.projectRef,
      ),
    );
    if (options.passwordlessPoolerUrl !== null) {
      channels.push(
        createEphemeralMarkerChannel(
          root,
          project004RemoteDevContract.poolerUrlMarker,
          options.passwordlessPoolerUrl,
        ),
      );
    }
    return operation();
  } finally {
    for (const channel of channels) {
      channel.writer.kill("SIGTERM");
    }
    for (const channel of channels.reverse()) {
      rmSync(channel.marker, { force: true });
    }
  }
}

export function withEphemeralLinkedProjectRef<T>(
  root: string,
  projectRef: string,
  operation: () => T,
) {
  return withEphemeralRemoteCliMetadata(
    root,
    {
      projectRef,
      passwordlessPoolerUrl: null,
    },
    operation,
  );
}

export function assertLinkedTarget(
  root: string,
  config: RemoteDevPrivateConfig,
) {
  const linkedRef = readLinkedProjectRef(root);
  if (!linkedRef || linkedRef !== config.projectRef) {
    fail("LINKED_TARGET_MISMATCH");
  }
}

export function safeBasename(value: string) {
  return basename(value);
}
