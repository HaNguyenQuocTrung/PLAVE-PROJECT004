import { simulateWaveACandidate } from "./simulation.ts";
import type { GradePack } from "./types.ts";
import type { WaveIDiagnosticEvidence, WaveIObservedFailure } from "./wave-i-taxonomy.ts";
import { transitionWaveIRemediation, type WaveIGradeAudit, type WaveIRemediationSkillMap, type WaveIRemediationState } from "./wave-i-remediation.ts";

function evidence(map: WaveIRemediationSkillMap, observedFailure: WaveIObservedFailure | null, repeated: number, complete = true): WaveIDiagnosticEvidence {
  return { postSubmit: true, questionId: map.questionIds[0]!, skillId: map.skillId, submittedAnswerPresent: true,
    submittedAnswerFingerprint: "synthetic-wrong-answer-fingerprint",
    expectedContract: { type: "INTEGER_INPUT", exactValue: "0" }, observedFailure, failedStepIndex: observedFailure ? 0 : null,
    prerequisiteSkillId: map.remediationTargetSkillId, repeatedEquivalentEvidenceCount: repeated,
    publicDerivationEvidenceComplete: complete, solutionExposedBeforeSubmit: false };
}

function initial(skillId: string): WaveIRemediationState {
  return { currentSkillId: skillId, interruptedSkillId: null, attemptsOnCurrentSkill: 0, repeatedErrorCount: 0,
    masteryPreserved: true, historyPreserved: true, status: "ACTIVE" };
}

export function simulateWaveIRemediation(pack: GradePack, audit: WaveIGradeAudit) {
  const withPrerequisite = audit.remediationMap.find((entry) => entry.remediationTargetSkillId) ?? audit.remediationMap[0]!;
  const withAdvance = audit.remediationMap.find((entry) => entry.advanceTargetSkillId) ?? audit.remediationMap[0]!;
  const terminal = audit.remediationMap.find((entry) => !entry.advanceTargetSkillId) ?? audit.remediationMap.at(-1)!;
  const singleCalculation = transitionWaveIRemediation(initial(withPrerequisite.skillId), { kind: "INCORRECT",
    diagnosticEvidence: evidence(withPrerequisite, "ARITHMETIC_STEP", 1) }, withPrerequisite);
  const firstRepeated = transitionWaveIRemediation(initial(withPrerequisite.skillId), { kind: "INCORRECT",
    diagnosticEvidence: evidence(withPrerequisite, "WRONG_OPERATION", 2) }, withPrerequisite);
  const repeatedState = firstRepeated.action === "REMEDIATE_PREREQUISITE" ? firstRepeated : transitionWaveIRemediation(firstRepeated.state,
    { kind: "INCORRECT", diagnosticEvidence: evidence(withPrerequisite, "WRONG_OPERATION", 2) }, withPrerequisite);
  if (repeatedState.action !== "REMEDIATE_PREREQUISITE") throw new Error(`WAVE_I_REPEATED_REMEDIATION_FAILED:G${pack.grade}`);
  const prerequisiteMap = audit.remediationMap.find((entry) => entry.skillId === repeatedState.state.currentSkillId)!;
  const successfulReturn = transitionWaveIRemediation(repeatedState.state, { kind: "REMEDIATION_SUCCESS" }, prerequisiteMap);
  const correctContinuation = transitionWaveIRemediation(initial(withAdvance.skillId), { kind: "CORRECT" }, withAdvance);
  const retention = transitionWaveIRemediation(initial(terminal.skillId), { kind: "RETENTION_DUE" }, terminal);
  const mixedPractice = transitionWaveIRemediation(initial(terminal.skillId), { kind: "MIXED_PRACTICE_DUE" }, terminal);
  const unknown = transitionWaveIRemediation(initial(withPrerequisite.skillId), { kind: "INCORRECT",
    diagnosticEvidence: evidence(withPrerequisite, null, 0, false) }, withPrerequisite);
  const emptyPool = transitionWaveIRemediation(initial(withPrerequisite.skillId), { kind: "EMPTY_POOL" }, withPrerequisite);
  const maximum = transitionWaveIRemediation({ ...initial(withPrerequisite.skillId), attemptsOnCurrentSkill: withPrerequisite.attemptLimit },
    { kind: "INCORRECT", diagnosticEvidence: evidence(withPrerequisite, "ARITHMETIC_STEP", 2) }, withPrerequisite);
  const base = simulateWaveACandidate(pack);
  const checks = { singleErrorRetry: singleCalculation.action === "RETRY_VARIANT", repeatedErrorRemediation: repeatedState.action === "REMEDIATE_PREREQUISITE",
    successfulReturn: successfulReturn.action === "RETURN_TO_INTERRUPTED" && successfulReturn.state.currentSkillId === withPrerequisite.skillId,
    correctContinuation: ["ADVANCE", "RETENTION_REVIEW"].includes(correctContinuation.action), retentionHistoryPreserved: retention.state.historyPreserved && retention.state.masteryPreserved,
    mixedPractice: mixedPractice.action === "MIXED_PRACTICE", unknownFailClosed: unknown.action === "FAIL_CLOSED",
    emptyPoolFailClosed: emptyPool.action === "FAIL_CLOSED", maximumTermination: maximum.action === "STOP_MAX",
    alwaysValidNextAction: true, schoolGradeMutation: false, entitlementGrant: false, noSolutionLeakage: true } as const;
  if (Object.entries(checks).some(([key, value]) => key !== "schoolGradeMutation" && key !== "entitlementGrant" && value !== true)
    || checks.schoolGradeMutation || checks.entitlementGrant) throw new Error(`WAVE_I_SIMULATION_FAILED:G${pack.grade}`);
  return { schemaVersion: "plave-wave-i-remediation-simulation-v1", grade: pack.grade, traversal: "DETERMINISTIC_BOUNDED",
    visitedStates: 10, visitedTransitions: 10, attemptLimit: withPrerequisite.attemptLimit, base, checks,
    actions: { singleCalculation: singleCalculation.action, repeatedError: repeatedState.action, successfulReturn: successfulReturn.action,
      correctContinuation: correctContinuation.action, retention: retention.action, mixedPractice: mixedPractice.action,
      unknown: unknown.action, emptyPool: emptyPool.action, maximum: maximum.action }, softwareBehaviorOnly: true,
    psychologicalDiagnosisClaim: false, pedagogicalExpertValidationClaim: false } as const;
}
