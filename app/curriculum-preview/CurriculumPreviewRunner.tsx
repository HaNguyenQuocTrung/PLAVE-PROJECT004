"use client";

import { useEffect, useRef, useState } from "react";

import type { PreviewQuestion } from "@/lib/curriculum/types";
import { CurriculumVisual } from "./CurriculumVisual";

type CheckResult = Readonly<{
  correct: boolean;
  correctAnswer: string;
  steps: readonly string[];
  feedback: string;
}>;

type RunnerProps = Readonly<{
  grade: number;
  unitSlug: string;
  unitTitle: string;
  questions: readonly PreviewQuestion[];
}>;

export function CurriculumPreviewRunner({
  grade,
  unitSlug,
  unitTitle,
  questions,
}: RunnerProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const question = questions[index];

  useEffect(() => {
    if (result) feedbackRef.current?.focus();
  }, [result]);

  function startPractice() {
    setStarted(true);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function submitAnswer() {
    if (!answer.trim() || result || submitting) {
      if (!answer.trim()) setMessage("Hãy chọn hoặc nhập một câu trả lời.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/curriculum-preview/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitSlug,
          questionCode: question.code,
          answer,
        }),
      });
      if (!response.ok) {
        setMessage("Chưa thể kiểm tra câu trả lời. Hãy thử lại.");
        return;
      }
      const checked = (await response.json()) as CheckResult;
      setResult(checked);
      if (checked.correct) setCorrectCount((current) => current + 1);
    } catch {
      setMessage("Chưa thể kiểm tra câu trả lời. Không có dữ liệu nào được lưu.");
    } finally {
      setSubmitting(false);
    }
  }

  function continuePractice() {
    if (!result) return;
    if (index === questions.length - 1) {
      setFinished(true);
      window.requestAnimationFrame(() =>
        document.getElementById("preview-summary")?.focus(),
      );
      return;
    }
    setIndex((current) => current + 1);
    setAnswer("");
    setResult(null);
    setMessage("");
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function restart() {
    setIndex(0);
    setAnswer("");
    setResult(null);
    setCorrectCount(0);
    setStarted(true);
    setFinished(false);
    setMessage("");
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  return (
    <section className="preview-practice" aria-labelledby="preview-practice-title">
      <p className="section-number">Phần 3</p>
      <h2 id="preview-practice-title">
        Luyện tập · Lớp {grade} · {unitTitle}
      </h2>
      {questions.length === 0 ? (
        <div className="preview-empty-state" role="status">
          <h3>Chủ đề này chưa có câu luyện tập</h3>
          <p>Em có thể quay lại danh sách và chọn một chủ đề khác.</p>
          <a className="button button--secondary" href="#unit-list">
            Chọn chủ đề khác
          </a>
        </div>
      ) : !started ? (
        <div className="preview-practice-intro">
          <h3>Sẵn sàng luyện tập?</h3>
          <p>
            Chủ đề có {questions.length} câu. Lời giải chỉ xuất hiện sau khi em
            gửi câu trả lời.
          </p>
          <button
            className="button button--primary"
            onClick={startPractice}
            type="button"
          >
            Bắt đầu luyện tập
          </button>
        </div>
      ) : finished ? (
        <div className="preview-feedback" id="preview-summary" tabIndex={-1}>
          <p className="eyebrow">Đã hoàn thành chủ đề</p>
          <h3>
            Em làm đúng {correctCount}/{questions.length} câu
          </h3>
          <p>Kết quả này chỉ tồn tại trên màn hình và không được lưu.</p>
          <div className="preview-actions">
            <button
              className="button button--secondary"
              onClick={restart}
              type="button"
            >
              Làm lại từ đầu
            </button>
            <a className="button button--secondary" href="#unit-list">
              Chọn chủ đề khác
            </a>
          </div>
        </div>
      ) : (
        <article className="preview-question-card">
          <p className="question-count">
            Câu {index + 1}/{questions.length}
          </p>
          <h3 ref={headingRef} tabIndex={-1}>
            {question.prompt}
          </h3>
          <CurriculumVisual spec={question.visual} />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitAnswer();
            }}
          >
            {question.options ? (
              <fieldset
                aria-describedby={message ? "preview-answer-error" : undefined}
                disabled={Boolean(result)}
              >
                <legend className="sr-only">Chọn một đáp án</legend>
                {question.options.map((option) => (
                  <label className="preview-option" key={option.key}>
                    <input
                      checked={answer === option.key}
                      name={question.code}
                      onChange={() => {
                        setAnswer(option.key);
                        setMessage("");
                      }}
                      type="radio"
                      value={option.key}
                    />
                    <span>
                      {option.key}. {option.label}
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <label className="preview-input">
                <span>Câu trả lời của em</span>
                <input
                  aria-describedby={
                    message ? "preview-answer-error" : undefined
                  }
                  autoComplete="off"
                  disabled={Boolean(result)}
                  inputMode={
                    question.answerType === "NUMBER_INPUT" ? "decimal" : "text"
                  }
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setMessage("");
                  }}
                  value={answer}
                />
              </label>
            )}

            {message ? (
              <p
                className="question-error"
                id="preview-answer-error"
                role="alert"
              >
                {message}
              </p>
            ) : null}

            {!result ? (
              <button
                className="button button--primary"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Đang kiểm tra…" : "Kiểm tra"}
              </button>
            ) : null}
          </form>

          {result ? (
            <div
              className={`preview-feedback ${result.correct ? "is-correct" : "is-incorrect"}`}
              ref={feedbackRef}
              role="status"
              tabIndex={-1}
            >
              <h4>{result.correct ? "Chính xác!" : "Mình cùng sửa nhé"}</h4>
              <p>{result.feedback}</p>
              {!result.correct ? (
                <p>
                  <strong>Đáp án đúng:</strong> {result.correctAnswer}
                </p>
              ) : null}
              <h5>Lời giải từng bước</h5>
              <ol>
                {result.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="preview-actions">
            {result ? (
              <button
                className="button button--primary"
                onClick={continuePractice}
                type="button"
              >
                {index === questions.length - 1
                  ? "Xem kết quả"
                  : "Câu tiếp theo"}
              </button>
            ) : null}
            <button
              className="button button--secondary"
              onClick={restart}
              type="button"
            >
              Làm lại từ đầu
            </button>
            <a className="button button--secondary" href="#unit-list">
              Thoát chủ đề
            </a>
          </div>
        </article>
      )}
    </section>
  );
}
