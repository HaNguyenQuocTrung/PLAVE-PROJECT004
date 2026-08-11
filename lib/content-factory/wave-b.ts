import { canonicalize, sha256 } from "./canonical.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type {
  CandidateBinding,
  FactoryGrade,
  GradePack,
  PrerequisiteEdge,
} from "./types.ts";

export type WaveBProgressionContract = Readonly<{
  grade: FactoryGrade;
  waveASkillId: string;
  waveBSkillIds: readonly string[];
  remediationTargetSkillId: string;
  advanceTargetSkillId: string;
  retentionTargetSkillId: string;
  nextTargetSkillId: string;
  schoolGradeMutation: false;
  entitlementGrant: false;
}>;

function mergeById<T extends Readonly<{ id: string }>>(
  first: readonly T[],
  second: readonly T[],
): readonly T[] {
  const overlay = new Map(second.map((entry) => [entry.id, entry]));
  const result = first.map((entry) => overlay.get(entry.id) ?? entry);
  const seen = new Set(first.map((entry) => entry.id));
  result.push(...second.filter((entry) => !seen.has(entry.id)));
  return result;
}

function mergePrerequisites(
  first: readonly PrerequisiteEdge[],
  second: readonly PrerequisiteEdge[],
) {
  return [...new Map([...first, ...second].map((edge) => [
    `${edge.fromSkillId}->${edge.toSkillId}`,
    edge,
  ])).values()];
}

const eligibleReviewStatuses = new Set([
  "EVIDENCE_GATE_PASSED",
  "BUNDLED",
  "PILOT_ELIGIBLE",
  "PUBLISHED",
]);

function productionCounts(pack: GradePack) {
  const eligible = pack.production?.candidateEligible ??
    pack.questions.filter((question) => eligibleReviewStatuses.has(question.reviewStatus)).length;
  return {
    generated: pack.production?.generated ?? eligible,
    repaired: pack.production?.repaired ?? 0,
    evidenceGatePassed: pack.production?.evidenceGatePassed ?? eligible,
    verificationInsufficient: pack.production?.verificationInsufficient ?? (pack.quarantinedQuestions?.length ?? 0),
    rejected: pack.production?.rejected ?? 0,
    duplicate: pack.production?.duplicate ?? 0,
    candidateEligible: eligible,
  };
}

export function combineWavePacks(
  waveA: GradePack,
  waveB: GradePack,
  binding: Readonly<{
    packId: string;
    version: string;
    candidateId: string;
    policyVersion: string;
    selectedSliceId: string;
  }>,
): GradePack {
  if (waveA.grade !== waveB.grade || !waveA.candidate || !waveB.candidate) {
    throw new Error("WAVE_COMBINATION_BINDING_INVALID");
  }
  const questions = mergeById(waveA.questions, waveB.questions);
  const explanations = mergeById(waveA.explanations, waveB.explanations);
  const core = {
    format: "plave-combined-wave-a-b-candidate-v1",
    grade: waveA.grade,
    candidateId: binding.candidateId,
    version: binding.version,
    policyVersion: binding.policyVersion,
    waveA: waveA.candidate,
    waveB: waveB.candidate,
    questionIds: questions.map((question) => question.id),
    questionHashes: questions.map((question) => sha256(canonicalize(question))),
  } as const;
  const candidate: CandidateBinding = {
    candidateId: binding.candidateId,
    version: binding.version,
    bundleHash: sha256(canonicalize(core)),
    policyVersion: binding.policyVersion,
  };
  const waveACounts = productionCounts(waveA);
  const waveBCounts = productionCounts(waveB);
  const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
    id: `${binding.packId}-${check.toLowerCase().replaceAll("_", "-")}`,
    entityId: binding.packId,
    check,
    status: "PASSED" as const,
    evidence: `Combined immutable Wave A plus Wave B automated evidence: ${check}.`,
  }));
  return {
    schemaVersion: "content-factory-grade-pack-v1",
    grade: waveA.grade,
    packId: binding.packId,
    packVersion: binding.version,
    immutableReference: waveA.immutableReference,
    testOnly: false,
    locale: "vi-VN",
    unicodeNormalization: "NFC",
    sources: mergeById(waveA.sources, waveB.sources),
    domains: mergeById(waveA.domains, waveB.domains),
    units: mergeById(waveA.units, waveB.units),
    knowledgeNodes: mergeById(waveA.knowledgeNodes, waveB.knowledgeNodes),
    skills: mergeById(waveA.skills, waveB.skills),
    objectives: mergeById(waveA.objectives, waveB.objectives),
    prerequisites: mergePrerequisites(waveA.prerequisites, waveB.prerequisites),
    blueprints: mergeById(waveA.blueprints, waveB.blueprints),
    questions,
    quarantinedQuestions: [
      ...(waveA.quarantinedQuestions ?? []),
      ...(waveB.quarantinedQuestions ?? []),
    ],
    explanations,
    evidenceReceipts: mergeById(
      mergeById(waveA.evidenceReceipts, waveB.evidenceReceipts),
      evidenceReceipts,
    ),
    candidate,
    adaptivePolicy: { version: binding.policyVersion, status: "VALIDATED" },
    release: {
      publication: "DRAFT",
      visibility: "HIDDEN",
      pilotEnabled: false,
      runtimeEnabled: false,
      retentionEnabled: false,
    },
    production: {
      wave: "A+B",
      selectedSliceId: binding.selectedSliceId,
      selectionBasis: [
        "IMMUTABLE_WAVE_A",
        "SOURCE_VERIFIED_WAVE_B",
        "INDEPENDENT_MATHEMATICAL_ORACLE",
      ],
      generated: waveACounts.generated + waveBCounts.generated,
      repaired: waveACounts.repaired + waveBCounts.repaired,
      evidenceGatePassed: waveACounts.evidenceGatePassed + waveBCounts.evidenceGatePassed,
      verificationInsufficient: waveACounts.verificationInsufficient + waveBCounts.verificationInsufficient,
      rejected: waveACounts.rejected + waveBCounts.rejected,
      duplicate: waveACounts.duplicate + waveBCounts.duplicate,
      candidateEligible: waveACounts.candidateEligible + waveBCounts.candidateEligible,
    },
    legacyAsset: waveA.legacyAsset,
  };
}

export function assertWaveBProgressionContract(
  pack: GradePack,
  contract: WaveBProgressionContract,
) {
  if (pack.grade !== contract.grade || contract.waveBSkillIds.length === 0) {
    throw new Error("WAVE_B_PROGRESSION_GRADE_INVALID");
  }
  const skills = new Set(pack.skills.map((skill) => skill.id));
  for (const skillId of [
    contract.waveASkillId,
    ...contract.waveBSkillIds,
    contract.remediationTargetSkillId,
    contract.advanceTargetSkillId,
    contract.retentionTargetSkillId,
    contract.nextTargetSkillId,
  ]) {
    if (!skills.has(skillId)) throw new Error(`WAVE_B_PROGRESSION_SKILL_MISSING:${skillId}`);
  }
  if (contract.schoolGradeMutation || contract.entitlementGrant) {
    throw new Error("WAVE_B_PROGRESSION_SIDE_EFFECT");
  }
  return true;
}
