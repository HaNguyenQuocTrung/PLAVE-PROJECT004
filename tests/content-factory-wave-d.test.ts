import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { simulateCombinedWaveABCDCandidate } from "../lib/content-factory/simulation.ts";
import { auditWaveD } from "../lib/content-factory/wave-d-audit.ts";
import { combinedWaveABGradePacks, waveBGradePacks } from "../lib/content-factory/wave-b-packs.ts";
import { combinedWaveABCGradePacks, waveCGradePacks } from "../lib/content-factory/wave-c-packs.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks, waveDProgressionContracts } from "../lib/content-factory/wave-d-packs.ts";
import { waveDPlan } from "../lib/content-factory/wave-d-plan.ts";
import { buildWaveDCoverageRows, renderWaveDCoverageMarkdown } from "../lib/content-factory/wave-d-report.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

test("Wave D plan retains exactly nine bounded, previously uncovered slices", () => {
  assert.deepEqual(waveDPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(waveDPlan[0]?.gradeOneLegacyEvidence, true);
  for (const row of waveDPlan.slice(1)) {
    assert.ok(row.sourceOutcomeIds.length > 0);
    assert.ok(row.authoritativePages.length > 0);
    assert.equal(row.curriculumCompletionClaim, false);
  }
});

test("all Wave D candidates pass automated and independent evidence gates and remain deny-all", () => {
  const audit = auditWaveD();
  assert.deepEqual(audit.totals, {
    candidates: 9, questions: 216, independentlyVerified: 216, generated: 192, repaired: 0,
    verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 216,
    uniqueCanonicalPublicForms: 1080, errors: 0,
  });
  assert.deepEqual(audit.crossWaveDuplicates, []);
  for (const pack of waveDGradePacks) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity !== "INFO"), []);
  }
  assert.deepEqual(validateCrossPackDuplicates(combinedWaveABCDGradePacks), []);
});

test("combined A+B+C+D packs preserve progression and adaptive software behavior", () => {
  for (const pack of combinedWaveABCDGradePacks) {
    const contract = waveDProgressionContracts.find((entry) => entry.grade === pack.grade)!;
    const first = simulateCombinedWaveABCDCandidate(pack, contract);
    const second = simulateCombinedWaveABCDCandidate(pack, contract);
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
  }
});

test("Wave D graph has no cycle, missing reference, forward-grade dependency or orphan", () => {
  const graph = buildPrerequisiteGraph(combinedWaveABCDGradePacks);
  const waveDSkills = new Set(waveDGradePacks.flatMap((pack) => pack.questions.map((question) => question.skillId)));
  assert.deepEqual(graph.diagnostics.filter((entry) => entry.severity !== "INFO"), []);
  assert.deepEqual(graph.diagnostics.filter((entry) => entry.code === "ORPHAN_SKILL" && waveDSkills.has(entry.entityId)), []);
});

test("Grade 1 boundary and all frozen Wave A–C bindings remain unchanged", () => {
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.deepEqual(gradeOneShadowCandidatePack.candidate, {
    candidateId: "g1-legacy-release-shadow-rc1", version: "g1-shadow-1.0.0-rc.1",
    bundleHash: "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872",
    policyVersion: "g1-shadow-adaptive-policy-1.0.0",
  });
  assert.equal(productionGradePacks[1]?.candidate?.bundleHash, "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530");
  assert.equal(waveBGradePacks[1]?.candidate?.bundleHash, "f72f6dfba5906a433b52108e3002787677b1dd2af7558395e80772f26f01023e");
  assert.equal(buildDeterministicBundle(productionGradePacks).bundleHash, "eb832f02ab1a3d591ae086597097a474345ffef97d2de455e6a52a1e04ab2ff0");
  assert.equal(buildDeterministicBundle(waveBGradePacks).bundleHash, "36f6b6201c8b9cf9e57d68267421df77b1569cc0b3330e77a29e38ce1667e5a2");
  assert.equal(buildDeterministicBundle(combinedWaveABGradePacks).bundleHash, "93ef241fc04cd395caf9b7bcd5447506223214db4e36411988907096456898f3");
  assert.equal(buildDeterministicBundle(waveCGradePacks).bundleHash, "7e3da6e3b5377e18364263280eb6810dcb5dec0479ecb1f1ab26aef9427c9cd4");
  assert.equal(buildDeterministicBundle(combinedWaveABCGradePacks).bundleHash, "0e5832b27b3fc235e853d14d8ef84565c9b454037c9308fbf5f8193c38962986");
});

test("Wave D and combined bundles and generated reports reconcile exactly", () => {
  const waveD = buildDeterministicBundle(waveDGradePacks);
  const combined = buildDeterministicBundle(combinedWaveABCDGradePacks);
  assert.equal(waveD.bundleHash, "8395b56d061f84f34cf9c7de90d2cd8fcd78071bbd906abc14b2a664a0a3e052");
  assert.equal(combined.bundleHash, "d574cc67e9d45fdd25bf2e55f4a2af899ba7acecc4a85b80435a47f7e21e53dd");
  assert.equal(canonicalize(waveD), canonicalize(buildDeterministicBundle([...waveDGradePacks].reverse())));
  assert.equal(canonicalize(combined), canonicalize(buildDeterministicBundle([...combinedWaveABCDGradePacks].reverse())));
  const rows = buildWaveDCoverageRows();
  const generated = JSON.parse(readFileSync("content/grade-packs/generated/wave-d-coverage.json", "utf8")) as { rows: typeof rows };
  assert.deepEqual(generated.rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-d-coverage.md", "utf8"), renderWaveDCoverageMarkdown(rows));
});
