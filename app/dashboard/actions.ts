"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GoalMutationCode =
  | "GOAL_NOT_FOUND"
  | "GOAL_NOT_COMPLETED"
  | "GOAL_STATE_CONFLICT"
  | "GOAL_FORBIDDEN"
  | "GOAL_UPDATE_FAILED";

type GoalLifecycleStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type GoalMutationData = {
  id: string;
  status: GoalLifecycleStatus;
  completedAt: string | null;
  archivedAt: string | null;
};

type GoalMutationResult =
  | {
      ok: true;
      code: "GOAL_UPDATED" | "GOAL_ALREADY_APPLIED";
      message: "";
      goal: GoalMutationData;
    }
  | {
      ok: false;
      code: GoalMutationCode;
      message: string;
    };

type GoalMutationFailure = Extract<GoalMutationResult, { ok: false }>;

const goalMutationMessages: Record<GoalMutationCode, string> = {
  GOAL_NOT_FOUND: "Không tìm thấy mục tiêu cần cập nhật.",
  GOAL_NOT_COMPLETED:
    "Mục tiêu cần được hoàn thành trước khi lưu trữ.",
  GOAL_STATE_CONFLICT:
    "Trạng thái mục tiêu đã thay đổi. Danh sách đã được cập nhật.",
  GOAL_FORBIDDEN: "Tài khoản không có quyền cập nhật mục tiêu này.",
  GOAL_UPDATE_FAILED: "Chưa thể cập nhật mục tiêu. Vui lòng thử lại.",
};

function goalMutationFailure(code: GoalMutationCode): GoalMutationFailure {
  return { ok: false, code, message: goalMutationMessages[code] };
}

function parseGoalMutationData(value: unknown): GoalMutationData | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("status" in value) ||
    (value.status !== "ACTIVE" &&
      value.status !== "COMPLETED" &&
      value.status !== "ARCHIVED") ||
    !("completed_at" in value) ||
    (typeof value.completed_at !== "string" &&
      value.completed_at !== null) ||
    !("archived_at" in value) ||
    (typeof value.archived_at !== "string" &&
      value.archived_at !== null)
  ) {
    return null;
  }

  return {
    id: value.id,
    status: value.status,
    completedAt: value.completed_at,
    archivedAt: value.archived_at,
  };
}

async function getAuthorizedStudent() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return goalMutationFailure("GOAL_FORBIDDEN");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "STUDENT" ||
    !profile.onboarding_completed
  ) {
    return goalMutationFailure("GOAL_FORBIDDEN");
  }

  return { ok: true as const, supabase, userId: user.id };
}

function isValidDate(value: string) {
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

export async function createLearningGoal(input: {
  title: string;
  targetCount: number;
  targetDate: string;
}) {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) {
    return {
      ok: false,
      message: "Tên mục tiêu cần có từ 3 đến 120 ký tự.",
    };
  }
  if (
    !Number.isInteger(input.targetCount) ||
    input.targetCount < 1 ||
    input.targetCount > 500
  ) {
    return {
      ok: false,
      message: "Số lượng mục tiêu cần nằm trong khoảng 1 đến 500.",
    };
  }
  if (input.targetDate && !isValidDate(input.targetDate)) {
    return { ok: false, message: "Ngày mục tiêu không hợp lệ." };
  }

  try {
    const auth = await getAuthorizedStudent();
    if (!auth.ok) return auth;

    const { count, error: countError } = await auth.supabase
      .from("learning_goals")
      .select("id", { count: "exact", head: true })
      .eq("student_id", auth.userId)
      .eq("status", "ACTIVE");

    if (countError) {
      return { ok: false, message: "Chưa thể kiểm tra danh sách mục tiêu." };
    }
    if ((count ?? 0) >= 10) {
      return {
        ok: false,
        message:
          "Em đang có 10 mục tiêu hoạt động. Hãy hoàn thành một mục tiêu trước.",
      };
    }

    const { error } = await auth.supabase.from("learning_goals").insert({
      student_id: auth.userId,
      title,
      target_count: input.targetCount,
      target_date: input.targetDate || null,
      status: "ACTIVE",
    });

    if (error) {
      return {
        ok: false,
        message: "Chưa thể tạo mục tiêu. Vui lòng kiểm tra và thử lại.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/goals");
    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "Chưa thể kết nối dữ liệu mục tiêu. Vui lòng thử lại sau.",
    };
  }
}

type GoalOperation = "COMPLETE" | "ARCHIVE" | "RESTORE";

async function mutateGoal(
  goalId: string,
  operation: GoalOperation,
): Promise<GoalMutationResult> {
  if (!uuidPattern.test(goalId)) {
    return goalMutationFailure("GOAL_NOT_FOUND");
  }

  try {
    const auth = await getAuthorizedStudent();
    if (!auth.ok) return auth;

    const mutationTime = new Date().toISOString();
    let mutation = auth.supabase
      .from("learning_goals")
      .update(
        operation === "COMPLETE"
          ? {
              status: "COMPLETED",
              completed_at: mutationTime,
              archived_at: null,
            }
          : operation === "ARCHIVE"
            ? {
                status: "ARCHIVED",
                archived_at: mutationTime,
              }
            : {
                status: "COMPLETED",
                archived_at: null,
              },
      )
      .eq("id", goalId)
      .eq("student_id", auth.userId);

    if (operation === "COMPLETE") {
      mutation = mutation
        .eq("status", "ACTIVE")
        .is("completed_at", null)
        .is("archived_at", null);
    } else if (operation === "ARCHIVE") {
      mutation = mutation
        .eq("status", "COMPLETED")
        .not("completed_at", "is", null)
        .is("archived_at", null);
    } else {
      mutation = mutation
        .eq("status", "ARCHIVED")
        .not("completed_at", "is", null)
        .not("archived_at", "is", null);
    }

    const { data: updatedRow, error: updateError } = await mutation
      .select("id, status, completed_at, archived_at")
      .maybeSingle();

    if (updateError) {
      if (
        updateError.code === "23514" ||
        updateError.code === "P0001"
      ) {
        return goalMutationFailure("GOAL_STATE_CONFLICT");
      }
      return goalMutationFailure("GOAL_UPDATE_FAILED");
    }

    const updatedGoal = parseGoalMutationData(updatedRow);
    if (updatedGoal) {
      revalidatePath("/dashboard");
      revalidatePath("/goals");
      return {
        ok: true,
        code: "GOAL_UPDATED",
        message: "",
        goal: updatedGoal,
      };
    }

    const { data: currentRow, error: currentError } = await auth.supabase
      .from("learning_goals")
      .select("id, status, completed_at, archived_at")
      .eq("id", goalId)
      .eq("student_id", auth.userId)
      .maybeSingle();

    if (currentError) {
      return goalMutationFailure("GOAL_UPDATE_FAILED");
    }

    const currentGoal = parseGoalMutationData(currentRow);
    if (!currentGoal) {
      return goalMutationFailure("GOAL_NOT_FOUND");
    }

    const alreadyApplied =
      (operation === "COMPLETE" &&
        currentGoal.status === "COMPLETED" &&
        currentGoal.completedAt !== null &&
        currentGoal.archivedAt === null) ||
      (operation === "ARCHIVE" &&
        currentGoal.status === "ARCHIVED" &&
        currentGoal.completedAt !== null &&
        currentGoal.archivedAt !== null) ||
      (operation === "RESTORE" &&
        currentGoal.status === "COMPLETED" &&
        currentGoal.completedAt !== null &&
        currentGoal.archivedAt === null);

    if (alreadyApplied) {
      return {
        ok: true,
        code: "GOAL_ALREADY_APPLIED",
        message: "",
        goal: currentGoal,
      };
    }

    if (operation === "ARCHIVE" && currentGoal.status === "ACTIVE") {
      return goalMutationFailure("GOAL_NOT_COMPLETED");
    }

    return goalMutationFailure("GOAL_STATE_CONFLICT");
  } catch {
    return goalMutationFailure("GOAL_UPDATE_FAILED");
  }
}

export async function completeGoal(goalId: string) {
  return mutateGoal(goalId, "COMPLETE");
}

export async function archiveGoal(goalId: string) {
  return mutateGoal(goalId, "ARCHIVE");
}

export async function restoreGoal(goalId: string) {
  return mutateGoal(goalId, "RESTORE");
}
