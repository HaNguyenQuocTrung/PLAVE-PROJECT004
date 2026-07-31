export const goalSuggestionStatuses = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
] as const;

export type GoalSuggestionStatus =
  (typeof goalSuggestionStatuses)[number];

export type GoalSuggestionKind =
  | "NEW_GOAL"
  | "EXISTING_GOAL_COMMENT";

export type SuggestedActiveGoal = {
  goalId: string;
  title: string;
  targetDate: string | null;
};

export type AcceptedSuggestedGoal = {
  id: string;
  title: string;
  targetCount: number;
  targetDate: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  createdAt: string;
  completedAt: string | null;
  archivedAt: string | null;
};

export type GoalSuggestion = {
  suggestionId: string;
  kind: GoalSuggestionKind;
  goalId: string | null;
  goalTitle: string | null;
  proposedTitle: string | null;
  proposedTargetDate: string | null;
  message: string | null;
  status: GoalSuggestionStatus;
  createdAt: string;
  respondedAt: string | null;
  withdrawnAt: string | null;
  acceptedGoal: AcceptedSuggestedGoal | null;
};

export type ParentGoalSuggestionContext = {
  activeGoals: SuggestedActiveGoal[];
  suggestions: GoalSuggestion[];
};

export type StudentGoalSuggestion = GoalSuggestion & {
  parentDisplayName: string;
  connectionActive: boolean;
};

export type StudentGoalSuggestionState = {
  suggestions: StudentGoalSuggestion[];
};

export type GoalSuggestionRequest =
  | {
      action: "SEND_NEW";
      connectionId: string;
      title: string;
      targetDate: string | null;
      message: string | null;
    }
  | {
      action: "SEND_COMMENT";
      connectionId: string;
      goalId: string;
      message: string;
    }
  | {
      action: "WITHDRAW" | "ACCEPT" | "DECLINE";
      suggestionId: string;
    };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isGoalSuggestionUuid(value: unknown): value is string {
  return isUuid(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isOptionalTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isOptionalDate(value: unknown): value is string | null {
  return value === null || isCalendarDate(value);
}

function isOptionalText(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value === value.trim() &&
      value.length >= minimum &&
      value.length <= maximum)
  );
}

function parseAcceptedGoal(value: unknown): AcceptedSuggestedGoal | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "title",
      "target_count",
      "target_date",
      "status",
      "created_at",
      "completed_at",
      "archived_at",
    ]) ||
    !isUuid(value.id) ||
    typeof value.title !== "string" ||
    value.title !== value.title.trim() ||
    value.title.length < 3 ||
    value.title.length > 120 ||
    !Number.isInteger(value.target_count) ||
    Number(value.target_count) < 1 ||
    Number(value.target_count) > 500 ||
    !isOptionalDate(value.target_date) ||
    (value.status !== "ACTIVE" &&
      value.status !== "COMPLETED" &&
      value.status !== "ARCHIVED") ||
    !isTimestamp(value.created_at) ||
    !isOptionalTimestamp(value.completed_at) ||
    !isOptionalTimestamp(value.archived_at)
  ) {
    return null;
  }

  if (
    (value.status === "ACTIVE" &&
      (value.completed_at !== null || value.archived_at !== null)) ||
    (value.status === "COMPLETED" &&
      (value.completed_at === null || value.archived_at !== null)) ||
    (value.status === "ARCHIVED" &&
      (value.completed_at === null || value.archived_at === null))
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    targetCount: Number(value.target_count),
    targetDate: value.target_date,
    status: value.status,
    createdAt: value.created_at,
    completedAt: value.completed_at,
    archivedAt: value.archived_at,
  };
}

function parseSuggestion(
  value: unknown,
  includeAcceptedGoal: boolean,
): GoalSuggestion | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "suggestion_id",
      "kind",
      "goal_id",
      "goal_title",
      "proposed_title",
      "proposed_target_date",
      "message",
      "status",
      "created_at",
      "responded_at",
      "withdrawn_at",
      "accepted_goal",
    ]) ||
    !isUuid(value.suggestion_id) ||
    (value.kind !== "NEW_GOAL" &&
      value.kind !== "EXISTING_GOAL_COMMENT") ||
    (value.goal_id !== null && !isUuid(value.goal_id)) ||
    !isOptionalText(value.goal_title, 3, 120) ||
    !isOptionalText(value.proposed_title, 3, 120) ||
    !isOptionalDate(value.proposed_target_date) ||
    !isOptionalText(value.message, 2, 300) ||
    (value.status !== "PENDING" &&
      value.status !== "ACCEPTED" &&
      value.status !== "DECLINED" &&
      value.status !== "WITHDRAWN") ||
    !isTimestamp(value.created_at) ||
    !isOptionalTimestamp(value.responded_at) ||
    !isOptionalTimestamp(value.withdrawn_at)
  ) {
    return null;
  }

  const acceptedGoal =
    value.accepted_goal === null
      ? null
      : parseAcceptedGoal(value.accepted_goal);
  if (value.accepted_goal !== null && !acceptedGoal) return null;
  if (!includeAcceptedGoal && value.accepted_goal !== null) return null;

  const isNewGoal = value.kind === "NEW_GOAL";
  if (
    (isNewGoal &&
      (value.goal_id !== null ||
        value.goal_title !== null ||
        value.proposed_title === null)) ||
    (!isNewGoal &&
      (value.goal_id === null ||
        value.goal_title === null ||
        value.proposed_title !== null ||
        value.proposed_target_date !== null ||
        value.message === null))
  ) {
    return null;
  }

  if (
    (value.status === "PENDING" &&
      (value.responded_at !== null ||
        value.withdrawn_at !== null ||
        acceptedGoal !== null)) ||
    (value.status === "ACCEPTED" &&
      (value.responded_at === null ||
        value.withdrawn_at !== null ||
        (isNewGoal && includeAcceptedGoal && acceptedGoal === null) ||
        (!isNewGoal && acceptedGoal !== null))) ||
    (value.status === "DECLINED" &&
      (value.responded_at === null ||
        value.withdrawn_at !== null ||
        acceptedGoal !== null)) ||
    (value.status === "WITHDRAWN" &&
      (value.responded_at !== null ||
        value.withdrawn_at === null ||
        acceptedGoal !== null))
  ) {
    return null;
  }

  return {
    suggestionId: value.suggestion_id,
    kind: value.kind,
    goalId: value.goal_id,
    goalTitle: value.goal_title,
    proposedTitle: value.proposed_title,
    proposedTargetDate: value.proposed_target_date,
    message: value.message,
    status: value.status,
    createdAt: value.created_at,
    respondedAt: value.responded_at,
    withdrawnAt: value.withdrawn_at,
    acceptedGoal,
  };
}

export function parseParentGoalSuggestionContext(
  value: unknown,
): ParentGoalSuggestionContext | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["active_goals", "suggestions"]) ||
    !Array.isArray(value.active_goals) ||
    !Array.isArray(value.suggestions)
  ) {
    return null;
  }

  const activeGoals: SuggestedActiveGoal[] = [];
  for (const goal of value.active_goals) {
    if (
      !isRecord(goal) ||
      !hasOnlyKeys(goal, ["goal_id", "title", "target_date"]) ||
      !isUuid(goal.goal_id) ||
      typeof goal.title !== "string" ||
      goal.title !== goal.title.trim() ||
      goal.title.length < 3 ||
      goal.title.length > 120 ||
      !isOptionalDate(goal.target_date)
    ) {
      return null;
    }
    activeGoals.push({
      goalId: goal.goal_id,
      title: goal.title,
      targetDate: goal.target_date,
    });
  }

  const suggestions: GoalSuggestion[] = [];
  for (const item of value.suggestions) {
    const suggestion = parseSuggestion(item, false);
    if (!suggestion) return null;
    suggestions.push(suggestion);
  }

  return { activeGoals, suggestions };
}

export function parseStudentGoalSuggestionState(
  value: unknown,
): StudentGoalSuggestionState | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["suggestions"]) ||
    !Array.isArray(value.suggestions)
  ) {
    return null;
  }

  const suggestions: StudentGoalSuggestion[] = [];
  for (const item of value.suggestions) {
    if (
      !isRecord(item) ||
      typeof item.parent_display_name !== "string" ||
      item.parent_display_name.trim().length < 2 ||
      typeof item.connection_active !== "boolean"
    ) {
      return null;
    }

    const baseItem = { ...item };
    delete baseItem.parent_display_name;
    delete baseItem.connection_active;
    const suggestion = parseSuggestion(baseItem, true);
    if (!suggestion) return null;

    suggestions.push({
      ...suggestion,
      parentDisplayName: item.parent_display_name,
      connectionActive: item.connection_active,
    });
  }

  return { suggestions };
}

export function parseParentGoalSuggestion(value: unknown) {
  return parseSuggestion(value, false);
}

export function parseStudentGoalSuggestion(value: unknown) {
  return parseSuggestion(value, true);
}

function normalizeOptionalText(value: unknown, maximum: number) {
  if (typeof value !== "string" || value.length > maximum) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

export function parseGoalSuggestionRequest(
  value: unknown,
): GoalSuggestionRequest | null {
  if (!isRecord(value) || typeof value.action !== "string") return null;

  if (value.action === "SEND_NEW") {
    if (
      !hasOnlyKeys(value, [
        "action",
        "connectionId",
        "title",
        "targetDate",
        "message",
      ]) ||
      !isUuid(value.connectionId)
    ) {
      return null;
    }

    const title = normalizeOptionalText(value.title, 120);
    const message = normalizeOptionalText(value.message, 300);
    const targetDate =
      value.targetDate === "" || value.targetDate === null
        ? null
        : value.targetDate;
    if (
      !title ||
      title.length < 3 ||
      (targetDate !== null && !isCalendarDate(targetDate)) ||
      (message !== null && message.length < 2)
    ) {
      return null;
    }

    return {
      action: "SEND_NEW",
      connectionId: value.connectionId,
      title,
      targetDate,
      message,
    };
  }

  if (value.action === "SEND_COMMENT") {
    if (
      !hasOnlyKeys(value, [
        "action",
        "connectionId",
        "goalId",
        "message",
      ]) ||
      !isUuid(value.connectionId) ||
      !isUuid(value.goalId)
    ) {
      return null;
    }

    const message = normalizeOptionalText(value.message, 300);
    if (!message || message.length < 2) return null;
    return {
      action: "SEND_COMMENT",
      connectionId: value.connectionId,
      goalId: value.goalId,
      message,
    };
  }

  if (
    value.action === "WITHDRAW" ||
    value.action === "ACCEPT" ||
    value.action === "DECLINE"
  ) {
    if (
      !hasOnlyKeys(value, ["action", "suggestionId"]) ||
      !isUuid(value.suggestionId)
    ) {
      return null;
    }
    return {
      action: value.action,
      suggestionId: value.suggestionId,
    };
  }

  return null;
}

function parseCanonicalAcceptedGoal(
  value: unknown,
): AcceptedSuggestedGoal | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "title",
      "targetCount",
      "targetDate",
      "status",
      "createdAt",
      "completedAt",
      "archivedAt",
    ])
  ) {
    return null;
  }

  return parseAcceptedGoal({
    id: value.id,
    title: value.title,
    target_count: value.targetCount,
    target_date: value.targetDate,
    status: value.status,
    created_at: value.createdAt,
    completed_at: value.completedAt,
    archived_at: value.archivedAt,
  });
}

function parseCanonicalSuggestion(
  value: unknown,
  includeAcceptedGoal: boolean,
): GoalSuggestion | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "suggestionId",
      "kind",
      "goalId",
      "goalTitle",
      "proposedTitle",
      "proposedTargetDate",
      "message",
      "status",
      "createdAt",
      "respondedAt",
      "withdrawnAt",
      "acceptedGoal",
    ])
  ) {
    return null;
  }

  const acceptedGoal =
    value.acceptedGoal === null
      ? null
      : parseCanonicalAcceptedGoal(value.acceptedGoal);
  if (value.acceptedGoal !== null && !acceptedGoal) return null;

  return parseSuggestion(
    {
      suggestion_id: value.suggestionId,
      kind: value.kind,
      goal_id: value.goalId,
      goal_title: value.goalTitle,
      proposed_title: value.proposedTitle,
      proposed_target_date: value.proposedTargetDate,
      message: value.message,
      status: value.status,
      created_at: value.createdAt,
      responded_at: value.respondedAt,
      withdrawn_at: value.withdrawnAt,
      accepted_goal:
        acceptedGoal === null
          ? null
          : {
              id: acceptedGoal.id,
              title: acceptedGoal.title,
              target_count: acceptedGoal.targetCount,
              target_date: acceptedGoal.targetDate,
              status: acceptedGoal.status,
              created_at: acceptedGoal.createdAt,
              completed_at: acceptedGoal.completedAt,
              archived_at: acceptedGoal.archivedAt,
            },
    },
    includeAcceptedGoal,
  );
}

function parseCanonicalParentContext(
  value: unknown,
): ParentGoalSuggestionContext | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["activeGoals", "suggestions"]) ||
    !Array.isArray(value.activeGoals) ||
    !Array.isArray(value.suggestions)
  ) {
    return null;
  }

  const activeGoals: SuggestedActiveGoal[] = [];
  for (const goal of value.activeGoals) {
    if (
      !isRecord(goal) ||
      !hasOnlyKeys(goal, ["goalId", "title", "targetDate"]) ||
      !isUuid(goal.goalId) ||
      typeof goal.title !== "string" ||
      goal.title !== goal.title.trim() ||
      goal.title.length < 3 ||
      goal.title.length > 120 ||
      !isOptionalDate(goal.targetDate)
    ) {
      return null;
    }
    activeGoals.push({
      goalId: goal.goalId,
      title: goal.title,
      targetDate: goal.targetDate,
    });
  }

  const suggestions: GoalSuggestion[] = [];
  for (const item of value.suggestions) {
    const suggestion = parseCanonicalSuggestion(item, false);
    if (!suggestion) return null;
    suggestions.push(suggestion);
  }
  return { activeGoals, suggestions };
}

function parseCanonicalStudentState(
  value: unknown,
): StudentGoalSuggestionState | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["suggestions"]) ||
    !Array.isArray(value.suggestions)
  ) {
    return null;
  }

  const suggestions: StudentGoalSuggestion[] = [];
  for (const item of value.suggestions) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "suggestionId",
        "kind",
        "goalId",
        "goalTitle",
        "proposedTitle",
        "proposedTargetDate",
        "message",
        "status",
        "createdAt",
        "respondedAt",
        "withdrawnAt",
        "acceptedGoal",
        "parentDisplayName",
        "connectionActive",
      ]) ||
      typeof item.parentDisplayName !== "string" ||
      item.parentDisplayName.trim().length < 2 ||
      typeof item.connectionActive !== "boolean"
    ) {
      return null;
    }

    const suggestion = parseCanonicalSuggestion(
      {
        suggestionId: item.suggestionId,
        kind: item.kind,
        goalId: item.goalId,
        goalTitle: item.goalTitle,
        proposedTitle: item.proposedTitle,
        proposedTargetDate: item.proposedTargetDate,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt,
        respondedAt: item.respondedAt,
        withdrawnAt: item.withdrawnAt,
        acceptedGoal: item.acceptedGoal,
      },
      true,
    );
    if (!suggestion) return null;
    suggestions.push({
      ...suggestion,
      parentDisplayName: item.parentDisplayName,
      connectionActive: item.connectionActive,
    });
  }
  return { suggestions };
}

export function parseGoalSuggestionApiError(value: unknown) {
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

export function parseGoalSuggestionMutationApiResponse(
  value: unknown,
  viewerRole: "PARENT" | "STUDENT",
) {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !hasOnlyKeys(value, ["ok", "data"]) ||
    !isRecord(value.data) ||
    !hasOnlyKeys(value.data, ["suggestion"])
  ) {
    return null;
  }
  return parseCanonicalSuggestion(
    value.data.suggestion,
    viewerRole === "STUDENT",
  );
}

export function parseGoalSuggestionStateApiResponse(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !hasOnlyKeys(value, ["ok", "data"]) ||
    !isRecord(value.data) ||
    typeof value.data.viewerRole !== "string"
  ) {
    return null;
  }

  if (
    value.data.viewerRole === "PARENT" &&
    hasOnlyKeys(value.data, ["viewerRole", "context"])
  ) {
    const context = parseCanonicalParentContext(value.data.context);
    return context
      ? { viewerRole: "PARENT" as const, context }
      : null;
  }

  if (
    value.data.viewerRole === "STUDENT" &&
    hasOnlyKeys(value.data, ["viewerRole", "state"])
  ) {
    const state = parseCanonicalStudentState(value.data.state);
    return state ? { viewerRole: "STUDENT" as const, state } : null;
  }

  return null;
}
