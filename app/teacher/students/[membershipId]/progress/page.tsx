import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { MotivationOverview } from "@/components/MotivationOverview";
import { isUuid } from "@/lib/classrooms/contracts";
import {
  getTeacherAccount,
  loadTeacherStudentLearningMotivation,
} from "@/lib/teacher/server";

export const metadata = { title: "Tiến trình học sinh" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherStudentProgressPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  if (!isUuid(membershipId)) return <AccessDenied />;
  const account = await getTeacherAccount();
  if (!account.ok) {
    if (account.reason === "UNAUTHENTICATED") redirect("/login");
    if (account.reason === "ACTIVATION_REQUIRED") redirect("/teacher/onboarding");
    return <AccessDenied />;
  }
  const result = await loadTeacherStudentLearningMotivation(
    account.supabase,
    membershipId,
  );
  if (!result.ok) return <AccessDenied />;

  return (
    <div className="teacher-workspace-page--v2 page-shell">
      <header className="catalog-hero teacher-hero">
        <div>
          <p className="eyebrow">Tiến trình chỉ đọc · Lớp {result.student.grade}</p>
          <h1>{result.student.displayName}</h1>
          <p>
            Chỉ hiển thị tổng hợp học tập của thành viên đã được duyệt; không
            hiển thị đáp án, lời giải riêng hoặc dữ liệu chính sách nội bộ.
          </p>
        </div>
        <Button href="/teacher/classrooms" variant="secondary">
          Về danh sách lớp
        </Button>
      </header>

      <section className="scoring-overview dashboard-section" aria-labelledby="teacher-student-mastery-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Điểm, XP và thành thạo</p>
          <h2 id="teacher-student-mastery-title">Tổng hợp tiến bộ</h2>
        </div>
        <div className="scoring-result">
          <div><span>Tổng XP</span><strong>{result.scoring.totalXp} XP</strong></div>
          <div><span>Mục tiêu thành thạo</span><strong>{result.scoring.masterySummary.mastered}</strong></div>
          <div><span>Nên ôn lại</span><strong>{result.scoring.masterySummary.needsReview}</strong></div>
        </div>
      </section>

      <MotivationOverview motivation={result.motivation} audience="ADULT" />
    </div>
  );
}
