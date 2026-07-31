import {
  assertOwnerLocalDatabasePreflight,
  loadOwnerLocalSupabase,
  readOwnerLocalManagedState,
  removeOwnerLocalManagedState,
  runOwnerLocalOperation,
  setOwnerLocalDemoFlags,
} from "./owner-local-demo-support.ts";

const config = loadOwnerLocalSupabase();
let managedPid: number | null = null;

const managedState = readOwnerLocalManagedState();
if (managedState.managerPid) {
  if (
    Number.isInteger(managedState.managerPid) &&
    managedState.managerPid > 0
  ) {
    managedPid = managedState.managerPid;
    try {
      process.kill(managedState.managerPid, "SIGTERM");
    } catch {
      // A stale PID is safe to ignore; deactivation below is authoritative.
      managedPid = null;
    }
  }
}

if (managedPid !== null) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      process.kill(managedPid, 0);
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch {
      managedPid = null;
      break;
    }
  }
  if (managedPid !== null) {
    throw new Error(
      "Managed demo process did not stop; release was not changed.",
    );
  }
}

setOwnerLocalDemoFlags(false);
runOwnerLocalOperation(
  config,
  "supabase/operations/deactivate_0038_universal_curriculum_local.sql",
);
await assertOwnerLocalDatabasePreflight(config, false);
removeOwnerLocalManagedState();
process.stdout.write("OWNER_LOCAL_DEMO_STOPPED\n");
process.stdout.write("OWNER_HISTORY=PRESERVED\n");
