"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/Button";
import {
  normalizeStudentCode,
  studentCodePattern,
  type ConnectionState,
  type StudentConnectionPreview,
} from "@/lib/connections/contracts";
import { createConnectionRequestGate } from "@/lib/connections/client-flow";
import type { ConnectionAction } from "@/lib/connections/validation";
import {
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "@/lib/http/client-request";
import {
  formatParentWeeklyPeriod,
  type ParentWeeklySummary,
} from "@/lib/parent-dashboard/weekly";

type ConnectionsManagerProps = {
  state: ConnectionState;
  weeklySummaries?: {
    connectionId: string;
    summary: ParentWeeklySummary | null;
  }[];
};

type ApiError = {
  code: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseApiError(value: unknown): ApiError | null {
  if (
    !isRecord(value) ||
    value.ok !== false ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string" ||
    typeof value.error.message !== "string"
  ) {
    return null;
  }

  return {
    code: value.error.code,
    message: value.error.message,
  };
}

function parsePreviewResponse(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.data) ||
    typeof value.data.maskedStudentName !== "string" ||
    !Number.isInteger(value.data.grade)
  ) {
    return null;
  }

  return {
    maskedStudentName: value.data.maskedStudentName,
    grade: Number(value.data.grade),
  } satisfies StudentConnectionPreview;
}

function isSuccessResponse(value: unknown) {
  return isRecord(value) && value.ok === true;
}

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

const actionLoadingLabels: Record<ConnectionAction, string> = {
  APPROVE: "Đang xác nhận…",
  REJECT: "Đang từ chối…",
  CANCEL: "Đang hủy yêu cầu…",
  REVOKE: "Đang ngắt kết nối…",
};

function formatWeeklyPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function ConnectionsManager({
  state,
  weeklySummaries,
}: ConnectionsManagerProps) {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [preview, setPreview] =
    useState<StudentConnectionPreview | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingOperation, setPendingOperation] = useState("");
  const [disconnectTarget, setDisconnectTarget] = useState<{
    connectionId: string;
    displayName: string;
  } | null>(null);
  const requestGateRef = useRef(createConnectionRequestGate());
  const codeInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busy = pendingOperation !== "";
  const pendingConnections = state.connections.filter(
    (connection) => connection.status === "PENDING",
  );
  const approvedConnections = state.connections.filter(
    (connection) => connection.status === "APPROVED",
  );

  const finishRequest = () => {
    setPendingOperation("");
    requestGateRef.current.reset();
  };

  const focusResult = () => {
    window.requestAnimationFrame(() => resultRef.current?.focus());
  };

  const previewStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !requestGateRef.current.tryStart()) return;

    const normalizedCode = normalizeStudentCode(studentCode);
    setNotice("");
    setPreview(null);

    if (!studentCodePattern.test(normalizedCode)) {
      finishRequest();
      setNotice(
        "Không tìm thấy học sinh phù hợp. Vui lòng kiểm tra lại mã.",
      );
      codeInputRef.current?.focus();
      return;
    }

    setPendingOperation("PREVIEW");

    try {
      const response = await fetchWithClientTimeout(
        "/api/connections/preview",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode: normalizedCode }),
        },
      );
      const payload: unknown = await response.json();
      const result = parsePreviewResponse(payload);

      if (!result) {
        const error = parseApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể tìm học sinh lúc này. Vui lòng thử lại sau.",
        );
        focusResult();
        return;
      }

      setPreview(result);
      focusResult();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CONNECTION_PREVIEW_TIMEOUT",
          "Chưa thể tìm học sinh lúc này. Vui lòng thử lại sau.",
        ),
      );
      focusResult();
    } finally {
      finishRequest();
    }
  };

  const sendRequest = async () => {
    if (!preview || busy || !requestGateRef.current.tryStart()) return;
    setPendingOperation("REQUEST");
    setNotice("");

    try {
      const response = await fetchWithClientTimeout(
        "/api/connections/request",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode: normalizeStudentCode(studentCode),
        }),
        },
      );
      const payload: unknown = await response.json();

      if (!isSuccessResponse(payload)) {
        const error = parseApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể gửi yêu cầu kết nối. Vui lòng thử lại.",
        );
        focusResult();
        return;
      }

      setStudentCode("");
      setPreview(null);
      router.refresh();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CONNECTION_REQUEST_TIMEOUT",
          "Chưa thể gửi yêu cầu kết nối. Vui lòng thử lại.",
        ),
      );
      focusResult();
    } finally {
      finishRequest();
    }
  };

  const performAction = async (
    connectionId: string,
    action: ConnectionAction,
  ) => {
    if (busy || !requestGateRef.current.tryStart()) return;
    setPendingOperation(`${action}:${connectionId}`);
    setNotice("");

    try {
      const response = await fetchWithClientTimeout(
        "/api/connections/action",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action }),
        },
      );
      const payload: unknown = await response.json();

      if (!isSuccessResponse(payload)) {
        const error = parseApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể cập nhật kết nối. Vui lòng thử lại.",
        );
        focusResult();
        return;
      }

      dialogRef.current?.close();
      setDisconnectTarget(null);
      router.refresh();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CONNECTION_ACTION_TIMEOUT",
          "Chưa thể cập nhật kết nối. Vui lòng thử lại.",
        ),
      );
      focusResult();
    } finally {
      finishRequest();
    }
  };

  const openDisconnectDialog = (
    connectionId: string,
    displayName: string,
  ) => {
    setDisconnectTarget({ connectionId, displayName });
    window.requestAnimationFrame(() => dialogRef.current?.showModal());
  };

  return (
    <div className="connections-manager">
      {state.viewerRole === "PARENT" ? (
        <section
          className="connection-lookup-card"
          aria-labelledby="connection-lookup-title"
        >
          <div>
            <p className="eyebrow">Kết nối có sự đồng ý</p>
            <h2 id="connection-lookup-title">Tìm học sinh bằng mã riêng</h2>
            <p>
              PLAVE chỉ gửi yêu cầu. Học sinh phải đồng ý trước khi hai tài
              khoản được kết nối.
            </p>
          </div>
          <form onSubmit={previewStudent} noValidate>
            <div className="field">
              <label htmlFor="student-connection-code">Mã học sinh</label>
              <div
                className={`field__control ${
                  notice && !preview ? "field__control--error" : ""
                }`}
              >
                <input
                  id="student-connection-code"
                  ref={codeInputRef}
                  value={studentCode}
                  onChange={(event) => {
                    setStudentCode(event.target.value.toUpperCase());
                    setPreview(null);
                    setNotice("");
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  placeholder="PLV-XXXXXXXXXXXX"
                  disabled={busy}
                  aria-invalid={Boolean(notice && !preview)}
                  aria-describedby={
                    notice && !preview ? "connection-feedback" : undefined
                  }
                />
              </div>
            </div>
            <Button type="submit" disabled={busy}>
              {pendingOperation === "PREVIEW"
                ? "Đang tìm học sinh…"
                : "Kiểm tra mã"}
            </Button>
          </form>

          {preview ? (
            <div
              className="connection-preview"
              ref={resultRef}
              tabIndex={-1}
              role="status"
            >
              <div>
                <span>Thông tin xác nhận</span>
                <strong>{preview.maskedStudentName}</strong>
                <p>Lớp {preview.grade}</p>
              </div>
              <Button onClick={sendRequest} disabled={busy}>
                {pendingOperation === "REQUEST"
                  ? "Đang gửi yêu cầu…"
                  : "Đúng là con của tôi — Gửi yêu cầu kết nối"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div
        className="connection-feedback"
        id="connection-feedback"
        ref={!preview ? resultRef : undefined}
        tabIndex={-1}
        aria-live="polite"
      >
        {notice ? (
          <p className="form-error-box" role="alert">
            {notice}
          </p>
        ) : null}
      </div>

      <section
        className="connection-list-section"
        aria-labelledby="pending-connections-title"
      >
        <div className="connection-section-heading">
          <div>
            <p className="eyebrow">Cần xử lý</p>
            <h2 id="pending-connections-title">
              {state.viewerRole === "PARENT"
                ? "Yêu cầu đang chờ"
                : "Yêu cầu từ phụ huynh"}
            </h2>
          </div>
          <span>{pendingConnections.length}</span>
        </div>

        {pendingConnections.length > 0 ? (
          <ul className="connection-list">
            {pendingConnections.map((connection) => (
              <li className="connection-card" key={connection.connectionId}>
                <div>
                  <span className="connection-status">
                    Đang chờ học sinh xác nhận
                  </span>
                  <h3>{connection.displayName}</h3>
                  {connection.grade ? <p>Lớp {connection.grade}</p> : null}
                  <small>
                    Gửi ngày {formatRequestDate(connection.requestedAt)}
                  </small>
                </div>
                <div className="connection-card__actions">
                  {state.viewerRole === "STUDENT" ? (
                    <>
                      <Button
                        onClick={() =>
                          performAction(connection.connectionId, "APPROVE")
                        }
                        disabled={busy}
                      >
                        {pendingOperation ===
                        `APPROVE:${connection.connectionId}`
                          ? actionLoadingLabels.APPROVE
                          : "Đồng ý kết nối"}
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() =>
                          performAction(connection.connectionId, "REJECT")
                        }
                        disabled={busy}
                      >
                        {pendingOperation ===
                        `REJECT:${connection.connectionId}`
                          ? actionLoadingLabels.REJECT
                          : "Từ chối"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        performAction(connection.connectionId, "CANCEL")
                      }
                      disabled={busy}
                    >
                      {pendingOperation ===
                      `CANCEL:${connection.connectionId}`
                        ? actionLoadingLabels.CANCEL
                        : "Hủy yêu cầu"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="connection-empty-state">
            <p>
              {state.viewerRole === "PARENT"
                ? "Bạn không có yêu cầu nào đang chờ học sinh xác nhận."
                : "Em chưa có yêu cầu kết nối nào cần xử lý."}
            </p>
          </div>
        )}
      </section>

      <section
        className="connection-list-section connection-list-section--approved"
        aria-labelledby="approved-connections-title"
      >
        <div className="connection-section-heading">
          <div>
            <p className="eyebrow">Đã đồng ý</p>
            <h2 id="approved-connections-title">
              {state.viewerRole === "PARENT"
                ? "Học sinh đã kết nối"
                : "Phụ huynh đã kết nối"}
            </h2>
          </div>
          <span>{approvedConnections.length}</span>
        </div>

        {approvedConnections.length > 0 ? (
          <ul className="connection-list">
            {approvedConnections.map((connection) => {
              const weeklySummary = weeklySummaries?.find(
                (item) => item.connectionId === connection.connectionId,
              )?.summary;

              return (
                <li
                  className="connection-card"
                  key={connection.connectionId}
                >
                <div>
                  <span className="connection-status connection-status--approved">
                    Đã kết nối
                  </span>
                  <h3>{connection.displayName}</h3>
                  {connection.grade ? <p>Lớp {connection.grade}</p> : null}
                  <small>
                    {state.viewerRole === "PARENT"
                      ? "Bạn có thể xem thống kê tổng hợp, không gồm câu trả lời hoặc lời giải."
                      : "Phụ huynh chỉ xem được thống kê tổng hợp khi kết nối còn hiệu lực."}
                  </small>
                  {state.viewerRole === "PARENT" && weeklySummaries ? (
                    <div
                      className="connection-weekly-preview"
                      aria-label="Báo cáo 7 ngày gần nhất"
                    >
                      <span>7 ngày gần nhất</span>
                      {weeklySummary ? (
                        <>
                          <small>
                            {formatParentWeeklyPeriod(weeklySummary)}
                          </small>
                          {weeklySummary.metrics.completedAttemptCount ===
                          0 ? (
                            <p>
                              Chưa có lượt luyện tập hoàn thành trong 7 ngày
                              gần nhất.
                            </p>
                          ) : (
                            <p>
                              <strong>
                                {
                                  weeklySummary.metrics
                                    .completedAttemptCount
                                }{" "}
                                lượt
                              </strong>
                              {" · "}
                              {weeklySummary.metrics.totalAnswered} câu
                              {" · "}
                              {weeklySummary.metrics.accuracyPercent === null
                                ? "Chưa có tỷ lệ"
                                : formatWeeklyPercent(
                                    weeklySummary.metrics.accuracyPercent,
                                  )}
                            </p>
                          )}
                        </>
                      ) : (
                        <p>Chưa thể tải báo cáo ngắn lúc này.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="connection-card__actions">
                  {state.viewerRole === "PARENT" ? (
                    <Button
                      href={`/parent/children/${connection.connectionId}`}
                    >
                      Xem tiến độ
                    </Button>
                  ) : null}
                  <Button
                    variant="quiet"
                    onClick={() =>
                      openDisconnectDialog(
                        connection.connectionId,
                        connection.displayName,
                      )
                    }
                    disabled={busy}
                  >
                    Ngắt kết nối
                  </Button>
                </div>
              </li>
              );
            })}
          </ul>
        ) : (
          <div className="connection-empty-state">
            <p>
              {state.viewerRole === "PARENT"
                ? "Bạn chưa kết nối với học sinh nào."
                : "Em chưa đồng ý kết nối với phụ huynh nào."}
            </p>
          </div>
        )}
      </section>

      <dialog
        className="connection-dialog"
        ref={dialogRef}
        aria-labelledby="disconnect-dialog-title"
        onClose={() => setDisconnectTarget(null)}
      >
        <h2 id="disconnect-dialog-title">Xác nhận ngắt kết nối</h2>
        <p>
          Bạn có chắc muốn ngắt kết nối với{" "}
          <strong>{disconnectTarget?.displayName}</strong>? Lịch sử kết nối sẽ
          được giữ lại.
        </p>
        <div className="connection-dialog__actions">
          <Button
            variant="quiet"
            onClick={() => dialogRef.current?.close()}
            disabled={busy}
          >
            Giữ kết nối
          </Button>
          <Button
            onClick={() => {
              if (disconnectTarget) {
                void performAction(
                  disconnectTarget.connectionId,
                  "REVOKE",
                );
              }
            }}
            disabled={busy || !disconnectTarget}
          >
            {pendingOperation.startsWith("REVOKE:")
              ? actionLoadingLabels.REVOKE
              : "Xác nhận ngắt kết nối"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
