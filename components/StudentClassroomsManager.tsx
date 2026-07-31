"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { createClassroomRequestGate } from "@/lib/classrooms/client-flow";
import {
  classroomCodePattern,
  normalizeClassroomCode,
  parseClassroomApiError,
  parseClassroomApiSuccess,
  parseClassroomPreviewApiResponse,
  type ClassroomPreview,
  type StudentClassroomMembership,
} from "@/lib/classrooms/contracts";
import {
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "@/lib/http/client-request";

type StudentClassroomsManagerProps = {
  initialMemberships: StudentClassroomMembership[];
};

const membershipLabels = {
  PENDING: "Đang chờ giáo viên duyệt",
  APPROVED: "Đã tham gia",
  REJECTED: "Yêu cầu trước đã bị từ chối",
  CANCELLED: "Yêu cầu trước đã được hủy",
  LEFT: "Em đã rời lớp trước đây",
  REMOVED: "Giáo viên đã kết thúc lần tham gia trước",
} as const;

export function StudentClassroomsManager({
  initialMemberships,
}: StudentClassroomsManagerProps) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [classCode, setClassCode] = useState("");
  const [preview, setPreview] = useState<ClassroomPreview | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingOperation, setPendingOperation] = useState("");
  const [leaveTarget, setLeaveTarget] =
    useState<StudentClassroomMembership | null>(null);
  const gateRef = useRef(createClassroomRequestGate());
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busy = pendingOperation !== "";
  const pendingMemberships = memberships.filter(
    (membership) => membership.status === "PENDING",
  );
  const approvedMemberships = memberships.filter(
    (membership) => membership.status === "APPROVED",
  );

  const finishRequest = () => {
    setPendingOperation("");
    gateRef.current.reset();
  };

  const focusFeedback = () => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const previewClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !gateRef.current.tryStart()) return;

    const normalizedCode = normalizeClassroomCode(classCode);
    setNotice("");
    setPreview(null);

    if (!classroomCodePattern.test(normalizedCode)) {
      setNotice(
        "Không tìm thấy lớp học phù hợp. Vui lòng kiểm tra lại mã.",
      );
      inputRef.current?.focus();
      finishRequest();
      return;
    }

    setPendingOperation("PREVIEW");
    try {
      const response = await fetchWithClientTimeout(
        "/api/classrooms/preview",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode: normalizedCode }),
        },
      );
      const payload: unknown = await response.json();
      const result = parseClassroomPreviewApiResponse(payload);

      if (!result) {
        const error = parseClassroomApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể tìm lớp học lúc này. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }

      setPreview(result);
      focusFeedback();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CLASSROOM_PREVIEW_TIMEOUT",
          "Chưa thể tìm lớp học lúc này. Vui lòng thử lại.",
        ),
      );
      focusFeedback();
    } finally {
      finishRequest();
    }
  };

  const sendRequest = async () => {
    if (
      !preview ||
      preview.membershipStatus === "PENDING" ||
      preview.membershipStatus === "APPROVED" ||
      busy ||
      !gateRef.current.tryStart()
    ) {
      return;
    }

    setPendingOperation("REQUEST");
    setNotice("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/classrooms/request",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classCode: normalizeClassroomCode(classCode),
        }),
        },
      );
      const payload: unknown = await response.json();
      if (!parseClassroomApiSuccess(payload)) {
        const error = parseClassroomApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể gửi yêu cầu tham gia. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }

      setClassCode("");
      setPreview(null);
      setNotice("Yêu cầu đã được gửi tới giáo viên.");
      router.refresh();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CLASSROOM_REQUEST_TIMEOUT",
          "Chưa thể xác nhận kết quả gửi yêu cầu. Vui lòng tải lại trang trước khi thử lại.",
        ),
      );
      focusFeedback();
    } finally {
      finishRequest();
    }
  };

  const performAction = async (
    membership: StudentClassroomMembership,
    action: "STUDENT_CANCEL" | "STUDENT_LEAVE",
  ) => {
    if (busy || !gateRef.current.tryStart()) return;
    setPendingOperation(`${action}:${membership.membershipId}`);
    setNotice("");

    try {
      const response = await fetchWithClientTimeout(
        "/api/classrooms/action",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: membership.membershipId,
          action,
        }),
        },
      );
      const payload: unknown = await response.json();
      if (!parseClassroomApiSuccess(payload)) {
        const error = parseClassroomApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể cập nhật lớp học. Vui lòng thử lại.",
        );
        focusFeedback();
        return;
      }

      setMemberships((current) =>
        current.filter(
          (item) => item.membershipId !== membership.membershipId,
        ),
      );
      dialogRef.current?.close();
      setLeaveTarget(null);
      router.refresh();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CLASSROOM_ACTION_TIMEOUT",
          "Chưa thể xác nhận kết quả cập nhật. Vui lòng tải lại trang trước khi thử lại.",
        ),
      );
      focusFeedback();
    } finally {
      finishRequest();
    }
  };

  const openLeaveDialog = (
    membership: StudentClassroomMembership,
  ) => {
    setLeaveTarget(membership);
    window.requestAnimationFrame(() => dialogRef.current?.showModal());
  };

  return (
    <div className="student-classrooms-manager">
      <section
        className="classroom-join-card"
        aria-labelledby="classroom-join-title"
      >
        <div>
          <p className="eyebrow">Tham gia có xác nhận</p>
          <h2 id="classroom-join-title">Nhập mã lớp</h2>
          <p>
            Em sẽ xem trước thông tin lớp và gửi yêu cầu. Giáo viên cần đồng ý
            trước khi em tham gia.
          </p>
        </div>
        <form onSubmit={previewClass} noValidate>
          <div className="field">
            <label htmlFor="student-classroom-code">Mã lớp</label>
            <div
              className={`field__control ${
                notice && !preview ? "field__control--error" : ""
              }`}
            >
              <input
                id="student-classroom-code"
                ref={inputRef}
                value={classCode}
                onChange={(event) => {
                  setClassCode(event.target.value.toUpperCase());
                  setPreview(null);
                  setNotice("");
                }}
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                placeholder="PLV-CLS-XXXXXXXXXX"
                disabled={busy}
                aria-invalid={Boolean(notice && !preview)}
                aria-describedby={
                  notice && !preview ? "classroom-feedback" : undefined
                }
              />
            </div>
          </div>
          <Button type="submit" disabled={busy}>
            {pendingOperation === "PREVIEW"
              ? "Đang tìm lớp…"
              : "Kiểm tra mã lớp"}
          </Button>
        </form>

        {preview ? (
          <div className="classroom-preview" role="status">
            <div>
              <span>Thông tin lớp</span>
              <h3>{preview.classroomName}</h3>
              <p>
                Lớp {preview.grade} · Giáo viên{" "}
                {preview.teacherDisplayName}
              </p>
              {preview.membershipStatus ? (
                <small>
                  {membershipLabels[preview.membershipStatus]}
                </small>
              ) : null}
            </div>
            {preview.membershipStatus === "PENDING" ||
            preview.membershipStatus === "APPROVED" ? null : (
              <Button onClick={sendRequest} disabled={busy}>
                {pendingOperation === "REQUEST"
                  ? "Đang gửi yêu cầu…"
                  : "Gửi yêu cầu tham gia"}
              </Button>
            )}
          </div>
        ) : null}
      </section>

      <div
        id="classroom-feedback"
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
      >
        {notice ? (
          <p
            className={
              notice === "Yêu cầu đã được gửi tới giáo viên."
                ? "form-success"
                : "form-error-box"
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </div>

      <section aria-labelledby="student-pending-classes-title">
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Đang chờ</p>
            <h2 id="student-pending-classes-title">Yêu cầu tham gia</h2>
          </div>
          <span>{pendingMemberships.length}</span>
        </div>
        {pendingMemberships.length > 0 ? (
          <ul className="classroom-member-list">
            {pendingMemberships.map((membership) => (
              <li key={membership.membershipId}>
                <div>
                  <span className="classroom-status">Đang chờ giáo viên</span>
                  <h3>{membership.classroomName}</h3>
                  <p>
                    Lớp {membership.grade} · Giáo viên{" "}
                    {membership.teacherDisplayName}
                  </p>
                </div>
                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={() =>
                    performAction(membership, "STUDENT_CANCEL")
                  }
                >
                  {pendingOperation ===
                  `STUDENT_CANCEL:${membership.membershipId}`
                    ? "Đang hủy yêu cầu…"
                    : "Hủy yêu cầu"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>Không có yêu cầu đang chờ</h3>
            <p>Nhập mã lớp để gửi yêu cầu tham gia.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="student-approved-classes-title">
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Đã tham gia</p>
            <h2 id="student-approved-classes-title">Lớp học của em</h2>
          </div>
          <span>{approvedMemberships.length}</span>
        </div>
        {approvedMemberships.length > 0 ? (
          <ul className="classroom-grid">
            {approvedMemberships.map((membership) => (
              <li className="classroom-card" key={membership.membershipId}>
                <div>
                  <span className="classroom-status classroom-status--approved">
                    Đã tham gia
                  </span>
                  <h3>{membership.classroomName}</h3>
                  <p>
                    Lớp {membership.grade} · Giáo viên{" "}
                    {membership.teacherDisplayName}
                  </p>
                </div>
                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={() => openLeaveDialog(membership)}
                >
                  Rời lớp
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>Em chưa tham gia lớp nào</h3>
            <p>Lớp được giáo viên đồng ý sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>

      <dialog
        className="connection-dialog"
        ref={dialogRef}
        onClose={() => setLeaveTarget(null)}
      >
        <h2>Rời lớp học?</h2>
        <p>
          Em sẽ không còn là thành viên của lớp này. Lịch sử học tập cá nhân
          của em không bị xóa.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => dialogRef.current?.close()}
          >
            Ở lại lớp
          </Button>
          <Button
            disabled={busy || !leaveTarget}
            onClick={() => {
              if (leaveTarget) {
                void performAction(leaveTarget, "STUDENT_LEAVE");
              }
            }}
          >
            {leaveTarget &&
            pendingOperation ===
              `STUDENT_LEAVE:${leaveTarget.membershipId}`
              ? "Đang rời lớp…"
              : "Xác nhận rời lớp"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
