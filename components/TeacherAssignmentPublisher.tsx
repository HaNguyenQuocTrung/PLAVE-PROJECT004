"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { createAssignmentRequestGate } from "@/lib/assignments/client-flow";
import {
  parseAssignmentApiError,
  parsePublishedAssignmentApiResponse,
  parseTeacherQuestionLibraryApiResponse,
  type TeacherQuestion,
} from "@/lib/assignments/contracts";
import type { TeacherClassroomSummary } from "@/lib/classrooms/contracts";
import { fetchWithClientTimeout } from "@/lib/http/client-request";

type TeacherAssignmentPublisherProps = {
  classrooms: TeacherClassroomSummary[];
  questions: TeacherQuestion[];
};

export function TeacherAssignmentPublisher({
  classrooms,
  questions,
}: TeacherAssignmentPublisherProps) {
  const router = useRouter();
  const [questionLibrary, setQuestionLibrary] = useState(questions);
  const [classroomId, setClassroomId] = useState(
    classrooms[0]?.classroomId ?? "",
  );
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshingQuestions, setRefreshingQuestions] = useState(false);
  const gateRef = useRef(createAssignmentRequestGate());
  const requestIdRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const classroom = classrooms.find(
    (item) => item.classroomId === classroomId,
  );
  const availableQuestions = useMemo(
    () =>
      questionLibrary.filter(
        (question) =>
          question.status === "ACTIVE" &&
          question.grade === classroom?.grade,
      ),
    [classroom?.grade, questionLibrary],
  );
  const archivedQuestionsForGrade = useMemo(
    () =>
      questionLibrary.filter(
        (question) =>
          question.status === "ARCHIVED" &&
          question.grade === classroom?.grade,
      ),
    [classroom?.grade, questionLibrary],
  );
  const activeOtherGradeCount = useMemo(
    () =>
      questionLibrary.filter(
        (question) =>
          question.status === "ACTIVE" &&
          question.grade !== classroom?.grade,
      ).length,
    [classroom?.grade, questionLibrary],
  );
  const selectedQuestions = selectedIds
    .map((id) =>
      availableQuestions.find((question) => question.questionId === id),
    )
    .filter((question): question is TeacherQuestion => Boolean(question));

  const focusFeedback = () => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
    setNotice("");
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    setSelectedIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const refreshQuestionLibrary = async () => {
    if (
      pending ||
      refreshingQuestions ||
      !gateRef.current.tryStart()
    ) {
      return;
    }
    setRefreshingQuestions(true);
    setNotice("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/questions",
        {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        },
      );
      const body: unknown = await response.json();
      const library = parseTeacherQuestionLibraryApiResponse(body);
      if (!library) {
        const error = parseAssignmentApiError(body);
        setNotice(
          error?.message ??
            "Chưa thể cập nhật kho câu hỏi. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }
      setQuestionLibrary(library.questions);
      const usableIds = new Set(
        library.questions
          .filter(
            (question) =>
              question.status === "ACTIVE" &&
              question.grade === classroom?.grade,
          )
          .map((question) => question.questionId),
      );
      setSelectedIds((current) =>
        current.filter((questionId) => usableIds.has(questionId)),
      );
      setNotice(
        "Đã cập nhật kho câu hỏi mà không làm mất nội dung bài tập.",
      );
      focusFeedback();
    } catch {
      setNotice(
        "Chưa thể cập nhật kho câu hỏi. Vui lòng thử lại.",
      );
      focusFeedback();
    } finally {
      setRefreshingQuestions(false);
      gateRef.current.reset();
    }
  };

  const openConfirmation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim().replace(/\s+/g, " ");
    if (!classroom || normalizedTitle.length < 3) {
      setNotice("Vui lòng chọn lớp và nhập tiêu đề từ 3 ký tự.");
      focusFeedback();
      return;
    }
    if (selectedIds.length < 1) {
      setNotice("Vui lòng chọn ít nhất một câu hỏi cùng khối lớp.");
      focusFeedback();
      return;
    }
    if (dueAt && Date.parse(dueAt) < Date.now()) {
      setNotice("Hạn nộp phải ở thời điểm hiện tại hoặc tương lai.");
      focusFeedback();
      return;
    }
    dialogRef.current?.showModal();
  };

  const publish = async () => {
    if (pending || !gateRef.current.tryStart() || !classroom) return;
    setPending(true);
    setNotice("");
    requestIdRef.current ??= crypto.randomUUID();

    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/assignments/publish",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId: classroom.classroomId,
          title,
          instructions: instructions.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          questionIds: selectedIds,
          requestId: requestIdRef.current,
        }),
        },
      );
      const body: unknown = await response.json();
      const assignment = parsePublishedAssignmentApiResponse(body);
      if (!assignment) {
        const error = parseAssignmentApiError(body);
        setNotice(
          error?.message ??
            "Chưa thể giao bài. Vui lòng kiểm tra và thử lại.",
        );
        dialogRef.current?.close();
        focusFeedback();
        return;
      }

      requestIdRef.current = null;
      dialogRef.current?.close();
      router.push(
        `/teacher/assignments/${assignment.assignmentId}`,
      );
      router.refresh();
    } catch {
      setNotice(
        "Chưa thể xác nhận kết quả giao bài. Bạn có thể thử lại mà không tạo bài trùng.",
      );
      dialogRef.current?.close();
      focusFeedback();
    } finally {
      setPending(false);
      gateRef.current.reset();
    }
  };

  if (!classrooms.length) {
    return (
      <div className="empty-state empty-state--large">
        <h2>Bạn cần có lớp học trước</h2>
        <p>Tạo lớp và duyệt học sinh trước khi giao bài.</p>
        <Button href="/teacher/classrooms">Quản lý lớp học</Button>
      </div>
    );
  }

  return (
    <div className="assignment-publisher">
      <form
        className="assignment-form assignment-editor-card"
        onSubmit={openConfirmation}
        noValidate
        aria-busy={pending}
        aria-describedby="teacher-assignment-feedback"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Phát hành nguyên tử</p>
          <h1>Giao bài tập mới</h1>
          <p>Sau khi giao, danh sách và thứ tự câu hỏi được giữ nguyên.</p>
        </div>

        <label>
          Lớp học
          <select
            value={classroomId}
            onChange={(event) => {
              setClassroomId(event.target.value);
              setSelectedIds([]);
              setNotice("");
            }}
            disabled={pending}
          >
            {classrooms.map((item) => (
              <option key={item.classroomId} value={item.classroomId}>
                {item.name} · Lớp {item.grade}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tiêu đề bài tập
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={3}
            maxLength={120}
            required
            disabled={pending}
          />
        </label>

        <label>
          Hướng dẫn <span>(không bắt buộc)</span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            maxLength={1000}
            disabled={pending}
          />
        </label>

        <label>
          Hạn nộp <span>(không bắt buộc)</span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={pending}
          />
        </label>

        <fieldset>
          <legend>
            Chọn câu hỏi lớp {classroom?.grade ?? ""}
          </legend>
          <div className="assignment-question-picker-actions">
            <Link
              className="button button--secondary"
              href="/teacher/questions"
              target="_blank"
              rel="noreferrer"
            >
              Mở kho câu hỏi ở tab mới
            </Link>
            <Button
              type="button"
              variant="quiet"
              disabled={pending || refreshingQuestions}
              onClick={() => void refreshQuestionLibrary()}
            >
              {refreshingQuestions
                ? "Đang cập nhật…"
                : "Cập nhật danh sách câu hỏi"}
            </Button>
          </div>
          {availableQuestions.length ? (
            <ul className="assignment-question-picker">
              {availableQuestions.map((question) => (
                <li key={question.questionId}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(question.questionId)}
                      onChange={() => toggleQuestion(question.questionId)}
                      disabled={pending}
                    />
                    <span>
                      <strong>{question.prompt}</strong>
                      <small>
                        {question.questionType === "MULTIPLE_CHOICE"
                          ? "Trắc nghiệm"
                          : "Nhập số"}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <h3>Chưa có câu hỏi phù hợp</h3>
              <p>
                Tạo câu hỏi đang hoạt động cho đúng khối lớp trước khi giao bài.
              </p>
              {archivedQuestionsForGrade.length ? (
                <p>
                  Có {archivedQuestionsForGrade.length} câu hỏi lớp{" "}
                  {classroom?.grade} đã ngừng sử dụng. Hãy khôi phục trong kho
                  câu hỏi rồi chọn “Cập nhật danh sách câu hỏi”.
                </p>
              ) : null}
              {activeOtherGradeCount ? (
                <p>
                  Có {activeOtherGradeCount} câu hỏi đang sử dụng nhưng thuộc
                  khối lớp khác.
                </p>
              ) : null}
            </div>
          )}
        </fieldset>

        {selectedQuestions.length ? (
          <section aria-labelledby="selected-question-order">
            <h2 id="selected-question-order">Thứ tự câu đã chọn</h2>
            <ol className="assignment-selected-order">
              {selectedQuestions.map((question, index) => (
                <li key={question.questionId}>
                  <span>{question.prompt}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={pending || index === 0}
                      aria-label={`Đưa câu ${index + 1} lên trước`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={
                        pending || index === selectedQuestions.length - 1
                      }
                      aria-label={`Đưa câu ${index + 1} xuống sau`}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <Button type="submit" disabled={pending}>
          Giao bài
        </Button>
      </form>

      <div
        id="teacher-assignment-feedback"
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
      >
        {notice ? (
          <p
            className={
              notice.startsWith("Đã cập nhật")
                ? "form-success"
                : "form-error-box"
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <dialog
        className="connection-dialog"
        ref={dialogRef}
        onClose={() => undefined}
      >
        <h2>Giao bài tập này?</h2>
        <p>
          Bài gồm {selectedIds.length} câu cho lớp {classroom?.name}. Câu hỏi và
          thứ tự sẽ không được thay đổi âm thầm sau khi phát hành.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
          >
            Xem lại
          </Button>
          <Button disabled={pending} onClick={() => void publish()}>
            {pending ? "Đang giao bài…" : "Xác nhận giao bài"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
