import type {
  GeneratedQuestion,
  ValidationResult,
} from "./types.ts";

export type PracticePolicyMode = "FIXED" | "ADAPTIVE";

export type AdaptivePracticePolicy = Readonly<{
  mode: PracticePolicyMode;
  reviewSampleSize: number;
  minQuestions: number;
  maxQuestions: number;
  requiredSkillCoverage: readonly string[];
  minimumEvidencePerSkill: number;
  masteryThreshold: number;
  recentCorrectRequirement: number;
  retentionCheckQuestionCount: number;
  retentionCheckDelayDays: number;
  modeDecisionStatus: "PRODUCT_DECISION";
  thresholdDecisionStatus: "PRODUCT_HYPOTHESIS";
}>;

export type AdaptiveAnswerEvidence = Readonly<{
  questionCode: string;
  skillFamilyId: string;
  isCorrect: boolean;
}>;

export type AdaptivePlannerState = Readonly<{
  evidence: readonly AdaptiveAnswerEvidence[];
  availableQuestions: readonly GeneratedQuestion[];
}>;

export type SkillMasteryEvidence = Readonly<{
  skillFamilyId: string;
  evidenceCount: number;
  correctCount: number;
  accuracy: number | null;
  recentCorrectCount: number;
  hasMinimumEvidence: boolean;
  mastered: boolean;
}>;

export type AdaptivePlannerDecision =
  | Readonly<{
      kind: "SELECT_QUESTION";
      reason:
        | "MISSING_SKILL_COVERAGE"
        | "WEAK_SKILL_PRIORITY"
        | "BALANCED_MINIMUM_CONTINUATION"
        | "FIXED_MODE_CONTINUATION";
      skillFamilyId: string;
      question: GeneratedQuestion;
      mastery: readonly SkillMasteryEvidence[];
    }>
  | Readonly<{
      kind: "COMPLETE";
      reason:
        | "ADAPTIVE_MASTERY_EVIDENCE_MET"
        | "FIXED_QUESTION_TARGET_MET"
        | "MASTERY_MET_AT_MAXIMUM";
      mastery: readonly SkillMasteryEvidence[];
    }>
  | Readonly<{
      kind: "STOP_WITH_REMEDIATION";
      reason:
        | "MAXIMUM_REACHED_WITHOUT_MASTERY"
        | "QUESTION_BANK_EXHAUSTED";
      remediationSkillIds: readonly string[];
      mastery: readonly SkillMasteryEvidence[];
    }>;

export type RetentionCheckPlan = Readonly<{
  status: "SCHEDULED";
  dueAt: string;
  questionCount: number;
  resultIsSeparateFromInitialAttempt: true;
  decisionStatus: "PRODUCT_HYPOTHESIS";
}>;

export const gradeTwoNumbersTo1000AdaptivePolicy: AdaptivePracticePolicy = {
  mode: "ADAPTIVE",
  reviewSampleSize: 24,
  minQuestions: 12,
  maxQuestions: 24,
  requiredSkillCoverage: [
    "NUMBER_RECOGNITION_TO_1000",
    "READ_WRITE_TO_1000",
    "PLACE_VALUE_TO_1000",
    "SEQUENCE_TO_1000",
  ],
  minimumEvidencePerSkill: 2,
  masteryThreshold: 0.75,
  recentCorrectRequirement: 2,
  retentionCheckQuestionCount: 4,
  retentionCheckDelayDays: 7,
  modeDecisionStatus: "PRODUCT_DECISION",
  thresholdDecisionStatus: "PRODUCT_HYPOTHESIS",
};

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

export function validateAdaptivePracticePolicy(
  policy: AdaptivePracticePolicy,
): ValidationResult {
  const errors: string[] = [];
  if (
    !Number.isInteger(policy.reviewSampleSize) ||
    policy.reviewSampleSize < 1 ||
    policy.reviewSampleSize > 500
  ) {
    errors.push("reviewSampleSize phải nằm trong phạm vi 1–500.");
  }
  if (
    !Number.isInteger(policy.minQuestions) ||
    !Number.isInteger(policy.maxQuestions) ||
    policy.minQuestions < 1 ||
    policy.maxQuestions < policy.minQuestions ||
    policy.maxQuestions > 100
  ) {
    errors.push("minQuestions/maxQuestions không hợp lệ.");
  }
  if (
    policy.requiredSkillCoverage.length === 0 ||
    hasDuplicates(policy.requiredSkillCoverage) ||
    policy.requiredSkillCoverage.some(
      (skill) => !/^[A-Z][A-Z0-9_]{2,63}$/.test(skill),
    )
  ) {
    errors.push("requiredSkillCoverage không hợp lệ.");
  }
  if (
    !Number.isInteger(policy.minimumEvidencePerSkill) ||
    policy.minimumEvidencePerSkill < 1 ||
    policy.minimumEvidencePerSkill > policy.maxQuestions
  ) {
    errors.push("minimumEvidencePerSkill không hợp lệ.");
  }
  if (
    policy.minimumEvidencePerSkill *
      policy.requiredSkillCoverage.length >
    policy.maxQuestions
  ) {
    errors.push("maxQuestions không đủ cho coverage tối thiểu.");
  }
  if (
    !Number.isFinite(policy.masteryThreshold) ||
    policy.masteryThreshold <= 0 ||
    policy.masteryThreshold > 1
  ) {
    errors.push("masteryThreshold phải lớn hơn 0 và không vượt quá 1.");
  }
  if (
    !Number.isInteger(policy.recentCorrectRequirement) ||
    policy.recentCorrectRequirement < 1 ||
    policy.recentCorrectRequirement > policy.minimumEvidencePerSkill
  ) {
    errors.push("recentCorrectRequirement không hợp lệ.");
  }
  if (
    !Number.isInteger(policy.retentionCheckQuestionCount) ||
    policy.retentionCheckQuestionCount < 1 ||
    policy.retentionCheckQuestionCount > policy.maxQuestions
  ) {
    errors.push("retentionCheckQuestionCount không hợp lệ.");
  }
  if (
    !Number.isInteger(policy.retentionCheckDelayDays) ||
    policy.retentionCheckDelayDays < 1 ||
    policy.retentionCheckDelayDays > 365
  ) {
    errors.push("retentionCheckDelayDays không hợp lệ.");
  }
  if (
    policy.mode === "FIXED" &&
    policy.minQuestions !== policy.maxQuestions
  ) {
    errors.push("FIXED mode yêu cầu minQuestions bằng maxQuestions.");
  }
  if (policy.modeDecisionStatus !== "PRODUCT_DECISION") {
    errors.push("Hướng practice phải giữ nhãn PRODUCT_DECISION.");
  }
  if (policy.thresholdDecisionStatus !== "PRODUCT_HYPOTHESIS") {
    errors.push("Adaptive thresholds phải giữ nhãn PRODUCT_HYPOTHESIS.");
  }

  return { valid: errors.length === 0, errors };
}

export function summarizeSkillMastery(
  policy: AdaptivePracticePolicy,
  evidence: readonly AdaptiveAnswerEvidence[],
): readonly SkillMasteryEvidence[] {
  return policy.requiredSkillCoverage.map((skillFamilyId) => {
    const skillEvidence = evidence.filter(
      (item) => item.skillFamilyId === skillFamilyId,
    );
    const correctCount = skillEvidence.filter(
      (item) => item.isCorrect,
    ).length;
    const evidenceCount = skillEvidence.length;
    const accuracy =
      evidenceCount === 0 ? null : correctCount / evidenceCount;
    const recent = skillEvidence.slice(
      -policy.recentCorrectRequirement,
    );
    const recentCorrectCount = recent.filter(
      (item) => item.isCorrect,
    ).length;
    const hasMinimumEvidence =
      evidenceCount >= policy.minimumEvidencePerSkill;
    const mastered =
      hasMinimumEvidence &&
      accuracy !== null &&
      accuracy >= policy.masteryThreshold &&
      recent.length === policy.recentCorrectRequirement &&
      recentCorrectCount === policy.recentCorrectRequirement;

    return {
      skillFamilyId,
      evidenceCount,
      correctCount,
      accuracy,
      recentCorrectCount,
      hasMinimumEvidence,
      mastered,
    };
  });
}

function hashText(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getCandidateForSkill(
  skillFamilyId: string,
  state: AdaptivePlannerState,
  seed: string,
) {
  const answered = new Set(
    state.evidence.map((item) => item.questionCode),
  );
  return state.availableQuestions
    .filter(
      (question) =>
        question.skillFamilyId === skillFamilyId &&
        !answered.has(question.code),
    )
    .sort(
      (left, right) =>
        hashText(`${seed}:${state.evidence.length}:${left.code}`) -
        hashText(`${seed}:${state.evidence.length}:${right.code}`),
    )[0];
}

function rankMissingCoverage(
  policy: AdaptivePracticePolicy,
  mastery: readonly SkillMasteryEvidence[],
) {
  return mastery
    .filter(
      (skill) =>
        skill.evidenceCount < policy.minimumEvidencePerSkill,
    )
    .sort((left, right) => {
      if (left.evidenceCount !== right.evidenceCount) {
        return left.evidenceCount - right.evidenceCount;
      }
      return (
        policy.requiredSkillCoverage.indexOf(left.skillFamilyId) -
        policy.requiredSkillCoverage.indexOf(right.skillFamilyId)
      );
    });
}

function rankWeakSkills(
  policy: AdaptivePracticePolicy,
  mastery: readonly SkillMasteryEvidence[],
  evidence: readonly AdaptiveAnswerEvidence[],
) {
  const unmastered = mastery.filter((skill) => !skill.mastered);
  const recentSkillIds = evidence.slice(-2).map(
    (item) => item.skillFamilyId,
  );
  const repeatedRecentSkill =
    recentSkillIds.length === 2 &&
    recentSkillIds[0] === recentSkillIds[1]
      ? recentSkillIds[0]
      : null;
  const ranked = unmastered.sort((left, right) => {
    const leftAccuracy = left.accuracy ?? -1;
    const rightAccuracy = right.accuracy ?? -1;
    if (leftAccuracy !== rightAccuracy) {
      return leftAccuracy - rightAccuracy;
    }
    if (left.evidenceCount !== right.evidenceCount) {
      return left.evidenceCount - right.evidenceCount;
    }
    return (
      policy.requiredSkillCoverage.indexOf(left.skillFamilyId) -
      policy.requiredSkillCoverage.indexOf(right.skillFamilyId)
    );
  });
  if (!repeatedRecentSkill || ranked.length < 2) {
    return ranked;
  }
  return [
    ...ranked.filter(
      (skill) => skill.skillFamilyId !== repeatedRecentSkill,
    ),
    ...ranked.filter(
      (skill) => skill.skillFamilyId === repeatedRecentSkill,
    ),
  ];
}

function createSelection(
  state: AdaptivePlannerState,
  seed: string,
  rankedSkills: readonly SkillMasteryEvidence[],
  reason: Extract<
    AdaptivePlannerDecision,
    { kind: "SELECT_QUESTION" }
  >["reason"],
  mastery: readonly SkillMasteryEvidence[],
): AdaptivePlannerDecision | null {
  for (const skill of rankedSkills) {
    const question = getCandidateForSkill(
      skill.skillFamilyId,
      state,
      seed,
    );
    if (question) {
      return {
        kind: "SELECT_QUESTION",
        reason,
        skillFamilyId: skill.skillFamilyId,
        question,
        mastery,
      };
    }
  }
  return null;
}

export function planAdaptivePractice(
  policy: AdaptivePracticePolicy,
  state: AdaptivePlannerState,
  seed: string,
): AdaptivePlannerDecision {
  const policyValidation = validateAdaptivePracticePolicy(policy);
  if (!policyValidation.valid) {
    throw new Error(policyValidation.errors.join(" "));
  }
  if (
    seed.length < 1 ||
    seed.length > 64 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(seed)
  ) {
    throw new Error("Planner seed không hợp lệ.");
  }
  if (
    state.evidence.some(
      (item) =>
        !policy.requiredSkillCoverage.includes(item.skillFamilyId),
    ) ||
    new Set(state.evidence.map((item) => item.questionCode)).size !==
      state.evidence.length
  ) {
    throw new Error("Planner evidence không hợp lệ.");
  }
  if (
    new Set(state.availableQuestions.map((item) => item.code)).size !==
      state.availableQuestions.length ||
    state.availableQuestions.some(
      (item) =>
        !policy.requiredSkillCoverage.includes(item.skillFamilyId),
    )
  ) {
    throw new Error("Planner question bank không hợp lệ.");
  }

  const mastery = summarizeSkillMastery(policy, state.evidence);
  const allMastered = mastery.every((skill) => skill.mastered);
  if (state.evidence.length >= policy.maxQuestions) {
    if (policy.mode === "FIXED") {
      return {
        kind: "COMPLETE",
        reason: "FIXED_QUESTION_TARGET_MET",
        mastery,
      };
    }
    return allMastered
      ? {
          kind: "COMPLETE",
          reason: "MASTERY_MET_AT_MAXIMUM",
          mastery,
        }
      : {
          kind: "STOP_WITH_REMEDIATION",
          reason: "MAXIMUM_REACHED_WITHOUT_MASTERY",
          remediationSkillIds: mastery
            .filter((skill) => !skill.mastered)
            .map((skill) => skill.skillFamilyId),
          mastery,
        };
  }

  if (policy.mode === "ADAPTIVE") {
    const missingCoverage = rankMissingCoverage(policy, mastery);
    if (missingCoverage.length > 0) {
      const decision = createSelection(
        state,
        seed,
        missingCoverage,
        "MISSING_SKILL_COVERAGE",
        mastery,
      );
      if (decision) return decision;
    }
    if (
      state.evidence.length >= policy.minQuestions &&
      allMastered
    ) {
      return {
        kind: "COMPLETE",
        reason: "ADAPTIVE_MASTERY_EVIDENCE_MET",
        mastery,
      };
    }

    const needsMinimumContinuation =
      allMastered && state.evidence.length < policy.minQuestions;
    const rankedWeakSkills = needsMinimumContinuation
      ? [...mastery].sort(
          (left, right) =>
            left.evidenceCount - right.evidenceCount ||
            policy.requiredSkillCoverage.indexOf(left.skillFamilyId) -
              policy.requiredSkillCoverage.indexOf(right.skillFamilyId),
        )
      : rankWeakSkills(policy, mastery, state.evidence);
    const reason = needsMinimumContinuation
      ? "BALANCED_MINIMUM_CONTINUATION"
      : "WEAK_SKILL_PRIORITY";
    const decision = createSelection(
      state,
      seed,
      rankedWeakSkills,
      reason,
      mastery,
    );
    if (decision) return decision;
  } else {
    const balanced = [...mastery].sort(
      (left, right) =>
        left.evidenceCount - right.evidenceCount ||
        policy.requiredSkillCoverage.indexOf(left.skillFamilyId) -
          policy.requiredSkillCoverage.indexOf(right.skillFamilyId),
    );
    const decision = createSelection(
      state,
      seed,
      balanced,
      "FIXED_MODE_CONTINUATION",
      mastery,
    );
    if (decision) return decision;
  }

  return {
    kind: "STOP_WITH_REMEDIATION",
    reason: "QUESTION_BANK_EXHAUSTED",
    remediationSkillIds: mastery
      .filter((skill) => !skill.mastered)
      .map((skill) => skill.skillFamilyId),
    mastery,
  };
}

export function planDelayedRetentionCheck(
  policy: AdaptivePracticePolicy,
  completedAt: string,
): RetentionCheckPlan {
  const policyValidation = validateAdaptivePracticePolicy(policy);
  if (!policyValidation.valid) {
    throw new Error(policyValidation.errors.join(" "));
  }
  const completedTimestamp = Date.parse(completedAt);
  if (!Number.isFinite(completedTimestamp)) {
    throw new Error("completedAt không hợp lệ.");
  }
  const dueTimestamp =
    completedTimestamp +
    policy.retentionCheckDelayDays * 24 * 60 * 60 * 1000;
  return {
    status: "SCHEDULED",
    dueAt: new Date(dueTimestamp).toISOString(),
    questionCount: policy.retentionCheckQuestionCount,
    resultIsSeparateFromInitialAttempt: true,
    decisionStatus: "PRODUCT_HYPOTHESIS",
  };
}
