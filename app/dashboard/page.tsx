import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { ConnectionsManager } from "@/components/ConnectionsManager";
import { ControlledPilotCard } from "@/components/ControlledPilotCard";
import { CompetencyLearningPathPanel } from "@/components/CompetencyLearningPathPanel";
import { CopyStudentCode } from "@/components/CopyStudentCode";
import { PersonalizedLearningOverview } from "@/components/PersonalizedLearningOverview";
import { PersonalizedRecommendationCard } from "@/components/PersonalizedRecommendationCard";
import { PracticeHistory } from "@/components/PracticeHistory";
import { StudentAssignmentsPanel } from "@/components/StudentAssignmentsPanel";
import { StartDiagnosticButton } from "@/components/StartDiagnosticButton";
import { GeneratedPracticePilotCard } from "@/components/GeneratedPracticePilotCard";
import { loadStudentAssignments } from "@/lib/assignments/server";
import { loadStudentClassrooms } from "@/lib/classrooms/server";
import { loadConnectionState } from "@/lib/connections/server";
import { DIAGNOSTIC_QUESTION_COUNT } from "@/lib/diagnostic/contracts";
import { buildStudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import {
  type StudentCurriculumProgress,
} from "@/lib/curriculum-runtime/contracts";
import { loadStudentCurriculumProgress } from "@/lib/curriculum-runtime/server";
import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import { recordUniversalAvailabilityDiagnostic } from "@/lib/curriculum-runtime/diagnostics";
import { loadStudentGoals } from "@/lib/goals/server";
import type { PersonalizedLearningPath } from "@/lib/personalized-path/contracts";
import { loadStudentPersonalizedPathWithClient } from "@/lib/personalized-path/server";
import { buildPracticeHistory } from "@/lib/practice/history";
import {
  getGradeContentEmptyDescription,
  getGradeContentEmptyTitle,
} from "@/lib/practice/grade-content";
import { loadParentWeeklySummary } from "@/lib/parent-dashboard/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGeneratedPracticePilotEligibility } from "@/lib/curriculum/generated-practice-pilot";
import { getLessonPath } from "@/lib/practice/catalog";

export const metadata = {
  title: "Tổng quan",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !profile ||
    (profile.role !== "STUDENT" &&
      profile.role !== "PARENT" &&
      profile.role !== "TEACHER")
  ) {
    return <AccessDenied />;
  }

  if (profile.role === "TEACHER") {
    redirect(
      profile.onboarding_completed ? "/teacher" : "/teacher/onboarding",
    );
  }

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  if (profile.role === "PARENT") {
    const connectionResult = await loadConnectionState(supabase);
    const weeklySummaries =
      connectionResult.ok &&
      connectionResult.state.viewerRole === "PARENT"
        ? await Promise.all(
            connectionResult.state.connections
              .filter((connection) => connection.status === "APPROVED")
              .map(async (connection) => ({
                connectionId: connection.connectionId,
                summary: await loadParentWeeklySummary(
                  supabase,
                  connection.connectionId,
                ),
              })),
          )
        : [];

    return (
      <div className="dashboard-page dashboard-page--parent page-shell">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Dành cho phụ huynh</p>
            <h1>Tổng quan học tập của con</h1>
            <p>
              Xin chào, {profile.full_name ?? "bạn"}. Theo dõi thông tin tổng
              hợp từ những kết nối đã được học sinh đồng ý.
            </p>
          </div>
        </header>

        {connectionResult.ok &&
        connectionResult.state.viewerRole === "PARENT" ? (
          <ConnectionsManager
            state={connectionResult.state}
            weeklySummaries={weeklySummaries}
          />
        ) : (
          <section className="empty-state empty-state--large">
            <h2>Chưa thể tải kết nối</h2>
            <p>
              Không có thông tin học sinh nào được hiển thị. Vui lòng thử tải
              lại sau.
            </p>
            <Button href="/dashboard">Thử tải lại</Button>
          </section>
        )}
      </div>
    );
  }

  const [
    { data: studentProfile, error: studentError },
    goalsResult,
    connectionResult,
    classroomResult,
    assignmentResult,
  ] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("grade, student_code")
      .eq("user_id", user.id)
      .maybeSingle(),
    loadStudentGoals(supabase, user.id),
    loadConnectionState(supabase),
    loadStudentClassrooms(supabase),
    loadStudentAssignments(supabase),
  ]);

  if (studentError || goalsResult.error || !studentProfile) {
    return (
      <section className="content-page page-shell">
        <p className="eyebrow">Dữ liệu chưa sẵn sàng</p>
        <h1>Chưa thể mở trang học của em.</h1>
        <p>
          Không có dữ liệu riêng tư nào được hiển thị. Vui lòng thử tải lại sau.
        </p>
        <Button href="/dashboard">Thử tải lại</Button>
      </section>
    );
  }

  const goals = goalsResult.goals;
  const studentConnectionState =
    connectionResult.ok &&
    connectionResult.state.viewerRole === "STUDENT"
      ? connectionResult.state
      : null;
  const pendingConnectionCount =
    studentConnectionState?.connections.filter(
      (connection) => connection.status === "PENDING",
    ).length ?? 0;
  const studentClassroomState = classroomResult.ok
    ? classroomResult.state
    : null;
  const pendingClassroomCount =
    studentClassroomState?.memberships.filter(
      (membership) => membership.status === "PENDING",
    ).length ?? 0;
  const approvedClassroomCount =
    studentClassroomState?.memberships.filter(
      (membership) => membership.status === "APPROVED",
    ).length ?? 0;
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  const completedGoals = goals.filter((goal) => goal.status === "COMPLETED");
  let unitTitles: Record<string, string> = {};
  let practiceHistory = buildPracticeHistory([]);
  let lessonDataUnavailable = false;
  let personalizedPath: PersonalizedLearningPath | null = null;
  let universalProgress: StudentCurriculumProgress | null = null;
  let controlledPilotUnit = null;

  const existingLearningAccess = {
    ok: true as const,
    supabase,
    user,
    grade: studentProfile.grade,
  };
  const [curriculumProgressResult, pathResult] = await Promise.all([
    loadStudentCurriculumProgress(existingLearningAccess),
    loadStudentPersonalizedPathWithClient(
      supabase,
      user.id,
      studentProfile.grade,
    ),
  ]);
  if (
    curriculumProgressResult?.ok &&
    curriculumProgressResult.progress.grade === studentProfile.grade
  ) {
    universalProgress = curriculumProgressResult.progress;
  }
  recordUniversalAvailabilityDiagnostic({
    route: "/dashboard",
    role: "STUDENT",
    schoolGrade: studentProfile.grade,
    runtimeEnabled: getUniversalCurriculumRuntimeFlag().enabled,
    releaseAvailable: universalProgress !== null,
    catalogCount: universalProgress?.units.length ?? 0,
    failureCode:
      universalProgress || curriculumProgressResult.ok
        ? "NONE"
        : curriculumProgressResult.reason,
    progress: universalProgress,
  });

  if (pathResult.ok) {
    personalizedPath = pathResult.data.path;
    practiceHistory = buildPracticeHistory(pathResult.data.attempts);
    unitTitles = pathResult.data.historyUnitTitles;
    controlledPilotUnit = pathResult.data.controlledPilotUnit;
  } else {
    lessonDataUnavailable = true;
  }

  const latestDiagnostic = personalizedPath?.latestDiagnostic ?? null;
  const competencyDashboard = universalProgress
    ? buildStudentCompetencyDashboard({
        progress: universalProgress,
        now: new Date(),
        adaptivePilotEnabled: false,
      })
    : null;
  const generatedPilotEligible =
    getCurrentGeneratedPracticePilotEligibility({
      userId: user.id,
      role: "STUDENT",
      schoolGrade: studentProfile.grade,
    }).eligible;
  const currentUnit = universalProgress?.units.find(
    (unit) => unit.status === "IN_PROGRESS",
  );
  const recentUnits = universalProgress
    ? [...universalProgress.units]
        .filter((unit) => unit.lastActivityAt)
        .sort((left, right) =>
          String(right.lastActivityAt).localeCompare(String(left.lastActivityAt)),
        )
        .slice(0, 3)
    : [];

  return (
    <div className="dashboard-page dashboard-page--student page-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Không gian Toán lớp {studentProfile.grade}</p>
          <h1>Xin chào, {profile.full_name ?? "em"}!</h1>
          <p>Hôm nay em chỉ cần bắt đầu từ một bước phù hợp.</p>
        </div>
        <Button href="/lessons" variant="secondary">Khám phá lộ trình</Button>
      </header>

      {controlledPilotUnit ? (
        <ControlledPilotCard unit={controlledPilotUnit} compact />
      ) : null}

      {universalProgress ? (
        <section
          className="student-summary"
          aria-labelledby="universal-progress-title"
        >
          <div>
            <p className="eyebrow">
              {currentUnit ? "Bài học đang dở" : "Bước đầu tiên của em"}
            </p>
            <h2 id="universal-progress-title">
              {currentUnit
                ? `Tiếp tục: ${currentUnit.title}`
                : `Bắt đầu lộ trình Toán lớp ${studentProfile.grade}`}
            </h2>
            <p>{universalProgress.masteryExplanation}</p>
            <div className="dashboard-diagnostic-card__actions">
              <Button
                href={currentUnit ? getLessonPath(currentUnit.unitId) : "/lessons"}
              >
                {currentUnit ? "Tiếp tục bài này" : "Chọn bài để học"}
              </Button>
            </div>
          </div>
          <div className="student-summary__meter" aria-label={`${universalProgress.units.filter((unit) => unit.status === "COMPLETED").length} trên ${universalProgress.units.length} bài đã hoàn thành`}>
            <strong>{universalProgress.units.filter((unit) => unit.status === "COMPLETED").length}</strong>
            <span>/{universalProgress.units.length} bài</span>
          </div>
        </section>
      ) : personalizedPath && personalizedPath.units.length > 0 ? (
        <PersonalizedLearningOverview path={personalizedPath} compact />
      ) : personalizedPath ? (
        <section className="empty-state" aria-labelledby="grade-content-title">
          <h2 id="grade-content-title">
            {getGradeContentEmptyTitle(studentProfile.grade)}
          </h2>
          <p>{getGradeContentEmptyDescription()}</p>
        </section>
      ) : (
        <section className="empty-state" aria-labelledby="path-unavailable-title">
          <h2 id="path-unavailable-title">Chưa thể tải lộ trình học</h2>
          <p>
            Tiến độ hiện có vẫn được giữ nguyên. Em hãy thử tải lại trang.
          </p>
        </section>
      )}

      {competencyDashboard ? (
        <CompetencyLearningPathPanel model={competencyDashboard} />
      ) : null}

      {recentUnits.length > 0 ? (
        <section className="dashboard-section recent-learning" aria-labelledby="recent-learning-title">
          <div className="section-heading section-heading--compact">
            <p className="eyebrow">Hoạt động gần đây</p>
            <h2 id="recent-learning-title">Các bài em vừa học</h2>
          </div>
          <ul>
            {recentUnits.map((unit) => (
              <li key={unit.unitId}>
                <div>
                  <strong>{unit.title}</strong>
                  <span>
                    {unit.status === "COMPLETED"
                      ? "Đã hoàn thành"
                      : "Đang học"}
                  </span>
                </div>
                <Button href={getLessonPath(unit.unitId)} variant="secondary">
                  {unit.status === "COMPLETED" ? "Xem lại" : "Tiếp tục"}
                </Button>
              </li>
            ))}
          </ul>
          <Button href="/learning-history" variant="tertiary">
            Xem toàn bộ lịch sử
          </Button>
        </section>
      ) : null}

      {generatedPilotEligible ? <GeneratedPracticePilotCard compact /> : null}

      <section
        className="student-summary"
        aria-labelledby="student-code-title"
      >
        <div>
          <p className="eyebrow">Mã học sinh riêng</p>
          <h2 id="student-code-title">{studentProfile.student_code}</h2>
          <p>
            Chỉ chia sẻ mã này với phụ huynh hoặc người giám hộ mà em tin tưởng.
          </p>
        </div>
        <CopyStudentCode code={studentProfile.student_code} />
      </section>

      <section
        className="dashboard-connections-summary"
        aria-labelledby="dashboard-connections-title"
      >
        <div>
          <p className="eyebrow">Quyền quyết định của em</p>
          <h2 id="dashboard-connections-title">
            Kết nối với phụ huynh
          </h2>
          {studentConnectionState ? (
            <p>
              Em có <strong>{pendingConnectionCount}</strong> yêu cầu đang chờ.
              Chỉ đồng ý khi em nhận ra người gửi.
            </p>
          ) : (
            <p>Chưa thể tải trạng thái kết nối. Em hãy thử lại sau.</p>
          )}
        </div>
        <Button href="/connections" variant="secondary">
          Quản lý kết nối phụ huynh
        </Button>
      </section>

      <section
        className="dashboard-classrooms-summary"
        aria-labelledby="dashboard-classrooms-title"
      >
        <div>
          <p className="eyebrow">Học cùng giáo viên</p>
          <h2 id="dashboard-classrooms-title">Lớp học của em</h2>
          {studentClassroomState ? (
            <p>
              Em đang tham gia <strong>{approvedClassroomCount}</strong> lớp và
              có <strong>{pendingClassroomCount}</strong> yêu cầu đang chờ.
            </p>
          ) : (
            <p>Chưa thể tải trạng thái lớp học. Em hãy thử lại sau.</p>
          )}
        </div>
        <Button href="/classrooms" variant="secondary">
          Quản lý lớp học
        </Button>
      </section>

      <section
        className="dashboard-teacher-assignments"
        aria-labelledby="dashboard-teacher-assignments-title"
      >
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Từ lớp học</p>
            <h2 id="dashboard-teacher-assignments-title">
              Bài giáo viên giao
            </h2>
          </div>
          {assignmentResult.ok ? (
            <span>{assignmentResult.list.assignments.length}</span>
          ) : null}
        </div>
        {assignmentResult.ok ? (
          <StudentAssignmentsPanel
            assignments={assignmentResult.list.assignments}
            compact
          />
        ) : (
          <div className="empty-state">
            <h3>Chưa thể tải bài giáo viên giao</h3>
            <p>Em hãy thử lại sau. Các bài đang làm không bị mất.</p>
          </div>
        )}
      </section>

      {studentProfile.grade === 1 ? (
        <section
          className="dashboard-diagnostic-card"
          aria-labelledby="dashboard-diagnostic-title"
        >
          <div>
            <p className="eyebrow">Đánh giá năng lực Lớp 1</p>
            <h2 id="dashboard-diagnostic-title">
              {latestDiagnostic?.status === "IN_PROGRESS"
                ? "Em có một bài đánh giá đang làm"
                : latestDiagnostic?.status === "COMPLETED"
                  ? "Bài học được đề xuất từ kết quả đánh giá"
                  : "Khám phá bài học phù hợp với em"}
            </h2>
            <p>
              {latestDiagnostic?.status === "IN_PROGRESS"
                ? `Đã hoàn thành ${latestDiagnostic.answeredCount}/${DIAGNOSTIC_QUESTION_COUNT} câu. Kết quả đúng, sai sẽ hiện sau câu cuối.`
                : latestDiagnostic?.status === "COMPLETED"
                  ? latestDiagnostic.recommendationExplanation
                  : `Làm ${DIAGNOSTIC_QUESTION_COUNT} câu từ bốn miền kiến thức. Đây không phải kỳ thi và không bắt buộc để tiếp tục học.`}
            </p>
          </div>
          <div className="dashboard-diagnostic-card__actions">
            {latestDiagnostic?.status === "IN_PROGRESS" ? (
              <Button href={`/diagnostic/${latestDiagnostic.id}`}>
                Tiếp tục đánh giá
              </Button>
            ) : latestDiagnostic?.status === "COMPLETED" ? (
              <>
                <Button href={`/diagnostic/${latestDiagnostic.id}/review`}>
                  Xem kết quả đánh giá
                </Button>
                <Button href="/diagnostic" variant="secondary">
                  Đánh giá lại
                </Button>
              </>
            ) : (
              <StartDiagnosticButton label="Đánh giá năng lực" />
            )}
          </div>
        </section>
      ) : null}

      {!universalProgress &&
      personalizedPath &&
      personalizedPath.units.length > 0 ? (
        <PersonalizedRecommendationCard path={personalizedPath} compact />
      ) : lessonDataUnavailable ? (
        <section className="empty-state">
          <h2>Chưa thể tải bài học được đề xuất</h2>
          <p>Em hãy thử lại sau. Các lượt học cũ không bị thay đổi.</p>
        </section>
      ) : null}

      {!universalProgress && !lessonDataUnavailable ? (
        <PracticeHistory
          history={practiceHistory}
          unitTitles={unitTitles}
        />
      ) : null}

      <section
        className="dashboard-section dashboard-section--goals dashboard-goals-summary"
        aria-labelledby="goals-summary-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Mục tiêu cá nhân</p>
          <h2 id="goals-summary-title">Giữ nhịp học đều đặn</h2>
          <p>
            Em có {activeGoals.length} mục tiêu đang thực hiện và{" "}
            {completedGoals.length} mục tiêu đã hoàn thành.
          </p>
        </div>
        {activeGoals.length > 0 ? (
          <ul className="dashboard-goals-summary__list">
            {activeGoals.slice(0, 2).map((goal) => (
              <li key={goal.id}>{goal.title}</li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-goals-summary__empty">
            Em chưa có mục tiêu đang thực hiện.
          </p>
        )}
        <Button href="/goals" variant="secondary">
          Xem tất cả mục tiêu
        </Button>
      </section>
    </div>
  );
}
