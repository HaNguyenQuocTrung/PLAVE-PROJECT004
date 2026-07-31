import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const operationsDirectory = path.join(
  repositoryRoot,
  "supabase",
  "operations",
  "remote-dev-rls-drift",
);
const remediationPath = path.join(
  operationsDirectory,
  "REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql",
);
const recoveryPath = path.join(
  operationsDirectory,
  "RECOVER_RLS_AUTO_ENABLE_REMOTE_DEV.sql",
);

const remediation = fs.readFileSync(remediationPath, "utf8");
const recovery = fs.readFileSync(recoveryPath, "utf8");

test("remediation is an operation, not a numbered migration", () => {
  assert.doesNotMatch(remediationPath, /supabase\/migrations/);
  assert.doesNotMatch(path.basename(remediationPath), /^\d{4}_/);
  assert.deepEqual(
    fs.readdirSync(path.join(repositoryRoot, "supabase", "migrations"))
      .filter((name) => name.startsWith("0037_"))
      .sort(),
    ["0037_adaptive_controlled_pilot_eligibility_draft.sql"],
  );
});

test("remediation is transactional, fail-closed, and drops exact objects", () => {
  assert.match(remediation, /^\s*--[\s\S]*?\bbegin\s*;/i);
  assert.match(remediation, /\bcommit\s*;\s*$/i);
  assert.match(remediation, /6998ea6b4c2480f5d2e34b5dcf3f8d36/);
  assert.match(remediation, /685bfb43070e3afbcc764020048aaa0c/);
  assert.match(remediation, /search_path=pg_catalog/);
  assert.match(remediation, /extension_dependency|pg_extension/i);
  assert.match(remediation, /event_trigger\.evtenabled = 'O'/);
  assert.match(remediation, /event_trigger\.evtevent = 'ddl_command_end'/);
  for (const tag of ["CREATE TABLE", "CREATE TABLE AS", "SELECT INTO"]) {
    assert.match(remediation, new RegExp(tag));
  }

  const triggerDrop = remediation.indexOf(
    "drop event trigger ensure_rls;",
  );
  const functionDrop = remediation.indexOf(
    "drop function public.rls_auto_enable();",
  );
  assert.ok(triggerDrop > remediation.indexOf("$precondition$;"));
  assert.ok(functionDrop > triggerDrop);
  assert.equal(
    (remediation.match(/\bdrop\s+event\s+trigger\b/gi) ?? []).length,
    1,
  );
  assert.equal(
    (remediation.match(/\bdrop\s+function\b/gi) ?? []).length,
    1,
  );
  assert.doesNotMatch(
    remediation,
    /\b(?:drop|truncate)\s+table\b|\bdelete\s+from\b|\bupdate\s+public\./i,
  );
});

test("remediation snapshots RLS and aggregate history before mutation", () => {
  const triggerDrop = remediation.indexOf(
    "drop event trigger ensure_rls;",
  );
  for (const marker of [
    "plave_rls_drift_table_snapshot",
    "plave_rls_drift_count_snapshot",
    "public.practice_attempts",
    "public.practice_answers",
    "public.diagnostic_attempts",
    "public.diagnostic_answers",
    "grade1_units",
    "grade1_questions",
    "grade1_solutions",
  ]) {
    assert.ok(remediation.indexOf(marker) < triggerDrop, marker);
  }
  assert.match(remediation, /PLAVE_RLS_DRIFT:RLS_STATE_CHANGED/);
  assert.match(remediation, /PLAVE_RLS_DRIFT:BASELINE_COUNT_CHANGED/);
  assert.match(remediation, /PLAVE_RLS_DRIFT:DRAFT_STATE_CHANGED/);
});

test("all repository-created public tables explicitly enable RLS", () => {
  const migrationDirectory = path.join(
    repositoryRoot,
    "supabase",
    "migrations",
  );
  const migrationNames = fs
    .readdirSync(migrationDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const migrations = migrationNames.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(migrationDirectory, name), "utf8"),
  }));
  const allSql = migrations.map(({ sql }) => sql).join("\n");
  const createdTables = migrations.flatMap(({ name, sql }) =>
    [...sql.matchAll(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-z_][a-z0-9_]*)/gi,
    )].map((match) => ({ migration: name, table: match[1] })),
  );

  assert.deepEqual(
    createdTables.map(({ table }) => table).sort(),
    [
      "adaptive_practice_answers",
      "adaptive_practice_attempts",
      "adaptive_practice_pilot_members",
      "adaptive_practice_releases",
      "assignment_answers",
      "assignment_submissions",
      "classroom_memberships",
      "classrooms",
      "curriculum_answers",
      "curriculum_attempts",
      "curriculum_legacy_grade1_outcome_mappings",
      "curriculum_release_questions",
      "curriculum_release_units",
      "curriculum_releases",
      "diagnostic_answers",
      "diagnostic_attempts",
      "grade1_diagnostic_blueprint",
      "learning_goals",
      "learning_units",
      "parent_goal_suggestions",
      "parent_student_connections",
      "parent_student_lookup_failures",
      "practice_answers",
      "practice_attempts",
      "profiles",
      "question_solutions",
      "questions",
      "student_assignment_outcome_progress",
      "student_assignment_skill_progress",
      "student_curriculum_outcome_progress",
      "student_curriculum_skill_progress",
      "student_curriculum_unit_progress",
      "student_profiles",
      "teacher_assignment_items",
      "teacher_assignments",
      "teacher_curriculum_assignment_draft_items",
      "teacher_curriculum_assignment_drafts",
      "teacher_invitations",
      "teacher_profiles",
      "teacher_question_solutions",
      "teacher_questions",
    ],
  );
  for (const created of createdTables) {
    assert.match(
      allSql,
      new RegExp(
        `alter\\s+table\\s+public\\.${created.table}` +
          "\\s+enable\\s+row\\s+level\\s+security",
        "i",
      ),
      `${created.migration}:${created.table}`,
    );
  }

  for (const table of [
    "adaptive_practice_releases",
    "adaptive_practice_attempts",
    "adaptive_practice_answers",
    "curriculum_releases",
    "curriculum_release_units",
    "curriculum_release_questions",
    "curriculum_legacy_grade1_outcome_mappings",
    "curriculum_attempts",
    "curriculum_answers",
    "student_curriculum_unit_progress",
    "student_curriculum_outcome_progress",
    "student_curriculum_skill_progress",
    "student_assignment_outcome_progress",
    "student_assignment_skill_progress",
    "teacher_curriculum_assignment_drafts",
    "teacher_curriculum_assignment_draft_items",
  ]) {
    assert.match(
      allSql,
      new RegExp(
        `alter\\s+table\\s+public\\.${table}` +
          "\\s+force\\s+row\\s+level\\s+security",
        "i",
      ),
    );
  }
});

test("0035, 0036, and runtime do not depend on helper or event trigger", () => {
  const roots = ["app", "components", "lib", "supabase/migrations"];
  const files = [];
  const visit = (target) => {
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const entryPath = path.join(target, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else files.push(entryPath);
    }
  };
  for (const root of roots) {
    const absoluteRoot = path.join(repositoryRoot, root);
    if (fs.existsSync(absoluteRoot)) visit(absoluteRoot);
  }
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\brls_auto_enable\b|\bensure_rls\b/i, file);
  }
});

test("reviewed recovery recreates the official locked helper shape", () => {
  assert.match(recovery, /^\s*--[\s\S]*?\bbegin\s*;/i);
  assert.match(recovery, /\bcommit\s*;\s*$/i);
  assert.match(recovery, /returns event_trigger/i);
  assert.match(recovery, /language plpgsql/i);
  assert.match(recovery, /security definer/i);
  assert.match(recovery, /set search_path = pg_catalog/i);
  assert.match(recovery, /6998ea6b4c2480f5d2e34b5dcf3f8d36/);
  assert.match(recovery, /685bfb43070e3afbcc764020048aaa0c/);
  assert.match(recovery, /create event trigger ensure_rls/i);
  assert.match(recovery, /alter event trigger ensure_rls enable/i);

  const fixture = fs.readFileSync(
    path.join(
      repositoryRoot,
      "tests",
      "fixtures",
      "rls-auto-enable-active.sql",
    ),
    "utf8",
  );
  const extractFunctionBody = (source) => {
    const functionStart = source.search(
      /create\s+or\s+replace\s+function\s+public\.rls_auto_enable\(\)/i,
    );
    assert.ok(functionStart >= 0);
    const bodyStart = source.indexOf("as $$", functionStart);
    const bodyEnd = source.indexOf("$$;", bodyStart);
    assert.ok(bodyStart >= 0 && bodyEnd > bodyStart);
    return source.slice(bodyStart + "as $$".length, bodyEnd);
  };
  assert.equal(extractFunctionBody(recovery), extractFunctionBody(fixture));
});
