import test from "node:test";
import assert from "node:assert/strict";
import { combinedWaveABCDEFGHIJKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { selectWaveLNext, waveLPolicyMatrix, type WaveLSelectorInput } from "../lib/content-factory/wave-l.ts";
import { waveJStructureFingerprint } from "../lib/content-factory/wave-j-depth.ts";

const pack = combinedWaveABCDEFGHIJKGradePacks.find((entry) => entry.grade === 3)!;
const candidate = pack.candidate!; const first = pack.questions[0]!; const userId = "synthetic-wave-l-selector-student";
function fixture(): WaveLSelectorInput {
  return { actor: { userId, role: "STUDENT", schoolGrade: 3 }, entitlement: { studentId: userId, grade: 3, ...candidate, status: "ELIGIBLE" },
    flags: { applicationEnabled: true, databaseEnabled: true, pilotEnabled: true, retentionEnabled: true },
    attempt: { attemptId: "synthetic-wave-l-selector-attempt", ownerId: userId, grade: 3, candidate, version: 4,
      status: "ACTIVE", attempts: 0, currentSkillId: first.skillId, currentSkillEvidenceRequired: true,
      activeRemediationSkillId: null, interruptedSkillId: null, remediationSucceeded: false, requiredRetrySkillId: null,
      previousStructureFingerprint: null, advanceSkillId: null, mixedPracticeSkillIds: [], exposedQuestionIds: [], remediationStackDepth: 0 },
    mastery: {}, retentionDueSkillIds: [], seed: "bounded-selection-seed" };
}

test("Wave L selector enforces priority and deterministic candidate binding", () => {
  const base = fixture(); const skillIds = [...new Set(pack.questions.map((entry) => entry.skillId))];
  const remediationSkill = skillIds[1]!; const retrySkill = skillIds[2]!;
  const input = { ...base, attempt: { ...base.attempt, activeRemediationSkillId: remediationSkill,
    requiredRetrySkillId: retrySkill, advanceSkillId: skillIds[3]!, mixedPracticeSkillIds: [skillIds[4]!] },
    retentionDueSkillIds: [skillIds[5]!] } satisfies WaveLSelectorInput;
  const selected = selectWaveLNext(pack, input); const replay = selectWaveLNext(pack, input);
  assert.equal(selected.nextAction.kind, "REMEDIATE_PREREQUISITE"); assert.equal(selected.nextAction.targetSkillId, remediationSkill);
  assert.deepEqual(selected, replay); assert.equal(selected.attemptVersion, 4); assert.deepEqual(selected.candidate, candidate);
  assert.equal("answer" in (selected.selectedQuestion ?? {}), false); assert.equal("explanation" in (selected.selectedQuestion ?? {}), false);
});

test("Wave L retry uses a different structure or fails closed", () => {
  const base = fixture(); const firstSelection = selectWaveLNext(pack, base); assert.ok(firstSelection.selectedQuestion);
  const retry = selectWaveLNext(pack, { ...base, attempt: { ...base.attempt, currentSkillEvidenceRequired: false,
    requiredRetrySkillId: first.skillId, previousStructureFingerprint: firstSelection.selectedQuestion!.structureFingerprint,
    exposedQuestionIds: [firstSelection.selectedQuestion!.questionId] } });
  assert.equal(retry.nextAction.kind, "RETRY_DIFFERENT_STRUCTURE"); assert.notEqual(retry.selectedQuestion?.structureFingerprint,
    waveJStructureFingerprint(first.prompt));
});

test("Wave L eligibility, flags, grade, ownership, terminal and limits fail closed", () => {
  const base = fixture();
  assert.equal(selectWaveLNext(pack, { ...base, actor: { ...base.actor, role: "PARENT" } }).nextAction.reasonCode, "STUDENT_ROLE_REQUIRED");
  assert.equal(selectWaveLNext(pack, { ...base, entitlement: null }).nextAction.reasonCode, "EXACT_ENTITLEMENT_REQUIRED");
  assert.equal(selectWaveLNext(pack, { ...base, flags: { ...base.flags, databaseEnabled: false } }).nextAction.reasonCode, "DATABASE_FLAG_DISABLED");
  assert.equal(selectWaveLNext(pack, { ...base, attempt: { ...base.attempt, attempts: waveLPolicyMatrix.thresholds.attemptLimit.value } }).nextAction.kind,
    "GRADE_COMPLETE_WITH_FUTURE_PATH");
  assert.equal(selectWaveLNext(pack, { ...base, attempt: { ...base.attempt, status: "TERMINAL" } }).selectedQuestion, null);
});
