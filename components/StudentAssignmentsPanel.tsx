"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/Button";
import { createAssignmentRequestGate } from "@/lib/assignments/client-flow";
import {
  parseAssignmentApiError,
  parseAssignmentRunnerStateApiResponse,
  parseAssignmentStartApiResponse,
  type StudentAssignmentSummary,
} from "@/lib/assignments/contracts";
import { getAssignmentDeadlineText } from "@/lib/assignments/deadline";

type StudentAssignmentsPanelProps = {
  assignments: StudentAssignmentSummary[];
  compact?: boolean;
};

export function StudentAssignmentsPanel({
  assignments,
  compact = false,
}: StudentAssignmentsPanelProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
  const [notice, setNotice] = useState("");
  const gateRef = useRef(createAssignmentRequestGate());
  const feedbackRef = useRef<HTMLDivElement>(null);

  const focusFeedback = () => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const reconcile = async (assignmentId: string) => {
    try {
      const response = await fetch("/api/assignments/state", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const payload: unknown = await response.json();
      const state = parseAssignmentRunnerStateApiResponse(payload);
      if (!state) return false;
      router.push(
        state.submissionStatus === "SUBMITTED"
          ? `/assignments/${assignmentId}/review`
          : `/assignments/${assignmentId}`,
      );
      return true;
    } catch {
      return false;
    }
  };

  const start = async (assignment: StudentAssignmentSummary) => {
    if (
      assignment.submissionStatus !== "SUBMITTED" &&
      assignment.effectiveState !== "OPEN"
    ) {
      setNotice(
        assignment.effectiveState === "CLOSED"
          ? "Giáo viên đã đóng bài tập này."
          : "Bài tập đã quá hạn nộp.",
      );
      focusFeedback();
      return;
    }
    if (pendingId || !gateRef.current.tryStart()) return;
    setPendingId(assignment.assignmentId);
    setNotice("");
    let navigationStarted = false;
    try {
      const response = await fetch("/api/assignments/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.assignmentId }),
      });
      const payload: unknown = await response.json();
      const result = parseAssignmentStartApiResponse(payload);
      if (!result) {
        const error = parseAssignmentApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể mở bài tập. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }
      router.push(
        result.status === "SUBMITTED"
          ? `/assignments/${assignment.assignmentId}/review`
          : `/assignments/${assignment.assignmentId}`,
      );
      navigationStarted = true;
    } catch {
      const recovered = await reconcile(assignment.assignmentId);
      navigationStarted = recovered;
      if (!navigationStarted) {
        setNotice(
          "Chưa thể xác nhận trạng thái bài tập. Vui lòng thử tải lại trang.",
        );
        focusFeedback();
      }
    } finally {
      if (!navigationStarted) {
        setPendingId("");
        gateRef.current.reset();
      }
    }
  };

  const shownAssignments = compact ? assignments.slice(0, 3) : assignments;

  return (
    <div
      className={compact ? "assignment-panel--compact" : "assignment-panel"}
      aria-busy={Boolean(pendingId)}
    >
      <div ref={feedbackRef} tabIndex={-1} aria-live="polite">
        {notice ? (
          <p className="form-error-box" role="alert">
            {notice}
          </p>
        ) : null}
      </div>

      {!compact ? (
        <div className="section-heading section-heading--compact assignment-panel__heading">
          <p className="eyebrow">Danh sách của em</p>
          <h2>Bài tập hiện tại</h2>
          <p>Mở bài đang làm hoặc bắt đầu khi giáo viên đã giao bài.</p>
        </div>
      ) : null}

      {shownAssignments.length ? (
        <ul className="student-assignment-list">
          {shownAssignments.map((assignment) => (
            <li key={assignment.assignmentId}>
              <div>
                <span className="classroom-status">
                  {assignment.submissionStatus === "NOT_STARTED"
                    ? "Chưa bắt đầu"
                    : assignment.submissionStatus === "IN_PROGRESS"
                      ? "Đang làm"
                      : "Đã nộp"}
                </span>
                <h3>{assignment.title}</h3>
                <p>
                  {assignment.classroomName} · Giáo viên{" "}
                  {assignment.teacherDisplayName}
                </p>
                <p>
                  {assignment.answeredCount}/{assignment.totalCount} câu
                </p>
                <p className="assignment-deadline-copy">
                  <strong>
                    {
                      getAssignmentDeadlineText(
                        assignment.effectiveState,
                        assignment.dueAt,
                        assignment.serverNow,
                      ).exact
                    }
                  </strong>
                  <span>
                    {
                      getAssignmentDeadlineText(
                        assignment.effectiveState,
                        assignment.dueAt,
                        assignment.serverNow,
                      ).remaining
                    }
                  </span>
                </p>
                {assignment.submissionStatus === "SUBMITTED" ? (
                  <strong>
                    Kết quả: {assignment.correctCount}/
                    {assignment.totalCount} câu đúng
                  </strong>
                ) : null}
              </div>
              {assignment.submissionStatus === "SUBMITTED" ? (
                <Link
                  className="button button--primary"
                  href={`/assignments/${assignment.assignmentId}/review`}
                >
                  Xem kết quả
                </Link>
              ) : (
                <Button
                  disabled={
                    Boolean(pendingId) ||
                    assignment.effectiveState !== "OPEN"
                  }
                  onClick={() => start(assignment)}
                >
                  {pendingId === assignment.assignmentId
                    ? "Đang mở bài…"
                    : assignment.effectiveState === "CLOSED"
                      ? "Giáo viên đã đóng bài"
                      : assignment.effectiveState === "OVERDUE"
                        ? "Đã quá hạn"
                    : assignment.submissionStatus === "IN_PROGRESS"
                      ? "Tiếp tục làm bài"
                      : "Bắt đầu làm bài"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h3>Chưa có bài giáo viên giao</h3>
          <p>Bài tập từ các lớp em đã tham gia sẽ xuất hiện tại đây.</p>
        </div>
      )}

      {compact && assignments.length ? (
        <Button href="/assignments" variant="secondary">
          Xem tất cả bài tập
        </Button>
      ) : null}
    </div>
  );
}
