import assert from "node:assert/strict";
import test from "node:test";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { buildWaveNFinalAudit, FROZEN_COMBINED_A_K_HASH, FROZEN_GRADE_TWO_TUPLE, FROZEN_WAVE_L_HASH,
  FROZEN_WAVE_M_HASH, FROZEN_WAVE_M_OVERLAY_HASH } from "../lib/content-factory/wave-n.ts";
import { renderWaveNArtifacts } from "../lib/content-factory/wave-n-report.ts";

const audit = buildWaveNFinalAudit();

test("WN-FROZEN-HASHES: A-K, Wave L, Wave M and corrective overlay are byte-stable", () => {
  assert.deepEqual(audit.frozenChecks.combinedAK, { expected: FROZEN_COMBINED_A_K_HASH, actual: FROZEN_COMBINED_A_K_HASH });
  assert.deepEqual(audit.frozenChecks.waveL, { expected: FROZEN_WAVE_L_HASH, actual: FROZEN_WAVE_L_HASH });
  assert.deepEqual(audit.frozenChecks.waveM, { expected: FROZEN_WAVE_M_HASH, actual: FROZEN_WAVE_M_HASH });
  assert.deepEqual(audit.frozenChecks.waveMCorrectiveOverlay, { expected: FROZEN_WAVE_M_OVERLAY_HASH, actual: FROZEN_WAVE_M_OVERLAY_HASH });
});

test("WN-GRADE-ONE-INTEGRITY: legacy boundary, digest, evidence and shadow tuple are frozen", () => {
  assert.deepEqual(audit.frozenChecks.gradeOne.boundary, { units: 13, questions: 312, solutions: 312, diagnosticRows: 24 });
  assert.equal(audit.frozenChecks.gradeOne.sourceDigest, audit.frozenChecks.gradeOne.expectedSourceDigest);
  assert.equal(audit.frozenChecks.gradeOne.fixedRuntimeModified, false); assert.equal(audit.frozenChecks.gradeOne.evidence, 84);
  assert.equal(audit.frozenChecks.gradeOne.quarantined, 24); assert.equal(audit.frozenChecks.gradeOne.unknown, 228);
  assert.equal(audit.frozenChecks.gradeOne.shadowCandidate.candidateId, "g1-legacy-release-shadow-rc1");
});

test("WN-GRADE-TWO-INTEGRITY: original frozen tuple remains exact", () => {
  assert.deepEqual(audit.frozenChecks.gradeTwoOriginal, FROZEN_GRADE_TWO_TUPLE);
});

test("WN-MIGRATION-INTEGRITY: canonical history remains 0001-0044 and pins 0044 SHA", () => {
  assert.equal(audit.frozenChecks.migrations.count, 44); assert.match(audit.frozenChecks.migrations.first ?? "", /^0001_/u);
  assert.match(audit.frozenChecks.migrations.last ?? "", /^0044_/u);
  assert.equal(audit.frozenChecks.migrations.migration0044ActualSha256, audit.frozenChecks.migrations.migration0044ExpectedSha256);
});

test("WN-CANDIDATE-FREEZE: all candidates are hidden, inactive and exact-tuple inventoried", () => {
  assert.equal(audit.candidateInventory.candidates.length, 9); assert.equal(audit.candidateInventory.totals.questions, 2_772);
  assert.ok(audit.candidateInventory.candidates.every((row) => row.release.publication === "DRAFT" && row.release.visibility === "HIDDEN"
    && !row.release.pilotEnabled && !row.release.runtimeEnabled && !row.release.retentionEnabled));
  assert.equal(audit.candidateInventory.totals.publishedCandidates, 0); assert.equal(audit.candidateInventory.totals.activeCandidates, 0);
});

test("WN-NON-SELF-REFERENTIAL-FREEZE: manifest and source-tree digest define exclusions", () => {
  assert.equal(audit.checksumManifest.selfHashExcluded, true); assert.equal(audit.checksumManifest.sourceTreeDigestExcludesReceiptArtifacts, true);
  assert.ok(audit.sourceSubmissionInventory.submissionExcludedPatterns.includes(".git/**"));
  assert.ok(audit.sourceSubmissionInventory.submissionExcludedPatterns.includes(".env*")); assert.equal(audit.sourceSubmissionInventory.secretFilesIncluded, 0);
  const { manifestHash, ...core } = audit.checksumManifest;
  assert.equal(manifestHash, sha256(canonicalize(core)));
});

test("WN-DETERMINISTIC-REGENERATION: final artifact rendering is byte-identical", () => {
  const first = renderWaveNArtifacts(audit); const second = renderWaveNArtifacts(buildWaveNFinalAudit());
  assert.deepEqual(second, first); assert.equal(Object.keys(first).length, 14);
});
