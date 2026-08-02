import {
  parseCurriculumAttemptState,
} from "@/lib/curriculum-runtime/contracts";
import {
  createCurriculumApiResponder,
  curriculumAccessErrorCode,
} from "@/lib/curriculum-runtime/api-response";
import {
  mapCurriculumRpcError,
} from "@/lib/curriculum-runtime/errors";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import { isSameOriginRequest } from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";
import { safeUpstreamCode } from "@/lib/runtime-diagnostics/server";
import {
  loadStudentGeneratedPracticeState,
  toStudentStaticRuntimeState,
} from "@/lib/generation-v2/student-runtime";

export async function GET(request: Request) {
  const api = createCurriculumApiResponder(request);
  if (!isSameOriginRequest(request)) {
    return api.error("INVALID_REQUEST", {
      httpStatus: 403,
      serverErrorCode: "ORIGIN_REJECTED",
    });
  }
  if (!getUniversalCurriculumRuntimeFlag().enabled) {
    return api.error("RUNTIME_DISABLED");
  }
  const access = await getStudentLearningContext({
    recordTiming: api.trace.record,
  });
  if (!access.ok) {
    const code = curriculumAccessErrorCode(access.reason);
    return api.error(code, {
      serverErrorCode: `ACCESS_${access.reason}`,
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
  const generated = await api.trace.measure("generation", () =>
    loadStudentGeneratedPracticeState({ request, access, attemptId }),
  );
  if (generated.ok) {
    return api.success({ ok: true, data: generated.state });
  }
  if (generated.code !== "PRACTICE_UNAVAILABLE") {
    return api.error(generated.code, {
      serverErrorCode: generated.code,
      upstreamCode: safeUpstreamCode(generated.upstreamCode),
    });
  }
  const { data, error } = await api.trace.measure(
    "rpc",
    () =>
      access.supabase.rpc("get_curriculum_attempt_state", {
        p_attempt_id: attemptId,
      }),
  );
  if (error) {
    const code = mapCurriculumRpcError(error);
    return api.error(code, {
      serverErrorCode: `RPC_${code}`,
      upstreamCode: safeUpstreamCode(error.code),
    });
  }
  const mappingStartedAt = performance.now();
  const state = parseCurriculumAttemptState(data);
  api.trace.record("response_mapping", performance.now() - mappingStartedAt);
  if (!state || state.grade !== access.grade || state.feedback !== null) {
    return api.error("REQUEST_FAILED", {
      serverErrorCode: "RESPONSE_MAPPING_FAILED",
    });
  }
  return api.success({
    ok: true,
    data: toStudentStaticRuntimeState(state),
  });
}
