import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  GenerationV2Error,
  generateQuestion,
} from "../lib/generation-v2/index.ts";

const matrixArtifact = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/outcome-matrix.json", "utf8")) as {
  totalOutcomes: number;
  rows: Array<Record<string, unknown>>;
};
const report = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/report.json", "utf8")) as {
  coverage: { claims546Of546: boolean };
  blockingGate: { decision: string; blockedOutcomeIds: string[] };
};
const variants = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/variant-registry.json", "utf8")) as {
  legacyVariantCount: number;
  canonicalProductVariantCount: number;
  entries: Array<{ classification: string; productRegistryCallable: boolean }>;
};
const diversity = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/diversity.json", "utf8")) as {
  intendedAudit: { samples: number };
  executedAudit: { samples: number };
  blockedSamples: number;
  fullCoveragePass: boolean;
};
const reviewManifestText = readFileSync("artifacts/generator-v2-full-coverage/review-manifest.json", "utf8");

test("Sprint 8C matrix inventories every official outcome without synthetic coverage", () => {
  assert.equal(matrixArtifact.totalOutcomes, 546);
  assert.equal(matrixArtifact.rows.length, 546);
  assert.equal(new Set(matrixArtifact.rows.map((row) => row.outcomeId)).size, 546);
  const required = [
    "outcomeId", "grade", "domain", "unit", "prerequisiteOutcomes", "productFamily",
    "canonicalVariant", "interactionTypes", "parameterPolicy", "difficultyPolicy", "solver",
    "validator", "visualRequirement", "distractorStrategy", "feedbackStrategy",
    "implementationStatus", "productReviewStatus",
  ];
  for (const row of matrixArtifact.rows) {
    for (const field of required) assert.equal(Object.hasOwn(row, field), true, `${String(row.outcomeId)}:${field}`);
  }
});

test("Waves A through F provide exactly 546 explicit callable mappings", () => {
  const implemented = matrixArtifact.rows.filter((row) => row.implementationStatus === "IMPLEMENTED_REVIEW_REQUIRED");
  const blocked = matrixArtifact.rows.filter((row) => row.implementationStatus === "BLOCKED_MISSING_CONTRACT");
  assert.equal(implemented.length, 546);
  assert.equal(blocked.length, 0);
  assert.deepEqual(
    new Set(implemented.map((row) => row.outcomeId)),
    new Set(GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => entry.outcomeId)),
  );
  assert.equal(report.coverage.claims546Of546, true);
});

test("legacy 59 variants and canonical 546 outcome mappings use only the required classifications", () => {
  assert.equal(variants.legacyVariantCount, 59);
  assert.equal(variants.canonicalProductVariantCount, 546);
  assert.equal(variants.entries.length, 605);
  const allowed = new Set(["CANONICAL_PRODUCT_VARIANT", "DUPLICATE_SEMANTICS", "PROOF_ONLY", "SYNTHETIC_WITHOUT_OUTCOME", "UNSAFE", "REPLACED"]);
  for (const entry of variants.entries) assert.equal(allowed.has(entry.classification), true, entry.classification);
  assert.equal(variants.entries.filter((entry) => entry.productRegistryCallable).length, 546);
});

test("the integrated audit processes all 32,760 samples without report stitching", () => {
  assert.equal(diversity.intendedAudit.samples, 32_760);
  assert.equal(diversity.executedAudit.samples, 32_760);
  assert.equal(diversity.blockedSamples, 0);
  assert.equal(diversity.fullCoveragePass, true);
  assert.equal(report.blockingGate.blockedOutcomeIds.length, 0);
});

test("unknown official outcome mapping fails closed with the required error", () => {
  let error: unknown;
  try {
    generateQuestion({ outcomeId: "MOET2018-G1-NUM-NOT-MAPPED", grade: 1, difficulty: "EASY", seed: "sprint8c-fail-closed", locale: "vi-VN" });
  } catch (caught) {
    error = caught;
  }
  assert.equal(error instanceof GenerationV2Error, true);
  assert.equal((error as GenerationV2Error).code, "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED");
  assert.equal((error as Error).message, "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED");
});

test("Owner review samples contain post-submit feedback but no private solution contract", () => {
  for (const forbidden of ["privateSolution", "correctResponse", "acceptedResponses", "rawSeed", "solverReceipt", "solutionSteps"]) {
    assert.equal(reviewManifestText.includes(forbidden), false, forbidden);
  }
  const manifest = JSON.parse(reviewManifestText) as {
    implementedSliceSamples: Array<{ postSubmitFeedback: { correct: { isCorrect: boolean }; incorrect: { isCorrect: boolean } } }>;
  };
  assert.equal(manifest.implementedSliceSamples.length, 1_638);
  for (const sample of manifest.implementedSliceSamples) {
    assert.equal(sample.postSubmitFeedback.correct.isCorrect, true);
    assert.equal(sample.postSubmitFeedback.incorrect.isCorrect, false);
  }
});
