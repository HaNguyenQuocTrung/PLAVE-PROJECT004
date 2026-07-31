import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import {
  isUuid,
  parseAttemptRow,
  parseLearningUnit,
  parsePracticeQuestion,
  parsePracticeReviewRpcResult,
} from "@/lib/practice/contracts";
import { getPracticeReviewPath } from "@/lib/practice/review";
import { getStudentLearningContext } from "@/lib/practice/server";

import { PracticeRunner } from "./PracticeRunner";

export const metadata = {
  title: "Luyện tập",
};

type PracticePageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function PracticePage({ params }: PracticePageProps) {
  const { attemptId } = await params;
  if (!isUuid(attemptId)) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }

  const access = await getStudentLearningContext();
  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={access.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  const { data: attemptRow, error: attemptError } = await access.supabase
    .from("practice_attempts")
    .select(
      "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
    )
    .eq("id", attemptId)
    .eq("student_id", access.user.id)
    .maybeSingle();

  if (attemptError) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }

  const attempt = parseAttemptRow(attemptRow);
  if (!attempt) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }

  if (attempt.status === "COMPLETED") {
    redirect(getPracticeReviewPath(attempt.id));
  }

  const [
    { data: unitRow, error: unitError },
    { data: questionRows, error: questionError },
    { data: reviewData, error: reviewError },
  ] = await Promise.all([
    access.supabase
      .from("learning_units")
      .select(
        "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
      )
      .eq("slug", attempt.unitSlug)
      .maybeSingle(),
    access.supabase
      .from("questions")
      .select(
        "code, unit_slug, question_type, prompt, options, visual_spec, skill_code, difficulty, display_order",
      )
      .eq("unit_slug", attempt.unitSlug)
      .in("code", attempt.questionOrder),
    access.supabase.rpc("get_practice_review", {
      p_attempt_id: attempt.id,
    }),
  ]);

  if (
    unitError ||
    questionError ||
    reviewError ||
    !Array.isArray(questionRows) ||
    questionRows.length !== attempt.totalQuestions
  ) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }
  const unit = parseLearningUnit(unitRow);

  const questionsByCode = new Map(
    questionRows
      .map(parsePracticeQuestion)
      .filter((question) => question !== null)
      .map((question) => [question.code, question]),
  );
  const questions = attempt.questionOrder
    .map((code) => questionsByCode.get(code))
    .filter((question) => question !== undefined);
  const review = parsePracticeReviewRpcResult(reviewData);

  if (
    questions.length !== attempt.totalQuestions ||
    !unit ||
    !review ||
    review.attemptId !== attempt.id ||
    review.unitSlug !== attempt.unitSlug
  ) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }

  return (
    <div className="practice-page page-shell">
      <PracticeRunner
        attemptId={attempt.id}
        unitTitle={unit.title}
        questions={questions}
        initialAnswers={review.answers}
        initialAnsweredCount={review.answeredCount}
        initialCorrectCount={review.correctCount}
      />
    </div>
  );
}
