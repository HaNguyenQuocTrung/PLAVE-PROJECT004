import {
  gradeTwoNumbersTo1000AdaptivePolicy,
  planAdaptivePractice,
  planDelayedRetentionCheck,
  type AdaptiveAnswerEvidence,
  type AdaptivePracticePolicy,
  type SkillMasteryEvidence,
} from "./adaptive-practice.ts";
import {
  generateGradeTwoNumbersTo1000Draft,
} from "./grade2-numbers-to-1000.ts";
import {
  GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
  GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID,
  canonicalJson,
  createGradeTwoReleaseArtifacts,
  createGradeTwoReleaseManifest,
  type ReleaseClientQuestion,
  type ReleaseServerSolution,
} from "./grade2-numbers-to-1000-release.ts";

export const GRADE_TWO_NUMBERS_TO_1000_RUNTIME_SEED =
  "g2-review-number-language";
export const GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256 =
  "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530";
export const GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION =
  "g2n1000-adaptive-policy-1.0.0-pilot";

export type AdaptiveAttemptLifecycleStatus =
  | "STARTED"
  | "IN_PROGRESS"
  | "MASTERED_EARLY"
  | "REMEDIATION_REQUIRED"
  | "MAX_REACHED"
  | "ABANDONED";

export type AdaptiveTerminalStatus = Exclude<
  AdaptiveAttemptLifecycleStatus,
  "STARTED" | "IN_PROGRESS"
>;

export type FrozenCandidateBinding = Readonly<{
  candidateId: string;
  contentVersion: string;
  releaseSeed: string;
  bundleSha256: string;
  policyVersion: string;
}>;

export const frozenGradeTwoNumbersTo1000Binding: FrozenCandidateBinding = {
  candidateId: GRADE_TWO_NUMBERS_TO_1000_RELEASE_CANDIDATE_ID,
  contentVersion: GRADE_TWO_NUMBERS_TO_1000_CONTENT_VERSION,
  releaseSeed: GRADE_TWO_NUMBERS_TO_1000_RUNTIME_SEED,
  bundleSha256: GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
  policyVersion: GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION,
};

export type AdaptiveRuntimeQuestionBank = Readonly<{
  unitSlug: "grade-2-numbers-to-1000";
  binding: FrozenCandidateBinding;
  policy: AdaptivePracticePolicy;
  publicQuestions: readonly ReleaseClientQuestion[];
  serverSolutions: readonly ReleaseServerSolution[];
  plannerQuestions: ReturnType<
    typeof generateGradeTwoNumbersTo1000Draft
  >["bundles"][number]["question"][];
}>;

export type AdaptiveRuntimeEvidence = AdaptiveAnswerEvidence &
  Readonly<{
    sequence: number;
    submittedAt: string;
  }>;

export type AdaptiveSubmissionRecord = Readonly<{
  submissionId: string;
  questionId: string;
  normalizedAnswer: string;
  evidenceSequence: number;
}>;

export type AdaptiveAttemptState = Readonly<{
  attemptId: string;
  ownerId: string;
  unitSlug: "grade-2-numbers-to-1000";
  binding: FrozenCandidateBinding;
  plannerSeed: string;
  status: AdaptiveAttemptLifecycleStatus;
  revision: number;
  currentQuestionId: string | null;
  evidence: readonly AdaptiveRuntimeEvidence[];
  submissions: readonly AdaptiveSubmissionRecord[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  completionReason:
    | "ADAPTIVE_MASTERY_EVIDENCE_MET"
    | "MASTERY_MET_AT_MAXIMUM"
    | "MAXIMUM_REACHED_WITHOUT_MASTERY"
    | "QUESTION_BANK_EXHAUSTED"
    | "OWNER_ABANDONED"
    | null;
  remediationSkillIds: readonly string[];
}>;

export type AdaptiveClientProgress = Readonly<{
  answeredCount: number;
  minimumQuestions: number;
  maximumQuestions: number;
}>;

export type AdaptiveRemediationView = Readonly<{
  skillFamilyId: string;
  skillLabel: string;
  message: string;
  theoryAnchor: string;
}>;

export type AdaptiveClientSession = Readonly<{
  attemptId: string;
  unitSlug: string;
  contentVersion: string;
  status: AdaptiveAttemptLifecycleStatus;
  progress: AdaptiveClientProgress;
  currentQuestion: ReleaseClientQuestion | null;
  remediation: readonly AdaptiveRemediationView[];
}>;

export type AdaptiveAnswerFeedback = Readonly<{
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: readonly string[];
  explanation: string;
  hint: string;
}>;

export type AdaptiveSubmitCommand = Readonly<{
  submissionId: string;
  questionId: string;
  answer: string;
  expectedRevision: number;
  submittedAt: string;
}>;

export type AdaptiveSubmitResult = Readonly<{
  kind: "SAVED" | "IDEMPOTENT_REPLAY";
  state: AdaptiveAttemptState;
  clientSession: AdaptiveClientSession;
  feedback: AdaptiveAnswerFeedback;
}>;

export type AdaptiveAttemptRepository = Readonly<{
  getOwnedAttempt(
    attemptId: string,
    ownerId: string,
  ): Promise<AdaptiveAttemptState | null>;
  compareAndSwap(
    attemptId: string,
    ownerId: string,
    expectedRevision: number,
    nextState: AdaptiveAttemptState,
  ): Promise<boolean>;
}>;

export type AdaptiveRetentionPlan = Readonly<{
  status: "PLANNED_NOT_PERSISTED";
  sourceAttemptId: string;
  contentVersion: string;
  dueAt: string;
  questionIds: readonly string[];
  evidence: readonly [];
  resultIsSeparateFromInitialAttempt: true;
  decisionStatus: "PRODUCT_HYPOTHESIS";
}>;

const remediationBySkill: Readonly<
  Record<string, Omit<AdaptiveRemediationView, "skillFamilyId">>
> = {
  NUMBER_RECOGNITION_TO_1000: {
    skillLabel: "Nhận biết số đến 1000",
    message:
      "Em hãy xem lại cách nhận biết và ghép các số đến 1000.",
    theoryAnchor: "count-to-1000",
  },
  READ_WRITE_TO_1000: {
    skillLabel: "Đọc và viết số đến 1000",
    message:
      "Em hãy ôn lại cách đọc và viết số theo từng hàng.",
    theoryAnchor: "read-and-write",
  },
  PLACE_VALUE_TO_1000: {
    skillLabel: "Hàng trăm, chục và đơn vị",
    message:
      "Em hãy xem lại cách xác định giá trị của từng chữ số.",
    theoryAnchor: "place-value",
  },
  SEQUENCE_TO_1000: {
    skillLabel: "Dãy số đến 1000",
    message:
      "Em hãy ôn lại số liền trước, số liền sau và thứ tự số.",
    theoryAnchor: "number-neighbors",
  },
};

function isTerminal(status: AdaptiveAttemptLifecycleStatus) {
  return status !== "STARTED" && status !== "IN_PROGRESS";
}

function assertSafeIdentifier(value: string, label: string) {
  if (
    value.length < 1 ||
    value.length > 128 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    throw new Error(`${label} không hợp lệ.`);
  }
}

function assertIsoDate(value: string, label: string) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} không hợp lệ.`);
  }
}

export function assertFrozenCandidateBinding(
  binding: FrozenCandidateBinding,
) {
  if (
    canonicalJson(binding) !==
    canonicalJson(frozenGradeTwoNumbersTo1000Binding)
  ) {
    throw new Error(
      "Frozen release candidate đã drift; cần candidate/version mới.",
    );
  }
}

export function createFrozenAdaptiveQuestionBank(): AdaptiveRuntimeQuestionBank {
  const artifacts = createGradeTwoReleaseArtifacts(
    GRADE_TWO_NUMBERS_TO_1000_RUNTIME_SEED,
  );
  const manifest = createGradeTwoReleaseManifest(
    GRADE_TWO_NUMBERS_TO_1000_RUNTIME_SEED,
    artifacts,
  );
  if (
    manifest.releaseCandidateId !==
      frozenGradeTwoNumbersTo1000Binding.candidateId ||
    manifest.contentVersion !==
      frozenGradeTwoNumbersTo1000Binding.contentVersion ||
    manifest.releaseSeed !==
      frozenGradeTwoNumbersTo1000Binding.releaseSeed ||
    manifest.bundleHash !==
      frozenGradeTwoNumbersTo1000Binding.bundleSha256 ||
    artifacts.publicQuestions.length !== 24 ||
    artifacts.serverSolutions.length !== 24
  ) {
    throw new Error(
      "Frozen release candidate không vượt qua runtime integrity check.",
    );
  }
  const draft = generateGradeTwoNumbersTo1000Draft(
    GRADE_TWO_NUMBERS_TO_1000_RUNTIME_SEED,
  );
  const publicIds = artifacts.publicQuestions.map(
    (question) => question.questionId,
  );
  const solutionIds = artifacts.serverSolutions.map(
    (solution) => solution.questionId,
  );
  const plannerIds = draft.bundles.map(
    ({ question }) => question.code,
  );
  if (
    canonicalJson(publicIds) !== canonicalJson(solutionIds) ||
    canonicalJson(publicIds) !== canonicalJson(plannerIds)
  ) {
    throw new Error("Question/solution/planner mapping không ổn định.");
  }
  return {
    unitSlug: "grade-2-numbers-to-1000",
    binding: frozenGradeTwoNumbersTo1000Binding,
    policy: gradeTwoNumbersTo1000AdaptivePolicy,
    publicQuestions: artifacts.publicQuestions,
    serverSolutions: artifacts.serverSolutions,
    plannerQuestions: draft.bundles.map(({ question }) => question),
  };
}

function plannerEvidence(
  evidence: readonly AdaptiveRuntimeEvidence[],
): readonly AdaptiveAnswerEvidence[] {
  return evidence.map(({ questionCode, skillFamilyId, isCorrect }) => ({
    questionCode,
    skillFamilyId,
    isCorrect,
  }));
}

function createRemediation(
  skillIds: readonly string[],
): readonly AdaptiveRemediationView[] {
  return skillIds.map((skillFamilyId) => {
    const mapping = remediationBySkill[skillFamilyId];
    if (!mapping) {
      throw new Error("Remediation mapping không đầy đủ.");
    }
    return { skillFamilyId, ...mapping };
  });
}

function findPublicQuestion(
  bank: AdaptiveRuntimeQuestionBank,
  questionId: string | null,
) {
  if (!questionId) return null;
  const question = bank.publicQuestions.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!question) {
    throw new Error("Current question không thuộc frozen candidate.");
  }
  return question;
}

export function projectAdaptiveClientSession(
  bank: AdaptiveRuntimeQuestionBank,
  state: AdaptiveAttemptState,
): AdaptiveClientSession {
  assertFrozenCandidateBinding(state.binding);
  if (state.unitSlug !== bank.unitSlug) {
    throw new Error("Attempt unit binding không hợp lệ.");
  }
  return {
    attemptId: state.attemptId,
    unitSlug: state.unitSlug,
    contentVersion: state.binding.contentVersion,
    status: state.status,
    progress: {
      answeredCount: state.evidence.length,
      minimumQuestions: bank.policy.minQuestions,
      maximumQuestions: bank.policy.maxQuestions,
    },
    currentQuestion: findPublicQuestion(
      bank,
      state.currentQuestionId,
    ),
    remediation: createRemediation(state.remediationSkillIds),
  };
}

function applyPlannerDecision(
  bank: AdaptiveRuntimeQuestionBank,
  state: AdaptiveAttemptState,
  updatedAt: string,
): AdaptiveAttemptState {
  const decision = planAdaptivePractice(
    bank.policy,
    {
      evidence: plannerEvidence(state.evidence),
      availableQuestions: bank.plannerQuestions,
    },
    state.plannerSeed,
  );
  if (decision.kind === "SELECT_QUESTION") {
    return {
      ...state,
      status: "IN_PROGRESS",
      currentQuestionId: decision.question.code,
      updatedAt,
      completionReason: null,
      remediationSkillIds: [],
    };
  }
  if (decision.kind === "COMPLETE") {
    if (decision.reason === "FIXED_QUESTION_TARGET_MET") {
      throw new Error(
        "Frozen Grade 2 runtime không được chuyển sang FIXED mode.",
      );
    }
    return {
      ...state,
      status:
        decision.reason === "ADAPTIVE_MASTERY_EVIDENCE_MET"
          ? "MASTERED_EARLY"
          : "MAX_REACHED",
      currentQuestionId: null,
      updatedAt,
      completedAt: updatedAt,
      completionReason: decision.reason,
      remediationSkillIds: [],
    };
  }
  return {
    ...state,
    status: "REMEDIATION_REQUIRED",
    currentQuestionId: null,
    updatedAt,
    completedAt: updatedAt,
    completionReason: decision.reason,
    remediationSkillIds: decision.remediationSkillIds,
  };
}

export function createStartedAdaptiveAttempt(input: Readonly<{
  attemptId: string;
  ownerId: string;
  plannerSeed: string;
  startedAt: string;
}>): AdaptiveAttemptState {
  assertSafeIdentifier(input.attemptId, "attemptId");
  assertSafeIdentifier(input.ownerId, "ownerId");
  assertSafeIdentifier(input.plannerSeed, "plannerSeed");
  assertIsoDate(input.startedAt, "startedAt");
  return {
    attemptId: input.attemptId,
    ownerId: input.ownerId,
    unitSlug: "grade-2-numbers-to-1000",
    binding: frozenGradeTwoNumbersTo1000Binding,
    plannerSeed: input.plannerSeed,
    status: "STARTED",
    revision: 0,
    currentQuestionId: null,
    evidence: [],
    submissions: [],
    startedAt: input.startedAt,
    updatedAt: input.startedAt,
    completedAt: null,
    completionReason: null,
    remediationSkillIds: [],
  };
}

export function startOrResumeAdaptiveAttempt(
  bank: AdaptiveRuntimeQuestionBank,
  input: Readonly<{
    attemptId: string;
    ownerId: string;
    plannerSeed: string;
    now: string;
    existing: AdaptiveAttemptState | null;
  }>,
): Readonly<{
  kind: "STARTED" | "RESUMED";
  state: AdaptiveAttemptState;
  clientSession: AdaptiveClientSession;
}> {
  assertIsoDate(input.now, "now");
  if (input.existing) {
    if (
      input.existing.attemptId !== input.attemptId ||
      input.existing.ownerId !== input.ownerId ||
      input.existing.plannerSeed !== input.plannerSeed
    ) {
      throw new Error("Attempt ownership hoặc start binding không hợp lệ.");
    }
    assertFrozenCandidateBinding(input.existing.binding);
    return {
      kind: "RESUMED",
      state: input.existing,
      clientSession: projectAdaptiveClientSession(bank, input.existing),
    };
  }
  const started = createStartedAdaptiveAttempt({
    attemptId: input.attemptId,
    ownerId: input.ownerId,
    plannerSeed: input.plannerSeed,
    startedAt: input.now,
  });
  const state = {
    ...applyPlannerDecision(bank, started, input.now),
    revision: 1,
  };
  return {
    kind: "STARTED",
    state,
    clientSession: projectAdaptiveClientSession(bank, state),
  };
}

function normalizeAnswer(
  question: ReleaseClientQuestion,
  answer: string,
) {
  const trimmed = answer.trim();
  if (question.answerType === "MULTIPLE_CHOICE") {
    const normalized = trimmed.toUpperCase();
    if (!/^[A-D]$/.test(normalized)) {
      throw new Error("Câu trả lời trắc nghiệm không hợp lệ.");
    }
    return normalized;
  }
  if (!/^(?:0|[1-9][0-9]{0,5})$/.test(trimmed)) {
    throw new Error("Câu trả lời số nguyên không hợp lệ.");
  }
  return String(Number.parseInt(trimmed, 10));
}

function findSolution(
  bank: AdaptiveRuntimeQuestionBank,
  questionId: string,
) {
  const solution = bank.serverSolutions.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!solution) {
    throw new Error("Server solution mapping không đầy đủ.");
  }
  return solution;
}

function createFeedback(
  solution: ReleaseServerSolution,
  isCorrect: boolean,
): AdaptiveAnswerFeedback {
  return {
    questionId: solution.questionId,
    isCorrect,
    correctAnswer: solution.correctAnswer,
    solutionSteps: solution.solutionSteps,
    explanation: solution.explanation,
    hint: solution.hint,
  };
}

export function submitAdaptiveAnswer(
  bank: AdaptiveRuntimeQuestionBank,
  state: AdaptiveAttemptState,
  command: AdaptiveSubmitCommand,
): AdaptiveSubmitResult {
  assertFrozenCandidateBinding(state.binding);
  assertSafeIdentifier(command.submissionId, "submissionId");
  assertIsoDate(command.submittedAt, "submittedAt");
  const replay = state.submissions.find(
    (submission) =>
      submission.submissionId === command.submissionId,
  );
  if (replay) {
    const replayQuestion = findPublicQuestion(bank, command.questionId);
    if (!replayQuestion) {
      throw new Error("Question không thuộc frozen candidate.");
    }
    const replayAnswer = normalizeAnswer(
      replayQuestion,
      command.answer,
    );
    if (
      replay.questionId !== command.questionId ||
      replay.normalizedAnswer !== replayAnswer
    ) {
      throw new Error("Submission ID đã được dùng cho payload khác.");
    }
    const evidence = state.evidence.find(
      (item) => item.sequence === replay.evidenceSequence,
    );
    if (!evidence) {
      throw new Error("Idempotency evidence không nhất quán.");
    }
    const solution = findSolution(bank, command.questionId);
    return {
      kind: "IDEMPOTENT_REPLAY",
      state,
      clientSession: projectAdaptiveClientSession(bank, state),
      feedback: createFeedback(solution, evidence.isCorrect),
    };
  }
  if (isTerminal(state.status)) {
    throw new Error("Completed attempt không nhận thêm answer.");
  }
  const question = findPublicQuestion(bank, command.questionId);
  if (!question) {
    throw new Error("Question không thuộc frozen candidate.");
  }
  const normalizedAnswer = normalizeAnswer(question, command.answer);
  if (state.status !== "IN_PROGRESS") {
    throw new Error("Attempt chưa sẵn sàng nhận answer.");
  }
  if (command.expectedRevision !== state.revision) {
    throw new Error("Concurrent attempt revision conflict.");
  }
  if (state.currentQuestionId !== command.questionId) {
    throw new Error("Client không được chọn câu hỏi tiếp theo.");
  }
  if (
    state.evidence.some(
      (item) => item.questionCode === command.questionId,
    )
  ) {
    throw new Error("Question đã có evidence.");
  }
  const solution = findSolution(bank, command.questionId);
  const isCorrect = normalizedAnswer === solution.correctAnswer;
  const evidenceSequence = state.evidence.length + 1;
  const nextEvidence: AdaptiveRuntimeEvidence = {
    questionCode: command.questionId,
    skillFamilyId: question.skillFamilyId,
    isCorrect,
    sequence: evidenceSequence,
    submittedAt: command.submittedAt,
  };
  const savedState: AdaptiveAttemptState = {
    ...state,
    revision: state.revision + 1,
    currentQuestionId: null,
    evidence: [...state.evidence, nextEvidence],
    submissions: [
      ...state.submissions,
      {
        submissionId: command.submissionId,
        questionId: command.questionId,
        normalizedAnswer,
        evidenceSequence,
      },
    ],
    updatedAt: command.submittedAt,
  };
  const plannedState = applyPlannerDecision(
    bank,
    savedState,
    command.submittedAt,
  );
  return {
    kind: "SAVED",
    state: plannedState,
    clientSession: projectAdaptiveClientSession(bank, plannedState),
    feedback: createFeedback(solution, isCorrect),
  };
}

export async function submitAdaptiveAnswerAtomically(
  bank: AdaptiveRuntimeQuestionBank,
  repository: AdaptiveAttemptRepository,
  ownerId: string,
  attemptId: string,
  command: AdaptiveSubmitCommand,
): Promise<AdaptiveSubmitResult> {
  const current = await repository.getOwnedAttempt(attemptId, ownerId);
  if (!current) {
    throw new Error("Attempt ownership không hợp lệ.");
  }
  const result = submitAdaptiveAnswer(bank, current, command);
  if (result.kind === "IDEMPOTENT_REPLAY") {
    return result;
  }
  const stored = await repository.compareAndSwap(
    attemptId,
    ownerId,
    current.revision,
    result.state,
  );
  if (stored) return result;

  // A competing submit committed first. Re-read once: an identical
  // submission becomes an idempotent replay; a different stale command fails
  // on its expected revision without adding evidence.
  const latest = await repository.getOwnedAttempt(attemptId, ownerId);
  if (!latest) {
    throw new Error("Attempt ownership không hợp lệ.");
  }
  return submitAdaptiveAnswer(bank, latest, command);
}

export function abandonAdaptiveAttempt(
  state: AdaptiveAttemptState,
  abandonedAt: string,
): AdaptiveAttemptState {
  assertIsoDate(abandonedAt, "abandonedAt");
  if (isTerminal(state.status)) return state;
  return {
    ...state,
    status: "ABANDONED",
    revision: state.revision + 1,
    currentQuestionId: null,
    updatedAt: abandonedAt,
    completedAt: abandonedAt,
    completionReason: "OWNER_ABANDONED",
  };
}

function stableQuestionScore(seed: string, questionId: string) {
  let hash = 2166136261;
  for (const character of `${seed}:${questionId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function prepareAdaptiveRetentionPlan(
  bank: AdaptiveRuntimeQuestionBank,
  state: AdaptiveAttemptState,
): AdaptiveRetentionPlan {
  if (
    state.status !== "MASTERED_EARLY" &&
    state.status !== "MAX_REACHED"
  ) {
    throw new Error("Retention chỉ chuẩn bị sau initial mastery.");
  }
  if (!state.completedAt) {
    throw new Error("Completed attempt thiếu completedAt.");
  }
  const schedule = planDelayedRetentionCheck(
    bank.policy,
    state.completedAt,
  );
  const questionIds = bank.policy.requiredSkillCoverage.map(
    (skillFamilyId) => {
      const candidates = bank.publicQuestions
        .filter(
          (question) =>
            question.skillFamilyId === skillFamilyId &&
            !state.evidence.some(
              (item) => item.questionCode === question.questionId,
            ),
        )
        .sort(
          (left, right) =>
            stableQuestionScore(
              `${state.plannerSeed}:retention`,
              left.questionId,
            ) -
            stableQuestionScore(
              `${state.plannerSeed}:retention`,
              right.questionId,
            ),
        );
      const selected = candidates[0];
      if (!selected) {
        throw new Error("Không đủ câu riêng cho retention.");
      }
      return selected.questionId;
    },
  );
  if (questionIds.length !== schedule.questionCount) {
    throw new Error("Retention coverage không khớp policy.");
  }
  return {
    status: "PLANNED_NOT_PERSISTED",
    sourceAttemptId: state.attemptId,
    contentVersion: state.binding.contentVersion,
    dueAt: schedule.dueAt,
    questionIds,
    evidence: [],
    resultIsSeparateFromInitialAttempt: true,
    decisionStatus: "PRODUCT_HYPOTHESIS",
  };
}

export function getAdaptiveMasteryForServer(
  bank: AdaptiveRuntimeQuestionBank,
  state: AdaptiveAttemptState,
): readonly SkillMasteryEvidence[] {
  const decision = planAdaptivePractice(
    bank.policy,
    {
      evidence: plannerEvidence(state.evidence),
      availableQuestions: bank.plannerQuestions,
    },
    state.plannerSeed,
  );
  return decision.mastery;
}
