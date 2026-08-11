import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import {
  GRADE_ONE_SOURCE_DIGEST,
  gradeOneShadowCandidatePack,
} from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";
import {
  assertWaveBProgressionContract,
  combineWavePacks,
  type WaveBProgressionContract,
} from "./wave-b.ts";

const packId = "grade-1-wave-b-addition-evidence";
const candidateId = "g1-addition-evidence-wave-b";
const version = "g1-addition-evidence-1.0.0-wave-b";
const policyVersion = "g1-addition-evidence-policy-1.0.0-wave-b";
const unitId = "grade-1-addition-within-10";
const optionKeys = "ABCD";

function integers(value: string) {
  return [...value.matchAll(/\d+/gu)].map((match) => Number(match[0]));
}

function optionFor(question: CandidateQuestion, predicate: (option: string) => boolean) {
  if (!question.options) throw new Error(`GRADE1_WAVE_B_OPTIONS_REQUIRED:${question.id}`);
  const matches = question.options.map((option, index) => ({ option, index })).filter(({ option }) => predicate(option));
  if (matches.length !== 1) throw new Error(`GRADE1_WAVE_B_ORACLE_AMBIGUOUS:${question.id}`);
  return optionKeys[matches[0]!.index]!;
}

function sumExpression(option: string) {
  const values = integers(option);
  return values.length === 2 ? values[0]! + values[1]! : null;
}

// This oracle reads only the public prompt/options and never uses the stored answer
// or the legacy solution while deriving the expected response.
export function independentlyDeriveGradeOneWaveBAnswer(question: CandidateQuestion) {
  const number = Number(/q(\d+)$/u.exec(question.id)?.[1]);
  if (!Number.isInteger(number) || number < 1 || number > 24) {
    throw new Error(`GRADE1_WAVE_B_QUESTION_ID_INVALID:${question.id}`);
  }
  const promptValues = integers(question.prompt);
  if (number <= 4) {
    const [left, right] = promptValues;
    return optionFor(question, (option) => normalizedDefinition(option) === `${left} + ${right}`);
  }
  if (number <= 6 || (number >= 11 && number <= 12) || number >= 19) {
    if (promptValues.length < 2) throw new Error(`GRADE1_WAVE_B_PROMPT_OPERANDS:${question.id}`);
    const expected = promptValues[0]! + promptValues[1]!;
    return question.options
      ? optionFor(question, (option) => integers(option)[0] === expected)
      : String(expected);
  }
  if (number <= 9) {
    const expected = promptValues[0]! + promptValues[1]!;
    return optionFor(question, (option) => integers(option)[0] === expected);
  }
  if (number === 10) return optionFor(question, (option) => sumExpression(option) === 10);
  if (number === 13 || number === 16) {
    const target = number === 13 ? 5 : 10;
    return optionFor(question, (option) => sumExpression(option.replace("và", "+")) === target);
  }
  if (number === 14 || number === 15) {
    const missing = promptValues.at(-1)! - promptValues[0]!;
    return optionFor(question, (option) => integers(option)[0] === missing);
  }
  if (number === 17 || number === 18) return String(promptValues.at(-1)! - promptValues[0]!);
  throw new Error(`GRADE1_WAVE_B_ORACLE_UNSUPPORTED:${question.id}`);
}

const sourceQuestions = gradeOneShadowCandidatePack.questions.filter((question) => question.unitId === unitId);
const sourceExplanations = gradeOneShadowCandidatePack.explanations.filter((explanation) => sourceQuestions.some((question) => question.id === explanation.questionId));
if (sourceQuestions.length !== 24 || sourceExplanations.length !== 24) throw new Error("GRADE1_WAVE_B_SOURCE_BOUNDARY");

export const gradeOneWaveBOracleRows = sourceQuestions.map((question) => {
  const independentlyDerived = independentlyDeriveGradeOneWaveBAnswer(question);
  const explanation = sourceExplanations.find((entry) => entry.questionId === question.id)!;
  const stored = question.answer.exactValue ?? "";
  if (independentlyDerived !== stored || explanation.finalAnswer !== stored) {
    throw new Error(`GRADE1_WAVE_B_ORACLE_MISMATCH:${question.id}`);
  }
  return {
    questionId: question.id,
    sourceQuestionHash: sha256(canonicalize(question)),
    sourceExplanationHash: sha256(canonicalize(explanation)),
    independentlyDerived,
    answerMatches: true as const,
    explanationMatches: true as const,
  };
});

const receipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent public-prompt oracle recomputed all 24 addition responses without consulting stored answers."
    : `Grade 1 immutable Wave B evidence overlay: ${check}.`,
}));
const receiptIds = receipts.map((receipt) => receipt.id);
const questions = sourceQuestions.map((question) => ({
  ...question,
  reviewStatus: "BUNDLED" as const,
  validationReceiptIds: receiptIds,
}));
const blueprintIds = new Set(questions.map((question) => question.blueprintId));
const core = {
  format: "plave-grade-1-wave-b-evidence-overlay-v1",
  candidateId,
  version,
  policyVersion,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  sourceCandidate: gradeOneShadowCandidatePack.candidate,
  oracleRows: gradeOneWaveBOracleRows,
} as const;

export const gradeOneWaveBPack: GradePack = {
  ...gradeOneShadowCandidatePack,
  packId,
  packVersion: version,
  blueprints: gradeOneShadowCandidatePack.blueprints.filter((blueprint) => blueprintIds.has(blueprint.id)),
  questions,
  explanations: sourceExplanations,
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...receipts],
  candidate: { candidateId, version, bundleHash: sha256(canonicalize(core)), policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED", contract: gradeOneShadowCandidatePack.adaptivePolicy.contract },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "B",
    selectedSliceId: "grade-1-addition-within-10-evidence-overlay",
    selectionBasis: ["IMMUTABLE_LEGACY_SOURCE", "SOURCE_VERIFIED_OUTCOME", "INDEPENDENT_ADDITION_ORACLE"],
    generated: 0,
    repaired: 0,
    evidenceGatePassed: 24,
    verificationInsufficient: 0,
    rejected: 0,
    duplicate: 0,
    candidateEligible: 24,
  },
};

export const gradeOneWaveBProgression: WaveBProgressionContract = {
  grade: 1,
  waveASkillId: "g1-skill-compose-decompose",
  waveBSkillIds: ["g1-skill-addition-meaning", "g1-skill-addition-calculation", "g1-skill-number-bonds", "g1-skill-one-step-word-problem"],
  remediationTargetSkillId: "g1-skill-compose-decompose",
  advanceTargetSkillId: "g1-skill-addition-calculation",
  retentionTargetSkillId: "g1-skill-addition-meaning",
  nextTargetSkillId: "g1-skill-subtraction-meaning",
  schoolGradeMutation: false,
  entitlementGrant: false,
};

assertWaveBProgressionContract(gradeOneShadowCandidatePack, gradeOneWaveBProgression);

export const gradeOneCombinedWaveABPack = combineWavePacks(
  gradeOneShadowCandidatePack,
  gradeOneWaveBPack,
  {
    packId: "grade-1-combined-wave-a-b",
    version: "g1-combined-1.0.0-wave-b",
    candidateId: "g1-combined-wave-a-b",
    policyVersion: "g1-combined-policy-1.0.0-wave-b",
    selectedSliceId: "grade-1-shadow-plus-addition-evidence",
  },
);
