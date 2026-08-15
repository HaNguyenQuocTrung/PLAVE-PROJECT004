"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { PracticeVisual } from "@/components/PracticeVisual";
import { XpCompletionSummary } from "@/components/XpCompletionSummary";
import {
  parseAdaptiveApiResponse,
  type AdaptiveApiError,
} from "@/lib/practice/adaptive-api";
import type {
  AdaptiveRpcQuestion,
  AdaptiveRpcState,
} from "@/lib/practice/adaptive-database-contract";
import { getSkillLabel } from "@/lib/practice/catalog";
import {
  PRACTICE_NUMBER_INPUT_MAX_DIGITS,
} from "@/lib/practice/contracts";
import { normalizePracticeNumberInput } from "@/lib/practice/client-flow";
import { buildAnswerXpCompletionProjection } from "@/lib/scoring/completion";

type AdaptivePracticeRunnerProps = {
  initialState: AdaptiveRpcState;
  unitTitle: string;
};

const optionKeys = ["A", "B", "C", "D"] as const;

function formatAnswer(
  question: AdaptiveRpcQuestion,
  answer: string,
) {
  if (question.answerType === "MULTIPLE_CHOICE" && question.options) {
    const key = optionKeys.find((candidate) => candidate === answer);
    if (key) return `${key} — ${question.options[key]}`;
  }
  return answer;
}

function TerminalState({
  state,
}: {
  state: AdaptiveRpcState;
}) {
  const completed = [
    "MASTERED_EARLY",
    "REMEDIATION_REQUIRED",
    "MAX_REACHED",
  ].includes(state.status);
  const xpCompletion = state.xp
    ? buildAnswerXpCompletionProjection(state.xp)
    : null;
  const copy = {
    MASTERED_EARLY: {
      eyebrow: "Hoàn thành lượt học",
      title: "Em đã làm tốt các kỹ năng trong lượt này.",
      description:
        "PLAVE đã có đủ bằng chứng cho từng kỹ năng nên lượt học kết thúc sớm.",
    },
    REMEDIATION_REQUIRED: {
      eyebrow: "Cần củng cố thêm",
      title: "Mình cùng ôn lại vài kỹ năng nhé.",
      description:
        "Em đã hoàn thành lượt luyện tập. Hãy xem lại lý thuyết trước khi làm lượt mới.",
    },
    MAX_REACHED: {
      eyebrow: "Đã hoàn thành lượt học",
      title: "Em đã làm đủ số câu của lượt này.",
      description:
        "Hãy xem phần cần ôn bên dưới và quay lại lý thuyết khi cần.",
    },
    ABANDONED: {
      eyebrow: "Lượt học đã dừng",
      title: "Lượt luyện tập này không còn tiếp tục được.",
      description: "Em có thể quay lại Bài học để bắt đầu một lượt mới.",
    },
    IN_PROGRESS: {
      eyebrow: "Luyện tập thích ứng",
      title: "Lượt học đang tiếp tục.",
      description: "",
    },
  }[state.status];

  return (
    <section className="real-question-card adaptive-terminal">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      {completed ? <XpCompletionSummary projection={xpCompletion} /> : null}
      {state.remediationSkillIds.length > 0 ? (
        <div>
          <h3>Kỹ năng nên ôn lại</h3>
          <ul>
            {state.remediationSkillIds.map((skillId) => (
              <li key={skillId}>{getSkillLabel(skillId)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="question-card__actions">
        <Button href="/lessons" variant="secondary">
          Xem lý thuyết
        </Button>
        <Button href="/lessons">Về Bài học</Button>
      </div>
    </section>
  );
}

export function AdaptivePracticeRunner({
  initialState,
  unitTitle,
}: AdaptivePracticeRunnerProps) {
  const router = useRouter();
  const questionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [state, setState] = useState(initialState);
  const [pendingState, setPendingState] =
    useState<AdaptiveRpcState | null>(null);
  const [submittedQuestion, setSubmittedQuestion] =
    useState<AdaptiveRpcQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualRetry, setManualRetry] = useState(false);
  const [error, setError] = useState("");

  const displayState = pendingState ?? state;
  const question = submittedQuestion ?? state.currentQuestion;
  const feedback = pendingState?.feedback ?? null;
  const terminal =
    state.status !== "IN_PROGRESS" && pendingState === null;
  const describedBy = useMemo(
    () =>
      [
        question?.accessibilityDescription
          ? "adaptive-question-description"
          : "",
        error ? "adaptive-answer-error" : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    [error, question?.accessibilityDescription],
  );

  useEffect(() => {
    if (!feedback) return;
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  }, [feedback]);

  const updateAnswer = (value: string) => {
    if (feedback || isSubmitting) return;
    setAnswer(value);
    idempotencyKey.current = null;
    setManualRetry(false);
    setError("");
  };

  const refreshState = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/adaptive-practice/state?attemptId=${encodeURIComponent(
          state.attemptId,
        )}`,
        { method: "GET", credentials: "same-origin", cache: "no-store" },
      );
      const payload: unknown = await response.json();
      const parsed = parseAdaptiveApiResponse(payload, false);
      if (parsed?.ok) {
        setState(parsed.data);
        setPendingState(null);
        setSubmittedQuestion(null);
        setAnswer("");
        idempotencyKey.current = null;
        setManualRetry(false);
        setError("");
        return true;
      }
      if (parsed?.error.code === "AUTH_REQUIRED") {
        router.push("/login");
        return false;
      }
      setError(
        parsed?.error.message ??
          "Chưa thể tải trạng thái mới nhất. Vui lòng thử lại.",
      );
      return false;
    } catch {
      setError("Chưa thể tải trạng thái mới nhất. Vui lòng thử lại.");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApiError = async (apiError: AdaptiveApiError) => {
    if (apiError.error.code === "AUTH_REQUIRED") {
      router.push("/login");
      return;
    }
    if (
      apiError.error.code === "REVISION_CONFLICT" ||
      apiError.error.code === "QUESTION_CHANGED"
    ) {
      setError(apiError.error.message);
      await refreshState();
      return;
    }
    setError(apiError.error.message);
    setManualRetry(
      apiError.error.retry.action === "SAME_IDEMPOTENCY_KEY_RETRY",
    );
  };

  const submitAnswer = async () => {
    if (!question || feedback || isSubmitting) return;
    let normalizedAnswer = answer.trim();
    if (!normalizedAnswer) {
      setError("Em hãy chọn hoặc nhập một câu trả lời trước khi kiểm tra.");
      return;
    }
    if (question.answerType === "NUMBER_INPUT") {
      const normalized = normalizePracticeNumberInput(normalizedAnswer);
      if (normalized === null) {
        setError("Em hãy nhập một số nguyên không âm hợp lệ.");
        return;
      }
      normalizedAnswer = normalized;
    }

    idempotencyKey.current ??= crypto.randomUUID();
    setIsSubmitting(true);
    setError("");
    setManualRetry(false);

    try {
      const response = await fetch("/api/adaptive-practice/answer", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: state.attemptId,
          questionId: question.questionId,
          answer: normalizedAnswer,
          expectedRevision: state.revision,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const payload: unknown = await response.json();
      const parsed = parseAdaptiveApiResponse(payload, true);
      if (parsed?.ok) {
        setSubmittedQuestion(question);
        setPendingState(parsed.data);
        idempotencyKey.current = null;
        return;
      }
      if (parsed) {
        await handleApiError(parsed);
        return;
      }
      setError("Chưa thể xác nhận câu trả lời. Em có thể thử gửi lại.");
      setManualRetry(true);
    } catch {
      // Never retry a POST automatically. A manual retry keeps the exact
      // idempotency key and revision so the database can return one result.
      setError(
        "Chưa nhận được phản hồi. Em có thể thử gửi lại câu này an toàn.",
      );
      setManualRetry(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueAfterFeedback = () => {
    if (!pendingState) return;
    setState(pendingState);
    setPendingState(null);
    setSubmittedQuestion(null);
    setAnswer("");
    setError("");
    setManualRetry(false);
    window.requestAnimationFrame(() => questionRef.current?.focus());
  };

  if (terminal) {
    return (
      <section
        className="practice-runner"
        aria-labelledby="adaptive-practice-title"
      >
        <div className="practice-runner__header">
          <div>
            <p className="eyebrow">Luyện tập theo năng lực</p>
            <h1 id="adaptive-practice-title">{unitTitle}</h1>
          </div>
          <p className="adaptive-progress" aria-label="Tiến độ lượt học">
            Đã làm {state.answeredCount} câu
          </p>
        </div>
        <TerminalState state={state} />
      </section>
    );
  }

  if (!question) {
    return (
      <section className="real-question-card" role="alert">
        <h1>Chưa thể tải câu hỏi hiện tại.</h1>
        <Button onClick={() => void refreshState()}>
          {isRefreshing ? "Đang tải lại…" : "Tải lại trạng thái"}
        </Button>
      </section>
    );
  }

  return (
    <section
      className="practice-runner"
      aria-labelledby="adaptive-practice-title"
    >
      <div className="practice-runner__header">
        <div>
          <p className="eyebrow">Luyện tập theo năng lực</p>
          <h1 id="adaptive-practice-title">{unitTitle}</h1>
        </div>
        <div className="practice-progress-summary">
          <p
            className="adaptive-progress"
            aria-label={`Đã làm ${displayState.answeredCount} câu`}
            aria-live="polite"
          >
            Đã làm {displayState.answeredCount} câu
          </p>
          <Button href="/lessons" variant="tertiary">
            Thoát bài
          </Button>
        </div>
      </div>

      <div className="real-question-card" ref={questionRef} tabIndex={-1}>
        <p className="question-count">Câu tiếp theo</p>

        {question.visual ? <PracticeVisual spec={question.visual} /> : null}
        {question.accessibilityDescription ? (
          <p className="sr-only" id="adaptive-question-description">
            {question.accessibilityDescription}
          </p>
        ) : null}

        {question.answerType === "MULTIPLE_CHOICE" && question.options ? (
          <fieldset
            className="demo-question"
            aria-describedby={describedBy}
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
                    name={`adaptive-answer-${question.questionId}`}
                    value={optionKey}
                    checked={answer === optionKey}
                    disabled={Boolean(feedback) || isSubmitting}
                    onChange={() => updateAnswer(optionKey)}
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
            <label className="number-answer" htmlFor="adaptive-number-answer">
              Câu trả lời của em
              <input
                id="adaptive-number-answer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={PRACTICE_NUMBER_INPUT_MAX_DIGITS}
                value={answer}
                disabled={Boolean(feedback) || isSubmitting}
                aria-describedby={describedBy}
                aria-invalid={Boolean(error)}
                onChange={(event) => updateAnswer(event.target.value)}
              />
            </label>
          </div>
        )}

        {error ? (
          <p
            className="question-error"
            id="adaptive-answer-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {feedback ? (
          <div
            ref={feedbackRef}
            className={`feedback ${
              feedback.isCorrect
                ? "feedback--correct"
                : "feedback--incorrect"
            }`}
            aria-live="polite"
            tabIndex={-1}
          >
            <p className="feedback__status">
              <span aria-hidden="true">
                {feedback.isCorrect ? "✓" : "!"}
              </span>
              <strong>
                {feedback.isCorrect ? "Chính xác" : "Chưa chính xác"}
              </strong>
            </p>
            <p>
              <strong>Đáp án đúng:</strong>{" "}
              {formatAnswer(question, feedback.correctAnswer)}
            </p>
            <h3>Lời giải từng bước</h3>
            <ol>
              {feedback.solutionSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>
              <strong>Giải thích:</strong> {feedback.explanation}
            </p>
            {!feedback.isCorrect ? (
              <p>
                <strong>Gợi ý:</strong> {feedback.hint}
              </p>
            ) : null}
            {pendingState?.xp ? (
              <p
                data-answer-xp-reason={
                  pendingState.xp.zeroXpReason ?? "AWARDED"
                }
              >
                {pendingState.xp.answerXpAwarded > 0
                  ? `Câu này nhận ${pendingState.xp.answerXpAwarded} XP. Tổng hiện tại: ${pendingState.xp.totalXpAfter} XP.`
                  : pendingState.xp.zeroXpReason === "ANSWER_ALREADY_PERSISTED"
                    ? "Câu trả lời này đã được ghi nhận trước đó nên không cộng XP lần nữa."
                    : pendingState.xp.zeroXpReason ===
                        "HISTORICAL_ATTEMPT_NOT_ELIGIBLE"
                      ? "Lượt học này được tạo trước chính sách XP thống nhất nên không nhận XP."
                      : "Câu chưa đúng nên không nhận XP."}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="question-card__actions">
          {feedback ? (
            <Button onClick={continueAfterFeedback}>
              {pendingState?.status === "IN_PROGRESS"
                ? "Câu tiếp theo"
                : "Xem tổng kết lượt học"}
            </Button>
          ) : (
            <>
              {error &&
              !manualRetry &&
              !isSubmitting ? (
                <Button
                  variant="secondary"
                  disabled={isRefreshing}
                  onClick={() => void refreshState()}
                >
                  {isRefreshing ? "Đang tải lại…" : "Tải lại trạng thái"}
                </Button>
              ) : null}
              <Button
                disabled={isSubmitting || isRefreshing || !answer.trim()}
                loading={isSubmitting}
                onClick={() => void submitAnswer()}
              >
                {manualRetry
                    ? "Thử gửi lại"
                    : "Kiểm tra câu trả lời"}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
