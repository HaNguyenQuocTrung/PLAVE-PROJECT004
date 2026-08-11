import { normalizedDefinition } from "./canonical.ts";
import type { GradePack } from "./types.ts";
import { buildWaveIGradeAudit } from "./wave-i-remediation.ts";
import { simulateWaveIRemediation } from "./wave-i-simulation.ts";
import { buildWaveJDepthAudit, waveJStructureFingerprint } from "./wave-j-depth.ts";
import { simulateWaveJAdaptiveDepth } from "./wave-j-simulation.ts";

export function simulateWaveK(pack: GradePack) {
  const waveIAudit = buildWaveIGradeAudit(pack); const remediation = simulateWaveIRemediation(pack, waveIAudit);
  const depthRows = buildWaveJDepthAudit([pack]); const adaptive = simulateWaveJAdaptiveDepth(pack, depthRows, waveIAudit,
    (question) => waveJStructureFingerprint(question.prompt));
  const newQuestions = pack.questions.filter((question) => question.id.includes("-wave-k-"));
  const skillPools = [...new Set(newQuestions.map((question) => question.skillId))].map((skillId) => {
    const pool = newQuestions.filter((question) => question.skillId === skillId);
    return { skillId, questions: pool.length,
      structures: new Set(pool.map((question) => waveJStructureFingerprint(question.prompt))).size,
      publicForms: new Set(pool.map((question) => normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`))).size };
  });
  const remediationChecks = Object.entries(remediation.checks).every(([key, value]) =>
    key === "schoolGradeMutation" || key === "entitlementGrant" ? value === false : value === true);
  const adaptiveChecks = Object.values(adaptive.checks).every(Boolean);
  const checks = { entryDiagnosticRouting: waveIAudit.entrySkillIds.length > 0,
    earlyMastery: remediation.base.earlyMastery.status === "MASTERED_EARLY",
    retryDifferentStructure: skillPools.every((row) => row.structures >= 2), repeatedErrorRemediation: remediation.checks.repeatedErrorRemediation,
    returnFromRemediation: remediation.checks.successfulReturn, advance: remediation.checks.correctContinuation,
    retention: remediation.checks.retentionHistoryPreserved, mixedPractice: remediation.checks.mixedPractice,
    maximumTermination: remediation.checks.maximumTermination, poolExhaustionFailClosed: adaptive.checks.poolExhaustionFailClosed,
    startResumeIdempotency: remediation.base.checks.startResumeIdempotency, casConflict: remediation.base.checks.casConflict,
    duplicateSubmission: remediation.base.checks.duplicateSubmit, scoringXpMasteryMotivationHistory: remediation.base.checks.scoringXpMastery
      && remediation.base.checks.levelsStreaksGoalsAchievements && remediation.checks.retentionHistoryPreserved,
    solutionIsolation: remediation.checks.noSolutionLeakage && adaptive.checks.noSolutionLeakage,
    alwaysValidNextAction: remediation.checks.alwaysValidNextAction && adaptive.checks.alwaysValidNextAction,
    noDuplicateExposure: adaptive.checks.noDuplicateExposure && skillPools.every((row) => row.publicForms >= 3),
    remediationRegression: remediationChecks, adaptiveDepth: adaptiveChecks,
    schoolGradeMutation: false as const, entitlementGrant: false as const };
  return { schemaVersion: "plave-wave-k-state-machine-simulation-v1", grade: pack.grade,
    traversal: "DETERMINISTIC_BOUNDED" as const, visitedStates: remediation.visitedStates + adaptive.visitedStates,
    visitedTransitions: remediation.visitedTransitions + adaptive.visitedTransitions, skillPools, checks,
    softwareBehaviorOnly: true as const, pedagogicalExpertValidationClaim: false as const };
}
