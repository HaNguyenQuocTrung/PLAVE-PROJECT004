import {
  parseOperatorArguments,
  runTeacherInvitationOperator,
  TeacherInvitationOperatorFailure,
} from "./owner-teacher-invitation-operator.ts";
import {
  loadTrackedCanonicalMigrationInventory,
} from "./canonical-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

function fail(code: string): never {
  throw new TeacherInvitationOperatorFailure(code);
}

try {
  assertProject004Workspace();
  const parsed = parseOperatorArguments(process.argv.slice(2));
  if (parsed.command === "issue" && (!process.stdout.isTTY || !process.stdin.isTTY)) {
    fail("SECURE_TTY_REQUIRED");
  }
  const inventory = loadTrackedCanonicalMigrationInventory();
  if (!inventory.ok) fail("LOCAL_LEDGER_INVALID");
  const result = runTeacherInvitationOperator({
    ...parsed,
    ledger: {
      count: inventory.count,
      first: inventory.first,
      last: inventory.last,
    },
  });
  process.stdout.write("REMOTE_TARGET_GATE=PASS\n");
  if (result.command === "issue") {
    process.stdout.write("OWNER_TEACHER_INVITATION_ISSUE=PASS\n");
    process.stdout.write(`INVITATION_CODE=${result.invitationCode}\n`);
    process.stdout.write(`EXPIRES_IN_HOURS=${result.expiresHours}\n`);
    process.stdout.write("PLAINTEXT_PERSISTED=NO\n");
  } else if (result.command === "status") {
    process.stdout.write("OWNER_TEACHER_INVITATION_STATUS=PASS\n");
    process.stdout.write(`INVITATION_STATE=${result.state}\n`);
    process.stdout.write(`USABLE=${result.usable ? "YES" : "NO"}\n`);
    process.stdout.write(`EXPIRES_AT=${result.expiresAt ?? "NONE"}\n`);
    process.stdout.write("INVITATION_IDENTIFIERS_PRINTED=NO\n");
  } else {
    process.stdout.write("OWNER_TEACHER_INVITATION_REVOKE=PASS\n");
    process.stdout.write(`OUTCOME=${result.outcome}\n`);
    process.stdout.write("INVITATION_IDENTIFIERS_PRINTED=NO\n");
    if (result.outcome !== "REVOKED") process.exitCode = 2;
  }
} catch (error) {
  const code =
    error instanceof TeacherInvitationOperatorFailure
      ? error.code
      : "OPERATOR_FAILED";
  process.stderr.write(
    `OWNER_TEACHER_INVITATION_OPERATOR=FAIL\nROOT_FAILURE_CODE=${code}\n`,
  );
  process.exitCode = 1;
}
