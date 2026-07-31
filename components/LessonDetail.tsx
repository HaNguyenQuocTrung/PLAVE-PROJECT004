import { Button } from "@/components/Button";
import { AdaptiveStartPracticeButton } from "@/components/AdaptiveStartPracticeButton";
import { ProgressBar } from "@/components/ProgressBar";
import { PracticeVisual } from "@/components/PracticeVisual";
import { StartPracticeButton } from "@/components/StartPracticeButton";
import {
  getLessonPath,
  getUnitPresentation,
} from "@/lib/practice/catalog";
import type { LearningUnit } from "@/lib/practice/contracts";
import type { PracticeHistoryItem } from "@/lib/practice/history";
import { getLessonPracticeState } from "@/lib/practice/history";

type LessonDetailProps = {
  unit: LearningUnit;
  practiceHistory: PracticeHistoryItem[];
  practiceUnlocked: boolean;
  prerequisiteUnit: LearningUnit | null;
  practiceRuntime: "FIXED" | "ADAPTIVE";
};

export function LessonDetail({
  unit,
  practiceHistory,
  practiceUnlocked,
  prerequisiteUnit,
  practiceRuntime,
}: LessonDetailProps) {
  const lessonState = getLessonPracticeState(practiceHistory);
  const presentation = getUnitPresentation(unit.slug);
  const startControl = practiceUnlocked ? (
    practiceRuntime === "ADAPTIVE" ? (
      <AdaptiveStartPracticeButton
        label="Bắt đầu hoặc tiếp tục luyện tập"
        unitSlug={unit.slug}
      />
    ) : (
      <StartPracticeButton
        label={lessonState.primaryLabel}
        unitSlug={unit.slug}
      />
    )
  ) : (
    <div className="lesson-prerequisite" role="status">
      <p>
        Em hãy hoàn thành bài {prerequisiteUnit?.title ?? "nền tảng"} trước khi
        bắt đầu luyện tập bài này.
      </p>
      <Button
        href={
          prerequisiteUnit
            ? getLessonPath(prerequisiteUnit.slug)
            : "/lessons"
        }
      >
        Về bài nền tảng
      </Button>
    </div>
  );

  return (
    <div
      className={`real-learning-page page-shell ${presentation.pageClassName}`}
    >
      <nav className="learning-breadcrumb" aria-label="Đường dẫn">
        <Button href="/lessons" variant="quiet">
          ← Thư viện lý thuyết
        </Button>
      </nav>

      <header className="real-lesson-hero">
        <div>
          <p className="eyebrow">Bài học thật · Toán lớp {unit.grade}</p>
          <h1>{unit.title}</h1>
          <p>{unit.description}</p>
          {presentation.operationVisual ? (
            <div
              className="lesson-operation-visual"
              role="img"
              aria-label={presentation.operationVisual.ariaLabel}
            >
              <span>{presentation.operationVisual.left}</span>
              <strong aria-hidden="true">
                {presentation.operationVisual.operator}
              </strong>
              <span>{presentation.operationVisual.right}</span>
              <strong aria-hidden="true">
                {presentation.operationVisual.result}
              </strong>
            </div>
          ) : null}
          {presentation.lessonVisual ? (
            <PracticeVisual spec={presentation.lessonVisual} compact />
          ) : null}
        </div>
        {practiceRuntime === "ADAPTIVE" ? (
          startControl
        ) : lessonState.kind === "CONTINUE" ? (
          <div className="lesson-progress-card">
            <ProgressBar
              value={lessonState.activeAttempt.answeredCount}
              total={lessonState.activeAttempt.totalQuestions}
              label="Tiến độ hiện tại"
            />
            <p>
              Đã làm {lessonState.activeAttempt.answeredCount}/
              {lessonState.activeAttempt.totalQuestions} câu
            </p>
            <Button href={`/practice/${lessonState.activeAttempt.id}`}>
              Tiếp tục luyện tập
            </Button>
          </div>
        ) : lessonState.kind === "RETAKE" ? (
          <div className="lesson-progress-card">
            <p className="eyebrow">Kết quả gần nhất</p>
            <p>
              <strong>
                {lessonState.latestCompletedAttempt.correctCount}/
                {lessonState.latestCompletedAttempt.totalQuestions} câu đúng
              </strong>
            </p>
            <p>
              Lượt mới giữ nguyên kết quả cũ và xáo lại thứ tự câu hỏi.
            </p>
            {practiceUnlocked ? (
              <StartPracticeButton
                label={lessonState.primaryLabel}
                unitSlug={unit.slug}
                fullWidth
              />
            ) : null}
          </div>
        ) : (
          startControl
        )}
      </header>

      <section className="lesson-section" aria-labelledby="objectives-title">
        <p className="section-number">Mục tiêu</p>
        <h2 id="objectives-title">Sau bài này, em có thể</h2>
        <ul className="objective-list">
          {unit.learningObjectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <section className="lesson-section" aria-labelledby="theory-title">
        <p className="section-number">Lý thuyết</p>
        <h2 id="theory-title">Mình cùng học từng phần</h2>
        <div className="lesson-topic-grid">
          {unit.lessonContent.sections.map((section, index) => (
            <article className="lesson-topic" key={section.code}>
              <p className="lesson-topic__number">Phần {index + 1}</p>
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-section" aria-labelledby="examples-title">
        <p className="section-number">Ví dụ</p>
        <h2 id="examples-title">Ví dụ có lời giải từng bước</h2>
        <div className="example-grid">
          {unit.lessonContent.workedExamples.map((example) => (
            <article className="example-card" key={example.title}>
              <h3>{example.title}</h3>
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

      <aside className="memory-box" aria-labelledby="memory-title">
        <p className="eyebrow">Ghi nhớ</p>
        <h2 id="memory-title">{presentation.memoryHeading}</h2>
        <ul>
          {unit.learningObjectives.slice(0, 3).map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </aside>

      <section className="lesson-start-card" aria-labelledby="start-title">
        <div>
          <p className="eyebrow">
            {practiceRuntime === "ADAPTIVE"
              ? "Số câu phù hợp với tiến độ · Lưu tiến độ"
              : `${unit.totalQuestions} câu · Lưu tiến độ`}
          </p>
          <h2 id="start-title">Em đã sẵn sàng luyện tập chưa?</h2>
          <p>
            Mỗi câu được chấm một lần. Lời giải chỉ xuất hiện sau khi em kiểm
            tra đáp án.
          </p>
          {practiceRuntime === "FIXED" &&
          lessonState.kind === "RETAKE" ? (
            <p>Lượt mới với thứ tự câu hỏi được xáo lại.</p>
          ) : null}
        </div>
        {practiceRuntime === "FIXED" &&
        lessonState.kind === "CONTINUE" ? (
          <Button href={`/practice/${lessonState.activeAttempt.id}`}>
            Tiếp tục luyện tập
          </Button>
        ) : (
          startControl
        )}
      </section>
    </div>
  );
}
