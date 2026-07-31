import { Button } from "@/components/Button";
import {
  curriculumMasteryLabelText,
  type CurriculumProgressEvidence,
  type StudentCurriculumProgress,
} from "@/lib/curriculum-runtime/contracts";
import { getLessonPath } from "@/lib/practice/catalog";

type StudentCurriculumProgressViewProps = {
  progress: StudentCurriculumProgress;
};

function EvidenceList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: readonly CurriculumProgressEvidence[];
}) {
  return (
    <section className="lesson-section" aria-labelledby={`${title}-title`}>
      <div className="section-heading section-heading--compact">
        <p className="eyebrow">Bằng chứng học tập</p>
        <h2 id={`${title}-title`}>{title}</h2>
        <p>{description}</p>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <h3>Chưa có đủ câu trả lời</h3>
          <p>Hãy hoàn thành một vài câu để xem phần này.</p>
        </div>
      ) : (
        <div className="progress-evidence-grid">
          {items.map((item) => (
            <article
              className="progress-evidence-card"
              key={`${item.evidenceBasis}-${item.title}`}
            >
              <span className="unit-status">
                {curriculumMasteryLabelText[item.masteryLabel]}
              </span>
              <h3>{item.title}</h3>
              <p>
                {item.correctCount}/{item.evidenceCount} bằng chứng đúng
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function StudentCurriculumProgressView({
  progress,
}: StudentCurriculumProgressViewProps) {
  const completed = progress.units.filter(
    (unit) => unit.status === "COMPLETED",
  ).length;
  return (
    <div className="content-page page-shell learning-progress-page">
      <header className="catalog-hero">
        <p className="eyebrow">Tiến trình học tập</p>
        <h1>Toán lớp {progress.grade}</h1>
        <p>{progress.masteryExplanation}</p>
        <p>
          Các nhãn này là quy tắc sản phẩm minh bạch, không phải kết luận khoa
          học về “trình độ” của em.
        </p>
        <div className="catalog-hero__actions">
          <Button href="/lessons">Tiếp tục học</Button>
          <Button href="/learning-history" variant="secondary">
            Xem lịch sử
          </Button>
        </div>
      </header>

      <section className="student-summary" aria-labelledby="completion-title">
        <div>
          <p className="eyebrow">Chủ đề</p>
          <h2 id="completion-title">
            Đã hoàn thành {completed}/{progress.units.length}
          </h2>
          <p>
            “Thành thạo” cần ít nhất sáu bằng chứng, độ chính xác cao và ba
            kết quả gần nhất đều đúng.
          </p>
        </div>
      </section>

      <section className="lesson-section" aria-labelledby="unit-progress-title">
        <h2 id="unit-progress-title">Tiến trình theo chủ đề</h2>
        <div className="unit-catalog__grid">
          {progress.units.map((unit) => (
            <article className="unit-card" key={unit.unitId}>
              <span
                className={`unit-status ${
                  unit.status === "COMPLETED"
                    ? "unit-status--complete"
                    : unit.status === "IN_PROGRESS"
                      ? "unit-status--continue"
                      : ""
                }`}
              >
                {curriculumMasteryLabelText[unit.masteryLabel]}
              </span>
              <h3>{unit.title}</h3>
              <p>
                Đúng {unit.correctCount}/{unit.evidenceCount} câu đã ghi nhận
              </p>
              {unit.bestScorePercent !== null ? (
                <p>Điểm tốt nhất: {unit.bestScorePercent}%</p>
              ) : null}
              <Button href={getLessonPath(unit.unitId)} variant="secondary">
                {unit.status === "IN_PROGRESS" ? "Tiếp tục" : "Mở bài học"}
              </Button>
            </article>
          ))}
        </div>
      </section>

      <EvidenceList
        title="Mục tiêu học tập"
        description="Kết quả được nhóm theo mục tiêu chính thức nhưng chỉ hiển thị bằng lời dễ hiểu."
        items={progress.outcomes}
      />
      <EvidenceList
        title="Kỹ năng"
        description="Mỗi nhãn dựa trên số câu đã làm, số câu đúng và kết quả gần đây."
        items={progress.skills}
      />
    </div>
  );
}
