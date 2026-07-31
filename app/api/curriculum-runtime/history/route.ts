import {
  createCurriculumApiResponder,
  curriculumAccessErrorCode,
} from "@/lib/curriculum-runtime/api-response";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import { loadStudentCurriculumHistory } from "@/lib/curriculum-runtime/server";
import { isSameOriginRequest } from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";

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
  const result = await api.trace.measure(
    "rpc",
    () => loadStudentCurriculumHistory(access),
  );
  if (!result.ok) {
    return api.error("REQUEST_FAILED", {
      serverErrorCode: `HISTORY_${result.reason}`,
    });
  }
  const mappingStartedAt = performance.now();
  const history = result.history;
  api.trace.record("response_mapping", performance.now() - mappingStartedAt);
  if (!history || history.grade !== access.grade) {
    return api.error("REQUEST_FAILED", {
      serverErrorCode: "RESPONSE_MAPPING_FAILED",
    });
  }
  return api.success({ ok: true, data: history });
}
