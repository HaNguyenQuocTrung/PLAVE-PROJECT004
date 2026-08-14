import { Button } from "@/components/Button";
import {
  curriculumMasteryLabelText,
  type CurriculumProgressEvidence,
  type StudentCurriculumProgress,
} from "@/lib/curriculum-runtime/contracts";
import {
  getLessonPath,
  getSkillLabel,
} from "@/lib/practice/catalog";
import { skillCodes } from "@/lib/practice/contracts";
import { MotivationOverview } from "./MotivationOverview";

type StudentCurriculumProgressViewProps = {
  progress: StudentCurriculumProgress;
};

const localizedLegacySkillTitles = new Map(
  skillCodes.map((skillCode) => [
    skillCode.replaceAll("_", " ").toLocaleLowerCase("vi"),
    getSkillLabel(skillCode),
  ]),
);

function studentFacingEvidenceTitle(item: CurriculumProgressEvidence) {
  if (item.evidenceBasis !== "LEGACY_QUESTION_SKILL") return item.title;
  return (
    localizedLegacySkillTitles.get(item.title.toLocaleLowerCase("vi")) ??
    "Kỹ năng Toán học"
  );
}

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
          {items.map((item, index) => (
            <article
              className="progress-evidence-card"
              key={`${item.evidenceBasis}-${item.title}-${index}`}
            >
              <span className="unit-status">
                {curriculumMasteryLabelText[item.masteryLabel]}
              </span>
              <h3>{studentFacingEvidenceTitle(item)}</h3>
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
    <div className="content-page page-shell learning-progress-page progress-page--v2">
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

      <section
        className="student-summary"
        aria-labelledby="completion-title"
        data-completed-count={completed}
        data-total-count={progress.units.length}
      >
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

      {progress.scoring ? (
        <section className="scoring-overview" aria-labelledby="scoring-overview-title">
          <div className="section-heading section-heading--compact">
            <p className="eyebrow">Kết quả và tiến bộ</p>
            <h2 id="scoring-overview-title">Điểm, XP và mức thành thạo</h2>
            <p>
              Điểm cho biết kết quả của từng lượt học. XP ghi nhận những câu
              em làm đúng. Mức thành thạo dựa trên 10 bằng chứng gần nhất của
              từng mục tiêu.
            </p>
          </div>
          <div className="scoring-result">
            <div>
              <span>Tổng XP</span>
              <strong aria-label={`${progress.scoring.totalXp} điểm kinh nghiệm`}>
                {progress.scoring.totalXp} XP
              </strong>
            </div>
            <div>
              <span>Mục tiêu đã thành thạo</span>
              <strong>{progress.scoring.masterySummary.mastered}</strong>
            </div>
            <div>
              <span>Nên ôn lại</span>
              <strong>{progress.scoring.masterySummary.needsReview}</strong>
            </div>
          </div>
          {progress.scoring.masterySummary.needsReview > 0 ? (
            <p className="mastery-review-note">
              Một vài kỹ năng cần được nhắc lại. Mỗi lần luyện là một cơ hội
              để em hiểu chắc hơn, không phải là hình phạt.
            </p>
          ) : null}
        </section>
      ) : null}
      {progress.motivation ? <MotivationOverview motivation={progress.motivation} /> : null}

      <section className="lesson-section" aria-labelledby="unit-progress-title">
        <h2 id="unit-progress-title">Tiến trình theo chủ đề</h2>
        <div className="unit-catalog__grid">
          {progress.units.map((unit, index) => (
            <article
              className="unit-card"
              key={`${unit.source}-${unit.unitId}-${index}`}
            >
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
