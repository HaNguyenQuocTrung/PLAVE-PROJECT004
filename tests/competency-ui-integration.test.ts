import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildStudentCompetencyDashboard } from "../lib/competency/student-adapter.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import type {
  StudentCurriculumProgress,
} from "../lib/curriculum-runtime/contracts.ts";

function progress(grade: number): StudentCurriculumProgress {
  return {
    grade,
    compatibilityMode:
      grade === 1 ? "LEGACY_GRADE1_AGGREGATED" : "UNIVERSAL_CURRICULUM",
    masteryPolicyVersion: "product-hypothesis-v1",
    masteryExplanation: "PRODUCT_HYPOTHESIS",
    units: [],
    outcomes: [],
    skills: [],
  };
}

test("real student adapter is grade-scoped and does not fabricate missing evidence", () => {
  const model = buildStudentCompetencyDashboard({
    progress: progress(8),
    now: new Date("2026-07-31T00:00:00.000Z"),
    adaptivePilotEnabled: false,
  });
  assert.ok(model);
  assert.equal(model.schoolGrade, 8);
  assert.equal(model.evidenceSource, "CURRENT_STUDENT_CURRICULUM_PROGRESS");
  assert.ok(model.skills.length > 0);
  assert.ok(model.skills.every((skill) => skill.evidenceCount === 0));
  assert.ok(model.skills.every((skill) => skill.confidence === "LOW"));
  assert.ok(model.recommendation);
  assert.equal(model.recommendation.schoolGrade, 8);
});

test("dashboard and learn use server progress adapter, stable Vietnamese copy, and fixed practice links", () => {
  const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
  const learn = readFileSync("app/learn/page.tsx", "utf8");
  const lessons = readFileSync("app/lessons/page.tsx", "utf8");
  const lessonsCatalog = readFileSync("components/UniversalLessonsCatalog.tsx", "utf8");
  const panel = readFileSync("components/CompetencyLearningPathPanel.tsx", "utf8");
  assert.match(dashboard, /buildStudentCompetencyDashboard/u);
  assert.match(dashboard, /CompetencyLearningPathPanel/u);
  assert.match(learn, /buildStudentCompetencyDashboard/u);
  assert.match(learn, /adaptivePilotEnabled: false/u);
  assert.doesNotMatch(learn, /getUniversalCurriculumRuntimeFlag/u);
  assert.match(lessons, /loadStudentCurriculumProgress/u);
  assert.match(lessons, /ReleasedCurriculumCatalog/u);
  assert.match(lessons, /universal\.progress\.units\.map\(\(unit\) => unit\.unitId\)/u);
  assert.match(lessons, /availableUnitIds\.has\(unit\.slug\)/u);
  assert.match(lessons, /availableUnitIds\.has\(selectedRecommendation\.unitId\)/u);
  assert.doesNotMatch(lessons, /buildStudentCompetencyDashboard/u);
  assert.match(lessons, /recordUniversalAvailabilityDiagnostic/u);
  assert.match(lessonsCatalog, /curriculumUnits\.filter\(\(unit\) => unit\.grade === grade\)/u);
  assert.match(lessonsCatalog, /CompetencyLearningPathPanel/u);
  assert.match(panel, /Bài nên học tiếp/u);
  assert.match(panel, /Năng lực của em/u);
  assert.match(panel, /slice\(0, 2\)/u);
  assert.match(panel, /getLessonPath\(recommendation\.candidateId\)/u);
  assert.doesNotMatch(panel, /masteryScore.*input|input.*masteryScore/iu);
});

test("availability is resolved once through server progress and requires the database release path", () => {
  const server = readFileSync("lib/curriculum-runtime/server.ts", "utf8");
  assert.match(server, /resolveUniversalCurriculumAvailability/u);
  assert.match(server, /get_student_curriculum_progress/u);
  assert.match(server, /DB_RELEASE_UNAVAILABLE/u);
  assert.match(server, /getUniversalCurriculumRuntimeFlag/u);
});

test("lesson catalogs remain available when optional scoring is unavailable", () => {
  const server = readFileSync("lib/curriculum-runtime/server.ts", "utf8");
  const lessons = readFileSync("app/lessons/page.tsx", "utf8");
  const catalog = readFileSync(
    "components/UniversalLessonsCatalog.tsx",
    "utf8",
  );

  for (let grade = 1; grade <= 9; grade += 1) {
    assert.ok(
      curriculumUnits.some((unit) => unit.grade === grade),
      `Grade ${grade} must retain at least one curriculum lesson.`,
    );
  }

  assert.match(
    server,
    /if \(!progress \|\| progress\.grade !== access\.grade\)/u,
  );
  assert.doesNotMatch(server, /progress\.grade !== access\.grade \|\| !scoring/u);
  assert.match(lessons, /access\.grade >= 2 && universal\.ok/u);
  assert.match(lessons, /path\.units\.length === 0/u);
  assert.match(catalog, /curriculumUnits\.filter\(\(unit\) => unit\.grade === grade\)/u);
});


test("direct route remains current-user scoped and does not expose competency to parent or anonymous callers", () => {
  const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
  const learn = readFileSync("app/learn/page.tsx", "utf8");
  const lessons = readFileSync("app/lessons/page.tsx", "utf8");
  assert.match(dashboard, /supabase\.auth\.getUser\(\)/u);
  assert.match(dashboard, /profile\.role !== "STUDENT"/u);
  assert.match(learn, /getStudentLearningContext\(\)/u);
  assert.match(lessons, /getStudentLearningContext\(\)/u);
  assert.doesNotMatch(learn, /searchParams.*mastery|request\.json\(\).*mastery/iu);
});
