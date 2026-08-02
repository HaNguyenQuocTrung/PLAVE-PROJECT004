import { redirect } from "next/navigation";

import { GradeOneCompletionSummary } from "@/components/GradeOneCompletionSummary";
import { LearningAccessState } from "@/components/LearningAccessState";
import { PersonalizedLearningOverview } from "@/components/PersonalizedLearningOverview";
import { PersonalizedRecommendationCard } from "@/components/PersonalizedRecommendationCard";
import { loadStudentPersonalizedPath } from "@/lib/personalized-path/server";

export const metadata = {
  title: "Tổng kết Toán Lớp 1",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GradeOneSummaryPage() {
  const result = await loadStudentPersonalizedPath();
  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={result.reason === "ACCESS_DENIED" ? "FORBIDDEN" : "UNAVAILABLE"}
      />
    );
  }

  if (result.data.grade !== 1) {
    return <LearningAccessState kind="GRADE" />;
  }

  const { path } = result.data;

  return (
    <div className="grade-one-summary-page progress-page--v2 page-shell">
      <GradeOneCompletionSummary path={path} />
      <PersonalizedRecommendationCard path={path} />
      <PersonalizedLearningOverview path={path} />
    </div>
  );
}
