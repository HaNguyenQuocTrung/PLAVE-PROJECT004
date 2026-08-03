import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAVE_SCORING_POLICY_V1,
  calculateAttemptScore,
  calculateMasteryProjection,
  roundHalfUpRatio,
  xpForFirstTerminalCorrect,
  type MasteryEvidence,
} from "../lib/scoring/policy-v1.ts";

const evidence = (
  id: number,
  isCorrect: boolean,
  difficulty: MasteryEvidence["difficulty"] = "MEDIUM",
): MasteryEvidence => ({
  evidenceId: `evidence-${id}`,
  difficulty,
  isCorrect,
  answeredAt: new Date(Date.UTC(2026, 7, 1, 0, id)).toISOString(),
});
test("PLAVE_SCORING_POLICY_V1 computes weighted attempt score with half-up rounding", () => {
  assert.deepEqual(
    calculateAttemptScore([
      { difficulty: "EASY", isCorrect: true },
      { difficulty: "MEDIUM", isCorrect: false },
      { difficulty: "HARD", isCorrect: true },
    ]),
    {
      policyVersion: PLAVE_SCORING_POLICY_V1,
      earnedWeight: 4,
      possibleWeight: 6,
      scorePercent: 67,
    },
  );
  assert.equal(roundHalfUpRatio(1250, 100), 13);
  assert.throws(() => calculateAttemptScore([]), /SCORING:EMPTY_ATTEMPT/u);
});

test("XP is awarded only for the first terminal correct result", () => {
  assert.equal(xpForFirstTerminalCorrect("EASY", true), 10);
  assert.equal(xpForFirstTerminalCorrect("MEDIUM", true), 15);
  assert.equal(xpForFirstTerminalCorrect("HARD", true), 20);
  assert.equal(xpForFirstTerminalCorrect("HARD", false), 0);
});

test("mastery uses the latest ten distinct evidence units and exact weights", () => {
  const projection = calculateMasteryProjection({
    evidence: Array.from({ length: 12 }, (_, index) =>
      evidence(index + 1, index >= 2, index % 3 === 0 ? "HARD" : "MEDIUM"),
    ),
  });
  assert.equal(projection.evidenceCount, 10);
  assert.equal(projection.correctCount, 10);
  assert.equal(projection.masteryPercent, 100);
  assert.equal(projection.status, "MASTERED");
  assert.equal(projection.mediumHardCorrectCount, 10);
  assert.equal(projection.activeEvidenceIds[0], "evidence-12");
});

test("EASY-only evidence cannot mark an outcome mastered", () => {
  const projection = calculateMasteryProjection({
    evidence: Array.from({ length: 10 }, (_, index) =>
      evidence(index + 1, true, "EASY"),
    ),
  });
  assert.equal(projection.masteryPercent, 100);
  assert.equal(projection.mediumHardCorrectCount, 0);
  assert.equal(projection.status, "PROFICIENT");
});

test("mastery status thresholds and NEEDS_REVIEW regression are explicit", () => {
  assert.equal(
    calculateMasteryProjection({ evidence: [evidence(1, true)] }).status,
    "IN_PROGRESS",
  );
  assert.equal(
    calculateMasteryProjection({
      evidence: Array.from({ length: 5 }, (_, index) =>
        evidence(index + 1, index < 2),
      ),
    }).status,
    "DEVELOPING",
  );
  assert.equal(
    calculateMasteryProjection({
      evidence: Array.from({ length: 5 }, (_, index) =>
        evidence(index + 1, index < 3),
      ),
    }).status,
    "PROFICIENT",
  );
  assert.equal(
    calculateMasteryProjection({
      evidence: Array.from({ length: 5 }, (_, index) =>
        evidence(index + 1, index === 0),
      ),
      previouslyMastered: true,
    }).status,
    "NEEDS_REVIEW",
  );
});

test("duplicate mastery evidence is rejected instead of counted twice", () => {
  const duplicate = evidence(1, true);
  assert.throws(
    () => calculateMasteryProjection({ evidence: [duplicate, duplicate] }),
    /SCORING:DUPLICATE_MASTERY_EVIDENCE/u,
  );
});
