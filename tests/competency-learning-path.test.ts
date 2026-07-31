import assert from "node:assert/strict";
import test from "node:test";

import {
  computeSkillCompetency,
  recommendNextLearningPath,
  type CompetencyEvidence,
  type LearningPathCandidate,
} from "../lib/competency/engine.ts";
import {
  toCompetencyViewModel,
  toLearningPathViewModel,
} from "../lib/competency/view-model.ts";

const now = new Date("2026-07-31T00:00:00.000Z");

function evidence(
  overrides: Partial<CompetencyEvidence> = {},
): CompetencyEvidence {
  return {
    evidenceId: "e-1",
    skillId: "skill-1",
    schoolGrade: 1,
    submittedAt: "2026-07-30T00:00:00.000Z",
    correct: true,
    difficulty: "MEDIUM",
    hintUsed: false,
    retentionCheck: false,
    accepted: true,
    duplicate: false,
    casConflict: false,
    ...overrides,
  };
}

test("no evidence is explicit and low-confidence, never a diagnosis", () => {
  const result = computeSkillCompetency({
    skillId: "skill-1",
    schoolGrade: 1,
    evidence: [],
    now,
  });
  assert.deepEqual(
    {
      score: result.masteryScore,
      confidence: result.confidence,
      count: result.evidenceCount,
      status: result.status,
      due: result.retentionDueAt,
    },
    { score: 0, confidence: "LOW", count: 0, status: "NOT_STARTED", due: null },
  );
  assert.match(result.explanation, /PRODUCT_HYPOTHESIS/u);
});

test("duplicate submissions and CAS conflicts do not increase evidence", () => {
  const result = computeSkillCompetency({
    skillId: "skill-1",
    schoolGrade: 1,
    evidence: [
      evidence(),
      evidence({ duplicate: true, evidenceId: "e-1" }),
      evidence({ casConflict: true, evidenceId: "e-2" }),
      evidence({ accepted: false, evidenceId: "e-3" }),
    ],
    now,
  });
  assert.equal(result.evidenceCount, 1);
});

test("sparse, mixed, and retention evidence are deterministic and bounded", () => {
  const input = {
    skillId: "skill-1",
    schoolGrade: 1,
    now,
  } as const;
  const sparse = computeSkillCompetency({
    ...input,
    evidence: [evidence({ correct: false, hintUsed: true })],
  });
  const mixed = computeSkillCompetency({
    ...input,
    evidence: [
      evidence({ evidenceId: "e-1", correct: true, retentionCheck: true }),
      evidence({ evidenceId: "e-2", correct: false, difficulty: "HARD" }),
      evidence({ evidenceId: "e-3", correct: true, hintUsed: true }),
    ],
  });
  assert.equal(sparse.confidence, "LOW");
  assert.ok(mixed.masteryScore >= 0 && mixed.masteryScore <= 100);
  assert.equal(mixed.retentionDueAt, "2026-08-20T00:00:00.000Z");
  assert.deepEqual(
    mixed,
    computeSkillCompetency({ ...input, evidence: [
      evidence({ evidenceId: "e-1", correct: true, retentionCheck: true }),
      evidence({ evidenceId: "e-2", correct: false, difficulty: "HARD" }),
      evidence({ evidenceId: "e-3", correct: true, hintUsed: true }),
    ] }),
  );
});

test("Grades 1–9 get independent deterministic competencies and grade isolation", () => {
  for (let grade = 1; grade <= 9; grade += 1) {
    const result = computeSkillCompetency({
      skillId: `g${grade}-skill`,
      schoolGrade: grade,
      evidence: [
        evidence({
          evidenceId: `g${grade}-e1`,
          skillId: `g${grade}-skill`,
          schoolGrade: grade,
        }),
      ],
      now,
    });
    assert.equal(result.schoolGrade, grade);
    assert.equal(result.evidenceCount, 1);
    assert.equal(
      computeSkillCompetency({
        skillId: `g${grade}-skill`,
        schoolGrade: grade + 1,
        evidence: [
          evidence({
            evidenceId: `g${grade}-e1`,
            skillId: `g${grade}-skill`,
            schoolGrade: grade,
          }),
        ],
        now,
      }).evidenceCount,
      0,
    );
  }
});

function candidate(overrides: Partial<LearningPathCandidate> = {}): LearningPathCandidate {
  return {
    candidateId: "candidate-1",
    skillId: "skill-1",
    schoolGrade: 1,
    title: "Phép cộng có nhớ",
    curriculumOrder: 1,
    sequenceRelevance: 90,
    unfinishedEngagement: 0,
    active: true,
    visible: true,
    pilotOnly: false,
    prerequisiteSkillIds: [],
    ...overrides,
  };
}

test("recommendation is explainable, grade-safe, and blocks unmet prerequisites or disabled pilot content", () => {
  const secure = computeSkillCompetency({
    skillId: "prereq",
    schoolGrade: 8,
    evidence: Array.from({ length: 8 }, (_, index) =>
      evidence({
        evidenceId: `p-${index}`,
        skillId: "prereq",
        schoolGrade: 8,
        submittedAt: "2026-07-30T00:00:00.000Z",
      }),
    ),
    now,
  });
  const recommendation = recommendNextLearningPath({
    schoolGrade: 8,
    competencies: [secure],
    candidates: [
      candidate({ schoolGrade: 7, candidateId: "wrong-grade" }),
      candidate({ candidateId: "blocked", prerequisiteSkillIds: ["missing"] }),
      candidate({ candidateId: "pilot", pilotOnly: true }),
      candidate({
        candidateId: "next",
        schoolGrade: 8,
        skillId: "next-skill",
        title: "Hàm số bậc nhất",
        prerequisiteSkillIds: ["prereq"],
        unfinishedEngagement: 40,
      }),
    ],
    now,
    adaptivePilotEnabled: false,
  });
  assert.ok(recommendation);
  assert.equal(recommendation.candidateId, "next");
  assert.equal(recommendation.schoolGrade, 8);
  assert.ok(recommendation.reasonCodes.includes("NO_EVIDENCE"));
  assert.match(recommendation.explanation, /Hàm số bậc nhất/u);
});

test("view models expose Vietnamese labels and hypothesis status without UI or database coupling", () => {
  const competency = computeSkillCompetency({ skillId: "skill-1", schoolGrade: 1, evidence: [], now });
  const competencyVm = toCompetencyViewModel([competency]);
  const pathVm = toLearningPathViewModel(null);
  assert.equal(competencyVm.title, "Năng lực của em");
  assert.equal(pathVm.title, "Bài nên học tiếp");
  assert.equal(competencyVm.productHypothesis, true);
  assert.equal(pathVm.productHypothesis, true);
});
