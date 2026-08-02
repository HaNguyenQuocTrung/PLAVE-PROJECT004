import "server-only";

import { NextResponse } from "next/server";

import type {
  CurriculumRuntimeErrorCode,
} from "./contracts.ts";
import { curriculumRuntimeApiError } from "./errors.ts";
import { createRuntimeTrace } from "../runtime-diagnostics/server.ts";
import type {
  StudentLearningAccessFailure,
} from "../practice/server.ts";

export function curriculumRuntimeHttpStatus(code: CurriculumRuntimeErrorCode) {
  if (code === "AUTH_REQUIRED") return 401;
  if (code === "ACCESS_DENIED") return 403;
  if (
    code === "UNIT_UNAVAILABLE" ||
    code === "RELEASE_UNAVAILABLE" ||
    code === "PRACTICE_UNAVAILABLE"
  ) {
    return 404;
  }
  if (
    code === "REVISION_CONFLICT" ||
    code === "DUPLICATE_SUBMISSION" ||
    code === "IDEMPOTENCY_CONFLICT"
  ) {
    return 409;
  }
  if (
    code === "RUNTIME_DISABLED" ||
    code === "GENERATOR_V2_RUNTIME_DISABLED"
  ) return 503;
  if (
    code === "GENERATOR_V2_LOOPBACK_REQUIRED" ||
    code === "GENERATOR_V2_RELEASE_DISABLED" ||
    code === "GENERATOR_V2_SCHEMA_INCOMPATIBLE" ||
    code === "GENERATOR_V2_SIGNING_KEY_UNAVAILABLE" ||
    code === "GENERATOR_V2_CORRECTNESS_REVIEW_REQUIRED"
  ) {
    return 503;
  }
  if (code === "GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED") return 404;
  if (code === "GENERATOR_V2_GENERATION_FAILED") return 502;
  if (code === "REQUEST_TIMEOUT") return 504;
  if (code === "REQUEST_FAILED") return 502;
  return 400;
}

export function curriculumAccessErrorCode(
  reason: StudentLearningAccessFailure,
): CurriculumRuntimeErrorCode {
  if (reason === "UNAUTHENTICATED") return "AUTH_REQUIRED";
  if (reason === "DATA_UNAVAILABLE") return "REQUEST_FAILED";
  return "ACCESS_DENIED";
}

export function createCurriculumApiResponder(request: Request) {
  const trace = createRuntimeTrace(request);

  function json(
    value: unknown,
    httpStatus: number,
    serverErrorCode: string,
    upstreamCode?: string,
  ) {
    return NextResponse.json(value, {
      status: httpStatus,
      headers: trace.finish(httpStatus, serverErrorCode, upstreamCode),
    });
  }

  return {
    trace,
    error(
      code: CurriculumRuntimeErrorCode,
      options: Readonly<{
        httpStatus?: number;
        serverErrorCode?: string;
        upstreamCode?: string;
      }> = {},
    ) {
      return json(
        curriculumRuntimeApiError(code, trace.correlationId),
        options.httpStatus ?? curriculumRuntimeHttpStatus(code),
        options.serverErrorCode ?? code,
        options.upstreamCode,
      );
    },
    success(value: unknown) {
      return json(value, 200, "OK");
    },
  };
}
