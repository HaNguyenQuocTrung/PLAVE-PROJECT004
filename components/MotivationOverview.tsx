import type { MotivationSummary } from "@/lib/motivation/contracts";

export function MotivationOverview({
  motivation,
  audience = "STUDENT",
}: {
  motivation: MotivationSummary;
  audience?: "STUDENT" | "ADULT";
}) {
  const levelProgress = motivation.level.maxLevel
    ? 100
    : Math.min(100, Math.round(((motivation.level.totalXp - motivation.level.currentThreshold) / Math.max(1, motivation.level.nextThreshold - motivation.level.currentThreshold)) * 100));
  const daily = motivation.goals.daily as Record<string, unknown>;
  const weekly = motivation.goals.weekly as Record<string, unknown>;
  return (
    <section className="motivation-overview dashboard-section" aria-labelledby="motivation-title">
      <div className="section-heading section-heading--compact">
        <p className="eyebrow">
          {audience === "ADULT" ? "Tổng hợp chỉ đọc" : "Động lực học tập"}
        </p>
        <h2 id="motivation-title">Cấp độ {motivation.level.level}</h2>
        <p>{motivation.level.maxLevel ? (audience === "ADULT" ? "Học sinh đã đạt cấp độ tối đa." : "Em đã đạt cấp độ tối đa.") : `Còn ${motivation.level.xpRemaining} XP để lên cấp tiếp theo.`}</p>
      </div>
      <div className="motivation-overview__stats">
        <div><span>Tổng XP</span><strong>{motivation.level.totalXp} XP</strong></div>
        <div><span>Chuỗi hiện tại</span><strong>{motivation.streak.currentStreakDays} ngày</strong></div>
        <div><span>Kỷ lục</span><strong>{motivation.streak.longestStreakDays} ngày</strong></div>
      </div>
      <div
        className="motivation-progress"
        role="progressbar"
        aria-label={`Tiến độ cấp độ ${levelProgress}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={levelProgress}
      >
        <span style={{ width: `${levelProgress}%` }} />
      </div>
      {motivation.streak.currentStreakDays === 0 && motivation.streak.lastQualifyingDate ? (
        <p className="motivation-streak-note">
          Chuỗi trước đã khép lại. Một buổi học mới sẽ bắt đầu hành trình tiếp theo.
        </p>
      ) : null}
      <div className="motivation-goals">
        <div data-goal="daily" data-complete={String(Boolean(daily.completed))}><strong>Mục tiêu hôm nay</strong><span>{String(daily.xp_current ?? 0)}/{String(daily.xp_target ?? 20)} XP · {String(daily.attempt_current ?? 0)}/{String(daily.attempt_target ?? 1)} bài</span><span>{daily.completed ? "Đã hoàn thành" : "Đang tiến hành"}</span></div>
        <div data-goal="weekly" data-complete={String(Boolean(weekly.completed))}><strong>Mục tiêu tuần này</strong><span>{String(weekly.xp_current ?? 0)}/{String(weekly.xp_target ?? 100)} XP · {String(weekly.attempt_current ?? 0)}/{String(weekly.attempt_target ?? 3)} bài</span><span>{weekly.completed ? "Đã hoàn thành" : "Đang tiến hành"}</span></div>
      </div>
      {motivation.achievements.length > 0 ? <div className="motivation-achievements"><strong>Thành tích đã mở</strong><ul>{motivation.achievements.map((achievement) => <li key={achievement.id} title={achievement.description}>{achievement.title}</li>)}</ul></div> : <p className="motivation-empty">Chưa có thành tích. Hoàn thành bài luyện đầu tiên để bắt đầu.</p>}
    </section>
  );
}
