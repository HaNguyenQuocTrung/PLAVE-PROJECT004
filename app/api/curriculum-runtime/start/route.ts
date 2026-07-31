import { NextResponse } from "next/server";

import {
  parseCurriculumAttemptState,
  parseStartCurriculumRequest,
  type CurriculumRuntimeErrorCode,
} from "@/lib/curriculum-runtime/contracts";
import {
  curriculumRuntimeApiError,
  mapCurriculumRpcError,
} from "@/lib/curriculum-runtime/errors";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import { isSameOriginRequest } from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";
import {
  createRuntimeTrace,
  safeUpstreamCode,
} from "@/lib/runtime-diagnostics/server";

function status(code: CurriculumRuntimeErrorCode) {
  if (code === "AUTH_REQUIRED") return 401;
  if (code === "ACCESS_DENIED") return 403;
  if (code === "UNIT_UNAVAILABLE" || code === "RELEASE_UNAVAILABLE") return 404;
  if (code === "RUNTIME_DISABLED") return 503;
  if (code === "REQUEST_TIMEOUT") return 504;
  if (code === "REQUEST_FAILED") return 502;
  return 400;
}

function json(
  trace: ReturnType<typeof createRuntimeTrace>,
  value: unknown,
  responseStatus = 200,
  serverErrorCode = "OK",
  upstreamCode?: string,
) {
  return NextResponse.json(value, {
    status: responseStatus,
    headers: trace.finish(responseStatus, serverErrorCode, upstreamCode),
  });
}

export async function POST(request: Request) {
  const trace = createRuntimeTrace(request);
  const error = (
    code: CurriculumRuntimeErrorCode,
    responseStatus = status(code),
    serverErrorCode: string = code,
    upstreamCode: string | undefined = undefined,
  ) =>
    json(
      trace,
      curriculumRuntimeApiError(code, trace.correlationId),
      responseStatus,
      serverErrorCode,
      upstreamCode,
    );
  if (!isSameOriginRequest(request)) {
    return error("INVALID_REQUEST", 403, "ORIGIN_REJECTED");
  }
  if (!getUniversalCurriculumRuntimeFlag().enabled) {
    return error("RUNTIME_DISABLED");
  }
  const access = await getStudentLearningContext({
    recordTiming: trace.record,
  });
  if (!access.ok) {
    const code =
      access.reason === "UNAUTHENTICATED"
        ? "AUTH_REQUIRED"
        : access.reason === "DATA_UNAVAILABLE"
          ? "REQUEST_FAILED"
          : "ACCESS_DENIED";
    return error(code, status(code), `ACCESS_${access.reason}`);
  }
  if (access.grade === 1) {
    return error("ACCESS_DENIED", 403, "LEGACY_GRADE1_REQUIRED");
  }
  let body: unknown;
  try {
    body = await trace.measure("request_body", () => request.json());
  } catch {
    return error("INVALID_REQUEST", 400, "INVALID_JSON");
  }
  const input = parseStartCurriculumRequest(body);
  if (!input) {
    return error("INVALID_REQUEST", 400, "INVALID_INPUT");
  }
  const { data, error: rpcError } = await trace.measure(
    "rpc",
    () =>
      access.supabase.rpc("start_or_resume_curriculum_unit", {
        p_unit_slug: input.unitSlug,
        p_idempotency_key: input.idempotencyKey,
      }),
  );
  if (rpcError) {
    const code = mapCurriculumRpcError(rpcError);
    return error(
      code,
      status(code),
      `RPC_${code}`,
      safeUpstreamCode(rpcError.code),
    );
  }
  const mappingStartedAt = performance.now();
  const state = parseCurriculumAttemptState(data);
  trace.record("response_mapping", performance.now() - mappingStartedAt);
  if (!state || state.grade !== access.grade || state.feedback !== null) {
    return error("REQUEST_FAILED", 502, "RESPONSE_MAPPING_FAILED");
  }
  return json(trace, { ok: true, data: state }, 200, "OK");
}
