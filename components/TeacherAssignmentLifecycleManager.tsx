"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/Button";
import { createAssignmentRequestGate } from "@/lib/assignments/client-flow";
import {
  parseAssignmentApiError,
  parseAssignmentLifecycleApiResponse,
  type AssignmentLifecycleResult,
} from "@/lib/assignments/contracts";
import { fetchWithClientTimeout } from "@/lib/http/client-request";
import {
  getAssignmentDeadlineText,
  getAssignmentDisplayState,
  getAssignmentStateLabel,
  parseVietnamDateTimeLocal,
  toVietnamDateTimeLocal,
} from "@/lib/assignments/deadline";

type Props = {
  initialAssignment: AssignmentLifecycleResult;
  notStartedCount: number;
  inProgressCount: number;
  submittedCount: number;
};

export function TeacherAssignmentLifecycleManager({
  initialAssignment,
  notStartedCount,
  inProgressCount,
  submittedCount,
}: Props) {
  const router = useRouter();
  const [assignment, setAssignment] = useState(initialAssignment);
  const [deadlineInput, setDeadlineInput] = useState(
    toVietnamDateTimeLocal(initialAssignment.dueAt),
  );
  const [noDeadline, setNoDeadline] = useState(
    initialAssignment.dueAt === null,
  );
  const [reopenDeadline, setReopenDeadline] = useState("");
  const [reopenNoDeadline, setReopenNoDeadline] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [reopenError, setReopenError] = useState("");
  const gateRef = useRef(createAssignmentRequestGate());
  const feedbackRef = useRef<HTMLDivElement>(null);
  const closeDialogRef = useRef<HTMLDialogElement>(null);
  const reopenDialogRef = useRef<HTMLDialogElement>(null);
  const busy = pendingAction !== "";
  const displayState = getAssignmentDisplayState(
    assignment.effectiveState,
    assignment.dueAt,
    assignment.serverNow,
  );
  const deadlineText = getAssignmentDeadlineText(
    assignment.effectiveState,
    assignment.dueAt,
    assignment.serverNow,
  );

  const focusFeedback = () => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const postLifecycle = async (
    body:
      | {
          assignmentId: string;
          action: "CLOSE";
        }
      | {
          assignmentId: string;
          action: "UPDATE_DEADLINE" | "REOPEN";
          dueAt: string | null;
        },
    loadingLabel: string,
  ) => {
    if (busy || !gateRef.current.tryStart()) return false;
    setPendingAction(loadingLabel);
    setNotice("");
    setFieldError("");
    setReopenError("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/assignments/lifecycle",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload: unknown = await response.json();
      const result = parseAssignmentLifecycleApiResponse(payload);
      if (!result) {
        const error = parseAssignmentApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể cập nhật bài tập. Vui lòng thử lại.",
        );
        focusFeedback();
        return false;
      }
      setAssignment(result);
      setDeadlineInput(toVietnamDateTimeLocal(result.dueAt));
      setNoDeadline(result.dueAt === null);
      setNotice("Đã cập nhật bài tập.");
      router.refresh();
      return true;
    } catch {
      setNotice(
        "Chưa thể xác nhận trạng thái bài tập. Vui lòng tải lại trang trước khi thử lại.",
      );
      focusFeedback();
      return false;
    } finally {
      setPendingAction("");
      gateRef.current.reset();
    }
  };

  const updateDeadline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dueAt = noDeadline
      ? null
      : parseVietnamDateTimeLocal(deadlineInput);
    if (!noDeadline && !dueAt) {
      setFieldError(
        "Vui lòng chọn ngày và giờ hợp lệ theo giờ Việt Nam.",
      );
      return;
    }
    await postLifecycle(
      {
        assignmentId: assignment.assignmentId,
        action: "UPDATE_DEADLINE",
        dueAt,
      },
      "UPDATE_DEADLINE",
    );
  };

  const closeAssignment = async () => {
    const updated = await postLifecycle(
      {
        assignmentId: assignment.assignmentId,
        action: "CLOSE",
      },
      "CLOSE",
    );
    if (updated) closeDialogRef.current?.close();
  };

  const reopenAssignment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const dueAt = reopenNoDeadline
      ? null
      : parseVietnamDateTimeLocal(reopenDeadline);
    if (!reopenNoDeadline && !dueAt) {
      setReopenError(
        "Hãy chọn hạn nộp mới trong tương lai hoặc chọn không giới hạn thời gian.",
      );
      return;
    }
    const updated = await postLifecycle(
      {
        assignmentId: assignment.assignmentId,
        action: "REOPEN",
        dueAt,
      },
      "REOPEN",
    );
    if (updated) {
      reopenDialogRef.current?.close();
      setReopenDeadline("");
      setReopenNoDeadline(false);
    }
  };

  return (
    <section
      className="assignment-lifecycle-card"
      aria-labelledby="assignment-lifecycle-title"
      aria-busy={busy}
    >
      <div className="classroom-section-heading">
        <div>
          <p className="eyebrow">Vận hành bài tập</p>
          <h2 id="assignment-lifecycle-title">
            Hạn nộp và trạng thái
          </h2>
        </div>
        <span
          className={`assignment-state assignment-state--${displayState.toLowerCase()}`}
        >
          {getAssignmentStateLabel(displayState)}
        </span>
      </div>

      <div className="assignment-lifecycle-metrics">
        <div>
          <span>Chưa bắt đầu</span>
          <strong>{notStartedCount}</strong>
        </div>
        <div>
          <span>Đang làm</span>
          <strong>{inProgressCount}</strong>
        </div>
        <div>
          <span>Đã nộp</span>
          <strong>{submittedCount}</strong>
        </div>
      </div>

      <div className="assignment-deadline-summary">
        <strong>{deadlineText.exact}</strong>
        <span>{deadlineText.remaining}</span>
        <small>Mọi thời gian được hiểu theo giờ Việt Nam.</small>
      </div>

      <form
        className="assignment-deadline-form"
        onSubmit={(event) => void updateDeadline(event)}
        noValidate
      >
        <label htmlFor="assignment-deadline">
          Thay đổi hạn nộp
          <input
            id="assignment-deadline"
            type="datetime-local"
            value={deadlineInput}
            onChange={(event) => {
              setDeadlineInput(event.target.value);
              setFieldError("");
            }}
            disabled={busy || noDeadline}
            aria-describedby={
              fieldError ? "assignment-deadline-error" : undefined
            }
          />
        </label>
        <label className="assignment-deadline-checkbox">
          <input
            type="checkbox"
            checked={noDeadline}
            onChange={(event) => {
              setNoDeadline(event.target.checked);
              setFieldError("");
            }}
            disabled={busy}
          />
          Không giới hạn thời gian
        </label>
        <Button type="submit" disabled={busy}>
          {pendingAction === "UPDATE_DEADLINE"
            ? "Đang lưu hạn nộp…"
            : "Lưu hạn nộp"}
        </Button>
      </form>

      {fieldError ? (
        <p
          id="assignment-deadline-error"
          className="field__error"
          role="alert"
        >
          {fieldError}
        </p>
      ) : null}

      <div className="assignment-lifecycle-actions">
        {assignment.status === "PUBLISHED" ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => closeDialogRef.current?.showModal()}
          >
            Đóng bài
          </Button>
        ) : null}
        {assignment.effectiveState !== "OPEN" ? (
          <Button
            disabled={busy}
            onClick={() => reopenDialogRef.current?.showModal()}
          >
            Mở lại bài
          </Button>
        ) : null}
        <a
          className="button button--quiet"
          href={`/api/teacher/assignments/${assignment.assignmentId}/gradebook.csv`}
        >
          Xuất bảng điểm CSV
        </a>
      </div>

      <div
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
        ref={closeDialogRef}
      >
        <h2>Đóng bài ngay?</h2>
        <p>
          Học sinh chưa nộp sẽ không thể bắt đầu, lưu nháp hoặc nộp tiếp.
          Các kết quả đã nộp vẫn được giữ nguyên.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => closeDialogRef.current?.close()}
          >
            Quay lại
          </Button>
          <Button disabled={busy} onClick={() => void closeAssignment()}>
            {pendingAction === "CLOSE"
              ? "Đang đóng bài…"
              : "Xác nhận đóng bài"}
          </Button>
        </div>
      </dialog>

      <dialog
        className="connection-dialog assignment-reopen-dialog"
        ref={reopenDialogRef}
      >
        <form onSubmit={(event) => void reopenAssignment(event)}>
          <h2>Mở lại bài tập</h2>
          <p>
            Chọn hạn nộp mới trong tương lai hoặc chủ động bỏ giới hạn thời
            gian.
          </p>
          <label htmlFor="assignment-reopen-deadline">
            Hạn nộp mới
            <input
              id="assignment-reopen-deadline"
              type="datetime-local"
              value={reopenDeadline}
              onChange={(event) => {
                setReopenDeadline(event.target.value);
                setReopenError("");
              }}
              disabled={busy || reopenNoDeadline}
              aria-describedby={
                reopenError ? "assignment-reopen-error" : undefined
              }
            />
          </label>
          <label className="assignment-deadline-checkbox">
            <input
              type="checkbox"
              checked={reopenNoDeadline}
              onChange={(event) => {
                setReopenNoDeadline(event.target.checked);
                setReopenError("");
              }}
              disabled={busy}
            />
            Không giới hạn thời gian
          </label>
          {reopenError ? (
            <p
              id="assignment-reopen-error"
              className="field__error"
              role="alert"
            >
              {reopenError}
            </p>
          ) : null}
          <div className="connection-dialog__actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => reopenDialogRef.current?.close()}
            >
              Quay lại
            </Button>
            <Button type="submit" disabled={busy}>
              {pendingAction === "REOPEN"
                ? "Đang mở lại…"
                : "Xác nhận mở lại"}
            </Button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
