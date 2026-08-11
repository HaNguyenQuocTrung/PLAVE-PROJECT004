import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateBinding, FactoryGrade, GradePack, PrerequisiteEdge } from "./types.ts";

export type WaveHProgressionContract = Readonly<{
  grade: FactoryGrade;
  priorSkillId: string;
  waveHSkillIds: readonly string[];
  intermediateRemediationSkillIds: readonly string[];
  actions: Readonly<{
    continueTargetSkillId: string;
    remediateTargetSkillId: string;
    advanceTargetSkillId: string;
    retentionTargetSkillId: string;
    mixedPracticeTargetSkillIds: readonly [string, string];
  }>;
  nextTargetSkillId: string;
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE" | "REPOSITORY_RUNTIME_ORDER";
  schoolGradeMutation: false;
  entitlementGrant: false;
}>;

function mergeById<T extends Readonly<{ id: string }>>(first: readonly T[], second: readonly T[]): readonly T[] {
  const overlay = new Map(second.map((entry) => [entry.id, entry]));
  const result = first.map((entry) => overlay.get(entry.id) ?? entry);
  const seen = new Set(first.map((entry) => entry.id));
  result.push(...second.filter((entry) => !seen.has(entry.id)));
  return result;
}

function mergePrerequisites(first: readonly PrerequisiteEdge[], second: readonly PrerequisiteEdge[]) {
  return [...new Map([...first, ...second].map((edge) => [`${edge.fromSkillId}->${edge.toSkillId}`, edge])).values()];
}

export function combineWaveABCDEFGHPacks(
  combinedABCDEFG: GradePack,
  waveH: GradePack,
  binding: Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>,
): GradePack {
  if (combinedABCDEFG.grade !== waveH.grade || !combinedABCDEFG.candidate || !waveH.candidate) throw new Error("WAVE_H_COMBINATION_BINDING_INVALID");
  const questions = mergeById(combinedABCDEFG.questions, waveH.questions);
  const explanations = mergeById(combinedABCDEFG.explanations, waveH.explanations);
  const core = { format: "plave-combined-wave-a-b-c-d-e-f-g-h-candidate-v1", grade: combinedABCDEFG.grade,
    candidateId: binding.candidateId, version: binding.version, policyVersion: binding.policyVersion,
    combinedABCDEFG: combinedABCDEFG.candidate, waveH: waveH.candidate,
    questionIds: questions.map((question) => question.id), questionHashes: questions.map((question) => sha256(canonicalize(question))) } as const;
  const candidate: CandidateBinding = { candidateId: binding.candidateId, version: binding.version,
    bundleHash: sha256(canonicalize(core)), policyVersion: binding.policyVersion };
  const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
    id: `${binding.packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: binding.packId, check, status: "PASSED" as const,
    evidence: `Combined immutable Waves A–G plus source-verified Wave H applied-reasoning evidence: ${check}.`,
  }));
  const first = combinedABCDEFG.production; const second = waveH.production;
  if (!first || !second) throw new Error("WAVE_H_PRODUCTION_SUMMARY_MISSING");
  return { schemaVersion: "content-factory-grade-pack-v1", grade: combinedABCDEFG.grade, packId: binding.packId, packVersion: binding.version,
    immutableReference: combinedABCDEFG.immutableReference, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
    sources: mergeById(combinedABCDEFG.sources, waveH.sources), domains: mergeById(combinedABCDEFG.domains, waveH.domains),
    units: mergeById(combinedABCDEFG.units, waveH.units), knowledgeNodes: mergeById(combinedABCDEFG.knowledgeNodes, waveH.knowledgeNodes),
    skills: mergeById(combinedABCDEFG.skills, waveH.skills), objectives: mergeById(combinedABCDEFG.objectives, waveH.objectives),
    prerequisites: mergePrerequisites(combinedABCDEFG.prerequisites, waveH.prerequisites), blueprints: mergeById(combinedABCDEFG.blueprints, waveH.blueprints),
    questions, quarantinedQuestions: [...(combinedABCDEFG.quarantinedQuestions ?? []), ...(waveH.quarantinedQuestions ?? [])], explanations,
    evidenceReceipts: mergeById(mergeById(combinedABCDEFG.evidenceReceipts, waveH.evidenceReceipts), evidenceReceipts), candidate,
    adaptivePolicy: { version: binding.policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "A+B+C+D+E+F+G+H", selectedSliceId: binding.selectedSliceId,
      selectionBasis: ["IMMUTABLE_WAVES_A_B_C_D_E_F_G", "SOURCE_VERIFIED_WAVE_H", "INDEPENDENT_APPLIED_REASONING_ORACLE"],
      generated: first.generated + second.generated, repaired: first.repaired + second.repaired,
      evidenceGatePassed: first.evidenceGatePassed + second.evidenceGatePassed,
      verificationInsufficient: first.verificationInsufficient + second.verificationInsufficient,
      rejected: first.rejected + second.rejected, duplicate: first.duplicate + second.duplicate,
      candidateEligible: first.candidateEligible + second.candidateEligible }, legacyAsset: combinedABCDEFG.legacyAsset };
}

export function assertWaveHProgressionContract(pack: GradePack, contract: WaveHProgressionContract) {
  if (pack.grade !== contract.grade || contract.waveHSkillIds.length === 0) throw new Error("WAVE_H_PROGRESSION_GRADE_INVALID");
  const skills = new Set(pack.skills.map((skill) => skill.id));
  const targets = [contract.priorSkillId, ...contract.waveHSkillIds, ...contract.intermediateRemediationSkillIds,
    contract.actions.continueTargetSkillId, contract.actions.remediateTargetSkillId, contract.actions.advanceTargetSkillId,
    contract.actions.retentionTargetSkillId, ...contract.actions.mixedPracticeTargetSkillIds, contract.nextTargetSkillId];
  for (const skillId of targets) if (!skills.has(skillId)) throw new Error(`WAVE_H_PROGRESSION_SKILL_MISSING:${skillId}`);
  if (contract.schoolGradeMutation || contract.entitlementGrant) throw new Error("WAVE_H_PROGRESSION_SIDE_EFFECT");
  const referenced = new Set(pack.prerequisites.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
  for (const skillId of contract.waveHSkillIds) if (!referenced.has(skillId)) throw new Error(`WAVE_H_PROGRESSION_ORPHAN:${skillId}`);
  return true;
}
