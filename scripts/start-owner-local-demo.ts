import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";

import {
  assertOwnerLocalDatabasePreflight,
  assertOwnerLocalDemoPreflight,
  buildOwnerLocalChildEnvironment,
  clearOwnerLocalGenerationSigning,
  configureOwnerLocalGenerationSigning,
  ensureOwnerLocalOnDemandSchema,
  loadOwnerLocalSupabase,
  readOwnerLocalManagedState,
  removeOwnerLocalManagedState,
  runOwnerLocalOperation,
  setOwnerLocalDemoFlags,
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

const config = loadOwnerLocalSupabase();
let child: ChildProcess | null = null;
let activated = false;
let stopRequested = false;
let generationSigningConfigured = false;

try {
  ensureOwnerLocalOnDemandSchema(config);
  const generationSigningKey = randomBytes(32).toString("hex");
  configureOwnerLocalGenerationSigning(config, generationSigningKey);
  generationSigningConfigured = true;
  setOwnerLocalDemoFlags(true);
  runOwnerLocalOperation(config, activationOperation);
  activated = true;
  await assertOwnerLocalDatabasePreflight(config, true);

  child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1"],
    {
      cwd: projectRoot,
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
      process.stdout.write("APP_URL=http://127.0.0.1:3000\n");
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
    clearOwnerLocalGenerationSigning(config);
  }
  if (activated) {
    setOwnerLocalDemoFlags(false);
    runOwnerLocalOperation(config, deactivationOperation);
    await assertOwnerLocalDatabasePreflight(config, false);
    process.stdout.write("OWNER_LOCAL_DEMO_STOPPED_SAFELY\n");
  }
}
