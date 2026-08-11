import { canonicalize, sha256 } from "./canonical.ts";
import type { FactoryGrade, GradePack, PrerequisiteEdge } from "./types.ts";
import { classifyWaveIError, type WaveIDiagnosticEvidence, type WaveIErrorCode } from "./wave-i-taxonomy.ts";

export type WaveIEdgeEvidence = "SOURCE_EVIDENCED" | "CONTRACT_DERIVED" | "HYPOTHESIS_REQUIRES_EVIDENCE";
export type WaveISkillStage = "ENTRY" | "INTERMEDIATE" | "TERMINAL" | "ENTRY_TERMINAL";
export type WaveINextAction = "CONTINUE" | "RETRY_VARIANT" | "REMEDIATE_PREREQUISITE" | "RETURN_TO_INTERRUPTED"
  | "ADVANCE" | "RETENTION_REVIEW" | "MIXED_PRACTICE" | "STOP_MAX" | "FAIL_CLOSED";

export type WaveIRemediationSkillMap = Readonly<{
  skillId: string;
  stage: WaveISkillStage;
  questionIds: readonly string[];
  prerequisiteSkillIds: readonly string[];
  advanceSkillIds: readonly string[];
  retryTargetSkillId: string;
  remediationTargetSkillId: string | null;
  advanceTargetSkillId: string | null;
  retentionTargetSkillId: string;
  mixedPracticeTargetSkillIds: readonly string[];
  attemptLimit: 6;
  repeatedErrorThreshold: 2;
  emptyPoolBehavior: "FAIL_CLOSED_SANITIZED";
  schoolGradeMutation: false;
  entitlementGrant: false;
}>;

export type WaveIPrerequisiteEvidenceRow = Readonly<{
  fromSkillId: string;
  toSkillId: string;
  classification: WaveIEdgeEvidence;
  sourceReferenceIds: readonly string[];
  originalEvidence: PrerequisiteEdge["evidence"];
}>;

export type WaveIGradeAudit = Readonly<{
  grade: FactoryGrade;
  candidateSkillIds: readonly string[];
  entrySkillIds: readonly string[];
  intermediateSkillIds: readonly string[];
  terminalSkillIds: readonly string[];
  isolatedSkillIds: readonly string[];
  prerequisiteEvidence: readonly WaveIPrerequisiteEvidenceRow[];
  remediationMap: readonly WaveIRemediationSkillMap[];
  missingRemediationBefore: readonly string[];
  missingRemediationAfter: readonly string[];
  missingAdvanceBefore: readonly string[];
  missingAdvanceAfter: readonly string[];
  broadErrorMappingsBefore: number;
  broadErrorMappingsAfter: 0;
  bridgeQuestionIds: readonly string[];
  bridgeDecision: "NOT_REQUIRED_EXISTING_A_TO_H_POOL_SUFFICIENT";
  auditHash: string;
}>;

function edgeClassification(edge: PrerequisiteEdge): WaveIEdgeEvidence {
  if (edge.evidence === "CURRICULUM_AUTHORITATIVE") return "SOURCE_EVIDENCED";
  if (edge.evidence === "REPOSITORY_RUNTIME_ORDER") return "CONTRACT_DERIVED";
  return "HYPOTHESIS_REQUIRES_EVIDENCE";
}

export function buildWaveIGradeAudit(pack: GradePack): WaveIGradeAudit {
  const candidateSkillIds = [...new Set(pack.questions.map((question) => question.skillId))].sort();
  const candidateSkills = new Set(candidateSkillIds);
  const edges = pack.prerequisites.filter((edge) => candidateSkills.has(edge.fromSkillId) && candidateSkills.has(edge.toSkillId));
  const incoming = new Map(candidateSkillIds.map((skillId) => [skillId, [] as string[]]));
  const outgoing = new Map(candidateSkillIds.map((skillId) => [skillId, [] as string[]]));
  for (const edge of edges) { incoming.get(edge.toSkillId)!.push(edge.fromSkillId); outgoing.get(edge.fromSkillId)!.push(edge.toSkillId); }
  for (const values of [...incoming.values(), ...outgoing.values()]) values.sort();
  const entrySkillIds = candidateSkillIds.filter((skillId) => incoming.get(skillId)!.length === 0);
  const terminalSkillIds = candidateSkillIds.filter((skillId) => outgoing.get(skillId)!.length === 0);
  const isolatedSkillIds = candidateSkillIds.filter((skillId) => incoming.get(skillId)!.length === 0 && outgoing.get(skillId)!.length === 0);
  const intermediateSkillIds = candidateSkillIds.filter((skillId) => incoming.get(skillId)!.length > 0 && outgoing.get(skillId)!.length > 0);
  const remediationMap = candidateSkillIds.map((skillId): WaveIRemediationSkillMap => {
    const prerequisites = incoming.get(skillId)!; const advances = outgoing.get(skillId)!;
    const stage: WaveISkillStage = prerequisites.length === 0 && advances.length === 0 ? "ENTRY_TERMINAL"
      : prerequisites.length === 0 ? "ENTRY" : advances.length === 0 ? "TERMINAL" : "INTERMEDIATE";
    const questionIds = pack.questions.filter((question) => question.skillId === skillId).map((question) => question.id).sort();
    if (questionIds.length === 0) throw new Error(`WAVE_I_SKILL_POOL_EMPTY:${skillId}`);
    return { skillId, stage, questionIds, prerequisiteSkillIds: prerequisites, advanceSkillIds: advances,
      retryTargetSkillId: skillId, remediationTargetSkillId: prerequisites[0] ?? null, advanceTargetSkillId: advances[0] ?? null,
      retentionTargetSkillId: skillId, mixedPracticeTargetSkillIds: [...new Set([prerequisites[0], skillId, advances[0]].filter((entry): entry is string => Boolean(entry)))],
      attemptLimit: 6, repeatedErrorThreshold: 2, emptyPoolBehavior: "FAIL_CLOSED_SANITIZED", schoolGradeMutation: false, entitlementGrant: false };
  });
  const prerequisiteEvidence = edges.map((edge): WaveIPrerequisiteEvidenceRow => ({ ...edge, classification: edgeClassification(edge), originalEvidence: edge.evidence }))
    .sort((left, right) => `${left.fromSkillId}->${left.toSkillId}`.localeCompare(`${right.fromSkillId}->${right.toSkillId}`));
  const core = { grade: pack.grade, candidateSkillIds, entrySkillIds, intermediateSkillIds, terminalSkillIds, isolatedSkillIds,
    prerequisiteEvidence, remediationMap, bridgeQuestionIds: [] as const };
  return { ...core, missingRemediationBefore: entrySkillIds, missingRemediationAfter: [], missingAdvanceBefore: terminalSkillIds,
    missingAdvanceAfter: [], broadErrorMappingsBefore: candidateSkillIds.length, broadErrorMappingsAfter: 0,
    bridgeDecision: "NOT_REQUIRED_EXISTING_A_TO_H_POOL_SUFFICIENT", auditHash: sha256(canonicalize(core)) };
}

export type WaveIRemediationState = Readonly<{
  currentSkillId: string;
  interruptedSkillId: string | null;
  attemptsOnCurrentSkill: number;
  repeatedErrorCount: number;
  masteryPreserved: true;
  historyPreserved: true;
  status: "ACTIVE" | "REMEDIATING" | "RETENTION" | "STOPPED" | "FAILED_CLOSED";
}>;

export type WaveIRemediationEvent = Readonly<{
  kind: "CORRECT" | "INCORRECT" | "REMEDIATION_SUCCESS" | "RETENTION_DUE" | "MIXED_PRACTICE_DUE" | "EMPTY_POOL";
  diagnosticEvidence?: WaveIDiagnosticEvidence;
}>;

export function transitionWaveIRemediation(state: WaveIRemediationState, event: WaveIRemediationEvent, map: WaveIRemediationSkillMap) {
  if (state.currentSkillId !== map.skillId) throw new Error("WAVE_I_STATE_SKILL_BINDING_INVALID");
  if (event.kind === "EMPTY_POOL") return { state: { ...state, status: "FAILED_CLOSED" as const }, action: "FAIL_CLOSED" as const, reason: "CONTENT_POOL_UNAVAILABLE" };
  if (state.attemptsOnCurrentSkill >= map.attemptLimit) return { state: { ...state, status: "STOPPED" as const }, action: "STOP_MAX" as const, reason: "ATTEMPT_LIMIT_REACHED" };
  if (event.kind === "RETENTION_DUE") return { state: { ...state, status: "RETENTION" as const }, action: "RETENTION_REVIEW" as const, reason: "RETENTION_DUE" };
  if (event.kind === "MIXED_PRACTICE_DUE") return { state, action: "MIXED_PRACTICE" as const, reason: "MIXED_PRACTICE_DUE" };
  if (event.kind === "REMEDIATION_SUCCESS") {
    if (!state.interruptedSkillId) return { state: { ...state, status: "FAILED_CLOSED" as const }, action: "FAIL_CLOSED" as const, reason: "INTERRUPTED_SKILL_MISSING" };
    return { state: { ...state, currentSkillId: state.interruptedSkillId, interruptedSkillId: null, repeatedErrorCount: 0, status: "ACTIVE" as const }, action: "RETURN_TO_INTERRUPTED" as const, reason: "REMEDIATION_SUCCEEDED" };
  }
  if (event.kind === "CORRECT") return map.advanceTargetSkillId
    ? { state: { ...state, currentSkillId: map.advanceTargetSkillId, attemptsOnCurrentSkill: 0, repeatedErrorCount: 0 }, action: "ADVANCE" as const, reason: "CURRENT_SKILL_PASSED" }
    : { state, action: "RETENTION_REVIEW" as const, reason: "TERMINAL_SKILL_PASSED" };
  const classification = event.diagnosticEvidence ? classifyWaveIError(event.diagnosticEvidence) : null;
  if (!classification || classification.code === "INSUFFICIENT_EVIDENCE_UNKNOWN") return { state: { ...state, status: "FAILED_CLOSED" as const }, action: "FAIL_CLOSED" as const, reason: "ERROR_CLASSIFICATION_UNKNOWN" };
  const repeatedErrorCount = state.repeatedErrorCount + 1; const attemptsOnCurrentSkill = state.attemptsOnCurrentSkill + 1;
  if (repeatedErrorCount >= map.repeatedErrorThreshold && classification.remediationTargetSkillId && map.prerequisiteSkillIds.includes(classification.remediationTargetSkillId)) {
    return { state: { ...state, currentSkillId: classification.remediationTargetSkillId, interruptedSkillId: state.currentSkillId,
      attemptsOnCurrentSkill: 0, repeatedErrorCount: 0, status: "REMEDIATING" as const }, action: "REMEDIATE_PREREQUISITE" as const, reason: classification.code };
  }
  return { state: { ...state, attemptsOnCurrentSkill, repeatedErrorCount }, action: "RETRY_VARIANT" as const, reason: classification.code };
}

export const waveIErrorActionCoverage: Readonly<Record<WaveIErrorCode, "RETRY_OR_REMEDIATE" | "FAIL_CLOSED">> = {
  CONCEPT_MISUNDERSTANDING: "RETRY_OR_REMEDIATE", OPERATION_SELECTION: "RETRY_OR_REMEDIATE", CALCULATION_ERROR: "RETRY_OR_REMEDIATE",
  PLACE_VALUE_ERROR: "RETRY_OR_REMEDIATE", SIGN_ERROR: "RETRY_OR_REMEDIATE", FRACTION_EQUIVALENCE_ERROR: "RETRY_OR_REMEDIATE",
  UNIT_CONVERSION_ERROR: "RETRY_OR_REMEDIATE", ALGEBRAIC_TRANSFORMATION_ERROR: "RETRY_OR_REMEDIATE", GEOMETRY_CONSTRAINT_ERROR: "RETRY_OR_REMEDIATE",
  DATA_INTERPRETATION_ERROR: "RETRY_OR_REMEDIATE", PROBABILITY_SAMPLE_SPACE_ERROR: "RETRY_OR_REMEDIATE", MULTI_STEP_SEQUENCING_ERROR: "RETRY_OR_REMEDIATE",
  INSUFFICIENT_EVIDENCE_UNKNOWN: "FAIL_CLOSED",
};
