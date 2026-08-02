import { redirect } from "next/navigation";

import {
  UniversalCurriculumRunner,
} from "@/app/curriculum-practice/[attemptId]/UniversalCurriculumRunner";
import { LearningAccessState } from "@/components/LearningAccessState";
import {
  loadOnDemandAttemptState,
} from "@/lib/curriculum/on-demand-runtime";

export const metadata = { title: "Luyện tập phù hợp tiến độ" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ attemptId: string }> };

export default async function OnDemandPracticePage({ params }: PageProps) {
  const { attemptId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      attemptId,
    )
  ) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }
  const result = await loadOnDemandAttemptState(attemptId);
  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={
          result.reason === "ACCESS_DENIED"
            ? "FORBIDDEN"
            : result.reason === "RUNTIME_DISABLED"
              ? "NOT_FOUND"
              : "UNAVAILABLE"
        }
      />
    );
  }
  if (result.state.feedback !== null) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }
  return (
    <div className="practice-page practice-focus-shell page-shell universal-practice-page">
      <UniversalCurriculumRunner
        initialState={result.state}
        runtimeMode="ON_DEMAND"
      />
    </div>
  );
}
