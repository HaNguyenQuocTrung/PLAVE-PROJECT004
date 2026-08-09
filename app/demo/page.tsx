"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { DemoQuestion } from "@/components/DemoQuestion";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ProgressBar } from "@/components/ProgressBar";
import { demoLesson } from "@/data/demo-lesson";
import type { DemoQuestion as DemoQuestionType } from "@/types/learning";

function answerIsCorrect(question: DemoQuestionType, answer: string) {
  const normalized = answer.trim();
  if (!normalized) return false;
  if (question.type === "number-input") {
    return Number(normalized) === Number(question.correctAnswer);
  }
  return normalized === question.correctAnswer;
}

export default function DemoPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedQuestionIds, setCheckedQuestionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  const currentQuestion = demoLesson.questions[questionIndex];
  const currentAnswer = answers[currentQuestion.id] ?? "";
  const currentChecked = checkedQuestionIds.has(currentQuestion.id);
  const currentCorrect =
    currentChecked && answerIsCorrect(currentQuestion, currentAnswer);

  const completedCount = checkedQuestionIds.size;
  const correctCount = useMemo(
    () =>
      demoLesson.questions.filter(
        (question) =>
          checkedQuestionIds.has(question.id) &&
          answerIsCorrect(question, answers[question.id] ?? ""),
      ).length,
    [answers, checkedQuestionIds],
  );

  const skillsToReview = useMemo(
    () =>
      Array.from(
        new Set(
          demoLesson.questions
            .filter(
              (question) =>
                checkedQuestionIds.has(question.id) &&
                !answerIsCorrect(question, answers[question.id] ?? ""),
            )
            .map((question) => question.skill),
        ),
      ),
    [answers, checkedQuestionIds],
  );

  const updateAnswer = (answer: string) => {
    if (currentChecked) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: answer,
    }));
    setError("");
  };

  const checkAnswer = () => {
    if (!currentAnswer.trim()) {
      setError("Em hãy chọn hoặc nhập một câu trả lời trước khi kiểm tra.");
      return;
    }

    setCheckedQuestionIds((current) => {
      const next = new Set(current);
      next.add(currentQuestion.id);
      return next;
    });
    setError("");
  };

  const continueLearning = () => {
    if (!currentChecked) return;

    if (questionIndex === demoLesson.questions.length - 1) {
      setFinished(true);
      window.requestAnimationFrame(() => {
        document.getElementById("demo-summary-title")?.focus();
      });
      return;
    }

    setQuestionIndex((current) => current + 1);
    setError("");
    window.requestAnimationFrame(() => questionHeadingRef.current?.focus());
  };

  const restart = () => {
    setQuestionIndex(0);
    setAnswers({});
    setCheckedQuestionIds(new Set());
    setFinished(false);
    setError("");
    window.requestAnimationFrame(() => {
      document.getElementById("lesson-start")?.focus();
    });
  };

  const percent = Math.round(
    (correctCount / demoLesson.questions.length) * 100,
  );

  return (
    <div className="demo-page demo-page--v2 page-shell">
      <section className="demo-hero" id="lesson-start" tabIndex={-1}>
        <p className="eyebrow">Học thử · Toán lớp 1</p>
        <h1>{demoLesson.title}</h1>
        <p>{demoLesson.subtitle}</p>
        <div className="demo-hero__note">
          <strong>Không lưu dữ liệu.</strong> Em có thể làm lại bất cứ lúc nào.
        </div>
        <div className="preview-entry-link">
          <Button href="/curriculum-preview" variant="secondary">
            Khám phá Toán Lớp 1–9
          </Button>
        </div>
      </section>

      <section className="lesson-section" aria-labelledby="objectives-title">
        <p className="section-number">Phần 1</p>
        <h2 id="objectives-title">Mục tiêu bài học</h2>
        <ul className="objective-list">
          {demoLesson.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <section className="lesson-section" aria-labelledby="explanation-title">
        <p className="section-number">Phần 2</p>
        <h2 id="explanation-title">Mình cùng hiểu nhé</h2>
        <div className="explanation-stack">
          {demoLesson.explanation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="lesson-section" aria-labelledby="examples-title">
        <p className="section-number">Phần 3</p>
        <h2 id="examples-title">Hai ví dụ từng bước</h2>
        <div className="example-grid">
          {demoLesson.examples.map((example) => (
            <article className="example-card" key={example.title}>
              <h3>{example.title}</h3>
              <p className="example-card__prompt">{example.prompt}</p>
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

      <section className="practice-section" aria-labelledby="practice-title">
        <div className="practice-section__header">
          <div>
            <p className="section-number">Phần 4</p>
            <h2 id="practice-title">Luyện tập 5 câu</h2>
          </div>
          <ProgressBar
            value={completedCount}
            total={demoLesson.questions.length}
            label="Tiến độ luyện tập"
          />
        </div>

        {finished ? (
          <div className="demo-summary">
            <p className="eyebrow">Đã hoàn thành</p>
            <h2 id="demo-summary-title" tabIndex={-1}>
              Em làm đúng {correctCount}/{demoLesson.questions.length} câu
            </h2>
            <p className="demo-summary__score">{percent}%</p>
            <div className="review-skills">
              <h3>Kỹ năng cần ôn</h3>
              {skillsToReview.length > 0 ? (
                <ul>
                  {skillsToReview.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              ) : (
                <p>Em đã làm đúng tất cả. Hãy thử làm lại để củng cố nhé.</p>
              )}
            </div>
            <div className="demo-summary__actions">
              <Button onClick={restart} variant="secondary">
                Làm lại
              </Button>
              <Button href="/register">Tạo tài khoản PLAVE</Button>
            </div>
            <p className="form-notice">
              Kết quả Học thử không được lưu. Khi đăng nhập, các lượt học, câu
              trả lời, trạng thái tiếp tục, kết quả hoàn thành, Lịch sử và
              Tiến bộ được lưu trong tài khoản.
            </p>
          </div>
        ) : (
          <div className="question-card">
            <p className="question-count">
              Câu {questionIndex + 1}/{demoLesson.questions.length} ·{" "}
              {currentQuestion.skill}
            </p>
            <h2
              className="sr-only"
              ref={questionHeadingRef}
              tabIndex={-1}
            >
              Câu hỏi {questionIndex + 1}
            </h2>

            <DemoQuestion
              question={currentQuestion}
              answer={currentAnswer}
              checked={currentChecked}
              errorId={error ? "question-answer-error" : undefined}
              onAnswerChange={updateAnswer}
            />

            {error ? (
              <p
                className="question-error"
                id="question-answer-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {currentChecked ? (
              <FeedbackPanel
                isCorrect={currentCorrect}
                correctAnswer={currentQuestion.correctAnswer}
                explanation={currentQuestion.explanation}
              />
            ) : null}

            <div className="question-card__actions">
              {!currentChecked ? (
                <Button onClick={checkAnswer}>Kiểm tra</Button>
              ) : (
                <Button onClick={continueLearning}>
                  {questionIndex === demoLesson.questions.length - 1
                    ? "Xem kết quả"
                    : "Sang câu tiếp theo"}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
