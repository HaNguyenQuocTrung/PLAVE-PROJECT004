import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { arch, freemem, totalmem, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  isOwnerLocalPort,
  reserveDisposablePorts,
  type DisposablePorts,
} from "./project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import {
  assertDisposableCleanupScope,
} from "./run-project004-clean-disposable-proof.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import type { SafeCommandResult } from "./project004-remote-dev-guard.ts";

export type BootstrapService =
  | "DATABASE"
  | "AUTH"
  | "STORAGE"
  | "REST"
  | "KONG"
  | "REALTIME"
  | "STUDIO"
  | "META"
  | "MAIL"
  | "ANALYTICS"
  | "VECTOR"
  | "POOLER"
  | "EDGE_RUNTIME"
  | "CLI"
  | "NONE"
  | "UNKNOWN";

export type BootstrapDiagnosticReport = {
  dockerDaemon: "PASS" | "FAIL";
  dockerResourceState:
    | "ADEQUATE"
    | "CONSTRAINED"
    | "UNKNOWN";
  hostArchitecture: "ARM64" | "X86_64" | "OTHER";
  supabaseCliVersion: string;
  supabaseCliVersionCompatibility: "PASS" | "FAIL";
  tempConfigValidation: "PASS" | "FAIL" | "NOT_RUN";
  disposablePortSet: "PASS" | "FAIL" | "NOT_RUN";
  firstServiceFailed: BootstrapService;
  serviceExitCategory: string;
  serviceHealthCategory: string;
  imageState:
    | "AVAILABLE"
    | "PULL_REQUIRED"
    | "PULL_FAILED"
    | "UNKNOWN";
  bootstrapTimeoutStage:
    | "NONE"
    | "DOCKER_PREFLIGHT"
    | "CLI_VERSION"
    | "TEMP_CONFIG"
    | "PORT_RESERVATION"
    | "SUPABASE_START"
    | "CONTAINER_HEALTH"
    | "CLEANUP";
  baselineStackReady: "PASS" | "FAIL";
  migrationSqlExecutionStarted: "NO";
  disposableCleanup: "PASS" | "FAIL" | "NOT_RUN";
  rootFailureCode: string;
  rootCauseConfidence: "HIGH" | "MEDIUM" | "LOW";
};

export type BootstrapContainerEvidence = {
  service: BootstrapService;
  state: string;
  exitCode: number | null;
  health: string;
  logCategory: string;
  imageAvailable: boolean;
};

export type BootstrapCommandRunner = (
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
  options?: { cwd?: string; timeout?: number },
) => SafeCommandResult;

const bootstrapExcludedServices = [
  "realtime",
  "imgproxy",
  "mailpit",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
] as const;

function safeEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const child = { ...environment };
  for (const key of [
    "DATABASE_URL",
    "PLAVE_LOCAL_DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ACCESS_TOKEN",
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
    delete child[key];
  }
  child.SUPABASE_TELEMETRY_DISABLED = "true";
  return child;
}

export function createBootstrapCommandRunner(
  candidateRoot = process.cwd(),
): BootstrapCommandRunner {
  const root = assertProject004Workspace(candidateRoot);
  return (command, args, environment, options) => {
    const result = spawnSync(command, args, {
      cwd: options?.cwd ?? root,
      env: environment,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: options?.timeout ?? 120_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return {
      ok: result.status === 0 && result.signal === null,
      stdout:
        typeof result.stdout === "string" ? result.stdout : "",
      stderr:
        typeof result.stderr === "string" ? result.stderr : "",
    };
  };
}

function emptyReport(): BootstrapDiagnosticReport {
  return {
    dockerDaemon: "FAIL",
    dockerResourceState: "UNKNOWN",
    hostArchitecture:
      arch() === "arm64"
        ? "ARM64"
        : arch() === "x64"
          ? "X86_64"
          : "OTHER",
    supabaseCliVersion: "NOT_RUN",
    supabaseCliVersionCompatibility: "FAIL",
    tempConfigValidation: "NOT_RUN",
    disposablePortSet: "NOT_RUN",
    firstServiceFailed: "NONE",
    serviceExitCategory: "NOT_RUN",
    serviceHealthCategory: "NOT_RUN",
    imageState: "UNKNOWN",
    bootstrapTimeoutStage: "NONE",
    baselineStackReady: "FAIL",
    migrationSqlExecutionStarted: "NO",
    disposableCleanup: "NOT_RUN",
    rootFailureCode: "BOOTSTRAP_DIAGNOSTIC_NOT_RUN",
    rootCauseConfidence: "LOW",
  };
}

export function classifyDockerResources() {
  try {
    const filesystem = statfsSync(tmpdir());
    const availableBytes =
      Number(filesystem.bavail) * Number(filesystem.bsize);
    return availableBytes >= 8 * 1024 ** 3 &&
      totalmem() >= 4 * 1024 ** 3 &&
      freemem() >= 512 * 1024 ** 2
      ? ("ADEQUATE" as const)
      : ("CONSTRAINED" as const);
  } catch {
    return "UNKNOWN" as const;
  }
}

export function parseSupabaseCliVersion(raw: string) {
  const match = /\b(\d+)[.](\d+)[.](\d+)\b/u.exec(raw);
  if (!match) {
    return {
      version: "UNRECOGNIZED",
      compatibility: "FAIL" as const,
    };
  }
  const version = `${match[1]}.${match[2]}.${match[3]}`;
  return {
    version,
    compatibility:
      Number(match[1]) === 2
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
}

function serviceFromName(value: string): BootstrapService {
  const normalized = value.toLowerCase();
  const patterns: Array<[string, BootstrapService]> = [
    ["supabase_db_", "DATABASE"],
    ["supabase_auth_", "AUTH"],
    ["supabase_storage_", "STORAGE"],
    ["supabase_rest_", "REST"],
    ["supabase_kong_", "KONG"],
    ["realtime", "REALTIME"],
    ["studio", "STUDIO"],
    ["meta", "META"],
    ["mail", "MAIL"],
    ["analytics", "ANALYTICS"],
    ["vector", "VECTOR"],
    ["pooler", "POOLER"],
    ["edge", "EDGE_RUNTIME"],
  ];
  return (
    patterns.find(([pattern]) =>
      normalized.includes(pattern),
    )?.[1] ?? "UNKNOWN"
  );
}

export function classifySanitizedLog(raw: string) {
  if (
    /address already in use|port is already allocated|bind:.*failed/iu.test(
      raw,
    )
  ) {
    return "PORT_BIND_FAILED";
  }
  if (
    /no space left on device|disk quota exceeded/iu.test(raw)
  ) {
    return "DISK_EXHAUSTED";
  }
  if (
    /out of memory|cannot allocate memory|oomkilled/iu.test(raw)
  ) {
    return "MEMORY_EXHAUSTED";
  }
  if (
    /permission denied|operation not permitted|must be owner/iu.test(
      raw,
    )
  ) {
    return "PERMISSION_DENIED";
  }
  if (
    /no such host|temporary failure in name resolution|dns/iu.test(
      raw,
    )
  ) {
    return "DNS_FAILED";
  }
  if (
    /certificate|tls handshake|x509|ssl error/iu.test(raw)
  ) {
    return "TLS_FAILED";
  }
  if (
    /manifest unknown|pull access denied|failed to pull|no matching manifest/iu.test(
      raw,
    )
  ) {
    return "IMAGE_PULL_FAILED";
  }
  if (
    /invalid config|configuration error|failed to parse|toml/iu.test(
      raw,
    )
  ) {
    return "CONFIG_INVALID";
  }
  if (
    /connection refused|failed to connect|database is unavailable/iu.test(
      raw,
    )
  ) {
    return "DATABASE_UNREACHABLE";
  }
  if (/health check|unhealthy|not ready/iu.test(raw)) {
    return "HEALTHCHECK_FAILED";
  }
  return "UNRECOGNIZED";
}

function exitCategory(
  state: string,
  exitCode: number | null,
) {
  if (state === "running") return "STILL_RUNNING";
  if (exitCode === null) return "NOT_AVAILABLE";
  if (exitCode === 0) return "CLEAN_EXIT";
  if ([125, 126, 127].includes(exitCode)) {
    return "CONTAINER_RUNTIME_ERROR";
  }
  if (exitCode === 137) {
    return "RESOURCE_OR_FORCED_TERMINATION";
  }
  if (exitCode === 143) return "TERMINATED";
  return "APPLICATION_ERROR";
}

function healthCategory(
  evidence: BootstrapContainerEvidence,
) {
  if (evidence.logCategory !== "UNRECOGNIZED") {
    return evidence.logCategory;
  }
  const health = evidence.health.toLowerCase();
  if (health === "healthy") return "HEALTHY";
  if (health === "unhealthy") return "UNHEALTHY";
  if (health === "starting") return "STARTING";
  if (health === "none") return "NO_HEALTHCHECK";
  return "UNKNOWN";
}

const servicePriority: readonly BootstrapService[] = [
  "DATABASE",
  "ANALYTICS",
  "VECTOR",
  "REST",
  "AUTH",
  "STORAGE",
  "KONG",
  "REALTIME",
  "META",
  "STUDIO",
  "MAIL",
  "POOLER",
  "EDGE_RUNTIME",
  "UNKNOWN",
];

export function analyzeBootstrapFailure(options: {
  cliOutput: string;
  containers: readonly BootstrapContainerEvidence[];
}) {
  const combinedCategory = classifySanitizedLog(
    options.cliOutput,
  );
  const failed = [...options.containers]
    .filter(
      (container) =>
        container.state !== "running" ||
        container.health.toLowerCase() === "unhealthy" ||
        container.logCategory !== "UNRECOGNIZED",
    )
    .sort(
      (left, right) =>
        servicePriority.indexOf(left.service) -
        servicePriority.indexOf(right.service),
    )[0];
  const firstService = failed?.service ?? "CLI";
  const category = failed
    ? healthCategory(failed)
    : combinedCategory;
  const rootCategory =
    category === "UNRECOGNIZED"
      ? "LOCAL_SERVICE_BOOTSTRAP_FAILED"
      : category;
  const highConfidenceCategories = new Set([
    "PORT_BIND_FAILED",
    "DISK_EXHAUSTED",
    "MEMORY_EXHAUSTED",
    "PERMISSION_DENIED",
    "DNS_FAILED",
    "TLS_FAILED",
    "IMAGE_PULL_FAILED",
    "CONFIG_INVALID",
    "DATABASE_UNREACHABLE",
  ]);
  return {
    firstServiceFailed: firstService,
    serviceExitCategory: failed
      ? exitCategory(failed.state, failed.exitCode)
      : "NOT_AVAILABLE",
    serviceHealthCategory: category,
    imageState:
      category === "IMAGE_PULL_FAILED"
        ? ("PULL_FAILED" as const)
        : options.containers.length > 0 &&
            options.containers.every(
              (container) => container.imageAvailable,
            )
          ? ("AVAILABLE" as const)
          : /pulling|unable to find image locally/iu.test(
                options.cliOutput,
              )
            ? ("PULL_REQUIRED" as const)
            : ("UNKNOWN" as const),
    rootFailureCode:
      `BOOTSTRAP_${firstService}_${rootCategory}`,
    rootCauseConfidence: highConfidenceCategories.has(category)
      ? ("HIGH" as const)
      : failed
        ? ("MEDIUM" as const)
        : ("LOW" as const),
  };
}

function parseContainerNames(raw: string, projectId: string) {
  return raw
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(
      (name) =>
        name.length > 0 &&
        name.endsWith(`_${projectId}`) &&
        /^supabase_[a-z0-9_-]+$/u.test(name),
    );
}

function parseContainerState(
  raw: string,
  service: BootstrapService,
  logCategory: string,
): BootstrapContainerEvidence | null {
  const fields = raw.trim().split("|");
  if (fields.length !== 4) return null;
  const exitCode = Number(fields[1]);
  if (
    !/^[a-z]+$/u.test(fields[0] ?? "") ||
    !Number.isSafeInteger(exitCode) ||
    !/^(?:healthy|unhealthy|starting|none)$/u.test(
      (fields[2] ?? "").toLowerCase(),
    )
  ) {
    return null;
  }
  return {
    service,
    state: fields[0] ?? "unknown",
    exitCode,
    health: (fields[2] ?? "none").toLowerCase(),
    logCategory,
    imageAvailable:
      (fields[3] ?? "").trim().length > 0,
  };
}

function collectContainerEvidence(options: {
  projectId: string;
  environment: NodeJS.ProcessEnv;
  runner: BootstrapCommandRunner;
}) {
  const listed = options.runner(
    "docker",
    [
      "ps",
      "--all",
      "--filter",
      `name=${options.projectId}`,
      "--format",
      "{{.Names}}",
    ],
    options.environment,
  );
  if (!listed.ok) return [];
  const evidence: BootstrapContainerEvidence[] = [];
  for (const name of parseContainerNames(
    listed.stdout,
    options.projectId,
  )) {
    const service = serviceFromName(name);
    const inspected = options.runner(
      "docker",
      [
        "inspect",
        "--format",
        "{{.State.Status}}|{{.State.ExitCode}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.Config.Image}}",
        name,
      ],
      options.environment,
    );
    const logs = options.runner(
      "docker",
      ["logs", "--tail", "200", name],
      options.environment,
    );
    if (!inspected.ok) continue;
    const state = parseContainerState(
      inspected.stdout,
      service,
      classifySanitizedLog(
        logs.ok ? `${logs.stdout}\n${logs.stderr}` : "",
      ),
    );
    if (state) evidence.push(state);
  }
  return evidence;
}

function createBootstrapWorkdir(options: {
  root: string;
  projectId: string;
  ports: DisposablePorts;
  environment: NodeJS.ProcessEnv;
  runner: BootstrapCommandRunner;
}) {
  const directory = mkdtempSync(
    join(tmpdir(), "plave-project004-clean-proof-"),
  );
  const initialized = options.runner(
    "/opt/homebrew/bin/supabase",
    ["init", "--workdir", directory, "--yes"],
    options.environment,
    { timeout: 60_000 },
  );
  if (!initialized.ok) {
    rmSync(directory, { recursive: true, force: true });
    return null;
  }
  const supabaseDirectory = resolve(directory, "supabase");
  const configPath = resolve(supabaseDirectory, "config.toml");
  const config = buildDisposableConfig(
    readFileSync(configPath, "utf8"),
    options.projectId,
    options.ports,
  );
  writeFileSync(configPath, config, {
    encoding: "utf8",
    mode: 0o600,
  });
  const migrationsPath = resolve(
    supabaseDirectory,
    "migrations",
  );
  rmSync(migrationsPath, { recursive: true, force: true });
  mkdirSync(migrationsPath, {
    recursive: true,
    mode: 0o700,
  });
  rmSync(resolve(supabaseDirectory, "seed.sql"), {
    force: true,
  });
  if (
    readdirSync(migrationsPath).length !== 0 ||
    !/\[db[.]seed\][\s\S]*?\nenabled\s*=\s*false/u.test(
      config,
    ) ||
    Object.values(options.ports).some(isOwnerLocalPort)
  ) {
    rmSync(directory, { recursive: true, force: true });
    return null;
  }
  return directory;
}

function cleanupBootstrapStack(options: {
  projectId: string;
  workdir: string;
  environment: NodeJS.ProcessEnv;
  runner: BootstrapCommandRunner;
}) {
  try {
    assertDisposableCleanupScope(
      options.workdir,
      options.projectId,
    );
  } catch {
    return "FAIL" as const;
  }
  options.runner(
    "/opt/homebrew/bin/supabase",
    [
      "stop",
      "--workdir",
      options.workdir,
      "--project-id",
      options.projectId,
      "--no-backup",
      "--yes",
    ],
    options.environment,
    { timeout: 120_000 },
  );
  const remaining = options.runner(
    "docker",
    [
      "ps",
      "--all",
      "--filter",
      `name=${options.projectId}`,
      "--format",
      "{{.Names}}",
    ],
    options.environment,
  );
  rmSync(options.workdir, {
    recursive: true,
    force: true,
  });
  return remaining.ok &&
    parseContainerNames(
      remaining.stdout,
      options.projectId,
    ).length === 0
    ? ("PASS" as const)
    : ("FAIL" as const);
}

export async function runBootstrapOnlyDiagnostic(options?: {
  candidateRoot?: string;
  environment?: NodeJS.ProcessEnv;
  runner?: BootstrapCommandRunner;
}) {
  const root = assertProject004Workspace(
    options?.candidateRoot,
  );
  const environment = safeEnvironment(
    options?.environment,
  );
  const runner =
    options?.runner ??
    createBootstrapCommandRunner(root);
  const report = emptyReport();
  report.dockerResourceState = classifyDockerResources();

  const daemon = runner(
    "docker",
    ["version", "--format", "{{.Server.Version}}"],
    environment,
    { timeout: 30_000 },
  );
  if (!daemon.ok || !/^\d+[.]\d+/u.test(daemon.stdout.trim())) {
    report.rootFailureCode = "DOCKER_DAEMON_UNAVAILABLE";
    report.bootstrapTimeoutStage = "DOCKER_PREFLIGHT";
    report.disposableCleanup = "PASS";
    return report;
  }
  report.dockerDaemon = "PASS";

  const cli = runner(
    "/opt/homebrew/bin/supabase",
    ["--version"],
    environment,
    { timeout: 30_000 },
  );
  const cliVersion = parseSupabaseCliVersion(
    `${cli.stdout}\n${cli.stderr}`,
  );
  report.supabaseCliVersion = cliVersion.version;
  report.supabaseCliVersionCompatibility =
    cliVersion.compatibility;
  if (!cli.ok || cliVersion.compatibility === "FAIL") {
    report.rootFailureCode = "SUPABASE_CLI_INCOMPATIBLE";
    report.bootstrapTimeoutStage = "CLI_VERSION";
    report.disposableCleanup = "PASS";
    return report;
  }

  let reservation: Awaited<
    ReturnType<typeof reserveDisposablePorts>
  >;
  try {
    reservation = await reserveDisposablePorts();
  } catch {
    report.disposablePortSet = "FAIL";
    report.rootFailureCode =
      "DISPOSABLE_PORT_RESERVATION_FAILED";
    report.bootstrapTimeoutStage = "PORT_RESERVATION";
    report.disposableCleanup = "PASS";
    return report;
  }
  report.disposablePortSet = "PASS";
  const projectId =
    `plave-project004-clean-proof-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  let workdir: string | null = null;
  try {
    workdir = createBootstrapWorkdir({
      root,
      projectId,
      ports: reservation.ports,
      environment,
      runner,
    });
  } catch {
    workdir = null;
  }
  if (!workdir) {
    await reservation.release();
    report.tempConfigValidation = "FAIL";
    report.rootFailureCode =
      "BOOTSTRAP_TEMP_CONFIG_INVALID";
    report.bootstrapTimeoutStage = "TEMP_CONFIG";
    report.disposableCleanup = "PASS";
    return report;
  }
  report.tempConfigValidation = "PASS";
  await reservation.release();

  const started = runner(
    "/opt/homebrew/bin/supabase",
    [
      "start",
      "--workdir",
      workdir,
      "--exclude",
      bootstrapExcludedServices.join(","),
      "--yes",
    ],
    environment,
    { timeout: 600_000 },
  );
  const containers = collectContainerEvidence({
    projectId,
    environment,
    runner,
  });
  if (started.ok) {
    report.firstServiceFailed = "NONE";
    report.serviceExitCategory = "NONE";
    report.serviceHealthCategory = "HEALTHY";
    report.imageState = "AVAILABLE";
    report.baselineStackReady = "PASS";
    report.rootFailureCode = "NONE";
    report.rootCauseConfidence = "HIGH";
  } else {
    const failure = analyzeBootstrapFailure({
      cliOutput: `${started.stdout}\n${started.stderr}`,
      containers,
    });
    Object.assign(report, failure);
    report.bootstrapTimeoutStage = "SUPABASE_START";
  }
  report.disposableCleanup = cleanupBootstrapStack({
    projectId,
    workdir,
    environment,
    runner,
  });
  if (report.disposableCleanup === "FAIL") {
    report.baselineStackReady = "FAIL";
    report.bootstrapTimeoutStage = "CLEANUP";
    report.rootFailureCode =
      "DISPOSABLE_BOOTSTRAP_CLEANUP_FAILED";
    report.rootCauseConfidence = "HIGH";
  }
  return report;
}

export function renderBootstrapDiagnostic(
  report: BootstrapDiagnosticReport,
) {
  return [
    `DOCKER_DAEMON=${report.dockerDaemon}`,
    `DOCKER_RESOURCE_STATE=${report.dockerResourceState}`,
    `HOST_ARCHITECTURE=${report.hostArchitecture}`,
    `SUPABASE_CLI_VERSION=${report.supabaseCliVersion}`,
    `SUPABASE_CLI_VERSION_COMPATIBILITY=${report.supabaseCliVersionCompatibility}`,
    `TEMP_CONFIG_VALIDATION=${report.tempConfigValidation}`,
    `DISPOSABLE_PORT_SET=${report.disposablePortSet}`,
    `FIRST_SERVICE_FAILED=${report.firstServiceFailed}`,
    `SERVICE_EXIT_CATEGORY=${report.serviceExitCategory}`,
    `SERVICE_HEALTH_CATEGORY=${report.serviceHealthCategory}`,
    `IMAGE_STATE=${report.imageState}`,
    `BOOTSTRAP_TIMEOUT_STAGE=${report.bootstrapTimeoutStage}`,
    `BASELINE_STACK_READY=${report.baselineStackReady}`,
    "FIRST_MIGRATION_FAILED=NOT_RUN",
    `MIGRATION_SQL_EXECUTION_STARTED=${report.migrationSqlExecutionStarted}`,
    `DISPOSABLE_CLEANUP=${report.disposableCleanup}`,
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `ROOT_CAUSE_CONFIDENCE=${report.rootCauseConfidence}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
  ].join("\n") + "\n";
}
