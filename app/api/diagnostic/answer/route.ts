import { NextResponse } from "next/server";

import {
  isUuid,
} from "@/lib/practice/contracts";
import {
  parseDiagnosticSubmitRpcResult,
  type DiagnosticApiSuccess,
  type DiagnosticSubmitResult,
} from "@/lib/diagnostic/contracts";
import {
  diagnosticApiError,
  isSameOriginRequest,
  mapDiagnosticRpcError,
} from "@/lib/diagnostic/errors";
import { getStudentLearningContext } from "@/lib/practice/server";

const noStoreHeaders = { "Cache-Control": "no-store" };

type AnswerInput = {
  attemptId: string;
  questionId: string;
  answer: string;
};

function parseAnswerInput(value: unknown): AnswerInput | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("attemptId" in value) ||
    !("questionId" in value) ||
    !("answer" in value) ||
    !isUuid(value.attemptId) ||
    typeof value.questionId !== "string" ||
    value.questionId.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.questionId) ||
    typeof value.answer !== "string" ||
    value.answer.length < 1 ||
    value.answer.length > 20
  ) {
    return null;
  }
  return {
    attemptId: value.attemptId,
    questionId: value.questionId,
    answer: value.answer,
  };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(diagnosticApiError("INVALID_REQUEST"), {
      status: 403,
      headers: noStoreHeaders,
    });
  }

  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return NextResponse.json(diagnosticApiError("INVALID_REQUEST"), {
      status: 400,
      headers: noStoreHeaders,
    });
  }
  const input = parseAnswerInput(rawInput);
  if (!input) {
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
    "submit_grade1_diagnostic_answer",
    {
      p_attempt_id: input.attemptId,
      p_question_id: input.questionId,
      p_answer: input.answer,
    },
  );
  if (error) {
    return NextResponse.json(mapDiagnosticRpcError(error), {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = parseDiagnosticSubmitRpcResult(data);
  if (!result) {
    return NextResponse.json(diagnosticApiError("REQUEST_FAILED"), {
      status: 502,
      headers: noStoreHeaders,
    });
  }
  const response: DiagnosticApiSuccess<DiagnosticSubmitResult> = {
    ok: true,
    data: result,
  };
  return NextResponse.json(response, { headers: noStoreHeaders });
}
