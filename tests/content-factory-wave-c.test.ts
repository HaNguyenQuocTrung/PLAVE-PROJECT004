import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { simulateCombinedWaveABCCandidate } from "../lib/content-factory/simulation.ts";
import { auditWaveC } from "../lib/content-factory/wave-c-audit.ts";
import { combinedWaveABGradePacks, waveBGradePacks } from "../lib/content-factory/wave-b-packs.ts";
import { combinedWaveABCGradePacks, waveCGradePacks, waveCProgressionContracts } from "../lib/content-factory/wave-c-packs.ts";
import { waveCPlan } from "../lib/content-factory/wave-c-plan.ts";
import { buildWaveCCoverageRows, renderWaveCCoverageMarkdown } from "../lib/content-factory/wave-c-report.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

test("Wave C plan retains the exact nine bounded source slices", () => {
  assert.deepEqual(waveCPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(waveCPlan[0]?.gradeOneLegacyEvidence, true);
  for (const row of waveCPlan.slice(1)) {
    assert.ok(row.sourceOutcomeIds.length > 0);
    assert.ok(row.authoritativePages.length > 0);
    assert.equal(row.curriculumCompletionClaim, false);
  }
});

test("all Wave C candidates pass the automated and independent evidence gates and remain deny-all", () => {
  const audit = auditWaveC();
  assert.deepEqual(audit.totals, {
    candidates: 9,
    questions: 216,
    independentlyVerified: 216,
    generated: 192,
    repaired: 0,
    verificationInsufficient: 0,
    rejected: 0,
    duplicate: 0,
    candidateEligible: 216,
    uniqueCanonicalPublicForms: 888,
    errors: 0,
  });
  assert.deepEqual(audit.crossWaveDuplicates, []);
  for (const pack of waveCGradePacks) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
  }
  assert.deepEqual(validateCrossPackDuplicates(combinedWaveABCGradePacks), []);
});

test("combined A+B+C packs preserve progression and the full adaptive software simulation", () => {
  for (const pack of combinedWaveABCGradePacks) {
    const contract = waveCProgressionContracts.find((entry) => entry.grade === pack.grade)!;
    const first = simulateCombinedWaveABCCandidate(pack, contract);
    const second = simulateCombinedWaveABCCandidate(pack, contract);
    assert.deepEqual(first, second);
    assert.equal(first.earlyMastery.status, "MASTERED_EARLY");
    assert.equal(first.remediation.status, "REMEDIATION_REQUIRED");
    assert.equal(first.maximumTermination.status, "MAXIMUM_REACHED");
    assert.equal(first.emptyPool.failedClosed, true);
    assert.equal(first.historyPreserved, true);
    assert.equal(first.retention.runtimeFlagRemainsDisabled, true);
    assert.equal(first.nextActions.alwaysValid, true);
    assert.equal(first.nextActions.schoolGradeMutation, false);
    assert.equal(first.nextActions.entitlementGrant, false);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
  }
});

test("Wave C graph has no cycle, missing reference, forward-grade dependency or orphan Wave C skill", () => {
  const graph = buildPrerequisiteGraph(combinedWaveABCGradePacks);
  const waveCSkills = new Set(waveCGradePacks.flatMap((pack) => pack.questions.map((question) => question.skillId)));
  assert.deepEqual(graph.diagnostics.filter((entry) => entry.severity !== "INFO"), []);
  assert.deepEqual(graph.diagnostics.filter((entry) => entry.code === "ORPHAN_SKILL" && waveCSkills.has(entry.entityId)), []);
  assert.equal(waveCProgressionContracts.every((contract) => contract.schoolGradeMutation === false && contract.entitlementGrant === false), true);
});

test("all immutable Grade 1, frozen Grade 2, Wave A and Wave B bindings remain unchanged", () => {
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.deepEqual(gradeOneShadowCandidatePack.candidate, {
    candidateId: "g1-legacy-release-shadow-rc1",
    version: "g1-shadow-1.0.0-rc.1",
    bundleHash: "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872",
    policyVersion: "g1-shadow-adaptive-policy-1.0.0",
  });
  assert.equal(productionGradePacks[1]?.candidate?.bundleHash, "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530");
  assert.equal(waveBGradePacks[1]?.candidate?.bundleHash, "f72f6dfba5906a433b52108e3002787677b1dd2af7558395e80772f26f01023e");
  assert.equal(buildDeterministicBundle(productionGradePacks).bundleHash, "eb832f02ab1a3d591ae086597097a474345ffef97d2de455e6a52a1e04ab2ff0");
  assert.equal(buildDeterministicBundle(waveBGradePacks).bundleHash, "36f6b6201c8b9cf9e57d68267421df77b1569cc0b3330e77a29e38ce1667e5a2");
  assert.equal(buildDeterministicBundle(combinedWaveABGradePacks).bundleHash, "93ef241fc04cd395caf9b7bcd5447506223214db4e36411988907096456898f3");
});

test("Wave C and combined A+B+C bundles and generated reports reconcile exactly", () => {
  const waveC = buildDeterministicBundle(waveCGradePacks);
  const combined = buildDeterministicBundle(combinedWaveABCGradePacks);
  assert.equal(waveC.bundleHash, "7e3da6e3b5377e18364263280eb6810dcb5dec0479ecb1f1ab26aef9427c9cd4");
  assert.equal(combined.bundleHash, "0e5832b27b3fc235e853d14d8ef84565c9b454037c9308fbf5f8193c38962986");
  assert.equal(canonicalize(waveC), canonicalize(buildDeterministicBundle([...waveCGradePacks].reverse())));
  assert.equal(canonicalize(combined), canonicalize(buildDeterministicBundle([...combinedWaveABCGradePacks].reverse())));
  const rows = buildWaveCCoverageRows();
  const generated = JSON.parse(readFileSync("content/grade-packs/generated/wave-c-coverage.json", "utf8")) as { rows: typeof rows };
  assert.deepEqual(generated.rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-c-coverage.md", "utf8"), renderWaveCCoverageMarkdown(rows));
  assert.equal(rows.every((row) => !row.curriculumCompletionClaim && row.publication === "DRAFT" && row.visibility === "HIDDEN"), true);
});
