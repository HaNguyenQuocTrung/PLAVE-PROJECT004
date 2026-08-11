import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "../lib/content-factory/grade1-shadow.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { simulateCombinedWaveABCandidate } from "../lib/content-factory/simulation.ts";
import { auditWaveB } from "../lib/content-factory/wave-b-audit.ts";
import { combinedWaveABGradePacks, waveBGradePacks, waveBProgressionContracts } from "../lib/content-factory/wave-b-packs.ts";
import { waveBPlan } from "../lib/content-factory/wave-b-plan.ts";
import { buildWaveBCoverageRows, renderWaveBCoverageMarkdown } from "../lib/content-factory/wave-b-report.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("Wave B plan retains all nine required slices and source-page evidence", () => {
  assert.deepEqual(waveBPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(waveBPlan[0]?.gradeOneLegacyEvidence, true);
  for (const row of waveBPlan.slice(1)) {
    assert.ok(row.sourceOutcomeIds.length > 0);
    assert.ok(row.authoritativePages.length > 0);
    assert.equal(row.curriculumCompletionClaim, false);
  }
});

test("all Wave B candidates pass independent audit and remain deny-all", () => {
  const audit = auditWaveB();
  assert.equal(audit.totals.candidates, 9);
  assert.equal(audit.totals.questions, 216);
  assert.equal(audit.totals.independentlyVerified, 216);
  assert.equal(audit.totals.errors, 0);
  assert.deepEqual(audit.crossWaveDuplicates, []);
  for (const pack of waveBGradePacks) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity === "ERROR"), []);
  }
});

test("combined Wave A+B candidates preserve progression and deterministic simulations", () => {
  for (const pack of combinedWaveABGradePacks) {
    const contract = waveBProgressionContracts.find((entry) => entry.grade === pack.grade)!;
    const first = simulateCombinedWaveABCandidate(pack, contract);
    const second = simulateCombinedWaveABCandidate(pack, contract);
    assert.deepEqual(first, second);
    assert.equal(first.waveTransition.alwaysValidNextAction, true);
    assert.equal(first.waveTransition.schoolGradeMutation, false);
    assert.equal(first.waveTransition.entitlementGrant, false);
    assert.deepEqual(validateGradePack(pack).filter((entry) => entry.severity === "ERROR"), []);
  }
});

test("Grade 1 source and original shadow plus Grade 2 frozen artifacts remain immutable", () => {
  assert.equal(GRADE_ONE_SOURCE_DIGEST, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
  assert.deepEqual(gradeOneShadowCandidatePack.candidate, {
    candidateId: "g1-legacy-release-shadow-rc1",
    version: "g1-shadow-1.0.0-rc.1",
    bundleHash: "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872",
    policyVersion: "g1-shadow-adaptive-policy-1.0.0",
  });
  assert.equal(gradeOneShadowCandidatePack.questions.length, 312);
  assert.equal(productionGradePacks[1]?.candidate?.bundleHash, "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530");
});

test("Wave B and combined bundles are stable under input reordering", () => {
  const waveB = buildDeterministicBundle(waveBGradePacks);
  const combined = buildDeterministicBundle(combinedWaveABGradePacks);
  assert.equal(waveB.bundleHash, "36f6b6201c8b9cf9e57d68267421df77b1569cc0b3330e77a29e38ce1667e5a2");
  assert.equal(combined.bundleHash, "93ef241fc04cd395caf9b7bcd5447506223214db4e36411988907096456898f3");
  assert.equal(canonicalize(waveB), canonicalize(buildDeterministicBundle([...waveBGradePacks].reverse())));
  assert.equal(canonicalize(combined), canonicalize(buildDeterministicBundle([...combinedWaveABGradePacks].reverse())));
});

test("generated coverage reports reconcile exactly and preserve coverage truth", () => {
  const rows = buildWaveBCoverageRows();
  const generated = JSON.parse(readFileSync("content/grade-packs/generated/wave-b-coverage.json", "utf8")) as { rows: typeof rows };
  assert.deepEqual(generated.rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-b-coverage.md", "utf8"), renderWaveBCoverageMarkdown(rows));
  assert.equal(rows.every((row) => !row.curriculumCompletionClaim && row.publication === "DRAFT" && row.visibility === "HIDDEN"), true);
});
