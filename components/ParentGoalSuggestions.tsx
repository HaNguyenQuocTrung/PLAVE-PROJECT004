"use client";

import {
  type FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { createGoalSuggestionGate } from "@/lib/goal-suggestions/client-flow";
import {
  parseGoalSuggestionApiError,
  parseGoalSuggestionMutationApiResponse,
  parseGoalSuggestionStateApiResponse,
  type GoalSuggestion,
  type ParentGoalSuggestionContext,
} from "@/lib/goal-suggestions/contracts";

type ParentGoalSuggestionsProps = {
  connectionId: string;
  initialContext: ParentGoalSuggestionContext;
};

const statusLabels: Record<GoalSuggestion["status"], string> = {
  PENDING: "Đang chờ học sinh phản hồi",
  ACCEPTED: "Học sinh đã đồng ý",
  DECLINED: "Học sinh không áp dụng",
  WITHDRAWN: "Đã thu hồi",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function ParentGoalSuggestions({
  connectionId,
  initialContext,
}: ParentGoalSuggestionsProps) {
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [goalId, setGoalId] = useState(
    initialContext.activeGoals[0]?.goalId ?? "",
  );
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [newTitleError, setNewTitleError] = useState("");
  const [newMessageError, setNewMessageError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [pendingOperation, setPendingOperation] = useState("");
  const [withdrawTarget, setWithdrawTarget] =
    useState<GoalSuggestion | null>(null);
  const gateRef = useRef(createGoalSuggestionGate());
  const titleRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelDialogRef = useRef<HTMLButtonElement>(null);
  const busy = pendingOperation !== "";

  const finishRequest = () => {
    setPendingOperation("");
    gateRef.current.reset();
  };

  const loadLatestContext = async () => {
    try {
      const response = await fetch(
        `/api/goal-suggestions?connectionId=${encodeURIComponent(connectionId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const payload: unknown = await response.json();
      const result = parseGoalSuggestionStateApiResponse(payload);
      if (result?.viewerRole !== "PARENT") return null;
      setContext(result.context);
      return result.context;
    } catch {
      return null;
    }
  };

  const postSuggestion = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/goal-suggestions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json();
    return {
      suggestion: parseGoalSuggestionMutationApiResponse(
        payload,
        "PARENT",
      ),
      error: parseGoalSuggestionApiError(payload),
    };
  };

  const addOrReplaceSuggestion = (suggestion: GoalSuggestion) => {
    setContext((current) => ({
      ...current,
      suggestions: [
        suggestion,
        ...current.suggestions.filter(
          (item) => item.suggestionId !== suggestion.suggestionId,
        ),
      ],
    }));
  };

  const submitNewGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !gateRef.current.tryStart()) return;

    const normalizedTitle = title.trim().replace(/\s+/g, " ");
    const normalizedMessage =
      newMessage.trim().replace(/\s+/g, " ") || null;
    setNotice("");
    setNewTitleError("");
    setNewMessageError("");
    if (normalizedTitle.length < 3 || normalizedTitle.length > 120) {
      finishRequest();
      setNewTitleError("Tiêu đề cần có từ 3 đến 120 ký tự.");
      titleRef.current?.focus();
      return;
    }
    if (normalizedMessage && normalizedMessage.length > 300) {
      finishRequest();
      setNewMessageError("Lời nhắn không được dài quá 300 ký tự.");
      return;
    }

    setPendingOperation("SEND_NEW");
    try {
      const result = await postSuggestion({
        action: "SEND_NEW",
        connectionId,
        title: normalizedTitle,
        targetDate: targetDate || null,
        message: normalizedMessage,
      });

      if (result.suggestion) {
        addOrReplaceSuggestion(result.suggestion);
        setTitle("");
        setTargetDate("");
        setNewMessage("");
        setNotice("Đã gửi đề xuất để học sinh xem xét.");
        router.refresh();
        return;
      }

      const latest = await loadLatestContext();
      const committed = latest?.suggestions.find(
        (item) =>
          item.kind === "NEW_GOAL" &&
          item.status === "PENDING" &&
          item.proposedTitle === normalizedTitle &&
          item.proposedTargetDate === (targetDate || null) &&
          item.message === normalizedMessage,
      );
      if (committed) {
        setTitle("");
        setTargetDate("");
        setNewMessage("");
        setNotice("Đề xuất đã được gửi và danh sách đã được đồng bộ.");
        return;
      }

      setNotice(
        result.error?.message ??
          "Chưa thể gửi đề xuất. Vui lòng kiểm tra và thử lại.",
      );
    } catch {
      const latest = await loadLatestContext();
      const committed = latest?.suggestions.find(
        (item) =>
          item.kind === "NEW_GOAL" &&
          item.status === "PENDING" &&
          item.proposedTitle === normalizedTitle &&
          item.proposedTargetDate === (targetDate || null) &&
          item.message === normalizedMessage,
      );
      setNotice(
        committed
          ? "Đề xuất đã được gửi và danh sách đã được đồng bộ."
          : "Chưa thể xác nhận đề xuất đã được gửi. Vui lòng thử lại.",
      );
    } finally {
      finishRequest();
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !gateRef.current.tryStart()) return;

    const normalizedComment = comment.trim().replace(/\s+/g, " ");
    setNotice("");
    setCommentError("");
    if (!goalId || normalizedComment.length < 2) {
      finishRequest();
      setCommentError(
        !goalId
          ? "Học sinh chưa có mục tiêu đang thực hiện để góp ý."
          : "Lời góp ý cần có ít nhất 2 ký tự.",
      );
      commentRef.current?.focus();
      return;
    }
    if (normalizedComment.length > 300) {
      finishRequest();
      setCommentError("Lời góp ý không được dài quá 300 ký tự.");
      commentRef.current?.focus();
      return;
    }

    setPendingOperation("SEND_COMMENT");
    try {
      const result = await postSuggestion({
        action: "SEND_COMMENT",
        connectionId,
        goalId,
        message: normalizedComment,
      });
      if (result.suggestion) {
        addOrReplaceSuggestion(result.suggestion);
        setComment("");
        setNotice("Đã gửi góp ý để học sinh xem xét.");
        router.refresh();
        return;
      }

      const latest = await loadLatestContext();
      const committed = latest?.suggestions.find(
        (item) =>
          item.kind === "EXISTING_GOAL_COMMENT" &&
          item.goalId === goalId &&
          item.message === normalizedComment &&
          item.status === "PENDING",
      );
      if (committed) {
        setComment("");
        setNotice("Góp ý đã được gửi và danh sách đã được đồng bộ.");
        return;
      }

      setNotice(
        result.error?.message ??
          "Chưa thể gửi góp ý. Vui lòng kiểm tra và thử lại.",
      );
    } catch {
      const latest = await loadLatestContext();
      const committed = latest?.suggestions.find(
        (item) =>
          item.kind === "EXISTING_GOAL_COMMENT" &&
          item.goalId === goalId &&
          item.message === normalizedComment &&
          item.status === "PENDING",
      );
      setNotice(
        committed
          ? "Góp ý đã được gửi và danh sách đã được đồng bộ."
          : "Chưa thể xác nhận góp ý đã được gửi. Vui lòng thử lại.",
      );
    } finally {
      finishRequest();
    }
  };

  const withdraw = async () => {
    if (!withdrawTarget || busy || !gateRef.current.tryStart()) return;
    const suggestionId = withdrawTarget.suggestionId;
    setPendingOperation(`WITHDRAW:${suggestionId}`);
    setNotice("");
    try {
      const result = await postSuggestion({
        action: "WITHDRAW",
        suggestionId,
      });
      if (result.suggestion) {
        addOrReplaceSuggestion(result.suggestion);
        setNotice("Đã thu hồi góp ý.");
        dialogRef.current?.close();
        router.refresh();
        return;
      }

      const latest = await loadLatestContext();
      const committed = latest?.suggestions.find(
        (item) =>
          item.suggestionId === suggestionId &&
          item.status === "WITHDRAWN",
      );
      if (committed) {
        setNotice("Góp ý đã được thu hồi và danh sách đã được đồng bộ.");
        dialogRef.current?.close();
        return;
      }
      setNotice(
        result.error?.message ??
          "Chưa thể thu hồi góp ý. Vui lòng thử lại.",
      );
    } catch {
      const latest = await loadLatestContext();
      const committed = latest?.suggestions.find(
        (item) =>
          item.suggestionId === suggestionId &&
          item.status === "WITHDRAWN",
      );
      setNotice(
        committed
          ? "Góp ý đã được thu hồi và danh sách đã được đồng bộ."
          : "Chưa thể xác nhận trạng thái thu hồi. Vui lòng thử lại.",
      );
      if (committed) dialogRef.current?.close();
    } finally {
      finishRequest();
    }
  };

  const openWithdrawDialog = (suggestion: GoalSuggestion) => {
    setWithdrawTarget(suggestion);
    window.requestAnimationFrame(() => {
      dialogRef.current?.showModal();
      cancelDialogRef.current?.focus();
    });
  };

  return (
    <section
      className="parent-learning-section goal-suggestion-section"
      aria-labelledby="parent-goal-suggestions-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Đồng hành tôn trọng</p>
          <h2 id="parent-goal-suggestions-title">
            Góp ý mục tiêu học tập
          </h2>
        </div>
      </div>
      <p className="parent-section-note">
        Học sinh là người quyết định có áp dụng góp ý hay không. Góp ý không
        thay đổi trực tiếp mục tiêu hoặc kết quả học tập.
      </p>

      <div className="goal-suggestion-forms">
        <form onSubmit={submitNewGoal} noValidate>
          <h3>Đề xuất mục tiêu mới</h3>
          <FormField
            id="parent-proposed-goal-title"
            label="Tiêu đề mục tiêu"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setNewTitleError("");
              setNotice("");
            }}
            placeholder="Ví dụ: Ôn lại cách tách số trong tuần này"
            required
            inputRef={titleRef}
            disabled={busy}
            error={newTitleError}
          />
          <div className="field">
            <label htmlFor="parent-proposed-target-date">
              Ngày dự kiến hoàn thành (không bắt buộc)
            </label>
            <div className="field__control">
              <input
                id="parent-proposed-target-date"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="parent-new-goal-message">
              Lời nhắn (không bắt buộc)
            </label>
            <div
              className={`field__control ${
                newMessageError ? "field__control--error" : ""
              }`}
            >
              <textarea
                id="parent-new-goal-message"
                value={newMessage}
                maxLength={300}
                onChange={(event) => {
                  setNewMessage(event.target.value);
                  setNewMessageError("");
                }}
                disabled={busy}
                aria-invalid={Boolean(newMessageError)}
                aria-describedby={
                  newMessageError
                    ? "parent-new-goal-message-error"
                    : undefined
                }
              />
            </div>
            {newMessageError ? (
              <p
                className="field__error"
                id="parent-new-goal-message-error"
                role="alert"
              >
                {newMessageError}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={busy}>
            {pendingOperation === "SEND_NEW"
              ? "Đang gửi đề xuất…"
              : "Gửi đề xuất mục tiêu"}
          </Button>
        </form>

        <form onSubmit={submitComment} noValidate>
          <h3>Góp ý cho mục tiêu đang thực hiện</h3>
          {context.activeGoals.length > 0 ? (
            <>
              <div className="field">
                <label htmlFor="parent-active-goal">Chọn mục tiêu</label>
                <div className="field__control">
                  <select
                    id="parent-active-goal"
                    value={goalId}
                    onChange={(event) => setGoalId(event.target.value)}
                    disabled={busy}
                  >
                    {context.activeGoals.map((goal) => (
                      <option key={goal.goalId} value={goal.goalId}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="parent-goal-comment">Lời góp ý</label>
                <div
                  className={`field__control ${
                    commentError
                      ? "field__control--error"
                      : ""
                  }`}
                >
                  <textarea
                    id="parent-goal-comment"
                    ref={commentRef}
                    value={comment}
                    maxLength={300}
                    onChange={(event) => {
                      setComment(event.target.value);
                      setCommentError("");
                      setNotice("");
                    }}
                    disabled={busy}
                    aria-invalid={Boolean(commentError)}
                    aria-describedby={
                      commentError
                        ? "parent-goal-comment-error"
                        : undefined
                    }
                  />
                </div>
                {commentError ? (
                  <p
                    className="field__error"
                    id="parent-goal-comment-error"
                    role="alert"
                  >
                    {commentError}
                  </p>
                ) : null}
              </div>
              <Button type="submit" disabled={busy}>
                {pendingOperation === "SEND_COMMENT"
                  ? "Đang gửi góp ý…"
                  : "Gửi lời góp ý"}
              </Button>
            </>
          ) : (
            <p className="goal-suggestion-empty">
              Học sinh chưa có mục tiêu đang thực hiện để góp ý.
            </p>
          )}
        </form>
      </div>

      <div aria-live="polite">
        {notice ? (
          <p className="goal-suggestion-notice">{notice}</p>
        ) : null}
      </div>

      <div className="goal-suggestion-history">
        <h3>Lịch sử góp ý</h3>
        {context.suggestions.length > 0 ? (
          <ul>
            {context.suggestions.map((suggestion) => (
              <li key={suggestion.suggestionId}>
                <div>
                  <span
                    className={`goal-suggestion-status goal-suggestion-status--${suggestion.status.toLowerCase()}`}
                  >
                    {statusLabels[suggestion.status]}
                  </span>
                  <h4>
                    {suggestion.kind === "NEW_GOAL"
                      ? suggestion.proposedTitle
                      : suggestion.goalTitle}
                  </h4>
                  <p>
                    {suggestion.kind === "NEW_GOAL"
                      ? "Đề xuất mục tiêu mới"
                      : "Góp ý cho mục tiêu đang thực hiện"}
                  </p>
                  {suggestion.proposedTargetDate ? (
                    <p>
                      Ngày dự kiến:{" "}
                      {formatDate(suggestion.proposedTargetDate)}
                    </p>
                  ) : null}
                  {suggestion.message ? (
                    <blockquote>{suggestion.message}</blockquote>
                  ) : null}
                  <time dateTime={suggestion.createdAt}>
                    Gửi lúc {formatDateTime(suggestion.createdAt)}
                  </time>
                </div>
                {suggestion.status === "PENDING" ? (
                  <Button
                    variant="quiet"
                    onClick={() => openWithdrawDialog(suggestion)}
                    disabled={busy}
                  >
                    {pendingOperation ===
                    `WITHDRAW:${suggestion.suggestionId}`
                      ? "Đang thu hồi…"
                      : "Thu hồi góp ý"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="goal-suggestion-empty">
            Chưa có góp ý nào được gửi.
          </p>
        )}
      </div>

      <dialog
        className="connection-dialog"
        ref={dialogRef}
        aria-labelledby="withdraw-suggestion-title"
        onClose={() => setWithdrawTarget(null)}
      >
        <h2 id="withdraw-suggestion-title">Thu hồi góp ý?</h2>
        <p>
          Góp ý sẽ được giữ trong lịch sử với trạng thái đã thu hồi và không
          còn chờ học sinh phản hồi.
        </p>
        <div className="connection-dialog__actions">
          <button
            ref={cancelDialogRef}
            type="button"
            className="button button--quiet"
            onClick={() => dialogRef.current?.close()}
            disabled={busy}
          >
            Giữ góp ý
          </button>
          <Button onClick={() => void withdraw()} disabled={busy}>
            {pendingOperation.startsWith("WITHDRAW:")
              ? "Đang thu hồi…"
              : "Xác nhận thu hồi"}
          </Button>
        </div>
      </dialog>
    </section>
  );
}
