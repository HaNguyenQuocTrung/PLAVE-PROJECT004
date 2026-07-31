import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

function fail(message) {
  throw new Error(message);
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireAll(source, values, label) {
  for (const value of values) {
    if (!source.includes(value)) fail(`${label} thiếu ${value}`);
  }
}

function stripComments(source) {
  return source
    .replaceAll(/--.*$/gm, "")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

const migrationName =
  "0037_adaptive_controlled_pilot_eligibility_draft.sql";
const migration = read(`supabase/migrations/${migrationName}`);
const normalizedMigration = migration.trim().toLowerCase();
if (
  !normalizedMigration.startsWith("begin;") ||
  !normalizedMigration.endsWith("commit;") ||
  (migration.match(/\bbegin\s*;/gi) ?? []).length !== 1 ||
  (migration.match(/\bcommit\s*;/gi) ?? []).length !== 1
) {
  fail("0037 phải có đúng một BEGIN/COMMIT và COMMIT là statement cuối.");
}

const migrations = readdirSync(
  new URL("../supabase/migrations/", import.meta.url),
)
  .filter((name) => /^\d{4}_.+[.]sql$/.test(name))
  .sort();
const migrationIndex = migrations.indexOf(migrationName);
const reviewedLaterMigrations = [
  "0038_universal_curriculum_runtime_draft.sql",
];
if (
  migrationIndex < 0 ||
  migrations.filter((name) => name.startsWith("0037_")).length !== 1 ||
  migrations.slice(migrationIndex + 1).some(
    (name) => !reviewedLaterMigrations.includes(name),
  )
) {
  fail("0037 phải là migration draft duy nhất; migration mới hơn phải được allowlist.");
}

const frozenHash =
  "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530";
requireAll(
  migration,
  [
    "adaptive_practice_pilot_members",
    "force row level security",
    "private.is_adaptive_controlled_pilot_member",
    "public.get_adaptive_controlled_pilot_availability",
    "public.start_or_resume_adaptive_practice",
    "public.submit_adaptive_practice_answer",
    "release.publication_status = 'DRAFT'",
    "release.student_visibility = 'HIDDEN'",
    "not unit.published",
    "not question.published",
    frozenHash,
    "g2-numbers-to-1000-rc1",
    "g2n1000-1.0.0-rc.1",
    "g2n1000-adaptive-policy-1.0.0-pilot",
  ],
  "0037",
);

if (
  /next_public/i.test(migration) ||
  /service[_-]?role/i.test(migration) ||
  /\b(?:insert\s+into|update|delete\s+from)\s+public[.](?:practice_attempts|practice_answers|diagnostic_attempts|diagnostic_answers)\b/i.test(
    migration,
  ) ||
  /\b(?:insert\s+into|update|delete\s+from)\s+public[.](?:learning_units|questions|question_solutions)\b/i.test(
    migration,
  )
) {
  fail("0037 không được dùng public env, service-role hay sửa content/history.");
}

for (const role of ["public", "anon", "authenticated"]) {
  if (
    !new RegExp(
      `revoke\\s+all\\s+on\\s+table\\s+public[.]adaptive_practice_pilot_members\\s+from\\s+${role}\\s*;`,
      "i",
    ).test(migration)
  ) {
    fail(`0037 thiếu revoke membership table cho ${role}.`);
  }
}

for (const functionName of [
  "get_adaptive_controlled_pilot_availability",
  "start_or_resume_adaptive_practice",
  "submit_adaptive_practice_answer",
]) {
  const start = migration.indexOf(
    `create or replace function public.${functionName}`,
  );
  const end = migration.indexOf("$$;", start);
  if (
    start < 0 ||
    end < 0 ||
    !migration.slice(start, end).includes("security definer") ||
    !migration.slice(start, end).includes("set search_path = ''")
  ) {
    fail(`${functionName} thiếu SECURITY DEFINER/search_path an toàn.`);
  }
}

const appConfig = read("lib/practice/adaptive-pilot.ts");
const serverConfig = read("lib/practice/adaptive-pilot-server.ts");
requireAll(
  appConfig,
  [
    "PLAVE_ADAPTIVE_PILOT_USER_IDS",
    "parseAdaptivePilotAllowlist",
    "MALFORMED_CONFIGURATION",
    "new Set(normalized)",
  ],
  "Typed allowlist",
);
if (
  !read("lib/practice/runtime-flags.ts").includes(
    "databasePilotMembership",
  )
) {
  fail("Runtime gate thiếu database membership boundary.");
}
if (
  /NEXT_PUBLIC/i.test(appConfig + serverConfig) ||
  /\b(?:console[.](?:log|error|warn)|logger[.])/i.test(
    appConfig + serverConfig,
  ) ||
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
    appConfig + serverConfig,
  )
) {
  fail("Pilot config không được public, log hoặc hard-code identity.");
}

const activation = read(
  "supabase/operations/grade2-controlled-pilot/ACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql",
);
const deactivation = read(
  "supabase/operations/grade2-controlled-pilot/DEACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql",
);
for (const [name, source] of [
  ["activation", activation],
  ["deactivation", deactivation],
]) {
  const normalized = source.trim().toLowerCase();
  if (
    !normalized.startsWith("begin;") ||
    !normalized.endsWith("commit;") ||
    (source.match(/\bbegin\s*;/gi) ?? []).length !== 1 ||
    (source.match(/\bcommit\s*;/gi) ?? []).length !== 1 ||
    /\b(?:delete|truncate|drop|alter|create|grant|revoke)\b/i.test(
      stripComments(source),
    )
  ) {
    fail(`${name} phải atomic và không destructive/DDL/grant.`);
  }
  requireAll(
    source,
    [
      frozenHash,
      "publication_status = 'DRAFT'",
      "student_visibility = 'HIDDEN'",
      "v_grade1_units_before",
      "v_practice_attempts_before",
      "v_diagnostic_attempts_before",
    ],
    name,
  );
}
if (
  !activation.includes("runtime_enabled = true") ||
  !activation.includes("controlled_pilot_enabled = true") ||
  !activation.includes("not unit.published") ||
  !activation.includes("question.published")
) {
  fail("Activation thiếu exact flags hoặc unpublished postcondition.");
}
if (
  !deactivation.includes("runtime_enabled = false") ||
  !deactivation.includes("controlled_pilot_enabled = false") ||
  /\bdelete\b/i.test(stripComments(deactivation))
) {
  fail("Deactivation phải fail-closed và giữ lịch sử.");
}

const diagnostic = read(
  "supabase/operations/grade2-controlled-pilot/POST_ACTIVATION_READONLY.sql",
);
const diagnosticSql = stripComments(diagnostic);
if (
  !/^\s*begin\s+transaction\s+read\s+only\s*;/i.test(diagnosticSql) ||
  !/\brollback\s*;\s*$/i.test(diagnosticSql) ||
  /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b/i.test(
    diagnosticSql,
  )
) {
  fail("Post-activation diagnostic phải chỉ đọc và rollback.");
}

const membershipOperation = read(
  "supabase/operations/grade2-controlled-pilot/ENROL_ONE_GRADE2_TEST_STUDENT.sql",
);
const membershipOperationSql = stripComments(membershipOperation);
const uuidPlaceholder = "<OWNER_PRIVATE_STUDENT_UUID>";
const projectPlaceholder =
  "<OWNER_CONFIRM_AUTHORIZED_SUPABASE_PROJECT_REF>";
if (
  !/^\s*begin\s*;/i.test(membershipOperationSql) ||
  !/\bcommit\s*;\s*$/i.test(membershipOperationSql) ||
  (membershipOperationSql.match(/\bbegin\s*;/gi) ?? []).length !== 1 ||
  (membershipOperationSql.match(/\bcommit\s*;/gi) ?? []).length !== 1
) {
  fail("6J-B membership operation phải có đúng một transaction.");
}
requireAll(
  membershipOperation,
  [
    uuidPlaceholder,
    projectPlaceholder,
    "ujmwuhwfwbrmudtmmkes",
    "v_owner_project_confirmation <> v_authorized_project_ref",
    "v_eligible_grade2_count <> 1",
    "v_selected_eligible_count <> 1",
    "from auth.users",
    "profile.role = 'STUDENT'",
    "student.grade = 2",
    "v_membership_count <> 0",
    "insert into public.adaptive_practice_pilot_members",
    "CANDIDATE_SEMANTIC_FINGERPRINT_MISMATCH",
    "v_protected_after is distinct from v_protected_before",
    "publication_status = 'DRAFT'",
    "student_visibility = 'HIDDEN'",
    "not release.runtime_enabled",
    "not release.controlled_pilot_enabled",
    "not release.retention_runtime_enabled",
    "public.adaptive_practice_attempts",
    "public.adaptive_practice_answers",
  ],
  "6J-B membership operation",
);
if (
  membershipOperation.split(uuidPlaceholder).length - 1 !== 1 ||
  membershipOperation.split(projectPlaceholder).length - 1 !== 1
) {
  fail("Mỗi Owner placeholder phải xuất hiện đúng một lần.");
}
if (
  !/lock table auth[.]users in share mode;[\s\S]*lock table public[.]adaptive_practice_pilot_members\s+in share row exclusive mode;/i.test(
    membershipOperationSql,
  )
) {
  fail("6J-B thiếu fixed lock order/content-history concurrency protection.");
}
if (
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
    membershipOperation,
  ) ||
  /\b(?:insert\s+into|update|delete\s+from)\s+public[.](?:student_profiles|profiles|learning_units|questions|question_solutions|practice_attempts|practice_answers|diagnostic_attempts|diagnostic_answers|adaptive_practice_attempts|adaptive_practice_answers|adaptive_practice_releases)\b/i.test(
    membershipOperationSql,
  )
) {
  fail("6J-B operation chứa identity hoặc mutation ngoài membership.");
}

const membershipDiagnostic = read(
  "supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql",
);
const membershipDiagnosticSql = stripComments(membershipDiagnostic);
if (
  !/^\s*begin\s+transaction\s+read\s+only\s*;/i.test(
    membershipDiagnosticSql,
  ) ||
  !/\brollback\s*;\s*$/i.test(membershipDiagnosticSql) ||
  /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b/i.test(
    membershipDiagnosticSql,
  )
) {
  fail("6J-B membership diagnostic phải chỉ đọc và rollback.");
}
requireAll(
  membershipDiagnostic,
  [
    "'exactly_one_member'",
    "'member_is_the_unique_eligible_grade2'",
    "'eligible_onboarded_grade2_students'",
    "'database_flags_true'",
    "'frozen_release_binding'",
    "'database_row_semantic_fingerprint'",
    "'full_original_bundle_recomputation_unsupported'",
    "'unit_total'",
    "'published_units'",
    "'question_total'",
    "'unpublished_questions'",
    "'published_questions'",
    "'solution_mappings'",
    "'multiple_choice_questions'",
    "'number_input_questions'",
    "'skill_families_with_six_questions'",
    "'answer_evidence'",
    "'GRADE1_BASELINE'",
    "'HISTORY_BASELINE'",
    "then 'PASS'",
  ],
  "6J-B membership diagnostic",
);

const releaseMigration = read(
  "supabase/migrations/0035_grade2_numbers_to_1000_release_candidate_draft.sql",
);
const releaseBankMatch = releaseMigration.match(
  /\$release_bank\$([\s\S]*?)\$release_bank\$::jsonb/,
);
if (!releaseBankMatch?.[1]) fail("Không đọc được canonical Grade 2 bank.");
const releaseBank = JSON.parse(releaseBankMatch[1]);
const hex = (value) =>
  Buffer.from(String(value ?? ""), "utf8").toString("hex");
const semanticRows = releaseBank
  .map((row) =>
    [
      row.code,
      "grade-2-numbers-to-1000",
      row.question_type,
      row.prompt,
      row.options?.A,
      row.options?.B,
      row.options?.C,
      row.options?.D,
      row.visual_spec?.kind,
      row.visual_spec?.description,
      row.visual_spec?.value,
      row.visual_spec?.thousands,
      row.visual_spec?.hundreds,
      row.visual_spec?.tens,
      row.visual_spec?.ones,
      row.visual_spec?.start,
      row.visual_spec?.end,
      row.visual_spec?.focusValue,
      row.skill_code,
      row.difficulty,
      row.display_order,
      "false",
      row.correct_answer,
      row.solution_steps?.[0],
      row.solution_steps?.[1],
      row.explanation,
      row.hint,
    ]
      .map(hex)
      .join(":"),
  )
  .sort()
  .join("\n");
const semanticFingerprint = createHash("sha256")
  .update(semanticRows)
  .digest("hex");
if (
  semanticFingerprint !==
    "0274b7f3b49830935dbb7120ecd661ec26ca725cf675f1429eea98d975d5b8d5" ||
  !membershipOperation.includes(semanticFingerprint) ||
  !membershipDiagnostic.includes(semanticFingerprint)
) {
  fail("Database-row semantic fingerprint không khớp canonical local source.");
}

const envChecker = read("scripts/check-controlled-pilot-env.ts");
for (const mode of [
  "--mode=allowlist-count",
  "--mode=pre-activation",
  "--mode=activation",
]) {
  if (!envChecker.includes(mode)) fail(`Env checker thiếu ${mode}.`);
}
if (/--allowlist-only/.test(envChecker)) {
  fail("Env checker không được dùng allowlist-only làm bằng chứng flags.");
}

const contentManifest = JSON.parse(
  read(
    "content/releases/grade-2-numbers-to-1000/g2-numbers-to-1000-rc1/manifest.json",
  ),
);
if (contentManifest.bundleHash !== frozenHash) {
  fail("Frozen candidate hash drift.");
}

const checksum = createHash("sha256").update(migration).digest("hex");
console.log("Controlled pilot package static validation: PASS");
console.log(`0037 SHA-256: ${checksum}`);
console.log(`Frozen candidate SHA-256: ${frozenHash}`);
console.log("Repository defaults: DENY_ALL / FEATURE_FLAGS_FALSE");
