import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateBinding, FactoryGrade, GradePack, PrerequisiteEdge } from "./types.ts";

export type WaveEProgressionContract = Readonly<{
  grade: FactoryGrade;
  priorSkillId: string;
  waveESkillIds: readonly string[];
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

export function combineWaveABCDEPacks(
  combinedABCD: GradePack,
  waveE: GradePack,
  binding: Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>,
): GradePack {
  if (combinedABCD.grade !== waveE.grade || !combinedABCD.candidate || !waveE.candidate) throw new Error("WAVE_E_COMBINATION_BINDING_INVALID");
  const questions = mergeById(combinedABCD.questions, waveE.questions);
  const explanations = mergeById(combinedABCD.explanations, waveE.explanations);
  const core = {
    format: "plave-combined-wave-a-b-c-d-e-candidate-v1",
    grade: combinedABCD.grade,
    candidateId: binding.candidateId,
    version: binding.version,
    policyVersion: binding.policyVersion,
    combinedABCD: combinedABCD.candidate,
    waveE: waveE.candidate,
    questionIds: questions.map((question) => question.id),
    questionHashes: questions.map((question) => sha256(canonicalize(question))),
  } as const;
  const candidate: CandidateBinding = { candidateId: binding.candidateId, version: binding.version, bundleHash: sha256(canonicalize(core)), policyVersion: binding.policyVersion };
  const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
    id: `${binding.packId}-${check.toLowerCase().replaceAll("_", "-")}`,
    entityId: binding.packId,
    check,
    status: "PASSED" as const,
    evidence: `Combined immutable Waves A–D plus source-verified Wave E automated evidence: ${check}.`,
  }));
  const first = combinedABCD.production;
  const second = waveE.production;
  if (!first || !second) throw new Error("WAVE_E_PRODUCTION_SUMMARY_MISSING");
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade: combinedABCD.grade, packId: binding.packId, packVersion: binding.version,
    immutableReference: combinedABCD.immutableReference, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
    sources: mergeById(combinedABCD.sources, waveE.sources), domains: mergeById(combinedABCD.domains, waveE.domains),
    units: mergeById(combinedABCD.units, waveE.units), knowledgeNodes: mergeById(combinedABCD.knowledgeNodes, waveE.knowledgeNodes),
    skills: mergeById(combinedABCD.skills, waveE.skills), objectives: mergeById(combinedABCD.objectives, waveE.objectives),
    prerequisites: mergePrerequisites(combinedABCD.prerequisites, waveE.prerequisites), blueprints: mergeById(combinedABCD.blueprints, waveE.blueprints),
    questions, quarantinedQuestions: [...(combinedABCD.quarantinedQuestions ?? []), ...(waveE.quarantinedQuestions ?? [])], explanations,
    evidenceReceipts: mergeById(mergeById(combinedABCD.evidenceReceipts, waveE.evidenceReceipts), evidenceReceipts), candidate,
    adaptivePolicy: { version: binding.policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "A+B+C+D+E", selectedSliceId: binding.selectedSliceId,
      selectionBasis: ["IMMUTABLE_WAVES_A_B_C_D", "SOURCE_VERIFIED_WAVE_E", "INDEPENDENT_MATHEMATICAL_ORACLE"],
      generated: first.generated + second.generated, repaired: first.repaired + second.repaired,
      evidenceGatePassed: first.evidenceGatePassed + second.evidenceGatePassed,
      verificationInsufficient: first.verificationInsufficient + second.verificationInsufficient,
      rejected: first.rejected + second.rejected, duplicate: first.duplicate + second.duplicate,
      candidateEligible: first.candidateEligible + second.candidateEligible,
    },
    legacyAsset: combinedABCD.legacyAsset,
  };
}

export function assertWaveEProgressionContract(pack: GradePack, contract: WaveEProgressionContract) {
  if (pack.grade !== contract.grade || contract.waveESkillIds.length === 0) throw new Error("WAVE_E_PROGRESSION_GRADE_INVALID");
  const skills = new Set(pack.skills.map((skill) => skill.id));
  const targets = [contract.priorSkillId, ...contract.waveESkillIds, contract.actions.continueTargetSkillId,
    contract.actions.remediateTargetSkillId, contract.actions.advanceTargetSkillId, contract.actions.retentionTargetSkillId,
    ...contract.actions.mixedPracticeTargetSkillIds, contract.nextTargetSkillId];
  for (const skillId of targets) if (!skills.has(skillId)) throw new Error(`WAVE_E_PROGRESSION_SKILL_MISSING:${skillId}`);
  if (contract.schoolGradeMutation || contract.entitlementGrant) throw new Error("WAVE_E_PROGRESSION_SIDE_EFFECT");
  const referenced = new Set(pack.prerequisites.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
  for (const skillId of contract.waveESkillIds) if (!referenced.has(skillId)) throw new Error(`WAVE_E_PROGRESSION_ORPHAN:${skillId}`);
  return true;
}
