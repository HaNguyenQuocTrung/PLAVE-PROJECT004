import { executeGuardedDryRun } from "./project004-remote-dev-operations.ts";

try {
  const result = executeGuardedDryRun();
  process.stdout.write("REMOTE_TARGET_GUARD=PASS\n");
  process.stdout.write("REMOTE_EMPTY=PASS\n");
  process.stdout.write("LINKED_TARGET=PASS\n");
  process.stdout.write("DRY_RUN_SEED_EXCLUDED=PASS\n");
  process.stdout.write("DRY_RUN_MIGRATION_ORDER=PASS\n");
  process.stdout.write(
    `DRY_RUN_MIGRATIONS_COUNT=${result.migrationCount}\n`,
  );
  process.stdout.write("PROJECT004_REMOTE_DEV_DRY_RUN=PASS\n");
} catch {
  process.stdout.write("PROJECT004_REMOTE_DEV_DRY_RUN=FAIL\n");
  process.exitCode = 1;
}
