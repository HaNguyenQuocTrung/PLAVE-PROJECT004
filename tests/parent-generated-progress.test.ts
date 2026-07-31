import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeParentGeneratedCurriculumProgress,
  parseParentGeneratedCurriculumProgress,
  parseParentUniversalProgress,
} from "../lib/parent-dashboard/universal-contracts.ts";
import {
  mergeStudentGeneratedCurriculumHistory,
  mergeStudentGeneratedCurriculumProgress,
  parseStudentCurriculumHistory,
  parseStudentCurriculumProgress,
  parseStudentGeneratedCurriculumEvidence,
} from "../lib/curriculum-runtime/contracts.ts";

const timestamp = "2026-07-31T08:00:00.000Z";

function baseProgress(grade: number) {
  return parseParentUniversalProgress({
    student: { display_name: "Học sinh", grade },
    compatibility_mode:
      grade === 1
        ? "LEGACY_GRADE1_AGGREGATED"
        : "UNIVERSAL_CURRICULUM",
    mastery_policy_version: "product-hypothesis-v1",
    mastery_explanation: "Đây là giả thuyết sản phẩm.",
    summary: {
      attempt_count: 1,
      completed_attempt_count: 1,
      started_unit_count: 1,
      completed_unit_count: 1,
      total_answered: 2,
      total_correct: 1,
      accuracy_percent: 50,
      last_activity_at: timestamp,
      mastery_label: "IN_PROGRESS",
    },
    units: [],
    outcomes: [],
    skills: [],
    attempts: [],
    strengths: [],
    needs_practice: [],
    assignment_summary: {
      attempt_count: 0,
      completed_count: 0,
      answered_count: 0,
      correct_count: 0,
      accuracy_percent: null,
      last_activity_at: null,
      evidence_source: "TEACHER_ASSIGNMENT",
    },
    assignment_outcomes: [],
    assignment_skills: [],
  });
}

function generatedSupplement(grade: number) {
  return parseParentGeneratedCurriculumProgress({
    grade,
    combined_summary: {
      attempt_count: 2,
      completed_attempt_count: 1,
      started_unit_count: 2,
      completed_unit_count: 1,
      total_answered: 3,
      total_correct: 2,
      accuracy_percent: 66.7,
      last_activity_at: timestamp,
      mastery_label: "DEVELOPING",
    },
    grade_one_generated: {
      units:
        grade === 1
          ? [
              {
                unit_id: "grade-1-number-foundations-p0",
                title: "Nền tảng số",
                status: "IN_PROGRESS",
                evidence_count: 1,
                correct_count: 1,
                accuracy_percent: 100,
                mastery_label: "IN_PROGRESS",
                last_activity_at: timestamp,
                source: "ON_DEMAND_CURRICULUM",
              },
            ]
          : [],
      outcomes:
        grade === 1
          ? [
              {
                title: "Đọc và viết số",
                evidence_count: 1,
                correct_count: 1,
                accuracy_percent: 100,
                mastery_label: "PROFICIENT",
                last_activity_at: timestamp,
                source: "ON_DEMAND_CURRICULUM",
              },
            ]
          : [],
      skills:
        grade === 1
          ? [
              {
                title: "Biểu diễn số",
                evidence_count: 1,
                correct_count: 0,
                accuracy_percent: 0,
                mastery_label: "NEEDS_PRACTICE",
                last_activity_at: timestamp,
                source: "ON_DEMAND_CURRICULUM",
              },
            ]
          : [],
      attempts:
        grade === 1
          ? [
              {
                attempt_id: "11111111-1111-4111-8111-111111111111",
                unit_title: "Nền tảng số",
                status: "IN_PROGRESS",
                answered_count: 1,
                correct_count: 1,
                total_questions: 12,
                started_at: timestamp,
                completed_at: null,
                source: "UNIVERSAL_CURRICULUM",
              },
            ]
          : [],
    },
  });
}

test("Grade 1 parent read model includes generated unit, outcome, skill and history", () => {
  const base = baseProgress(1);
  const generated = generatedSupplement(1);
  assert.ok(base);
  assert.ok(generated);
  const merged = mergeParentGeneratedCurriculumProgress(base, generated);
  assert.ok(merged);
  assert.equal(merged.summary.totalAnswered, 3);
  assert.equal(merged.units[0]?.unitId, "grade-1-number-foundations-p0");
  assert.equal(merged.outcomes[0]?.title, "Đọc và viết số");
  assert.equal(merged.skills[0]?.title, "Biểu diễn số");
  assert.equal(merged.attempts.length, 1);
  assert.equal(merged.strengths.length, 1);
  assert.equal(merged.needsPractice.length, 1);
});

test("Grades 2–9 replace the summary without duplicating universal evidence", () => {
  for (let grade = 2; grade <= 9; grade += 1) {
    const base = baseProgress(grade);
    const generated = generatedSupplement(grade);
    assert.ok(base);
    assert.ok(generated);
    const merged = mergeParentGeneratedCurriculumProgress(base, generated);
    assert.ok(merged);
    assert.equal(merged.summary.totalAnswered, 3);
    assert.deepEqual(merged.units, base.units);
    assert.deepEqual(merged.outcomes, base.outcomes);
    assert.deepEqual(merged.skills, base.skills);
  }
});

test("parent generated supplement fails closed on grade mismatch", () => {
  const base = baseProgress(8);
  const generated = generatedSupplement(7);
  assert.ok(base);
  assert.ok(generated);
  assert.equal(
    mergeParentGeneratedCurriculumProgress(base, generated),
    null,
  );
});

test("Grade 1 Student progress and history include generated evidence", () => {
  const baseProgress = parseStudentCurriculumProgress({
    grade: 1,
    compatibility_mode: "LEGACY_GRADE1_AGGREGATED",
    mastery_policy_version: "product-hypothesis-v1",
    mastery_explanation: "Giả thuyết sản phẩm.",
    units: [],
    outcomes: [],
    skills: [],
  });
  const baseHistory = parseStudentCurriculumHistory({
    grade: 1,
    attempts: [],
  });
  const generated = parseStudentGeneratedCurriculumEvidence({
    grade: 1,
    units: [
      {
        unit_id: "grade-1-number-foundations-p0",
        title: "Nền tảng số",
        status: "COMPLETED",
        evidence_count: 12,
        correct_count: 10,
        best_score_percent: 83.3,
        mastery_label: "PROFICIENT",
        last_activity_at: timestamp,
        source: "UNIVERSAL_CURRICULUM",
      },
    ],
    outcomes: [
      {
        title: "Đọc và viết số",
        evidence_count: 3,
        correct_count: 2,
        mastery_label: "DEVELOPING",
        last_activity_at: timestamp,
        evidence_basis: "AUTHORITATIVE_QUESTION_MAPPING",
      },
    ],
    skills: [
      {
        title: "Biểu diễn số",
        evidence_count: 3,
        correct_count: 2,
        mastery_label: "DEVELOPING",
        last_activity_at: timestamp,
        evidence_basis: "AUTHORITATIVE_QUESTION_MAPPING",
      },
    ],
    attempts: [
      {
        attempt_id: "11111111-1111-4111-8111-111111111111",
        unit_id: "grade-1-number-foundations-p0",
        unit_title: "Nền tảng số",
        status: "COMPLETED",
        answered_count: 12,
        correct_count: 10,
        total_questions: 12,
        started_at: timestamp,
        completed_at: timestamp,
        source: "UNIVERSAL_CURRICULUM",
      },
    ],
  });
  assert.ok(baseProgress);
  assert.ok(baseHistory);
  assert.ok(generated);
  const progress = mergeStudentGeneratedCurriculumProgress(
    baseProgress,
    generated,
  );
  const history = mergeStudentGeneratedCurriculumHistory(
    baseHistory,
    generated,
  );
  assert.equal(progress?.units.length, 1);
  assert.equal(progress?.outcomes.length, 1);
  assert.equal(progress?.skills.length, 1);
  assert.equal(history?.attempts.length, 1);
});
