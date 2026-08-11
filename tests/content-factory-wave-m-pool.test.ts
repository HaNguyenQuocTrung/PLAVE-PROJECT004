import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { frozenCombinedAKBundleHash } from "../lib/content-factory/wave-l-audit.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { buildWaveMAdaptiveSupportInventory, verifyWaveMPoolResolutions, waveMCorrectiveOverlay } from "../lib/content-factory/wave-m.ts";

test("Wave M resolves exactly thirteen single-structure pools without claiming adaptive mastery", () => {
  const result = verifyWaveMPoolResolutions(combinedWaveABCDEFGHIJKGradePacks);
  assert.equal(result.status, "PASSED");
  assert.deepEqual(result.counts, { adaptiveOverlay: 0, fixedSafe: 13, unavailable: 0 });
  assert.ok(result.rows.every((row) => row.resolution === "FIXED_SAFE_SUPPORTED"));
  assert.ok(result.rows.every((row) => row.adaptiveMasteryClaim === false));
  assert.ok(result.rows.every((row) => row.reasoningStructureCount === 1));
  assert.ok(result.rows.every((row) => row.questionCount >= 6));
  assert.ok(result.rows.every((row) => row.sourceReferenceIds.length > 0));
  assert.ok(result.rows.every((row) => row.fixedSequenceQuestionIds.length === row.questionCount));
});

test("pool-limited accounting remains exact by grade", () => {
  const rows = verifyWaveMPoolResolutions(combinedWaveABCDEFGHIJKGradePacks).rows;
  const counts = Object.fromEntries([2, 5, 6, 7, 8, 9].map((grade) => [grade, rows.filter((row) => row.grade === grade).length]));
  assert.deepEqual(counts, { 2: 3, 5: 1, 6: 3, 7: 2, 8: 2, 9: 2 });
  assert.equal(rows.some((row) => [1, 3, 4].includes(row.grade)), false);
});

test("fixed-safe pools always leave a same-grade future action", () => {
  const rows = verifyWaveMPoolResolutions(combinedWaveABCDEFGHIJKGradePacks).rows;
  assert.ok(rows.every((row) => row.nextActionOnCompletion === "ADVANCE_TO_ELIGIBLE_SAME_GRADE_SKILL"));
  assert.ok(rows.every((row) => row.curriculumExpanded === false && row.aKArtifactsMutated === false));
});

test("empty corrective overlay is deterministic and excluded from production bundles", () => {
  const core = { schemaVersion: waveMCorrectiveOverlay.schemaVersion, policyVersion: waveMCorrectiveOverlay.policyVersion,
    questions: waveMCorrectiveOverlay.questions, reasonCode: waveMCorrectiveOverlay.reasonCode,
    productionBundleMember: waveMCorrectiveOverlay.productionBundleMember, aKArtifactsMutated: waveMCorrectiveOverlay.aKArtifactsMutated };
  assert.equal(waveMCorrectiveOverlay.questions.length, 0);
  assert.equal(waveMCorrectiveOverlay.productionBundleMember, false);
  assert.equal(sha256(canonicalize(core)), waveMCorrectiveOverlay.overlayHash);
});

test("adaptive, fixed-safe and shadow states remain separate", () => {
  const inventory = buildWaveMAdaptiveSupportInventory(combinedWaveABCDEFGHIJKGradePacks);
  assert.deepEqual(inventory.totals, { adaptiveReady: 274, fixedSafe: 13, shadowOnly: 51, unavailable: 0 });
  assert.equal(inventory.grades.find((grade) => grade.grade === 1)?.gradeSupport, "FIXED_RUNTIME_WITH_SHADOW_EVIDENCE");
  assert.equal(inventory.grades.find((grade) => grade.grade === 3)?.gradeSupport, "ADAPTIVE_READY");
  assert.equal(inventory.grades.find((grade) => grade.grade === 4)?.gradeSupport, "ADAPTIVE_READY");
});

test("A-K content bundle and release isolation remain frozen", () => {
  assert.equal(buildDeterministicBundle(combinedWaveABCDEFGHIJKGradePacks).bundleHash, frozenCombinedAKBundleHash);
  assert.equal(combinedWaveABCDEFGHIJKGradePacks.reduce((sum, pack) => sum + pack.questions.length, 0), 2_772);
  assert.ok(combinedWaveABCDEFGHIJKGradePacks.every((pack) => pack.release.publication === "DRAFT"
    && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled));
});
