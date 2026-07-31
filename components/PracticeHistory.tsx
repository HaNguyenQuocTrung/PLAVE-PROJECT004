import { Button } from "@/components/Button";
import type { PracticeHistoryItem } from "@/lib/practice/history";
import { getPracticeReviewPath } from "@/lib/practice/review";

type PracticeHistoryProps = {
  history: PracticeHistoryItem[];
  unitTitles?: Record<string, string>;
};

function formatCompletedAt(value: string | null) {
  if (!value) return "Chưa hoàn thành";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function PracticeHistory({
  history,
  unitTitles = {},
}: PracticeHistoryProps) {
  const groupedHistory = history.reduce<
    Array<{ unitSlug: string; attempts: PracticeHistoryItem[] }>
  >((groups, attempt) => {
    const existing = groups.find(
      (group) => group.unitSlug === attempt.unitSlug,
    );
    if (existing) {
      existing.attempts.push(attempt);
    } else {
      groups.push({ unitSlug: attempt.unitSlug, attempts: [attempt] });
    }
    return groups;
  }, []);

  return (
    <section
      className="dashboard-section practice-history"
      aria-labelledby="practice-history-title"
    >
      <div className="section-heading section-heading--compact">
        <p className="eyebrow">Tiến trình được lưu riêng</p>
        <h2 id="practice-history-title">Lịch sử bài làm</h2>
        <p>
          Mỗi lượt làm được giữ nguyên. Em có thể tiếp tục lượt đang làm hoặc
          mở lại kết quả của một lượt đã hoàn thành.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state practice-history__empty">
          <h3>Em chưa có lượt làm nào</h3>
          <p>Học bài rồi bắt đầu lượt luyện tập đầu tiên nhé.</p>
          <Button href="/lessons">Xem bài học</Button>
        </div>
      ) : (
        <div className="practice-history__groups">
          {groupedHistory.map((group) => (
            <section
              className="practice-history__group"
              key={group.unitSlug}
              aria-labelledby={`history-${group.unitSlug}`}
            >
              <h3 id={`history-${group.unitSlug}`}>
                {unitTitles[group.unitSlug] ?? "Bài học Toán"}
              </h3>
              <ol className="practice-history__list">
                {group.attempts.map((attempt) => (
                  <li className="practice-history__item" key={attempt.id}>
                    <div>
                      <p className="practice-history__title">
                        Bài làm lần {attempt.attemptNumber}
                      </p>
                      <p className="practice-history__meta">
                        {attempt.status === "COMPLETED"
                          ? `Đã hoàn thành · ${formatCompletedAt(attempt.completedAt)}`
                          : "Đang làm"}
                      </p>
                    </div>
                    <div
                      className="practice-history__metrics"
                      aria-label={`Tiến độ bài làm lần ${attempt.attemptNumber}`}
                    >
                      <span>
                        <small>Tiến độ</small>
                        <strong>
                          {attempt.answeredCount}/{attempt.totalQuestions}
                        </strong>
                      </span>
                      <span>
                        <small>Số câu đúng</small>
                        <strong>
                          {attempt.correctCount}/{attempt.totalQuestions}
                        </strong>
                      </span>
                      <span>
                        <small>Tỷ lệ</small>
                        <strong>{attempt.percent}%</strong>
                      </span>
                    </div>
                    {attempt.status === "COMPLETED" ? (
                      <Button
                        href={getPracticeReviewPath(attempt.id)}
                        variant="secondary"
                      >
                        Xem kết quả
                      </Button>
                    ) : (
                      <Button href={`/practice/${attempt.id}`}>
                        Tiếp tục
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
