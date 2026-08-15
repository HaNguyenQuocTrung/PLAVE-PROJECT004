import {
  getAdaptiveRetryPolicy,
  parseAdaptiveDatabaseError,
  parseAdaptiveRpcState,
  type AdaptiveDatabaseErrorCode,
  type AdaptiveRetryPolicy,
  type AdaptiveRpcState,
  type StartAdaptivePracticeRequest,
  type SubmitAdaptivePracticeRequest,
} from "./adaptive-database-contract.ts";

export const adaptiveApiErrorCodes = [
  "AUTH_REQUIRED",
  "ACCESS_DENIED",
  "INVALID_REQUEST",
  "UNIT_UNAVAILABLE",
  "CONTENT_CHANGED",
  "PRACTICE_UNAVAILABLE",
  "PRACTICE_NOT_ACTIVE",
  "QUESTION_CHANGED",
  "REVISION_CONFLICT",
  "DUPLICATE_SUBMISSION",
  "INVALID_ANSWER",
  "REQUEST_FAILED",
] as const;

export type AdaptiveApiErrorCode =
  (typeof adaptiveApiErrorCodes)[number];

export type AdaptiveApiError = Readonly<{
  ok: false;
  error: Readonly<{
    code: AdaptiveApiErrorCode;
    message: string;
    retry: AdaptiveRetryPolicy;
  }>;
}>;

export type AdaptiveApiSuccess = Readonly<{
  ok: true;
  data: AdaptiveRpcState;
}>;

export type AdaptiveApiResponse = AdaptiveApiSuccess | AdaptiveApiError;

export type AdaptiveRpcCall = (
  functionName:
    | "start_or_resume_adaptive_practice"
    | "get_adaptive_practice_state"
    | "submit_adaptive_practice_answer",
  args: Readonly<Record<string, unknown>>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const apiMessages: Record<AdaptiveApiErrorCode, string> = {
  AUTH_REQUIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  ACCESS_DENIED: "Tài khoản này không có quyền mở lượt luyện tập.",
  INVALID_REQUEST: "Yêu cầu chưa hợp lệ. Em hãy kiểm tra và thử lại.",
  UNIT_UNAVAILABLE: "Bài học này hiện chưa được mở.",
  CONTENT_CHANGED:
    "Phiên bản bài học đã thay đổi. Em hãy quay lại trang bài học.",
  PRACTICE_UNAVAILABLE:
    "Lượt luyện tập không tồn tại hoặc em không có quyền xem.",
  PRACTICE_NOT_ACTIVE: "Lượt luyện tập này đã kết thúc.",
  QUESTION_CHANGED:
    "Câu hỏi hiện tại đã thay đổi. PLAVE sẽ tải lại trạng thái mới nhất.",
  REVISION_CONFLICT:
    "Lượt học vừa được cập nhật ở nơi khác. PLAVE sẽ tải lại trạng thái mới nhất.",
  DUPLICATE_SUBMISSION:
    "Mã gửi này đã được dùng cho một câu trả lời khác.",
  INVALID_ANSWER: "Câu trả lời chưa đúng định dạng yêu cầu.",
  REQUEST_FAILED: "Chưa thể xử lý yêu cầu. Vui lòng thử lại sau.",
};

const databaseToApiCode: Record<
  AdaptiveDatabaseErrorCode,
  AdaptiveApiErrorCode
> = {
  UNAUTHENTICATED: "AUTH_REQUIRED",
  FORBIDDEN: "ACCESS_DENIED",
  UNIT_NOT_AVAILABLE: "UNIT_UNAVAILABLE",
  CONTENT_VERSION_MISMATCH: "CONTENT_CHANGED",
  ATTEMPT_NOT_FOUND: "PRACTICE_UNAVAILABLE",
  ATTEMPT_NOT_ACTIVE: "PRACTICE_NOT_ACTIVE",
  QUESTION_MISMATCH: "QUESTION_CHANGED",
  REVISION_CONFLICT: "REVISION_CONFLICT",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  INVALID_ANSWER: "INVALID_ANSWER",
  INTEGRITY_FAILURE: "REQUEST_FAILED",
};

export function adaptiveApiError(
  code: AdaptiveApiErrorCode,
): AdaptiveApiError {
  const retry = getAdaptiveRetryPolicy(
    code === "REVISION_CONFLICT"
      ? "REVISION_CONFLICT"
      : code === "REQUEST_FAILED"
        ? "TRANSIENT_DATABASE_ERROR"
        : "INTEGRITY_FAILURE",
    code === "REQUEST_FAILED",
  );
  return {
    ok: false,
    error: { code, message: apiMessages[code], retry },
  };
}

function mapRpcError(error: unknown): AdaptiveApiError {
  const databaseCode = parseAdaptiveDatabaseError(error);
  return adaptiveApiError(databaseToApiCode[databaseCode]);
}

async function readRpcState(
  rpc: AdaptiveRpcCall,
  functionName: Parameters<AdaptiveRpcCall>[0],
  args: Readonly<Record<string, unknown>>,
  allowPostSubmitFeedback: boolean,
): Promise<AdaptiveApiResponse> {
  const { data, error } = await rpc(functionName, args);
  if (error) return mapRpcError(error);

  const state = parseAdaptiveRpcState(
    data,
    allowPostSubmitFeedback,
  );
  if (!state) return adaptiveApiError("REQUEST_FAILED");
  return { ok: true, data: state };
}

export function startOrResumeAdaptivePractice(
  rpc: AdaptiveRpcCall,
  input: StartAdaptivePracticeRequest,
) {
  return readRpcState(
    rpc,
    "start_or_resume_adaptive_practice",
    {
      p_unit_slug: input.unitSlug,
      p_idempotency_key: input.idempotencyKey,
    },
    false,
  );
}

export function getAdaptivePracticeState(
  rpc: AdaptiveRpcCall,
  attemptId: string,
) {
  return readRpcState(
    rpc,
    "get_adaptive_practice_state",
    { p_attempt_id: attemptId },
    false,
  );
}

export function submitAdaptivePracticeAnswer(
  rpc: AdaptiveRpcCall,
  input: SubmitAdaptivePracticeRequest,
) {
  return readRpcState(
    rpc,
    "submit_adaptive_practice_answer",
    {
      p_attempt_id: input.attemptId,
      p_question_id: input.questionId,
      p_answer: input.answer,
      p_expected_revision: input.expectedRevision,
      p_idempotency_key: input.idempotencyKey,
    },
    true,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  return (
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}

export function parseAdaptiveApiResponse(
  value: unknown,
  allowPostSubmitFeedback: boolean,
): AdaptiveApiResponse | null {
  if (!isRecord(value) || typeof value.ok !== "boolean") return null;
  if (value.ok) {
    if (
      Object.keys(value).sort().join(",") !== "data,ok" ||
      !isRecord(value.data) ||
      !hasExactKeys(value.data, [
        "attemptId",
        "unitSlug",
        "contentVersion",
        "status",
        "revision",
        "answeredCount",
        "currentQuestion",
        "remediationSkillIds",
        "completedAt",
        "feedback",
        ...(value.data.xp === undefined ? [] : ["xp"]),
      ]) ||
      !isExactClientQuestion(value.data.currentQuestion) ||
      !isExactClientFeedback(value.data.feedback)
    ) {
      return null;
    }
    // Convert the camelCase API state back to the database-shape parser's
    // expected input without accepting extra keys.
    const data = value.data;
    const state = parseAdaptiveRpcState(
      {
        attempt_id: data.attemptId,
        unit_slug: data.unitSlug,
        content_version: data.contentVersion,
        status: data.status,
        revision: data.revision,
        answered_count: data.answeredCount,
        current_question: toDatabaseQuestion(data.currentQuestion),
        remediation_skill_ids: data.remediationSkillIds,
        completed_at: data.completedAt,
        feedback: toDatabaseFeedback(data.feedback),
        ...(isRecord(data.xp)
          ? {
              xp: {
                answer_xp_awarded: data.xp.answerXpAwarded,
                attempt_xp_earned: data.xp.attemptXpEarned,
                total_xp_after: data.xp.totalXpAfter,
                policy_version: data.xp.policyVersion,
                eligible: data.xp.eligible,
                zero_xp_reason: data.xp.zeroXpReason,
              },
            }
          : {}),
      },
      allowPostSubmitFeedback,
    );
    return state ? { ok: true, data: state } : null;
  }
  if (
    Object.keys(value).sort().join(",") !== "error,ok" ||
    !isRecord(value.error) ||
    Object.keys(value.error).sort().join(",") !== "code,message,retry" ||
    !adaptiveApiErrorCodes.includes(
      value.error.code as AdaptiveApiErrorCode,
    ) ||
    typeof value.error.message !== "string" ||
    !isRecord(value.error.retry) ||
    !hasExactKeys(value.error.retry, ["action", "automatic"]) ||
    value.error.retry.automatic !== false ||
    ![
      "REFETCH_THEN_MANUAL_RETRY",
      "SAME_IDEMPOTENCY_KEY_RETRY",
      "DO_NOT_RETRY",
    ].includes(value.error.retry.action as string)
  ) {
    return null;
  }
  // Never trust client-visible wording or retry metadata from the wire. The
  // allowlisted code is mapped back to the local safe contract.
  return adaptiveApiError(value.error.code as AdaptiveApiErrorCode);
}

function isExactClientQuestion(value: unknown) {
  return (
    value === null ||
    (isRecord(value) &&
      hasExactKeys(value, [
        "questionId",
        "prompt",
        "answerType",
        "options",
        "visual",
        "accessibilityDescription",
        "skillFamilyId",
        "difficulty",
        "displayOrder",
      ]))
  );
}

function isExactClientFeedback(value: unknown) {
  return (
    value === null ||
    (isRecord(value) &&
      hasExactKeys(value, [
        "questionId",
        "isCorrect",
        "correctAnswer",
        "solutionSteps",
        "explanation",
        "hint",
      ]))
  );
}

function toDatabaseQuestion(value: unknown): unknown {
  if (value === null) return null;
  if (!isRecord(value)) return value;
  return {
    question_id: value.questionId,
    prompt: value.prompt,
    answer_type: value.answerType,
    options: value.options,
    visual: value.visual,
    accessibility_description: value.accessibilityDescription,
    skill_family_id: value.skillFamilyId,
    difficulty: value.difficulty,
    display_order: value.displayOrder,
  };
}

function toDatabaseFeedback(value: unknown): unknown {
  if (value === null) return null;
  if (!isRecord(value)) return value;
  return {
    question_id: value.questionId,
    is_correct: value.isCorrect,
    correct_answer: value.correctAnswer,
    solution_steps: value.solutionSteps,
    explanation: value.explanation,
    hint: value.hint,
  };
}
