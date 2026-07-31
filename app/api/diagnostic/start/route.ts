import { NextResponse } from "next/server";

import {
  parseDiagnosticStartRpcResult,
  type DiagnosticApiSuccess,
  type DiagnosticStartResult,
} from "@/lib/diagnostic/contracts";
import {
  diagnosticApiError,
  isSameOriginRequest,
  mapDiagnosticRpcError,
} from "@/lib/diagnostic/errors";
import { getStudentLearningContext } from "@/lib/practice/server";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(diagnosticApiError("INVALID_REQUEST"), {
      status: 403,
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
    "start_or_resume_grade1_diagnostic",
  );
  if (error) {
    return NextResponse.json(mapDiagnosticRpcError(error), {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = parseDiagnosticStartRpcResult(data);
  if (!result) {
    return NextResponse.json(diagnosticApiError("REQUEST_FAILED"), {
      status: 502,
      headers: noStoreHeaders,
    });
  }

  const response: DiagnosticApiSuccess<DiagnosticStartResult> = {
    ok: true,
    data: result,
  };
  return NextResponse.json(response, { headers: noStoreHeaders });
}
