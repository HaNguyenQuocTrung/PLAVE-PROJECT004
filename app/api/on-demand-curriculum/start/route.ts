import { NextResponse } from "next/server";

import {
  parseOnDemandStartRequest,
} from "@/lib/curriculum/on-demand-request";
import {
  startOrResumeAdaptiveOnDemand,
} from "@/lib/curriculum/on-demand-runtime";
import { isSameOriginRequest } from "@/lib/practice/errors";
import {
  createRuntimeTrace,
  safeUpstreamCode,
} from "@/lib/runtime-diagnostics/server";

export async function POST(request: Request) {
  const trace = createRuntimeTrace(request);
  const json = (
    value: unknown,
    status: number,
    serverErrorCode: string,
    upstreamCode?: string,
  ) =>
    NextResponse.json(value, {
      status,
      headers: trace.finish(status, serverErrorCode, upstreamCode),
    });
  if (!isSameOriginRequest(request)) {
    return json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Yêu cầu luyện tập không hợp lệ.",
          retryable: false,
        },
      },
      403,
      "ORIGIN_REJECTED",
    );
  }
  let body: unknown;
  try {
    body = await trace.measure("request_body", () => request.json());
  } catch {
    body = null;
  }
  const input = parseOnDemandStartRequest(body);
  if (!input) {
    return json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Yêu cầu luyện tập không hợp lệ.",
          retryable: false,
        },
      },
      400,
      "INVALID_INPUT",
    );
  }
  const result = await startOrResumeAdaptiveOnDemand({
    ...input,
    recordTiming: trace.record,
  });
  if (!result.ok) {
    const authenticationFailure =
      result.reason === "UNAUTHENTICATED";
    const disabled = result.reason === "RUNTIME_DISABLED";
    const noStrategy = result.reason === "NO_SAFE_STRATEGY";
    const status = authenticationFailure
      ? 401
      : disabled
        ? 503
        : noStrategy
          ? 409
          : 502;
    const databaseError =
      "databaseError" in result ? result.databaseError : null;
    return json(
      {
        ok: false,
        error: {
          code: authenticationFailure
            ? "AUTH_REQUIRED"
            : disabled
              ? "RUNTIME_DISABLED"
              : noStrategy
                ? "GENERATION_STRATEGY_UNAVAILABLE"
                : "REQUEST_FAILED",
          message: authenticationFailure
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : noStrategy
              ? "Nội dung này chưa có chiến lược tạo câu đủ an toàn."
              : "Chưa thể mở lượt luyện phù hợp. Em có thể thử lại.",
          retryable: !authenticationFailure && !noStrategy,
        },
      },
      status,
      noStrategy
        ? "GENERATION_STRATEGY_UNAVAILABLE"
        : `ON_DEMAND_${result.reason}`,
      safeUpstreamCode(databaseError?.code),
    );
  }
  return json(
    {
      ok: true,
      data: result.state,
      recommendation: {
        reasonCode: result.recommendation.reasonCode,
        explanation: result.recommendation.explanation,
      },
    },
    200,
    "OK",
  );
}
