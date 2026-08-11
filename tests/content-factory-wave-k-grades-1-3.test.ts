import test from "node:test";
import assert from "node:assert/strict";
import { waveKGradeOneEvidenceCoverage } from "../lib/content-factory/wave-k-grade-one.ts";
import { waveKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { verifyWaveKShard } from "../lib/content-factory/wave-k-shards.ts";

test("Wave K Grades 1-3 shard passes while Grade 1 stays immutable and fail-closed", () => {
  const shard = verifyWaveKShard([1, 2, 3]);
  assert.equal(shard.status, "PASSED");
  assert.deepEqual(shard.errors, []);
  assert.deepEqual(waveKGradeOneEvidenceCoverage.boundary, { units: 13, questions: 312, solutions: 312, diagnosticRows: 24 });
  assert.equal(waveKGradeOneEvidenceCoverage.newQuestions, 0);
  assert.equal(waveKGradeOneEvidenceCoverage.fixedRuntimeModified, false);
  assert.equal(waveKGradeOneEvidenceCoverage.evidenceComplete, false);
  assert.equal(waveKGradeOneEvidenceCoverage.deterministicEvidence + waveKGradeOneEvidenceCoverage.unknown, 312);
  assert.equal(waveKGradePacks.find((pack) => pack.grade === 1)!.questions.length, 0);
});
