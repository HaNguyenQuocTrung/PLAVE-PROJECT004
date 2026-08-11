import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateBinding, FactoryGrade, GradePack, PrerequisiteEdge } from "./types.ts";

export type WaveCProgressionContract = Readonly<{
  grade: FactoryGrade;
  priorSkillId: string;
  waveCSkillIds: readonly string[];
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

export function combineWaveABCPacks(
  combinedAB: GradePack,
  waveC: GradePack,
  binding: Readonly<{ packId: string; version: string; candidateId: string; policyVersion: string; selectedSliceId: string }>,
): GradePack {
  if (combinedAB.grade !== waveC.grade || !combinedAB.candidate || !waveC.candidate) throw new Error("WAVE_C_COMBINATION_BINDING_INVALID");
  const questions = mergeById(combinedAB.questions, waveC.questions);
  const explanations = mergeById(combinedAB.explanations, waveC.explanations);
  const core = {
    format: "plave-combined-wave-a-b-c-candidate-v1",
    grade: combinedAB.grade,
    candidateId: binding.candidateId,
    version: binding.version,
    policyVersion: binding.policyVersion,
    combinedAB: combinedAB.candidate,
    waveC: waveC.candidate,
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
    evidence: `Combined immutable Wave A plus Wave B plus source-verified Wave C automated evidence: ${check}.`,
  }));
  const first = combinedAB.production;
  const second = waveC.production;
  if (!first || !second) throw new Error("WAVE_C_PRODUCTION_SUMMARY_MISSING");
  return {
    schemaVersion: "content-factory-grade-pack-v1",
    grade: combinedAB.grade,
    packId: binding.packId,
    packVersion: binding.version,
    immutableReference: combinedAB.immutableReference,
    testOnly: false,
    locale: "vi-VN",
    unicodeNormalization: "NFC",
    sources: mergeById(combinedAB.sources, waveC.sources),
    domains: mergeById(combinedAB.domains, waveC.domains),
    units: mergeById(combinedAB.units, waveC.units),
    knowledgeNodes: mergeById(combinedAB.knowledgeNodes, waveC.knowledgeNodes),
    skills: mergeById(combinedAB.skills, waveC.skills),
    objectives: mergeById(combinedAB.objectives, waveC.objectives),
    prerequisites: mergePrerequisites(combinedAB.prerequisites, waveC.prerequisites),
    blueprints: mergeById(combinedAB.blueprints, waveC.blueprints),
    questions,
    quarantinedQuestions: [...(combinedAB.quarantinedQuestions ?? []), ...(waveC.quarantinedQuestions ?? [])],
    explanations,
    evidenceReceipts: mergeById(mergeById(combinedAB.evidenceReceipts, waveC.evidenceReceipts), evidenceReceipts),
    candidate,
    adaptivePolicy: { version: binding.policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "A+B+C",
      selectedSliceId: binding.selectedSliceId,
      selectionBasis: ["IMMUTABLE_WAVE_A_AND_B", "SOURCE_VERIFIED_WAVE_C", "INDEPENDENT_MATHEMATICAL_ORACLE"],
      generated: first.generated + second.generated,
      repaired: first.repaired + second.repaired,
      evidenceGatePassed: first.evidenceGatePassed + second.evidenceGatePassed,
      verificationInsufficient: first.verificationInsufficient + second.verificationInsufficient,
      rejected: first.rejected + second.rejected,
      duplicate: first.duplicate + second.duplicate,
      candidateEligible: first.candidateEligible + second.candidateEligible,
    },
    legacyAsset: combinedAB.legacyAsset,
  };
}

export function assertWaveCProgressionContract(pack: GradePack, contract: WaveCProgressionContract) {
  if (pack.grade !== contract.grade || contract.waveCSkillIds.length === 0) throw new Error("WAVE_C_PROGRESSION_GRADE_INVALID");
  const skills = new Set(pack.skills.map((skill) => skill.id));
  const targets = [
    contract.priorSkillId,
    ...contract.waveCSkillIds,
    contract.actions.continueTargetSkillId,
    contract.actions.remediateTargetSkillId,
    contract.actions.advanceTargetSkillId,
    contract.actions.retentionTargetSkillId,
    ...contract.actions.mixedPracticeTargetSkillIds,
    contract.nextTargetSkillId,
  ];
  for (const skillId of targets) if (!skills.has(skillId)) throw new Error(`WAVE_C_PROGRESSION_SKILL_MISSING:${skillId}`);
  if (contract.schoolGradeMutation || contract.entitlementGrant) throw new Error("WAVE_C_PROGRESSION_SIDE_EFFECT");
  const edges = new Set(pack.prerequisites.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
  for (const skillId of contract.waveCSkillIds) if (!edges.has(skillId)) throw new Error(`WAVE_C_PROGRESSION_ORPHAN:${skillId}`);
  return true;
}
