import assert from "node:assert/strict";
import test from "node:test";
import { gradeSevenWaveEMetadata, gradeSevenWaveEPack, verifyGradeSevenWaveEOracle } from "../lib/content-factory/grade7-wave-e.ts";
import { gradeEightWaveEMetadata, gradeEightWaveEPack, verifyGradeEightWaveEOracle } from "../lib/content-factory/grade8-wave-e.ts";
import { gradeNineWaveEMetadata, gradeNineWaveEPack, verifyGradeNineWaveEOracle } from "../lib/content-factory/grade9-wave-e.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { combinedWaveABCDEGradePacks } from "../lib/content-factory/wave-e-packs.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

test("Grades 7–9 Wave E bind exact solid-measurement source rows", () => {
  assert.deepEqual(gradeSevenWaveEMetadata.sourceOutcomeIds, ["MOET2018-G7-GEO-P058-001", "MOET2018-G7-GEO-P058-005"]);
  assert.deepEqual(gradeEightWaveEMetadata.sourceOutcomeIds, ["MOET2018-G8-GEO-P065-001", "MOET2018-G8-GEO-P065-005"]);
  assert.deepEqual(gradeNineWaveEMetadata.sourceOutcomeIds, ["MOET2018-G9-GEO-P073-001", "MOET2018-G9-GEO-P073-006", "MOET2018-G9-GEO-P073-007"]);
});

test("Grades 7–9 Wave E pass solid-measurement oracles and isolation", () => {
  assert.deepEqual(verifyGradeSevenWaveEOracle(), []);
  assert.deepEqual(verifyGradeEightWaveEOracle(), []);
  assert.deepEqual(verifyGradeNineWaveEOracle(), []);
  for (const pack of [gradeSevenWaveEPack, gradeEightWaveEPack, gradeNineWaveEPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  }
});

test("Wave E A–E graph and duplicate/equivalence audit remain clean", () => {
  assert.deepEqual(buildPrerequisiteGraph(combinedWaveABCDEGradePacks).diagnostics.filter((entry) => entry.severity !== "INFO"), []);
  assert.deepEqual(validateCrossPackDuplicates(combinedWaveABCDEGradePacks), []);
});
