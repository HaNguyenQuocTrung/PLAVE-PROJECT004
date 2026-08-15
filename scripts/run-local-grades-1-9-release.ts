import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import {
  buildSanitizedPostgresEnvironment,
  parseDisposableLocalReleaseTarget,
  sanitizedLocalTargetLabel,
} from "../lib/release-integration/local-target.ts";

const action = process.argv[2] ?? "activate";
if (!['activate', 'deactivate', 'diagnostic'].includes(action)) {
  throw new Error("LOCAL_RELEASE:ACTION_INVALID");
}

const target = parseDisposableLocalReleaseTarget(
  process.env.PLAVE_LOCAL_DATABASE_URL,
  process.env.PLAVE_LOCAL_DATABASE_CLASSIFICATION,
);
const postgresEnvironment = buildSanitizedPostgresEnvironment(target, process.env.PATH);

function psql(args: readonly string[], capture = false) {
  const result = spawnSync("psql", ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", ...args], {
    env: postgresEnvironment,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "inherit"],
  });
  if (result.error || result.status !== 0) {
    throw new Error("LOCAL_RELEASE:PSQL_FAILED");
  }
  return capture ? String(result.stdout).trim() : "";
}

psql(["--version"], true);
const schemaState = psql(["--tuples-only", "--no-align", "--command", `
  select case when
    to_regclass('public.curriculum_attempts') is not null
    and to_regclass('private.student_achievement_awards') is not null
    and to_regprocedure('public.get_my_motivation_v1()') is not null
  then 'BASELINE_0044_READY' else 'BASELINE_0044_MISSING' end
`], true);
if (schemaState !== "BASELINE_0044_READY") {
  throw new Error("LOCAL_RELEASE:BASELINE_0044_REQUIRED");
}

const installed = psql(["--tuples-only", "--no-align", "--command",
  "select case when to_regclass('public.curriculum_grade_release_policies') is null then 'MISSING' else 'INSTALLED' end"], true);
if (installed === "MISSING") {
  const migration = join(process.cwd(), "supabase/migrations/0045_grades_2_9_local_public_release.sql");
  if (!existsSync(migration)) throw new Error("LOCAL_RELEASE:MIGRATION_0045_MISSING");
  psql(["--file", migration]);
} else if (installed !== "INSTALLED") {
  throw new Error("LOCAL_RELEASE:INSTALL_STATE_UNKNOWN");
}

const operation = action === "activate"
  ? "ACTIVATE_PUBLIC.sql"
  : action === "deactivate"
    ? "DEACTIVATE.sql"
    : "DIAGNOSTIC_READONLY.sql";
const operationPath = join(process.cwd(), "supabase/operations/grades-2-9-local-release", operation);
if (!existsSync(operationPath)) throw new Error("LOCAL_RELEASE:OPERATION_MISSING");
psql(["--file", operationPath]);

console.log(`LOCAL_GRADES_1_9_RELEASE_OK action=${action} target=${sanitizedLocalTargetLabel(target)}`);
if (action === "activate") {
  console.log("Application profile: PLAVE_GRADES_2_9_RELEASE_MODE=PUBLIC and PLAVE_CURRICULUM_RUNTIME_ENABLED=true");
}
