import { NextResponse } from "next/server";

import {
  parseDiagnosticStateRpcResult,
  type DiagnosticApiSuccess,
  type DiagnosticState,
} from "@/lib/diagnostic/contracts";
import {
  diagnosticApiError,
  isSameOriginRequest,
  mapDiagnosticRpcError,
} from "@/lib/diagnostic/errors";
import { isUuid } from "@/lib/practice/contracts";
import { getStudentLearningContext } from "@/lib/practice/server";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(diagnosticApiError("INVALID_REQUEST"), {
      status: 403,
      headers: noStoreHeaders,
    });
  }
  const attemptId = new URL(request.url).searchParams.get("attemptId");
  if (!isUuid(attemptId)) {
    return NextResponse.json(diagnosticApiError("INVALID_REQUEST"), {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const access = await getStudentLearningContext();
  if (!access.ok) {
    const code =
      access.reason === "UNAUTHENTICATED"
        ? "AUTH_REQUIRED"
        : "ACCESS_DENIED";
    return NextResponse.json(diagnosticApiError(code), {
      status: code === "AUTH_REQUIRED" ? 401 : 403,
      headers: noStoreHeaders,
    });
  }
  if (access.grade !== 1) {
    return NextResponse.json(diagnosticApiError("ACCESS_DENIED"), {
      status: 403,
      headers: noStoreHeaders,
    });
  }

  const { data, error } = await access.supabase.rpc(
    "get_grade1_diagnostic_state",
    { p_attempt_id: attemptId },
  );
  if (error) {
    return NextResponse.json(mapDiagnosticRpcError(error), {
      status: 400,
      headers: noStoreHeaders,
    });
  }
  const state = parseDiagnosticStateRpcResult(data);
  if (!state) {
    return NextResponse.json(diagnosticApiError("REQUEST_FAILED"), {
      status: 502,
      headers: noStoreHeaders,
    });
  }
  const response: DiagnosticApiSuccess<DiagnosticState> = {
    ok: true,
    data: state,
  };
  return NextResponse.json(response, { headers: noStoreHeaders });
}
