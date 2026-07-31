import "server-only";

export { isSameOriginRequest } from "@/lib/auth/same-origin";

import type {
  PracticeApiError,
  SafePracticeErrorCode,
} from "@/lib/practice/contracts";

type RpcErrorLike = {
  code?: string;
  message?: string;
} | null;

const messages: Record<SafePracticeErrorCode, string> = {
  AUTH_REQUIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  ACCESS_DENIED: "Tài khoản này không có quyền mở bài luyện tập.",
  INVALID_REQUEST: "Yêu cầu không hợp lệ. Vui lòng kiểm tra và thử lại.",
  INVALID_ANSWER: "Câu trả lời chưa đúng định dạng yêu cầu.",
  PREREQUISITE_REQUIRED:
    "Hoàn thành bài Các số trong phạm vi 10 để mở luyện tập.",
  UNIT_UNAVAILABLE: "Bài học hiện chưa sẵn sàng. Vui lòng thử lại sau.",
  PRACTICE_UNAVAILABLE:
    "Lượt luyện tập không tồn tại hoặc em không có quyền truy cập.",
  QUESTION_UNAVAILABLE: "Câu hỏi hiện chưa sẵn sàng. Vui lòng thử lại.",
  REQUEST_FAILED: "Chưa thể xử lý yêu cầu. Vui lòng thử lại sau.",
};

export function practiceApiError(
  code: SafePracticeErrorCode,
): PracticeApiError {
  return { ok: false, error: { code, message: messages[code] } };
}

export function mapPracticeRpcError(error: RpcErrorLike): PracticeApiError {
  switch (error?.message) {
    case "Authentication required":
      return practiceApiError("AUTH_REQUIRED");
    case "Student access required":
      return practiceApiError("ACCESS_DENIED");
    case "Unit unavailable":
      return practiceApiError("UNIT_UNAVAILABLE");
    case "Prerequisite required":
      return practiceApiError("PREREQUISITE_REQUIRED");
    case "Practice unavailable":
      return practiceApiError("PRACTICE_UNAVAILABLE");
    case "Question unavailable":
      return practiceApiError("QUESTION_UNAVAILABLE");
    case "Invalid answer":
      return practiceApiError("INVALID_ANSWER");
    default:
      return practiceApiError("REQUEST_FAILED");
  }
}
