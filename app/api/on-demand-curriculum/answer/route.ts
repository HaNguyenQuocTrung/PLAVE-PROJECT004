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
import {
  getOnDemandRuntimeConfiguration,
} from "@/lib/curriculum/on-demand-feature-flag";
import { isSameOriginRequest } from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";
import { evaluateGeneratedPracticePilotEligibility } from "@/lib/curriculum/generated-practice-pilot";
import { safeUpstreamCode } from "@/lib/runtime-diagnostics/server";
import { revalidateStudentLearningProjections } from "@/lib/curriculum-runtime/revalidation";
import {
  loadCanonicalStudentScoringSummary,
  requireCanonicalXpCompletion,
} from "@/lib/curriculum-runtime/xp-projection";

export async function POST(request: Request) {
  const api = createCurriculumApiResponder(request);
  if (!isSameOriginRequest(request)) {
    return api.error("INVALID_REQUEST", {
      httpStatus: 403,
      serverErrorCode: "ORIGIN_REJECTED",
    });
  }
  const configuration = getOnDemandRuntimeConfiguration();
  if (!configuration.enabled) {
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
  if (
    !evaluateGeneratedPracticePilotEligibility({
      configuration: configuration.pilot,
      userId: access.user.id,
      role: "STUDENT",
      schoolGrade: access.grade,
    }).eligible
  ) {
    return api.error("RUNTIME_DISABLED");
  }
  let body: unknown;
  try {
    body = await api.trace.measure("request_body", () => request.json());
  } catch {
    body = null;
  }
  const input = parseSubmitCurriculumRequest(body);
  if (!input) {
    return api.error("INVALID_REQUEST", {
      serverErrorCode: "INVALID_INPUT",
    });
  }
  const { data, error } = await api.trace.measure(
    "rpc",
    () =>
      access.supabase.rpc("submit_generated_curriculum_answer", {
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
    state.feedback?.questionId !== input.questionId
  ) {
    return api.error("REQUEST_FAILED", {
      serverErrorCode: "RESPONSE_MAPPING_FAILED",
    });
  }
  const summary = state.status === "COMPLETED"
    ? await loadCanonicalStudentScoringSummary(() =>
        access.supabase.rpc("get_my_score_xp_mastery"),
      )
    : null;
  const projectedState = state.status === "COMPLETED"
    ? requireCanonicalXpCompletion(state, summary)?.state ?? null
    : state;
  if (!projectedState) {
    return api.error("REQUEST_FAILED", {
      serverErrorCode: "SCORING_PROJECTION_UNAVAILABLE",
    });
  }
  revalidateStudentLearningProjections();
  return api.success({ ok: true, data: projectedState });
}
