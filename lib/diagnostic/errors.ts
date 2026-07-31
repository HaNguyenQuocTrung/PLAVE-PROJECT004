import { isSameOriginRequest as checkSameOrigin } from "@/lib/auth/same-origin";
import type {
  DiagnosticApiError,
  DiagnosticSafeErrorCode,
} from "@/lib/diagnostic/contracts";

const messages: Record<DiagnosticSafeErrorCode, string> = {
  AUTH_REQUIRED: "Em cần đăng nhập để mở bài đánh giá.",
  ACCESS_DENIED: "Tài khoản này không thể làm bài đánh giá Lớp 1.",
  INVALID_REQUEST: "Yêu cầu chưa hợp lệ. Em hãy thử lại.",
  INVALID_ANSWER: "Em hãy chọn hoặc nhập một câu trả lời hợp lệ.",
  ANSWER_LOCKED: "Câu trả lời này đã được lưu và không thể thay đổi.",
  DIAGNOSTIC_INCOMPLETE:
    "Em cần hoàn thành đủ 24 câu trước khi xem kết quả.",
  DIAGNOSTIC_UNAVAILABLE:
    "Bài đánh giá chưa sẵn sàng. Em hãy thử lại sau.",
  QUESTION_UNAVAILABLE:
    "Câu hỏi chưa sẵn sàng. Em hãy tải lại bài đánh giá.",
  REQUEST_FAILED:
    "Chưa thể hoàn tất yêu cầu. Vui lòng kiểm tra kết nối và thử lại.",
};

export function diagnosticApiError(
  code: DiagnosticSafeErrorCode,
): DiagnosticApiError {
  return {
    ok: false,
    error: { code, message: messages[code] },
  };
}

export function mapDiagnosticRpcError(error: { message?: string | null }) {
  const message = error.message ?? "";
  if (message.includes("Authentication required")) {
    return diagnosticApiError("AUTH_REQUIRED");
  }
  if (
    message.includes("Student access required") ||
    message.includes("Access denied")
  ) {
    return diagnosticApiError("ACCESS_DENIED");
  }
  if (message.includes("Invalid answer")) {
    return diagnosticApiError("INVALID_ANSWER");
  }
  if (message.includes("Answer already submitted")) {
    return diagnosticApiError("ANSWER_LOCKED");
  }
  if (message.includes("Diagnostic incomplete")) {
    return diagnosticApiError("DIAGNOSTIC_INCOMPLETE");
  }
  if (message.includes("Question unavailable")) {
    return diagnosticApiError("QUESTION_UNAVAILABLE");
  }
  if (
    message.includes("Diagnostic unavailable") ||
    message.includes("Learning summary unavailable")
  ) {
    return diagnosticApiError("DIAGNOSTIC_UNAVAILABLE");
  }
  return diagnosticApiError("REQUEST_FAILED");
}

export function isSameOriginRequest(request: Request) {
  return checkSameOrigin(request);
}
