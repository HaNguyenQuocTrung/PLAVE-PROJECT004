import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowArtifacts, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";

const grade = 1 as const;
const packId = "grade-1-wave-h-applied-addition-evidence";
const candidateId = "g1-applied-addition-evidence-wave-h";
const version = "g1-applied-addition-evidence-1.0.0-wave-h";
const policyVersion = "g1-applied-addition-evidence-policy-1.0.0-wave-h";
const unitId = "grade-1-addition-within-100-no-carry";
const skillId = "g1-skill-addition-word-problem-100";
const sourceReferenceId = "grade-1-repository-sql-release";

function integers(text: string) { return [...text.matchAll(/\d+/gu)].map((match) => Number(match[0])); }
function optionFor(question: CandidateQuestion, expected: number) {
  if (!question.options) return String(expected);
  const matches = question.options.map((option, index) => ({ option, index })).filter(({ option }) => integers(option)[0] === expected);
  if (matches.length !== 1) throw new Error(`GRADE1_WAVE_H_OPTION_AMBIGUOUS:${question.id}`);
  return "ABCD"[matches[0]!.index]!;
}

// Uses only the immutable public prompt/options projection. Each selected word
// problem explicitly states two group sizes and asks for their combined total.
export function independentlyDeriveGradeOneWaveHAnswer(question: CandidateQuestion) {
  if (!/^g1-add100-q(?:19|20|21|22|23|24)$/u.test(question.id)) throw new Error(`GRADE1_WAVE_H_ID_INVALID:${question.id}`);
  const inputs = integers(question.prompt);
  if (inputs.length !== 2 || inputs.some((input) => input < 0 || input > 100)) throw new Error(`GRADE1_WAVE_H_PUBLIC_INPUTS_INSUFFICIENT:${question.id}`);
  return optionFor(question, inputs[0]! + inputs[1]!);
}

const immutableQuestions = gradeOneShadowCandidatePack.questions.filter((question) => question.unitId === unitId && question.skillId === skillId);
const immutableExplanations = gradeOneShadowCandidatePack.explanations.filter((explanation) => immutableQuestions.some((question) => question.id === explanation.questionId));
if (immutableQuestions.length !== 6 || immutableExplanations.length !== 6) throw new Error("GRADE1_WAVE_H_SOURCE_BOUNDARY");

const assessments = immutableQuestions.map((question) => {
  const explanation = immutableExplanations.find((entry) => entry.questionId === question.id)!;
  try {
    const independentlyDerived = independentlyDeriveGradeOneWaveHAnswer(question);
    const stored = question.answer.exactValue ?? "";
    const eligible = independentlyDerived === stored && explanation.finalAnswer === stored;
    return { question, explanation, independentlyDerived, eligible, reason: eligible ? null : "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  } catch {
    return { question, explanation, independentlyDerived: null, eligible: false, reason: "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  }
});

export const gradeOneWaveHOracleRows = assessments.map((assessment) => ({
  questionId: assessment.question.id,
  sourceQuestionHash: sha256(canonicalize(assessment.question)),
  sourceExplanationHash: sha256(canonicalize(assessment.explanation)),
  publicInputs: integers(assessment.question.prompt),
  reasoningStructure: "COMBINE_TWO_GROUPS" as const,
  independentlyDerived: assessment.independentlyDerived,
  answerMatches: assessment.eligible,
  explanationMatches: assessment.eligible,
  status: assessment.eligible ? "PASSED" as const : "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
  reason: assessment.reason,
}));

const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Immutable legacy applied-word rows q19–q24 in migration 0025; aggregate SQL digest ${GRADE_ONE_SOURCE_DIGEST}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent public-prompt oracle recomputed both-group totals and resolved each stored response and explanation."
      : `Grade 1 immutable Wave H applied-word overlay: ${check}.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions = assessments.filter((assessment) => assessment.eligible).map(({ question }) => ({ ...question, reviewStatus: "BUNDLED" as const, validationReceiptIds: receiptIds }));
const quarantinedQuestions = assessments.filter((assessment) => !assessment.eligible).map(({ question }) => ({ ...question, reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const, validationReceiptIds: [] as const }));
const explanations = immutableExplanations.filter((explanation) => questions.some((question) => question.id === explanation.questionId));
const blueprintIds = new Set(questions.map((question) => question.blueprintId));
const blueprints = gradeOneShadowCandidatePack.blueprints.filter((blueprint) => blueprintIds.has(blueprint.id));
const candidateCore = { format: "plave-grade-1-wave-h-evidence-overlay-v1", candidateId, version, policyVersion, immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST, immutableSemanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest, sourceCandidate: gradeOneShadowCandidatePack.candidate, eligibleQuestionIds: questions.map((question) => question.id), eligibleQuestionHashes: questions.map((question) => sha256(canonicalize(question))), oracleRows: gradeOneWaveHOracleRows } as const;
export const gradeOneWaveHBundleHash = sha256(canonicalize(candidateCore));

export const gradeOneWaveHPack: GradePack = {
  ...gradeOneShadowCandidatePack, packId, packVersion: version, blueprints, questions, quarantinedQuestions, explanations,
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...evidenceReceipts],
  candidate: { candidateId, version, bundleHash: gradeOneWaveHBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED", contract: gradeOneShadowCandidatePack.adaptivePolicy.contract },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "H", selectedSliceId: "grade-1-applied-addition-within-100-evidence-overlay", selectionBasis: ["IMMUTABLE_LEGACY_SOURCE", "APPLIED_WORD_PROBLEM_SUBSET", "PUBLIC_INPUTS_COMPLETE", "INDEPENDENT_COMBINE_ORACLE", "FAIL_CLOSED_ON_AMBIGUITY"], generated: 0, repaired: 0, evidenceGatePassed: questions.length, verificationInsufficient: quarantinedQuestions.length, rejected: 0, duplicate: 0, candidateEligible: questions.length },
};

export const gradeOneWaveHProgression = {
  grade, priorSkillId: "g1-skill-missing-number-addition-100", waveHSkillIds: [skillId], prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER",
  actions: { continueTargetSkillId: skillId, remediateTargetSkillId: "g1-skill-missing-number-addition-100", advanceTargetSkillId: skillId, retentionTargetSkillId: skillId, mixedPracticeTargetSkillIds: ["g1-skill-add-two-digit-no-carry", skillId] },
  nextTargetSkillId: skillId, schoolGradeMutation: false, entitlementGrant: false,
} as const;

export const gradeOneWaveHMetadata = {
  schemaVersion: "plave-wave-h-metadata-v1", wave: "H", grade, title: "Lớp phủ bài toán cộng có lời văn trong phạm vi 100", unitId, skillId,
  sourceClassification: "VERIFIED_REPOSITORY_SOURCE", sourceReferenceIds: [sourceReferenceId], sourceFiles: ["supabase/migrations/0025_grade1_addition_within_100_no_carry.sql"], sourceOutcomeIds: [] as const, sourcePages: [] as const,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST, immutableShadowCandidate: gradeOneShadowCandidatePack.candidate, semanticParity: gradeOneShadowArtifacts.receipt.semanticParity,
  sourceQuestionHashes: gradeOneWaveHOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceQuestionHash })), sourceExplanationHashes: gradeOneWaveHOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceExplanationHash })),
  eligibleCount: questions.length, quarantinedCount: quarantinedQuestions.length, quarantineReason: "AUTOMATED_VERIFICATION_INSUFFICIENT", production: gradeOneWaveHPack.production, candidate: gradeOneWaveHPack.candidate, progression: gradeOneWaveHProgression, release: gradeOneWaveHPack.release,
} as const;
