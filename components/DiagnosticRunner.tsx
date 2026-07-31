"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { PracticeVisual } from "@/components/PracticeVisual";
import { ProgressBar } from "@/components/ProgressBar";
import {
  createDiagnosticSingleFlightGate,
  parseDiagnosticStateApiResponse,
  parseDiagnosticSubmitApiResponse,
  readDiagnosticResponse,
} from "@/lib/diagnostic/client-flow";
import {
  diagnosticDomainLabels,
  parseDiagnosticApiError,
  type DiagnosticQuestion,
} from "@/lib/diagnostic/contracts";
import {
  normalizePracticeNumberInput,
} from "@/lib/practice/client-flow";

type DiagnosticRunnerProps = {
  attemptId: string;
  questions: DiagnosticQuestion[];
  initialAnsweredQuestionIds: string[];
};

const optionKeys = ["A", "B", "C", "D"] as const;

export function DiagnosticRunner({
  attemptId,
  questions,
  initialAnsweredQuestionIds,
}: DiagnosticRunnerProps) {
  const router = useRouter();
  const questionRef = useRef<HTMLDivElement>(null);
  const [requestGate] = useState(createDiagnosticSingleFlightGate);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState(
    () => new Set(initialAnsweredQuestionIds),
  );
  const firstUnanswered = questions.findIndex(
    (question) => !answeredQuestionIds.has(question.code),
  );
  const [questionIndex, setQuestionIndex] = useState(
    firstUnanswered === -1 ? questions.length - 1 : firstUnanswered,
  );
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const question = questions[questionIndex];
  const answeredCount = answeredQuestionIds.size;

  const moveToState = (nextAnsweredIds: string[], completed: boolean) => {
    if (completed) {
      router.push(`/diagnostic/${attemptId}/review`);
      return;
    }
    const nextSet = new Set(nextAnsweredIds);
    setAnsweredQuestionIds(nextSet);
    const nextIndex = questions.findIndex(
      (candidate) => !nextSet.has(candidate.code),
    );
    if (nextIndex === -1) {
      router.push(`/diagnostic/${attemptId}/review`);
      return;
    }
    setQuestionIndex(nextIndex);
    setAnswer("");
    setError("");
    window.requestAnimationFrame(() => questionRef.current?.focus());
  };

  const submitAnswer = () => {
    if (requestGate.isActive() || answeredQuestionIds.has(question.code)) {
      return;
    }

    let normalizedAnswer = answer.trim();
    if (!normalizedAnswer) {
      setError("Em hãy chọn hoặc nhập một câu trả lời trước khi tiếp tục.");
      return;
    }
    if (question.questionType === "NUMBER_INPUT") {
      const normalizedNumber =
        normalizePracticeNumberInput(normalizedAnswer);
      if (normalizedNumber === null) {
        setError("Em hãy nhập một số nguyên không âm hợp lệ.");
        return;
      }
      normalizedAnswer = normalizedNumber;
    }

    void requestGate.run(async () => {
      setIsSubmitting(true);
      setError("");
      try {
        let apiError: ReturnType<typeof parseDiagnosticApiError> = null;
        try {
          const response = await fetch("/api/diagnostic/answer", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attemptId,
              questionId: question.code,
              answer: normalizedAnswer,
            }),
          });
          const payload = await readDiagnosticResponse(response);
          if (payload.ok) {
            const parsed = parseDiagnosticSubmitApiResponse(payload.value);
            if (parsed) {
              moveToState(
                [...answeredQuestionIds, question.code],
                parsed.data.completed,
              );
              return;
            }
          }
          apiError = parseDiagnosticApiError(payload.value);
        } catch {
          // Reconcile below without retrying the mutation.
        }

        if (apiError?.error.code === "AUTH_REQUIRED") {
          router.push("/login");
          return;
        }
        if (
          apiError &&
          apiError.error.code !== "REQUEST_FAILED" &&
          apiError.error.code !== "ANSWER_LOCKED"
        ) {
          setError(apiError.error.message);
          return;
        }

        try {
          const response = await fetch(
            `/api/diagnostic/state?attemptId=${encodeURIComponent(attemptId)}`,
            {
              method: "GET",
              credentials: "same-origin",
              cache: "no-store",
            },
          );
          const payload = await readDiagnosticResponse(response);
          const state = payload.ok
            ? parseDiagnosticStateApiResponse(payload.value)
            : null;
          if (
            state &&
            state.data.answeredQuestionIds.includes(question.code)
          ) {
            moveToState(
              state.data.answeredQuestionIds,
              state.data.status === "COMPLETED",
            );
            return;
          }
        } catch {
          // A safe message is shown below.
        }

        setError(
          "Chưa xác nhận được câu trả lời đã lưu. Em có thể thử gửi lại đúng câu trả lời này.",
        );
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <section
      className="diagnostic-runner"
      aria-labelledby="diagnostic-runner-title"
    >
      <header className="diagnostic-runner__header">
        <div>
          <p className="eyebrow">Đánh giá năng lực Lớp 1</p>
          <h1 id="diagnostic-runner-title">Em làm từng câu theo nhịp của mình</h1>
          <p>
            Kết quả đúng, sai và lời giải sẽ được hiển thị sau khi em hoàn
            thành đủ {questions.length} câu.
          </p>
        </div>
        <ProgressBar
          value={answeredCount}
          total={questions.length}
          label="Tiến độ đánh giá"
        />
      </header>

      <div
        className="real-question-card diagnostic-question-card"
        ref={questionRef}
        tabIndex={-1}
      >
        <div className="diagnostic-question-meta">
          <span>
            Câu {questionIndex + 1}/{questions.length}
          </span>
          <span>{diagnosticDomainLabels[question.domain]}</span>
        </div>

        {question.visualSpec ? (
          <PracticeVisual spec={question.visualSpec} />
        ) : null}

        {question.questionType === "MULTIPLE_CHOICE" &&
        question.options ? (
          <fieldset
            className="demo-question"
            aria-describedby={error ? "diagnostic-answer-error" : undefined}
            aria-invalid={Boolean(error)}
          >
            <legend className="demo-question__prompt">
              {question.prompt}
            </legend>
            <div className="choice-grid">
              {optionKeys.map((optionKey) => (
                <label
                  className={`choice ${
                    answer === optionKey ? "choice--selected" : ""
                  }`}
                  key={optionKey}
                >
                  <input
                    type="radio"
                    name={`diagnostic-answer-${question.code}`}
                    value={optionKey}
                    checked={answer === optionKey}
                    disabled={isSubmitting}
                    onChange={() => {
                      setAnswer(optionKey);
                      setError("");
                    }}
                  />
                  <span className="choice__label" aria-hidden="true">
                    {optionKey}
                  </span>
                  <span>{question.options?.[optionKey]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div>
            <h2 className="real-question-card__prompt">
              {question.prompt}
            </h2>
            <label className="number-answer" htmlFor="diagnostic-number-answer">
              Câu trả lời của em
              <input
                id="diagnostic-number-answer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={3}
                value={answer}
                disabled={isSubmitting}
                aria-describedby={
                  error ? "diagnostic-answer-error" : undefined
                }
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setAnswer(event.target.value.replace(/\D/g, ""));
                  setError("");
                }}
              />
            </label>
          </div>
        )}

        {error ? (
          <p
            className="question-error"
            id="diagnostic-answer-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="diagnostic-question-note" role="status">
          Câu trả lời được khóa sau khi lưu. Em sẽ xem lời giải ở cuối bài.
        </div>

        <div className="question-card__actions">
          <Button disabled={isSubmitting} onClick={submitAnswer}>
            {isSubmitting ? "Đang lưu câu trả lời…" : "Lưu và tiếp tục"}
          </Button>
        </div>
      </div>
    </section>
  );
}
