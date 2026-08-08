import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadOwnerLocalSupabase,
  queryOwnerLocalDatabase,
} from "./owner-local-demo-support.ts";

const legacyInvitationPath = join(
  tmpdir(),
  "plave-project004-owner-teacher-invitation.txt",
);

function printUsage() {
  process.stdout.write(
    [
      "Owner-local Teacher invitation commands:",
      "  npm run owner-local-demo:teacher-invite -- --expires-hours 24",
      "  npm run owner-local-demo:teacher-invite -- --status",
      "  npm run owner-local-demo:teacher-invite -- --revoke-unused",
      "",
    ].join("\n"),
  );
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  printUsage();
  process.exit(0);
}

const config = loadOwnerLocalSupabase();
if (existsSync(legacyInvitationPath)) {
  rmSync(legacyInvitationPath, { force: true });
}

if (args.length === 1 && args[0] === "--status") {
  const statusOutput = queryOwnerLocalDatabase(
    config,
    `
      with effective as (
        select case
          when invitation.status = 'AVAILABLE'
            and invitation.expires_at <= now()
          then 'EXPIRED'
          else invitation.status
        end as status,
        invitation.expires_at
        from public.teacher_invitations as invitation
      )
      select
        effective.status,
        count(*),
        to_char(
          min(effective.expires_at) at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        )
      from effective
      group by effective.status
      order by effective.status;
    `,
  );
  const rows = statusOutput ? statusOutput.split("\n") : [];
  let invitationCount = 0;
  const safeRows: string[] = [];
  for (const row of rows) {
    const [status, countText, expiresAt] = row.split("\t");
    const count = Number(countText);
    if (
      !["AVAILABLE", "CLAIMED", "REVOKED", "EXPIRED"].includes(
        status ?? "",
      ) ||
      !Number.isInteger(count) ||
      count < 1 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(
        expiresAt ?? "",
      )
    ) {
      throw new Error("Teacher invitation status inspection failed.");
    }
    invitationCount += count;
    safeRows.push(
      `STATUS=${status} COUNT=${count} EARLIEST_EXPIRES_AT=${expiresAt}\n`,
    );
  }
  process.stdout.write(`INVITATION_COUNT=${invitationCount}\n`);
  for (const row of safeRows) process.stdout.write(row);
  process.stdout.write("PLAINTEXT_CODES_PRINTED=NO\n");
  process.exit(0);
}

if (args.length === 1 && args[0] === "--revoke-unused") {
  const revoked = queryOwnerLocalDatabase(
    config,
    `
      do $revoke$
      declare
        v_invitation_id uuid;
        v_count integer;
      begin
        select
          count(*),
          (array_agg(invitation.id order by invitation.created_at))[1]
        into v_count, v_invitation_id
        from public.teacher_invitations as invitation
        where invitation.status = 'AVAILABLE'
          and invitation.expires_at > now();
        if v_count <> 1 or v_invitation_id is null then
          raise exception 'Expected exactly one unused invitation';
        end if;
        if not private.revoke_teacher_invitation(v_invitation_id) then
          raise exception 'Teacher invitation revocation failed';
        end if;
      end;
      $revoke$;
      select true;
    `,
  );
  if (revoked !== "t") {
    throw new Error("Teacher invitation revocation failed.");
  }
  process.stdout.write("OWNER_LOCAL_TEACHER_INVITATION=REVOKED\n");
  process.stdout.write("PLAINTEXT_CODES_PRINTED=NO\n");
  process.exit(0);
}

let expiresHours = 24;
if (args.length > 0) {
  if (args.length !== 2 || args[0] !== "--expires-hours") {
    printUsage();
    throw new Error("Teacher invitation arguments are invalid.");
  }
  expiresHours = Number(args[1]);
}
if (
  !Number.isInteger(expiresHours) ||
  expiresHours < 1 ||
  expiresHours > 168
) {
  throw new Error("Teacher invitation expiry must be 1 to 168 hours.");
}

const invitationCode = queryOwnerLocalDatabase(
  config,
  `
    select private.issue_teacher_invitation(
      now() + pg_catalog.make_interval(hours => ${expiresHours})
    );
  `,
);
if (!/^PLV-TCH-[0-9A-F]{32}$/.test(invitationCode)) {
  throw new Error("Teacher invitation creation failed.");
}
const invitationCountText = queryOwnerLocalDatabase(
  config,
  "select count(*) from public.teacher_invitations;",
);
const invitationCount = Number(invitationCountText);
if (
  !Number.isInteger(invitationCount) ||
  invitationCount < 1
) {
  throw new Error("Teacher invitation creation failed.");
}

process.stdout.write("OWNER_LOCAL_TEACHER_INVITATION=CREATED\n");
process.stdout.write(`INVITATION_CODE=${invitationCode}\n`);
process.stdout.write(`EXPIRES_IN_HOURS=${expiresHours}\n`);
process.stdout.write(`INVITATION_COUNT=${invitationCount}\n`);
process.stdout.write("PLAINTEXT_PERSISTED=NO\n");
