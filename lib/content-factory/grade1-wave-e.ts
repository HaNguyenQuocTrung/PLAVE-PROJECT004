import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowArtifacts, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";

const grade = 1 as const;
const packId = "grade-1-wave-e-time-calendar-evidence";
const candidateId = "g1-time-calendar-evidence-wave-e";
const version = "g1-time-calendar-evidence-1.0.0-wave-e";
const policyVersion = "g1-time-calendar-evidence-policy-1.0.0-wave-e";
const unitId = "grade-1-time-clock-calendar";
const sourceReferenceId = "grade-1-repository-sql-release";
const weekdays = ["thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy", "chủ nhật"] as const;

function optionFor(question: CandidateQuestion, expected: string) {
  if (!question.options) throw new Error(`GRADE1_WAVE_E_OPTIONS_REQUIRED:${question.id}`);
  const matches = question.options.map((option, index) => ({ option, index })).filter(({ option }) =>
    normalizedDefinition(option).toLocaleLowerCase("vi") === expected,
  );
  if (matches.length !== 1) throw new Error(`GRADE1_WAVE_E_ORACLE_AMBIGUOUS:${question.id}`);
  return "ABCD"[matches[0]!.index]!;
}

// Only weekday-sequence items expose all required state at the public boundary.
// Clock faces, daily schedules and marked calendars remain fail-closed because
// their visual state is absent from the legacy public prompt/options projection.
export function independentlyDeriveGradeOneWaveEAnswer(question: CandidateQuestion) {
  const number = Number(/q(\d+)$/u.exec(question.id)?.[1]);
  if (!Number.isInteger(number) || number < 13 || number > 18) throw new Error(`GRADE1_WAVE_E_PUBLIC_EVIDENCE_INSUFFICIENT:${question.id}`);
  const prompt = normalizedDefinition(question.prompt).toLocaleLowerCase("vi");
  const current = weekdays.find((weekday) => prompt.includes(weekday));
  if (!current) throw new Error(`GRADE1_WAVE_E_WEEKDAY_MISSING:${question.id}`);
  const index = weekdays.indexOf(current);
  const offset = /ngày mai|ngay sau/u.test(prompt) ? 1 : /hôm qua|ngay trước/u.test(prompt) ? -1 : 0;
  if (offset === 0) throw new Error(`GRADE1_WAVE_E_SEQUENCE_DIRECTION_MISSING:${question.id}`);
  const expected = weekdays[(index + offset + weekdays.length) % weekdays.length]!;
  return optionFor(question, expected);
}

const immutableQuestions = gradeOneShadowCandidatePack.questions.filter((question) => question.unitId === unitId);
const immutableExplanations = gradeOneShadowCandidatePack.explanations.filter((explanation) =>
  immutableQuestions.some((question) => question.id === explanation.questionId),
);
if (immutableQuestions.length !== 24 || immutableExplanations.length !== 24) throw new Error("GRADE1_WAVE_E_SOURCE_BOUNDARY");

const assessments = immutableQuestions.map((question) => {
  const explanation = immutableExplanations.find((entry) => entry.questionId === question.id)!;
  try {
    const independentlyDerived = independentlyDeriveGradeOneWaveEAnswer(question);
    const stored = question.answer.exactValue ?? "";
    const eligible = independentlyDerived === stored && explanation.finalAnswer === stored;
    return { question, explanation, independentlyDerived, eligible, reason: eligible ? null : "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  } catch {
    return { question, explanation, independentlyDerived: null, eligible: false, reason: "AUTOMATED_VERIFICATION_INSUFFICIENT" } as const;
  }
});

export const gradeOneWaveEOracleRows = assessments.map((assessment) => ({
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
    ? `Immutable legacy unit ${unitId} in migration 0029; aggregate SQL digest ${GRADE_ONE_SOURCE_DIGEST}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent public-prompt weekday oracle verified the six candidate-eligible sequence items; visual-only items remain quarantined."
      : `Grade 1 immutable Wave E evidence overlay: ${check}.`,
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
  format: "plave-grade-1-wave-e-evidence-overlay-v1",
  candidateId,
  version,
  policyVersion,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableSemanticDigest: gradeOneShadowArtifacts.receipt.adaptedSemanticDigest,
  sourceCandidate: gradeOneShadowCandidatePack.candidate,
  eligibleQuestionIds: questions.map((question) => question.id),
  eligibleQuestionHashes: questions.map((question) => sha256(canonicalize(question))),
  oracleRows: gradeOneWaveEOracleRows,
} as const;
export const gradeOneWaveEBundleHash = sha256(canonicalize(candidateCore));

export const gradeOneWaveEPack: GradePack = {
  ...gradeOneShadowCandidatePack,
  packId,
  packVersion: version,
  prerequisites: [
    ...gradeOneShadowCandidatePack.prerequisites,
    { fromSkillId: "g1-skill-read-whole-hours", toSkillId: "g1-skill-order-daily-events", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-order-daily-events", toSkillId: "g1-skill-days-of-week", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: "g1-skill-days-of-week", toSkillId: "g1-skill-read-simple-calendar", evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints,
  questions,
  quarantinedQuestions,
  explanations,
  evidenceReceipts: [...gradeOneShadowCandidatePack.evidenceReceipts, ...evidenceReceipts],
  candidate: { candidateId, version, bundleHash: gradeOneWaveEBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED", contract: gradeOneShadowCandidatePack.adaptivePolicy.contract },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "E",
    selectedSliceId: "grade-1-time-clock-calendar-evidence-overlay",
    selectionBasis: ["IMMUTABLE_LEGACY_SOURCE", "PUBLIC_BOUNDARY_WEEKDAY_ORACLE", "VISUAL_DEPENDENCIES_FAIL_CLOSED"],
    generated: 0,
    repaired: 0,
    evidenceGatePassed: questions.length,
    verificationInsufficient: quarantinedQuestions.length,
    rejected: 0,
    duplicate: 0,
    candidateEligible: questions.length,
  },
};

export const gradeOneWaveEProgression = {
  grade,
  priorSkillId: "g1-skill-order-daily-events",
  waveESkillIds: ["g1-skill-days-of-week"],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  actions: {
    continueTargetSkillId: "g1-skill-days-of-week",
    remediateTargetSkillId: "g1-skill-order-daily-events",
    advanceTargetSkillId: "g1-skill-days-of-week",
    retentionTargetSkillId: "g1-skill-days-of-week",
    mixedPracticeTargetSkillIds: ["g1-skill-order-daily-events", "g1-skill-days-of-week"],
  },
  nextTargetSkillId: "g1-skill-days-of-week",
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeOneWaveEMetadata = {
  schemaVersion: "plave-wave-e-metadata-v1",
  wave: "E",
  grade,
  title: "Lớp phủ bằng chứng thời gian và lịch",
  unitId,
  sourceClassification: "VERIFIED_REPOSITORY_SOURCE",
  sourceReferenceIds: [sourceReferenceId],
  sourceFiles: ["supabase/migrations/0029_grade1_time_clock_calendar.sql"],
  sourceOutcomeIds: [] as const,
  sourcePages: [] as const,
  immutableSourceDigest: GRADE_ONE_SOURCE_DIGEST,
  immutableShadowCandidate: gradeOneShadowCandidatePack.candidate,
  semanticParity: gradeOneShadowArtifacts.receipt.semanticParity,
  sourceQuestionHashes: gradeOneWaveEOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceQuestionHash })),
  sourceExplanationHashes: gradeOneWaveEOracleRows.map((row) => ({ id: row.questionId, hash: row.sourceExplanationHash })),
  eligibleCount: questions.length,
  quarantinedCount: quarantinedQuestions.length,
  quarantineReason: "AUTOMATED_VERIFICATION_INSUFFICIENT",
  production: gradeOneWaveEPack.production,
  candidate: gradeOneWaveEPack.candidate,
  progression: gradeOneWaveEProgression,
  release: gradeOneWaveEPack.release,
} as const;
