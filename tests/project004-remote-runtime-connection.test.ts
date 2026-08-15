import assert from "node:assert/strict";
import { type ChildProcess, type SpawnOptions, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { configureProject004RemoteRuntime } from "../scripts/configure-project004-remote-runtime.ts";
import {
  assertProject004RemoteRuntimeConfig,
  buildProject004RemoteRuntimeChildEnvironment,
  createProject004RemoteRuntimeConfig,
  parseProject004RemoteRuntimeConfig,
  project004RemoteRuntimeContract,
  Project004RemoteRuntimeFailure,
  serializeProject004RemoteRuntimeConfig,
  setProject004RemoteRuntimeUniversalFlag,
  writeProject004RemoteRuntimeConfigFile,
} from "../scripts/project004-remote-runtime-connection.ts";
import { startProject004RemoteRuntime } from "../scripts/start-project004-remote-runtime.ts";

const workspaceRoot = resolve(
  import.meta.dirname,
  "..",
);
const sampleRef = "abcdefghijklmnopqrst";
const samplePublicUrl = `https://${sampleRef}.supabase.co`;
const samplePublishableKey = `sb_publishable_${"x".repeat(24)}`;

function sampleConfig() {
  return createProject004RemoteRuntimeConfig({
    projectRef: sampleRef,
    publicUrl: samplePublicUrl,
    publishableKey: samplePublishableKey,
  });
}

function expectFailure(
  action: () => unknown,
  expectedCode: string,
) {
  assert.throws(action, (error: unknown) => {
    return (
      error instanceof Project004RemoteRuntimeFailure &&
      error.code === expectedCode
    );
  });
}

function createFakeCanonicalWorkspace() {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "project004-remote-runtime-"),
  );
  const root = join(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(join(root, "supabase"), { recursive: true });
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
  return { temporaryRoot, root };
}

test("remote runtime config enables fixed universal curriculum while every adaptive and pilot gate remains disabled", () => {
  const serialized =
    serializeProject004RemoteRuntimeConfig(sampleConfig());
  const parsed =
    parseProject004RemoteRuntimeConfig(serialized);

  assert.equal(
    parsed.targetName,
    "plave-project004-dev-clean",
  );
  assert.equal(parsed.publicUrl, samplePublicUrl);
  assert.equal(parsed.curriculumRuntimeEnabled, "true");
  assert.equal(parsed.gradesTwoToNineReleaseMode, "PUBLIC");
  assert.equal(parsed.onDemandGenerationEnabled, "false");
  assert.equal(parsed.generatedPracticeRuntimeEnabled, "false");
  assert.equal(parsed.generatedPracticeMode, "OFF");
  assert.equal(parsed.grade2NumbersTo1000Enabled, "false");
  assert.equal(parsed.adaptivePracticeRuntimeEnabled, "false");
  assert.equal(parsed.controlledPilotEnabled, "false");
  assert.equal(parsed.retentionRuntimeEnabled, "false");
  assert.equal(parsed.adaptivePilotUserIds, "");
});

test("runtime target guard rejects retired, frozen, and production-like targets", () => {
  const config = sampleConfig();
  expectFailure(
    () =>
      assertProject004RemoteRuntimeConfig({
        ...config,
        targetName: "plave-project004-dev",
      }),
    "REMOTE_RUNTIME_TARGET_REJECTED",
  );
  expectFailure(
    () =>
      assertProject004RemoteRuntimeConfig({
        ...config,
        targetName: `plave-project${"003"}-dev`,
      }),
    "REMOTE_RUNTIME_TARGET_REJECTED",
  );
  expectFailure(
    () =>
      assertProject004RemoteRuntimeConfig({
        ...config,
        targetName: "plave-project004-production",
      }),
    "REMOTE_RUNTIME_TARGET_REJECTED",
  );
});

test("runtime target guard binds the public URL to the prompted project ref", () => {
  expectFailure(
    () =>
      createProject004RemoteRuntimeConfig({
        projectRef: sampleRef,
        publicUrl:
          "https://zyxwvutsrqponmlkjihg.supabase.co",
        publishableKey: samplePublishableKey,
      }),
    "REMOTE_RUNTIME_PUBLIC_URL_TARGET_MISMATCH",
  );
});

test("runtime env rejects service-role, direct database, and unexpected keys", () => {
  const source =
    serializeProject004RemoteRuntimeConfig(sampleConfig());
  for (const line of [
    "SUPABASE_SERVICE_ROLE_KEY=forbidden",
    "DATABASE_URL=forbidden",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=forbidden",
  ]) {
    expectFailure(
      () => parseProject004RemoteRuntimeConfig(`${source}${line}\n`),
      "REMOTE_RUNTIME_ENV_KEY_SET_INVALID",
    );
  }
});

test("child environment replaces local Supabase state and does not inherit admin/database credentials", () => {
  const child =
    buildProject004RemoteRuntimeChildEnvironment(
      sampleConfig(),
      {
        PATH: "/safe/path",
        NEXT_PUBLIC_SUPABASE_URL:
          "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "local-public-key",
        SUPABASE_SERVICE_ROLE_KEY: "server-secret",
        DATABASE_URL: "database-secret",
        PLAVE_LOCAL_DATABASE_URL: "local-database-secret",
        SUPABASE_DB_PASSWORD: "database-password",
        PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
        PLAVE_ADAPTIVE_PILOT_USER_IDS:
          "00000000-0000-0000-0000-000000000000",
      },
    );

  assert.equal(child.NEXT_PUBLIC_SUPABASE_URL, samplePublicUrl);
  assert.equal(
    child.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    samplePublishableKey,
  );
  assert.equal(child.SUPABASE_SERVICE_ROLE_KEY, "");
  assert.equal(child.DATABASE_URL, "");
  assert.equal(child.PLAVE_LOCAL_DATABASE_URL, "");
  assert.equal(child.SUPABASE_DB_PASSWORD, "");
  assert.equal(child.SUPABASE_ACCESS_TOKEN, "");
  assert.equal(child.PLAVE_CURRICULUM_RUNTIME_ENABLED, "true");
  assert.equal(child.PLAVE_GRADES_2_9_RELEASE_MODE, "PUBLIC");
  assert.equal(
    child.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED,
    "false",
  );
  assert.equal(child.PLAVE_GENERATED_PRACTICE_MODE, "OFF");
  assert.equal(child.PLAVE_ADAPTIVE_PILOT_USER_IDS, "");
  assert.equal(
    child.PLAVE_PROJECT004_REMOTE_PROJECT_REF,
    "",
  );
  assert.equal(child.__NEXT_PROCESSED_ENV, "true");
});

test("secret config writer uses mode 0600 and preserves .env.local", () => {
  const { temporaryRoot, root } =
    createFakeCanonicalWorkspace();
  try {
    const localValue = "LOCAL_OWNER_STATE=preserve\n";
    writeFileSync(join(root, ".env.local"), localValue);
    const path = writeProject004RemoteRuntimeConfigFile(
      sampleConfig(),
      root,
    );

    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(
      readFileSync(join(root, ".env.local"), "utf8"),
      localValue,
    );
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      /SERVICE_ROLE|DATABASE_URL|DB_PASSWORD/u,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("deactivation can fail closed by disabling only the universal runtime flag in the isolated 0600 profile", () => {
  const { temporaryRoot, root } =
    createFakeCanonicalWorkspace();
  try {
    writeProject004RemoteRuntimeConfigFile(
      sampleConfig(),
      root,
    );
    setProject004RemoteRuntimeUniversalFlag(false, root);
    const source = readFileSync(
      join(
        root,
        project004RemoteRuntimeContract.environmentFile,
      ),
      "utf8",
    );
    const parsed =
      parseProject004RemoteRuntimeConfig(source);
    assert.equal(
      parsed.curriculumRuntimeEnabled,
      "false",
    );
    assert.equal(parsed.gradesTwoToNineReleaseMode, "HIDDEN");
    assert.equal(
      parsed.onDemandGenerationEnabled,
      "false",
    );
    assert.equal(
      parsed.controlledPilotEnabled,
      "false",
    );
    assert.equal(
      statSync(
        join(
          root,
          project004RemoteRuntimeContract.environmentFile,
        ),
      ).mode & 0o777,
      0o600,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("config command receives all values through masked prompt and never renders them", () => {
  const { temporaryRoot, root } =
    createFakeCanonicalWorkspace();
  const values = [
    "plave-project004-dev-clean",
    sampleRef,
    samplePublicUrl,
    samplePublishableKey,
  ];
  try {
    const result = configureProject004RemoteRuntime({
      candidateRoot: root,
      prompt: () => ({
        ok: true,
        value: values.shift() ?? "",
      }),
    });
    assert.equal(result.exitCode, 0);
    assert.match(result.output, /REMOTE_RUNTIME_ENV_FILE=CREATED_0600/u);
    assert.doesNotMatch(result.output, new RegExp(sampleRef, "u"));
    assert.doesNotMatch(
      result.output,
      new RegExp(samplePublishableKey, "u"),
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("cancelled secure prompt writes no runtime secret file", () => {
  const { temporaryRoot, root } =
    createFakeCanonicalWorkspace();
  try {
    const result = configureProject004RemoteRuntime({
      candidateRoot: root,
      prompt: () => ({
        ok: false,
        code: "SECURE_PROMPT_CANCELLED",
      }),
    });
    assert.equal(result.exitCode, 1);
    assert.match(
      result.output,
      /ROOT_FAILURE_CODE=SECURE_PROMPT_CANCELLED/u,
    );
    assert.equal(
      statSync(root).isDirectory(),
      true,
    );
    assert.throws(() =>
      statSync(
        join(
          root,
          project004RemoteRuntimeContract.environmentFile,
        ),
      ),
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("application runtime has exactly two Supabase public env consumers and no admin/database consumer", () => {
  const runtimeFiles = [
    "lib/supabase/env.ts",
    "lib/supabase/client.ts",
    "lib/supabase/server.ts",
    "lib/supabase/proxy.ts",
  ].map((file) =>
    readFileSync(resolve(workspaceRoot, file), "utf8"),
  );
  const source = runtimeFiles.join("\n");
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/u);
  assert.match(
    source,
    /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/u,
  );
  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|PLAVE_LOCAL_DATABASE_URL/u,
  );
  assert.doesNotMatch(
    readFileSync(
      resolve(workspaceRoot, "lib/supabase/client.ts"),
      "utf8",
    ),
    /SERVICE_ROLE|DATABASE_URL/u,
  );
});

test("runtime environment file and cache are ignored while commands remain canonical", () => {
  const gitignore = readFileSync(
    resolve(workspaceRoot, ".gitignore"),
    "utf8",
  );
  const packageJson = JSON.parse(
    readFileSync(
      resolve(workspaceRoot, "package.json"),
      "utf8",
    ),
  ) as { scripts: Record<string, string> };
  assert.match(gitignore, /^\.env\*$/mu);
  assert.match(
    gitignore,
    /^\/\.next-remote-dev-project004$/mu,
  );
  assert.match(
    packageJson.scripts["remote-dev:runtime-configure"] ?? "",
    /configure-project004-remote-runtime[.]ts/u,
  );
  assert.match(
    packageJson.scripts["remote-dev:runtime-start"] ?? "",
    /start-project004-remote-runtime[.]ts/u,
  );
});

test("Node 22 executable smoke uses the production start entrypoint without runtime or remote access", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/start-project004-remote-runtime.ts",
      "--smoke",
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env },
      timeout: 10_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /REMOTE_RUNTIME_CONFIG_CONTRACT=PASS/u,
  );
  assert.match(
    result.stdout,
    /REMOTE_RUNTIME_SECRET_BOUNDARY=PASS/u,
  );
  assert.match(
    result.stdout,
    /REMOTE_ACCESS_PERFORMED=NO/u,
  );
  assert.match(
    result.stdout,
    /REMOTE_MUTATION_PERFORMED=NO/u,
  );
  assert.doesNotMatch(result.stdout, /supabase[.]co|sb_publishable_/u);
});

test("guarded start uses loopback, secret-free argv, and the isolated child environment", async () => {
  const { temporaryRoot, root } =
    createFakeCanonicalWorkspace();
  let capturedArgs: readonly string[] = [];
  let capturedOptions: SpawnOptions | undefined;
  let prepared = false;
  try {
    writeProject004RemoteRuntimeConfigFile(
      sampleConfig(),
      root,
    );
    const fakeSpawn = ((
      _command: string,
      args: readonly string[],
      options: SpawnOptions,
    ) => {
      capturedArgs = args;
      capturedOptions = options;
      const child = new EventEmitter() as ChildProcess;
      Object.defineProperty(child, "pid", {
        value: 4242,
        configurable: true,
      });
      Object.defineProperty(child, "exitCode", {
        value: null,
        configurable: true,
      });
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    }) as typeof import("node:child_process").spawn;

    const exitCode = await startProject004RemoteRuntime({
      candidateRoot: root,
      environment: {
        PATH: "/safe/path",
        DATABASE_URL: "must-not-pass",
        SUPABASE_SERVICE_ROLE_KEY: "must-not-pass",
      },
      spawnChild: fakeSpawn,
      onPrepared: () => {
        prepared = true;
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(prepared, true);
    assert.deepEqual(capturedArgs.slice(-4), [
      "--hostname",
      "127.0.0.1",
      "--port",
      "3001",
    ]);
    assert.doesNotMatch(
      capturedArgs.join(" "),
      /supabase[.]co|sb_publishable_|DATABASE_URL/u,
    );
    const childEnvironment = capturedOptions?.env;
    assert.equal(
      childEnvironment?.NEXT_PUBLIC_SUPABASE_URL,
      samplePublicUrl,
    );
    assert.equal(
      childEnvironment?.SUPABASE_SERVICE_ROLE_KEY,
      "",
    );
    assert.equal(childEnvironment?.DATABASE_URL, "");
    assert.equal(
      childEnvironment?.PLAVE_CURRICULUM_RUNTIME_ENABLED,
      "true",
    );
    assert.equal(
      childEnvironment?.PLAVE_GRADES_2_9_RELEASE_MODE,
      "PUBLIC",
    );
    assert.equal(
      childEnvironment?.PLAVE_CONTROLLED_PILOT_ENABLED,
      "false",
    );
    assert.equal(
      childEnvironment?.__NEXT_PROCESSED_ENV,
      "true",
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("remote runtime restart removes only the exact stale PROJECT004 cache before spawning", async () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    writeProject004RemoteRuntimeConfigFile(sampleConfig(), root);
    const cache = join(root, project004RemoteRuntimeContract.cacheDirectory);
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(cache, "stale-runtime-marker"), "stale");
    const fakeSpawn = ((
      _command: string,
      _args: readonly string[],
      _options: SpawnOptions,
    ) => {
      void _command;
      void _args;
      void _options;
      const child = new EventEmitter() as ChildProcess;
      Object.defineProperty(child, "pid", { value: 4243, configurable: true });
      Object.defineProperty(child, "exitCode", { value: null, configurable: true });
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    }) as typeof import("node:child_process").spawn;
    await startProject004RemoteRuntime({
      candidateRoot: root,
      spawnChild: fakeSpawn,
    });
    assert.equal(existsSync(cache), false);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
