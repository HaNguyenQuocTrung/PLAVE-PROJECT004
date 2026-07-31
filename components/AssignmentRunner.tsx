"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { CurriculumVisual } from "@/app/curriculum-preview/CurriculumVisual";
import { createAssignmentRequestGate } from "@/lib/assignments/client-flow";
import {
  parseAssignmentApiError,
  parseAssignmentRunnerStateApiResponse,
  parseAssignmentSubmitApiResponse,
  parseDraftSaveApiResponse,
  type AssignmentRunnerQuestion,
  type AssignmentRunnerState,
} from "@/lib/assignments/contracts";
import { getAssignmentDeadlineText } from "@/lib/assignments/deadline";
import type { PreviewVisualSpec } from "@/lib/curriculum/types";
import { fetchWithClientTimeout } from "@/lib/http/client-request";

type AssignmentRunnerProps = {
  initialState: AssignmentRunnerState;
};

function initialAnswerMap(questions: AssignmentRunnerQuestion[]) {
  return Object.fromEntries(
    questions.map((question) => [
      question.questionId,
      question.draftAnswer ?? "",
    ]),
  );
}

function validAnswer(question: AssignmentRunnerQuestion, answer: string) {
  const normalized = answer.trim().toUpperCase();
  if (question.questionType === "MULTIPLE_CHOICE") {
    return /^[A-D]$/.test(normalized);
  }
  if (question.questionType === "TEXT_INPUT") {
    return answer.trim().length >= 1 && answer.length <= 200;
  }
  return (
    /^-?[0-9]{1,6}$/.test(normalized) &&
    Number(normalized) >= -100000 &&
    Number(normalized) <= 100000
  );
}

function normalizeLocalAnswer(
  question: AssignmentRunnerQuestion,
  answer: string,
) {
  if (question.questionType === "MULTIPLE_CHOICE") {
    return answer.trim().toUpperCase();
  }
  if (question.questionType === "NUMBER_INPUT") {
    return String(Number(answer.trim()));
  }
  return answer
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("vi");
}

export function AssignmentRunner({
  initialState,
}: AssignmentRunnerProps) {
  const router = useRouter();
  const firstUnanswered = initialState.questions.findIndex(
    (question) => question.draftAnswer === null,
  );
  const [currentIndex, setCurrentIndex] = useState(
    firstUnanswered >= 0 ? firstUnanswered : 0,
  );
  const [answers, setAnswers] = useState(() =>
    initialAnswerMap(initialState.questions),
  );
  const [savedAnswers, setSavedAnswers] = useState(() =>
    initialAnswerMap(initialState.questions),
  );
  const [answeredCount, setAnsweredCount] = useState(
    initialState.answeredCount,
  );
  const [revision, setRevision] = useState(initialState.revision);
  const [pendingOperation, setPendingOperation] = useState("");
  const [notice, setNotice] = useState("");
  const gateRef = useRef(createAssignmentRequestGate());
  const feedbackRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idempotencyKeysRef = useRef(new Map<string, string>());
  const currentQuestion = initialState.questions[currentIndex];
  const busy = pendingOperation !== "";
  const canMutate =
    initialState.assignment.effectiveState === "OPEN";
  const deadlineText = getAssignmentDeadlineText(
    initialState.assignment.effectiveState,
    initialState.assignment.dueAt,
    initialState.assignment.serverNow,
  );
  const allAnswered = useMemo(
    () =>
      initialState.questions.every((question) =>
        validAnswer(question, answers[question.questionId] ?? ""),
      ),
    [answers, initialState.questions],
  );

  const focusFeedback = () => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const applyReconciledState = (state: AssignmentRunnerState) => {
    const recovered = initialAnswerMap(state.questions);
    setAnswers(recovered);
    setSavedAnswers(recovered);
    setAnsweredCount(state.answeredCount);
    setRevision(state.revision);
  };

  const reconcile = async () => {
    try {
      const response = await fetchWithClientTimeout(
        "/api/assignments/state",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: initialState.assignment.assignmentId,
        }),
        },
      );
      const payload: unknown = await response.json();
      const state = parseAssignmentRunnerStateApiResponse(payload);
      if (!state) return null;
      applyReconciledState(state);
      return state;
    } catch {
      return null;
    }
  };

  const saveQuestion = async (question: AssignmentRunnerQuestion) => {
    if (!canMutate) {
      setNotice(
        initialState.assignment.effectiveState === "CLOSED"
          ? "Giáo viên đã đóng bài. Em không thể lưu thêm câu trả lời."
          : "Bài tập đã quá hạn. Em không thể lưu thêm câu trả lời.",
      );
      focusFeedback();
      return false;
    }
    const answer = answers[question.questionId] ?? "";
    if (!validAnswer(question, answer)) {
      setNotice(
        question.questionType === "MULTIPLE_CHOICE"
          ? "Vui lòng chọn một đáp án A, B, C hoặc D."
          : question.questionType === "NUMBER_INPUT"
            ? "Vui lòng nhập một số nguyên hợp lệ."
            : "Vui lòng nhập câu trả lời.",
      );
      focusFeedback();
      return false;
    }
    if (
      savedAnswers[question.questionId] ===
      normalizeLocalAnswer(question, answer)
    ) {
      return true;
    }
    if (busy || !gateRef.current.tryStart()) return false;

    setPendingOperation(`SAVE:${question.questionId}`);
    setNotice("");
    try {
      const mutationKey = `SAVE:${question.questionId}:${revision}:${normalizeLocalAnswer(question, answer)}`;
      const idempotencyKey =
        idempotencyKeysRef.current.get(mutationKey) ?? crypto.randomUUID();
      idempotencyKeysRef.current.set(mutationKey, idempotencyKey);
      const response = await fetchWithClientTimeout(
        "/api/assignments/draft",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: initialState.submissionId,
          questionId: question.questionId,
          answer,
          expectedRevision: revision,
          idempotencyKey,
        }),
        },
      );
      const payload: unknown = await response.json();
      const result = parseDraftSaveApiResponse(payload);
      if (!result) {
        const error = parseAssignmentApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể lưu câu trả lời. Vui lòng thử lại.",
        );
        focusFeedback();
        return false;
      }
      setAnswers((current) => ({
        ...current,
        [question.questionId]: result.normalizedAnswer,
      }));
      setSavedAnswers((current) => ({
        ...current,
        [question.questionId]: result.normalizedAnswer,
      }));
      setAnsweredCount(result.answeredCount);
      setRevision(result.revision);
      idempotencyKeysRef.current.delete(mutationKey);
      setNotice("Đã lưu câu trả lời.");
      return true;
    } catch {
      const state = await reconcile();
      const recoveredAnswer = state?.questions.find(
        (item) => item.questionId === question.questionId,
      )?.draftAnswer;
      if (recoveredAnswer) {
        setNotice("Câu trả lời đã được lưu.");
        return true;
      }
      setNotice(
        "Chưa thể xác nhận câu trả lời đã lưu. Vui lòng thử lại.",
      );
      focusFeedback();
      return false;
    } finally {
      setPendingOperation("");
      gateRef.current.reset();
    }
  };

  const navigate = async (direction: -1 | 1) => {
    if (!currentQuestion || busy) return;
    if (!canMutate) {
      setNotice("");
      setCurrentIndex((current) =>
        Math.min(
          initialState.questions.length - 1,
          Math.max(0, current + direction),
        ),
      );
      return;
    }
    const saved = await saveQuestion(currentQuestion);
    if (!saved) return;
    setNotice("");
    setCurrentIndex((current) =>
      Math.min(
        initialState.questions.length - 1,
        Math.max(0, current + direction),
      ),
    );
  };

  const saveCurrent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentQuestion) await saveQuestion(currentQuestion);
  };

  const prepareSubmit = async () => {
    if (!currentQuestion || busy) return;
    if (!canMutate) {
      setNotice(
        initialState.assignment.effectiveState === "CLOSED"
          ? "Giáo viên đã đóng bài. Em không thể nộp bài lúc này."
          : "Bài tập đã quá hạn. Em không thể nộp bài lúc này.",
      );
      focusFeedback();
      return;
    }
    const saved = await saveQuestion(currentQuestion);
    if (!saved) return;
    if (!allAnswered) {
      setNotice("Em cần trả lời đủ các câu trước khi nộp bài.");
      focusFeedback();
      return;
    }
    dialogRef.current?.showModal();
  };

  const submit = async () => {
    if (busy || !gateRef.current.tryStart()) return;
    setPendingOperation("SUBMIT");
    setNotice("");
    try {
      const mutationKey = `SUBMIT:${revision}`;
      const idempotencyKey =
        idempotencyKeysRef.current.get(mutationKey) ?? crypto.randomUUID();
      idempotencyKeysRef.current.set(mutationKey, idempotencyKey);
      const response = await fetchWithClientTimeout(
        "/api/assignments/submit",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: initialState.submissionId,
          expectedRevision: revision,
          idempotencyKey,
        }),
        },
      );
      const payload: unknown = await response.json();
      const result = parseAssignmentSubmitApiResponse(payload);
      if (!result) {
        const error = parseAssignmentApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể nộp bài. Vui lòng kiểm tra lại.",
        );
        dialogRef.current?.close();
        focusFeedback();
        return;
      }
      dialogRef.current?.close();
      setRevision(result.revision);
      idempotencyKeysRef.current.delete(mutationKey);
      router.push(
        `/assignments/${initialState.assignment.assignmentId}/review`,
      );
      router.refresh();
    } catch {
      const state = await reconcile();
      if (state?.submissionStatus === "SUBMITTED") {
        router.push(
          `/assignments/${initialState.assignment.assignmentId}/review`,
        );
        router.refresh();
      } else {
        setNotice(
          "Chưa thể xác nhận trạng thái nộp bài. Vui lòng kiểm tra lại trước khi thử.",
        );
        dialogRef.current?.close();
        focusFeedback();
      }
    } finally {
      setPendingOperation("");
      gateRef.current.reset();
    }
  };

  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.questionId] ?? "";
  const progress = Math.round(
    (answeredCount / initialState.totalCount) * 100,
  );

  return (
    <div className="assignment-runner">
      <header className="assignment-runner__header">
        <div>
          <p className="eyebrow">{initialState.assignment.classroomName}</p>
          <h1>{initialState.assignment.title}</h1>
          <p>
            Giáo viên {initialState.assignment.teacherDisplayName}
            {initialState.assignment.instructions
              ? ` · ${initialState.assignment.instructions}`
              : ""}
          </p>
          <p className="assignment-deadline-copy">
            <strong>{deadlineText.exact}</strong>
            <span>{deadlineText.remaining}</span>
          </p>
        </div>
        <strong>
          Đã lưu {answeredCount}/{initialState.totalCount} câu
        </strong>
      </header>

      {!canMutate ? (
        <div className="assignment-locked-notice" role="status">
          <strong>
            {initialState.assignment.effectiveState === "CLOSED"
              ? "Giáo viên đã đóng bài"
              : "Bài tập đã quá hạn"}
          </strong>
          <p>
            Bản nháp đã lưu vẫn được giữ nguyên, nhưng em không thể sửa hoặc
            nộp thêm cho đến khi giáo viên mở lại bài.
          </p>
        </div>
      ) : null}

      <div
        className="practice-progress"
        role="progressbar"
        aria-label="Tiến độ lưu câu trả lời"
        aria-valuemin={0}
        aria-valuemax={initialState.totalCount}
        aria-valuenow={answeredCount}
        aria-valuetext={`${answeredCount} trên ${initialState.totalCount} câu đã lưu`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <form
        className="assignment-question-card"
        onSubmit={saveCurrent}
        noValidate
        aria-busy={busy}
        aria-describedby="assignment-runner-feedback"
      >
        <p>
          Câu {currentIndex + 1}/{initialState.totalCount}
        </p>
        <h2>{currentQuestion.prompt}</h2>

        {currentQuestion.visual ? (
          <div className="assignment-question-visual">
            <CurriculumVisual
              spec={currentQuestion.visual as PreviewVisualSpec}
            />
          </div>
        ) : null}

        {currentQuestion.questionType === "MULTIPLE_CHOICE" &&
        currentQuestion.options ? (
          <fieldset className="assignment-answer-options">
            <legend>Chọn một đáp án</legend>
            {(["A", "B", "C", "D"] as const).map((key) => (
              <label key={key}>
                <input
                  type="radio"
                  name={`answer-${currentQuestion.questionId}`}
                  value={key}
                  checked={currentAnswer === key}
                  onChange={() => {
                    setAnswers((current) => ({
                      ...current,
                      [currentQuestion.questionId]: key,
                    }));
                    setNotice("");
                  }}
                  disabled={busy || !canMutate}
                />
                <strong>{key}</strong>
                <span>{currentQuestion.options?.[key]}</span>
              </label>
            ))}
          </fieldset>
        ) : currentQuestion.questionType === "NUMBER_INPUT" ? (
          <label className="assignment-number-answer">
            Câu trả lời số nguyên
            <input
              type="number"
              min={-100000}
              max={100000}
              step={1}
              value={currentAnswer}
              onChange={(event) => {
                setAnswers((current) => ({
                  ...current,
                  [currentQuestion.questionId]: event.target.value,
                }));
                setNotice("");
              }}
              disabled={busy || !canMutate}
              required
            />
          </label>
        ) : (
          <label className="assignment-number-answer">
            Câu trả lời
            <input
              type="text"
              maxLength={200}
              value={currentAnswer}
              onChange={(event) => {
                setAnswers((current) => ({
                  ...current,
                  [currentQuestion.questionId]: event.target.value,
                }));
                setNotice("");
              }}
              disabled={busy || !canMutate}
              required
            />
          </label>
        )}

        <div className="assignment-runner__save">
          <Button
            type="submit"
            variant="secondary"
            disabled={busy || !canMutate}
          >
            {pendingOperation === `SAVE:${currentQuestion.questionId}`
              ? "Đang lưu…"
              : "Lưu nháp"}
          </Button>
          <span>
            {savedAnswers[currentQuestion.questionId]
              ? "Câu này đã được lưu."
              : "Câu này chưa được lưu."}
          </span>
        </div>
      </form>

      <div
        id="assignment-runner-feedback"
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
      >
        {notice ? (
          <p
            className={
              notice.startsWith("Đã lưu") ||
              notice.startsWith("Câu trả lời đã")
                ? "form-success"
                : "form-error-box"
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <div className="assignment-runner__navigation">
        <Button
          variant="secondary"
          disabled={busy || currentIndex === 0}
          onClick={() => void navigate(-1)}
        >
          Câu trước
        </Button>
        {currentIndex < initialState.questions.length - 1 ? (
          <Button disabled={busy} onClick={() => void navigate(1)}>
            Câu tiếp theo
          </Button>
        ) : (
          <Button
            disabled={busy || !canMutate}
            onClick={() => void prepareSubmit()}
          >
            Kiểm tra và nộp bài
          </Button>
        )}
      </div>

      <dialog
        className="connection-dialog"
        ref={dialogRef}
        onClose={() => undefined}
      >
        <h2>Nộp bài tập?</h2>
        <p>
          Sau khi nộp, em không thể sửa câu trả lời. Điểm và lời giải sẽ xuất
          hiện ngay sau khi hệ thống chấm xong.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => dialogRef.current?.close()}
          >
            Xem lại
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            {pendingOperation === "SUBMIT"
              ? "Đang nộp bài…"
              : "Xác nhận nộp bài"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
