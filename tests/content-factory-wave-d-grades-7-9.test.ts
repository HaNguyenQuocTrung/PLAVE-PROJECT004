import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { gradeSevenWaveDMetadata, gradeSevenWaveDPack, verifyGradeSevenWaveDRootOracle } from "../lib/content-factory/grade7-wave-d.ts";
import { gradeEightWaveDMetadata, gradeEightWaveDPack, verifyGradeEightWaveDSlopeOracle } from "../lib/content-factory/grade8-wave-d.ts";
import { gradeNineWaveDMetadata, gradeNineWaveDPack, verifyGradeNineWaveDCircleAngleOracle } from "../lib/content-factory/grade9-wave-d.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";
import { combinedWaveABCDGradePacks } from "../lib/content-factory/wave-d-packs.ts";

test("Grades 7–9 Wave D bind exactly to the retained uncovered rows", () => {
  assert.deepEqual(gradeSevenWaveDMetadata.sourceOutcomeIds, ["MOET2018-G7-NAA-P058-033", "MOET2018-G7-NAA-P058-034", "MOET2018-G7-NAA-P058-035"]);
  assert.deepEqual(gradeEightWaveDMetadata.sourceOutcomeIds, ["MOET2018-G8-NAA-P064-009", "MOET2018-G8-NAA-P064-013"]);
  assert.deepEqual(gradeNineWaveDMetadata.sourceOutcomeIds, ["MOET2018-G9-GEO-P075-020", "MOET2018-G9-GEO-P075-021"]);
  assert.deepEqual([gradeSevenWaveDMetadata.sourcePages, gradeEightWaveDMetadata.sourcePages, gradeNineWaveDMetadata.sourcePages], [[58], [64], [75]]);
});

test("Grades 7–9 Wave D pass independent oracles, evidence, isolation and deterministic gates", () => {
  assert.deepEqual(verifyGradeSevenWaveDRootOracle(), []);
  assert.deepEqual(verifyGradeEightWaveDSlopeOracle(), []);
  assert.deepEqual(verifyGradeNineWaveDCircleAngleOracle(), []);
  for (const pack of [gradeSevenWaveDPack, gradeEightWaveDPack, gradeNineWaveDPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.equal(pack.production?.verificationInsufficient, 0);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.equal(buildDeterministicBundle([pack]).bundleHash, buildDeterministicBundle([pack]).bundleHash);
  }
});

test("Grades 7–9 Wave D graph and A+B+C+D duplicate audit are clean", () => {
  const graph = buildPrerequisiteGraph(combinedWaveABCDGradePacks);
  assert.deepEqual(graph.diagnostics.filter((entry) => entry.severity !== "INFO"), []);
  assert.deepEqual(validateCrossPackDuplicates(combinedWaveABCDGradePacks), []);
});
