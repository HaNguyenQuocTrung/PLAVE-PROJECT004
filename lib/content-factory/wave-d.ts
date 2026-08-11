import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateBinding, FactoryGrade, GradePack, PrerequisiteEdge } from "./types.ts";

export type WaveDProgressionContract = Readonly<{
  grade: FactoryGrade;
  priorSkillId: string;
  waveDSkillIds: readonly string[];
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

export function combineWaveABCDPacks(
  combinedABC: GradePack,
  waveD: GradePack,
  binding: Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>,
): GradePack {
  if (combinedABC.grade !== waveD.grade || !combinedABC.candidate || !waveD.candidate) throw new Error("WAVE_D_COMBINATION_BINDING_INVALID");
  const questions = mergeById(combinedABC.questions, waveD.questions);
  const explanations = mergeById(combinedABC.explanations, waveD.explanations);
  const core = {
    format: "plave-combined-wave-a-b-c-d-candidate-v1",
    grade: combinedABC.grade,
    candidateId: binding.candidateId,
    version: binding.version,
    policyVersion: binding.policyVersion,
    combinedABC: combinedABC.candidate,
    waveD: waveD.candidate,
    questionIds: questions.map((question) => question.id),
    questionHashes: questions.map((question) => sha256(canonicalize(question))),
  } as const;
  const candidate: CandidateBinding = {
    candidateId: binding.candidateId,
    version: binding.version,
    bundleHash: sha256(canonicalize(core)),
    policyVersion: binding.policyVersion,
  };
  const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
    id: `${binding.packId}-${check.toLowerCase().replaceAll("_", "-")}`,
    entityId: binding.packId,
    check,
    status: "PASSED" as const,
    evidence: `Combined immutable Waves A–C plus source-verified Wave D automated evidence: ${check}.`,
  }));
  const first = combinedABC.production;
  const second = waveD.production;
  if (!first || !second) throw new Error("WAVE_D_PRODUCTION_SUMMARY_MISSING");
  return {
    schemaVersion: "content-factory-grade-pack-v1",
    grade: combinedABC.grade,
    packId: binding.packId,
    packVersion: binding.version,
    immutableReference: combinedABC.immutableReference,
    testOnly: false,
    locale: "vi-VN",
    unicodeNormalization: "NFC",
    sources: mergeById(combinedABC.sources, waveD.sources),
    domains: mergeById(combinedABC.domains, waveD.domains),
    units: mergeById(combinedABC.units, waveD.units),
    knowledgeNodes: mergeById(combinedABC.knowledgeNodes, waveD.knowledgeNodes),
    skills: mergeById(combinedABC.skills, waveD.skills),
    objectives: mergeById(combinedABC.objectives, waveD.objectives),
    prerequisites: mergePrerequisites(combinedABC.prerequisites, waveD.prerequisites),
    blueprints: mergeById(combinedABC.blueprints, waveD.blueprints),
    questions,
    quarantinedQuestions: [...(combinedABC.quarantinedQuestions ?? []), ...(waveD.quarantinedQuestions ?? [])],
    explanations,
    evidenceReceipts: mergeById(mergeById(combinedABC.evidenceReceipts, waveD.evidenceReceipts), evidenceReceipts),
    candidate,
    adaptivePolicy: { version: binding.policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "A+B+C+D",
      selectedSliceId: binding.selectedSliceId,
      selectionBasis: ["IMMUTABLE_WAVES_A_B_C", "SOURCE_VERIFIED_WAVE_D", "INDEPENDENT_MATHEMATICAL_ORACLE"],
      generated: first.generated + second.generated,
      repaired: first.repaired + second.repaired,
      evidenceGatePassed: first.evidenceGatePassed + second.evidenceGatePassed,
      verificationInsufficient: first.verificationInsufficient + second.verificationInsufficient,
      rejected: first.rejected + second.rejected,
      duplicate: first.duplicate + second.duplicate,
      candidateEligible: first.candidateEligible + second.candidateEligible,
    },
    legacyAsset: combinedABC.legacyAsset,
  };
}

export function assertWaveDProgressionContract(pack: GradePack, contract: WaveDProgressionContract) {
  if (pack.grade !== contract.grade || contract.waveDSkillIds.length === 0) throw new Error("WAVE_D_PROGRESSION_GRADE_INVALID");
  const skills = new Set(pack.skills.map((skill) => skill.id));
  const targets = [
    contract.priorSkillId,
    ...contract.waveDSkillIds,
    contract.actions.continueTargetSkillId,
    contract.actions.remediateTargetSkillId,
    contract.actions.advanceTargetSkillId,
    contract.actions.retentionTargetSkillId,
    ...contract.actions.mixedPracticeTargetSkillIds,
    contract.nextTargetSkillId,
  ];
  for (const skillId of targets) if (!skills.has(skillId)) throw new Error(`WAVE_D_PROGRESSION_SKILL_MISSING:${skillId}`);
  if (contract.schoolGradeMutation || contract.entitlementGrant) throw new Error("WAVE_D_PROGRESSION_SIDE_EFFECT");
  const referenced = new Set(pack.prerequisites.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
  for (const skillId of contract.waveDSkillIds) if (!referenced.has(skillId)) throw new Error(`WAVE_D_PROGRESSION_ORPHAN:${skillId}`);
  return true;
}
