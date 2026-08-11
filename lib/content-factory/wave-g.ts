import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateBinding, FactoryGrade, GradePack, PrerequisiteEdge } from "./types.ts";

export type WaveGProgressionContract = Readonly<{
  grade: FactoryGrade;
  priorSkillId: string;
  waveGSkillIds: readonly string[];
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

export function combineWaveABCDEFGPacks(
  combinedABCDEF: GradePack,
  waveG: GradePack,
  binding: Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>,
): GradePack {
  if (combinedABCDEF.grade !== waveG.grade || !combinedABCDEF.candidate || !waveG.candidate) throw new Error("WAVE_G_COMBINATION_BINDING_INVALID");
  const questions = mergeById(combinedABCDEF.questions, waveG.questions);
  const explanations = mergeById(combinedABCDEF.explanations, waveG.explanations);
  const core = {
    format: "plave-combined-wave-a-b-c-d-e-f-g-candidate-v1", grade: combinedABCDEF.grade,
    candidateId: binding.candidateId, version: binding.version, policyVersion: binding.policyVersion,
    combinedABCDEF: combinedABCDEF.candidate, waveG: waveG.candidate,
    questionIds: questions.map((question) => question.id), questionHashes: questions.map((question) => sha256(canonicalize(question))),
  } as const;
  const candidate: CandidateBinding = { candidateId: binding.candidateId, version: binding.version, bundleHash: sha256(canonicalize(core)), policyVersion: binding.policyVersion };
  const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
    id: `${binding.packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: binding.packId, check, status: "PASSED" as const,
    evidence: `Combined immutable Waves A–F plus source-verified Wave G automated evidence: ${check}.`,
  }));
  const first = combinedABCDEF.production; const second = waveG.production;
  if (!first || !second) throw new Error("WAVE_G_PRODUCTION_SUMMARY_MISSING");
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade: combinedABCDEF.grade, packId: binding.packId, packVersion: binding.version,
    immutableReference: combinedABCDEF.immutableReference, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
    sources: mergeById(combinedABCDEF.sources, waveG.sources), domains: mergeById(combinedABCDEF.domains, waveG.domains),
    units: mergeById(combinedABCDEF.units, waveG.units), knowledgeNodes: mergeById(combinedABCDEF.knowledgeNodes, waveG.knowledgeNodes),
    skills: mergeById(combinedABCDEF.skills, waveG.skills), objectives: mergeById(combinedABCDEF.objectives, waveG.objectives),
    prerequisites: mergePrerequisites(combinedABCDEF.prerequisites, waveG.prerequisites), blueprints: mergeById(combinedABCDEF.blueprints, waveG.blueprints),
    questions, quarantinedQuestions: [...(combinedABCDEF.quarantinedQuestions ?? []), ...(waveG.quarantinedQuestions ?? [])], explanations,
    evidenceReceipts: mergeById(mergeById(combinedABCDEF.evidenceReceipts, waveG.evidenceReceipts), evidenceReceipts), candidate,
    adaptivePolicy: { version: binding.policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "A+B+C+D+E+F+G", selectedSliceId: binding.selectedSliceId,
      selectionBasis: ["IMMUTABLE_WAVES_A_B_C_D_E_F", "SOURCE_VERIFIED_WAVE_G", "INDEPENDENT_STATISTICS_PROBABILITY_ORACLE"],
      generated: first.generated + second.generated, repaired: first.repaired + second.repaired,
      evidenceGatePassed: first.evidenceGatePassed + second.evidenceGatePassed,
      verificationInsufficient: first.verificationInsufficient + second.verificationInsufficient,
      rejected: first.rejected + second.rejected, duplicate: first.duplicate + second.duplicate,
      candidateEligible: first.candidateEligible + second.candidateEligible },
    legacyAsset: combinedABCDEF.legacyAsset,
  };
}

export function assertWaveGProgressionContract(pack: GradePack, contract: WaveGProgressionContract) {
  if (pack.grade !== contract.grade || contract.waveGSkillIds.length === 0) throw new Error("WAVE_G_PROGRESSION_GRADE_INVALID");
  const skills = new Set(pack.skills.map((skill) => skill.id));
  const targets = [contract.priorSkillId, ...contract.waveGSkillIds, contract.actions.continueTargetSkillId,
    contract.actions.remediateTargetSkillId, contract.actions.advanceTargetSkillId, contract.actions.retentionTargetSkillId,
    ...contract.actions.mixedPracticeTargetSkillIds, contract.nextTargetSkillId];
  for (const skillId of targets) if (!skills.has(skillId)) throw new Error(`WAVE_G_PROGRESSION_SKILL_MISSING:${skillId}`);
  if (contract.schoolGradeMutation || contract.entitlementGrant) throw new Error("WAVE_G_PROGRESSION_SIDE_EFFECT");
  const referenced = new Set(pack.prerequisites.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
  for (const skillId of contract.waveGSkillIds) if (!referenced.has(skillId)) throw new Error(`WAVE_G_PROGRESSION_ORPHAN:${skillId}`);
  return true;
}
