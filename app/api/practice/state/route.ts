import { NextResponse } from "next/server";

import {
  isUnitSlug,
  isUuid,
  parseAttemptRow,
  parsePracticeReviewRpcResult,
  type PracticeAnswerState,
  type PracticeApiSuccess,
  type StartPracticeResult,
  type StartPracticeState,
} from "@/lib/practice/contracts";
import {
  isSameOriginRequest,
  mapPracticeRpcError,
  practiceApiError,
} from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";
import { loadCanonicalStudentScoringSummary } from "@/lib/curriculum-runtime/xp-projection";
import { buildLegacyGradeOneXpCompletionProjection } from "@/lib/scoring/completion";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonNoStore(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: noStoreHeaders,
  });
}

function isQuestionCode(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonNoStore(practiceApiError("INVALID_REQUEST"), 403);
  }

  const access = await getStudentLearningContext();
  if (!access.ok) {
    const code =
      access.reason === "UNAUTHENTICATED"
        ? "AUTH_REQUIRED"
        : "ACCESS_DENIED";
    return jsonNoStore(
      practiceApiError(code),
      code === "AUTH_REQUIRED" ? 401 : 403,
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const mode = searchParams.get("mode");

  if (mode === "start") {
    const unitSlug = searchParams.get("unitSlug");
    if (!isUnitSlug(unitSlug)) {
      return jsonNoStore(practiceApiError("INVALID_REQUEST"), 400);
    }

    const { data: row, error } = await access.supabase
      .from("practice_attempts")
      .select(
        "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
      )
      .eq("student_id", access.user.id)
      .eq("unit_slug", unitSlug)
      .eq("status", "IN_PROGRESS")
      .maybeSingle();

    if (error) {
      return jsonNoStore(practiceApiError("REQUEST_FAILED"), 500);
    }

    const parsedAttempt = row ? parseAttemptRow(row) : null;
    if (row && (!parsedAttempt || parsedAttempt.status !== "IN_PROGRESS")) {
      return jsonNoStore(practiceApiError("REQUEST_FAILED"), 502);
    }

    const attempt: StartPracticeResult | null = parsedAttempt
      ? {
          id: parsedAttempt.id,
          unitSlug: parsedAttempt.unitSlug,
          status: parsedAttempt.status,
          questionOrder: parsedAttempt.questionOrder,
          totalQuestions: parsedAttempt.totalQuestions,
          answeredCount: parsedAttempt.answeredCount,
          correctCount: parsedAttempt.correctCount,
          startedAt: parsedAttempt.startedAt,
        }
      : null;
    const response: PracticeApiSuccess<StartPracticeState> = {
      ok: true,
      data: { attempt },
    };
    return jsonNoStore(response);
  }

  if (mode === "answer") {
    const attemptId = searchParams.get("attemptId");
    const questionId = searchParams.get("questionId");
    if (!isUuid(attemptId) || !isQuestionCode(questionId)) {
      return jsonNoStore(practiceApiError("INVALID_REQUEST"), 400);
    }

    const { data, error } = await access.supabase.rpc(
      "get_practice_review",
      { p_attempt_id: attemptId },
    );
    if (error) {
      return jsonNoStore(mapPracticeRpcError(error), 400);
    }

    const review = parsePracticeReviewRpcResult(data);
    if (!review) {
      return jsonNoStore(practiceApiError("REQUEST_FAILED"), 502);
    }

    const answer =
      review.answers.find((item) => item.questionId === questionId) ?? null;
    const scoring = review.status === "COMPLETED"
      ? await loadCanonicalStudentScoringSummary(() =>
          access.supabase.rpc("get_my_score_xp_mastery"),
        )
      : null;
    if (review.status === "COMPLETED" && !scoring) {
      return jsonNoStore(practiceApiError("REQUEST_FAILED"), 502);
    }
    const response: PracticeApiSuccess<PracticeAnswerState> = {
      ok: true,
      data: {
        answer,
        answeredCount: review.answeredCount,
        correctCount: review.correctCount,
        completed: review.status === "COMPLETED",
        xpCompletion: scoring
          ? buildLegacyGradeOneXpCompletionProjection(scoring)
          : null,
      },
    };
    return jsonNoStore(response);
  }

  return jsonNoStore(practiceApiError("INVALID_REQUEST"), 400);
}
