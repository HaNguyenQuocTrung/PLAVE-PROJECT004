import { CurriculumVisual } from "@/app/curriculum-preview/CurriculumVisual";
import { Button } from "@/components/Button";
import { UniversalCurriculumStartButton } from "@/components/UniversalCurriculumStartButton";
import { createCurriculumVisualSpec } from "@/lib/curriculum/visual";
import {
  studentLearningGoals,
  studentUnitTitle,
} from "@/lib/curriculum/student-facing";
import type { CurriculumUnit } from "@/lib/curriculum/types";
import type { CurriculumProgressUnit } from "@/lib/curriculum-runtime/contracts";

type UniversalCurriculumLessonProps = {
  unit: CurriculumUnit;
  progress: CurriculumProgressUnit | null;
};

export function UniversalCurriculumLesson({
  unit,
  progress,
}: UniversalCurriculumLessonProps) {
  const title = studentUnitTitle(unit);
  const buttonLabel =
    progress?.status === "IN_PROGRESS"
      ? "Tiếp tục luyện tập"
      : progress?.status === "COMPLETED"
        ? "Luyện lại chủ đề"
        : "Bắt đầu luyện tập";

  return (
    <div className="real-learning-page real-learning-page--v2 page-shell universal-learning-page">
      <nav className="learning-breadcrumb" aria-label="Đường dẫn">
        <Button href="/lessons" variant="quiet">
          ← Danh sách chủ đề
        </Button>
      </nav>

      <header className="real-lesson-hero">
        <div>
          <p className="eyebrow">Bài học Toán lớp {unit.grade}</p>
          <h1>{title}</h1>
          <p>{unit.theory[0]?.explanation[0]}</p>
          {progress ? (
            <p className="unit-status" role="status">
              {progress.status === "COMPLETED"
                ? "Đã hoàn thành"
                : progress.status === "IN_PROGRESS"
                  ? `Đang học · ${progress.evidenceCount}/12 câu`
                  : "Chưa bắt đầu"}
            </p>
          ) : null}
        </div>
        <UniversalCurriculumStartButton
          unitSlug={unit.slug}
          label={buttonLabel}
        />
      </header>

      <section className="lesson-section" aria-labelledby="objectives-title">
        <p className="section-number">Mục tiêu</p>
        <h2 id="objectives-title">Sau bài này, em có thể</h2>
        <ul className="objective-list">
          {studentLearningGoals(unit).map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section className="lesson-section" aria-labelledby="theory-title">
        <p className="section-number">Lý thuyết</p>
        <h2 id="theory-title">Mình cùng học từng phần</h2>
        <div className="lesson-topic-grid">
          {unit.theory.map((section, index) => (
            <article className="lesson-topic" key={section.id}>
              <p className="lesson-topic__number">Phần {index + 1}</p>
              <h3>{section.title}</h3>
              {section.explanation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <CurriculumVisual
                spec={createCurriculumVisualSpec({
                  type: unit.requiredVisual,
                  description: section.visualDescription,
                  identity: section.id,
                })}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-section" aria-labelledby="examples-title">
        <p className="section-number">Ví dụ</p>
        <h2 id="examples-title">Ví dụ có lời giải từng bước</h2>
        <div className="example-grid">
          {unit.examples.map((example) => (
            <article className="example-card" key={example.id}>
              <h3>{example.title}</h3>
              <p>{example.prompt}</p>
              <ol>
                {example.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="example-card__answer">
                <strong>Kết luận:</strong> {example.answer}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-start-card" aria-labelledby="start-title">
        <div>
          <p className="eyebrow">12 câu · Tự động lưu tiến độ</p>
          <h2 id="start-title">Em đã sẵn sàng luyện tập chưa?</h2>
          <p>
            Đáp án được chấm an toàn. Lời giải chỉ xuất hiện sau khi em gửi
            câu trả lời.
          </p>
        </div>
        <UniversalCurriculumStartButton
          unitSlug={unit.slug}
          label={buttonLabel}
        />
      </section>
    </div>
  );
}
