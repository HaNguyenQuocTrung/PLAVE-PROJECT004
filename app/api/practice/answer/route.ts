import { NextResponse } from "next/server";

import {
  isUuid,
  parseSubmitPracticeRpcResult,
  type PracticeApiSuccess,
  type SubmitPracticeResult,
} from "@/lib/practice/contracts";
import {
  isSameOriginRequest,
  mapPracticeRpcError,
  practiceApiError,
} from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";
import { revalidateStudentLearningProjections } from "@/lib/curriculum-runtime/revalidation";

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
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.questionId) ||
    value.questionId.length > 80 ||
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
    return NextResponse.json(practiceApiError("INVALID_REQUEST"), {
      status: 403,
    });
  }

  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return NextResponse.json(practiceApiError("INVALID_REQUEST"), {
      status: 400,
    });
  }

  const input = parseAnswerInput(rawInput);
  if (!input) {
    return NextResponse.json(practiceApiError("INVALID_REQUEST"), {
      status: 400,
    });
  }

  const access = await getStudentLearningContext();
  if (!access.ok) {
    const code =
      access.reason === "UNAUTHENTICATED"
        ? "AUTH_REQUIRED"
        : "ACCESS_DENIED";
    return NextResponse.json(practiceApiError(code), {
      status: code === "AUTH_REQUIRED" ? 401 : 403,
    });
  }

  const { data, error } = await access.supabase.rpc(
    "submit_practice_answer",
    {
      p_attempt_id: input.attemptId,
      p_question_id: input.questionId,
      p_answer: input.answer,
    },
  );

  if (error) {
    return NextResponse.json(mapPracticeRpcError(error), { status: 400 });
  }

  const result = parseSubmitPracticeRpcResult(data);
  if (!result) {
    return NextResponse.json(practiceApiError("REQUEST_FAILED"), {
      status: 502,
    });
  }

  revalidateStudentLearningProjections();

  const response: PracticeApiSuccess<SubmitPracticeResult> = {
    ok: true,
    data: result,
  };
  return NextResponse.json(response);
}
