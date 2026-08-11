import { Button } from "@/components/Button";
import { UniversalCurriculumStartButton } from "@/components/UniversalCurriculumStartButton";
import type { CurriculumProgressUnit } from "@/lib/curriculum-runtime/contracts";
import type { ReleasedUnitDetail } from "@/lib/release-integration/catalog";

type Props = Readonly<{
  unit: ReleasedUnitDetail;
  progress: CurriculumProgressUnit | null;
}>;

export function ReleasedCurriculumLesson({ unit, progress }: Props) {
  const buttonLabel = progress?.status === "IN_PROGRESS"
    ? "Tiếp tục luyện tập"
    : progress?.status === "COMPLETED"
      ? "Luyện lại chủ đề"
      : "Bắt đầu luyện tập";
  return (
    <div className="real-learning-page real-learning-page--v2 page-shell universal-learning-page">
      <nav className="learning-breadcrumb" aria-label="Đường dẫn">
        <Button href="/learn" variant="quiet">← Danh sách chủ đề</Button>
      </nav>
      <header className="real-lesson-hero">
        <div>
          <p className="eyebrow">Bài học Toán lớp {unit.grade}</p>
          <h1>{unit.title}</h1>
          <p>{unit.description}</p>
          <p className="unit-status" role="status">
            {progress?.status === "COMPLETED"
              ? "Đã hoàn thành"
              : progress?.status === "IN_PROGRESS"
                ? `Đang học · ${progress.evidenceCount}/${Math.min(12, unit.totalQuestions)} câu`
                : "Chưa bắt đầu"}
          </p>
        </div>
        <UniversalCurriculumStartButton unitSlug={unit.unitId} label={buttonLabel} />
      </header>
      <section className="lesson-section" aria-labelledby="released-objectives-title">
        <p className="section-number">Mục tiêu</p>
        <h2 id="released-objectives-title">Sau bài này, em có thể</h2>
        <ul className="objective-list">
          {unit.learningGoals.map((goal) => <li key={goal}>{goal}</li>)}
        </ul>
      </section>
      <section className="lesson-section" aria-labelledby="released-theory-title">
        <p className="section-number">Lý thuyết</p>
        <h2 id="released-theory-title">Mình cùng học từng phần</h2>
        <div className="lesson-topic-grid">
          {unit.theory.map((section, index) => (
            <article className="lesson-topic" key={`${section.title}-${index}`}>
              <p className="lesson-topic__number">Phần {index + 1}</p>
              <h3>{section.title}</h3>
              {section.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>
      </section>
      <section className="lesson-start-card" aria-labelledby="released-start-title">
        <div>
          <p className="eyebrow">Tối đa 12 câu · Tự động lưu tiến độ</p>
          <h2 id="released-start-title">Em đã sẵn sàng luyện tập chưa?</h2>
          <p>Đáp án được chấm an toàn. Lời giải chỉ xuất hiện sau khi em gửi câu trả lời.</p>
        </div>
        <UniversalCurriculumStartButton unitSlug={unit.unitId} label={buttonLabel} />
      </section>
    </div>
  );
}
