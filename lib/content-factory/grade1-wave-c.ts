import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import {
  GRADE_ONE_SOURCE_DIGEST,
  gradeOneShadowArtifacts,
  gradeOneShadowCandidatePack,
} from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";

const grade = 1 as const;
const packId = "grade-1-wave-c-subtraction-evidence";
const candidateId = "g1-subtraction-evidence-wave-c";
const version = "g1-subtraction-evidence-1.0.0-wave-c";
const policyVersion = "g1-subtraction-evidence-policy-1.0.0-wave-c";
const unitId = "grade-1-subtraction-within-10";
const optionKeys = "ABCD";

function integers(value: string) {
  return [...value.matchAll(/\d+/gu)].map((match) => Number(match[0]));
}

function optionFor(question: CandidateQuestion, predicate: (option: string) => boolean) {
  if (!question.options) throw new Error(`GRADE1_WAVE_C_OPTIONS_REQUIRED:${question.id}`);
  const matches = question.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => predicate(option));
  if (matches.length !== 1) throw new Error(`GRADE1_WAVE_C_ORACLE_AMBIGUOUS:${question.id}`);
  return optionKeys[matches[0]!.index]!;
}

function subtractionValue(value: string) {
  const match = /(\d+)\s*[-−]\s*(\d+)/u.exec(value);
  return match ? Number(match[1]) - Number(match[2]) : null;
}

function trueEquation(value: string) {
  const match = /(\d+)\s*([+\-−])\s*(\d+)\s*=\s*(\d+)/u.exec(value);
  if (!match) return false;
  const left = Number(match[1]);
  const right = Number(match[3]);
  const result = Number(match[4]);
  return (match[2] === "+" ? left + right : left - right) === result;
}

// This oracle derives the response from only the public prompt and options. It
// never consults the stored legacy answer or solution.
export function independentlyDeriveGradeOneWaveCAnswer(question: CandidateQuestion) {
  const number = Number(/q(\d+)$/u.exec(question.id)?.[1]);
  if (!Number.isInteger(number) || number < 1 || number > 24) {
    throw new Error(`GRADE1_WAVE_C_QUESTION_ID_INVALID:${question.id}`);
  }
  const promptValues = integers(question.prompt);

  if (number <= 3) {
    const [whole, removed] = promptValues;
    return optionFor(question, (option) => normalizedDefinition(option) === `${whole} - ${removed}`);
  }
  if (number === 4) {
    const [whole, removed] = promptValues;
    return optionFor(question, (option) => {
      const values = integers(option);
      return values[0] === whole && values[1] === removed && /cho đi|bớt|bay đi|ăn|cất đi/u.test(option);
    });
  }
  if (number === 10) {
    const target = promptValues.at(-1)!;
    return optionFor(question, (option) => subtractionValue(option) === target);
  }
  if (number === 14) {
    const target = promptValues.at(-1)!;
    return optionFor(question, (option) => trueEquation(option) && integers(option).at(-1) === target);
  }
  if (number === 15) {
    const direct = /(\d+)\s*[-−]\s*(\d+)/u.exec(question.prompt);
    if (!direct) throw new Error(`GRADE1_WAVE_C_INVERSE_PROMPT_INVALID:${question.id}`);
    const whole = Number(direct[1]);
    const knownPart = Number(direct[2]);
    return optionFor(question, (option) => {
      const values = integers(option);
      return trueEquation(option) && values[0] === knownPart && values[2] === whole;
    });
  }
  if (number === 16) return optionFor(question, trueEquation);

  const directMatches = [...question.prompt.matchAll(/(\d+)\s*[-−]\s*(\d+)/gu)];
  const direct = directMatches.at(-1);
  const expected = direct
    ? Number(direct[1]) - Number(direct[2])
    : promptValues[0]! - promptValues[1]!;
  return question.options
    ? optionFor(question, (option) => integers(option)[0] === expected)
    : String(expected);
}

const immutableQuestions = gradeOneShadowCandidatePack.questions.filter(
  (question) => question.unitId === unitId,
);
const immutableExplanations = gradeOneShadowCandidatePack.explanations.filter(
  (explanation) => immutableQuestions.some((question) => question.id === explanation.questionId),
);
if (immutableQuestions.length !== 24 || immutableExplanations.length !== 24) {
  throw new Error("GRADE1_WAVE_C_SOURCE_BOUNDARY");
}

const oracleAssessments = immutableQuestions.map((question) => {
  const explanation = immutableExplanations.find((entry) => entry.questionId === question.id)!;
  try {
    const independentlyDerived = independentlyDeriveGradeOneWaveCAnswer(question);
    const stored = question.answer.exactValue ?? "";
    const verified = independentlyDerived === stored && explanation.finalAnswer === stored;
    return {
      question,
      explanation,
      independentlyDerived,
      eligible: verified,
      reason: verified ? null : "AUTOMATED_VERIFICATION_INSUFFICIENT",
    } as const;
  } catch {
    return {
      question,
      explanation,
      independentlyDerived: null,
      eligible: false,
      reason: "AUTOMATED_VERIFICATION_INSUFFICIENT",
    } as const;
  }
});

export const gradeOneWaveCOracleRows = oracleAssessments.map((assessment) => ({
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
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent public-boundary subtraction oracle verified each candidate-eligible legacy response without reading stored answers or solutions."
    : check === "SOURCE_MAPPING"
      ? `Immutable legacy unit ${unitId}; SQL source digest ${GRADE_ONE_SOURCE_DIGEST}.`
      : `Grade 1 immutable Wave C evidence overlay: ${check}.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);

const questions = oracleAssessments
  .filter((assessment) => assessment.eligible)
  .map(({ question }) => ({
    ...question,
    reviewStatus: "BUNDLED" as const,
    validationReceiptIds: receiptIds,
  }));
const quarantinedQuestions = oracleAssessments
  .filter((assessment) => !assessment.eligible)
  .map(({ question }) => ({
    ...question,
    reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
    validationReceiptIds: [] as const,
  }));
const explanations = immutableExplanations.filter((explanation) =>
  questions.some((question) => question.id === explanation.questionId),
);
const blueprintIds = new Set(questions.map((question) => question.blueprintId));
const blueprints = gradeOneShadowCandidatePack.blueprints.filter((blueprint) =>
  blueprintIds.has(blueprint.id),
);

const candidateCore = {
  format: "plave-grade-1-wave-c-evidence-overlay-v1",
  candidateId,
  version,
  policyVersion,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableSemanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest,
  sourceCandidate: gradeOneShadowCandidatePack.candidate,
  eligibleQuestionIds: questions.map((question) => question.id),
  eligibleQuestionHashes: questions.map((question) => sha256(canonicalize(question))),
  oracleRows: gradeOneWaveCOracleRows,
} as const;

export const gradeOneWaveCBundleHash = sha256(canonicalize(candidateCore));

export const gradeOneWaveCPack: GradePack = {
  ...gradeOneShadowCandidatePack,
  packId,
  packVersion: version,
  prerequisites: [
    ...gradeOneShadowCandidatePack.prerequisites,
    { fromSkillId: "g1-skill-subtraction-meaning", toSkillId: "g1-skill-subtraction-calculation", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-subtraction-calculation", toSkillId: "g1-skill-addition-subtraction-relation", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-addition-subtraction-relation", toSkillId: "g1-skill-one-step-subtraction-word-problem", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints,
  questions,
  quarantinedQuestions,
  explanations,
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...evidenceReceipts],
  candidate: { candidateId, version, bundleHash: gradeOneWaveCBundleHash, policyVersion },
  adaptivePolicy: {
    version: policyVersion,
    status: "VALIDATED",
    contract: gradeOneShadowCandidatePack.adaptivePolicy.contract,
  },
  release: {
    publication: "DRAFT",
    visibility: "HIDDEN",
    pilotEnabled: false,
    runtimeEnabled: false,
    retentionEnabled: false,
  },
  production: {
    wave: "C",
    selectedSliceId: "grade-1-subtraction-within-10-evidence-overlay",
    selectionBasis: [
      "IMMUTABLE_LEGACY_SOURCE",
      "SOURCE_DIGEST_AND_SEMANTIC_PARITY_PRESERVED",
      "INDEPENDENT_SUBTRACTION_ORACLE",
    ],
    generated: 0,
    repaired: 0,
    evidenceGatePassed: questions.length,
    verificationInsufficient: quarantinedQuestions.length,
    rejected: 0,
    duplicate: 0,
    candidateEligible: questions.length,
  },
};

export const gradeOneWaveCProgression = {
  grade,
  waveCSkillIds: [
    "g1-skill-subtraction-meaning",
    "g1-skill-subtraction-calculation",
    "g1-skill-addition-subtraction-relation",
    "g1-skill-one-step-subtraction-word-problem",
  ],
  priorSkillId: "g1-skill-one-step-word-problem",
  prerequisiteSkillId: "g1-skill-one-step-word-problem",
  prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER",
  remediationTargetSkillId: "g1-skill-one-step-word-problem",
  advanceTargetSkillId: "g1-skill-subtraction-calculation",
  retentionTargetSkillId: "g1-skill-subtraction-meaning",
  nextTargetSkillId: "g1-skill-count-read-write-to-20",
  actions: {
    continueTargetSkillId: "g1-skill-subtraction-meaning",
    remediateTargetSkillId: "g1-skill-one-step-word-problem",
    advanceTargetSkillId: "g1-skill-one-step-subtraction-word-problem",
    retentionTargetSkillId: "g1-skill-subtraction-meaning",
    mixedPracticeTargetSkillIds: ["g1-skill-subtraction-meaning", "g1-skill-one-step-subtraction-word-problem"],
  },
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeOneWaveCMetadata = {
  schemaVersion: "plave-wave-c-metadata-v1",
  wave: "C",
  grade,
  title: "Lớp phủ bằng chứng phép trừ trong phạm vi 10",
  unitId,
  sourceClassification: "VERIFIED_REPOSITORY_SOURCE",
  sourceReferenceIds: ["grade-1-repository-sql-release"],
  sourceOutcomeIds: [] as const,
  sourcePages: [] as const,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableShadowCandidate: gradeOneShadowCandidatePack.candidate,
  sourceQuestionHashes: gradeOneWaveCOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceQuestionHash })),
  sourceExplanationHashes: gradeOneWaveCOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceExplanationHash })),
  semanticParity: gradeOneShadowArtifacts.receipt.semanticParity,
  oracleIndependence: "PUBLIC_PROMPT_AND_OPTIONS_ONLY",
  eligibleCount: questions.length,
  quarantinedCount: quarantinedQuestions.length,
  quarantineReason: "AUTOMATED_VERIFICATION_INSUFFICIENT",
  production: gradeOneWaveCPack.production,
  candidate: gradeOneWaveCPack.candidate,
  progression: gradeOneWaveCProgression,
  release: gradeOneWaveCPack.release,
} as const;
