"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { createAssignmentRequestGate } from "@/lib/assignments/client-flow";
import {
  parseArchivedQuestionApiResponse,
  parseAssignmentApiError,
  parseCreatedQuestionApiResponse,
  parseRestoredQuestionApiResponse,
  type AssignmentQuestionType,
  type TeacherQuestion,
} from "@/lib/assignments/contracts";
import { fetchWithClientTimeout } from "@/lib/http/client-request";

type TeacherQuestionLibraryManagerProps = {
  initialQuestions: TeacherQuestion[];
};

const emptyOptions = { A: "", B: "", C: "", D: "" };

export function TeacherQuestionLibraryManager({
  initialQuestions,
}: TeacherQuestionLibraryManagerProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [grade, setGrade] = useState("1");
  const [questionType, setQuestionType] =
    useState<AssignmentQuestionType>("MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(emptyOptions);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [stepOne, setStepOne] = useState("");
  const [stepTwo, setStepTwo] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingOperation, setPendingOperation] = useState("");
  const [questionToArchive, setQuestionToArchive] =
    useState<TeacherQuestion | null>(null);
  const gateRef = useRef(createAssignmentRequestGate());
  const requestIdRef = useRef<string | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const archiveDialogRef = useRef<HTMLDialogElement>(null);
  const busy = pendingOperation !== "";

  const focusFeedback = () => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !gateRef.current.tryStart()) return;
    setPendingOperation("CREATE");
    setNotice("");
    requestIdRef.current ??= crypto.randomUUID();

    const parsedGrade = Number(grade);
    const normalizedOptions =
      questionType === "MULTIPLE_CHOICE"
        ? {
            A: options.A.trim(),
            B: options.B.trim(),
            C: options.C.trim(),
            D: options.D.trim(),
          }
        : null;
    const payload = {
      grade: parsedGrade,
      questionType,
      prompt,
      options: normalizedOptions,
      correctAnswer,
      solutionSteps: [stepOne, stepTwo],
      explanation,
      requestId: requestIdRef.current,
    };

    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/questions/create",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        },
      );
      const body: unknown = await response.json();
      const question = parseCreatedQuestionApiResponse(body);
      if (!question) {
        const error = parseAssignmentApiError(body);
        setNotice(
          error?.message ??
            "Chưa thể lưu câu hỏi. Vui lòng kiểm tra lại các trường.",
        );
        focusFeedback();
        return;
      }

      setQuestions((current) => [
        question,
        ...current.filter(
          (item) => item.questionId !== question.questionId,
        ),
      ]);
      setPrompt("");
      setOptions(emptyOptions);
      setCorrectAnswer(questionType === "MULTIPLE_CHOICE" ? "A" : "");
      setStepOne("");
      setStepTwo("");
      setExplanation("");
      requestIdRef.current = null;
      setNotice("Câu hỏi đã được lưu vào kho riêng của bạn.");
      focusFeedback();
      router.refresh();
    } catch {
      setNotice(
        "Chưa thể xác nhận kết quả lưu. Bạn có thể thử lại mà không tạo câu trùng.",
      );
      focusFeedback();
    } finally {
      setPendingOperation("");
      gateRef.current.reset();
    }
  };

  const archive = async (question: TeacherQuestion) => {
    if (busy || !gateRef.current.tryStart()) return;
    setPendingOperation(`ARCHIVE:${question.questionId}`);
    setNotice("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/questions/archive",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.questionId }),
        },
      );
      const body: unknown = await response.json();
      if (!parseArchivedQuestionApiResponse(body)) {
        const error = parseAssignmentApiError(body);
        setNotice(
          error?.message ??
            "Chưa thể ngừng sử dụng câu hỏi. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }
      setQuestions((current) =>
        current.map((item) =>
          item.questionId === question.questionId
            ? { ...item, status: "ARCHIVED" }
            : item,
        ),
      );
      archiveDialogRef.current?.close();
      setQuestionToArchive(null);
      setNotice(
        "Câu hỏi đã ngừng sử dụng. Bạn có thể khôi phục khi cần giao lại.",
      );
      router.refresh();
    } catch {
      setNotice(
        "Chưa thể xác nhận trạng thái câu hỏi. Vui lòng tải lại trang.",
      );
      focusFeedback();
    } finally {
      setPendingOperation("");
      gateRef.current.reset();
    }
  };

  const restore = async (question: TeacherQuestion) => {
    if (busy || !gateRef.current.tryStart()) return;
    setPendingOperation(`RESTORE:${question.questionId}`);
    setNotice("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/questions/restore",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.questionId }),
        },
      );
      const body: unknown = await response.json();
      if (!parseRestoredQuestionApiResponse(body)) {
        const error = parseAssignmentApiError(body);
        setNotice(
          error?.message ??
            "Chưa thể khôi phục câu hỏi. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }
      setQuestions((current) =>
        current.map((item) =>
          item.questionId === question.questionId
            ? { ...item, status: "ACTIVE" }
            : item,
        ),
      );
      setNotice(
        "Câu hỏi đã được khôi phục và có thể chọn khi giao bài.",
      );
      focusFeedback();
      router.refresh();
    } catch {
      setNotice(
        "Chưa thể xác nhận trạng thái câu hỏi. Vui lòng tải lại trang.",
      );
      focusFeedback();
    } finally {
      setPendingOperation("");
      gateRef.current.reset();
    }
  };

  return (
    <div className="teacher-question-manager">
      <section
        className="assignment-editor-card"
        aria-labelledby="question-editor-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Câu hỏi mới</p>
          <h2 id="question-editor-title">Thêm vào kho câu hỏi</h2>
          <p>Đáp án và lời giải chỉ được học sinh xem sau khi nộp bài.</p>
        </div>

        <form
          className="assignment-form"
          onSubmit={submit}
          noValidate
          aria-busy={busy}
          aria-describedby="teacher-question-feedback"
        >
          <div className="assignment-form__row">
            <label>
              Khối lớp
              <select
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                disabled={busy}
              >
                {Array.from({ length: 9 }, (_, index) => index + 1).map(
                  (item) => (
                    <option key={item} value={item}>
                      Lớp {item}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Dạng câu hỏi
              <select
                value={questionType}
                onChange={(event) => {
                  const type =
                    event.target.value === "NUMBER_INPUT"
                      ? "NUMBER_INPUT"
                      : "MULTIPLE_CHOICE";
                  setQuestionType(type);
                  setCorrectAnswer(
                    type === "MULTIPLE_CHOICE" ? "A" : "",
                  );
                }}
                disabled={busy}
              >
                <option value="MULTIPLE_CHOICE">Trắc nghiệm A–D</option>
                <option value="NUMBER_INPUT">Nhập số nguyên</option>
              </select>
            </label>
          </div>

          <label>
            Nội dung câu hỏi
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={500}
              required
              disabled={busy}
            />
          </label>

          {questionType === "MULTIPLE_CHOICE" ? (
            <fieldset>
              <legend>Bốn lựa chọn</legend>
              <div className="assignment-options-editor">
                {(["A", "B", "C", "D"] as const).map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      value={options[key]}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      maxLength={200}
                      required
                      disabled={busy}
                    />
                  </label>
                ))}
              </div>
              <label>
                Đáp án đúng
                <select
                  value={correctAnswer}
                  onChange={(event) =>
                    setCorrectAnswer(event.target.value)
                  }
                  disabled={busy}
                >
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          ) : (
            <label>
              Đáp án số nguyên
              <input
                type="number"
                min={-100000}
                max={100000}
                step={1}
                value={correctAnswer}
                onChange={(event) =>
                  setCorrectAnswer(event.target.value)
                }
                required
                disabled={busy}
              />
            </label>
          )}

          <fieldset>
            <legend>Lời giải từng bước</legend>
            <label>
              Bước 1
              <textarea
                value={stepOne}
                onChange={(event) => setStepOne(event.target.value)}
                maxLength={300}
                required
                disabled={busy}
              />
            </label>
            <label>
              Bước 2
              <textarea
                value={stepTwo}
                onChange={(event) => setStepTwo(event.target.value)}
                maxLength={300}
                required
                disabled={busy}
              />
            </label>
          </fieldset>

          <label>
            Giải thích ngắn
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              maxLength={500}
              required
              disabled={busy}
            />
          </label>

          <Button type="submit" disabled={busy}>
            {pendingOperation === "CREATE"
              ? "Đang lưu câu hỏi…"
              : "Lưu câu hỏi"}
          </Button>
        </form>
      </section>

      <div
        id="teacher-question-feedback"
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
        className="assignment-feedback"
      >
        {notice ? (
          <p
            className={
              notice.startsWith("Câu hỏi đã")
                ? "form-success"
                : "form-error-box"
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <section aria-labelledby="question-library-title">
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Thư viện riêng</p>
            <h2 id="question-library-title">Kho câu hỏi của bạn</h2>
          </div>
          <span>{questions.length}</span>
        </div>
        {questions.length ? (
          <ul className="teacher-question-list">
            {questions.map((question) => (
              <li key={question.questionId}>
                <div>
                  <span className="classroom-status">
                    Lớp {question.grade} ·{" "}
                    {question.questionType === "MULTIPLE_CHOICE"
                      ? "Trắc nghiệm"
                      : "Nhập số"}
                  </span>
                  <h3>{question.prompt}</h3>
                  <p>
                    Trạng thái:{" "}
                    {question.status === "ACTIVE"
                      ? "Đang sử dụng"
                      : "Đã ngừng sử dụng"}
                  </p>
                  <details>
                    <summary>Xem đáp án và lời giải</summary>
                    <p>Đáp án: {question.correctAnswer}</p>
                    <ol>
                      {question.solutionSteps.map((step, index) => (
                        <li key={`${question.questionId}-step-${index}`}>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <p>{question.explanation}</p>
                  </details>
                </div>
                {question.status === "ACTIVE" ? (
                  <Button
                    variant="quiet"
                    disabled={busy}
                    onClick={() => {
                      setQuestionToArchive(question);
                      archiveDialogRef.current?.showModal();
                    }}
                  >
                    {pendingOperation ===
                    `ARCHIVE:${question.questionId}`
                      ? "Đang ngừng sử dụng…"
                      : "Ngừng sử dụng"}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void restore(question)}
                  >
                    {pendingOperation ===
                    `RESTORE:${question.questionId}`
                      ? "Đang khôi phục…"
                      : "Khôi phục để giao bài"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>Kho câu hỏi đang trống</h3>
            <p>Tạo câu hỏi đầu tiên để chuẩn bị giao bài.</p>
          </div>
        )}
      </section>

      <dialog
        className="connection-dialog"
        ref={archiveDialogRef}
        onClose={() => setQuestionToArchive(null)}
      >
        <h2>Ngừng sử dụng câu hỏi?</h2>
        <p>
          Câu hỏi sẽ không xuất hiện trong danh sách chọn cho bài tập mới.
          Những bài đã giao vẫn được giữ nguyên. Bạn có thể khôi phục câu hỏi
          sau này.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => archiveDialogRef.current?.close()}
          >
            Quay lại
          </Button>
          <Button
            disabled={busy || !questionToArchive}
            onClick={() => {
              if (questionToArchive) void archive(questionToArchive);
            }}
          >
            {pendingOperation.startsWith("ARCHIVE:")
              ? "Đang ngừng sử dụng…"
              : "Xác nhận ngừng sử dụng"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
