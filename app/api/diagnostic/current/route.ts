import { NextResponse } from "next/server";

import {
  parseDiagnosticAttemptSummary,
  type DiagnosticApiSuccess,
  type DiagnosticAttemptSummary,
} from "@/lib/diagnostic/contracts";
import {
  diagnosticApiError,
  isSameOriginRequest,
} from "@/lib/diagnostic/errors";
import { getStudentLearningContext } from "@/lib/practice/server";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
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

  const { data, error } = await access.supabase
    .from("diagnostic_attempts")
    .select(
      "id, status, answered_count, correct_count, recommendation_unit_slug, recommendation_reason_code, recommendation_explanation, started_at, completed_at",
    )
    .eq("student_id", access.user.id)
    .eq("status", "IN_PROGRESS")
    .maybeSingle();
  if (error) {
    return NextResponse.json(diagnosticApiError("REQUEST_FAILED"), {
      status: 500,
      headers: noStoreHeaders,
    });
  }

  const attempt = data ? parseDiagnosticAttemptSummary(data) : null;
  if (data && !attempt) {
    return NextResponse.json(diagnosticApiError("REQUEST_FAILED"), {
      status: 502,
      headers: noStoreHeaders,
    });
  }

  const response: DiagnosticApiSuccess<{
    attempt: DiagnosticAttemptSummary | null;
  }> = {
    ok: true,
    data: { attempt },
  };
  return NextResponse.json(response, { headers: noStoreHeaders });
}
