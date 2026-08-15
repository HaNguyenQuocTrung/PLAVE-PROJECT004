import assert from "node:assert/strict";
import {
  spawn,
  type ChildProcess,
  type SpawnOptions,
} from "node:child_process";
import { EventEmitter } from "node:events";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildAiTutorLocalChildEnvironment,
  buildAiTutorProductionLauncherEnvironments,
  loadAiTutorLocalConfiguration,
  parseAiTutorLocalPortArguments,
  resolveAiTutorServerRuntimeConfiguration,
  parseAiTutorLocalEnvironment,
  startAiTutorLocalRuntime,
  AiTutorLocalRuntimeFailure,
  waitForAiTutorLocalChild,
} from "../scripts/start-ai-tutor-local.ts";
import {
  buildProject004RemoteRuntimeChildEnvironment,
  createProject004RemoteRuntimeConfig,
  project004RemoteRuntimeContract,
  serializeProject004RemoteRuntimeConfig,
  writeProject004RemoteRuntimeConfigFile,
} from "../scripts/project004-remote-runtime-connection.ts";
import { preflightAiTutorLocal } from "../scripts/preflight-ai-tutor-local.ts";
import { getHeaderNavigation } from "../lib/auth/navigation.ts";

const workspaceRoot = resolve(import.meta.dirname, "..");
const sampleRef = "abcdefghijklmnopqrst";
const samplePublicUrl = `https://${sampleRef}.supabase.co`;
const samplePublishableKey = `sb_publishable_${"x".repeat(24)}`;
const syntheticGoogleKey = "TEST_ONLY_GOOGLE_KEY_FOR_LOCAL_RUNTIME";

function sampleRemoteConfig() {
  return createProject004RemoteRuntimeConfig({
    projectRef: sampleRef,
    publicUrl: samplePublicUrl,
    publishableKey: samplePublishableKey,
  });
}

function createFakeCanonicalWorkspace(input?: {
  remote?: boolean;
  tutorSource?: string;
}) {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "project004-ai-tutor-local-"),
  );
  const root = join(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(join(root, "supabase"), { recursive: true });
  mkdirSync(join(root, "node_modules/next/dist/bin"), {
    recursive: true,
  });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    '{"name":"plave-project004"}\n',
  );
  writeFileSync(
    join(root, "supabase/config.toml"),
    'project_id = "PLAVE-PROJECT004"\n',
  );
  writeFileSync(
    join(root, "next.config.ts"),
    'const cache = ".next-owner-local-project004";\n',
  );
  writeFileSync(join(root, "node_modules/next/dist/bin/next"), "");
  writeFileSync(join(root, "scripts/start-production-local.ts"), "");
  if (input?.remote !== false) {
    writeProject004RemoteRuntimeConfigFile(sampleRemoteConfig(), root);
  }
  const tutorSource =
    input?.tutorSource ??
    [
      "UNRELATED_SETTING=preserved-but-not-forwarded",
      "PLAVE_AI_TUTOR_ENABLED=true",
      "PLAVE_AI_PROVIDER=GOOGLE",
      `GOOGLE_API_KEY=${syntheticGoogleKey}`,
      "GOOGLE_AI_MODEL=gemini-3.6-flash",
      "",
    ].join("\n");
  writeFileSync(join(root, ".env.local"), tutorSource, {
    mode: 0o600,
  });
  chmodSync(join(root, ".env.local"), 0o600);
  return { temporaryRoot, root };
}

function expectLocalFailure(
  action: () => unknown,
  expectedCode: string,
) {
  assert.throws(action, (error: unknown) => {
    return (
      error instanceof AiTutorLocalRuntimeFailure &&
      error.code === expectedCode
    );
  });
}

async function expectLocalFailureAsync(
  action: () => Promise<unknown>,
  expectedCode: string,
) {
  await assert.rejects(action, (error: unknown) => {
    return (
      error instanceof AiTutorLocalRuntimeFailure &&
      error.code === expectedCode
    );
  });
}

test("Tutor environment merge reads only the four local keys and preserves validated remote Supabase public config", () => {
  const parsed = parseAiTutorLocalEnvironment(
    [
      "UNRELATED=do-not-forward",
      "PLAVE_AI_TUTOR_ENABLED=true",
      "PLAVE_AI_PROVIDER='GOOGLE'",
      `GOOGLE_API_KEY=${syntheticGoogleKey}`,
      'GOOGLE_AI_MODEL="gemini-3.6-flash"',
    ].join("\n"),
  );
  assert.deepEqual([...parsed.keys()].sort(), [
    "GOOGLE_AI_MODEL",
    "GOOGLE_API_KEY",
    "PLAVE_AI_PROVIDER",
    "PLAVE_AI_TUTOR_ENABLED",
  ]);
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    const tutor = loadAiTutorLocalConfiguration(root);
    const child = buildAiTutorLocalChildEnvironment(
      sampleRemoteConfig(),
      tutor,
      {
        PATH: "/safe/path",
        PLAVE_AI_TUTOR_ENABLED: "false",
        GOOGLE_API_KEY: "INHERITED_KEY_MUST_NOT_WIN",
        DATABASE_URL: "must-not-pass",
      },
    );
    assert.equal(child.NEXT_PUBLIC_SUPABASE_URL, samplePublicUrl);
    assert.equal(
      child.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      samplePublishableKey,
    );
    assert.equal(child.PLAVE_AI_TUTOR_ENABLED, "true");
    assert.equal(child.PLAVE_AI_PROVIDER, "GOOGLE");
    assert.equal(child.GOOGLE_API_KEY, syntheticGoogleKey);
    assert.equal(child.GOOGLE_AI_MODEL, "gemini-3.6-flash");
    assert.equal(child.DATABASE_URL, "");
    assert.equal(child.UNRELATED, undefined);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("local preflight validates protected configuration without spawning or calling a provider", async () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  let probed = false;
  try {
    const result = await preflightAiTutorLocal(root, {
      inspectPort: () => [],
      probePort: async (host, port) => {
        probed = true;
        assert.equal(host, "127.0.0.1");
        assert.equal(port, 3000);
      },
    });
    assert.deepEqual(result, {
      provider: "GOOGLE",
      model: "gemini-3.6-flash",
      port: 3000,
      buildBinding: "REBUILD_ON_START",
    });
    assert.equal(probed, true);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("explicit AI Tutor port accepts loopback-safe numeric overrides only", () => {
  assert.equal(parseAiTutorLocalPortArguments([]), 3000);
  assert.equal(parseAiTutorLocalPortArguments(["--port", "3001"]), 3001);
  expectLocalFailure(
    () => parseAiTutorLocalPortArguments(["--hostname", "0.0.0.0"]),
    "AI_TUTOR_LOCAL_ARGUMENTS_INVALID",
  );
  expectLocalFailure(
    () => parseAiTutorLocalPortArguments(["--port", "not-a-port"]),
    "AI_TUTOR_LOCAL_PORT_INVALID",
  );
});

test("Student navigation follows server-side AI availability policy", () => {
  assert.equal(
    getHeaderNavigation(true, "STUDENT", true, true).some(
      (item) => item.href === "/tutor",
    ),
    true,
  );
  assert.equal(
    getHeaderNavigation(true, "STUDENT", true, false).some(
      (item) => item.href === "/tutor",
    ),
    false,
  );
});

test("server runtime accepts only a complete validated Google environment or protected local file", () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    const explicit = resolveAiTutorServerRuntimeConfiguration(root, {
      PLAVE_AI_TUTOR_ENABLED: "true",
      PLAVE_AI_PROVIDER: "GOOGLE",
      GOOGLE_API_KEY: syntheticGoogleKey,
      GOOGLE_AI_MODEL: "gemini-3.6-flash",
    });
    assert.equal(explicit.provider, "GOOGLE");
    assert.equal(explicit.model, "gemini-3.6-flash");
    expectLocalFailure(
      () =>
        resolveAiTutorServerRuntimeConfiguration(root, {
          PLAVE_AI_TUTOR_ENABLED: "true",
          PLAVE_AI_PROVIDER: "GOOGLE",
        }),
      "AI_TUTOR_SERVER_ENV_PARTIAL",
    );
    assert.equal(
      resolveAiTutorServerRuntimeConfiguration(root, {}).provider,
      "GOOGLE",
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("remote runtime remains Tutor OFF while only the local child runtime becomes ON", () => {
  const remoteOnly = buildProject004RemoteRuntimeChildEnvironment(
    sampleRemoteConfig(),
    {
      PATH: "/safe/path",
      PLAVE_AI_TUTOR_ENABLED: "true",
      PLAVE_AI_PROVIDER: "GOOGLE",
      GOOGLE_API_KEY: syntheticGoogleKey,
    },
  );
  assert.notEqual(remoteOnly.PLAVE_AI_TUTOR_ENABLED, "true");
  assert.equal(remoteOnly.PLAVE_AI_PROVIDER, undefined);
  assert.equal(remoteOnly.GOOGLE_API_KEY, undefined);
  assert.equal(remoteOnly.__NEXT_PROCESSED_ENV, "true");
});

test("Google key is server-only: absent from public env, argv, diagnostics, and repository client sources", async () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  const capturedArgs: (readonly string[])[] = [];
  const capturedOptions: SpawnOptions[] = [];
  let diagnostics = "";
  try {
    const fakeSpawn = ((
      _command: string,
      args: readonly string[],
      options: SpawnOptions,
    ) => {
      capturedArgs.push(args);
      capturedOptions.push(options);
      const child = new EventEmitter() as ChildProcess;
      Object.defineProperty(child, "pid", {
        value: 42421 + capturedArgs.length,
        configurable: true,
      });
      Object.defineProperty(child, "exitCode", {
        value: null,
        configurable: true,
      });
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    }) as typeof spawn;
    const exitCode = await startAiTutorLocalRuntime({
      candidateRoot: root,
      port: 43_221,
      inspectPort: () => [],
      probePort: async () => undefined,
      spawnChild: fakeSpawn,
      verifyBuild: () => undefined,
      onPrepared: ({ model }) => {
        diagnostics = [
          "AI_TUTOR_LOCAL_PROVIDER=GOOGLE",
          `AI_TUTOR_LOCAL_MODEL=${model}`,
          "AI_TUTOR_LOCAL_KEY_CONFIGURED=YES",
        ].join("\n");
      },
    });
    assert.equal(exitCode, 0);
    assert.equal(capturedOptions.length, 2);
    const buildEnvironment = (capturedOptions[0]?.env ?? {}) as NodeJS.ProcessEnv;
    const runtimeEnvironment = (capturedOptions[1]?.env ?? {}) as NodeJS.ProcessEnv;
    assert.equal(buildEnvironment.GOOGLE_API_KEY, "");
    assert.equal(buildEnvironment.PLAVE_AI_TUTOR_ENABLED, "false");
    assert.equal(runtimeEnvironment.GOOGLE_API_KEY, syntheticGoogleKey);
    assert.equal(runtimeEnvironment.PLAVE_AI_TUTOR_ENABLED, "true");
    assert.equal(runtimeEnvironment.NEXT_PUBLIC_SUPABASE_URL, undefined);
    assert.equal(runtimeEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, undefined);
    assert.equal(runtimeEnvironment.NEXT_PUBLIC_GOOGLE_API_KEY, undefined);
    assert.equal(runtimeEnvironment.NEXT_PUBLIC_PLAVE_AI_TUTOR_KEY, undefined);
    assert.match(capturedArgs[0]?.join(" ") ?? "", /start-production-local[.]ts --build/u);
    assert.match(capturedArgs[1]?.join(" ") ?? "", /start-production-local[.]ts --hostname 127[.]0[.]0[.]1 --port 43221/u);
    assert.doesNotMatch(capturedArgs.flat().join(" "), new RegExp(syntheticGoogleKey, "u"));
    assert.doesNotMatch(diagnostics, new RegExp(syntheticGoogleKey, "u"));
    const clientSources = [
      readFileSync(join(workspaceRoot, "components/AiTutorChat.tsx"), "utf8"),
      readFileSync(join(workspaceRoot, "app/tutor/page.tsx"), "utf8"),
    ].join("\n");
    assert.doesNotMatch(clientSources, /GOOGLE_API_KEY|NEXT_PUBLIC_GOOGLE/u);
    const productionWrapper = readFileSync(
      join(workspaceRoot, "scripts/start-production-local.ts"),
      "utf8",
    );
    assert.match(productionWrapper, /GOOGLE_API_KEY: tutorConfig[?][.]apiKey/u);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("production launcher environments never inherit unrestricted variables or expose the key during build", () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    const tutor = loadAiTutorLocalConfiguration(root);
    const environments = buildAiTutorProductionLauncherEnvironments(
      tutor,
      {
        PATH: "/safe/path",
        DATABASE_URL: "must-not-pass",
        GOOGLE_API_KEY: "INHERITED_KEY_MUST_NOT_WIN",
      },
    );
    assert.equal(environments.build.GOOGLE_API_KEY, "");
    assert.equal(environments.runtime.GOOGLE_API_KEY, syntheticGoogleKey);
    assert.equal(environments.build.DATABASE_URL, undefined);
    assert.equal(environments.runtime.DATABASE_URL, undefined);
    assert.equal(environments.build.NEXT_PUBLIC_SUPABASE_URL, undefined);
    assert.equal(environments.runtime.NEXT_PUBLIC_SUPABASE_URL, undefined);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("missing remote Supabase public configuration fails closed before spawn", async () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace({
    remote: false,
  });
  let spawned = false;
  try {
    await assert.rejects(
      startAiTutorLocalRuntime({
        candidateRoot: root,
        inspectPort: () => [],
        spawnChild: ((..._args: Parameters<typeof spawn>) => {
          spawned = true;
          return spawn(..._args);
        }) as typeof spawn,
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === "REMOTE_RUNTIME_ENV_FILE_MISSING",
    );
    assert.equal(spawned, false);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }

  const malformed = createFakeCanonicalWorkspace();
  try {
    const remotePath = join(
      malformed.root,
      project004RemoteRuntimeContract.environmentFile,
    );
    const withoutPublicKey = serializeProject004RemoteRuntimeConfig(
      sampleRemoteConfig(),
    ).replace(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*\n/mu, "");
    writeFileSync(remotePath, withoutPublicKey, { mode: 0o600 });
    chmodSync(remotePath, 0o600);
    await assert.rejects(
      startAiTutorLocalRuntime({
        candidateRoot: malformed.root,
        inspectPort: () => [],
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === "REMOTE_RUNTIME_ENV_KEY_SET_INVALID",
    );
  } finally {
    rmSync(malformed.temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
});

test("missing Google key, disabled Tutor, invalid provider/model, and non-loopback host fail closed", async () => {
  for (const [source, code] of [
    [
      "PLAVE_AI_TUTOR_ENABLED=true\nPLAVE_AI_PROVIDER=GOOGLE\nGOOGLE_AI_MODEL=gemini-3.6-flash\n",
      "AI_TUTOR_LOCAL_GOOGLE_KEY_MISSING",
    ],
    [
      `PLAVE_AI_TUTOR_ENABLED=false\nPLAVE_AI_PROVIDER=GOOGLE\nGOOGLE_API_KEY=${syntheticGoogleKey}\nGOOGLE_AI_MODEL=gemini-3.6-flash\n`,
      "AI_TUTOR_LOCAL_TUTOR_DISABLED",
    ],
    [
      `PLAVE_AI_TUTOR_ENABLED=true\nPLAVE_AI_PROVIDER=OPENAI\nGOOGLE_API_KEY=${syntheticGoogleKey}\nGOOGLE_AI_MODEL=gemini-3.6-flash\n`,
      "AI_TUTOR_LOCAL_PROVIDER_INVALID",
    ],
    [
      `PLAVE_AI_TUTOR_ENABLED=true\nPLAVE_AI_PROVIDER=GOOGLE\nGOOGLE_API_KEY=${syntheticGoogleKey}\nGOOGLE_AI_MODEL=gemini-other\n`,
      "AI_TUTOR_LOCAL_MODEL_INVALID",
    ],
  ] as const) {
    const { temporaryRoot, root } = createFakeCanonicalWorkspace({
      tutorSource: source,
    });
    try {
      expectLocalFailure(
        () => loadAiTutorLocalConfiguration(root),
        code,
      );
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    await expectLocalFailureAsync(
      () =>
        startAiTutorLocalRuntime({
          candidateRoot: root,
          host: "0.0.0.0",
          inspectPort: () => [],
        }),
      "AI_TUTOR_LOCAL_NON_LOOPBACK_HOST_REJECTED",
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("wrong remote-development target fails the exact existing target guard", async () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    const invalid = serializeProject004RemoteRuntimeConfig(
      sampleRemoteConfig(),
    ).replace(
      "PLAVE_PROJECT004_REMOTE_TARGET_NAME=plave-project004-dev-clean",
      "PLAVE_PROJECT004_REMOTE_TARGET_NAME=plave-project004-production",
    );
    const remotePath = join(
      root,
      project004RemoteRuntimeContract.environmentFile,
    );
    writeFileSync(remotePath, invalid, { mode: 0o600 });
    chmodSync(remotePath, 0o600);
    await assert.rejects(
      startAiTutorLocalRuntime({
        candidateRoot: root,
        inspectPort: () => [],
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === "REMOTE_RUNTIME_TARGET_REJECTED",
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("occupied port reports exact listener PID/command metadata and never kills or spawns", async () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  let spawned = false;
  const listener = {
    pid: 98_765,
    command: "unrelated-node-server",
    endpoint: "127.0.0.1:3001",
  };
  try {
    await assert.rejects(
      startAiTutorLocalRuntime({
        candidateRoot: root,
        inspectPort: () => [listener],
        spawnChild: ((..._args: Parameters<typeof spawn>) => {
          spawned = true;
          return spawn(..._args);
        }) as typeof spawn,
      }),
      (error: unknown) => {
        assert.ok(error instanceof AiTutorLocalRuntimeFailure);
        assert.equal(error.code, "AI_TUTOR_LOCAL_PORT_OCCUPIED");
        assert.deepEqual(error.listeners, [listener]);
        return true;
      },
    );
    assert.equal(spawned, false);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

async function waitForOutputLine(child: ChildProcess) {
  return new Promise<number>((resolvePid, rejectPid) => {
    let output = "";
    const timeout = setTimeout(
      () => rejectPid(new Error("PROCESS_TREE_FIXTURE_TIMEOUT")),
      5_000,
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      const match = output.match(/GRANDCHILD_PID=(\d+)/u);
      if (!match) return;
      clearTimeout(timeout);
      resolvePid(Number(match[1]));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPid(error);
    });
  });
}

async function waitForPidExit(pid: number, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processAlive(pid)) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  return !processAlive(pid);
}

test("Ctrl+C terminates the detached Next-style process group including descendants", async () => {
  if (process.platform === "win32") return;
  const leader = spawn(
    process.execPath,
    [
      "-e",
      [
        'const { spawn } = require("node:child_process");',
        'const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });',
        'process.stdout.write(`GRANDCHILD_PID=${child.pid}\\n`);',
        "setInterval(() => {}, 1000);",
      ].join(" "),
    ],
    {
      detached: true,
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  assert.ok(leader.pid);
  const signalSource = new EventEmitter();
  let grandchildPid = 0;
  try {
    grandchildPid = await waitForOutputLine(leader);
    assert.equal(processAlive(grandchildPid), true);
    const completion = waitForAiTutorLocalChild(leader, {
      signalSource: signalSource as never,
      terminationGraceMs: 500,
    });
    signalSource.emit("SIGINT");
    assert.equal(await completion, 130);
    assert.equal(await waitForPidExit(grandchildPid), true);
    assert.equal(await waitForPidExit(leader.pid!), true);
  } finally {
    if (leader.pid && processAlive(leader.pid)) {
      try {
        process.kill(-leader.pid, "SIGKILL");
      } catch {
        // Already stopped.
      }
    }
    if (grandchildPid && processAlive(grandchildPid)) {
      try {
        process.kill(grandchildPid, "SIGKILL");
      } catch {
        // Already stopped.
      }
    }
  }
});

test("Tutor page and stream retain authenticated Student-only role authorization", () => {
  const page = readFileSync(
    join(workspaceRoot, "app/tutor/page.tsx"),
    "utf8",
  );
  const route = readFileSync(
    join(workspaceRoot, "app/api/tutor/stream/route.ts"),
    "utf8",
  );
  const access = readFileSync(
    join(workspaceRoot, "lib/practice/server.ts"),
    "utf8",
  );
  assert.match(page, /getStudentLearningContext\(\)/u);
  assert.match(page, /redirect\("\/login"\)/u);
  assert.match(route, /getStudentLearningContext\(\{/u);
  assert.match(route, /AI_AUTH_REQUIRED/u);
  assert.match(route, /AI_STUDENT_ONLY/u);
  assert.match(access, /profile\.role !== "STUDENT"/u);
  assert.match(access, /reason: "ACCESS_DENIED"/u);
});
