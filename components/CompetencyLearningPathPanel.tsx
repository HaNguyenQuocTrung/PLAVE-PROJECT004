import { Button } from "@/components/Button";
import type { StudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import { getLessonPath } from "@/lib/practice/catalog";

const statusText = {
  NOT_STARTED: "Chưa bắt đầu",
  DEVELOPING: "Đang hình thành",
  BASIC: "Đạt cơ bản",
  PROFICIENT: "Thành thạo",
  SECURE: "Vững chắc",
} as const;

const confidenceText = {
  LOW: "Thấp",
  MEDIUM: "Vừa",
  HIGH: "Cao",
} as const;

const reasonText = {
  PREREQUISITE_GAP: "củng cố nền tảng trước đó",
  LOW_MASTERY: "mức độ hiện tại còn cần luyện thêm",
  CURRICULUM_NEXT: "đang ở bước tiếp theo trong lộ trình",
  RETENTION_DUE: "đã đến lúc ôn lại để ghi nhớ",
  CONTINUE_IN_PROGRESS: "em đang có bài chưa hoàn thành",
  NO_EVIDENCE: "chưa có đủ bằng chứng cho kỹ năng này",
} as const;

export function CompetencyLearningPathPanel({
  model,
}: Readonly<{ model: StudentCompetencyDashboard }>) {
  const recommendation = model.recommendation;
  const recommendationReasons = recommendation
    ? recommendation.reasonCodes.slice(0, 2).map((code) => reasonText[code])
    : [];
  return (
    <>
      <section
        className="dashboard-section competency-learning-path"
        aria-labelledby="learning-path-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Từ hoạt động học hiện có</p>
          <h2 id="learning-path-title">Bài nên học tiếp</h2>
        </div>
        {recommendation ? (
          <div className="personalized-recommendation">
            <div className="personalized-recommendation__content">
              <h3>{recommendation.title}</h3>
              <p>
                {recommendationReasons.length > 0
                  ? `Hệ thống gợi ý vì ${recommendationReasons.join(" và ")}.`
                  : recommendation.explanation}
              </p>
              <p className="parent-section-note">
                Đây là gợi ý minh bạch từ tiến độ của em, không phải chẩn đoán
                sư phạm.
              </p>
            </div>
            <Button href={getLessonPath(recommendation.candidateId)} variant="secondary">
              Bắt đầu hoặc tiếp tục
            </Button>
          </div>
        ) : (
          <p className="empty-state">
            Chưa có bài phù hợp để gợi ý. Em hãy thử hoàn thành bài đang học.
          </p>
        )}
      </section>

      <section
        className="dashboard-section competency-learning-path"
        aria-labelledby="competency-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Ước tính từ hoạt động học hiện có</p>
          <h2 id="competency-title">Năng lực của em</h2>
          <p>Hint, difficulty độc lập và retention chưa có dữ liệu riêng.</p>
        </div>
        <ul className="competency-list">
          {model.skills.map((skill) => (
            <li className="competency-list__item" key={skill.skillId}>
              <div>
                <h3>{skill.displayName ?? skill.skillId}</h3>
                <p>
                  {statusText[skill.status]} · Độ tin cậy: {confidenceText[skill.confidence]}
                </p>
              </div>
              <strong aria-label={`Mức ước tính ${skill.masteryScore} trên 100`}>
                {skill.masteryScore}/100
              </strong>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
