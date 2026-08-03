"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/Button";
import { createClassroomRequestGate } from "@/lib/classrooms/client-flow";
import {
  parseClassroomApiError,
  parseClassroomApiSuccess,
  type ClassroomAction,
  type ClassroomRosterItem,
} from "@/lib/classrooms/contracts";
import {
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "@/lib/http/client-request";

type ClassroomRosterManagerProps = {
  initialMemberships: ClassroomRosterItem[];
};

const loadingLabels: Record<
  "TEACHER_APPROVE" | "TEACHER_REJECT" | "TEACHER_REMOVE",
  string
> = {
  TEACHER_APPROVE: "Đang đồng ý…",
  TEACHER_REJECT: "Đang từ chối…",
  TEACHER_REMOVE: "Đang xóa khỏi lớp…",
};

export function ClassroomRosterManager({
  initialMemberships,
}: ClassroomRosterManagerProps) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [pendingOperation, setPendingOperation] = useState("");
  const [notice, setNotice] = useState("");
  const [removeTarget, setRemoveTarget] =
    useState<ClassroomRosterItem | null>(null);
  const gateRef = useRef(createClassroomRequestGate());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const busy = pendingOperation !== "";
  const pendingMemberships = memberships.filter(
    (membership) => membership.status === "PENDING",
  );
  const approvedMemberships = memberships.filter(
    (membership) => membership.status === "APPROVED",
  );

  const performAction = async (
    membership: ClassroomRosterItem,
    action: ClassroomAction,
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
            "Chưa thể cập nhật yêu cầu. Vui lòng thử lại.",
        );
        window.requestAnimationFrame(() =>
          feedbackRef.current?.focus(),
        );
        return;
      }

      if (action === "TEACHER_APPROVE") {
        setMemberships((current) =>
          current.map((item) =>
            item.membershipId === membership.membershipId
              ? {
                  ...item,
                  status: "APPROVED",
                  respondedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
      } else {
        setMemberships((current) =>
          current.filter(
            (item) => item.membershipId !== membership.membershipId,
          ),
        );
      }

      dialogRef.current?.close();
      setRemoveTarget(null);
      router.refresh();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CLASSROOM_ROSTER_TIMEOUT",
          "Chưa thể xác nhận kết quả cập nhật. Vui lòng tải lại trang trước khi thử lại.",
        ),
      );
      window.requestAnimationFrame(() => feedbackRef.current?.focus());
    } finally {
      setPendingOperation("");
      gateRef.current.reset();
    }
  };

  const openRemoveDialog = (membership: ClassroomRosterItem) => {
    setRemoveTarget(membership);
    window.requestAnimationFrame(() => dialogRef.current?.showModal());
  };

  return (
    <div className="classroom-roster-manager">
      <div
        className="connection-feedback"
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
      >
        {notice ? (
          <p className="form-error-box" role="alert">
            {notice}
          </p>
        ) : null}
      </div>

      <section aria-labelledby="classroom-pending-title">
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Cần xử lý</p>
            <h2 id="classroom-pending-title">Yêu cầu tham gia</h2>
          </div>
          <span>{pendingMemberships.length}</span>
        </div>
        {pendingMemberships.length > 0 ? (
          <ul className="classroom-member-list">
            {pendingMemberships.map((membership) => (
              <li key={membership.membershipId}>
                <div>
                  <span className="classroom-status">Đang chờ duyệt</span>
                  <h3>{membership.studentDisplayName}</h3>
                  <p>Lớp {membership.grade}</p>
                </div>
                <div className="classroom-member-actions">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      performAction(membership, "TEACHER_APPROVE")
                    }
                  >
                    {pendingOperation ===
                    `TEACHER_APPROVE:${membership.membershipId}`
                      ? loadingLabels.TEACHER_APPROVE
                      : "Đồng ý"}
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={busy}
                    onClick={() =>
                      performAction(membership, "TEACHER_REJECT")
                    }
                  >
                    {pendingOperation ===
                    `TEACHER_REJECT:${membership.membershipId}`
                      ? loadingLabels.TEACHER_REJECT
                      : "Từ chối"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>Không có yêu cầu đang chờ</h3>
            <p>Yêu cầu mới sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="classroom-students-title">
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Thành viên</p>
            <h2 id="classroom-students-title">Học sinh trong lớp</h2>
          </div>
          <span>{approvedMemberships.length}</span>
        </div>
        {approvedMemberships.length > 0 ? (
          <ul className="classroom-member-list">
            {approvedMemberships.map((membership) => (
              <li key={membership.membershipId}>
                <div>
                  <span className="classroom-status classroom-status--approved">
                    Đã tham gia
                  </span>
                  <h3>{membership.studentDisplayName}</h3>
                  <p>Lớp {membership.grade}</p>
                </div>
                <Button
                  href={`/teacher/students/${membership.membershipId}/progress`}
                  variant="secondary"
                >
                  Xem tiến trình
                </Button>
                <Button
                  variant="quiet"
                  disabled={busy}
                  onClick={() => openRemoveDialog(membership)}
                >
                  Xóa khỏi lớp
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>Lớp chưa có học sinh</h3>
            <p>Học sinh được duyệt sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>

      <dialog
        className="connection-dialog"
        ref={dialogRef}
        onClose={() => setRemoveTarget(null)}
      >
        <h2>Xóa học sinh khỏi lớp?</h2>
        <p>
          Hành động này kết thúc quyền tham gia lớp, nhưng vẫn giữ lịch sử yêu
          cầu. Dữ liệu học tập của học sinh không bị xóa.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => dialogRef.current?.close()}
          >
            Giữ học sinh
          </Button>
          <Button
            disabled={busy || !removeTarget}
            onClick={() => {
              if (removeTarget) {
                void performAction(removeTarget, "TEACHER_REMOVE");
              }
            }}
          >
            {removeTarget &&
            pendingOperation ===
              `TEACHER_REMOVE:${removeTarget.membershipId}`
              ? loadingLabels.TEACHER_REMOVE
              : "Xác nhận xóa"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
