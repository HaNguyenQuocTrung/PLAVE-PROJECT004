import "server-only";

import type { createClient } from "@/lib/supabase/server";

export type LearningGoal = {
  id: string;
  title: string;
  target_count: number;
  target_date: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  created_at: string;
  completed_at: string | null;
  archived_at: string | null;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadStudentGoals(
  supabase: ServerSupabaseClient,
  studentId: string,
) {
  const { data, error } = await supabase
    .from("learning_goals")
    .select(
      "id, title, target_count, target_date, status, created_at, completed_at, archived_at",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  return {
    goals: (data ?? []) as LearningGoal[],
    error: Boolean(error),
  };
}
