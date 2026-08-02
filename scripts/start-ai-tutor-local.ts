import {
  spawn,
  spawnSync,
  type ChildProcess,
} from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { getAiTutorConfiguration } from "../lib/ai-tutor/config-values.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import {
  buildProject004RemoteRuntimeChildEnvironment,
  loadProject004RemoteRuntimeConfigFile,
  project004RemoteRuntimeContract,
  Project004RemoteRuntimeFailure,
} from "./project004-remote-runtime-connection.ts";

export const aiTutorLocalRuntimeContract = {
  environmentFile: ".env.local",
  loopbackHost: "127.0.0.1",
  loopbackPort: 3001,
  provider: "GOOGLE",
  model: "gemini-3.6-flash",
} as const;

const tutorEnvironmentKeys = new Set([
  "PLAVE_AI_TUTOR_ENABLED",
  "PLAVE_AI_PROVIDER",
  "GOOGLE_API_KEY",
  "GOOGLE_AI_MODEL",
]);

type AiTutorLocalConfiguration = Readonly<{
  enabled: "true";
  provider: "GOOGLE";
  apiKey: string;
  model: "gemini-3.6-flash";
}>;

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

function prepareRemoteRuntimeCache(root: string) {
  const cachePath = resolve(
    root,
    project004RemoteRuntimeContract.cacheDirectory,
  );
  if (!existsSync(cachePath)) return;
  if (lstatSync(cachePath).isSymbolicLink()) {
    fail("AI_TUTOR_LOCAL_CACHE_SYMLINK_REJECTED");
  }
  rmSync(cachePath, { recursive: true, force: true });
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
  onPrepared?: (input: Readonly<{ model: string }>) => void;
}) {
  const root = assertProject004Workspace(
    options?.candidateRoot ?? process.cwd(),
  );
  const host = options?.host ?? aiTutorLocalRuntimeContract.loopbackHost;
  const port = options?.port ?? aiTutorLocalRuntimeContract.loopbackPort;
  if (host !== aiTutorLocalRuntimeContract.loopbackHost) {
    fail("AI_TUTOR_LOCAL_NON_LOOPBACK_HOST_REJECTED");
  }
  const remoteConfig = loadProject004RemoteRuntimeConfigFile(root);
  const tutorConfig = loadAiTutorLocalConfiguration(root);
  const childEnvironment = buildAiTutorLocalChildEnvironment(
    remoteConfig,
    tutorConfig,
    options?.environment ?? process.env,
  );
  await assertAiTutorLocalPortAvailable(
    host,
    port,
    options?.inspectPort ?? inspectAiTutorLocalPort,
    options?.probePort ?? probeLoopbackPort,
  );
  prepareRemoteRuntimeCache(root);
  const nextBin = resolve(root, "node_modules/next/dist/bin/next");
  if (!existsSync(nextBin)) fail("AI_TUTOR_LOCAL_NEXT_BINARY_MISSING");
  options?.onPrepared?.({ model: tutorConfig.model });
  const previousUmask = process.umask(0o077);
  let child: ChildProcess;
  try {
    child = (options?.spawnChild ?? spawn)(
      process.execPath,
      [
        nextBin,
        "dev",
        "--hostname",
        host,
        "--port",
        String(port),
      ],
      {
        cwd: root,
        env: childEnvironment,
        stdio: "inherit",
        detached: process.platform !== "win32",
      },
    );
  } finally {
    process.umask(previousUmask);
  }
  return waitForAiTutorLocalChild(child, {
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
    process.exitCode = await startAiTutorLocalRuntime({
      onPrepared: ({ model }) => {
        process.stdout.write(
          [
            "AI_TUTOR_LOCAL_TARGET_GUARD=PASS",
            "AI_TUTOR_LOCAL_LOOPBACK_ONLY=PASS",
            "AI_TUTOR_LOCAL_SUPABASE_PUBLIC_CONFIG=PASS",
            "AI_TUTOR_LOCAL_PROVIDER=GOOGLE",
            `AI_TUTOR_LOCAL_MODEL=${model}`,
            "AI_TUTOR_LOCAL_KEY_CONFIGURED=YES",
            "AI_TUTOR_LOCAL_START=READY",
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
