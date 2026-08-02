import { NextResponse } from "next/server";

import { getAiTutorConfiguration } from "@/lib/ai-tutor/config";
import {
  parseTutorClientRequest,
  type TutorErrorCode,
  type TutorStreamEvent,
} from "@/lib/ai-tutor/contracts";
import { createAiTutorProvider } from "@/lib/ai-tutor/provider-factory";
import { startAuthenticatedTutorStream } from "@/lib/ai-tutor/runtime";
import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { getStudentLearningContext } from "@/lib/practice/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Partial<Record<TutorErrorCode, string>> = {
  AI_TUTOR_DISABLED: "AI Tutor chưa được bật cho môi trường này.",
  AI_CONFIGURATION_INVALID: "AI Tutor chưa được cấu hình đầy đủ.",
  AI_PROVIDER_NOT_IMPLEMENTED: "Nhà cung cấp AI này chưa được hỗ trợ.",
  AI_AUTH_REQUIRED: "Phiên đăng nhập đã hết hạn. Em hãy đăng nhập lại.",
  AI_STUDENT_ONLY: "AI Tutor hiện chỉ dành cho tài khoản Học sinh.",
  AI_INVALID_REQUEST: "Tin nhắn không đúng định dạng an toàn.",
  AI_REQUEST_TOO_LARGE: "Tin nhắn quá dài. Em hãy rút gọn câu hỏi.",
  AI_HISTORY_LIMIT: "Cuộc trò chuyện đã quá dài. Em hãy mở cuộc trò chuyện mới.",
  AI_RATE_LIMITED: "Em đã gửi nhiều câu hỏi trong một phút. Hãy chờ một chút.",
  AI_DAILY_LIMIT_REACHED: "Đã đạt giới hạn sử dụng hôm nay.",
  AI_CONCURRENT_REQUEST: "AI Tutor đang trả lời câu hỏi trước. Em hãy dừng hoặc chờ hoàn tất.",
  AI_DUPLICATE_REQUEST: "Tin nhắn này đã được gửi rồi.",
  AI_CONVERSATION_FORBIDDEN: "Cuộc trò chuyện này không thuộc phiên học của em.",
  AI_RESPONSE_TRUNCATED: "Câu trả lời bị gián đoạn trước khi hoàn tất.",
  AI_PROVIDER_TIMEOUT: "AI Tutor phản hồi quá lâu. Em có thể thử lại.",
  AI_STREAM_INTERRUPTED: "Kết nối phản hồi bị gián đoạn.",
  AI_SAFETY_BLOCKED: "Phản hồi đã dừng vì bộ lọc an toàn.",
  AI_EMPTY_RESPONSE: "AI Tutor chưa tạo được nội dung.",
};

function errorResponse(code: TutorErrorCode, status: number, retryable = false) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message: ERROR_MESSAGES[code] ?? "AI Tutor chưa thể xử lý yêu cầu.",
        retryable,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function statusForStartError(code: TutorErrorCode) {
  if (code === "AI_CONVERSATION_FORBIDDEN") return 403;
  if (code === "AI_RATE_LIMITED" || code === "AI_DAILY_LIMIT_REACHED") return 429;
  return 409;
}

export async function POST(request: Request) {
  const requestAcceptedAt = Date.now();
  if (!isSameOriginRequest(request)) return errorResponse("AI_INVALID_REQUEST", 403);
  const authStages = new Map<string, number>();
  const authStartedAt = performance.now();
  const access = await getStudentLearningContext({
    recordTiming: (stage, durationMs) => {
      authStages.set(stage, durationMs);
    },
  });
  const authContextMs = performance.now() - authStartedAt;
  if (!access.ok) {
    return errorResponse(
      access.reason === "UNAUTHENTICATED" ? "AI_AUTH_REQUIRED" : "AI_STUDENT_ONLY",
      access.reason === "UNAUTHENTICATED" ? 401 : 403,
    );
  }
  const configuration = getAiTutorConfiguration();
  if (!configuration.ok) {
    return errorResponse(
      configuration.code,
      configuration.code === "AI_PROVIDER_NOT_IMPLEMENTED" ? 501 : 503,
    );
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(length) ||
    length < 0 ||
    length > configuration.config.maxRequestBytes
  ) {
    return errorResponse("AI_REQUEST_TOO_LARGE", 413);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("AI_INVALID_REQUEST", 400);
  }
  const serializedLength = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (serializedLength > configuration.config.maxRequestBytes) {
    return errorResponse("AI_REQUEST_TOO_LARGE", 413);
  }
  const parsed = parseTutorClientRequest(body, configuration.config);
  if (!parsed.ok) {
    return errorResponse(
      parsed.code,
      parsed.code === "AI_REQUEST_TOO_LARGE" ? 413 : 400,
    );
  }
  const serverPreparationMs = Math.max(
    0,
    Date.now() - requestAcceptedAt - authContextMs,
  );
  const result = startAuthenticatedTutorStream({
    userId: access.user.id,
    grade: access.grade,
    clientRequest: parsed.value,
    config: configuration.config,
    provider: createAiTutorProvider(configuration.config),
    requestSignal: request.signal,
    timings: {
      requestAcceptedAt,
      authContextMs,
      supabaseClientMs: authStages.get("supabase_client") ?? null,
      authUserMs: authStages.get("auth_user") ?? null,
      profileMs: authStages.get("profile") ?? null,
      studentProfileMs: authStages.get("student_profile") ?? null,
      serverPreparationMs,
    },
  });
  if (!result.ok) {
    return errorResponse(result.code, statusForStartError(result.code), result.retryable);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of result.stream) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } catch {
        const fallback: TutorStreamEvent = {
          type: "error",
          code: "AI_PROVIDER_ERROR",
          message: "AI Tutor chưa thể trả lời lúc này.",
          retryable: true,
        };
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(fallback)}\n`));
        } catch {
          // The browser may already have aborted the stream.
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Closing an already-cancelled stream is safe to ignore.
        }
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
