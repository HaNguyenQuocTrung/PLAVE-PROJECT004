import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { gradeOneReferencePack } from "../lib/content-factory/grade1-reference.ts";
import {
  GRADE_ONE_SOURCE_DIGEST,
  assertGradeOneShadowCanSelect,
  chooseGradeOneShadowNextAction,
  gradeOneLegacyMetadataGaps,
  gradeOneShadowAdaptivePolicyContract,
  gradeOneShadowArtifacts,
  gradeOneShadowCandidatePack,
  simulateGradeOneShadowComparison,
} from "../lib/content-factory/grade1-shadow.ts";
import { assertGradeOneUnchanged, gradeOneSourceDigest } from "../lib/content-factory/legacy-digest.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { parseAdaptivePilotEntitlements, resolveConfiguredAdaptivePilotAccess } from "../lib/practice/adaptive-pilot.ts";
import { gradeOneShadowPublicationState, resolveAdaptiveRuntimeGate, resolvePracticeRuntimeAccess } from "../lib/practice/runtime-flags.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

const syntheticStudent = "11111111-1111-4111-8111-111111111111";

test("Grade 1 source and active fixed runtime remain immutable beside the shadow overlay", () => {
  const before = gradeOneSourceDigest((path) => readFileSync(path, "utf8"));
  assert.equal(before.aggregate, GRADE_ONE_SOURCE_DIGEST);
  assert.equal(assertGradeOneUnchanged(before, gradeOneSourceDigest((path) => readFileSync(path, "utf8"))), true);
  assert.equal(gradeOneReferencePack.candidate, null);
  assert.deepEqual(gradeOneReferencePack.release, { publication: "PUBLISHED", visibility: "VISIBLE", pilotEnabled: false, runtimeEnabled: true, retentionEnabled: false });
  assert.deepEqual(resolvePracticeRuntimeAccess("grade-1-numbers-to-10"), { kind: "FIXED_RUNTIME" });
});

test("shadow adapter binds the exact 13/312/312/24 boundary with semantic parity", () => {
  const { pack, receipt } = gradeOneShadowArtifacts;
  assert.deepEqual(receipt.counts, { units: 13, questions: 312, solutions: 312, diagnosticRows: 24 });
  assert.equal(receipt.sourceDigest, GRADE_ONE_SOURCE_DIGEST);
  assert.equal(receipt.semanticParity, true);
  assert.equal(receipt.sourceSemanticDigest, receipt.adaptedSemanticDigest);
  assert.equal(new Set(pack.questions.map((question) => question.id)).size, 312);
  assert.equal(new Set(pack.explanations.map((explanation) => explanation.questionId)).size, 312);
  assert.equal(receipt.diagnosticQuestionIds.every((id) => pack.questions.some((question) => question.id === id)), true);
  assert.deepEqual(validateGradePack(pack).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
});

test("Grade 1 candidate tuple, policy and artifacts are deterministic and hidden", () => {
  assert.deepEqual(gradeOneShadowCandidatePack.candidate, {
    candidateId: "g1-legacy-release-shadow-rc1",
    version: "g1-shadow-1.0.0-rc.1",
    bundleHash: "9d6cbdb8410ba2e1ab5907ea69f2e424abe9de278f0b8e4a616db8dbf97ac872",
    policyVersion: "g1-shadow-adaptive-policy-1.0.0",
  });
  assert.deepEqual(gradeOneShadowCandidatePack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  assert.equal(assertGradeOneShadowCanSelect(), true);
  assert.deepEqual(buildDeterministicBundle([gradeOneShadowCandidatePack]), JSON.parse(readFileSync("content/grade-packs/generated/bundle-grades-1.json", "utf8")));
  const frozen = readFileSync("content/grade-packs/generated/grade-1-shadow-candidate.json", "utf8");
  assert.equal(frozen, `${canonicalize(JSON.parse(frozen))}\n`);
});

test("legacy metadata gaps remain UNKNOWN and required adaptive bindings fail closed", () => {
  assert.deepEqual(gradeOneLegacyMetadataGaps.map((gap) => gap.state), ["UNKNOWN", "UNKNOWN", "UNKNOWN"]);
  assert.throws(() => assertGradeOneShadowCanSelect({ ...gradeOneShadowCandidatePack, questions: [] }), /GRADE1_SHADOW_CANDIDATE_INCOMPLETE/u);
  assert.throws(() => simulateGradeOneShadowComparison([], "seed", 1), /INVALID_GRADE1_SHADOW_INPUT/u);
  assert.ok(gradeOneShadowCandidatePack.questions.every((question) => question.reviewStatus === "DRAFT" && !question.published && !question.pilotEligible));
});

test("shadow policy labels every threshold and never rewrites history", () => {
  assert.equal(gradeOneShadowAdaptivePolicyContract.sessionLength.basis, "DERIVED_COMPATIBILITY_VALUE");
  assert.equal(gradeOneShadowAdaptivePolicyContract.minimumSkillEvidence.basis, "PRODUCT_HYPOTHESIS");
  assert.equal(gradeOneShadowAdaptivePolicyContract.masteryThreshold.basis, "DERIVED_COMPATIBILITY_VALUE");
  assert.equal(gradeOneShadowAdaptivePolicyContract.remediationIncorrectStreak.basis, "PRODUCT_HYPOTHESIS");
  assert.equal(gradeOneShadowAdaptivePolicyContract.resume.basis, "EXISTING_VERIFIED_PRODUCT_CONTRACT");
  assert.equal(gradeOneShadowAdaptivePolicyContract.retentionReview.enabled, false);
  assert.equal(gradeOneShadowAdaptivePolicyContract.scoringHistoryRewrite, false);
  assert.equal(gradeOneShadowAdaptivePolicyContract.pedagogicalEffectivenessClaim, false);
});

test("fixed and shadow-adaptive selectors compare deterministically without duplicate selection", () => {
  const questions = gradeOneShadowCandidatePack.questions.slice(0, 24).map((question) => ({ questionId: question.id, skillId: question.skillId, difficulty: question.difficulty }));
  const first = simulateGradeOneShadowComparison(questions, "comparison", 12);
  const second = simulateGradeOneShadowComparison(questions, "comparison", 12);
  assert.deepEqual(first, second);
  assert.equal(first.historyMutation, false);
  assert.equal(first.duplicateSelection, false);
  assert.equal(first.emptyPoolBehavior, "FAIL_CLOSED");
  assert.equal(first.pedagogicalClaim, "NONE");
  assert.equal(new Set(first.proposedAdaptiveSelection).size, 12);
});

test("continuous next-action contract reaches every safe state without grade or access mutation", () => {
  const states = [
    { incorrectStreak: 0, currentSkillEvidence: 1, currentSkillMastered: false, gradeComplete: false, retentionDue: false, recommendGradeTwo: false },
    { incorrectStreak: 2, currentSkillEvidence: 2, currentSkillMastered: false, gradeComplete: false, retentionDue: false, recommendGradeTwo: false },
    { incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: false, retentionDue: false, recommendGradeTwo: false },
    { incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: true, retentionDue: true, recommendGradeTwo: false },
    { incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: true, retentionDue: false, recommendGradeTwo: false },
    { incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: true, retentionDue: false, recommendGradeTwo: true },
  ];
  const actions = states.map(chooseGradeOneShadowNextAction);
  assert.deepEqual(new Set(actions.map((result) => result.action)), new Set(["CONTINUE_CURRENT_SKILL", "REMEDIATE_PREREQUISITE", "ADVANCE_TO_NEXT_SKILL", "RUN_RETENTION_REVIEW", "MIXED_PRACTICE", "RECOMMEND_GRADE_TWO_SKILL"]));
  assert.ok(actions.every((result) => !result.changesSchoolGrade && !result.grantsGradeTwoAccess));
});

test("candidate-scoped Grade 1 entitlement parses exactly but all remote/runtime gates deny shadow execution", () => {
  const entitlement = { userId: syntheticStudent, grade: 1, candidateId: gradeOneShadowPublicationState.releaseCandidateId, candidateVersion: gradeOneShadowPublicationState.contentVersion, bundleHash: gradeOneShadowPublicationState.bundleSha256, policyVersion: gradeOneShadowPublicationState.policyVersion };
  const environment = { PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS: JSON.stringify({ version: 1, entitlements: [entitlement] }), PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "true", PLAVE_CONTROLLED_PILOT_ENABLED: "true", PLAVE_RETENTION_RUNTIME_ENABLED: "false" };
  assert.equal(parseAdaptivePilotEntitlements(environment.PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS).status, "VALID");
  assert.deepEqual(resolveConfiguredAdaptivePilotAccess(syntheticStudent, 1, environment, "grade-1-shadow-candidate").gate, { kind: "DENIED", reason: "SHADOW_ONLY" });
  assert.deepEqual(resolveAdaptiveRuntimeGate("grade-1-shadow-candidate"), { kind: "DENIED", reason: "SHADOW_ONLY" });
  assert.equal(JSON.stringify(gradeOneShadowPublicationState).includes(syntheticStudent), false);
});

test("Grade 2 frozen tuple and Grades 2-9 hidden state remain unchanged", () => {
  assert.equal(productionGradePacks[1]?.candidate?.bundleHash, "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530");
  for (const pack of productionGradePacks.slice(1)) {
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  }
});
