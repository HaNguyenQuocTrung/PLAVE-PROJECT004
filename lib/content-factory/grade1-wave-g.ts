import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowArtifacts, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";

const grade = 1 as const;
const packId = "grade-1-wave-g-classify-count-evidence";
const candidateId = "g1-classify-count-evidence-wave-g";
const version = "g1-classify-count-evidence-1.0.0-wave-g";
const policyVersion = "g1-classify-count-evidence-policy-1.0.0-wave-g";
const unitId = "grade-1-basic-geometry-and-position";
const skillId = "g1-skill-count-shapes-in-picture";
const sourceReferenceId = "grade-1-repository-sql-release";

// The shadow projection deliberately excludes visual_spec. These six count and
// classification prompts therefore expose neither the dataset nor a sample
// total at the candidate boundary and must remain fail closed.
export function independentlyDeriveGradeOneWaveGAnswer(question: CandidateQuestion): never {
  if (!/^g1-geo-q(?:19|20|21|22|23|24)$/u.test(question.id)) throw new Error(`GRADE1_WAVE_G_ID_INVALID:${question.id}`);
  throw new Error(`GRADE1_WAVE_G_PUBLIC_DATASET_INSUFFICIENT:${question.id}`);
}

const immutableQuestions = gradeOneShadowCandidatePack.questions.filter((question) => question.unitId === unitId && question.skillId === skillId);
const immutableExplanations = gradeOneShadowCandidatePack.explanations.filter((explanation) => immutableQuestions.some((question) => question.id === explanation.questionId));
if (immutableQuestions.length !== 6 || immutableExplanations.length !== 6) throw new Error("GRADE1_WAVE_G_SOURCE_BOUNDARY");

const assessments = immutableQuestions.map((question) => {
  const explanation = immutableExplanations.find((entry) => entry.questionId === question.id)!;
  try {
    const independentlyDerived = independentlyDeriveGradeOneWaveGAnswer(question);
    const stored = question.answer.exactValue ?? "";
    const eligible = independentlyDerived === stored && explanation.finalAnswer === stored;
    return { question, explanation, independentlyDerived, eligible, reason: eligible ? null : "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  } catch {
    return { question, explanation, independentlyDerived: null, eligible: false, reason: "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  }
});

export const gradeOneWaveGOracleRows = assessments.map((assessment) => ({
  questionId: assessment.question.id,
  sourceQuestionHash: sha256(canonicalize(assessment.question)),
  sourceExplanationHash: sha256(canonicalize(assessment.explanation)),
  independentlyDerived: assessment.independentlyDerived,
  publicDatasetPresent: false as const,
  answerMatches: assessment.eligible,
  explanationMatches: assessment.eligible,
  status: assessment.eligible ? "PASSED" as const : "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
  reason: assessment.reason,
}));

const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: check === "MATHEMATICAL_ANSWER" ? "INSUFFICIENT" as const : "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Immutable legacy ${skillId} rows q19–q24 in migration 0027; aggregate SQL digest ${GRADE_ONE_SOURCE_DIGEST}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "The public shadow projection omits the visual dataset required to independently count or classify every selected row; all six remain quarantined."
      : `Grade 1 immutable Wave G classify/count overlay: ${check}.`,
}));
const questions: CandidateQuestion[] = [];
const quarantinedQuestions = assessments.map(({ question }) => ({ ...question, reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const, validationReceiptIds: [] as const }));
const candidateCore = {
  format: "plave-grade-1-wave-g-evidence-overlay-v1", candidateId, version, policyVersion,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableSemanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest,
  sourceCandidate: gradeOneShadowCandidatePack.candidate,
  selectedSourceQuestionIds: immutableQuestions.map((question) => question.id),
  eligibleQuestionIds: [] as const,
  oracleRows: gradeOneWaveGOracleRows,
} as const;
export const gradeOneWaveGBundleHash = sha256(canonicalize(candidateCore));

export const gradeOneWaveGPack: GradePack = {
  ...gradeOneShadowCandidatePack,
  packId,
  packVersion: version,
  blueprints: [],
  questions,
  quarantinedQuestions,
  explanations: [],
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...evidenceReceipts],
  candidate: { candidateId, version, bundleHash: gradeOneWaveGBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED", contract: gradeOneShadowCandidatePack.adaptivePolicy.contract },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "G", selectedSliceId: "grade-1-classify-count-visual-evidence-overlay", selectionBasis: ["IMMUTABLE_LEGACY_SOURCE", "DATA_LIKE_CLASSIFICATION_AND_COUNTING", "PUBLIC_VISUAL_DATASET_ABSENT", "FAIL_CLOSED_QUARANTINE"], generated: 0, repaired: 0, evidenceGatePassed: 0, verificationInsufficient: 6, rejected: 0, duplicate: 0, candidateEligible: 0 },
};

export const gradeOneWaveGProgression = {
  grade,
  priorSkillId: "g1-skill-position-relations",
  waveGSkillIds: [skillId],
  prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER",
  actions: { continueTargetSkillId: "g1-skill-position-relations", remediateTargetSkillId: "g1-skill-position-relations", advanceTargetSkillId: "g1-skill-position-relations", retentionTargetSkillId: "g1-skill-position-relations", mixedPracticeTargetSkillIds: ["g1-skill-recognize-basic-shapes", "g1-skill-position-relations"] },
  nextTargetSkillId: "g1-skill-position-relations",
  emptyPoolBehavior: "FAIL_CLOSED_AUTOMATED_VERIFICATION_INSUFFICIENT",
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeOneWaveGMetadata = {
  schemaVersion: "plave-wave-g-metadata-v1", wave: "G", grade, title: "Lớp phủ phân loại và kiểm đếm đối tượng trực quan", unitId, skillId,
  sourceClassification: "VERIFIED_REPOSITORY_SOURCE", sourceReferenceIds: [sourceReferenceId], sourceFiles: ["supabase/migrations/0027_grade1_basic_geometry_and_position.sql"], sourceOutcomeIds: [] as const, sourcePages: [] as const,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST, immutableShadowCandidate: gradeOneShadowCandidatePack.candidate, semanticParity: gradeOneShadowArtifacts.receipt.semanticParity,
  sourceQuestionHashes: gradeOneWaveGOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceQuestionHash })), sourceExplanationHashes: gradeOneWaveGOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceExplanationHash })),
  eligibleCount: 0, quarantinedCount: 6, quarantineReason: "AUTOMATED_VERIFICATION_INSUFFICIENT", production: gradeOneWaveGPack.production, candidate: gradeOneWaveGPack.candidate, progression: gradeOneWaveGProgression, release: gradeOneWaveGPack.release,
} as const;
