import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { LearningAccessState } from "@/components/LearningAccessState";
import { PracticeVisual } from "@/components/PracticeVisual";
import { ReviewErrorState } from "@/components/ReviewErrorState";
import { StartPracticeButton } from "@/components/StartPracticeButton";
import { getLessonPath } from "@/lib/practice/catalog";
import {
  isUuid,
  parseAttemptRows,
  parseLearningUnit,
  parsePracticeReviewRpcResult,
  type PracticeReviewAnswer,
  type QuestionOptions,
} from "@/lib/practice/contracts";
import { mapPracticeRpcError } from "@/lib/practice/errors";
import {
  buildPracticeHistory,
  getAttemptNumber,
} from "@/lib/practice/history";
import {
  buildPracticeReviewViewModel,
  classifyReviewLoad,
  getPracticeReviewPath,
  resolveReviewAttemptId,
} from "@/lib/practice/review";
import { getStudentLearningContext } from "@/lib/practice/server";
import { parseStudentScoringSummary } from "@/lib/curriculum-runtime/contracts";
import {
  buildAttemptXpCompletionProjection,
  xpCompletionReasonText,
} from "@/lib/scoring/completion";

export const metadata = {
  title: "Kết quả bài làm",
};

type ReviewPageProps = {
  params: Promise<{ attemptId: string }>;
};

function isOptionKey(value: string): value is keyof QuestionOptions {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function formatAnswer(answer: PracticeReviewAnswer, value: string) {
  if (
    answer.questionType === "MULTIPLE_CHOICE" &&
    answer.options &&
    isOptionKey(value)
  ) {
    return `${value} — ${answer.options[value]}`;
  }
  return value;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const attemptId = await resolveReviewAttemptId(params);
  if (!isUuid(attemptId)) {
    notFound();
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

  const { data, error } = await access.supabase.rpc(
    "get_practice_review",
    { p_attempt_id: attemptId },
  );

  const safeErrorCode = error ? mapPracticeRpcError(error).error.code : null;
  const review = error ? null : parsePracticeReviewRpcResult(data);
  const disposition = classifyReviewLoad(review, safeErrorCode);
  if (disposition === "NOT_FOUND") {
    notFound();
  }
  if (disposition === "SAFE_ERROR" || !review) {
    return (
      <ReviewErrorState retryHref={getPracticeReviewPath(attemptId)} />
    );
  }

  const [
    { data: unitRow, error: unitError },
    { data: attemptRows, error: attemptHistoryError },
    { data: scoringData, error: scoringError },
  ] = await Promise.all([
    access.supabase
      .from("learning_units")
      .select(
        "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
      )
      .eq("slug", review.unitSlug)
      .maybeSingle(),
    access.supabase
      .from("practice_attempts")
      .select(
        "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
      )
      .eq("student_id", access.user.id)
      .eq("unit_slug", review.unitSlug)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true }),
    access.supabase.rpc("get_my_score_xp_mastery"),
  ]);
  const unit = unitError ? null : parseLearningUnit(unitRow);
  if (!unit) {
    return <ReviewErrorState retryHref={getPracticeReviewPath(attemptId)} />;
  }

  const { percent, skillResults, strengths, reviewSkills } =
    buildPracticeReviewViewModel(review);
  const parsedAttempts = attemptHistoryError
    ? null
    : parseAttemptRows(attemptRows);
  const attemptNumber = parsedAttempts
    ? getAttemptNumber(buildPracticeHistory(parsedAttempts), review.attemptId)
    : null;
  const scoring = scoringError
    ? null
    : parseStudentScoringSummary(scoringData);
  if (review.status === "COMPLETED" && !scoring) {
    return <ReviewErrorState retryHref={getPracticeReviewPath(attemptId)} />;
  }
  const scoringAttempt = scoring?.attempts.find(
    (attempt) => attempt.attemptId === attemptId,
  ) ?? null;
  if (review.status === "COMPLETED" && !scoringAttempt) {
    return <ReviewErrorState retryHref={getPracticeReviewPath(attemptId)} />;
  }
  const xpCompletion = review.status === "COMPLETED" && scoring && scoringAttempt
    ? buildAttemptXpCompletionProjection({
        policyVersion: scoringAttempt.policyVersion,
        legacy: scoringAttempt.legacy,
        attemptXpEarned: scoringAttempt.xpEarned,
      }, scoring.totalXp)
    : null;

  return (
    <div className="review-page review-page--v2 page-shell">
      <header className="review-summary">
        <div>
          <p className="eyebrow">
            {unit.title} ·{" "}
            {attemptNumber ? `Bài làm lần ${attemptNumber} · ` : ""}
            {review.status === "COMPLETED"
              ? "Đã hoàn thành"
              : "Đang tiếp tục"}
          </p>
          <h1>
            Em đã hoàn thành {unit.title}
          </h1>
          <p className="review-summary__score">{percent}%</p>
          <p>
            {review.status === "COMPLETED"
              ? `Em trả lời đúng ${review.correctCount}/${review.totalQuestions} câu. Kết quả đã được lưu vào lịch sử.`
              : `Em đã trả lời ${review.answeredCount}/${review.totalQuestions} câu.`}
          </p>
          {xpCompletion ? (
            <div className="scoring-result" aria-label="Kết quả XP của lượt học">
              <div>
                <span>XP lượt này</span>
                <strong>{xpCompletion.attemptXpEarned} XP</strong>
              </div>
              <div>
                <span>Tổng XP hiện tại</span>
                <strong>{xpCompletion.totalXpAfter} XP</strong>
              </div>
              <p data-xp-completion-reason={xpCompletion.reason}>
                {xpCompletionReasonText(xpCompletion.reason)}
              </p>
            </div>
          ) : null}
        </div>
        {review.status === "IN_PROGRESS" ? (
          <Button href={`/practice/${review.attemptId}`}>
            Tiếp tục làm bài
          </Button>
        ) : null}
      </header>

      <section className="skill-summary" aria-labelledby="skills-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Theo các nhóm kỹ năng</p>
          <h2 id="skills-title">Em đang tiến bộ thế nào?</h2>
          <p>
            Kết quả dưới đây chỉ dựa trên các câu em vừa làm. Em có thể xem lại
            lời giải và luyện thêm bất cứ lúc nào.
          </p>
        </div>
        <div className="skill-result-grid">
          {skillResults.map((result) => (
            <article className="skill-result-card" key={result.skillCode}>
              <h3>{result.label}</h3>
              <p>
                <strong>
                  {result.correct}/{result.total}
                </strong>{" "}
                câu đúng
              </p>
            </article>
          ))}
        </div>
        <div className="review-guidance-grid">
          <article>
            <h3>Em đang làm tốt</h3>
            {strengths.length > 0 ? (
              <ul>
                {strengths.map((result) => (
                  <li key={result.skillCode}>{result.label}</li>
                ))}
              </ul>
            ) : (
              <p>Hãy luyện thêm để từng kỹ năng vững hơn nhé.</p>
            )}
          </article>
          <article>
            <h3>Phần nên ôn thêm</h3>
            {reviewSkills.length > 0 ? (
              <ul>
                {reviewSkills.map((result) => (
                  <li key={result.skillCode}>{result.label}</li>
                ))}
              </ul>
            ) : (
              <p>Em đã đạt từ 75% ở tất cả nhóm kỹ năng đã làm.</p>
            )}
          </article>
        </div>
      </section>

      <section className="review-list-section" aria-labelledby="review-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Lời giải đã mở khóa</p>
          <h2 id="review-title">Xem lại từng câu</h2>
          <p>
            Chỉ những câu em đã trả lời mới có đáp án và lời giải trong trang
            này.
          </p>
        </div>
        <ol className="review-answer-list">
          {review.answers.map((answer, index) => (
            <li className="review-answer-card" key={answer.questionId}>
              <div className="review-answer-card__heading">
                <p>Câu {index + 1}</p>
                <span
                  className={
                    answer.isCorrect
                      ? "answer-status answer-status--correct"
                      : "answer-status answer-status--incorrect"
                  }
                >
                  <span aria-hidden="true">
                    {answer.isCorrect ? "✓" : "✕"}
                  </span>{" "}
                  {answer.isCorrect ? "Đúng" : "Chưa đúng"}
                </span>
              </div>
              <h3>{answer.prompt}</h3>
              {answer.visualSpec ? (
                <PracticeVisual spec={answer.visualSpec} compact />
              ) : null}
              <dl className="answer-comparison">
                <div>
                  <dt>Câu trả lời của em</dt>
                  <dd>{formatAnswer(answer, answer.studentAnswer)}</dd>
                </div>
                <div>
                  <dt>Đáp án đúng</dt>
                  <dd>{formatAnswer(answer, answer.correctAnswer)}</dd>
                </div>
              </dl>
              <details className="solution-details">
                <summary>Xem lời giải chi tiết</summary>
                <div>
                  <ol>
                    {answer.solutionSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p>
                    <strong>Giải thích:</strong> {answer.explanation}
                  </p>
                  <p>
                    <strong>Gợi ý ôn tập:</strong> {answer.hint}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <div className="review-actions">
        <Button href="/lessons">Chọn bài tiếp theo</Button>
        <Button
          href={getLessonPath(unit.slug)}
          variant="secondary"
        >
          Xem lại lý thuyết
        </Button>
        {review.status === "COMPLETED" ? (
          <StartPracticeButton
            label="Làm lượt mới ngay"
            unitSlug={unit.slug}
          />
        ) : null}
      </div>
    </div>
  );
}
