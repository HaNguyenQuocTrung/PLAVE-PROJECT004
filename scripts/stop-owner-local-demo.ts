import {
  readOwnerLocalManagedState,
} from "./owner-local-demo-support.ts";

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
      // A stale PID fails closed; no unmanaged database state is changed.
      managedPid = null;
    }
  }
}

if (managedPid === null) {
  throw new Error("Managed Owner local demo is not running.");
}

for (let attempt = 0; attempt < 120; attempt += 1) {
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
    "Managed demo process did not stop; local resources were not changed again.",
  );
}

process.stdout.write("OWNER_LOCAL_DEMO_STOPPED\n");
process.stdout.write("OWNER_LOCAL_ACCEPTANCE_DATA=REMOVED\n");
