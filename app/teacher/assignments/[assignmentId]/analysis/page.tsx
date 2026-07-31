import { notFound, redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { isAssignmentUuid } from "@/lib/assignments/contracts";
import {
  getQuestionsNeedingReview,
  type GradebookQuestionType,
  type QuestionInsightStatus,
} from "@/lib/gradebook/contracts";
import {
  loadTeacherAssignmentAnalysis,
  loadTeacherAssignmentCurriculumEvidence,
} from "@/lib/gradebook/server";
import { getTeacherAccount } from "@/lib/teacher/server";

export const metadata = { title: "Phân tích bài tập" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ assignmentId: string }>;
};

const questionTypeLabels: Record<GradebookQuestionType, string> = {
  MULTIPLE_CHOICE: "Trắc nghiệm",
  NUMBER_INPUT: "Nhập số",
  TEXT_INPUT: "Nhập câu trả lời",
};

const insightLabels: Record<QuestionInsightStatus, string> = {
  INSUFFICIENT_DATA: "Chưa đủ dữ liệu",
  NEEDS_REVIEW: "Cần ôn lại",
  ON_TRACK: "Đang duy trì tốt",
};

function formatPercent(value: number | null, fallback: string) {
  return value === null ? fallback : `${value}%`;
}

export default async function TeacherAssignmentAnalysisPage({
  params,
}: Props) {
  const { assignmentId } = await params;
  if (!isAssignmentUuid(assignmentId)) notFound();

  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") {
      redirect("/teacher/onboarding");
    }
    if (account.reason === "ACCESS_DENIED") return <AccessDenied />;
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải phân tích bài tập</h1>
        <p>Vui lòng thử tải lại sau.</p>
        <Button href={`/teacher/assignments/${assignmentId}/analysis`}>
          Thử tải lại
        </Button>
      </section>
    );
  }

  const [result, curriculumEvidence] = await Promise.all([
    loadTeacherAssignmentAnalysis(account.supabase, assignmentId),
    loadTeacherAssignmentCurriculumEvidence(
      account.supabase,
      assignmentId,
    ),
  ]);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể tải phân tích bài tập</h1>
        <p>{result.message}</p>
        <div className="page-actions">
          <Button href={`/teacher/assignments/${assignmentId}/analysis`}>
            Thử tải lại
          </Button>
          <Button
            href={`/teacher/assignments/${assignmentId}`}
            variant="secondary"
          >
            Về tình hình bài tập
          </Button>
        </div>
      </section>
    );
  }

  const { analysis } = result;
  const questionsNeedingReview = getQuestionsNeedingReview(analysis);
  const hasEnoughData =
    analysis.submittedCount >= analysis.minimumSubmissionsForInsight;

  return (
    <div className="teacher-assignment-analysis-page page-shell">
      <header className="catalog-hero teacher-hero">
        <div>
          <p className="eyebrow">
            {analysis.assignment.classroomName} · Lớp{" "}
            {analysis.assignment.grade}
          </p>
          <h1>Phân tích {analysis.assignment.assignmentTitle}</h1>
          <p>
            Số liệu chỉ tính bài đã nộp của học sinh đang tham gia lớp.
          </p>
        </div>
        <Button
          href={`/teacher/assignments/${assignmentId}`}
          variant="secondary"
        >
          Về tình hình bài tập
        </Button>
      </header>

      <section
        className="assignment-analysis-summary"
        aria-label="Tóm tắt tình hình bài tập"
      >
        <article>
          <span>Học sinh đang tham gia</span>
          <strong>{analysis.studentCount}</strong>
        </article>
        <article>
          <span>Chưa bắt đầu</span>
          <strong>{analysis.notStartedCount}</strong>
        </article>
        <article>
          <span>Đang làm</span>
          <strong>{analysis.inProgressCount}</strong>
        </article>
        <article>
          <span>Đã nộp</span>
          <strong>{analysis.submittedCount}</strong>
        </article>
        <article>
          <span>Điểm trung bình</span>
          <strong>
            {formatPercent(
              analysis.averageScorePercent,
              "Chưa có điểm",
            )}
          </strong>
        </article>
        <article>
          <span>Tỷ lệ hoàn thành</span>
          <strong>
            {formatPercent(
              analysis.completionRate,
              "Chưa có học sinh",
            )}
          </strong>
        </article>
      </section>

      <section
        className="assignment-analysis-insights"
        aria-labelledby="review-insights-title"
      >
        <div>
          <p className="eyebrow">Gợi ý ôn tập theo quy tắc</p>
          <h2 id="review-insights-title">
            Những nội dung lớp cần ôn lại
          </h2>
        </div>

        {!hasEnoughData ? (
          <div className="empty-state">
            <h3>Chưa đủ dữ liệu</h3>
            <p>
              Cần ít nhất {analysis.minimumSubmissionsForInsight} bài đã nộp
              để đánh dấu câu cần ôn lại. PLAVE không đưa ra kết luận khi dữ
              liệu còn ít.
            </p>
          </div>
        ) : questionsNeedingReview.length ? (
          <>
            <p>
              Các câu dưới đây có tỷ lệ đúng thấp hơn{" "}
              {analysis.reviewAccuracyThreshold}% và được sắp theo số lượt
              trả lời sai.
            </p>
            <ol className="assignment-review-insight-list">
              {questionsNeedingReview.map((question) => (
                <li key={question.displayOrder}>
                  <strong>Câu {question.displayOrder}</strong>
                  <span>{question.prompt}</span>
                  <small>
                    {question.incorrectCount} lượt sai ·{" "}
                    {formatPercent(
                      question.accuracyPercent,
                      "Chưa có dữ liệu",
                    )}{" "}
                    trả lời đúng
                  </small>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="empty-state">
            <h3>Chưa có câu nào cần đánh dấu ôn lại</h3>
            <p>
              Các câu đã có dữ liệu đều đạt từ{" "}
              {analysis.reviewAccuracyThreshold}% trả lời đúng.
            </p>
          </div>
        )}
      </section>

      {curriculumEvidence &&
      (curriculumEvidence.outcomes.length ||
        curriculumEvidence.skills.length) ? (
        <section
          className="assignment-analysis-insights"
          aria-labelledby="assignment-curriculum-evidence-title"
        >
          <div>
            <p className="eyebrow">Evidence từ bài giáo viên giao</p>
            <h2 id="assignment-curriculum-evidence-title">
              Theo mục tiêu và kỹ năng
            </h2>
          </div>
          <p className="assignment-analysis-note">
            Đây là thống kê đúng/sai từ assignment, không phải chẩn đoán mức
            độ học tập và không cộng vào luyện tập độc lập.
          </p>
          <div className="parent-universal-columns">
            <div>
              <h3>Mục tiêu chương trình</h3>
              <ul className="parent-universal-evidence">
                {curriculumEvidence.outcomes.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.correctCount}/{item.evidenceCount} đúng ·{" "}
                      {formatPercent(item.accuracyPercent, "Chưa có dữ liệu")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Kỹ năng</h3>
              <ul className="parent-universal-evidence">
                {curriculumEvidence.skills.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.correctCount}/{item.evidenceCount} đúng ·{" "}
                      {formatPercent(item.accuracyPercent, "Chưa có dữ liệu")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="assignment-question-analysis"
        aria-labelledby="question-analysis-title"
      >
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Theo từng câu hỏi</p>
            <h2 id="question-analysis-title">Tỷ lệ trả lời đúng</h2>
          </div>
          <span>{analysis.questions.length}</span>
        </div>
        <p className="assignment-analysis-note">
          Câu hỏi hiện chưa có trường nhóm kỹ năng riêng. Vì vậy, phân tích
          chỉ đánh dấu chính xác từng nội dung câu hỏi, không suy diễn nhóm
          kiến thức.
        </p>

        {analysis.submittedCount === 0 ? (
          <div className="empty-state">
            <h3>Chưa có bài đã nộp</h3>
            <p>
              Thống kê đúng/sai sẽ xuất hiện khi có học sinh nộp bài.
            </p>
          </div>
        ) : (
          <div className="assignment-question-analysis-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Câu</th>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Loại</th>
                  <th scope="col">Đã trả lời</th>
                  <th scope="col">Đúng</th>
                  <th scope="col">Sai</th>
                  <th scope="col">Tỷ lệ đúng</th>
                  <th scope="col">Nhận định</th>
                </tr>
              </thead>
              <tbody>
                {analysis.questions.map((question) => (
                  <tr key={question.displayOrder}>
                    <th scope="row">{question.displayOrder}</th>
                    <td>{question.prompt}</td>
                    <td>{questionTypeLabels[question.questionType]}</td>
                    <td>{question.answeredCount}</td>
                    <td>{question.correctCount}</td>
                    <td>{question.incorrectCount}</td>
                    <td>
                      {formatPercent(
                        question.accuracyPercent,
                        "Chưa có dữ liệu",
                      )}
                    </td>
                    <td>
                      <span
                        className={`question-insight question-insight--${question.insightStatus.toLowerCase()}`}
                      >
                        {insightLabels[question.insightStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
