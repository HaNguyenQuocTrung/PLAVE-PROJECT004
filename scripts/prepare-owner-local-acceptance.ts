import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import {
  loadOwnerLocalSupabase,
  queryOwnerLocalDatabase,
} from "./owner-local-demo-support.ts";

type Role = "STUDENT" | "PARENT";

const config = loadOwnerLocalSupabase();
const existing = queryOwnerLocalDatabase(
  config,
  `select count(*) from auth.users
   where email like 'round2d-%@plave.local.invalid';`,
);
if (existing !== "0") {
  throw new Error("Round 2D acceptance accounts already exist.");
}

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const studentEmail = `round2d-student-${suffix}@plave.local.invalid`;
const parentEmail = `round2d-parent-${suffix}@plave.local.invalid`;
const unrelatedEmail = `round2d-unrelated-${suffix}@plave.local.invalid`;
const password = () => `P4!${randomBytes(15).toString("base64url")}`;
const studentPassword = password();
const parentPassword = password();
const unrelatedPassword = password();

function client() {
  return createClient(config.apiUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function registerAndOnboard(
  role: Role,
  email: string,
  accountPassword: string,
  fullName: string,
) {
  const supabase = client();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: accountPassword,
    options: {
      data: role === "STUDENT" ? { role, grade: 1 } : { role },
    },
  });
  if (error || !data.user || !data.session) {
    throw new Error("Local acceptance registration failed.");
  }
  const { error: onboardingError } = await supabase.rpc(
    "complete_onboarding",
    {
      p_full_name: fullName,
      p_grade: role === "STUDENT" ? 1 : null,
      p_birth_date: null,
    },
  );
  if (onboardingError) {
    throw new Error("Local acceptance onboarding failed.");
  }
  return supabase;
}

const student = await registerAndOnboard(
  "STUDENT",
  studentEmail,
  studentPassword,
  "Học sinh Local",
);
const { data: studentProfile, error: studentProfileError } = await student
  .from("student_profiles")
  .select("student_code, grade")
  .single();
if (
  studentProfileError ||
  studentProfile?.grade !== 1 ||
  typeof studentProfile.student_code !== "string"
) {
  throw new Error("Local Student profile is unavailable.");
}

const { data: unit, error: unitError } = await student
  .from("learning_units")
  .select("slug")
  .eq("grade", 1)
  .eq("published", true)
  .order("display_order")
  .limit(1)
  .single();
if (unitError || typeof unit?.slug !== "string") {
  throw new Error("Local Grade 1 unit is unavailable.");
}
const { data: practice, error: practiceError } = await student.rpc(
  "start_or_resume_practice",
  { p_unit_slug: unit.slug },
);
const practiceRecord = practice as Record<string, unknown> | null;
const questionOrder = practiceRecord?.question_order;
if (
  practiceError ||
  typeof practiceRecord?.attempt_id !== "string" ||
  !Array.isArray(questionOrder) ||
  typeof questionOrder[0] !== "string" ||
  /correct_answer|solution_steps/i.test(JSON.stringify(practice))
) {
  throw new Error("Local Student practice start failed safely.");
}
const parent = await registerAndOnboard(
  "PARENT",
  parentEmail,
  parentPassword,
  "Phụ huynh Local",
);
const { data: request, error: requestError } = await parent.rpc(
  "send_parent_connection_request",
  { p_student_code: studentProfile.student_code },
);
if (
  requestError ||
  (request as Record<string, unknown> | null)?.status !== "PENDING"
) {
  throw new Error("Local Parent connection request failed.");
}
const { data: connections, error: connectionsError } = await parent.rpc(
  "get_my_parent_student_connections",
);
const connectionItems = (
  connections as { connections?: Array<Record<string, unknown>> } | null
)?.connections;
const connectionId = connectionItems?.[0]?.connection_id;
if (connectionsError || typeof connectionId !== "string") {
  throw new Error("Local Parent connection state failed.");
}
const { data: approval, error: approvalError } = await student.rpc(
  "respond_parent_connection_request",
  { p_connection_id: connectionId, p_decision: "APPROVED" },
);
if (
  approvalError ||
  (approval as Record<string, unknown> | null)?.status !== "APPROVED"
) {
  throw new Error("Local Student consent approval failed.");
}

for (const rpc of [
  "get_parent_child_learning_dashboard",
  "get_parent_child_universal_progress",
  "get_parent_child_generated_curriculum_progress",
  "get_parent_child_score_xp_mastery",
  "get_parent_child_motivation_v1",
] as const) {
  const { data, error } = await parent.rpc(rpc, {
    p_connection_id: connectionId,
  });
  if (
    error ||
    data === null ||
    /correct_answer|solution_steps/i.test(JSON.stringify(data))
  ) {
    throw new Error("Approved Parent progress verification failed.");
  }
}

const unrelated = await registerAndOnboard(
  "PARENT",
  unrelatedEmail,
  unrelatedPassword,
  "Phụ huynh Không Liên Kết",
);
for (const rpc of [
  "get_parent_child_learning_dashboard",
  "get_parent_child_universal_progress",
] as const) {
  const { error } = await unrelated.rpc(rpc, {
    p_connection_id: connectionId,
  });
  if (!error) {
    throw new Error("Unrelated Parent was not denied.");
  }
}
await unrelated.auth.signOut();
queryOwnerLocalDatabase(
  config,
  `delete from auth.users
   where email = '${unrelatedEmail.replaceAll("'", "''")}';`,
);

process.stdout.write("OWNER_LOCAL_ACCEPTANCE_DATA=READY\n");
process.stdout.write("PARENT_STUDENT_LINK=APPROVED\n");
process.stdout.write("PARENT_PROGRESS=VERIFIED_NO_SOLUTION_LEAKAGE\n");
process.stdout.write("UNRELATED_PARENT=DENIED_AND_REMOVED\n");
process.stdout.write(`STUDENT_EMAIL=${studentEmail}\n`);
process.stdout.write(`STUDENT_PASSWORD=${studentPassword}\n`);
process.stdout.write(`PARENT_EMAIL=${parentEmail}\n`);
process.stdout.write(`PARENT_PASSWORD=${parentPassword}\n`);
process.stdout.write("CREDENTIALS_PRINTED_ONCE_PERSISTED=NO\n");
