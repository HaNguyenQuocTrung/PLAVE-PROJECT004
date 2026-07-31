import { Button } from "@/components/Button";
import { StartPracticeButton } from "@/components/StartPracticeButton";
import {
  buildGradeOneCompletionSummary,
  getGradeOneCompletionStatusLabel,
} from "@/lib/grade-one-completion/contracts";
import type {
  PersonalizedLearningPath,
} from "@/lib/personalized-path/contracts";
import { getLessonPath } from "@/lib/practice/catalog";
import { getPracticeReviewPath } from "@/lib/practice/review";

type GradeOneCompletionSummaryProps = {
  path: PersonalizedLearningPath;
};

export function GradeOneCompletionSummary({
  path,
}: GradeOneCompletionSummaryProps) {
  const summary = buildGradeOneCompletionSummary(path);
  if (!summary) {
    return (
      <section className="empty-state" aria-labelledby="grade-one-data-title">
        <h2 id="grade-one-data-title">Chưa thể tải tổng kết Lớp 1</h2>
        <p>
          Dữ liệu lộ trình chưa đầy đủ. Các lượt học hiện có vẫn được giữ
          nguyên; em hãy thử tải lại trang.
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        className={`grade-one-completion-hero ${
          summary.isComplete ? "grade-one-completion-hero--complete" : ""
        }`}
        aria-labelledby="grade-one-completion-title"
      >
        <div>
          <p className="eyebrow">Tiến độ chương trình Lớp 1</p>
          <h1 id="grade-one-completion-title">
            {summary.isComplete
              ? "Đã hoàn thành chương trình Toán Lớp 1 hiện có trên PLAVE"
              : `${summary.completedUnitCount}/${summary.totalUnitCount} unit đã hoàn thành`}
          </h1>
          <p>
            {summary.isComplete
              ? "Mọi unit hiện có đều đã có ít nhất một lượt luyện tập hoàn thành. Em vẫn có thể đánh giá lại hoặc ôn từng bài."
              : "Mỗi unit được tính hoàn thành khi em hoàn tất đủ 24 câu ít nhất một lần. Lượt làm lại không xóa kết quả trước đó."}
          </p>
        </div>
        <strong
          className="grade-one-completion-hero__percent"
          aria-label={`${summary.completionPercent}% chương trình Lớp 1 hiện có đã hoàn thành`}
        >
          {summary.completionPercent}%
        </strong>
        <div
          className="grade-one-completion-hero__progress"
          role="progressbar"
          aria-label="Tiến độ hoàn thành chương trình Toán Lớp 1 hiện có"
          aria-valuemin={0}
          aria-valuemax={summary.totalUnitCount}
          aria-valuenow={summary.completedUnitCount}
        >
          <span style={{ width: `${summary.completionPercent}%` }} />
        </div>
      </section>

      <section
        className="grade-one-completion-units"
        aria-labelledby="grade-one-unit-list-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">13 unit hiện có</p>
          <h2 id="grade-one-unit-list-title">Từng bước trong lộ trình</h2>
        </div>
        <ol className="grade-one-completion-units__list">
          {path.units.map((item, index) => {
            const unitSummary = summary.units[index];
            const activeAttempt = item.activeAttempt;
            const completedAttempt = item.latestCompletedAttempt;
            const lessonHref = getLessonPath(item.unit.slug);

            return (
              <li
                className={`grade-one-completion-unit grade-one-completion-unit--${unitSummary.status.toLowerCase()}`}
                key={item.unit.slug}
              >
                <div className="grade-one-completion-unit__order">
                  <span aria-hidden="true">{index + 1}</span>
                  <span className="sr-only">Unit {index + 1}</span>
                </div>
                <div className="grade-one-completion-unit__content">
                  <div className="grade-one-completion-unit__heading">
                    <h3>{item.unit.title}</h3>
                    <span
                      className="grade-one-completion-unit__status"
                      aria-label={`Trạng thái: ${getGradeOneCompletionStatusLabel(
                        unitSummary.status,
                      )}`}
                    >
                      {getGradeOneCompletionStatusLabel(
                        unitSummary.status,
                      )}
                    </span>
                  </div>

                  {unitSummary.latestScorePercent === null ? (
                    <p>Điểm gần nhất: Chưa có kết quả hoàn thành.</p>
                  ) : (
                    <p>
                      Điểm gần nhất:{" "}
                      <strong>{unitSummary.latestScorePercent}%</strong>
                    </p>
                  )}

                  {unitSummary.isCompleted &&
                  unitSummary.hasInProgressAttempt ? (
                    <p className="grade-one-completion-unit__note">
                      Unit đã hoàn thành trước đó; em đang làm một lượt mới.
                    </p>
                  ) : unitSummary.status === "LOCKED" ? (
                    <p className="grade-one-completion-unit__note">
                      Hoàn thành bài{" "}
                      {unitSummary.prerequisiteTitle ?? "nền tảng"} để mở
                      luyện tập.
                    </p>
                  ) : null}

                  <div className="grade-one-completion-unit__actions">
                    {activeAttempt ? (
                      <>
                        <Button href={`/practice/${activeAttempt.id}`}>
                          Tiếp tục
                        </Button>
                        {completedAttempt ? (
                          <Button
                            href={getPracticeReviewPath(
                              completedAttempt.id,
                            )}
                            variant="secondary"
                          >
                            Xem kết quả
                          </Button>
                        ) : null}
                      </>
                    ) : completedAttempt ? (
                      <>
                        <Button
                          href={getPracticeReviewPath(
                            completedAttempt.id,
                          )}
                        >
                          Xem kết quả
                        </Button>
                        <StartPracticeButton
                          label="Làm lượt mới"
                          unitSlug={item.unit.slug}
                        />
                      </>
                    ) : unitSummary.status === "LOCKED" ? (
                      <>
                        <Button href={lessonHref}>Học lý thuyết</Button>
                        {item.unit.prerequisiteUnitSlug ? (
                          <Button
                            href={getLessonPath(
                              item.unit.prerequisiteUnitSlug,
                            )}
                            variant="secondary"
                          >
                            Về bài cần hoàn thành
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Button href={lessonHref} variant="secondary">
                          Học lý thuyết
                        </Button>
                        <StartPracticeButton
                          label="Bắt đầu"
                          unitSlug={item.unit.slug}
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
