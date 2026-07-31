import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { DisposablePorts } from "./project004-disposable-port-reservation.ts";
import {
  auditCanonicalMigrationDirectory,
  buildMigrationPlanFingerprint,
  copyCanonicalMigrationInventory,
  loadCanonicalMigrationInventory,
  project004RemoteDevContract,
  type CanonicalMigrationCopyAudit,
} from "./project004-remote-dev-guard.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

export const disposableMigrationWorkspaceVersion =
  "PROJECT004_DISPOSABLE_MIGRATION_WORKSPACE_V1";

export const disposableMigrationWorkspaceMarkerRelativePath =
  "supabase/.temp/project004-disposable-migration-workspace-smoke.json";

export const disposableMigrationExpectedBoundary = {
  count: project004RemoteDevContract.migrationCount,
  first: project004RemoteDevContract.migrationFirst,
  last: project004RemoteDevContract.migrationLast,
} as const;

export type DisposableMigrationWorkspaceBoundarySubcondition =
  | "SOURCE_DISCOVERED_COUNT_MATCH"
  | "SOURCE_PARSED_COUNT_MATCH"
  | "SOURCE_FIRST_VERSION_MATCH"
  | "SOURCE_LAST_VERSION_MATCH"
  | "SOURCE_PINNED_CHECKSUMS_MATCH"
  | "TEMP_COPY_COUNT_MATCH"
  | "TEMP_PARSED_COUNT_MATCH"
  | "TEMP_FIRST_VERSION_MATCH"
  | "TEMP_LAST_VERSION_MATCH"
  | "TEMP_COPY_CHECKSUMS_MATCH"
  | "SOURCE_TEMP_FILENAME_SET_MATCH";

export const disposableMigrationWorkspaceBoundarySubconditions:
  DisposableMigrationWorkspaceBoundarySubcondition[] = [
    "SOURCE_DISCOVERED_COUNT_MATCH",
    "SOURCE_PARSED_COUNT_MATCH",
    "SOURCE_FIRST_VERSION_MATCH",
    "SOURCE_LAST_VERSION_MATCH",
    "SOURCE_PINNED_CHECKSUMS_MATCH",
    "TEMP_COPY_COUNT_MATCH",
    "TEMP_PARSED_COUNT_MATCH",
    "TEMP_FIRST_VERSION_MATCH",
    "TEMP_LAST_VERSION_MATCH",
    "TEMP_COPY_CHECKSUMS_MATCH",
    "SOURCE_TEMP_FILENAME_SET_MATCH",
  ];

export type DisposableMigrationWorkspaceReport = {
  sourceDiscoveredCount: number;
  sourceParsedCount: number;
  sourceFirst: string;
  sourceLast: string;
  sourceChecksums: "PASS" | "FAIL";
  tempCopyCount: number;
  tempParsedCount: number;
  tempFirst: string;
  tempLast: string;
  tempChecksumMismatchCount: number;
  expectedBoundary: string;
  actualBoundary: string;
  failedBoundarySubconditions:
    DisposableMigrationWorkspaceBoundarySubcondition[];
  workspacePreparation: "PASS" | "FAIL";
};

export type PreparedDisposableMigrationWorkspace = {
  root: string;
  workdir: string;
  supabaseDirectory: string;
  migrationsDirectory: string;
  report: DisposableMigrationWorkspaceReport;
};

export class DisposableMigrationWorkspaceFailure extends Error {
  readonly code: string;
  readonly report?: DisposableMigrationWorkspaceReport;

  constructor(
    code: string,
    report?: DisposableMigrationWorkspaceReport,
  ) {
    super(code);
    this.name = "DisposableMigrationWorkspaceFailure";
    this.code = code;
    this.report = report;
  }
}

function sectionBoolean(
  source: string,
  section: string,
  value: boolean,
) {
  const pattern = new RegExp(
    `(\\[${section.replace(".", "[.]")}\\][\\s\\S]*?\\nenabled\\s*=\\s*)(?:true|false)`,
    "u",
  );
  if (!pattern.test(source)) {
    throw new DisposableMigrationWorkspaceFailure(
      "DISPOSABLE_CONFIG_SECTION_MISSING",
    );
  }
  return source.replace(pattern, `$1${String(value)}`);
}

function sectionNumber(
  source: string,
  section: string,
  key: "port" | "shadow_port",
  value: number,
) {
  const pattern = new RegExp(
    `(\\[${section.replace(".", "[.]")}\\][\\s\\S]*?\\n${key}\\s*=\\s*)\\d+`,
    "u",
  );
  if (!pattern.test(source)) {
    throw new DisposableMigrationWorkspaceFailure(
      "DISPOSABLE_CONFIG_SECTION_MISSING",
    );
  }
  return source.replace(pattern, `$1${String(value)}`);
}

export function buildDisposableConfig(
  generated: string,
  projectId: string,
  ports: DisposablePorts,
) {
  let source = generated.replace(
    /^project_id\s*=\s*"[^"]+"$/mu,
    `project_id = "${projectId}"`,
  );
  source = sectionNumber(source, "api", "port", ports.api);
  source = sectionNumber(source, "db", "port", ports.database);
  source = sectionNumber(
    source,
    "db",
    "shadow_port",
    ports.shadow,
  );
  source = sectionNumber(
    source,
    "db.pooler",
    "port",
    ports.pooler,
  );
  source = sectionNumber(
    source,
    "studio",
    "port",
    ports.studio,
  );
  source = sectionNumber(
    source,
    "local_smtp",
    "port",
    ports.mail,
  );
  source = sectionNumber(
    source,
    "analytics",
    "port",
    ports.analytics,
  );
  source = sectionBoolean(source, "db.seed", false);
  source = sectionBoolean(source, "realtime", false);
  source = sectionBoolean(source, "studio", false);
  source = sectionBoolean(source, "local_smtp", false);
  if (
    !source.includes(`project_id = "${projectId}"`) ||
    ![
      ports.api,
      ports.database,
      ports.shadow,
      ports.pooler,
      ports.studio,
      ports.mail,
      ports.analytics,
    ].every((port) =>
      source.includes(`= ${String(port)}`),
    ) ||
    !/\[db[.]seed\][\s\S]*?\nenabled\s*=\s*false/u.test(
      source,
    )
  ) {
    throw new DisposableMigrationWorkspaceFailure(
      "DISPOSABLE_CONFIG_REWRITE_FAILED",
    );
  }
  return source;
}

function evaluateBoundary(
  sourceAudit: ReturnType<
    typeof auditCanonicalMigrationDirectory
  >,
  copyAudit: CanonicalMigrationCopyAudit,
  tempAudit: ReturnType<
    typeof auditCanonicalMigrationDirectory
  >,
) {
  const expected = disposableMigrationExpectedBoundary;
  const checks: Record<
    DisposableMigrationWorkspaceBoundarySubcondition,
    boolean
  > = {
    SOURCE_DISCOVERED_COUNT_MATCH:
      sourceAudit.discoveredFileCount === expected.count,
    SOURCE_PARSED_COUNT_MATCH:
      sourceAudit.parsedCanonicalVersionCount ===
      expected.count,
    SOURCE_FIRST_VERSION_MATCH:
      sourceAudit.normalizedFirst === expected.first,
    SOURCE_LAST_VERSION_MATCH:
      sourceAudit.normalizedLast === expected.last,
    SOURCE_PINNED_CHECKSUMS_MATCH: true,
    TEMP_COPY_COUNT_MATCH:
      copyAudit.copyCount === expected.count,
    TEMP_PARSED_COUNT_MATCH:
      tempAudit.parsedCanonicalVersionCount ===
      expected.count,
    TEMP_FIRST_VERSION_MATCH:
      tempAudit.normalizedFirst === expected.first,
    TEMP_LAST_VERSION_MATCH:
      tempAudit.normalizedLast === expected.last,
    TEMP_COPY_CHECKSUMS_MATCH:
      copyAudit.checksumMismatchCount === 0,
    SOURCE_TEMP_FILENAME_SET_MATCH:
      sourceAudit.orderedFilenames.join("\n") ===
      tempAudit.orderedFilenames.join("\n"),
  };
  return disposableMigrationWorkspaceBoundarySubconditions
    .filter((name) => !checks[name]);
}

function buildWorkspaceReport(
  sourceAudit: ReturnType<
    typeof auditCanonicalMigrationDirectory
  >,
  copyAudit: CanonicalMigrationCopyAudit,
  tempAudit: ReturnType<
    typeof auditCanonicalMigrationDirectory
  >,
): DisposableMigrationWorkspaceReport {
  const failedBoundarySubconditions = evaluateBoundary(
    sourceAudit,
    copyAudit,
    tempAudit,
  );
  return {
    sourceDiscoveredCount: sourceAudit.discoveredFileCount,
    sourceParsedCount:
      sourceAudit.parsedCanonicalVersionCount,
    sourceFirst: sourceAudit.normalizedFirst,
    sourceLast: sourceAudit.normalizedLast,
    sourceChecksums: "PASS",
    tempCopyCount: copyAudit.copyCount,
    tempParsedCount: tempAudit.parsedCanonicalVersionCount,
    tempFirst: tempAudit.normalizedFirst,
    tempLast: tempAudit.normalizedLast,
    tempChecksumMismatchCount:
      copyAudit.checksumMismatchCount,
    expectedBoundary:
      `${String(disposableMigrationExpectedBoundary.count)}/` +
      `${disposableMigrationExpectedBoundary.first}/` +
      disposableMigrationExpectedBoundary.last,
    actualBoundary:
      `${String(copyAudit.copyCount)}/` +
      `${tempAudit.normalizedFirst}/` +
      tempAudit.normalizedLast,
    failedBoundarySubconditions,
    workspacePreparation:
      failedBoundarySubconditions.length === 0 &&
      copyAudit.pass
        ? "PASS"
        : "FAIL",
  };
}

export function prepareDisposableMigrationWorkspace(options: {
  candidateRoot?: string;
  projectId: string;
  ports: DisposablePorts;
  temporaryParent?: string;
}): PreparedDisposableMigrationWorkspace {
  const root = assertProject004Workspace(
    options.candidateRoot ?? process.cwd(),
  );
  const inventory = loadCanonicalMigrationInventory(root);
  const sourceAudit = inventory.sourceAudit;
  const temporaryParent = resolve(
    options.temporaryParent ?? tmpdir(),
  );
  mkdirSync(temporaryParent, {
    recursive: true,
    mode: 0o700,
  });
  const workdir = mkdtempSync(
    join(
      temporaryParent,
      "plave-project004-clean-proof-",
    ),
  );
  try {
    const supabaseDirectory = resolve(workdir, "supabase");
    const migrationsDirectory = resolve(
      supabaseDirectory,
      "migrations",
    );
    const sourceConfigPath = resolve(
      root,
      "supabase/config.toml",
    );
    const configPath = resolve(
      supabaseDirectory,
      "config.toml",
    );
    mkdirSync(supabaseDirectory, {
      recursive: true,
      mode: 0o700,
    });
    copyFileSync(sourceConfigPath, configPath);
    writeFileSync(
      configPath,
      buildDisposableConfig(
        readFileSync(configPath, "utf8"),
        options.projectId,
        options.ports,
      ),
      { encoding: "utf8", mode: 0o600 },
    );
    const copyAudit = copyCanonicalMigrationInventory(
      migrationsDirectory,
      root,
    );
    const tempAudit = auditCanonicalMigrationDirectory(
      migrationsDirectory,
      "migrations",
    );
    const report = buildWorkspaceReport(
      sourceAudit,
      copyAudit,
      tempAudit,
    );
    if (report.workspacePreparation !== "PASS") {
      throw new DisposableMigrationWorkspaceFailure(
        "DISPOSABLE_MIGRATION_WORKSPACE_BOUNDARY_INVALID",
        report,
      );
    }
    return {
      root,
      workdir,
      supabaseDirectory,
      migrationsDirectory,
      report,
    };
  } catch (error) {
    rmSync(workdir, { recursive: true, force: true });
    throw error;
  }
}

export function cleanupPreparedDisposableMigrationWorkspace(
  prepared: Pick<PreparedDisposableMigrationWorkspace, "workdir">,
) {
  rmSync(prepared.workdir, {
    recursive: true,
    force: true,
  });
  return !existsSync(prepared.workdir);
}

export function buildDisposableMigrationWorkspaceContractFingerprint(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const inventory = loadCanonicalMigrationInventory(root);
  const sourceConfig = readFileSync(
    resolve(root, "supabase/config.toml"),
  );
  const moduleSource = readFileSync(
    fileURLToPath(import.meta.url),
  );
  return createHash("sha256")
    .update(disposableMigrationWorkspaceVersion)
    .update("\n")
    .update(buildMigrationPlanFingerprint(inventory.plan))
    .update("\n")
    .update(createHash("sha256").update(sourceConfig).digest("hex"))
    .update("\n")
    .update(createHash("sha256").update(moduleSource).digest("hex"))
    .digest("hex");
}

function workspaceMarkerPath(root: string) {
  return resolve(
    root,
    disposableMigrationWorkspaceMarkerRelativePath,
  );
}

export function clearDisposableMigrationWorkspaceSmokeMarker(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  rmSync(workspaceMarkerPath(root), { force: true });
}

export function writeDisposableMigrationWorkspaceSmokeMarker(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const markerPath = workspaceMarkerPath(root);
  mkdirSync(dirname(markerPath), {
    recursive: true,
    mode: 0o700,
  });
  writeFileSync(
    markerPath,
    `${JSON.stringify({
      status: "PASS",
      contract:
        buildDisposableMigrationWorkspaceContractFingerprint(
          root,
        ),
      expectedBoundary:
        `${String(disposableMigrationExpectedBoundary.count)}/` +
        `${disposableMigrationExpectedBoundary.first}/` +
        disposableMigrationExpectedBoundary.last,
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

export function assertDisposableMigrationWorkspaceSmokeMarker(
  candidateRoot = process.cwd(),
) {
  const root = assertProject004Workspace(candidateRoot);
  const markerPath = workspaceMarkerPath(root);
  if (
    !existsSync(markerPath) ||
    !lstatSync(markerPath).isFile()
  ) {
    throw new DisposableMigrationWorkspaceFailure(
      "DISPOSABLE_WORKSPACE_SMOKE_REQUIRED",
    );
  }
  try {
    const marker = JSON.parse(
      readFileSync(markerPath, "utf8"),
    ) as {
      status?: unknown;
      contract?: unknown;
      expectedBoundary?: unknown;
    };
    const expectedBoundary =
      `${String(disposableMigrationExpectedBoundary.count)}/` +
      `${disposableMigrationExpectedBoundary.first}/` +
      disposableMigrationExpectedBoundary.last;
    if (
      marker.status !== "PASS" ||
      marker.contract !==
        buildDisposableMigrationWorkspaceContractFingerprint(
          root,
        ) ||
      marker.expectedBoundary !== expectedBoundary
    ) {
      throw new Error("INVALID_MARKER");
    }
  } catch {
    throw new DisposableMigrationWorkspaceFailure(
      "DISPOSABLE_WORKSPACE_SMOKE_REQUIRED",
    );
  }
}
