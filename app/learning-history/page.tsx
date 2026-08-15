import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { StudentCurriculumHistoryView } from "@/components/StudentCurriculumHistoryView";
import { loadStudentCurriculumHistory } from "@/lib/curriculum-runtime/server";

export const metadata = { title: "Lịch sử học tập" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LearningHistoryPage() {
  const result = await loadStudentCurriculumHistory();
  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={
          result.reason === "ACCESS_DENIED"
            ? "FORBIDDEN"
            : result.reason === "DISABLED"
              ? "NOT_FOUND"
              : "UNAVAILABLE"
        }
      />
    );
  }
  return (
    <StudentCurriculumHistoryView
      history={result.history}
      enrichmentAvailable={result.scoring !== null}
      scoringTotalXp={result.scoring?.totalXp ?? null}
    />
  );
}
