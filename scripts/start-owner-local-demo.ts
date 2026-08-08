import {
  spawn,
  spawnSync,
  type ChildProcess,
} from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assertOwnerLocalDatabasePreflight,
  assertOwnerLocalDemoPreflight,
  buildOwnerLocalChildEnvironment,
  clearOwnerLocalGenerationSigning,
  configureOwnerLocalGenerationSigning,
  ensureOwnerLocalOnDemandSchema,
  loadOwnerLocalSupabase,
  materializeOwnerLocalCurriculum,
  ownerLocalAppOrigin,
  ownerLocalAppPort,
  readOwnerLocalManagedState,
  removeOwnerLocalManagedState,
  runOwnerLocalOperation,
  setOwnerLocalDemoFlags,
  startOwnerLocalSupabase,
  stopOwnerLocalSupabase,
  withOwnerLocalManagedState,
} from "./owner-local-demo-support.ts";
import {
  assertProject004Workspace,
} from "./project004-identity.ts";

const activationOperation =
  "supabase/operations/activate_0038_universal_curriculum_owner_local_demo.sql";
const deactivationOperation =
  "supabase/operations/deactivate_0038_universal_curriculum_local.sql";

const projectRoot = assertProject004Workspace();
let runtimeParent: string | null = null;
let runtimeRoot = projectRoot;
const existingState = readOwnerLocalManagedState();
if (existingState.present && existingState.managerPid) {
  if (
    Number.isInteger(existingState.managerPid) &&
    existingState.managerPid > 0
  ) {
    try {
      process.kill(existingState.managerPid, 0);
      throw new Error("Owner local demo is already running.");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Owner local demo is already running."
      ) {
        throw error;
      }
    }
  }
  removeOwnerLocalManagedState();
}

let config: ReturnType<typeof loadOwnerLocalSupabase> | null = null;
let child: ChildProcess | null = null;
let activated = false;
let stopRequested = false;
let generationSigningConfigured = false;
let supabaseStarted = false;

try {
  startOwnerLocalSupabase();
  supabaseStarted = true;
  config = loadOwnerLocalSupabase();
  materializeOwnerLocalCurriculum(config);
  ensureOwnerLocalOnDemandSchema(config);
  const generationSigningKey = randomBytes(32).toString("hex");
  configureOwnerLocalGenerationSigning(config, generationSigningKey);
  generationSigningConfigured = true;
  setOwnerLocalDemoFlags(true);
  runOwnerLocalOperation(config, activationOperation);
  activated = true;
  await assertOwnerLocalDatabasePreflight(config, true);

  runtimeParent = mkdtempSync(
    join(tmpdir(), "plave-project004-owner-local-runtime-"),
  );
  runtimeRoot = join(runtimeParent, "PLAVE-PROJECT004");
  mkdirSync(runtimeRoot, { mode: 0o700 });
  const copied = spawnSync(
    "rsync",
    [
      "-a",
      `--link-dest=${projectRoot}`,
      "--exclude=.git",
      "--exclude=.env*",
      "--exclude=.next*",
      "--exclude=supabase/.temp",
      `${projectRoot}/`,
      `${runtimeRoot}/`,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (copied.status !== 0) {
    throw new Error("Owner local sanitized runtime workspace failed.");
  }

  child = spawn(
    "npm",
    [
      "run",
      "dev",
      "--",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(ownerLocalAppPort),
    ],
    {
      cwd: runtimeRoot,
      stdio: "inherit",
      env: buildOwnerLocalChildEnvironment(
        config,
        generationSigningKey,
      ),
    },
  );
  if (!child.pid) {
    throw new Error("Owner local demo child process did not start.");
  }
  await withOwnerLocalManagedState(
    process.pid,
    child.pid,
    async () => {
      await assertOwnerLocalDemoPreflight(config);

      process.stdout.write("NOT_READY_FOR_OWNER_BROWSER_DEMO\n");
      process.stdout.write("OWNER_LOCAL_DEMO_RUNTIME_DIAGNOSTIC_MODE\n");
      process.stdout.write(`APP_URL=${ownerLocalAppOrigin}\n`);
      process.stdout.write("RELEASE=ACTIVE\n");
      process.stdout.write("RUNTIME_FLAG=true\n");
      process.stdout.write("NEXT_DIST_DIR=.next-owner-local-project004\n");
      process.stdout.write(
        "Press Ctrl+C or run npm run owner-local-demo:stop.\n",
      );

      const stopChild = () => {
        stopRequested = true;
        if (child && child.exitCode === null) child.kill("SIGTERM");
      };
      process.once("SIGINT", stopChild);
      process.once("SIGTERM", stopChild);

      const exitCode = await new Promise<number>((resolve) => {
        child?.once("exit", (code) =>
          resolve(stopRequested ? 0 : (code ?? 1)),
        );
        child?.once("error", () => resolve(1));
      });
      process.exitCode = exitCode;
    },
  );
} finally {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  removeOwnerLocalManagedState();
  if (generationSigningConfigured) {
    if (config) clearOwnerLocalGenerationSigning(config);
  }
  if (activated && config) {
    setOwnerLocalDemoFlags(false);
    runOwnerLocalOperation(config, deactivationOperation);
    await assertOwnerLocalDatabasePreflight(config, false);
    process.stdout.write("OWNER_LOCAL_DEMO_STOPPED_SAFELY\n");
  }
  if (supabaseStarted) {
    stopOwnerLocalSupabase();
    process.stdout.write("OWNER_LOCAL_SUPABASE_STOPPED_SAFELY\n");
  }
  if (runtimeParent) {
    rmSync(runtimeParent, { recursive: true, force: true });
    process.stdout.write("OWNER_LOCAL_RUNTIME_WORKSPACE_REMOVED\n");
  }
}
