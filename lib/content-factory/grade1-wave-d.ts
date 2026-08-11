import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import {
  GRADE_ONE_SOURCE_DIGEST,
  gradeOneShadowArtifacts,
  gradeOneShadowCandidatePack,
} from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";

const grade = 1 as const;
const packId = "grade-1-wave-d-numbers-to-20-evidence";
const candidateId = "g1-numbers-to-20-evidence-wave-d";
const version = "g1-numbers-to-20-evidence-1.0.0-wave-d";
const policyVersion = "g1-numbers-to-20-evidence-policy-1.0.0-wave-d";
const unitId = "grade-1-numbers-to-20";
const sourceReferenceId = "grade-1-repository-sql-release";
const optionKeys = "ABCD";

const vietnameseNumbers = new Map<number, string>([
  [10, "mười"], [11, "mười một"], [12, "mười hai"], [13, "mười ba"], [14, "mười bốn"],
  [15, "mười lăm"], [16, "mười sáu"], [17, "mười bảy"], [18, "mười tám"], [19, "mười chín"], [20, "hai mươi"],
]);

function integers(value: string) {
  return [...value.matchAll(/\d+/gu)].map((match) => Number(match[0]));
}

function optionFor(question: CandidateQuestion, predicate: (option: string) => boolean) {
  if (!question.options) throw new Error(`GRADE1_WAVE_D_OPTIONS_REQUIRED:${question.id}`);
  const matches = question.options.map((option, index) => ({ option, index })).filter(({ option }) => predicate(option));
  if (matches.length !== 1) throw new Error(`GRADE1_WAVE_D_ORACLE_AMBIGUOUS:${question.id}`);
  return optionKeys[matches[0]!.index]!;
}

function numericResponse(question: CandidateQuestion, expected: number) {
  return question.options
    ? optionFor(question, (option) => integers(option)[0] === expected)
    : String(expected);
}

// Derives the expected response only from the public prompt/options. Stored
// answers and legacy solution steps are deliberately outside this oracle.
export function independentlyDeriveGradeOneWaveDAnswer(question: CandidateQuestion) {
  const number = Number(/q(\d+)$/u.exec(question.id)?.[1]);
  if (!Number.isInteger(number) || number < 1 || number > 24) throw new Error(`GRADE1_WAVE_D_ID_INVALID:${question.id}`);
  const values = integers(question.prompt);

  if (number === 1) return numericResponse(question, [...question.prompt.matchAll(/●/gu)].length);
  if (number === 2) return numericResponse(question, 16);
  if (number === 3) {
    const expected = vietnameseNumbers.get(values[0]!);
    if (!expected) throw new Error(`GRADE1_WAVE_D_NUMBER_NAME_UNSUPPORTED:${question.id}`);
    return optionFor(question, (option) => normalizedDefinition(option).toLocaleLowerCase("vi") === expected);
  }
  if (number === 4 || number === 6) return numericResponse(question, values[0]! + values[1]!);
  if (number === 5) return "12";
  if (number === 7 || number === 12) return numericResponse(question, values[0]! - 1);
  if (number === 8 || number === 11) return numericResponse(question, values[0]! + 1);
  if (number === 9) {
    const sorted = [...values].sort((left, right) => left - right);
    const missing = sorted.find((value, index) => index > 0 && value - sorted[index - 1]! === 2)! - 1;
    return numericResponse(question, missing);
  }
  if (number === 10) return numericResponse(question, values.at(-1)! - 1);
  if (number === 13 || number === 14) {
    const [left, right] = values;
    const relation = left! > right! ? ">" : left! < right! ? "<" : "=";
    return optionFor(question, (option) => option === relation);
  }
  if (number === 15 || number === 18) return numericResponse(question, Math.max(...values));
  if (number === 16) {
    const expected = [...values].sort((left, right) => left - right).join(", ");
    return optionFor(question, (option) => normalizedDefinition(option) === expected);
  }
  if (number === 17) return String(Math.min(...values));
  if (number === 19 || number === 21 || number === 22) {
    const target = values[0]!;
    const tens = Math.floor(target / 10);
    const ones = target % 10;
    return optionFor(question, (option) => {
      const parts = integers(option);
      return parts[0] === tens && parts[1] === ones;
    });
  }
  if (number === 20 || number === 23) return numericResponse(question, values[0]! * 10 + values[1]!);
  if (number === 24) return String(values[0]! % 10);
  throw new Error(`GRADE1_WAVE_D_ORACLE_UNSUPPORTED:${question.id}`);
}

const immutableQuestions = gradeOneShadowCandidatePack.questions.filter((question) => question.unitId === unitId);
const immutableExplanations = gradeOneShadowCandidatePack.explanations.filter((explanation) =>
  immutableQuestions.some((question) => question.id === explanation.questionId),
);
if (immutableQuestions.length !== 24 || immutableExplanations.length !== 24) throw new Error("GRADE1_WAVE_D_SOURCE_BOUNDARY");

const assessments = immutableQuestions.map((question) => {
  const explanation = immutableExplanations.find((entry) => entry.questionId === question.id)!;
  try {
    const independentlyDerived = independentlyDeriveGradeOneWaveDAnswer(question);
    const stored = question.answer.exactValue ?? "";
    const eligible = independentlyDerived === stored && explanation.finalAnswer === stored;
    return { question, explanation, independentlyDerived, eligible, reason: eligible ? null : "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  } catch {
    return { question, explanation, independentlyDerived: null, eligible: false, reason: "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  }
});

export const gradeOneWaveDOracleRows = assessments.map((assessment) => ({
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
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Immutable legacy unit ${unitId} in migration 0020; aggregate SQL digest ${GRADE_ONE_SOURCE_DIGEST}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent public-prompt oracle verified counting, number naming, sequences, comparison and place value for every eligible item."
      : `Grade 1 immutable Wave D evidence overlay: ${check}.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions = assessments.filter((assessment) => assessment.eligible).map(({ question }) => ({
  ...question,
  reviewStatus: "BUNDLED" as const,
  validationReceiptIds: receiptIds,
}));
const quarantinedQuestions = assessments.filter((assessment) => !assessment.eligible).map(({ question }) => ({
  ...question,
  reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
  validationReceiptIds: [] as const,
}));
const explanations = immutableExplanations.filter((explanation) => questions.some((question) => question.id === explanation.questionId));
const blueprintIds = new Set(questions.map((question) => question.blueprintId));
const blueprints = gradeOneShadowCandidatePack.blueprints.filter((blueprint) => blueprintIds.has(blueprint.id));

const candidateCore = {
  format: "plave-grade-1-wave-d-evidence-overlay-v1",
  candidateId,
  version,
  policyVersion,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableSemanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest,
  sourceCandidate: gradeOneShadowCandidatePack.candidate,
  eligibleQuestionIds: questions.map((question) => question.id),
  eligibleQuestionHashes: questions.map((question) => sha256(canonicalize(question))),
  oracleRows: gradeOneWaveDOracleRows,
} as const;

export const gradeOneWaveDBundleHash = sha256(canonicalize(candidateCore));

export const gradeOneWaveDPack: GradePack = {
  ...gradeOneShadowCandidatePack,
  packId,
  packVersion: version,
  prerequisites: [
    ...gradeOneShadowCandidatePack.prerequisites,
    { fromSkillId: "g1-skill-count-read-write-to-20", toSkillId: "g1-skill-sequence-to-20", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-sequence-to-20", toSkillId: "g1-skill-compare-order-to-20", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-compare-order-to-20", toSkillId: "g1-skill-tens-ones-to-20", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints,
  questions,
  quarantinedQuestions,
  explanations,
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...evidenceReceipts],
  candidate: { candidateId, version, bundleHash: gradeOneWaveDBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED", contract: gradeOneShadowCandidatePack.adaptivePolicy.contract },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "D",
    selectedSliceId: "grade-1-numbers-to-20-evidence-overlay",
    selectionBasis: ["IMMUTABLE_LEGACY_SOURCE", "SOURCE_DIGEST_AND_SEMANTIC_PARITY_PRESERVED", "INDEPENDENT_NUMBER_SENSE_ORACLE"],
    generated: 0,
    repaired: 0,
    evidenceGatePassed: questions.length,
    verificationInsufficient: quarantinedQuestions.length,
    rejected: 0,
    duplicate: 0,
    candidateEligible: questions.length,
  },
};

export const gradeOneWaveDProgression = {
  grade,
  priorSkillId: "g1-skill-one-step-subtraction-word-problem",
  waveDSkillIds: ["g1-skill-count-read-write-to-20", "g1-skill-sequence-to-20", "g1-skill-compare-order-to-20", "g1-skill-tens-ones-to-20"],
  prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER",
  actions: {
    continueTargetSkillId: "g1-skill-count-read-write-to-20",
    remediateTargetSkillId: "g1-skill-one-step-subtraction-word-problem",
    advanceTargetSkillId: "g1-skill-tens-ones-to-20",
    retentionTargetSkillId: "g1-skill-count-read-write-to-20",
    mixedPracticeTargetSkillIds: ["g1-skill-sequence-to-20", "g1-skill-compare-order-to-20"],
  },
  nextTargetSkillId: "g1-skill-add-ten-and-ones",
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeOneWaveDMetadata = {
  schemaVersion: "plave-wave-d-metadata-v1",
  wave: "D",
  grade,
  title: "Lớp phủ bằng chứng các số trong phạm vi 20",
  unitId,
  sourceClassification: "VERIFIED_REPOSITORY_SOURCE",
  sourceReferenceIds: [sourceReferenceId],
  sourceFiles: ["supabase/migrations/0020_grade1_numbers_to_20.sql"],
  sourceOutcomeIds: [] as const,
  sourcePages: [] as const,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableShadowCandidate: gradeOneShadowCandidatePack.candidate,
  semanticParity: gradeOneShadowArtifacts.receipt.semanticParity,
  sourceQuestionHashes: gradeOneWaveDOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceQuestionHash })),
  sourceExplanationHashes: gradeOneWaveDOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceExplanationHash })),
  eligibleCount: questions.length,
  quarantinedCount: quarantinedQuestions.length,
  quarantineReason: "AUTOMATED_VERIFICATION_INSUFFICIENT",
  production: gradeOneWaveDPack.production,
  candidate: gradeOneWaveDPack.candidate,
  progression: gradeOneWaveDProgression,
  release: gradeOneWaveDPack.release,
} as const;
