import { randomBytes, randomUUID } from "node:crypto";

import { createServerClient } from "@supabase/ssr";

import {
  loadOwnerLocalSupabase,
  ownerLocalAppOrigin,
  queryOwnerLocalDatabase,
} from "./owner-local-demo-support.ts";
import { loadTrackedCanonicalMigrationInventory } from "./canonical-migration-inventory.ts";
import { buildTeacherInvitationGateSql } from "./owner-teacher-invitation-operator.ts";

type CookieJar = Map<string, string>;

function fail(code: string): never {
  throw new Error(code);
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

const issuerOutput = await readStdin();
const codes = issuerOutput.match(/PLV-TCH-[0-9A-F]{32}/gu) ?? [];
if (codes.length !== 1) fail("LOCAL_INVITATION_PIPE_INVALID");
const claimedCode = codes[0];
const config = loadOwnerLocalSupabase();
const inventory = loadTrackedCanonicalMigrationInventory();
if (!inventory.ok) fail("LOCAL_MIGRATION_INVENTORY_INVALID");
const contractGate = queryOwnerLocalDatabase(
  config,
  buildTeacherInvitationGateSql({
    count: inventory.count,
    first: inventory.first,
    last: inventory.last,
  }),
);
if (
  !contractGate
    .split(/\r?\n/u)
    .includes("PLAVE_TEACHER_INVITATION_GATE_V1|PASS")
) {
  fail("LOCAL_OPERATOR_CONTRACT_GATE_FAILED");
}

function authenticatedClient(cookies: CookieJar) {
  return createServerClient(config.apiUrl, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll: () =>
        [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const item of items) {
          if (item.value) cookies.set(item.name, item.value);
          else cookies.delete(item.name);
        }
      },
    },
  });
}

async function createTeacher(label: string) {
  const cookies: CookieJar = new Map();
  const client = authenticatedClient(cookies);
  const registration = await client.auth.signUp({
    email: `teacher-proof-${label}-${randomUUID()}@plave.local.invalid`,
    password: `P4!${randomBytes(18).toString("base64url")}`,
    options: { data: { role: "TEACHER" } },
  });
  if (
    registration.error ||
    !registration.data.user ||
    !registration.data.session
  ) {
    fail("LOCAL_TEACHER_SIGNUP_FAILED");
  }
  return { cookies, userId: registration.data.user.id };
}

function cookieHeader(cookies: CookieJar) {
  return [...cookies]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function activate(cookies: CookieJar, invitationCode: string) {
  const response = await fetch(
    `${ownerLocalAppOrigin}/api/teacher/activate`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader(cookies),
        Origin: ownerLocalAppOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: "Giáo viên kiểm thử",
        invitationCode,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    },
  );
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, payload };
}

function responseOk(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).ok === true,
  );
}

function responseUnavailable(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const error = (value as Record<string, unknown>).error;
  return Boolean(
    error &&
      typeof error === "object" &&
      !Array.isArray(error) &&
      (error as Record<string, unknown>).code ===
        "INVITATION_UNAVAILABLE",
  );
}

const primary = await createTeacher("primary");
const onboardingPage = await fetch(`${ownerLocalAppOrigin}/teacher/onboarding`, {
  headers: { Cookie: cookieHeader(primary.cookies) },
  redirect: "manual",
  signal: AbortSignal.timeout(12_000),
});
if (onboardingPage.status !== 200) {
  fail("LOCAL_TEACHER_ONBOARDING_PAGE_FAILED");
}
const activated = await activate(primary.cookies, claimedCode);
if (activated.status !== 200 || !responseOk(activated.payload)) {
  fail("LOCAL_TEACHER_ACTIVATION_FAILED");
}

const persisted = queryOwnerLocalDatabase(
  config,
  `
    select
      (select count(*) from public.teacher_invitations invitation
       where invitation.code_hash = extensions.digest(${sqlText(claimedCode)}, 'sha256')
         and invitation.status = 'CLAIMED'
         and invitation.teacher_user_id = ${sqlText(primary.userId)}::uuid),
      (select count(*) from public.teacher_profiles teacher
       where teacher.user_id = ${sqlText(primary.userId)}::uuid
         and teacher.activation_status = 'ACTIVE'),
      (select count(*) from public.profiles profile
       where profile.user_id = ${sqlText(primary.userId)}::uuid
         and profile.role = 'TEACHER'
         and profile.onboarding_completed),
      (select count(*) from auth.users auth_user
       where auth_user.id = ${sqlText(primary.userId)}::uuid
         and auth_user.email_confirmed_at is not null);
  `,
);
if (persisted !== "1\t1\t1\t1") {
  fail("LOCAL_TEACHER_ATOMIC_STATE_FAILED");
}

const second = await createTeacher("reuse");
const reused = await activate(second.cookies, claimedCode);
if (reused.status !== 409 || !responseUnavailable(reused.payload)) {
  fail("LOCAL_TEACHER_REUSE_NOT_REJECTED");
}

function freshCode() {
  return `PLV-TCH-${randomBytes(16).toString("hex").toUpperCase()}`;
}

const expiredCode = freshCode();
queryOwnerLocalDatabase(
  config,
  `
    insert into public.teacher_invitations (
      code_hash, status, expires_at, created_at
    ) values (
      extensions.digest(${sqlText(expiredCode)}, 'sha256'),
      'AVAILABLE', now() - interval '1 hour', now() - interval '2 hours'
    );
  `,
);
const expiredActor = await createTeacher("expired");
const expired = await activate(expiredActor.cookies, expiredCode);
if (expired.status !== 409 || !responseUnavailable(expired.payload)) {
  fail("LOCAL_TEACHER_EXPIRED_NOT_REJECTED");
}

const revokedCode = queryOwnerLocalDatabase(
  config,
  "select private.issue_teacher_invitation(now() + interval '1 hour');",
);
if (!/^PLV-TCH-[0-9A-F]{32}$/u.test(revokedCode)) {
  fail("LOCAL_TEACHER_REVOKE_FIXTURE_FAILED");
}
const revoked = queryOwnerLocalDatabase(
  config,
  `
    select private.revoke_teacher_invitation(invitation.id)
    from public.teacher_invitations invitation
    where invitation.code_hash = extensions.digest(${sqlText(revokedCode)}, 'sha256');
  `,
);
if (revoked !== "t") fail("LOCAL_TEACHER_REVOKE_FIXTURE_FAILED");
const revokedActor = await createTeacher("revoked");
const revokedActivation = await activate(revokedActor.cookies, revokedCode);
if (
  revokedActivation.status !== 409 ||
  !responseUnavailable(revokedActivation.payload)
) {
  fail("LOCAL_TEACHER_REVOKED_NOT_REJECTED");
}

const invalidActor = await createTeacher("invalid");
const invalid = await activate(invalidActor.cookies, freshCode());
if (invalid.status !== 409 || !responseUnavailable(invalid.payload)) {
  fail("LOCAL_TEACHER_INVALID_NOT_REJECTED");
}

process.stdout.write("LOCAL_TEACHER_SIGNUP=PASS\n");
process.stdout.write("LOCAL_OPERATOR_CONTRACT_GATE=PASS\n");
process.stdout.write("LOCAL_TEACHER_EMAIL_CONFIRMED=PASS\n");
process.stdout.write("LOCAL_TEACHER_ONBOARDING_PAGE=PASS\n");
process.stdout.write("LOCAL_TEACHER_ONBOARDING_API=PASS\n");
process.stdout.write("LOCAL_TEACHER_ATOMIC_CLAIM=PASS\n");
process.stdout.write("LOCAL_TEACHER_PROFILE_CREATED=PASS\n");
process.stdout.write("LOCAL_TEACHER_ONBOARDING_COMPLETED=PASS\n");
process.stdout.write("LOCAL_TEACHER_REUSE_REJECTED=PASS\n");
process.stdout.write("LOCAL_TEACHER_EXPIRED_REJECTED=PASS\n");
process.stdout.write("LOCAL_TEACHER_REVOKED_REJECTED=PASS\n");
process.stdout.write("LOCAL_TEACHER_INVALID_REJECTED=PASS\n");
process.stdout.write("INVITATION_PLAINTEXT_PRINTED=NO\n");
