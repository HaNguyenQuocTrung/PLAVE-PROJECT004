import assert from "node:assert/strict";
import test from "node:test";
import { gradeSevenWaveFMetadata, gradeSevenWaveFPack, verifyGradeSevenWaveFOracle } from "../lib/content-factory/grade7-wave-f.ts";
import { gradeEightWaveFMetadata, gradeEightWaveFPack } from "../lib/content-factory/grade8-wave-f.ts";
import { gradeNineWaveFMetadata, gradeNineWaveFPack } from "../lib/content-factory/grade9-wave-f.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { combinedWaveABCDEFGradePacks } from "../lib/content-factory/wave-f-packs.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

test("Grades 7–9 Wave F bind exact uncovered algebra source rows", () => {
  assert.deepEqual(gradeSevenWaveFMetadata.sourceOutcomeIds, ["MOET2018-G7-NAA-P057-030"]);
  assert.deepEqual(gradeEightWaveFMetadata.sourceOutcomeIds, ["MOET2018-G8-NAA-P064-010", "MOET2018-G8-NAA-P064-011"]);
  assert.deepEqual(gradeNineWaveFMetadata.sourceOutcomeIds, ["MOET2018-G9-NAA-P073-023"]);
});

test("Grades 7–9 Wave F pass algebra oracles and candidate isolation", () => {
  assert.deepEqual(verifyGradeSevenWaveFOracle(), []);
  for (const pack of [gradeSevenWaveFPack, gradeEightWaveFPack, gradeNineWaveFPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(auditIndependentCandidatePack(pack).errors, []);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  }
});

test("Wave F A–F graph and duplicate/equivalence audit remain clean", () => {
  assert.deepEqual(buildPrerequisiteGraph(combinedWaveABCDEFGradePacks).diagnostics.filter((entry) => entry.severity !== "INFO"), []);
  assert.deepEqual(validateCrossPackDuplicates(combinedWaveABCDEFGradePacks), []);
});
