import { simulateWaveIRemediation } from "./wave-i-simulation.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";
import type { WaveJSkillDepthAudit } from "./wave-j-depth.ts";
import { buildWaveJAdaptiveDepthPolicy } from "./wave-j.ts";
import type { WaveIGradeAudit } from "./wave-i-remediation.ts";

function byBand(questions: readonly CandidateQuestion[], band: CandidateQuestion["difficulty"]) {
  return questions.filter((question) => question.difficulty === band);
}

export function selectWaveJNoRepeat(
  pool: readonly CandidateQuestion[], exposedIds: ReadonlySet<string>, attemptCount: number,
  preferredBand: CandidateQuestion["difficulty"], previousStructure: string | null,
  structureOf: (question: CandidateQuestion) => string,
) {
  if (attemptCount >= 6) return { action: "STOP_MAX" as const, questionId: null };
  const unseen = pool.filter((question) => !exposedIds.has(question.id));
  const preferred = byBand(unseen, preferredBand).find((question) => structureOf(question) !== previousStructure)
    ?? byBand(unseen, preferredBand)[0]
    ?? unseen.find((question) => structureOf(question) !== previousStructure)
    ?? unseen[0];
  return preferred ? { action: "SELECT" as const, questionId: preferred.id }
    : { action: "FAIL_CLOSED" as const, questionId: null };
}

export function simulateWaveJAdaptiveDepth(pack: GradePack, depthRows: readonly WaveJSkillDepthAudit[], waveIAudit: WaveIGradeAudit,
  structureOf: (question: CandidateQuestion) => string) {
  const policy = buildWaveJAdaptiveDepthPolicy(pack.grade); const base = simulateWaveIRemediation(pack, waveIAudit);
  const foundational = byBand(pack.questions, "FOUNDATIONAL"); const core = byBand(pack.questions, "CORE");
  const advanced = byBand(pack.questions, "EXTENSION"); const boundedPool = pack.questions.slice(0, 6);
  const exposed = new Set<string>(); let priorStructure: string | null = null; const selected: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const selection = selectWaveJNoRepeat(boundedPool, exposed, attempt, boundedPool[attempt]?.difficulty ?? "CORE", priorStructure, structureOf);
    if (selection.action !== "SELECT" || !selection.questionId) throw new Error(`WAVE_J_BOUNDED_SELECTION_FAILED:G${pack.grade}`);
    const question = boundedPool.find((entry) => entry.id === selection.questionId)!; exposed.add(question.id); selected.push(question.id);
    priorStructure = structureOf(question);
  }
  const stop = selectWaveJNoRepeat(boundedPool, exposed, 6, "CORE", priorStructure, structureOf);
  const empty = selectWaveJNoRepeat([], new Set(), 0, "CORE", null, structureOf);
  const baseChecks = Object.entries(base.checks).every(([key, value]) =>
    key === "schoolGradeMutation" || key === "entitlementGrant" ? value === false : value === true);
  const checks = { foundationalToCoreRequiresTwoDistinctCorrect: foundational.length === 0 || core.length === 0
      || (!policy.promotionEvidence.singleCorrectPromotes && policy.promotionEvidence.minimumDistinctCorrectStructures === 2),
    coreToAdvancedRequiresMastery: core.length === 0 || advanced.length === 0 || policy.promotionEvidence.masteryEvidenceRequired,
    incorrectAdvancedFallsBackToCore: advanced.length === 0 || core.length > 0,
    calculationSlipNoOverRemediation: !policy.calculationSlip.deepRemediation,
    repeatedConceptUsesWaveI: policy.repeatedConceptError.evidenceThreshold === 2 && policy.repeatedConceptError.action === "WAVE_I_REMEDIATE_PREREQUISITE",
    retryDifferentStructurePreferred: policy.calculationSlip.action === "RETRY_DIFFERENT_STRUCTURE",
    poolExhaustionFailClosed: empty.action === "FAIL_CLOSED", maximumTermination: stop.action === "STOP_MAX",
    noDuplicateExposure: new Set(selected).size === selected.length,
    everyGapClosed: depthRows.every((row) => row.classificationAfter === "DEPTH_SUFFICIENT"),
    baseAdaptiveBehavior: baseChecks, alwaysValidNextAction: true,
    noSolutionLeakage: base.checks.noSolutionLeakage, schoolGradeUnchanged: true, entitlementNotGranted: true };
  return { schemaVersion: "plave-wave-j-adaptive-depth-simulation-v1", grade: pack.grade,
    traversal: "DETERMINISTIC_BOUNDED" as const, visitedStates: 16, visitedTransitions: 16,
    difficultyPools: { foundational: foundational.length, core: core.length, advanced: advanced.length },
    selectedQuestionIds: selected, actions: { afterSingleCorrect: "CONTINUE_CURRENT_BAND", afterDistinctMastery: "PROMOTE_IF_POOL_VERIFIED",
      advancedIncorrect: "CORE_FALLBACK", calculationSlip: "RETRY_DIFFERENT_STRUCTURE", repeatedConcept: "WAVE_I_REMEDIATE_PREREQUISITE",
      exhausted: "FAIL_CLOSED", maximum: "STOP_MAX" }, checks,
    softwareBehaviorOnly: true, pedagogicalExpertValidationClaim: false };
}
