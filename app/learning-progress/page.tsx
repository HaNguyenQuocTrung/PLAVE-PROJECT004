import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { StudentCurriculumProgressView } from "@/components/StudentCurriculumProgressView";
import { loadStudentCurriculumProgress } from "@/lib/curriculum-runtime/server";

export const metadata = { title: "Tiến trình học tập" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LearningProgressPage() {
  const result = await loadStudentCurriculumProgress();
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
  return <StudentCurriculumProgressView progress={result.progress} />;
}
