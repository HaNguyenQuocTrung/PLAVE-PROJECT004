"use client";

import {
  type FormEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  archiveGoal,
  completeGoal,
  createLearningGoal,
  restoreGoal,
  type GoalMutationData,
} from "@/app/dashboard/actions";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { createGoalSuggestionGate } from "@/lib/goal-suggestions/client-flow";
import {
  parseGoalSuggestionApiError,
  parseGoalSuggestionMutationApiResponse,
  parseGoalSuggestionStateApiResponse,
  type GoalSuggestion,
  type StudentGoalSuggestion,
} from "@/lib/goal-suggestions/contracts";
import { createGoalWriteGate } from "@/lib/goals/client-flow";
import type { LearningGoal } from "@/lib/goals/server";

type GoalsManagerProps = {
  goals: LearningGoal[];
  suggestions: StudentGoalSuggestion[];
  suggestionsAvailable: boolean;
};

const statusLabels: Record<LearningGoal["status"], string> = {
  ACTIVE: "Đang thực hiện",
  COMPLETED: "Đã hoàn thành",
  ARCHIVED: "Đã lưu trữ",
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
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

type GoalOperation = "COMPLETE" | "ARCHIVE" | "RESTORE";

const suggestionStatusLabels: Record<GoalSuggestion["status"], string> = {
  PENDING: "Đang chờ em phản hồi",
  ACCEPTED: "Đã đồng ý",
  DECLINED: "Không áp dụng",
  WITHDRAWN: "Phụ huynh đã thu hồi",
};

export function GoalsManager({
  goals,
  suggestions,
  suggestionsAvailable,
}: GoalsManagerProps) {
  const router = useRouter();
  const [goalItems, setGoalItems] = useState(goals);
  const [suggestionItems, setSuggestionItems] = useState(suggestions);
  const [title, setTitle] = useState("");
  const [targetCount, setTargetCount] = useState("10");
  const [targetDate, setTargetDate] = useState("");
  const [titleError, setTitleError] = useState("");
  const [countError, setCountError] = useState("");
  const [dateError, setDateError] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isMutationPending, startMutationTransition] = useTransition();
  const [pendingMutation, setPendingMutation] = useState<{
    goalId: string;
    operation: GoalOperation;
  } | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    suggestionId: string;
    decision: "ACCEPT" | "DECLINE";
  } | null>(null);
  const writeGateRef = useRef(createGoalWriteGate());
  const suggestionGateRef = useRef(createGoalSuggestionGate());
  const titleRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const mutationBusy = isMutationPending || pendingMutation !== null;
  const suggestionBusy = pendingSuggestion !== null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatePending || mutationBusy || suggestionBusy) return;

    const normalizedTitle = title.trim();
    const numericTarget = Number(targetCount);
    let hasError = false;
    setNotice("");

    if (normalizedTitle.length < 3 || normalizedTitle.length > 120) {
      setTitleError("Tên mục tiêu cần có từ 3 đến 120 ký tự.");
      titleRef.current?.focus();
      hasError = true;
    } else {
      setTitleError("");
    }

    if (
      !Number.isInteger(numericTarget) ||
      numericTarget < 1 ||
      numericTarget > 500
    ) {
      setCountError("Nhập một số nguyên từ 1 đến 500.");
      if (!hasError) countRef.current?.focus();
      hasError = true;
    } else {
      setCountError("");
    }

    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setDateError("Ngày mục tiêu không hợp lệ.");
      if (!hasError) dateRef.current?.focus();
      hasError = true;
    } else {
      setDateError("");
    }

    if (hasError) return;

    if (!writeGateRef.current.tryStart()) return;

    startCreateTransition(async () => {
      const result = await createLearningGoal({
        title: normalizedTitle,
        targetCount: numericTarget,
        targetDate,
      });

      if (!result.ok) {
        writeGateRef.current.reset();
        setNotice(result.message);
        return;
      }

      setTitle("");
      setTargetCount("10");
      setTargetDate("");
      writeGateRef.current.reset();
      router.refresh();
    });
  };

  const updateGoal = (
    goalId: string,
    operation: GoalOperation,
  ) => {
    if (isCreatePending || mutationBusy || suggestionBusy) return;
    if (!writeGateRef.current.tryStart()) return;

    setNotice("");
    setPendingMutation({ goalId, operation });
    startMutationTransition(async () => {
      const result =
        operation === "COMPLETE"
          ? await completeGoal(goalId)
          : operation === "ARCHIVE"
            ? await archiveGoal(goalId)
            : await restoreGoal(goalId);

      if (!result.ok) {
        writeGateRef.current.reset();
        setPendingMutation(null);
        setNotice(result.message);
        if (result.code === "GOAL_STATE_CONFLICT") {
          router.refresh();
        }
        return;
      }

      applyGoalResult(result.goal);
      writeGateRef.current.reset();
      setPendingMutation(null);
      router.refresh();
    });
  };

  const applyGoalResult = (updatedGoal: GoalMutationData) => {
    setGoalItems((current) =>
      current.map((goal) =>
        goal.id === updatedGoal.id
          ? {
              ...goal,
              status: updatedGoal.status,
              completed_at: updatedGoal.completedAt,
              archived_at: updatedGoal.archivedAt,
            }
          : goal,
      ),
    );
  };

  const addAcceptedGoal = (suggestion: GoalSuggestion) => {
    if (!suggestion.acceptedGoal) return;
    const acceptedGoal = suggestion.acceptedGoal;
    setGoalItems((current) => {
      if (current.some((goal) => goal.id === acceptedGoal.id)) {
        return current.map((goal) =>
          goal.id === acceptedGoal.id
            ? {
                id: acceptedGoal.id,
                title: acceptedGoal.title,
                target_count: acceptedGoal.targetCount,
                target_date: acceptedGoal.targetDate,
                status: acceptedGoal.status,
                created_at: acceptedGoal.createdAt,
                completed_at: acceptedGoal.completedAt,
                archived_at: acceptedGoal.archivedAt,
              }
            : goal,
        );
      }
      return [
        {
          id: acceptedGoal.id,
          title: acceptedGoal.title,
          target_count: acceptedGoal.targetCount,
          target_date: acceptedGoal.targetDate,
          status: acceptedGoal.status,
          created_at: acceptedGoal.createdAt,
          completed_at: acceptedGoal.completedAt,
          archived_at: acceptedGoal.archivedAt,
        },
        ...current,
      ];
    });
  };

  const applySuggestionResult = (suggestion: GoalSuggestion) => {
    setSuggestionItems((current) =>
      current.map((item) =>
        item.suggestionId === suggestion.suggestionId
          ? {
              ...item,
              ...suggestion,
            }
          : item,
      ),
    );
    addAcceptedGoal(suggestion);
  };

  const reconcileSuggestions = async () => {
    try {
      const response = await fetch("/api/goal-suggestions", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      const result = parseGoalSuggestionStateApiResponse(payload);
      if (result?.viewerRole !== "STUDENT") return null;
      setSuggestionItems(result.state.suggestions);
      result.state.suggestions.forEach(addAcceptedGoal);
      return result.state;
    } catch {
      return null;
    }
  };

  const respondToSuggestion = async (
    suggestionId: string,
    decision: "ACCEPT" | "DECLINE",
  ) => {
    if (
      isCreatePending ||
      mutationBusy ||
      suggestionBusy ||
      !suggestionGateRef.current.tryStart()
    ) {
      return;
    }

    setNotice("");
    setPendingSuggestion({ suggestionId, decision });
    try {
      const response = await fetch("/api/goal-suggestions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: decision, suggestionId }),
      });
      const payload: unknown = await response.json();
      const suggestion = parseGoalSuggestionMutationApiResponse(
        payload,
        "STUDENT",
      );

      if (suggestion) {
        applySuggestionResult(suggestion);
        setNotice(
          decision === "ACCEPT"
            ? "Đã ghi nhận quyết định của em."
            : "Góp ý đã được đánh dấu là không áp dụng.",
        );
        router.refresh();
        return;
      }

      const latest = await reconcileSuggestions();
      const reconciled = latest?.suggestions.find(
        (item) => item.suggestionId === suggestionId,
      );
      const expectedStatus =
        decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      if (reconciled?.status === expectedStatus) {
        setNotice("Quyết định đã được lưu và danh sách đã được đồng bộ.");
        return;
      }

      const error = parseGoalSuggestionApiError(payload);
      setNotice(
        error?.message ??
          "Chưa thể cập nhật góp ý. Vui lòng kiểm tra và thử lại.",
      );
    } catch {
      const latest = await reconcileSuggestions();
      const reconciled = latest?.suggestions.find(
        (item) => item.suggestionId === suggestionId,
      );
      const expectedStatus =
        decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      setNotice(
        reconciled?.status === expectedStatus
          ? "Quyết định đã được lưu và danh sách đã được đồng bộ."
          : "Chưa thể xác nhận quyết định đã được lưu. Vui lòng thử lại.",
      );
    } finally {
      suggestionGateRef.current.reset();
      setPendingSuggestion(null);
    }
  };

  const activeGoals = goalItems.filter((goal) => goal.status === "ACTIVE");
  const completedGoals = goalItems.filter(
    (goal) => goal.status === "COMPLETED",
  );
  const archivedGoals = goalItems.filter(
    (goal) => goal.status === "ARCHIVED",
  );

  const renderGoal = (goal: LearningGoal) => (
    <li className="goal-card" key={goal.id}>
      <div>
        <span
          className={`goal-status goal-status--${goal.status.toLowerCase()}`}
        >
          {statusLabels[goal.status]}
        </span>
        <h3>{goal.title}</h3>
        <p>
          Mục tiêu: {goal.target_count}
          {goal.target_date
            ? ` · Hạn ${formatDate(goal.target_date)}`
            : " · Không đặt ngày hạn"}
        </p>
        {goal.completed_at ? (
          <p className="goal-card__timestamp">
            Hoàn thành ngày {formatDateTime(goal.completed_at)}
          </p>
        ) : null}
      </div>
      {goal.status === "ACTIVE" ? (
        <div className="goal-card__actions">
          <Button
            variant="secondary"
            disabled={isCreatePending || mutationBusy || suggestionBusy}
            onClick={() => updateGoal(goal.id, "COMPLETE")}
          >
            {pendingMutation?.goalId === goal.id &&
            pendingMutation.operation === "COMPLETE"
              ? "Đang hoàn thành…"
              : "Đánh dấu hoàn thành"}
          </Button>
        </div>
      ) : goal.status === "COMPLETED" ? (
        <div className="goal-card__actions">
          <Button
            variant="quiet"
            disabled={isCreatePending || mutationBusy || suggestionBusy}
            onClick={() => updateGoal(goal.id, "ARCHIVE")}
          >
            {pendingMutation?.goalId === goal.id &&
            pendingMutation.operation === "ARCHIVE"
              ? "Đang lưu trữ…"
              : "Lưu trữ"}
          </Button>
        </div>
      ) : (
        <div className="goal-card__actions">
          <Button
            variant="secondary"
            disabled={isCreatePending || mutationBusy || suggestionBusy}
            onClick={() => updateGoal(goal.id, "RESTORE")}
          >
            {pendingMutation?.goalId === goal.id &&
            pendingMutation.operation === "RESTORE"
              ? "Đang khôi phục…"
              : "Khôi phục"}
          </Button>
        </div>
      )}
    </li>
  );

  return (
    <>
      <section
        className="dashboard-section dashboard-section--suggestions"
        aria-labelledby="student-goal-suggestions-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Em là người quyết định</p>
          <h2 id="student-goal-suggestions-title">
            Góp ý từ phụ huynh
          </h2>
          <p>
            Em có thể đồng ý hoặc chọn không áp dụng. Góp ý không tự thay đổi
            mục tiêu của em.
          </p>
        </div>

        {!suggestionsAvailable ? (
          <div className="goal-suggestion-empty">
            Chưa thể tải góp ý lúc này. Các mục tiêu cá nhân của em vẫn được
            giữ nguyên.
          </div>
        ) : suggestionItems.length === 0 ? (
          <div className="goal-suggestion-empty">
            Em chưa nhận được góp ý mục tiêu nào từ phụ huynh.
          </div>
        ) : (
          <ul className="student-suggestion-list">
            {suggestionItems.map((suggestion) => (
              <li key={suggestion.suggestionId}>
                <div>
                  <span
                    className={`goal-suggestion-status goal-suggestion-status--${suggestion.status.toLowerCase()}`}
                  >
                    {suggestionStatusLabels[suggestion.status]}
                  </span>
                  <h3>
                    {suggestion.kind === "NEW_GOAL"
                      ? suggestion.proposedTitle
                      : suggestion.goalTitle}
                  </h3>
                  <p>
                    {suggestion.kind === "NEW_GOAL"
                      ? "Phụ huynh đề xuất một mục tiêu mới"
                      : "Phụ huynh góp ý cho mục tiêu đang thực hiện"}
                  </p>
                  <p>Người gửi: {suggestion.parentDisplayName}</p>
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
                    Gửi ngày {formatDateTime(suggestion.createdAt)}
                  </time>
                  {suggestion.status === "PENDING" &&
                  !suggestion.connectionActive ? (
                    <p className="goal-suggestion-connection-note">
                      Kết nối không còn hiệu lực nên góp ý này chỉ được giữ để
                      em xem lại.
                    </p>
                  ) : null}
                </div>
                {suggestion.status === "PENDING" &&
                suggestion.connectionActive ? (
                  <div className="goal-card__actions">
                    <Button
                      onClick={() =>
                        void respondToSuggestion(
                          suggestion.suggestionId,
                          "ACCEPT",
                        )
                      }
                      disabled={
                        isCreatePending ||
                        mutationBusy ||
                        suggestionBusy
                      }
                    >
                      {pendingSuggestion?.suggestionId ===
                        suggestion.suggestionId &&
                      pendingSuggestion.decision === "ACCEPT"
                        ? "Đang đồng ý…"
                        : "Đồng ý"}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() =>
                        void respondToSuggestion(
                          suggestion.suggestionId,
                          "DECLINE",
                        )
                      }
                      disabled={
                        isCreatePending ||
                        mutationBusy ||
                        suggestionBusy
                      }
                    >
                      {pendingSuggestion?.suggestionId ===
                        suggestion.suggestionId &&
                      pendingSuggestion.decision === "DECLINE"
                        ? "Đang cập nhật…"
                        : "Không áp dụng"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="dashboard-section dashboard-section--goals"
        aria-labelledby="goals-title"
      >
      <div className="section-heading section-heading--compact">
        <p className="eyebrow">Kế hoạch nhỏ, đều đặn</p>
        <h2 id="goals-title">Mục tiêu cá nhân</h2>
        <p>
          Có thể giữ tối đa 10 mục tiêu đang thực hiện để duy trì thói quen
          học đều đặn.
        </p>
      </div>

      <form className="goal-form" onSubmit={submit} noValidate>
        <FormField
          id="goal-title"
          label="Tên mục tiêu"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleError("");
            setNotice("");
          }}
          placeholder="Ví dụ: Hoàn thành 24 câu luyện tập"
          required
          error={titleError}
          inputRef={titleRef}
          disabled={isCreatePending || mutationBusy || suggestionBusy}
        />
        <FormField
          id="goal-target-count"
          label="Số lượng cần đạt"
          value={targetCount}
          onChange={(event) => {
            setTargetCount(event.target.value);
            setCountError("");
          }}
          inputMode="numeric"
          required
          hint="Một số nguyên từ 1 đến 500."
          error={countError}
          inputRef={countRef}
          disabled={isCreatePending || mutationBusy || suggestionBusy}
        />
        <div className="field">
          <label htmlFor="goal-target-date">Ngày mục tiêu (không bắt buộc)</label>
          <div
            className={`field__control ${
              dateError ? "field__control--error" : ""
            }`}
          >
            <input
              ref={dateRef}
              id="goal-target-date"
              name="goal-target-date"
              type="date"
              value={targetDate}
              disabled={isCreatePending || mutationBusy || suggestionBusy}
              onChange={(event) => {
                setTargetDate(event.target.value);
                setDateError("");
              }}
              aria-invalid={Boolean(dateError)}
              aria-describedby={
                dateError ? "goal-target-date-error" : undefined
              }
            />
          </div>
          {dateError ? (
            <p
              className="field__error"
              id="goal-target-date-error"
              role="alert"
            >
              {dateError}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={isCreatePending || mutationBusy || suggestionBusy}
        >
          {isCreatePending ? "Đang tạo mục tiêu…" : "Tạo mục tiêu"}
        </Button>
      </form>

      {notice ? (
        <p className="form-error-box" role="alert">
          {notice}
        </p>
      ) : null}

      {goalItems.length === 0 ? (
        <div className="empty-state">
          <h3>Em chưa có mục tiêu nào</h3>
          <p>Tạo một mục tiêu nhỏ phía trên để bắt đầu học đều đặn.</p>
        </div>
      ) : (
        <div className="goal-groups">
          <section aria-labelledby="active-goals-title">
            <div className="goal-group__heading">
              <h3 id="active-goals-title">Đang thực hiện</h3>
              <span>{activeGoals.length}</span>
            </div>
            {activeGoals.length > 0 ? (
              <ul className="goal-list">{activeGoals.map(renderGoal)}</ul>
            ) : (
              <p className="goal-group__empty">
                Em chưa có mục tiêu đang thực hiện. Hãy tạo một mục tiêu nhỏ,
                vừa sức ở phía trên.
              </p>
            )}
          </section>

          <section aria-labelledby="completed-goals-title">
            <div className="goal-group__heading">
              <h3 id="completed-goals-title">Đã hoàn thành</h3>
              <span>{completedGoals.length}</span>
            </div>
            {completedGoals.length > 0 ? (
              <ul className="goal-list">{completedGoals.map(renderGoal)}</ul>
            ) : (
              <p className="goal-group__empty">
                Mục tiêu đã hoàn thành sẽ xuất hiện tại đây để em nhìn lại tiến
                bộ của mình.
              </p>
            )}
          </section>

          <section aria-labelledby="archived-goals-title">
            <div className="goal-group__heading">
              <h3 id="archived-goals-title">Đã lưu trữ</h3>
              <span>{archivedGoals.length}</span>
            </div>
            {archivedGoals.length > 0 ? (
              <ul className="goal-list">{archivedGoals.map(renderGoal)}</ul>
            ) : (
              <p className="goal-group__empty">
                Mục tiêu đã hoàn thành và được lưu trữ sẽ xuất hiện tại đây.
              </p>
            )}
          </section>
        </div>
      )}
      </section>
    </>
  );
}
