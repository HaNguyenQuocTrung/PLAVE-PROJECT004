import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildGradesTwoToNineDatabaseRelease,
  FROZEN_COMBINED_A_K_HASH,
} from "../lib/release-integration/inventory.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import {
  authorizeGradesTwoToNineRelease,
  parseGradesTwoToNineReleaseMode,
} from "../lib/release-integration/release-mode.ts";
import {
  buildSanitizedPostgresEnvironment,
  parseDisposableLocalReleaseTarget,
} from "../lib/release-integration/local-target.ts";
import {
  parseReleasedCatalog,
  parseReleasedUnitDetail,
} from "../lib/release-integration/catalog.ts";
import {
  buildGradesTwoToNineReleaseIntegrationReceipt,
  RELEASE_INTEGRATION_CHECKSUM_PATH,
  RELEASE_INTEGRATION_RECEIPT_PATH,
} from "../lib/release-integration/receipt.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/0045_grades_2_9_local_public_release.sql");
const activation = source("supabase/operations/grades-2-9-local-release/ACTIVATE_PUBLIC.sql");
const deactivation = source("supabase/operations/grades-2-9-local-release/DEACTIVATE.sql");

test("canonical database release is deterministic and matches every frozen grade count", () => {
  const first = buildGradesTwoToNineDatabaseRelease();
  const second = buildGradesTwoToNineDatabaseRelease();
  assert.equal(first.inventoryHash, second.inventoryHash);
  assert.equal(first.frozenCombinedAKHash, FROZEN_COMBINED_A_K_HASH);
  assert.deepEqual(first.totals, {
    grades: 8,
    units: 163,
    runtimeUnits: 128,
    skills: 287,
    adaptiveSkills: 274,
    fixedSafeSkills: 13,
    questions: 2460,
    solutions: 2460,
  });
  assert.deepEqual(first.grades.map((grade) => ({
    grade: grade.summary.grade,
    questions: grade.summary.questions,
    skills: grade.summary.skills,
    units: grade.summary.units,
  })), [
    { grade: 2, questions: 264, skills: 37, units: 17 },
    { grade: 3, questions: 306, skills: 41, units: 18 },
    { grade: 4, questions: 319, skills: 34, units: 16 },
    { grade: 5, questions: 312, skills: 34, units: 16 },
    { grade: 6, questions: 485, skills: 61, units: 26 },
    { grade: 7, questions: 246, skills: 25, units: 22 },
    { grade: 8, questions: 228, skills: 22, units: 23 },
    { grade: 9, questions: 300, skills: 33, units: 25 },
  ]);
  assert.equal(first.grades.flatMap((grade) => grade.questions).some((question) =>
    question.prompt.includes(question.questionId)), false);
  const solutionByQuestion = new Map(first.grades.flatMap((grade) => grade.solutions)
    .map((solution) => [solution.questionId, solution]));
  for (const question of first.grades.flatMap((grade) => grade.questions)) {
    const solution = solutionByQuestion.get(question.questionId);
    assert.ok(solution);
    if (question.answerType === "MULTIPLE_CHOICE") {
      assert.match(solution.correctAnswer, /^[A-D]$/u);
      assert.ok(question.options?.some((option) => option.key === solution.correctAnswer));
    }
  }
});

test("release mode defaults hidden and PUBLIC never bypasses grade, role, tuple, or flags", () => {
  assert.deepEqual(parseGradesTwoToNineReleaseMode(undefined), { mode: "HIDDEN", valid: false, reason: "UNSET" });
  assert.deepEqual(parseGradesTwoToNineReleaseMode("public"), { mode: "HIDDEN", valid: false, reason: "MALFORMED" });
  assert.deepEqual(parseGradesTwoToNineReleaseMode("PUBLIC"), { mode: "PUBLIC", valid: true });
  const allowed = {
    applicationMode: "PUBLIC" as const,
    databaseMode: "PUBLIC" as const,
    authenticated: true,
    role: "STUDENT" as const,
    schoolGrade: 6,
    releaseGrade: 6,
    exactTupleMatches: true,
    applicationRuntimeEnabled: true,
    databaseRuntimeEnabled: true,
    pilotEntitled: false,
  };
  assert.deepEqual(authorizeGradesTwoToNineRelease(allowed), { allowed: true, mode: "PUBLIC" });
  assert.deepEqual(authorizeGradesTwoToNineRelease({ ...allowed, role: "PARENT" }), { allowed: false, reason: "STUDENT_REQUIRED" });
  assert.deepEqual(authorizeGradesTwoToNineRelease({ ...allowed, schoolGrade: 5 }), { allowed: false, reason: "GRADE_MISMATCH" });
  assert.deepEqual(authorizeGradesTwoToNineRelease({ ...allowed, exactTupleMatches: false }), { allowed: false, reason: "TUPLE_MISMATCH" });
  assert.deepEqual(authorizeGradesTwoToNineRelease({ ...allowed, applicationMode: "HIDDEN" }), { allowed: false, reason: "HIDDEN" });
  assert.deepEqual(authorizeGradesTwoToNineRelease({ ...allowed, applicationMode: "PILOT", databaseMode: "PILOT" }), { allowed: false, reason: "PILOT_ENTITLEMENT_REQUIRED" });
});

test("0045 is additive, hidden by default, private-solution bound, and fail closed", () => {
  assert.match(migration, /create table public\.curriculum_grade_release_policies/);
  assert.match(migration, /create table public\.curriculum_release_skills/);
  assert.match(migration, /create table public\.curriculum_release_pilot_entitlements/);
  assert.match(migration, /release_mode text not null default 'HIDDEN'/);
  assert.match(migration, /candidate_bundle_sha256/);
  assert.match(migration, /combined_a_k_sha256/);
  assert.match(migration, /private\.curriculum_release_solutions/);
  assert.match(migration, /revoke all on public\.curriculum_grade_release_policies from public, anon, authenticated/);
  assert.match(migration, /DEFAULT_ENTITLEMENT_FORBIDDEN/);
  assert.match(migration, /start_or_resume_released_curriculum_unit/);
  assert.match(migration, /profile\.role = 'STUDENT'/);
  assert.match(migration, /student\.grade = p_grade/);
  assert.match(migration, /policy\.release_mode = 'PUBLIC'[\s\S]+curriculum_release_pilot_entitlements/);
  assert.match(migration, /structure_occurrence/);
  assert.match(migration, /skill_occurrence/);
  assert.match(migration, /prior_answer/);
  assert.match(migration, /limit 12/);
  assert.match(migration, /support_mode='FIXED_SAFE'/);
  assert.match(migration, /rebuild_curriculum_adaptive_projections_0045/);
  assert.match(migration, /v_question\.support_mode='FIXED_SAFE'/);
  assert.doesNotMatch(migration, /delete from private\.student_mastery_evidence/);
  assert.doesNotMatch(migration, /(?:insert into|update|delete from) public\.(?:practice_attempts|practice_answers|learning_units|questions|question_solutions)/i);
});

test("activation and deactivation are exact, atomic, and preserve attempts/history", () => {
  assert.match(activation, /^\\set ON_ERROR_STOP on/);
  assert.match(activation, /begin;[\s\S]+for update[\s\S]+commit;/);
  assert.match(activation, /v_questions<>2460/);
  assert.match(activation, /v_skills<>287/);
  assert.match(activation, /release_mode='PUBLIC'/);
  assert.doesNotMatch(activation, /insert into public\.curriculum_release_pilot_entitlements/);
  assert.doesNotMatch(activation, /(?:insert into|update|delete from) public\.(?:curriculum_attempts|curriculum_answers)/i);
  assert.match(deactivation, /release_mode='HIDDEN'/);
  assert.doesNotMatch(deactivation, /delete from/);
  assert.doesNotMatch(deactivation, /truncate/);
});

test("catalog parsers accept only released own-grade public payloads without solutions", () => {
  const catalog = parseReleasedCatalog({
    grade: 7,
    release_mode: "PUBLIC",
    candidate_id: "g7-combined-wave-a-b-c-d-e-f-g-h-i-j-k",
    candidate_version: "g7-combined-1.0.0-wave-k",
    candidate_bundle_sha256: "a".repeat(64),
    policy_version: "g7-combined-policy-1.0.0-wave-k",
    units: [{ unit_id: "grade-7-data", grade: 7, domain: "STATISTICS_AND_PROBABILITY", title: "Dữ liệu", description: "Đọc và phân tích dữ liệu.", learning_goals: ["Đọc dữ liệu"], total_questions: 12, display_order: 1 }],
  });
  assert.ok(catalog);
  assert.equal(parseReleasedCatalog({ ...catalog, release_mode: "HIDDEN" }), null);
  const unit = parseReleasedUnitDetail({
    unit_id: "grade-7-data", grade: 7, domain: "STATISTICS_AND_PROBABILITY", title: "Dữ liệu",
    description: "Đọc và phân tích dữ liệu.", learning_goals: ["Đọc dữ liệu"], total_questions: 12,
    display_order: 1, theory: [{ title: "Dữ liệu", explanation: ["Đọc dữ liệu"] }], worked_examples: [],
  });
  assert.ok(unit);
  assert.equal("correctAnswer" in (unit ?? {}), false);
});

test("local launcher rejects remote/unclassified targets and creates an allowlisted child environment", () => {
  assert.throws(() => parseDisposableLocalReleaseTarget("postgresql://u:p@127.0.0.1/db", undefined), /CLASSIFICATION_REQUIRED/);
  assert.throws(() => parseDisposableLocalReleaseTarget("postgresql://u:p@example.com/db", "DISPOSABLE_LOCAL"), /REMOTE_TARGET_FORBIDDEN/);
  const target = parseDisposableLocalReleaseTarget("postgresql://local_user:synthetic@127.0.0.1:5432/plave_local", "DISPOSABLE_LOCAL");
  const child = buildSanitizedPostgresEnvironment(target, "/usr/bin:/bin");
  assert.deepEqual(Object.keys(child).sort(), ["LANG", "LC_ALL", "PATH", "PGDATABASE", "PGHOST", "PGPASSWORD", "PGPORT", "PGUSER"]);
  assert.equal("SUPABASE_ACCESS_TOKEN" in child, false);
  const launcher = source("scripts/run-local-grades-1-9-release.ts");
  assert.doesNotMatch(launcher, /\.env\.local|\.\.\.process\.env|npx|docker|3000/);
});

test("runtime and UI use database release RPCs without exposing technical labels", () => {
  const start = source("app/api/curriculum-runtime/start/route.ts");
  const server = source("lib/curriculum-runtime/server.ts");
  const catalog = source("components/ReleasedCurriculumCatalog.tsx");
  const lesson = source("components/ReleasedCurriculumLesson.tsx");
  assert.match(start, /get_my_grades_2_9_release_catalog/);
  assert.match(start, /start_or_resume_released_curriculum_unit/);
  assert.match(server, /get_my_released_curriculum_progress/);
  assert.match(server, /get_my_grades_2_9_release_unit/);
  assert.match(catalog, /Bắt đầu|Mở bài học/);
  assert.match(lesson, /Bắt đầu luyện tập/);
  assert.doesNotMatch(`${catalog}\n${lesson}`, /candidate|bundle|hash|pilot|fixed-safe/i);
});

test("release receipt binds the current source scope without changing frozen A-K", () => {
  const first = buildGradesTwoToNineReleaseIntegrationReceipt();
  const second = buildGradesTwoToNineReleaseIntegrationReceipt();
  assert.deepEqual(second, first);
  assert.equal(first.receipt.combinedAKHash, FROZEN_COMBINED_A_K_HASH);
  assert.equal(first.receipt.inventoryTotals.questions, 2_460);
  assert.equal(first.receipt.inventoryTotals.adaptiveSkills, 274);
  assert.equal(first.receipt.inventoryTotals.fixedSafeSkills, 13);
  assert.equal(first.receipt.migrations.count, 45);
  assert.equal(first.receipt.localDatabaseProof.publishedPorts, 0);
  assert.equal(first.receipt.networkAttempts, 0);
  assert.match(first.receipt.receiptHash, /^[0-9a-f]{64}$/u);
  assert.match(first.checksumManifest.manifestHash, /^[0-9a-f]{64}$/u);
  assert.equal(
    source(RELEASE_INTEGRATION_RECEIPT_PATH),
    `${canonicalize(first.receipt)}\n`,
  );
  assert.equal(
    source(RELEASE_INTEGRATION_CHECKSUM_PATH),
    `${canonicalize(first.checksumManifest)}\n`,
  );
});
