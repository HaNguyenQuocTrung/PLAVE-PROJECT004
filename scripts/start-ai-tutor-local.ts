import {
  spawn,
  spawnSync,
  type ChildProcess,
} from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { getAiTutorConfiguration } from "../lib/ai-tutor/config-values.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { assertProductionLocalBuildBinding } from "./production-local-build-binding.ts";
import { productionLocalBuildContract } from "./production-local-build-contract.ts";
import {
  buildProject004RemoteRuntimeChildEnvironment,
  loadProject004RemoteRuntimeConfigFile,
  Project004RemoteRuntimeFailure,
} from "./project004-remote-runtime-connection.ts";

export const aiTutorLocalRuntimeContract = {
  environmentFile: ".env.local",
  loopbackHost: "127.0.0.1",
  loopbackPort: 3000,
  provider: "GOOGLE",
  model: "gemini-3.6-flash",
} as const;

const tutorEnvironmentKeys = new Set([
  "PLAVE_AI_TUTOR_ENABLED",
  "PLAVE_AI_PROVIDER",
  "GOOGLE_API_KEY",
  "GOOGLE_AI_MODEL",
]);

export type AiTutorLocalConfiguration = Readonly<{
  enabled: "true";
  provider: "GOOGLE";
  apiKey: string;
  model: "gemini-3.6-flash";
}>;

export function resolveAiTutorServerRuntimeConfiguration(
  candidateRoot = process.cwd(),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AiTutorLocalConfiguration {
  const explicitValues = [
    environment.PLAVE_AI_TUTOR_ENABLED,
    environment.PLAVE_AI_PROVIDER,
    environment.GOOGLE_API_KEY,
    environment.GOOGLE_AI_MODEL,
  ];
  const present = explicitValues.filter(
    (value) => value !== undefined && value !== "",
  ).length;
  if (present === 0) return loadAiTutorLocalConfiguration(candidateRoot);
  if (present !== explicitValues.length) {
    fail("AI_TUTOR_SERVER_ENV_PARTIAL");
  }
  if (environment.PLAVE_AI_TUTOR_ENABLED !== "true") {
    fail("AI_TUTOR_LOCAL_TUTOR_DISABLED");
  }
  if (environment.PLAVE_AI_PROVIDER !== aiTutorLocalRuntimeContract.provider) {
    fail("AI_TUTOR_LOCAL_PROVIDER_INVALID");
  }
  if (environment.GOOGLE_AI_MODEL !== aiTutorLocalRuntimeContract.model) {
    fail("AI_TUTOR_LOCAL_MODEL_INVALID");
  }
  const apiKey = environment.GOOGLE_API_KEY ?? "";
  const validated = getAiTutorConfiguration({
    NODE_ENV: "production",
    PLAVE_AI_TUTOR_ENABLED: environment.PLAVE_AI_TUTOR_ENABLED,
    PLAVE_AI_PROVIDER: environment.PLAVE_AI_PROVIDER,
    GOOGLE_API_KEY: apiKey,
    GOOGLE_AI_MODEL: environment.GOOGLE_AI_MODEL,
  });
  if (!validated.ok) fail("AI_TUTOR_LOCAL_GOOGLE_KEY_INVALID");
  return {
    enabled: "true",
    provider: "GOOGLE",
    apiKey,
    model: "gemini-3.6-flash",
  };
}

export type AiTutorLocalPortListener = Readonly<{
  pid: number;
  command: string;
  endpoint: string;
}>;

type SignalSource = Pick<NodeJS.Process, "on" | "off">;

export class AiTutorLocalRuntimeFailure extends Error {
  readonly code: string;
  readonly listeners: readonly AiTutorLocalPortListener[];

  constructor(
    code: string,
    listeners: readonly AiTutorLocalPortListener[] = [],
  ) {
    super(code);
    this.code = code;
    this.listeners = listeners;
  }
}

function fail(
  code: string,
  listeners: readonly AiTutorLocalPortListener[] = [],
): never {
  throw new AiTutorLocalRuntimeFailure(code, listeners);
}

function parseEnvironmentValue(rawValue: string) {
  let value = rawValue.trim();
  const quote = value.at(0);
  if (quote === '"' || quote === "'" || quote === "`") {
    if (value.length < 2 || value.at(-1) !== quote) {
      fail("AI_TUTOR_LOCAL_ENV_FORMAT_INVALID");
    }
    value = value.slice(1, -1);
    if (quote === '"') {
      value = value.replaceAll("\\n", "\n").replaceAll("\\r", "\r");
    }
  } else {
    value = value.replace(/\s+#.*$/u, "").trim();
  }
  if (/[\0\r\n]/u.test(value)) {
    fail("AI_TUTOR_LOCAL_ENV_VALUE_INVALID");
  }
  return value;
}

export function parseAiTutorLocalEnvironment(source: string) {
  const values = new Map<string, string>();
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u,
    );
    if (!match) continue;
    const key = match[1] ?? "";
    if (!tutorEnvironmentKeys.has(key)) continue;
    if (values.has(key)) {
      fail("AI_TUTOR_LOCAL_ENV_DUPLICATE_KEY");
    }
    values.set(key, parseEnvironmentValue(match[2] ?? ""));
  }
  return values;
}

export function loadAiTutorLocalConfiguration(
  candidateRoot = process.cwd(),
): AiTutorLocalConfiguration {
  const root = assertProject004Workspace(candidateRoot);
  const path = resolve(
    root,
    aiTutorLocalRuntimeContract.environmentFile,
  );
  if (!existsSync(path)) fail("AI_TUTOR_LOCAL_ENV_FILE_MISSING");
  const stat = lstatSync(path);
  const processUid =
    typeof process.getuid === "function" ? process.getuid() : null;
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o600 ||
    (processUid !== null && stat.uid !== processUid)
  ) {
    fail("AI_TUTOR_LOCAL_ENV_FILE_PERMISSION_INVALID");
  }
  const values = parseAiTutorLocalEnvironment(
    readFileSync(path, "utf8"),
  );
  if (values.get("PLAVE_AI_TUTOR_ENABLED") !== "true") {
    fail("AI_TUTOR_LOCAL_TUTOR_DISABLED");
  }
  if (
    values.get("PLAVE_AI_PROVIDER") !==
    aiTutorLocalRuntimeContract.provider
  ) {
    fail("AI_TUTOR_LOCAL_PROVIDER_INVALID");
  }
  if (
    values.get("GOOGLE_AI_MODEL") !==
    aiTutorLocalRuntimeContract.model
  ) {
    fail("AI_TUTOR_LOCAL_MODEL_INVALID");
  }
  const apiKey = values.get("GOOGLE_API_KEY") ?? "";
  if (!apiKey) fail("AI_TUTOR_LOCAL_GOOGLE_KEY_MISSING");
  const validated = getAiTutorConfiguration({
    NODE_ENV: "development",
    PLAVE_AI_TUTOR_ENABLED: values.get("PLAVE_AI_TUTOR_ENABLED"),
    PLAVE_AI_PROVIDER: values.get("PLAVE_AI_PROVIDER"),
    GOOGLE_API_KEY: apiKey,
    GOOGLE_AI_MODEL: values.get("GOOGLE_AI_MODEL"),
  });
  if (!validated.ok) fail("AI_TUTOR_LOCAL_GOOGLE_KEY_INVALID");
  return {
    enabled: "true",
    provider: "GOOGLE",
    apiKey,
    model: "gemini-3.6-flash",
  };
}

export function buildAiTutorLocalChildEnvironment(
  remoteConfig: Parameters<
    typeof buildProject004RemoteRuntimeChildEnvironment
  >[0],
  tutorConfig: AiTutorLocalConfiguration,
  environment: Readonly<Record<string, string | undefined>> =
    process.env,
) {
  const child = buildProject004RemoteRuntimeChildEnvironment(
    remoteConfig,
    environment,
  );
  child.PLAVE_AI_TUTOR_ENABLED = tutorConfig.enabled;
  child.PLAVE_AI_PROVIDER = tutorConfig.provider;
  child.GOOGLE_API_KEY = tutorConfig.apiKey;
  child.GOOGLE_AI_MODEL = tutorConfig.model;
  child.GEMINI_API_KEY = "";
  child.OPENAI_API_KEY = "";
  child.OPENAI_MODEL = "";
  child.PLAVE_AI_TUTOR_TEST_MODE = "";
  return child;
}

const launcherEnvironmentAllowlist = [
  "COLORTERM",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NO_COLOR",
  "PATH",
  "SHELL",
  "TERM",
  "TMPDIR",
  "TZ",
] as const;

export function buildAiTutorProductionLauncherEnvironments(
  tutorConfig: AiTutorLocalConfiguration,
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const base: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of launcherEnvironmentAllowlist) {
    const value = environment[key];
    if (value !== undefined) base[key] = value;
  }
  base.NEXT_TELEMETRY_DISABLED = "1";
  const build: NodeJS.ProcessEnv = {
    ...base,
    PLAVE_AI_TUTOR_ENABLED: "false",
    PLAVE_AI_PROVIDER: "",
    GOOGLE_API_KEY: "",
    GOOGLE_AI_MODEL: "",
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    OPENAI_MODEL: "",
    PLAVE_AI_TUTOR_TEST_MODE: "",
  };
  const runtime: NodeJS.ProcessEnv = {
    ...base,
    PLAVE_AI_TUTOR_ENABLED: tutorConfig.enabled,
    PLAVE_AI_PROVIDER: tutorConfig.provider,
    GOOGLE_API_KEY: tutorConfig.apiKey,
    GOOGLE_AI_MODEL: tutorConfig.model,
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    OPENAI_MODEL: "",
    PLAVE_AI_TUTOR_TEST_MODE: "",
  };
  return { build, runtime } as const;
}

export function parseAiTutorLocalPortArguments(args: readonly string[]) {
  if (args.length === 0) return aiTutorLocalRuntimeContract.loopbackPort;
  if (args.length !== 2 || args[0] !== "--port") {
    fail("AI_TUTOR_LOCAL_ARGUMENTS_INVALID");
  }
  const port = Number(args[1]);
  if (!/^\d+$/u.test(args[1] ?? "") || !Number.isSafeInteger(port)) {
    fail("AI_TUTOR_LOCAL_PORT_INVALID");
  }
  return port;
}

function sanitizedMetadata(value: string) {
  return value
    .replace(/[^A-Za-z0-9 ._:/()[\]-]/gu, "?")
    .slice(0, 240);
}

export function inspectAiTutorLocalPort(
  port: number = aiTutorLocalRuntimeContract.loopbackPort,
): AiTutorLocalPortListener[] {
  const result = spawnSync(
    "lsof",
    [
      "-nP",
      `-iTCP:${String(port)}`,
      "-sTCP:LISTEN",
      "-Fpcn",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || !result.stdout) return [];
  const listeners: Array<{
    pid: number;
    command: string;
    endpoint: string;
  }> = [];
  let current: {
    pid: number;
    command: string;
    endpoint: string;
  } | null = null;
  const commit = () => {
    if (current && Number.isSafeInteger(current.pid) && current.pid > 0) {
      listeners.push({ ...current });
    }
  };
  for (const line of result.stdout.split(/\r?\n/u)) {
    const field = line.at(0);
    const value = line.slice(1);
    if (field === "p") {
      commit();
      current = {
        pid: Number(value),
        command: "UNKNOWN",
        endpoint: `TCP:${String(port)}`,
      };
    } else if (field === "c" && current) {
      current.command = sanitizedMetadata(value) || "UNKNOWN";
    } else if (field === "n" && current) {
      current.endpoint = sanitizedMetadata(value) || `TCP:${String(port)}`;
    }
  }
  commit();
  return listeners;
}

function probeLoopbackPort(host: string, port: number) {
  return new Promise<void>((resolveProbe, rejectProbe) => {
    const server = createServer();
    server.unref();
    server.once("error", rejectProbe);
    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) =>
        error ? rejectProbe(error) : resolveProbe(),
      );
    });
  });
}

export async function assertAiTutorLocalPortAvailable(
  host: string,
  port: number,
  inspectPort: (
    port: number,
  ) => readonly AiTutorLocalPortListener[] = inspectAiTutorLocalPort,
  probePort: (host: string, port: number) => Promise<void> =
    probeLoopbackPort,
) {
  if (host !== aiTutorLocalRuntimeContract.loopbackHost) {
    fail("AI_TUTOR_LOCAL_NON_LOOPBACK_HOST_REJECTED");
  }
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
    fail("AI_TUTOR_LOCAL_PORT_INVALID");
  }
  const listeners = inspectPort(port);
  if (listeners.length > 0) {
    fail("AI_TUTOR_LOCAL_PORT_OCCUPIED", listeners);
  }
  try {
    await probePort(host, port);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE" || code === "EACCES") {
      const racedListeners = inspectPort(port);
      fail(
        racedListeners.length > 0
          ? "AI_TUTOR_LOCAL_PORT_OCCUPIED"
          : "AI_TUTOR_LOCAL_PORT_OCCUPIED_METADATA_UNAVAILABLE",
        racedListeners,
      );
    }
    fail("AI_TUTOR_LOCAL_PORT_PROBE_FAILED");
  }
}

function processGroupAlive(pgid: number) {
  if (process.platform === "win32") return false;
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function signalChildProcessTree(
  child: ChildProcess,
  signal: NodeJS.Signals,
) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
      try {
        child.kill(signal);
      } catch {
        // The process may have exited between the checks.
      }
    }
  }
}

async function waitForProcessGroupExit(pgid: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processGroupAlive(pgid)) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  return !processGroupAlive(pgid);
}

export async function waitForAiTutorLocalChild(
  child: ChildProcess,
  options?: {
    signalSource?: SignalSource;
    terminationGraceMs?: number;
  },
) {
  const signalSource = options?.signalSource ?? process;
  const terminationGraceMs = options?.terminationGraceMs ?? 5_000;
  const pgid = child.pid ?? null;
  let stoppingSignal: "SIGINT" | "SIGTERM" | null = null;
  let killTimer: ReturnType<typeof setTimeout> | undefined;

  const stop = (signal: "SIGINT" | "SIGTERM") => {
    if (!stoppingSignal) {
      stoppingSignal = signal;
      signalChildProcessTree(child, "SIGTERM");
      killTimer = setTimeout(() => {
        signalChildProcessTree(child, "SIGKILL");
      }, terminationGraceMs);
      killTimer.unref();
      return;
    }
    signalChildProcessTree(child, "SIGKILL");
  };
  const onSigint = () => stop("SIGINT");
  const onSigterm = () => stop("SIGTERM");
  signalSource.on("SIGINT", onSigint);
  signalSource.on("SIGTERM", onSigterm);

  let exitCode: number;
  try {
    exitCode = await new Promise<number>((resolveExit, rejectExit) => {
      child.once("error", rejectExit);
      child.once("exit", (code, signal) => {
        if (stoppingSignal) {
          resolveExit(stoppingSignal === "SIGINT" ? 130 : 143);
        } else if (signal) {
          resolveExit(1);
        } else {
          resolveExit(code ?? 0);
        }
      });
    });
  } finally {
    signalSource.off("SIGINT", onSigint);
    signalSource.off("SIGTERM", onSigterm);
    if (killTimer) clearTimeout(killTimer);
  }

  if (stoppingSignal && pgid && process.platform !== "win32") {
    signalChildProcessTree(child, "SIGTERM");
    if (!(await waitForProcessGroupExit(pgid, terminationGraceMs))) {
      signalChildProcessTree(child, "SIGKILL");
      if (!(await waitForProcessGroupExit(pgid, terminationGraceMs))) {
        fail("AI_TUTOR_LOCAL_PROCESS_TREE_CLEANUP_FAILED");
      }
    }
  }
  return exitCode;
}

function assertAiTutorLocalBuildTargetSafe(root: string) {
  const buildPath = resolve(
    root,
    productionLocalBuildContract.distDirectory,
  );
  if (!existsSync(buildPath)) return;
  if (lstatSync(buildPath).isSymbolicLink()) {
    fail("AI_TUTOR_LOCAL_CACHE_SYMLINK_REJECTED");
  }
}

export function assertAiTutorLocalProductionBuild(root: string) {
  assertAiTutorLocalBuildTargetSafe(root);
  const buildPath = resolve(
    root,
    productionLocalBuildContract.distDirectory,
  );
  if (!existsSync(resolve(buildPath, "BUILD_ID"))) {
    fail("AI_TUTOR_LOCAL_PRODUCTION_BUILD_MISSING");
  }
  try {
    assertProductionLocalBuildBinding(
      buildPath,
      "VALIDATED_RUNTIME_FILE",
      "FULL_APPLICATION_AI_RUNTIME_REQUIRED",
    );
  } catch {
    fail("AI_TUTOR_LOCAL_PRODUCTION_BUILD_BINDING_INVALID");
  }
  const staticRoot = resolve(buildPath, "static");
  if (!existsSync(staticRoot) || !lstatSync(staticRoot).isDirectory()) {
    fail("AI_TUTOR_LOCAL_CLIENT_ARTIFACT_MISSING");
  }
  const pending = [staticRoot];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        fail("AI_TUTOR_LOCAL_CLIENT_ARTIFACT_SYMLINK_REJECTED");
      }
      if (entry.isDirectory()) {
        pending.push(path);
        continue;
      }
      if (
        entry.isFile() &&
        /[.](?:css|html|js|json|map|txt)$/u.test(entry.name) &&
        /NEXT_PUBLIC_GOOGLE|NEXT_PUBLIC_PLAVE_AI_TUTOR_KEY/u.test(
          readFileSync(path, "utf8"),
        )
      ) {
        fail("AI_TUTOR_LOCAL_CLIENT_SECRET_BOUNDARY_FAILED");
      }
    }
  }
}

export async function startAiTutorLocalRuntime(options?: {
  candidateRoot?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  host?: string;
  port?: number;
  inspectPort?: (
    port: number,
  ) => readonly AiTutorLocalPortListener[];
  probePort?: (host: string, port: number) => Promise<void>;
  spawnChild?: typeof spawn;
  signalSource?: SignalSource;
  terminationGraceMs?: number;
  verifyBuild?: (root: string) => void;
  onPrepared?: (input: Readonly<{ model: string; url: string }>) => void;
}) {
  const root = assertProject004Workspace(
    options?.candidateRoot ?? process.cwd(),
  );
  const host = options?.host ?? aiTutorLocalRuntimeContract.loopbackHost;
  const port = options?.port ?? aiTutorLocalRuntimeContract.loopbackPort;
  if (host !== aiTutorLocalRuntimeContract.loopbackHost) {
    fail("AI_TUTOR_LOCAL_NON_LOOPBACK_HOST_REJECTED");
  }
  loadProject004RemoteRuntimeConfigFile(root);
  const tutorConfig = resolveAiTutorServerRuntimeConfiguration(
    root,
    options?.environment ?? process.env,
  );
  const launcherEnvironments = buildAiTutorProductionLauncherEnvironments(
    tutorConfig,
    options?.environment ?? process.env,
  );
  await assertAiTutorLocalPortAvailable(
    host,
    port,
    options?.inspectPort ?? inspectAiTutorLocalPort,
    options?.probePort ?? probeLoopbackPort,
  );
  assertAiTutorLocalBuildTargetSafe(root);
  const productionLauncher = resolve(root, "scripts/start-production-local.ts");
  if (!existsSync(productionLauncher)) {
    fail("AI_TUTOR_LOCAL_PRODUCTION_LAUNCHER_MISSING");
  }
  const previousUmask = process.umask(0o077);
  let buildChild: ChildProcess;
  try {
    buildChild = (options?.spawnChild ?? spawn)(
      process.execPath,
      [
        "--no-warnings",
        "--experimental-strip-types",
        productionLauncher,
        "--build",
      ],
      {
        cwd: root,
        env: launcherEnvironments.build,
        stdio: "inherit",
        detached: process.platform !== "win32",
      },
    );
  } finally {
    process.umask(previousUmask);
  }
  const buildExitCode = await waitForAiTutorLocalChild(buildChild, {
    signalSource: options?.signalSource,
    terminationGraceMs: options?.terminationGraceMs,
  });
  if (buildExitCode !== 0) {
    if (buildExitCode === 130 || buildExitCode === 143) return buildExitCode;
    fail("AI_TUTOR_LOCAL_PRODUCTION_BUILD_FAILED");
  }
  (options?.verifyBuild ?? assertAiTutorLocalProductionBuild)(root);
  options?.onPrepared?.({
    model: tutorConfig.model,
    url: `http://localhost:${String(port)}/tutor`,
  });

  const runtimeUmask = process.umask(0o077);
  let runtimeChild: ChildProcess;
  try {
    runtimeChild = (options?.spawnChild ?? spawn)(
      process.execPath,
      [
        "--no-warnings",
        "--experimental-strip-types",
        productionLauncher,
        "--hostname",
        host,
        "--port",
        String(port),
      ],
      {
        cwd: root,
        env: launcherEnvironments.runtime,
        stdio: "inherit",
        detached: process.platform !== "win32",
      },
    );
  } finally {
    process.umask(runtimeUmask);
  }
  return waitForAiTutorLocalChild(runtimeChild, {
    signalSource: options?.signalSource,
    terminationGraceMs: options?.terminationGraceMs,
  });
}

function renderFailure(error: unknown) {
  const runtimeFailure =
    error instanceof AiTutorLocalRuntimeFailure ? error : null;
  const remoteFailure =
    error instanceof Project004RemoteRuntimeFailure ? error : null;
  const lines = ["AI_TUTOR_LOCAL_START=FAIL"];
  for (const listener of runtimeFailure?.listeners ?? []) {
    lines.push(
      `AI_TUTOR_LOCAL_PORT_OCCUPIED_PID=${String(listener.pid)}`,
      `AI_TUTOR_LOCAL_PORT_OCCUPIED_COMMAND=${sanitizedMetadata(listener.command)}`,
      `AI_TUTOR_LOCAL_PORT_OCCUPIED_LISTENER=${sanitizedMetadata(listener.endpoint)}`,
    );
  }
  lines.push(
    `ROOT_FAILURE_CODE=${runtimeFailure?.code ?? remoteFailure?.code ?? "AI_TUTOR_LOCAL_START_FAILED"}`,
    "",
  );
  return lines.join("\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    const port = parseAiTutorLocalPortArguments(process.argv.slice(2));
    process.exitCode = await startAiTutorLocalRuntime({
      port,
      onPrepared: ({ model, url }) => {
        process.stdout.write(
          [
            "AI_TUTOR_LOCAL_TARGET_GUARD=PASS",
            "AI_TUTOR_LOCAL_LOOPBACK_ONLY=PASS",
            "AI_TUTOR_LOCAL_SUPABASE_PUBLIC_CONFIG=PASS",
            "AI_TUTOR_LOCAL_PROVIDER=GOOGLE",
            `AI_TUTOR_LOCAL_MODEL=${model}`,
            "AI_TUTOR_LOCAL_KEY_CONFIGURED=YES",
            "AI_TUTOR_LOCAL_BUILD_BINDING=PASS",
            "AI_TUTOR_LOCAL_CLIENT_SECRET_BOUNDARY=PASS",
            "AI_TUTOR_LOCAL_START=READY",
            `AI_TUTOR_LOCAL_URL=${url}`,
            "",
          ].join("\n"),
        );
      },
    });
  } catch (error) {
    process.stdout.write(renderFailure(error));
    process.exitCode = 1;
  }
}
