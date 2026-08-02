import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { LearningAccessState } from "@/components/LearningAccessState";
import { isAssignmentUuid } from "@/lib/assignments/contracts";
import { formatVietnamDateTime } from "@/lib/assignments/deadline";
import { loadAssignmentReview } from "@/lib/assignments/server";
import { getStudentLearningContext } from "@/lib/practice/server";
import { CurriculumVisual } from "@/app/curriculum-preview/CurriculumVisual";
import type { PreviewVisualSpec } from "@/lib/curriculum/types";

export const metadata = { title: "Kết quả bài giáo viên giao" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ assignmentId: string }>;
};

export default async function AssignmentReviewPage({ params }: Props) {
  const { assignmentId } = await params;
  if (!isAssignmentUuid(assignmentId)) {
    return (
      <section className="content-page page-shell">
        <h1>Đường dẫn kết quả chưa hợp lệ</h1>
        <Button href="/assignments">Về danh sách bài tập</Button>
      </section>
    );
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

  const result = await loadAssignmentReview(
    access.supabase,
    assignmentId,
  );
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải kết quả</h1>
        <p>{result.message}</p>
        <Button href="/assignments">Về danh sách bài tập</Button>
      </section>
    );
  }

  const { review } = result;
  return (
    <div className="assignment-review-page result-page--v2 page-shell">
      <header className="catalog-hero catalog-hero--results">
        <p className="eyebrow">{review.assignment.classroomName}</p>
        <h1>{review.assignment.title}</h1>
        <p>
          Giáo viên {review.assignment.teacherDisplayName} · Đã nộp{" "}
          {formatVietnamDateTime(review.submittedAt)}
        </p>
      </header>

      <section
        className="assignment-score-card"
        aria-labelledby="assignment-score-title"
      >
        <div>
          <p className="eyebrow">Kết quả</p>
          <h2 id="assignment-score-title">
            {review.correctCount}/{review.totalCount} câu đúng
          </h2>
          <p>Tỷ lệ chính xác {review.scorePercent}%.</p>
        </div>
        <Button href="/assignments">Về danh sách bài tập</Button>
      </section>

      <section aria-labelledby="assignment-solutions-title">
        <div className="section-heading">
          <p className="eyebrow">Xem lại sau khi nộp</p>
          <h2 id="assignment-solutions-title">Đáp án và lời giải</h2>
        </div>
        <ol className="assignment-review-list">
          {review.answers.map((answer) => (
            <li key={answer.displayOrder}>
              <article>
                <span>
                  {answer.isCorrect ? "✓ Chính xác" : "✕ Chưa chính xác"}
                </span>
                <h3>
                  Câu {answer.displayOrder}: {answer.prompt}
                </h3>
                {answer.visual ? (
                  <div className="assignment-question-visual">
                    <CurriculumVisual
                      spec={answer.visual as PreviewVisualSpec}
                    />
                  </div>
                ) : null}
                <p>Câu trả lời của em: {answer.studentAnswer}</p>
                <p>Đáp án đúng: {answer.correctAnswer}</p>
                <details>
                  <summary>Xem lời giải chi tiết</summary>
                  <ol>
                    {answer.solutionSteps.map((step, index) => (
                      <li key={`${answer.displayOrder}-${index}`}>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p>{answer.explanation}</p>
                </details>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
