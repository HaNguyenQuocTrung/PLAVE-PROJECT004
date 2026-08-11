import test from "node:test";
import assert from "node:assert/strict";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { waveJGradePacks } from "../lib/content-factory/wave-j-packs.ts";
import { buildWaveJDepthAudit } from "../lib/content-factory/wave-j-depth.ts";
import { combinedWaveABCDEFGHIGradePacks } from "../lib/content-factory/wave-i-packs.ts";

test("Wave J Grades 1–3 are depth-sufficient without filler", () => {
  const packs = waveJGradePacks.filter((pack) => pack.grade <= 3);
  assert.deepEqual(packs.map((pack) => pack.questions.length), [0, 0, 0]);
  const audit = buildWaveJDepthAudit(combinedWaveABCDEFGHIGradePacks).filter((row) => row.grade <= 3);
  assert.equal(audit.length, 98); assert.ok(audit.every((row) => row.classificationAfter === "DEPTH_SUFFICIENT"));
});

test("Grade 1 immutable content, digest and shadow tuple remain untouched", () => {
  const gradeOne = combinedWaveABCDEFGHIGradePacks.find((pack) => pack.grade === 1)!;
  assert.equal(gradeOne.questions.length, 312); assert.equal(gradeOne.legacyAsset?.expected.units, 13);
  assert.equal(gradeOne.legacyAsset?.expected.solutions, 312); assert.equal(gradeOne.legacyAsset?.expected.diagnosticRows, 24);
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.equal(gradeOneShadowCandidatePack.questions.length, 312);
});
