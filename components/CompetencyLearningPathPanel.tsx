import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/UiStates";
import type { StudentCompetencyDashboard } from "@/lib/competency/student-adapter";
import { getLessonPath } from "@/lib/practice/catalog";

const statusText = {
  NOT_STARTED: "Mới bắt đầu",
  DEVELOPING: "Đang tiến bộ",
  BASIC: "Đang tiến bộ",
  PROFICIENT: "Đã vững",
  SECURE: "Đã vững",
} as const;

const evidenceText = {
  LOW: "Bằng chứng còn ít; kết quả sẽ rõ hơn sau vài lượt học.",
  MEDIUM: "Đã có một số lượt học để tham khảo.",
  HIGH: "Đã có nhiều lượt học gần đây để tham khảo.",
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
              {recommendationReasons.length > 0 ? (
                <>
                  <p>Vì sao bài này phù hợp:</p>
                  <ul className="recommendation-reasons">
                    {recommendationReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{recommendation.explanation}</p>
              )}
            </div>
            <Button href={getLessonPath(recommendation.candidateId)}>
              Học bài này
            </Button>
          </div>
        ) : (
          <div className="empty-state">
            <h3>Chưa có đủ hoạt động để gợi ý</h3>
            <p>Em hãy chọn một bài trong chương trình để bắt đầu.</p>
            <Button href="/lessons">Xem bài học</Button>
          </div>
        )}
      </section>

      <section
        className="dashboard-section competency-learning-path"
        aria-labelledby="competency-title"
      >
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Ước tính từ hoạt động học hiện có</p>
          <h2 id="competency-title">Năng lực của em</h2>
          <p>
            Đây là bức tranh tạm thời từ các câu em đã làm, không phải đánh giá
            cố định về khả năng của em.
          </p>
        </div>
        <details className="competency-details" open={model.skills.length <= 6}>
          <summary>Xem {model.skills.length} kỹ năng</summary>
          <ul className="competency-list">
            {model.skills.map((skill) => (
              <li className="competency-list__item" key={skill.skillId}>
                <div>
                  <h3>{skill.displayName ?? "Kỹ năng Toán học"}</h3>
                  <p>{evidenceText[skill.confidence]}</p>
                </div>
                <div className="competency-list__result">
                  <StatusBadge
                    tone={
                      skill.status === "PROFICIENT" || skill.status === "SECURE"
                        ? "success"
                        : skill.status === "NOT_STARTED"
                          ? "neutral"
                          : "info"
                    }
                  >
                    {statusText[skill.status]}
                  </StatusBadge>
                  <strong aria-label={`Mức hiện tại ${skill.masteryScore} trên 100`}>
                    {skill.masteryScore}/100
                  </strong>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}
