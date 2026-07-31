import type {
  CurriculumRuntimeApiError,
  CurriculumRuntimeErrorCode,
} from "./contracts.ts";

const messages: Record<CurriculumRuntimeErrorCode, string> = {
  AUTH_REQUIRED: "Em cần đăng nhập để tiếp tục.",
  ACCESS_DENIED: "Tài khoản này không thể mở bài học.",
  RUNTIME_DISABLED: "Bài học đang được chuẩn bị và chưa mở.",
  RELEASE_UNAVAILABLE: "Nội dung học hiện chưa sẵn sàng.",
  UNIT_UNAVAILABLE: "Chủ đề này chưa sẵn sàng cho lớp của em.",
  PRACTICE_UNAVAILABLE: "Lượt luyện tập không tồn tại hoặc không còn mở.",
  REVISION_CONFLICT: "Lượt học đã thay đổi. Em hãy tải lại câu hiện tại.",
  DUPLICATE_SUBMISSION: "Câu này đã được ghi nhận.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu không khớp với lần gửi trước.",
  INVALID_REQUEST: "Thông tin gửi lên chưa hợp lệ.",
  REQUEST_TIMEOUT:
    "Yêu cầu mất quá nhiều thời gian. Em có thể thử lại an toàn.",
  REQUEST_FAILED: "Chưa thể xử lý yêu cầu. Em hãy thử lại.",
};

export function curriculumRuntimeApiError(
  code: CurriculumRuntimeErrorCode,
  correlationId?: string,
): CurriculumRuntimeApiError {
  return {
    ok: false,
    error: {
      code,
      message: messages[code],
      ...(correlationId ? { correlationId } : {}),
      retryable: code === "REQUEST_TIMEOUT" || code === "REQUEST_FAILED",
    },
  };
}

export function mapCurriculumRpcError(error: {
  code?: string | null;
  message?: string | null;
}): CurriculumRuntimeErrorCode {
  if (/abort|timeout|fetch failed|network/i.test(error.message ?? "")) {
    return "REQUEST_TIMEOUT";
  }
  const code = /^CURRICULUM:([A-Z0-9_]+)$/.exec(
    error.message ?? "",
  )?.[1];
  switch (code) {
    case "UNAUTHENTICATED":
      return "AUTH_REQUIRED";
    case "FORBIDDEN":
    case "LEGACY_GRADE1_RUNTIME_REQUIRED":
      return "ACCESS_DENIED";
    case "RELEASE_UNAVAILABLE":
      return "RELEASE_UNAVAILABLE";
    case "UNIT_UNAVAILABLE":
      return "UNIT_UNAVAILABLE";
    case "ATTEMPT_NOT_FOUND":
    case "ATTEMPT_NOT_ACTIVE":
    case "QUESTION_MISMATCH":
      return "PRACTICE_UNAVAILABLE";
    case "REVISION_CONFLICT":
      return "REVISION_CONFLICT";
    case "DUPLICATE_SUBMISSION":
      return "DUPLICATE_SUBMISSION";
    case "IDEMPOTENCY_CONFLICT":
      return "IDEMPOTENCY_CONFLICT";
    case "INVALID_REQUEST":
    case "INVALID_ANSWER":
      return "INVALID_REQUEST";
    case "INTEGRITY_FAILURE":
      return "REQUEST_FAILED";
    default:
      return "REQUEST_FAILED";
  }
}
