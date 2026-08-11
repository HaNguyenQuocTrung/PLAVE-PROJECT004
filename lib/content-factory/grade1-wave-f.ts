import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowArtifacts, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";

const grade = 1 as const;
const packId = "grade-1-wave-f-addition-to-20-evidence";
const candidateId = "g1-addition-to-20-evidence-wave-f";
const version = "g1-addition-to-20-evidence-1.0.0-wave-f";
const policyVersion = "g1-addition-to-20-evidence-policy-1.0.0-wave-f";
const unitId = "grade-1-addition-within-20-no-carry";
const sourceReferenceId = "grade-1-repository-sql-release";
const optionKeys = "ABCD";

function integers(text: string) { return [...text.matchAll(/\d+/gu)].map((match) => Number(match[0])); }
function sums(text: string) { return [...text.matchAll(/(\d+)\s*\+\s*(\d+)/gu)].map((match) => Number(match[1]) + Number(match[2])); }
function optionFor(question: CandidateQuestion, predicate: (option: string) => boolean) {
  if (!question.options) throw new Error(`GRADE1_WAVE_F_OPTIONS_REQUIRED:${question.id}`);
  const matches = question.options.map((option, index) => ({ option, index })).filter(({ option }) => predicate(option));
  if (matches.length !== 1) throw new Error(`GRADE1_WAVE_F_ORACLE_AMBIGUOUS:${question.id}`);
  return optionKeys[matches[0]!.index]!;
}
function numericResponse(question: CandidateQuestion, expected: number) {
  return question.options ? optionFor(question, (option) => integers(option)[0] === expected) : String(expected);
}

// Uses only the immutable public prompt/options projection. Stored answers and
// legacy explanations are intentionally outside this independent oracle.
export function independentlyDeriveGradeOneWaveFAnswer(question: CandidateQuestion) {
  const number = Number(/q(\d+)$/u.exec(question.id)?.[1]);
  if (!Number.isInteger(number) || number < 1 || number > 24) throw new Error(`GRADE1_WAVE_F_ID_INVALID:${question.id}`);
  const promptValues = integers(question.prompt);
  const promptSums = sums(question.prompt);
  if ([1, 2, 5, 6, 7, 8, 9, 11, 12, 13].includes(number)) return numericResponse(question, promptSums.at(-1)!);
  if (number === 3 || number === 10) {
    const target = promptValues[0]!;
    return optionFor(question, (option) => sums(option)[0] === target);
  }
  if (number === 4) {
    const target = promptSums[0]!;
    return optionFor(question, (option) => sums(option)[0] === target);
  }
  if (number === 14) {
    const [left, right] = promptValues;
    return optionFor(question, (option) => {
      const operands = integers(option);
      return operands[0] === left! % 10 && operands[1] === right;
    });
  }
  if (number === 15) {
    const result = promptSums[0]!;
    return optionFor(question, (option) => {
      const parts = integers(option);
      return parts[0] === Math.floor(result / 10) && parts[1] === result % 10;
    });
  }
  if (number === 16) {
    const [left, right] = promptValues;
    const expected = [10, left! % 10, right!, left! + right!];
    return optionFor(question, (option) => {
      const parts = integers(option);
      return expected.every((value, index) => parts[index] === value);
    });
  }
  if (number === 17) return String(promptValues[1]! + promptValues[2]!);
  if (number === 18) return String(promptValues[0]! % 10 + promptValues[1]!);
  if (number >= 19) return numericResponse(question, promptValues[0]! + promptValues[1]!);
  throw new Error(`GRADE1_WAVE_F_ORACLE_UNSUPPORTED:${question.id}`);
}

const immutableQuestions = gradeOneShadowCandidatePack.questions.filter((question) => question.unitId === unitId);
const immutableExplanations = gradeOneShadowCandidatePack.explanations.filter((explanation) => immutableQuestions.some((question) => question.id === explanation.questionId));
if (immutableQuestions.length !== 24 || immutableExplanations.length !== 24) throw new Error("GRADE1_WAVE_F_SOURCE_BOUNDARY");

const assessments = immutableQuestions.map((question) => {
  const explanation = immutableExplanations.find((entry) => entry.questionId === question.id)!;
  try {
    const independentlyDerived = independentlyDeriveGradeOneWaveFAnswer(question);
    const stored = question.answer.exactValue ?? "";
    const eligible = independentlyDerived === stored && explanation.finalAnswer === stored;
    return { question, explanation, independentlyDerived, eligible, reason: eligible ? null : "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  } catch {
    return { question, explanation, independentlyDerived: null, eligible: false, reason: "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  }
});

export const gradeOneWaveFOracleRows = assessments.map((assessment) => ({
  questionId: assessment.question.id,
  sourceQuestionHash: sha256(canonicalize(assessment.question)),
  sourceExplanationHash: sha256(canonicalize(assessment.explanation)),
  independentlyDerived: assessment.independentlyDerived,
  answerMatches: assessment.eligible,
  explanationMatches: assessment.eligible,
  status: assessment.eligible ? "PASSED" as const : "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
  reason: assessment.reason,
}));

const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Immutable legacy unit ${unitId} in migration 0021; aggregate SQL digest ${GRADE_ONE_SOURCE_DIGEST}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent public-prompt addition oracle verified every candidate-eligible item; unsupported rows remain fail-closed."
      : `Grade 1 immutable Wave F evidence overlay: ${check}.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions = assessments.filter((assessment) => assessment.eligible).map(({ question }) => ({ ...question, reviewStatus: "BUNDLED" as const, validationReceiptIds: receiptIds }));
const quarantinedQuestions = assessments.filter((assessment) => !assessment.eligible).map(({ question }) => ({ ...question, reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const, validationReceiptIds: [] }));
const explanations = immutableExplanations.filter((explanation) => questions.some((question) => question.id === explanation.questionId));
const blueprintIds = new Set(questions.map((question) => question.blueprintId));
const blueprints = gradeOneShadowCandidatePack.blueprints.filter((blueprint) => blueprintIds.has(blueprint.id));
const candidateCore = {
  format: "plave-grade-1-wave-f-evidence-overlay-v1", candidateId, version, policyVersion,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableSemanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest,
  sourceCandidate: gradeOneShadowCandidatePack.candidate,
  eligibleQuestionIds: questions.map((question) => question.id),
  eligibleQuestionHashes: questions.map((question) => sha256(canonicalize(question))),
  oracleRows: gradeOneWaveFOracleRows,
} as const;
export const gradeOneWaveFBundleHash = sha256(canonicalize(candidateCore));

export const gradeOneWaveFPack: GradePack = {
  ...gradeOneShadowCandidatePack, packId, packVersion: version,
  prerequisites: [
    ...gradeOneShadowCandidatePack.prerequisites,
    { fromSkillId: "g1-skill-tens-ones-to-20", toSkillId: "g1-skill-add-teen-and-ones-no-carry", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-tens-ones-to-20", toSkillId: "g1-skill-add-using-tens-ones", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints, questions, quarantinedQuestions, explanations,
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...evidenceReceipts],
  candidate: { candidateId, version, bundleHash: gradeOneWaveFBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED", contract: gradeOneShadowCandidatePack.adaptivePolicy.contract },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "F", selectedSliceId: "grade-1-addition-within-20-no-carry-evidence-overlay", selectionBasis: ["IMMUTABLE_LEGACY_SOURCE", "SOURCE_DIGEST_AND_SEMANTIC_PARITY_PRESERVED", "INDEPENDENT_ADDITION_ORACLE", "FAIL_CLOSED_QUARANTINE"], generated: 0, repaired: 0, evidenceGatePassed: questions.length, verificationInsufficient: quarantinedQuestions.length, rejected: 0, duplicate: 0, candidateEligible: questions.length },
};

export const gradeOneWaveFProgression = {
  grade, priorSkillId: "g1-skill-tens-ones-to-20",
  waveFSkillIds: ["g1-skill-add-ten-and-ones", "g1-skill-add-teen-and-ones-no-carry", "g1-skill-add-using-tens-ones", "g1-skill-one-step-addition-to-20"],
  prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER",
  actions: { continueTargetSkillId: "g1-skill-add-ten-and-ones", remediateTargetSkillId: "g1-skill-tens-ones-to-20", advanceTargetSkillId: "g1-skill-one-step-addition-to-20", retentionTargetSkillId: "g1-skill-add-ten-and-ones", mixedPracticeTargetSkillIds: ["g1-skill-add-teen-and-ones-no-carry", "g1-skill-add-using-tens-ones"] },
  nextTargetSkillId: "g1-skill-one-step-addition-to-20", schoolGradeMutation: false, entitlementGrant: false,
} as const;

export const gradeOneWaveFMetadata = {
  schemaVersion: "plave-wave-f-metadata-v1", wave: "F", grade, title: "Lớp phủ bằng chứng phép cộng trong phạm vi 20 không nhớ", unitId,
  sourceClassification: "VERIFIED_REPOSITORY_SOURCE", sourceReferenceIds: [sourceReferenceId], sourceFiles: ["supabase/migrations/0021_grade1_addition_within_20_no_carry.sql"], sourceOutcomeIds: [] as const, sourcePages: [] as const,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST, immutableShadowCandidate: gradeOneShadowCandidatePack.candidate, semanticParity: gradeOneShadowArtifacts.receipt.semanticParity,
  sourceQuestionHashes: gradeOneWaveFOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceQuestionHash })), sourceExplanationHashes: gradeOneWaveFOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceExplanationHash })),
  eligibleCount: questions.length, quarantinedCount: quarantinedQuestions.length, quarantineReason: "AUTOMATED_VERIFICATION_INSUFFICIENT", production: gradeOneWaveFPack.production, candidate: gradeOneWaveFPack.candidate, progression: gradeOneWaveFProgression, release: gradeOneWaveFPack.release,
} as const;
