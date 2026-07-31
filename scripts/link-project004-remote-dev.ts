import { executeGuardedLink } from "./project004-remote-dev-operations.ts";

try {
  executeGuardedLink();
  process.stdout.write("REMOTE_TARGET_GUARD=PASS\n");
  process.stdout.write("REMOTE_LINK=PASS\n");
} catch {
  process.stdout.write("REMOTE_TARGET_GUARD=FAIL\n");
  process.stdout.write("REMOTE_LINK=FAIL\n");
  process.exitCode = 1;
}
