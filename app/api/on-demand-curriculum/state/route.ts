import {
  loadOnDemandAttemptState,
} from "@/lib/curriculum/on-demand-runtime";
import {
  createCurriculumApiResponder,
  curriculumAccessErrorCode,
} from "@/lib/curriculum-runtime/api-response";
import { mapCurriculumRpcError } from "@/lib/curriculum-runtime/errors";
import { isSameOriginRequest } from "@/lib/practice/errors";
import { safeUpstreamCode } from "@/lib/runtime-diagnostics/server";

export async function GET(request: Request) {
  const api = createCurriculumApiResponder(request);
  if (!isSameOriginRequest(request)) {
    return api.error("INVALID_REQUEST", {
      httpStatus: 403,
      serverErrorCode: "ORIGIN_REJECTED",
    });
  }
  const attemptId = new URL(request.url).searchParams.get("attemptId");
  if (
    !attemptId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      attemptId,
    )
  ) {
    return api.error("INVALID_REQUEST", {
      serverErrorCode: "INVALID_ATTEMPT_ID",
    });
  }
  const result = await loadOnDemandAttemptState(
    attemptId,
    api.trace.record,
  );
  if (!result.ok) {
    if (
      result.reason === "UNAUTHENTICATED" ||
      result.reason === "ACCESS_DENIED" ||
      result.reason === "ONBOARDING_REQUIRED" ||
      result.reason === "DATA_UNAVAILABLE"
    ) {
      const code = curriculumAccessErrorCode(result.reason);
      return api.error(code, {
        serverErrorCode: `ACCESS_${result.reason}`,
      });
    }
    const databaseError =
      "databaseError" in result ? result.databaseError : null;
    const code = databaseError
      ? mapCurriculumRpcError(databaseError)
      : result.reason === "RUNTIME_DISABLED"
        ? "RUNTIME_DISABLED"
        : "REQUEST_FAILED";
    return api.error(code, {
      serverErrorCode: `ON_DEMAND_${result.reason}`,
      upstreamCode: safeUpstreamCode(databaseError?.code),
    });
  }
  return api.success({ ok: true, data: result.state });
}
