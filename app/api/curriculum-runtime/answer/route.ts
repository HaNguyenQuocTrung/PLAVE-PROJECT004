import {
  parseCurriculumAttemptState,
  parseSubmitCurriculumRequest,
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
  submitStudentGeneratorV2Answer,
  toStudentStaticRuntimeState,
} from "@/lib/generation-v2/student-runtime";
import { revalidateStudentLearningProjections } from "@/lib/curriculum-runtime/revalidation";

export async function POST(request: Request) {
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
  let body: unknown;
  try {
    body = await api.trace.measure("request_body", () => request.json());
  } catch {
    return api.error("INVALID_REQUEST", {
      serverErrorCode: "INVALID_JSON",
    });
  }
  const input = parseSubmitCurriculumRequest(body);
  if (!input) {
    return api.error("INVALID_REQUEST", {
      serverErrorCode: "INVALID_INPUT",
    });
  }
  const generated = await api.trace.measure("generation", () =>
    submitStudentGeneratorV2Answer({ request, access, ...input }),
  );
  if (generated.ok) {
    if (
      !generated.state.feedback ||
      generated.state.feedback.questionId !== input.questionId
    ) {
      return api.error("REQUEST_FAILED", {
        serverErrorCode: "GENERATOR_V2_RESPONSE_MAPPING_FAILED",
      });
    }
    revalidateStudentLearningProjections();
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
      access.supabase.rpc("submit_curriculum_answer", {
        p_attempt_id: input.attemptId,
        p_question_id: input.questionId,
        p_answer: input.answer,
        p_expected_revision: input.expectedRevision,
        p_idempotency_key: input.idempotencyKey,
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
  if (
    !state ||
    state.grade !== access.grade ||
    !state.feedback ||
    state.feedback.questionId !== input.questionId
  ) {
    return api.error("REQUEST_FAILED", {
      serverErrorCode: "RESPONSE_MAPPING_FAILED",
    });
  }
  revalidateStudentLearningProjections();
  return api.success({
    ok: true,
    data: toStudentStaticRuntimeState(state),
  });
}
