import { resolve } from "node:path";

import { runManagedChild } from "./project004-managed-child-process.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const result = await runManagedChild({
  executable: process.execPath,
  args: [
    "-e",
    "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)",
  ],
  cwd: resolve(root),
  environment: {
    PATH: process.env.PATH,
    NODE_ENV: "test",
  },
  timeoutMs: 300,
  terminationGraceMs: 60,
  killConfirmationMs: 500,
  stage: "SERVICE_BOOTSTRAP",
});

const pass =
  result.timedOut &&
  result.termSent &&
  result.killSent &&
  result.childExited;
process.stdout.write(
  `MANAGED_CHILD_TIMEOUT=${pass ? "PASS" : "FAIL"}\n` +
    `PROCESS_GROUP_TERMINATION=${pass ? "PASS" : "FAIL"}\n` +
    `CHILD_EXIT_CONFIRMED=${result.childExited ? "PASS" : "FAIL"}\n` +
    "REMOTE_ACCESS_PERFORMED=NO\n" +
    "REMOTE_MUTATION_PERFORMED=NO\n",
);
if (!pass) process.exitCode = 1;
