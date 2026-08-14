"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/Button";
import { PracticeVisual } from "@/components/PracticeVisual";
import { ProgressBar } from "@/components/ProgressBar";
import {
  PRACTICE_NUMBER_INPUT_MAX_DIGITS,
  parsePracticeApiError,
  type PracticeQuestion,
  type PracticeReviewAnswer,
  type SubmitPracticeResult,
} from "@/lib/practice/contracts";
import {
  canSubmitPracticeAnswer,
  createSingleFlightGate,
  getAnswerReconciliationFailure,
  getSubmitPracticeResult,
  mergeGradedAnswer,
  normalizePracticeNumberInput,
  readResponseJsonOnce,
  reconcileSubmittedAnswer,
  type GradedAnswer,
} from "@/lib/practice/client-flow";
import { getPracticeReviewPath } from "@/lib/practice/review";
import { xpCompletionReasonText } from "@/lib/scoring/completion";

type PracticeRunnerProps = {
  attemptId: string;
  unitTitle: string;
  questions: PracticeQuestion[];
  initialAnswers: PracticeReviewAnswer[];
  initialAnsweredCount: number;
  initialCorrectCount: number;
};

const optionKeys = ["A", "B", "C", "D"] as const;

function initialGradedAnswers(
  answers: PracticeReviewAnswer[],
  totalQuestions: number,
) {
  const results: Record<string, GradedAnswer> = {};
  for (const answer of answers) {
    results[answer.questionId] = {
      studentAnswer: answer.studentAnswer,
      isCorrect: answer.isCorrect,
      correctAnswer: answer.correctAnswer,
      solutionSteps: answer.solutionSteps,
      explanation: answer.explanation,
      hint: answer.hint,
      answeredCount: answers.length,
      correctCount: answers.filter((item) => item.isCorrect).length,
      completed: answers.length === totalQuestions,
    };
  }
  return results;
}

function formatAnswer(question: PracticeQuestion, answer: string) {
  if (question.questionType === "MULTIPLE_CHOICE" && question.options) {
    const key = optionKeys.find((optionKey) => optionKey === answer);
    if (key) return `${key} — ${question.options[key]}`;
  }
  return answer;
}

export function PracticeRunner({
  attemptId,
  unitTitle,
  questions,
  initialAnswers,
  initialAnsweredCount,
  initialCorrectCount,
}: PracticeRunnerProps) {
  const router = useRouter();
  const [requestGate] = useState(createSingleFlightGate);
  const questionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const initialResults = useMemo(
    () => initialGradedAnswers(initialAnswers, questions.length),
    [initialAnswers, questions.length],
  );
  const [results, setResults] =
    useState<Record<string, GradedAnswer>>(initialResults);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialAnswers.map((answer) => [
        answer.questionId,
        answer.studentAnswer,
      ]),
    ),
  );
  const [questionIndex, setQuestionIndex] = useState(() => {
    const firstUnanswered = questions.findIndex(
      (question) => !initialResults[question.code],
    );
    return firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
  });
  const [answeredCount, setAnsweredCount] = useState(initialAnsweredCount);
  const [correctCount, setCorrectCount] = useState(initialCorrectCount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryAllowed, setRetryAllowed] = useState(true);
  const [showRetryLabel, setShowRetryLabel] = useState(false);
  const [error, setError] = useState("");

  const question = questions[questionIndex];
  const answer = drafts[question.code] ?? "";
  const result = results[question.code];
  const currentOptions = question.options;

  useEffect(() => {
    if (!result) return;
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  }, [question.code, result]);

  const updateAnswer = (value: string) => {
    if (result || isSubmitting) return;
    setDrafts((current) => ({ ...current, [question.code]: value }));
    setRetryAllowed(true);
    setShowRetryLabel(false);
    setError("");
  };

  const applyGradedResult = (
    gradedResult: SubmitPracticeResult,
    studentAnswer: string,
  ) => {
    setResults((current) =>
      mergeGradedAnswer(
        current,
        question.code,
        studentAnswer,
        gradedResult,
      ).results,
    );
    setAnsweredCount(gradedResult.answeredCount);
    setCorrectCount(gradedResult.correctCount);
    setRetryAllowed(false);
    setShowRetryLabel(false);
    setError("");
  };

  const submitAnswer = () => {
    if (
      !canSubmitPracticeAnswer(
        result,
        requestGate.isActive(),
        retryAllowed,
      )
    ) {
      return;
    }

    let normalizedAnswer = answer.trim();
    if (!normalizedAnswer) {
      setError("Em hãy chọn hoặc nhập một câu trả lời trước khi kiểm tra.");
      return;
    }
    if (question.questionType === "NUMBER_INPUT") {
      const normalizedNumber = normalizePracticeNumberInput(normalizedAnswer);
      if (normalizedNumber === null) {
        setError("Em hãy nhập một số nguyên không âm hợp lệ.");
        return;
      }
      normalizedAnswer = normalizedNumber;
    }

    void requestGate.run(async () => {
      setIsSubmitting(true);
      setShowRetryLabel(false);
      setError("");

      try {
        let apiError: ReturnType<typeof parsePracticeApiError> = null;

        try {
          const response = await fetch("/api/practice/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attemptId,
              questionId: question.code,
              answer: normalizedAnswer,
            }),
          });
          const payload = await readResponseJsonOnce(response);

          if (payload.ok) {
            const parsed = getSubmitPracticeResult(payload.value);
            if (parsed) {
              applyGradedResult(parsed, normalizedAnswer);
              return;
            }
            apiError = parsePracticeApiError(payload.value);
          }
        } catch {
          // Reconcile below without retrying the POST.
        }

        if (apiError?.error.code === "AUTH_REQUIRED") {
          router.push("/login");
          return;
        }

        if (apiError && apiError.error.code !== "REQUEST_FAILED") {
          setRetryAllowed(true);
          setShowRetryLabel(true);
          setError(apiError.error.message);
          return;
        }

        const reconciliation = await reconcileSubmittedAnswer(
          fetch,
          attemptId,
          question.code,
        );
        if (reconciliation.kind === "RECOVERED") {
          applyGradedResult(
            reconciliation.result,
            reconciliation.answer.studentAnswer,
          );
          return;
        }

        const failure = getAnswerReconciliationFailure(reconciliation);
        setRetryAllowed(failure.retryAllowed);
        setShowRetryLabel(failure.retryAllowed);
        setError(failure.message);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const goToNext = () => {
    if (!result) return;
    if (result.completed) {
      router.push(getPracticeReviewPath(attemptId));
      return;
    }

    const followingIndex =
      questionIndex + 1 < questions.length ? questionIndex + 1 : -1;
    const destination =
      followingIndex === -1
        ? questions.findIndex((candidate) => !results[candidate.code])
        : followingIndex;

    if (destination === -1) {
      router.push(getPracticeReviewPath(attemptId));
      return;
    }

    setQuestionIndex(destination);
    setError("");
    window.requestAnimationFrame(() => questionRef.current?.focus());
  };

  const goToPrevious = () => {
    if (questionIndex === 0 || isSubmitting) return;
    setQuestionIndex((current) => current - 1);
    setError("");
    window.requestAnimationFrame(() => questionRef.current?.focus());
  };

  return (
    <section className="practice-runner" aria-labelledby="practice-runner-title">
      <div className="practice-brandline">
        <Link href="/lessons" aria-label="PLAVE — trở về bài học">PLAVE</Link>
        <span>Không gian luyện tập</span>
        <Button href="/lessons" variant="tertiary">Thoát bài</Button>
      </div>
      <div className="practice-runner__header">
        <div>
          <p className="eyebrow">Luyện tập</p>
          <h1 id="practice-runner-title">{unitTitle}</h1>
        </div>
        <div className="practice-progress-summary">
          <ProgressBar
            value={answeredCount}
            total={questions.length}
            label="Số câu đã làm"
          />
          <p className="practice-live-score" aria-live="polite">
            Đã làm {answeredCount}/{questions.length} câu · Đúng {correctCount} câu
          </p>
        </div>
      </div>

      <div className="real-question-card" ref={questionRef} tabIndex={-1}>
        <p className="question-count">
          Câu {questionIndex + 1}/{questions.length}
        </p>

        {question.questionType === "MULTIPLE_CHOICE" && currentOptions ? (
          <>
            <h2 className="real-question-card__prompt" id="choice-prompt">{question.prompt}</h2>
            {question.visualSpec ? <PracticeVisual spec={question.visualSpec} /> : null}
            <fieldset
              className="demo-question"
              aria-labelledby="choice-prompt"
              aria-describedby={error ? "practice-answer-error" : undefined}
              aria-invalid={Boolean(error)}
            >
            <legend className="sr-only">Chọn một đáp án</legend>
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
                    name={`answer-${question.code}`}
                    value={optionKey}
                    checked={answer === optionKey}
                    disabled={Boolean(result) || isSubmitting}
                    onChange={() => updateAnswer(optionKey)}
                  />
                  <span className="choice__label" aria-hidden="true">
                    {optionKey}
                  </span>
                  <span>{currentOptions[optionKey]}</span>
                </label>
              ))}
            </div>
            </fieldset>
          </>
        ) : (
          <div>
            <h2 className="real-question-card__prompt" id="number-prompt">
              {question.prompt}
            </h2>
            {question.visualSpec ? <PracticeVisual spec={question.visualSpec} /> : null}
            <label className="number-answer" htmlFor="number-answer">
              Câu trả lời của em
              <input
                id="number-answer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={PRACTICE_NUMBER_INPUT_MAX_DIGITS}
                value={answer}
                disabled={Boolean(result) || isSubmitting}
                aria-describedby={error ? "practice-answer-error" : undefined}
                aria-invalid={Boolean(error)}
                onChange={(event) => updateAnswer(event.target.value)}
              />
            </label>
          </div>
        )}

        {error ? (
          <p
            className="question-error"
            id="practice-answer-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <div
            ref={feedbackRef}
            className={`feedback ${
              result.isCorrect
                ? "feedback--correct"
                : "feedback--incorrect"
            }`}
            aria-live="polite"
            tabIndex={-1}
          >
            <p className="feedback__status">
              <span aria-hidden="true">{result.isCorrect ? "✓" : "!"}</span>
              <strong>
                {result.isCorrect ? "Chính xác" : "Chưa chính xác"}
              </strong>
            </p>
            <p>
              <strong>Đáp án đúng:</strong>{" "}
              {formatAnswer(question, result.correctAnswer)}
            </p>
            <h3>Lời giải từng bước</h3>
            <ol>
              {result.solutionSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>
              <strong>Giải thích:</strong> {result.explanation}
            </p>
            {!result.isCorrect ? (
              <p>
                <strong>Gợi ý:</strong> {result.hint}
              </p>
            ) : null}
            {result.completed && result.xpCompletion ? (
              <div className="scoring-result" role="status">
                <div>
                  <span>XP lượt này</span>
                  <strong>{result.xpCompletion.attemptXpEarned} XP</strong>
                </div>
                <div>
                  <span>Tổng XP sau lượt này</span>
                  <strong>{result.xpCompletion.totalXpAfter} XP</strong>
                </div>
                <p data-xp-completion-reason={result.xpCompletion.reason}>
                  {xpCompletionReasonText(result.xpCompletion.reason)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="question-card__actions">
          {questionIndex > 0 ? (
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={goToPrevious}
            >
              Câu trước
            </Button>
          ) : null}
          {result ? (
            <Button onClick={goToNext}>
              {result.completed ? "Xem kết quả" : "Câu tiếp theo"}
            </Button>
          ) : (
            <Button
              disabled={isSubmitting || !retryAllowed || !answer.trim()}
              loading={isSubmitting}
              onClick={submitAnswer}
            >
              {showRetryLabel ? "Thử lại" : "Kiểm tra câu trả lời"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
