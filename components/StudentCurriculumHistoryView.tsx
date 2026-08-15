import { Button } from "@/components/Button";
import { EmptyState } from "@/components/UiStates";
import type { StudentCurriculumHistory } from "@/lib/curriculum-runtime/contracts";
import { getVietnameseUnitLabel } from "@/lib/learning/presentation";

export function StudentCurriculumHistoryView({
  history,
  enrichmentAvailable,
  scoringTotalXp,
}: Readonly<{
  history: StudentCurriculumHistory;
  enrichmentAvailable: boolean;
  scoringTotalXp: number | null;
}>) {
  return (
    <div className="content-page page-shell learning-history-page history-page--v2">
      <header className="catalog-hero">
        <p className="eyebrow">Lịch sử học tập</p>
        <h1>Các lượt học Toán lớp {history.grade}</h1>
        <p>
          Mỗi lượt học được giữ riêng để em xem lại kết quả mà không ghi đè
          lịch sử cũ.
        </p>
        <div className="catalog-hero__actions">
          <Button href="/lessons">Chọn bài học</Button>
          <Button href="/learning-progress" variant="secondary">
            Xem tiến trình
          </Button>
        </div>
      </header>

      {!enrichmentAvailable ? (
        <section className="empty-state" role="status">
          <h2>Lịch sử cơ bản vẫn được giữ nguyên</h2>
          <p>
            Điểm, XP và mức thành thạo tạm thời chưa sẵn sàng. Các lượt học
            và tiến độ đã lưu vẫn được hiển thị bên dưới.
          </p>
        </section>
      ) : null}

      {scoringTotalXp !== null ? (
        <section className="scoring-result" aria-label="Tổng XP hiện tại">
          <div>
            <span>Tổng XP hiện tại</span>
            <strong>{scoringTotalXp} XP</strong>
          </div>
        </section>
      ) : null}

      {history.attempts.length === 0 ? (
        <EmptyState
          title="Em chưa có lượt học nào"
          description="Hãy chọn một bài trong chương trình để bắt đầu luyện tập."
          actionHref="/lessons"
          actionLabel="Mở chương trình học"
        />
      ) : (
        <section className="history-list" aria-labelledby="history-title">
          <h2 id="history-title">Lượt học gần đây</h2>
          <div className="progress-evidence-grid">
            {history.attempts.map((attempt) => {
              const destination =
                attempt.source === "LEGACY_GRADE1"
                  ? attempt.status === "COMPLETED"
                    ? `/review/${attempt.attemptId}`
                    : `/practice/${attempt.attemptId}`
                  : `/curriculum-practice/${attempt.attemptId}`;
              return (
                <article
                  className="progress-evidence-card"
                  data-attempt-status={attempt.status}
                  key={attempt.attemptId}
                >
                  <span className="unit-status">
                    {attempt.status === "COMPLETED"
                      ? "Đã hoàn thành"
                      : attempt.status === "IN_PROGRESS"
                        ? "Đang học"
                        : "Đã kết thúc"}
                  </span>
                  <h3>
                    {getVietnameseUnitLabel({
                      unitId: attempt.unitId,
                      label: attempt.unitTitle,
                    })}
                  </h3>
                  <p>
                    Đúng {attempt.correctCount}/{attempt.answeredCount} câu đã
                    làm · Tổng {attempt.totalQuestions} câu
                  </p>
                  {attempt.status === "COMPLETED" && attempt.scorePercent !== null ? (
                    <p className="history-score">
                      <strong>Điểm: {attempt.scorePercent}/100</strong>
                      {attempt.earnedWeight !== null &&
                      attempt.possibleWeight !== null
                        ? ` · ${attempt.earnedWeight}/${attempt.possibleWeight} điểm có trọng số`
                        : ""}
                      {attempt.xpEarned > 0 ? ` · +${attempt.xpEarned} XP` : ""}
                    </p>
                  ) : null}
                  {attempt.legacyScoring ? (
                    <p className="legacy-score-label">
                      Lượt luyện tập cố định Lớp 1 · không thuộc phạm vi nhận
                      XP V1 · XP lượt này: 0
                    </p>
                  ) : null}
                  <time dateTime={attempt.startedAt}>
                    Bắt đầu:{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(attempt.startedAt))}
                  </time>
                  <Button href={destination} variant="secondary">
                    {attempt.status === "IN_PROGRESS" ? "Tiếp tục" : "Xem kết quả"}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
