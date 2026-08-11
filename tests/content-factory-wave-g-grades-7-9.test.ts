import assert from "node:assert/strict";
import test from "node:test";
import { gradeSevenWaveGMetadata, gradeSevenWaveGPack, verifyGradeSevenWaveGOracle } from "../lib/content-factory/grade7-wave-g.ts";
import { gradeEightWaveGMetadata, gradeEightWaveGPack, verifyGradeEightWaveGOracle } from "../lib/content-factory/grade8-wave-g.ts";
import { gradeNineWaveGMetadata, gradeNineWaveGPack } from "../lib/content-factory/grade9-wave-g.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { combinedWaveABCDEFGGradePacks } from "../lib/content-factory/wave-g-packs.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

test("Grades 7–9 Wave G bind exact retained data/probability rows", () => {
  assert.deepEqual(gradeSevenWaveGMetadata.sourceOutcomeIds, ["MOET2018-G7-STA-P061-001", "MOET2018-G7-STA-P061-002", "MOET2018-G7-STA-P061-007"]);
  assert.deepEqual(gradeEightWaveGMetadata.sourceOutcomeIds, ["MOET2018-G8-STA-P069-011", "MOET2018-G8-STA-P069-014"]);
  assert.deepEqual(gradeNineWaveGMetadata.sourceOutcomeIds, ["MOET2018-G9-STA-P076-008"]);
});

test("Grades 7–9 Wave G pass oracles, structure diversity and isolation", () => {
  assert.deepEqual(verifyGradeSevenWaveGOracle(), []); assert.deepEqual(verifyGradeEightWaveGOracle(), []);
  for (const pack of [gradeSevenWaveGPack, gradeEightWaveGPack, gradeNineWaveGPack]) {
    assert.equal(pack.questions.length, 24); assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  }
});

test("Wave G A–G graph and duplicate/equivalence audit are clean", () => {
  assert.deepEqual(buildPrerequisiteGraph(combinedWaveABCDEFGGradePacks).diagnostics.filter((entry) => entry.severity !== "INFO"), []);
  assert.deepEqual(validateCrossPackDuplicates(combinedWaveABCDEFGGradePacks), []);
});
