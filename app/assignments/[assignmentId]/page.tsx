import { redirect } from "next/navigation";

import { AssignmentRunner } from "@/components/AssignmentRunner";
import { Button } from "@/components/Button";
import { LearningAccessState } from "@/components/LearningAccessState";
import { isAssignmentUuid } from "@/lib/assignments/contracts";
import { loadAssignmentRunnerState } from "@/lib/assignments/server";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = { title: "Làm bài giáo viên giao" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ assignmentId: string }>;
};

export default async function AssignmentRunnerPage({ params }: Props) {
  const { assignmentId } = await params;
  if (!isAssignmentUuid(assignmentId)) {
    return (
      <section className="content-page page-shell">
        <h1>Đường dẫn bài tập chưa hợp lệ</h1>
        <Button href="/assignments">Về danh sách bài tập</Button>
      </section>
    );
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

  const result = await loadAssignmentRunnerState(
    access.supabase,
    assignmentId,
  );
  if (!result.ok) {
    return (
      <section className="content-page page-shell">
        <h1>Chưa thể mở bài tập</h1>
        <p>{result.message}</p>
        <Button href="/assignments">Về danh sách bài tập</Button>
      </section>
    );
  }

  if (result.state.submissionStatus === "SUBMITTED") {
    redirect(`/assignments/${assignmentId}/review`);
  }

  return (
    <div className="assignment-runner-page page-shell">
      <AssignmentRunner initialState={result.state} />
    </div>
  );
}
