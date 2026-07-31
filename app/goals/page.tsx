import { redirect } from "next/navigation";

import { GoalsManager } from "@/app/dashboard/GoalsManager";
import { LearningAccessState } from "@/components/LearningAccessState";
import { loadStudentGoalSuggestions } from "@/lib/goal-suggestions/server";
import { loadStudentGoals } from "@/lib/goals/server";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = {
  title: "Mục tiêu",
};

export default async function GoalsPage() {
  const access = await getStudentLearningContext();

  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={access.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  const [result, suggestionState] = await Promise.all([
    loadStudentGoals(access.supabase, access.user.id),
    loadStudentGoalSuggestions(access.supabase),
  ]);
  if (result.error) return <LearningAccessState kind="UNAVAILABLE" />;
  const goalsVersion = result.goals
    .map(
      (goal) =>
        `${goal.id}:${goal.status}:${goal.completed_at ?? ""}:${goal.archived_at ?? ""}`,
    )
    .join("|");
  const suggestionVersion =
    suggestionState?.suggestions
      .map(
        (suggestion) =>
          `${suggestion.suggestionId}:${suggestion.status}:${suggestion.acceptedGoal?.id ?? ""}`,
      )
      .join("|") ?? "unavailable";

  return (
    <div className="goals-page page-shell">
      <header className="catalog-hero catalog-hero--goals">
        <p className="eyebrow">Kế hoạch học tập của em</p>
        <h1>Mục tiêu cá nhân</h1>
        <p>
          Tạo mục tiêu vừa sức, đánh dấu khi hoàn thành và nhìn lại những điều
          em đã làm được.
        </p>
      </header>
      <GoalsManager
        key={`${goalsVersion}::${suggestionVersion}`}
        goals={result.goals}
        suggestions={suggestionState?.suggestions ?? []}
        suggestionsAvailable={suggestionState !== null}
      />
    </div>
  );
}
