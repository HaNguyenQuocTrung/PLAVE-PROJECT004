import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/Button";
import { ParentGoalSuggestions } from "@/components/ParentGoalSuggestions";
import { ParentUniversalProgress } from "@/components/ParentUniversalProgress";
import { parentMasteryLabels } from "@/lib/parent-dashboard/universal-contracts";
import {
  getParentSkillLabel,
  type ParentRecentAttempt,
} from "@/lib/parent-dashboard/contracts";
import { loadParentChildLearningDashboard } from "@/lib/parent-dashboard/server";
import { buildParentPersonalizedPathSummary } from "@/lib/personalized-path/parent";
import {
  buildParentWeeklySummaryText,
  formatParentWeeklyPeriod,
  getParentWeeklySkillInsights,
} from "@/lib/parent-dashboard/weekly";
import { diagnosticDomainLabels } from "@/lib/diagnostic/contracts";

export const metadata = {
  title: "Tiến độ học tập",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ParentChildPageProps = {
  params: Promise<{ connectionId: string }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function formatPercent(value: number | null) {
  if (value === null) return "Chưa có dữ liệu";
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function getAttemptStatus(attempt: ParentRecentAttempt) {
  return attempt.status === "COMPLETED" ? "Đã hoàn thành" : "Đang làm";
}

export default async function ParentChildLearningPage({
  params,
}: ParentChildPageProps) {
  const { connectionId } = await params;
  const result = await loadParentChildLearningDashboard(connectionId);

  if (!result.ok) {
    if (result.reason === "UNAUTHENTICATED") redirect("/login");
    if (result.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    if (result.reason === "FORBIDDEN") return <AccessDenied />;

    return (
      <section className="content-page page-shell parent-dashboard-error">
        <p className="eyebrow">Quyền riêng tư được bảo vệ</p>
        <h1>
          {result.reason === "NOT_FOUND"
            ? "Không thể mở tiến độ này."
            : "Chưa thể tải tiến độ học tập."}
        </h1>
        <p>
          {result.reason === "NOT_FOUND"
            ? "Kết nối có thể không còn hiệu lực hoặc không thuộc tài khoản của bạn."
            : "Dữ liệu học tập chưa sẵn sàng. Vui lòng thử tải lại sau."}
        </p>
        <div className="button-row">
          {result.reason === "UNAVAILABLE" ? (
            <Button href={`/parent/children/${connectionId}`}>
              Thử tải lại
            </Button>
          ) : null}
          <Button href="/dashboard" variant="secondary">
            Về Tổng quan
          </Button>
        </div>
      </section>
    );
  }

  const {
    dashboard,
    weeklySummary,
    goalSuggestionContext,
    diagnosticSummary,
    gradeOneCompletionSummary,
    universalProgress,
  } = result;
  const activeGoals = dashboard.goals.filter(
    (goal) => goal.status === "ACTIVE",
  );
  const completedGoals = dashboard.goals.filter(
    (goal) => goal.status === "COMPLETED",
  );
  const hasSkillData = dashboard.skills.some(
    (skill) => skill.answeredCount > 0,
  );
  const weeklyInsights = weeklySummary
    ? getParentWeeklySkillInsights(weeklySummary)
    : null;
  const parentPathSummary = buildParentPersonalizedPathSummary(
    dashboard,
    diagnosticSummary,
  );

  return (
    <div className="parent-learning-page page-shell">
      <header className="catalog-hero parent-learning-hero">
        <p className="eyebrow">Tổng quan dành cho phụ huynh</p>
        <h1>Tiến độ học tập của {universalProgress.student.displayName}</h1>
        <p>
          Lớp {universalProgress.student.grade} · Thông tin tổng hợp chỉ đọc,
          được chia sẻ qua kết nối đã được học sinh đồng ý.
        </p>
      </header>

      <section
        className="parent-summary-grid"
        aria-labelledby="parent-summary-title"
      >
        <h2 className="sr-only" id="parent-summary-title">
          Tóm tắt học tập
        </h2>
        <article>
          <span>Chủ đề đã bắt đầu</span>
          <strong>{universalProgress.summary.startedUnitCount}</strong>
        </article>
        <article>
          <span>Chủ đề đã hoàn thành</span>
          <strong>{universalProgress.summary.completedUnitCount}</strong>
        </article>
        <article>
          <span>Lượt luyện tập</span>
          <strong>{universalProgress.summary.attemptCount}</strong>
        </article>
        <article>
          <span>Tỷ lệ đúng · {parentMasteryLabels[universalProgress.summary.masteryLabel]}</span>
          <strong>
            {formatPercent(universalProgress.summary.accuracyPercent)}
          </strong>
        </article>
      </section>

      <ParentUniversalProgress progress={universalProgress} />

      {universalProgress.student.grade === 1 ? (
        <section
          className="parent-learning-section parent-grade-one-completion"
          aria-labelledby="parent-grade-one-completion-title"
        >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tiến độ chương trình hiện có</p>
            <h2 id="parent-grade-one-completion-title">
              Tổng kết Toán Lớp 1
            </h2>
          </div>
          {gradeOneCompletionSummary ? (
            <strong>
              {gradeOneCompletionSummary.completedUnitCount}/
              {gradeOneCompletionSummary.totalUnitCount} unit
            </strong>
          ) : null}
        </div>
        {!gradeOneCompletionSummary ? (
          <div className="parent-empty-state">
            <h3>Chưa thể tải tiến độ unit</h3>
            <p>
              Tổng kết tạm thời chưa sẵn sàng. Các thông tin học tập khác vẫn
              được giữ nguyên.
            </p>
          </div>
        ) : (
          <>
            <div
              className="parent-grade-one-completion__progress"
              role="progressbar"
              aria-label="Tiến độ hoàn thành chương trình Toán Lớp 1 hiện có"
              aria-valuemin={0}
              aria-valuemax={gradeOneCompletionSummary.totalUnitCount}
              aria-valuenow={
                gradeOneCompletionSummary.completedUnitCount
              }
            >
              <span
                style={{
                  width: `${gradeOneCompletionSummary.completionPercent}%`,
                }}
              />
            </div>
            <p>
              {gradeOneCompletionSummary.completionPercent}% chương trình
              Toán Lớp 1 hiện có trên PLAVE đã hoàn thành.
            </p>
            {gradeOneCompletionSummary.isComplete ? (
              <p className="parent-section-note">
                Học sinh đã hoàn thành ít nhất một lượt ở toàn bộ 13 unit
                hiện có.
              </p>
            ) : (
              <ul className="parent-grade-one-completion__units">
                {gradeOneCompletionSummary.units.map((unit, index) => (
                  <li key={`${index}-${unit.title}`}>
                    <span>{unit.title}</span>
                    <strong>
                      {unit.status === "COMPLETED"
                        ? "Đã hoàn thành"
                        : unit.status === "IN_PROGRESS"
                          ? "Đang học"
                          : unit.status === "AVAILABLE"
                            ? "Có thể bắt đầu"
                            : "Chưa mở"}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            <p className="parent-section-note">
              Đây là tổng hợp chỉ đọc. Phụ huynh không xem được câu trả lời,
              đáp án hoặc lời giải.
            </p>
          </>
        )}
        </section>
      ) : null}

      <section
        className="parent-learning-section parent-weekly-report"
        aria-labelledby="weekly-report-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Báo cáo theo lịch Việt Nam</p>
            <h2 id="weekly-report-title">Báo cáo 7 ngày gần nhất</h2>
          </div>
          {weeklySummary ? (
            <span className="parent-weekly-report__period">
              {formatParentWeeklyPeriod(weeklySummary)}
            </span>
          ) : null}
        </div>

        {!weeklySummary ? (
          <div className="parent-empty-state">
            <h3>Chưa thể tải báo cáo 7 ngày</h3>
            <p>
              Báo cáo tạm thời chưa sẵn sàng. Thông tin tổng quan khác vẫn được
              giữ nguyên.
            </p>
            <Button href={`/parent/children/${connectionId}`}>
              Thử tải lại báo cáo
            </Button>
          </div>
        ) : weeklySummary.metrics.completedAttemptCount === 0 ? (
          <div className="parent-empty-state parent-weekly-report__empty">
            <h3>
              Chưa có lượt luyện tập hoàn thành trong 7 ngày gần nhất.
            </h3>
            <p>
              Phụ huynh có thể động viên con tiếp tục học theo nhịp phù hợp,
              không cần tạo áp lực về điểm số.
            </p>
          </div>
        ) : (
          <>
            <p className="parent-weekly-report__summary">
              {buildParentWeeklySummaryText(weeklySummary)}
            </p>

            <div
              className="parent-weekly-metrics"
              aria-label="Số liệu học tập trong 7 ngày"
            >
              <article>
                <span>Lượt hoàn thành</span>
                <strong>
                  {weeklySummary.metrics.completedAttemptCount}
                </strong>
              </article>
              <article>
                <span>Câu đã làm</span>
                <strong>{weeklySummary.metrics.totalAnswered}</strong>
              </article>
              <article>
                <span>Tỷ lệ đúng</span>
                <strong>
                  {formatPercent(weeklySummary.metrics.accuracyPercent)}
                </strong>
              </article>
              <article>
                <span>Ngày có hoạt động</span>
                <strong>{weeklySummary.metrics.activeDayCount}</strong>
              </article>
              <article>
                <span>Mục tiêu hoàn thành</span>
                <strong>{weeklySummary.metrics.completedGoalCount}</strong>
              </article>
            </div>

            <div className="parent-weekly-skills">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Theo nội dung đã luyện tập</p>
                  <h3>Các nhóm kỹ năng</h3>
                </div>
              </div>
              <div className="parent-weekly-skills__grid">
                {weeklySummary.skills.map((skill) => (
                  <article key={skill.skillCode}>
                    <h4>{getParentSkillLabel(skill.skillCode)}</h4>
                    <p>
                      {skill.answeredCount > 0
                        ? `${skill.correctCount}/${skill.answeredCount} câu đúng`
                        : "Chưa có câu trả lời"}
                    </p>
                    <strong>
                      {formatPercent(skill.accuracyPercent)}
                    </strong>
                  </article>
                ))}
              </div>
            </div>

            {weeklyInsights ? (
              <div
                className="parent-weekly-insight"
                aria-labelledby="weekly-insight-title"
              >
                <h3 id="weekly-insight-title">Gợi ý đồng hành</h3>
                <p>{weeklyInsights.message}</p>
                <dl>
                  <div>
                    <dt>Làm tốt nhất</dt>
                    <dd>
                      {weeklyInsights.bestSkill
                        ? getParentSkillLabel(
                            weeklyInsights.bestSkill.skillCode,
                          )
                        : "Chưa đủ dữ liệu"}
                    </dd>
                  </div>
                  <div>
                    <dt>Cần ôn thêm</dt>
                    <dd>
                      {weeklyInsights.reviewSkill
                        ? getParentSkillLabel(
                            weeklyInsights.reviewSkill.skillCode,
                          )
                        : weeklyInsights.bestSkill
                          ? "Chưa cần gắn nhãn"
                          : "Chưa đủ dữ liệu"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {weeklySummary.metrics.lastActivityAt ? (
              <p className="parent-section-note">
                Hoạt động gần nhất:{" "}
                <time dateTime={weeklySummary.metrics.lastActivityAt}>
                  {formatDateTime(
                    weeklySummary.metrics.lastActivityAt,
                  )}
                </time>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section
        className="parent-learning-section parent-current-practice"
        aria-labelledby="current-practice-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Hoạt động gần nhất</p>
            <h2 id="current-practice-title">Bài đang học</h2>
          </div>
          {dashboard.summary.lastActivityAt ? (
            <time dateTime={dashboard.summary.lastActivityAt}>
              {formatDateTime(dashboard.summary.lastActivityAt)}
            </time>
          ) : null}
        </div>
        {dashboard.currentPractice ? (
          <article className="parent-current-practice__card">
            <div>
              <h3>{dashboard.currentPractice.unitTitle}</h3>
              <p>
                Đã làm {dashboard.currentPractice.answeredCount}/
                {dashboard.currentPractice.totalQuestions} câu · Đúng{" "}
                {dashboard.currentPractice.correctCount} câu
              </p>
            </div>
            <div
              className="parent-progress"
              role="progressbar"
              aria-label={`Tiến độ ${dashboard.currentPractice.unitTitle}`}
              aria-valuemin={0}
              aria-valuemax={dashboard.currentPractice.totalQuestions}
              aria-valuenow={dashboard.currentPractice.answeredCount}
            >
              <span
                style={{
                  width: `${
                    (dashboard.currentPractice.answeredCount /
                      dashboard.currentPractice.totalQuestions) *
                    100
                  }%`,
                }}
              />
            </div>
          </article>
        ) : (
          <div className="parent-empty-state">
            <h3>Chưa có bài đang làm</h3>
            <p>
              Khi học sinh bắt đầu một lượt luyện tập, tiến độ sẽ xuất hiện tại
              đây.
            </p>
          </div>
        )}
      </section>

      <section
        className="parent-learning-section parent-personalized-path"
        aria-labelledby="parent-personalized-path-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lộ trình chỉ đọc</p>
            <h2 id="parent-personalized-path-title">
              Hướng học tập hiện tại
            </h2>
          </div>
          <span className="parent-status">
            {parentPathSummary.focusStatus}
          </span>
        </div>
        {parentPathSummary.focusTitle ? (
          <h3>{parentPathSummary.focusTitle}</h3>
        ) : null}
        <p>{parentPathSummary.reason}</p>
        <p className="parent-section-note">
          Đã hoàn thành {dashboard.summary.completedAttemptCount} lượt luyện
          tập
          {dashboard.summary.averageAccuracyPercent === null
            ? "."
            : ` · Tỷ lệ đúng tổng hợp ${formatPercent(
                dashboard.summary.averageAccuracyPercent,
              )}.`}
        </p>
        <div
          className="parent-personalized-path__domains"
          aria-label="Nhóm năng lực cần củng cố"
        >
          <strong>Nhóm cần củng cố</strong>
          {parentPathSummary.reviewDomainLabels.length > 0 ? (
            <ul>
              {parentPathSummary.reviewDomainLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : (
            <p>Chưa có nhóm nào được đánh dấu cần ôn thêm.</p>
          )}
        </div>
        <p className="parent-section-note">
          Phụ huynh không xem được câu trả lời, đáp án, lời giải hoặc thứ tự
          câu hỏi.
        </p>
      </section>

      <section
        className="parent-learning-section parent-diagnostic-summary"
        aria-labelledby="parent-diagnostic-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Đánh giá năng lực Lớp 1</p>
            <h2 id="parent-diagnostic-title">Kết quả đánh giá gần nhất</h2>
          </div>
        </div>
        {!diagnosticSummary ? (
          <div className="parent-empty-state">
            <h3>Chưa thể tải kết quả đánh giá</h3>
            <p>
              Dữ liệu đánh giá tạm thời chưa sẵn sàng. Các thông tin học tập
              khác vẫn được giữ nguyên.
            </p>
          </div>
        ) : !diagnosticSummary.hasResult ? (
          <div className="parent-empty-state">
            <h3>Học sinh chưa hoàn thành bài đánh giá</h3>
            <p>
              Khi học sinh chủ động hoàn thành, phụ huynh sẽ thấy kết quả tổng
              hợp tại đây.
            </p>
          </div>
        ) : (
          <>
            <div className="parent-diagnostic-summary__score">
              <span>Tổng điểm</span>
              <strong>
                {diagnosticSummary.correctCount}/
                {diagnosticSummary.totalQuestions}
              </strong>
              <span>{diagnosticSummary.accuracyPercent}% chính xác</span>
            </div>
            <div
              className="parent-diagnostic-summary__domains"
              aria-label="Kết quả theo bốn miền kiến thức"
            >
              {diagnosticSummary.domains.map((domain) => (
                <article key={domain.domain}>
                  <h3>{diagnosticDomainLabels[domain.domain]}</h3>
                  <strong>
                    {domain.correctCount}/{domain.answeredCount}
                  </strong>
                  <p>
                    {domain.level === "DOING_WELL"
                      ? "Đang làm tốt"
                      : "Cần ôn thêm"}
                  </p>
                </article>
              ))}
            </div>
            <div className="parent-diagnostic-summary__recommendation">
              <h3>Bài học được đề xuất</h3>
              <p>
                <strong>
                  {diagnosticSummary.recommendation.unitTitle ??
                    "Đã hoàn thành tốt nội dung hiện tại"}
                </strong>
              </p>
              <p>
                {diagnosticSummary.recommendation.explanation}
              </p>
              <p className="parent-section-note">
                Đây là kết quả tổng hợp chỉ đọc. Phụ huynh không xem được câu
                trả lời, đáp án hoặc lời giải chi tiết.
              </p>
            </div>
          </>
        )}
      </section>

      <section
        className="parent-learning-section"
        aria-labelledby="skill-summary-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Theo từng nội dung</p>
            <h2 id="skill-summary-title">Các nhóm kỹ năng</h2>
          </div>
        </div>
        {!hasSkillData ? (
          <p className="parent-section-note">
            Chưa có dữ liệu kỹ năng. Thống kê sẽ xuất hiện sau khi học sinh trả
            lời câu hỏi.
          </p>
        ) : null}
        <div className="parent-skill-grid">
          {dashboard.skills.map((skill) => (
            <article key={skill.skillCode}>
              <h3>{getParentSkillLabel(skill.skillCode)}</h3>
              <p>
                {skill.answeredCount > 0
                  ? `${skill.correctCount}/${skill.answeredCount} câu đúng`
                  : "Chưa có câu trả lời"}
              </p>
              <strong>{formatPercent(skill.accuracyPercent)}</strong>
            </article>
          ))}
        </div>
      </section>

      <section
        className="parent-learning-section"
        aria-labelledby="recent-attempts-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tối đa năm lượt gần nhất</p>
            <h2 id="recent-attempts-title">Lịch sử luyện tập</h2>
          </div>
        </div>
        {dashboard.recentAttempts.length > 0 ? (
          <ol className="parent-attempt-list">
            {dashboard.recentAttempts.map((attempt) => (
              <li
                key={`${attempt.unitTitle}-${attempt.attemptNumber}`}
                className="parent-attempt-card"
              >
                <div>
                  <span
                    className={`parent-status parent-status--${attempt.status.toLowerCase()}`}
                  >
                    {getAttemptStatus(attempt)}
                  </span>
                  <h3>
                    {attempt.unitTitle} · Lần {attempt.attemptNumber}
                  </h3>
                  <p>
                    Đã làm {attempt.answeredCount}/{attempt.totalQuestions} câu
                    · Đúng {attempt.correctCount} câu
                  </p>
                </div>
                <div className="parent-attempt-card__result">
                  <strong>{formatPercent(attempt.accuracyPercent)}</strong>
                  <time dateTime={attempt.activityAt}>
                    {formatDateTime(attempt.activityAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="parent-empty-state">
            <h3>Chưa có lượt luyện tập</h3>
            <p>Kết quả tổng hợp sẽ xuất hiện sau khi học sinh bắt đầu học.</p>
          </div>
        )}
        <p className="parent-section-note">
          Phụ huynh chỉ xem thống kê tổng hợp; câu trả lời, đáp án và lời giải
          chi tiết luôn được bảo vệ.
        </p>
      </section>

      <section
        className="parent-learning-section"
        aria-labelledby="parent-goals-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Chỉ đọc</p>
            <h2 id="parent-goals-title">Mục tiêu học tập</h2>
          </div>
        </div>
        {dashboard.goals.length > 0 ? (
          <div className="parent-goal-columns">
            <div>
              <h3>Đang thực hiện</h3>
              {activeGoals.length > 0 ? (
                <ul className="parent-goal-list">
                  {activeGoals.map((goal, index) => (
                    <li key={`active-goal-${index}`}>
                      <strong>{goal.title}</strong>
                      <span>Mục tiêu: {goal.targetCount}</span>
                      {goal.targetDate ? (
                        <span>Đến hạn: {formatDate(goal.targetDate)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa có mục tiêu đang thực hiện.</p>
              )}
            </div>
            <div>
              <h3>Đã hoàn thành</h3>
              {completedGoals.length > 0 ? (
                <ul className="parent-goal-list">
                  {completedGoals.map((goal, index) => (
                    <li key={`completed-goal-${index}`}>
                      <strong>{goal.title}</strong>
                      <span>Mục tiêu: {goal.targetCount}</span>
                      {goal.completedAt ? (
                        <span>
                          Hoàn thành: {formatDateTime(goal.completedAt)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa có mục tiêu đã hoàn thành.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="parent-empty-state">
            <h3>Chưa có mục tiêu học tập</h3>
            <p>Khi học sinh tạo mục tiêu, thông tin sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>

      {goalSuggestionContext ? (
        <ParentGoalSuggestions
          connectionId={connectionId}
          initialContext={goalSuggestionContext}
        />
      ) : (
        <section
          className="parent-learning-section goal-suggestion-section"
          aria-labelledby="parent-goal-suggestions-unavailable-title"
        >
          <p className="eyebrow">Đồng hành tôn trọng</p>
          <h2 id="parent-goal-suggestions-unavailable-title">
            Góp ý mục tiêu học tập
          </h2>
          <div className="parent-empty-state">
            <h3>Chưa thể tải khu vực góp ý</h3>
            <p>
              Không có mục tiêu nào bị thay đổi. Vui lòng thử tải lại trang sau.
            </p>
          </div>
        </section>
      )}

      <div className="parent-learning-actions">
        <Button href="/dashboard" variant="secondary">
          Về Tổng quan
        </Button>
        <Button href="/connections" variant="quiet">
          Quản lý kết nối
        </Button>
      </div>
    </div>
  );
}
