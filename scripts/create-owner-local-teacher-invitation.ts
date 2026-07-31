import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadOwnerLocalSupabase,
  queryOwnerLocalDatabase,
} from "./owner-local-demo-support.ts";

const config = loadOwnerLocalSupabase();
const invitationCode = queryOwnerLocalDatabase(
  config,
  "select private.issue_teacher_invitation(now() + interval '24 hours');",
);
if (!/^PLV-TCH-[0-9A-F]{32}$/.test(invitationCode)) {
  throw new Error("Teacher invitation creation failed.");
}

const invitationPath = join(
  tmpdir(),
  "plave-project004-owner-teacher-invitation.txt",
);
writeFileSync(invitationPath, `${invitationCode}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
process.stdout.write("OWNER_LOCAL_TEACHER_INVITATION=CREATED\n");
process.stdout.write(`INVITATION_FILE=${invitationPath}\n`);
process.stdout.write("EXPIRES_IN=24_HOURS\n");
