import { randomBytes, randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { buildUniversalCurriculumRelease } from "../lib/curriculum-runtime/release.ts";
import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import { loadGeneratedPersistenceMigrationInventory } from "./project004-generated-persistence-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import { parseSupabaseStatusEnvironment } from "./owner-local-demo-support.ts";
import { assertDisposableCleanupScope, stopDisposableStack } from "./run-project004-clean-disposable-proof.ts";

const root = assertProject004Workspace();
const release = buildUniversalCurriculumRelease();
const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`;
const sqlJson = (value: unknown) => `${sqlText(JSON.stringify(value))}::jsonb`;
const sqlTextArray = (values: readonly string[]) => `array[${values.map(sqlText).join(",")}]::text[]`;

function environment(extra: NodeJS.ProcessEnv = {}) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: "C",
    LC_ALL: "C",
    GOOGLE_API_KEY: "",
    ...extra,
  };
}

async function psql(port: number, sql: string, stage: string) {
  return runManagedChild({
    executable: "/opt/homebrew/bin/psql",
    args: ["--no-psqlrc", "--quiet", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--set", "VERBOSITY=terse"],
    cwd: root,
    environment: environment({
      PGHOST: "127.0.0.1", PGPORT: String(port), PGUSER: "postgres",
      PGPASSWORD: "postgres", PGDATABASE: "postgres", PGSSLMODE: "disable",
    }),
    input: sql,
    timeoutMs: 180_000,
    stage,
  });
}

async function scalar(port: number, sql: string, stage: string) {
  const result = await psql(port, sql, stage);
  if (!result.ok) throw new Error(`${stage}:${result.stderr.trim().slice(0, 500)}`);
  return result.stdout.trim();
}

async function main() {
  const inventory = loadGeneratedPersistenceMigrationInventory(root);
  const migration0044 = inventory.entries.at(-1)!;
  if (inventory.entries.length !== 44 || migration0044.version !== "0044") {
    throw new Error("SPRINT_11B_UPGRADE_INVENTORY_INVALID");
  }
  const grade2Unit = release.units.find((unit) =>
    unit.grade === 2 && release.questions.filter((question) => question.unitId === unit.unitId).length === 12,
  );
  if (!grade2Unit) throw new Error("SPRINT_11B_UPGRADE_GRADE2_UNIT_MISSING");
  const questions = release.questions.filter((question) => question.unitId === grade2Unit.unitId);
  const solutions = questions.map((question) => {
    const solution = release.solutions.find((candidate) => candidate.questionId === question.questionId);
    if (!solution) throw new Error("SPRINT_11B_UPGRADE_SOLUTION_MISSING");
    return solution;
  });
  const reservation = await reserveDisposablePorts();
  const projectId = `plave-project004-clean-proof-${randomBytes(6).toString("hex")}`;
  let released = false;
  let workdir = "";
  let cleanup = false;
  const password = `Upgrade-${randomBytes(18).toString("base64url")}9!`;
  try {
    workdir = mkdtempSync(resolve(tmpdir(), "plave-project004-clean-proof-"));
    assertDisposableCleanupScope(workdir, projectId);
    const migrations = resolve(workdir, "supabase/migrations");
    mkdirSync(migrations, { recursive: true, mode: 0o700 });
    const configPath = resolve(workdir, "supabase/config.toml");
    copyFileSync(resolve(root, "supabase/config.toml"), configPath);
    writeFileSync(
      configPath,
      buildDisposableConfig(readFileSync(configPath, "utf8"), projectId, reservation.ports),
      { mode: 0o600 },
    );
    for (const entry of inventory.entries.slice(0, 43)) {
      copyFileSync(entry.absolutePath, resolve(migrations, entry.filename));
    }
    await reservation.release();
    released = true;
    const started = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: ["start", "--workdir", workdir, "--exclude", "realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor", "--yes"],
      cwd: root,
      environment: environment(),
      timeoutMs: 900_000,
      stage: "SPRINT_11B_UPGRADE_BASELINE_0043",
    });
    if (!started.ok) throw new Error(`SPRINT_11B_UPGRADE_START:${started.stderr.slice(0, 500)}`);
    const status = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: ["status", "--workdir", workdir, "-o", "env"],
      cwd: root,
      environment: environment(),
      timeoutMs: 60_000,
      stage: "SPRINT_11B_UPGRADE_STATUS",
    });
    if (!status.ok) throw new Error("SPRINT_11B_UPGRADE_STATUS_FAILED");
    const local = parseSupabaseStatusEnvironment(status.stdout);
    const apiUrl = local.get("API_URL") ?? "";
    const serviceKey = local.get("SERVICE_ROLE_KEY") ?? "";
    if (!/^http:\/\/(?:127[.]0[.]0[.]1|localhost):\d+$/u.test(apiUrl) || serviceKey.length < 40) {
      throw new Error("SPRINT_11B_UPGRADE_LOCAL_CONFIG_INVALID");
    }
    const email = `test-only-sprint-11b-upgrade-${randomBytes(5).toString("hex")}@example.invalid`;
    const created = await fetch(`${apiUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: "STUDENT", grade: "2" } }),
    });
    const createdPayload = await created.json() as { id?: string };
    if (!created.ok || !createdPayload.id) throw new Error("SPRINT_11B_UPGRADE_ACTOR_CREATE_FAILED");
    const studentId = createdPayload.id;
    const fixtureSql = String.raw`
update public.profiles set full_name='Học sinh nâng cấp', role='STUDENT', onboarding_completed=true
where user_id=${sqlText(studentId)}::uuid;
insert into public.student_profiles(user_id, grade, student_code)
values (${sqlText(studentId)}::uuid, 2, ${sqlText(`PLV-${randomBytes(6).toString("hex").toUpperCase()}`)});
insert into public.curriculum_releases (
  release_id, content_version, curriculum_source_fingerprint, generator_version,
  deterministic_seed, mastery_policy_version, public_payload_sha256,
  private_solution_sha256, bundle_sha256, status, activation_state, activated_at
) values (
  ${sqlText(release.release.releaseId)}, 'TEST_ONLY_SPRINT_11B_UPGRADE',
  ${sqlText(release.release.curriculumSourceFingerprint)}, ${sqlText(release.release.generatorVersion)},
  'test-only-sprint-11b-upgrade', ${sqlText(release.release.masteryPolicyVersion)},
  ${sqlText(release.hashes.publicPayloadSha256)}, ${sqlText(release.hashes.privateSolutionSha256)},
  ${sqlText(release.hashes.bundleSha256)}, 'ACTIVE', 'ACTIVE', now()
);
insert into public.curriculum_release_units (
  release_id, unit_id, grade, domain, title, description, learning_goals,
  theory, worked_examples, official_outcome_ids, skill_ids, display_order, total_questions
) values (
  ${sqlText(release.release.releaseId)}, ${sqlText(grade2Unit.unitId)}, 2,
  ${sqlText(grade2Unit.domain)}, ${sqlText(grade2Unit.title)}, ${sqlText(grade2Unit.description)},
  ${sqlJson(grade2Unit.learningGoals)}, ${sqlJson(grade2Unit.theory)}, ${sqlJson(grade2Unit.workedExamples)},
  ${sqlTextArray(grade2Unit.officialOutcomeIds)}, ${sqlTextArray(grade2Unit.skillIds)},
  ${grade2Unit.displayOrder}, 12
);
insert into public.curriculum_release_questions (
  release_id, unit_id, question_id, display_order, answer_type, prompt, options,
  visual, cognitive_level, official_outcome_ids, official_outcome_titles,
  skill_id, skill_title, question_payload_hash
) values ${questions.map((question) => `(${[
  sqlText(question.releaseId), sqlText(question.unitId), sqlText(question.questionId), String(question.displayOrder),
  sqlText(question.answerType), sqlText(question.prompt), question.options === null ? "null" : sqlJson(question.options),
  sqlJson(question.visual), sqlText(question.cognitiveLevel), sqlTextArray(question.officialOutcomeIds),
  sqlTextArray(question.officialOutcomeTitles), sqlText(question.skillId), sqlText(question.skillTitle),
  sqlText(question.questionPayloadHash),
].join(",")})`).join(",\n")};
insert into private.curriculum_release_solutions (
  release_id, question_id, normalized_correct_answer, correct_answer,
  solution_steps, feedback, solution_payload_hash
) values ${solutions.map((solution) => `(${[
  sqlText(solution.releaseId), sqlText(solution.questionId), sqlText(solution.normalizedCorrectAnswer),
  sqlText(solution.correctAnswer), sqlJson(solution.solutionSteps), sqlText(solution.feedback),
  sqlText(solution.solutionPayloadHash),
].join(",")})`).join(",\n")};`;
    const seeded = await psql(reservation.ports.database, fixtureSql, "SPRINT_11B_UPGRADE_FIXTURE");
    if (!seeded.ok) throw new Error(`SPRINT_11B_UPGRADE_FIXTURE:${seeded.stderr.slice(0, 500)}`);
    const startKey = randomUUID();
    const startedAttempt = JSON.parse(await scalar(reservation.ports.database, String.raw`begin;
set local role authenticated;
do $$ begin perform pg_catalog.set_config('request.jwt.claim.sub', ${sqlText(studentId)}, true); end $$;
select public.start_or_resume_curriculum_unit(${sqlText(grade2Unit.unitId)}, ${sqlText(startKey)}::uuid)::text;
commit;`, "SPRINT_11B_UPGRADE_START_ATTEMPT")) as { attempt_id: string };
    for (let index = 0; index < questions.length; index += 1) {
      await scalar(reservation.ports.database, String.raw`begin;
set local role authenticated;
do $$ begin perform pg_catalog.set_config('request.jwt.claim.sub', ${sqlText(studentId)}, true); end $$;
select public.submit_curriculum_answer(
  ${sqlText(startedAttempt.attempt_id)}::uuid,
  ${sqlText(questions[index]!.questionId)},
  ${sqlText(solutions[index]!.normalizedCorrectAnswer)},
  ${index},
  ${sqlText(randomUUID())}::uuid
)::text;
commit;`, `SPRINT_11B_UPGRADE_ANSWER_${index + 1}`);
    }
    const snapshotSql = String.raw`select concat_ws('|',
  (select count(*) from public.curriculum_attempts where student_id=${sqlText(studentId)}::uuid),
  (select count(*) from private.student_xp_ledger where student_id=${sqlText(studentId)}::uuid),
  (select coalesce(sum(xp_amount),0) from private.student_xp_ledger where student_id=${sqlText(studentId)}::uuid),
  (select count(*) from private.student_mastery_evidence where student_id=${sqlText(studentId)}::uuid),
  (select count(*) from private.student_outcome_mastery where student_id=${sqlText(studentId)}::uuid),
  (select md5(string_agg(concat_ws(':', attempt.id, attempt.status, attempt.score_percent, attempt.xp_earned), ',' order by attempt.id)) from public.curriculum_attempts as attempt where attempt.student_id=${sqlText(studentId)}::uuid),
  (select md5(string_agg(concat_ws(':', event.attempt_id, event.question_id, event.xp_amount), ',' order by event.event_id)) from private.student_xp_ledger as event where event.student_id=${sqlText(studentId)}::uuid),
  (select md5(string_agg(concat_ws(':', mastery.official_outcome_id, mastery.status, mastery.mastery_percent), ',' order by mastery.official_outcome_id)) from private.student_outcome_mastery as mastery where mastery.student_id=${sqlText(studentId)}::uuid)
);`;
    const before = await scalar(reservation.ports.database, snapshotSql, "SPRINT_11B_UPGRADE_SNAPSHOT_BEFORE");
    const injectedSource = readFileSync(migration0044.absolutePath, "utf8").replace(
      /\ncommit;\s*$/u,
      "\nselect 1 / 0; -- TEST_ONLY_SPRINT_11B_0044_ROLLBACK\ncommit;\n",
    );
    const failed = await psql(reservation.ports.database, injectedSource, "SPRINT_11B_0044_FAILURE_INJECTION");
    if (failed.ok || !failed.stderr.includes("division by zero")) {
      throw new Error("SPRINT_11B_0044_FAILURE_INJECTION_NOT_OBSERVED");
    }
    const rollback = await scalar(reservation.ports.database, String.raw`select concat_ws('|',
      (select count(*) from supabase_migrations.schema_migrations),
      to_regclass('private.student_achievement_awards') is null,
      to_regclass('private.student_qualifying_learning_days') is null
    );`, "SPRINT_11B_0044_ROLLBACK_AUDIT");
    if (rollback !== "43|t|t") throw new Error(`SPRINT_11B_0044_ROLLBACK_${rollback}`);
    copyFileSync(migration0044.absolutePath, resolve(migrations, migration0044.filename));
    const upgraded = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: ["migration", "up", "--local", "--workdir", workdir],
      cwd: root,
      environment: environment(),
      timeoutMs: 300_000,
      stage: "SPRINT_11B_UPGRADE_0043_TO_0044",
    });
    if (!upgraded.ok) throw new Error(`SPRINT_11B_UPGRADE_APPLY:${upgraded.stderr.slice(0, 500)}`);
    const after = await scalar(reservation.ports.database, snapshotSql, "SPRINT_11B_UPGRADE_SNAPSHOT_AFTER");
    if (before !== after) throw new Error(`SPRINT_11B_UPGRADE_DATA_CHANGED:${before}:${after}`);
    const noSynthetic = await scalar(reservation.ports.database, String.raw`select concat_ws('|',
      (select count(*) from private.student_completed_attempt_events),
      (select count(*) from private.student_qualifying_learning_days),
      (select count(*) from private.student_goal_completion_ledger),
      (select count(*) from private.student_achievement_awards),
      (select max(version) from supabase_migrations.schema_migrations)
    );`, "SPRINT_11B_UPGRADE_NO_SYNTHETIC_MOTIVATION");
    if (noSynthetic !== "0|0|0|0|0044") throw new Error(`SPRINT_11B_UPGRADE_SYNTHETIC_${noSynthetic}`);
    const evidence = {
      schema: "PLAVE_SPRINT_11B_UPGRADE_PROOF_V1",
      status: "PASS",
      command: "node --no-warnings --experimental-strip-types scripts/run-sprint-11b-migration-upgrade-proof.ts",
      exitCode: 0,
      schemaRange: "0001-0043 -> 0044",
      fixture: "SANITIZED_SPRINT_11A_STATIC_STUDENT",
      snapshotBefore: before.split("|").slice(0, 5),
      snapshotAfter: after.split("|").slice(0, 5),
      checksumsUnchanged: true,
      syntheticMotivationRows: { completedAttempts: 0, learningDays: 0, goals: 0, achievements: 0 },
      failureInjectionRollback: "PASS",
      rollbackContract: "No down migration; operational rollback is transaction rollback before commit or disposable-stack destruction after apply.",
      cleanup: "PENDING",
      remoteMutations: 0,
    };
    writeFileSync(resolve(root, "artifacts/academic-mvp/sprint-11b-upgrade-proof.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    if (!released) await reservation.release();
    if (workdir) cleanup = (await stopDisposableStack(workdir, projectId)).ok;
  }
  if (!cleanup) throw new Error("SPRINT_11B_UPGRADE_CLEANUP_FAILED");
  const path = resolve(root, "artifacts/academic-mvp/sprint-11b-upgrade-proof.json");
  const evidence = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  evidence.cleanup = "PASS";
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write("SPRINT_11B_UPGRADE_0043_TO_0044=PASS\nSPRINT_11B_FAILURE_INJECTION_ROLLBACK=PASS\nSPRINT_11B_UPGRADE_CLEANUP=PASS\n");
}

await main();
