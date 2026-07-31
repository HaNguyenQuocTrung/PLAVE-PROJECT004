import assert from "node:assert/strict";
import test from "node:test";

import {
  auditOutcomeGenerationCoverage,
  generationCoverageSeeds,
  getOfficialOutcomeInventoryCount,
} from "../lib/curriculum/generation-coverage.ts";

test("generation coverage audits all 546 official outcomes by multiple seeds", () => {
  const report = auditOutcomeGenerationCoverage();

  assert.equal(getOfficialOutcomeInventoryCount(), 546);
  assert.equal(report.totalOutcomes, 546);
  assert.equal(report.byGrade.length, 9);
  assert.equal(
    report.byGrade.reduce((sum, grade) => sum + grade.total, 0),
    546,
  );
  assert.equal(generationCoverageSeeds.length, 4);
  assert.equal(
    report.trueParametricOutcomes +
      report.materializedOnlyOutcomes +
      report.insufficientStrategyOutcomes,
    546,
  );
  assert.ok(
    report.outcomes.every(
      (outcome) =>
        outcome.deterministicReplay &&
        outcome.completeQuestionMapping,
    ),
  );
});
