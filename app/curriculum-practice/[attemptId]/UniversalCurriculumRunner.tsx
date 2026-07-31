"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CurriculumVisual } from "@/app/curriculum-preview/CurriculumVisual";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import {
  parseCurriculumAttemptApiState,
  type CurriculumAttemptQuestion,
  type CurriculumAttemptState,
} from "@/lib/curriculum-runtime/contracts";

type UniversalCurriculumRunnerProps = {
  initialState: CurriculumAttemptState;
  runtimeMode?: "MATERIALIZED" | "ON_DEMAND";
};

export function UniversalCurriculumRunner({
  initialState,
  runtimeMode = "MATERIALIZED",
}: UniversalCurriculumRunnerProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLDivElement>(null);
  const submissionKey = useRef<string | null>(null);
  const [state, setState] = useState(initialState);
  const [submittedQuestion, setSubmittedQuestion] =
    useState<CurriculumAttemptQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const displayQuestion = state.feedback
    ? submittedQuestion
    : state.currentQuestion;
  const apiBase =
    runtimeMode === "ON_DEMAND"
      ? "/api/on-demand-curriculum"
      : "/api/curriculum-runtime";

  useEffect(() => {
    if (
      performance.getEntriesByName(
        "plave:start-practice-route-push",
        "mark",
      ).length === 0
    ) {
      return;
    }
    performance.mark("plave:start-practice-route-ready");
    performance.measure(
      "plave:start-practice-client-transition",
      "plave:start-practice-route-push",
      "plave:start-practice-route-ready",
    );
    if (
      performance.getEntriesByName(
        "plave:start-practice-click",
        "mark",
      ).length > 0
    ) {
      performance.measure(
        "plave:start-practice-total-transition",
        "plave:start-practice-click",
        "plave:start-practice-route-ready",
      );
    }
  }, []);

  const loadCurrentState = async () => {
    const response = await fetch(
      `${apiBase}/state?attemptId=${encodeURIComponent(state.attemptId)}`,
      { credentials: "same-origin", cache: "no-store" },
    );
    const payload = (await response.json()) as unknown;
    if (
      response.ok &&
      typeof payload === "object" &&
      payload !== null &&
      "data" in payload
    ) {
      const parsed = parseCurriculumAttemptApiState(payload.data);
      if (parsed) {
        setState(parsed);
        setSubmittedQuestion(null);
        setAnswer("");
        return true;
      }
    }
    return false;
  };

  const submit = async () => {
    if (!displayQuestion || state.feedback || submitting) return;
    const normalizedAnswer = answer.trim();
    if (!normalizedAnswer) {
      setError("Em hãy chọn hoặc nhập câu trả lời trước khi kiểm tra.");
      return;
    }
    setSubmitting(true);
    setError("");
    setErrorCode("");
    setCorrelationId("");
    submissionKey.current ??= crypto.randomUUID();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(`${apiBase}/answer`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: state.attemptId,
          questionId: displayQuestion.questionId,
          answer: normalizedAnswer,
          expectedRevision: state.revision,
          idempotencyKey: submissionKey.current,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as unknown;
      if (
        response.ok &&
        typeof payload === "object" &&
        payload !== null &&
        "data" in payload
      ) {
        const parsed = parseCurriculumAttemptApiState(payload.data);
        if (parsed?.feedback) {
          setSubmittedQuestion(displayQuestion);
          setState(parsed);
          submissionKey.current = null;
          return;
        }
      }
      const code =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "object" &&
        payload.error !== null &&
        "code" in payload.error
          ? payload.error.code
          : null;
      const requestCorrelationId =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "object" &&
        payload.error !== null &&
        "correlationId" in payload.error &&
        typeof payload.error.correlationId === "string"
          ? payload.error.correlationId
          : response.headers.get("X-PLAVE-Correlation-ID") ?? "";
      setErrorCode(typeof code === "string" ? code : "REQUEST_FAILED");
      setCorrelationId(requestCorrelationId);
      if (code === "REVISION_CONFLICT") {
        const recovered = await loadCurrentState();
        setError(
          recovered
            ? "Lượt học đã được cập nhật. Đây là câu hiện tại của em."
            : "Lượt học đã thay đổi. Em hãy tải lại trang.",
        );
        return;
      }
      setError(
        typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "object" &&
          payload.error !== null &&
          "message" in payload.error &&
          typeof payload.error.message === "string"
          ? payload.error.message
          : "Chưa thể chấm câu trả lời. Em hãy thử lại.",
      );
    } catch (requestError) {
      const timedOut =
        requestError instanceof DOMException &&
        requestError.name === "AbortError";
      setError(
        timedOut
          ? "Yêu cầu mất quá nhiều thời gian. Em có thể bấm kiểm tra lại an toàn."
          : "Kết nối bị gián đoạn. Em có thể bấm kiểm tra lại; câu trả lời không bị tính hai lần.",
      );
      setErrorCode(timedOut ? "CLIENT_TIMEOUT" : "NETWORK_ERROR");
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!state.feedback) return;
    if (state.status === "COMPLETED") {
      router.push("/learning-progress");
      return;
    }
    setState((current) => ({ ...current, feedback: null }));
    setSubmittedQuestion(null);
    setAnswer("");
    setError("");
    setErrorCode("");
    setCorrelationId("");
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  if (state.status === "COMPLETED" && !state.feedback) {
    return (
      <section className="practice-runner curriculum-complete-card">
        <p className="eyebrow">Đã hoàn thành</p>
        <h1>{state.unitTitle}</h1>
        <p>
          Em trả lời đúng {state.correctCount}/{state.totalQuestions} câu.
          Tiến trình đã được lưu.
        </p>
        <div className="question-card__actions">
          <Button href="/learning-progress">Xem tiến trình</Button>
          <Button href="/learning-history" variant="secondary">
            Xem lịch sử
          </Button>
          <Button href="/lessons" variant="quiet">
            Chọn chủ đề khác
          </Button>
        </div>
      </section>
    );
  }

  if (!displayQuestion) {
    return (
      <section className="empty-state">
        <h1>Chưa thể tải câu hiện tại</h1>
        <p>Tiến độ đã lưu. Em hãy tải lại trang để tiếp tục.</p>
      </section>
    );
  }

  return (
    <section className="practice-runner" aria-labelledby="runtime-title">
      <div className="practice-runner__header">
        <div>
          <p className="eyebrow">Luyện tập · Tự động lưu</p>
          <h1 id="runtime-title">{state.unitTitle}</h1>
        </div>
        <div className="practice-progress-summary">
          <ProgressBar
            value={state.answeredCount}
            total={state.totalQuestions}
            label="Tiến độ hiện tại"
          />
          <p aria-live="polite">
            Đã làm {state.answeredCount}/{state.totalQuestions} câu
          </p>
        </div>
      </div>

      <div
        className="real-question-card"
        ref={headingRef}
        tabIndex={-1}
      >
        <p className="question-count">
          Câu {displayQuestion.position}/{state.totalQuestions}
        </p>
        <CurriculumVisual spec={displayQuestion.visual} />

        {displayQuestion.answerType === "MULTIPLE_CHOICE" &&
        displayQuestion.options ? (
          <fieldset
            className="demo-question"
            aria-describedby={error ? "curriculum-answer-error" : undefined}
          >
            <legend className="demo-question__prompt">
              {displayQuestion.prompt}
            </legend>
            <div className="choice-grid">
              {displayQuestion.options.map((option) => (
                <label
                  className={`choice ${
                    answer === option.key ? "choice--selected" : ""
                  }`}
                  key={option.key}
                >
                  <input
                    type="radio"
                    name={`answer-${displayQuestion.questionId}`}
                    value={option.key}
                    checked={answer === option.key}
                    disabled={Boolean(state.feedback) || submitting}
                    onChange={() => setAnswer(option.key)}
                  />
                  <span className="choice__label" aria-hidden="true">
                    {option.key}
                  </span>
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div>
            <h2 className="real-question-card__prompt">
              {displayQuestion.prompt}
            </h2>
            <label className="number-answer" htmlFor="curriculum-answer">
              Câu trả lời của em
              <input
                id="curriculum-answer"
                type="text"
                inputMode={
                  displayQuestion.answerType === "NUMBER_INPUT"
                    ? "decimal"
                    : "text"
                }
                autoComplete="off"
                maxLength={200}
                value={answer}
                disabled={Boolean(state.feedback) || submitting}
                onChange={(event) => setAnswer(event.target.value)}
              />
            </label>
          </div>
        )}

        {error ? (
          <div
            id="curriculum-answer-error"
            className="question-error"
            role="alert"
          >
            <p>{error}</p>
            <p>
              Mã lỗi: <strong>{errorCode}</strong>
              {correlationId ? ` · Mã hỗ trợ: ${correlationId}` : ""}
            </p>
          </div>
        ) : null}

        {state.feedback ? (
          <div
            className={`feedback ${
              state.feedback.isCorrect
                ? "feedback--correct"
                : "feedback--incorrect"
            }`}
            aria-live="polite"
          >
            <p className="feedback__status">
              <span aria-hidden="true">
                {state.feedback.isCorrect ? "✓" : "!"}
              </span>
              <strong>
                {state.feedback.isCorrect ? "Chính xác" : "Chưa chính xác"}
              </strong>
            </p>
            <p>{state.feedback.feedback}</p>
            <p>
              <strong>Đáp án đúng:</strong>{" "}
              {state.feedback.correctAnswer}
            </p>
            <h3>Lời giải từng bước</h3>
            <ol>
              {state.feedback.solutionSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="question-card__actions">
          <Button href="/lessons" variant="quiet">
            Thoát bài
          </Button>
          {state.feedback ? (
            <Button onClick={next}>
              {state.status === "COMPLETED"
                ? "Xem tiến trình"
                : "Câu tiếp theo"}
            </Button>
          ) : (
            <Button disabled={submitting} onClick={submit}>
              {submitting ? "Đang chấm…" : "Kiểm tra"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
