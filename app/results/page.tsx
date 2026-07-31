import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { PracticeHistory } from "@/components/PracticeHistory";
import {
  isUnitSlug,
  parseAttemptRows,
} from "@/lib/practice/contracts";
import { buildPracticeHistory } from "@/lib/practice/history";
import {
  getGradeContentEmptyDescription,
  getGradeContentEmptyTitle,
} from "@/lib/practice/grade-content";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = {
  title: "Kết quả học tập",
};

export default async function ResultsPage() {
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

  const [
    { data: unitRows, error: unitError },
    { data: attemptRows, error: attemptError },
  ] = await Promise.all([
    access.supabase
      .from("learning_units")
      .select(
        "slug, grade, title, published, prerequisite_unit_slug",
      )
      .order("grade", { ascending: true })
      .order("display_order", { ascending: true }),
    access.supabase
      .from("practice_attempts")
      .select(
        "id, unit_slug, status, question_order, total_questions, answered_count, correct_count, started_at, completed_at",
      )
      .eq("student_id", access.user.id)
      .order("started_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (unitError || attemptError) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }

  const unitTitles: Record<string, string> = {};
  let currentGradeUnitCount = 0;
  for (const row of unitRows ?? []) {
    if (
      !isUnitSlug(row.slug) ||
      typeof row.title !== "string" ||
      row.title.trim().length === 0 ||
      !Number.isInteger(row.grade) ||
      Number(row.grade) < 1 ||
      Number(row.grade) > 9 ||
      typeof row.published !== "boolean"
    ) {
      return <LearningAccessState kind="UNAVAILABLE" />;
    }
    unitTitles[row.slug] = row.title;
    if (row.grade === access.grade && row.published) {
      currentGradeUnitCount += 1;
    }
  }

  const attempts = parseAttemptRows(attemptRows);
  if (!attempts) return <LearningAccessState kind="UNAVAILABLE" />;

  return (
    <div className="results-page page-shell">
      <header className="catalog-hero catalog-hero--results">
        <p className="eyebrow">Tiến bộ qua từng lượt</p>
        <h1>Kết quả học tập của em</h1>
        <p>
          Mỗi bài làm được lưu riêng để em xem lại lời giải và tiếp tục lượt
          đang học.
        </p>
      </header>
      {currentGradeUnitCount === 0 ? (
        <section className="empty-state">
          <h2>{getGradeContentEmptyTitle(access.grade)}</h2>
          <p>
            {getGradeContentEmptyDescription()} Lịch sử thuộc khối lớp trước
            vẫn được giữ nguyên bên dưới.
          </p>
        </section>
      ) : null}
      <PracticeHistory
        history={buildPracticeHistory(attempts)}
        unitTitles={unitTitles}
      />
    </div>
  );
}
