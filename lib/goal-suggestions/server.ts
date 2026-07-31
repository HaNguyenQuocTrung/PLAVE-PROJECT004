import "server-only";

import {
  parseParentGoalSuggestion,
  parseParentGoalSuggestionContext,
  parseStudentGoalSuggestion,
  parseStudentGoalSuggestionState,
  type GoalSuggestionRequest,
  type ParentGoalSuggestionContext,
  type StudentGoalSuggestionState,
} from "@/lib/goal-suggestions/contracts";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type GoalSuggestionRole = "STUDENT" | "PARENT";

type GoalSuggestionFailure = {
  ok: false;
  status: number;
  code:
    | "AUTH_REQUIRED"
    | "ACCESS_DENIED"
    | "SUGGESTION_STATE_CONFLICT"
    | "REQUEST_FAILED";
  message: string;
};

const accessDenied: GoalSuggestionFailure = {
  ok: false,
  status: 403,
  code: "ACCESS_DENIED",
  message: "Kết nối không còn cho phép thực hiện thao tác này.",
};

async function getGoalSuggestionActor(
  expectedRole?: GoalSuggestionRole,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      code: "AUTH_REQUIRED" as const,
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    (profile.role !== "STUDENT" && profile.role !== "PARENT") ||
    !profile.onboarding_completed ||
    (expectedRole && profile.role !== expectedRole)
  ) {
    return accessDenied;
  }

  return {
    ok: true as const,
    supabase,
    role: profile.role as GoalSuggestionRole,
  };
}

export async function loadParentGoalSuggestionContext(
  supabase: ServerSupabaseClient,
  connectionId: string,
): Promise<ParentGoalSuggestionContext | null> {
  const { data, error } = await supabase.rpc(
    "get_parent_goal_suggestion_context",
    { p_connection_id: connectionId },
  );
  if (error) return null;
  return parseParentGoalSuggestionContext(data);
}

export async function loadStudentGoalSuggestions(
  supabase: ServerSupabaseClient,
): Promise<StudentGoalSuggestionState | null> {
  const { data, error } = await supabase.rpc(
    "get_my_parent_goal_suggestions",
  );
  if (error) return null;
  return parseStudentGoalSuggestionState(data);
}

export async function loadGoalSuggestionStateForCurrentActor(
  connectionId: string | null,
) {
  const actor = await getGoalSuggestionActor();
  if (!actor.ok) return actor;

  if (actor.role === "PARENT") {
    if (!connectionId) return accessDenied;
    const context = await loadParentGoalSuggestionContext(
      actor.supabase,
      connectionId,
    );
    if (!context) return accessDenied;
    return {
      ok: true as const,
      status: 200,
      role: "PARENT" as const,
      context,
    };
  }

  const state = await loadStudentGoalSuggestions(actor.supabase);
  if (!state) {
    return {
      ok: false as const,
      status: 503,
      code: "REQUEST_FAILED" as const,
      message: "Chưa thể tải góp ý mục tiêu. Vui lòng thử lại.",
    };
  }
  return {
    ok: true as const,
    status: 200,
    role: "STUDENT" as const,
    state,
  };
}

export async function executeGoalSuggestionRequest(
  input: GoalSuggestionRequest,
) {
  const expectedRole =
    input.action === "SEND_NEW" ||
    input.action === "SEND_COMMENT" ||
    input.action === "WITHDRAW"
      ? "PARENT"
      : "STUDENT";
  const actor = await getGoalSuggestionActor(expectedRole);
  if (!actor.ok) return actor;

  const rpc =
    input.action === "SEND_NEW"
      ? actor.supabase.rpc("send_parent_goal_suggestion", {
          p_connection_id: input.connectionId,
          p_kind: "NEW_GOAL",
          p_goal_id: null,
          p_proposed_title: input.title,
          p_proposed_target_date: input.targetDate,
          p_message: input.message,
        })
      : input.action === "SEND_COMMENT"
        ? actor.supabase.rpc("send_parent_goal_suggestion", {
            p_connection_id: input.connectionId,
            p_kind: "EXISTING_GOAL_COMMENT",
            p_goal_id: input.goalId,
            p_proposed_title: null,
            p_proposed_target_date: null,
            p_message: input.message,
          })
        : input.action === "WITHDRAW"
          ? actor.supabase.rpc("withdraw_parent_goal_suggestion", {
              p_suggestion_id: input.suggestionId,
            })
          : actor.supabase.rpc("respond_parent_goal_suggestion", {
              p_suggestion_id: input.suggestionId,
              p_decision:
                input.action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
            });

  const { data, error } = await rpc;
  if (error) {
    return {
      ok: false as const,
      status: 409,
      code: "SUGGESTION_STATE_CONFLICT" as const,
      message:
        "Trạng thái góp ý đã thay đổi hoặc kết nối không còn hiệu lực.",
    };
  }

  const suggestion =
    expectedRole === "PARENT"
      ? parseParentGoalSuggestion(data)
      : parseStudentGoalSuggestion(data);
  if (!suggestion) {
    return {
      ok: false as const,
      status: 502,
      code: "REQUEST_FAILED" as const,
      message: "Chưa thể cập nhật góp ý mục tiêu. Vui lòng thử lại.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    suggestion,
  };
}
