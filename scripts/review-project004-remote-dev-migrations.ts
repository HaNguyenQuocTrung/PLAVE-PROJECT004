import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildProject004RemoteDevCurriculumSql } from "./project004-remote-dev-curriculum.ts";
import {
  RemoteDevGuardFailure,
  loadAndVerifyMigrationPlan,
} from "./project004-remote-dev-guard.ts";

type ReviewCheck =
  | "MIGRATION_BASELINE"
  | "EXTENSIONS_DEPENDENCIES"
  | "AUTH_HOOKS_TRIGGERS"
  | "PUBLIC_PRIVATE_SCHEMAS"
  | "GRANTS_RLS"
  | "MIGRATIONS_0036_0040"
  | "NO_LOCAL_DATABASE_DEPENDENCY"
  | "CURRICULUM_SOURCE_COUNTS"
  | "DRAFT_INACTIVE_BOUNDARY";

const checkNames: readonly ReviewCheck[] = [
  "MIGRATION_BASELINE",
  "EXTENSIONS_DEPENDENCIES",
  "AUTH_HOOKS_TRIGGERS",
  "PUBLIC_PRIVATE_SCHEMAS",
  "GRANTS_RLS",
  "MIGRATIONS_0036_0040",
  "NO_LOCAL_DATABASE_DEPENDENCY",
  "CURRICULUM_SOURCE_COUNTS",
  "DRAFT_INACTIVE_BOUNDARY",
];
const checks = Object.fromEntries(
  checkNames.map((name) => [name, false]),
) as Record<ReviewCheck, boolean>;

try {
  const { root, plan } = loadAndVerifyMigrationPlan();
  checks.MIGRATION_BASELINE = true;
  const migrationText = new Map(
    plan.migrations.map((entry) => [
      entry.version,
      readFileSync(
        resolve(root, "supabase/migrations", entry.file),
        "utf8",
      ),
    ]),
  );
  const combined = [...migrationText.values()].join("\n");

  const first = migrationText.get("0001") ?? "";
  if (
    /create extension if not exists pgcrypto with schema extensions/iu.test(
      first,
    ) &&
    combined.includes("extensions.gen_random_uuid()") &&
    combined.includes("extensions.digest(") &&
    combined.includes("extensions.hmac(")
  ) {
    checks.EXTENSIONS_DEPENDENCIES = true;
  }

  const authFoundation = `${first}\n${migrationText.get("0005") ?? ""}`;
  if (
    authFoundation.includes(
      "create or replace function public.handle_new_auth_user()",
    ) &&
    authFoundation.includes(
      "create trigger on_auth_user_created",
    ) &&
    authFoundation.includes("on auth.users")
  ) {
    checks.AUTH_HOOKS_TRIGGERS = true;
  }

  if (
    first.includes("create schema if not exists private") &&
    combined.includes("private.curriculum_release_solutions") &&
    combined.includes("private.curriculum_generated_solutions") &&
    combined.includes("public.curriculum_release_questions")
  ) {
    checks.PUBLIC_PRIVATE_SCHEMAS = true;
  }

  const enableRlsCount =
    combined.match(/enable row level security/giu)?.length ?? 0;
  const forceRlsCount =
    combined.match(/force row level security/giu)?.length ?? 0;
  const policyCount = combined.match(/^create policy /gimu)?.length ?? 0;
  if (
    enableRlsCount >= 35 &&
    forceRlsCount >= 15 &&
    policyCount >= 19 &&
    /revoke all on table private[.]curriculum_release_solutions[\s\S]*from public, anon, authenticated/iu.test(
      combined,
    ) &&
    /revoke all on table private[.]curriculum_generated_solutions[\s\S]*from public, anon, authenticated/iu.test(
      combined,
    )
  ) {
    checks.GRANTS_RLS = true;
  }

  const migration0036 = migrationText.get("0036") ?? "";
  const migration0037 = migrationText.get("0037") ?? "";
  const migration0038 = migrationText.get("0038") ?? "";
  const migration0039 = migrationText.get("0039") ?? "";
  const migration0040 = migrationText.get("0040") ?? "";
  if (
    migration0036.includes("public.adaptive_practice_releases") &&
    migration0036.includes("runtime_enabled") &&
    migration0037.includes("public.adaptive_practice_pilot_members") &&
    migration0038.includes("public.curriculum_releases") &&
    migration0038.includes("private.curriculum_release_solutions") &&
    migration0039.includes(
      "public.teacher_curriculum_assignment_drafts",
    ) &&
    migration0039.includes(
      "public.get_parent_child_universal_progress",
    ) &&
    migration0040.includes(
      "private.curriculum_generation_runtime_secret",
    ) &&
    migration0040.includes(
      "public.start_or_resume_generated_curriculum",
    )
  ) {
    checks.MIGRATIONS_0036_0040 = true;
  }

  if (
    !/(?:[/]Users[/]|127[.]0[.]0[.]1|localhost|PLAVE_LOCAL_DATABASE_URL|\\copy|\\i\s)/iu.test(
      combined,
    )
  ) {
    checks.NO_LOCAL_DATABASE_DEPENDENCY = true;
  }

  const content = buildProject004RemoteDevCurriculumSql();
  if (
    content.counts.releases === 1 &&
    content.counts.units === 171 &&
    content.counts.publicQuestions === 2052 &&
    content.counts.privateSolutions === 2052 &&
    content.counts.officialOutcomes === 546
  ) {
    checks.CURRICULUM_SOURCE_COUNTS = true;
  }
  if (
    content.sql.includes("'DRAFT'") &&
    content.sql.includes("'INACTIVE'") &&
    !content.sql.includes("'ACTIVE',\n  'ACTIVE'") &&
    !/insert into auth[.]users/iu.test(content.sql) &&
    !/insert into public[.](?:profiles|practice_attempts|curriculum_attempts|assignment_submissions)/iu.test(
      content.sql,
    )
  ) {
    checks.DRAFT_INACTIVE_BOUNDARY = true;
  }

  for (const name of checkNames) {
    process.stdout.write(`${name}=${checks[name] ? "PASS" : "FAIL"}\n`);
  }
  process.stdout.write(`MIGRATIONS_COUNT=${plan.migrationCount}\n`);
  process.stdout.write(
    `CURRICULUM_UNITS_COUNT=${content.counts.units}\n`,
  );
  process.stdout.write(
    `CURRICULUM_PUBLIC_QUESTIONS_COUNT=${content.counts.publicQuestions}\n`,
  );
  process.stdout.write(
    `CURRICULUM_PRIVATE_SOLUTIONS_COUNT=${content.counts.privateSolutions}\n`,
  );
  process.stdout.write(
    `CURRICULUM_OFFICIAL_OUTCOMES_COUNT=${content.counts.officialOutcomes}\n`,
  );
  const ok = checkNames.every((name) => checks[name]);
  process.stdout.write(
    `PROJECT004_REMOTE_DEV_MIGRATION_REVIEW=${ok ? "PASS" : "FAIL"}\n`,
  );
  if (!ok) process.exitCode = 1;
} catch (error) {
  if (!(error instanceof RemoteDevGuardFailure)) {
    // Deliberately keep the output non-sensitive and bounded.
  }
  for (const name of checkNames) {
    process.stdout.write(`${name}=${checks[name] ? "PASS" : "FAIL"}\n`);
  }
  process.stdout.write(
    "PROJECT004_REMOTE_DEV_MIGRATION_REVIEW=FAIL\n",
  );
  process.exitCode = 1;
}
