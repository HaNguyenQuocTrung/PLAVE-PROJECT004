import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { parseCurriculumAttemptState } from "@/lib/curriculum-runtime/contracts";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import { getStudentLearningContext } from "@/lib/practice/server";

import { UniversalCurriculumRunner } from "./UniversalCurriculumRunner";

export const metadata = { title: "Luyện tập theo chương trình" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ attemptId: string }> };

export default async function CurriculumPracticePage({ params }: PageProps) {
  const { attemptId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      attemptId,
    )
  ) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }
  if (!getUniversalCurriculumRuntimeFlag().enabled) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }
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
  if (access.grade === 1) {
    return <LearningAccessState kind="NOT_FOUND" />;
  }
  const { data, error } = await access.supabase.rpc(
    "get_curriculum_attempt_state",
    { p_attempt_id: attemptId },
  );
  const state = error ? null : parseCurriculumAttemptState(data);
  if (!state) return <LearningAccessState kind="NOT_FOUND" />;
  if (state.grade !== access.grade || state.feedback !== null) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }
  return (
    <div className="practice-page page-shell universal-practice-page">
      <UniversalCurriculumRunner initialState={state} />
    </div>
  );
}
