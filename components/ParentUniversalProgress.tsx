import {
  parentMasteryLabels,
  type ParentUniversalEvidence,
  type ParentUniversalProgress as ParentUniversalProgressData,
} from "@/lib/parent-dashboard/universal-contracts";
import type { StudentScoringSummary } from "@/lib/curriculum-runtime/contracts";
import type { MotivationSummary } from "@/lib/motivation/contracts";
import { MotivationOverview } from "@/components/MotivationOverview";
import {
  CURRENT_MASTERY_HELP,
  curriculumOutcomeStateText,
  getCurriculumOutcomeEvidenceState,
  getVietnameseLearningLabel,
  getVietnameseOutcomeLabel,
  getVietnameseSkillLabel,
  getVietnameseUnitLabel,
} from "@/lib/learning/presentation";

type Props = {
  progress: ParentUniversalProgressData;
  scoring: StudentScoringSummary | null;
  motivation: MotivationSummary | null;
};

function percent(value: number | null) {
  return value === null
    ? "Chưa đủ dữ liệu"
    : `${new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 1,
      }).format(value)}%`;
}

function EvidenceList({
  items,
  empty,
  kind,
}: {
  items: ParentUniversalEvidence[];
  empty: string;
  kind: "OUTCOME" | "SKILL" | "LEARNING";
}) {
  if (!items.length) {
    return <p className="parent-section-note">{empty}</p>;
  }
  return (
    <ul className="parent-universal-evidence">
      {items.map((item, index) => (
        <li key={`${item.source}-${item.title}-${index}`}>
          <div>
            <strong>
              {kind === "OUTCOME"
                ? getVietnameseOutcomeLabel({ label: item.title })
                : kind === "SKILL"
                  ? getVietnameseSkillLabel({ label: item.title })
                  : getVietnameseLearningLabel({ label: item.title })}
            </strong>
            <span>
              {item.correctCount}/{item.evidenceCount} câu đúng ·{" "}
              {percent(item.accuracyPercent)}
            </span>
          </div>
          {item.masteryLabel ? (
            <span className="parent-mastery-label">
              {parentMasteryLabels[item.masteryLabel]}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ParentUniversalProgress({ progress, scoring, motivation }: Props) {
  const startedUnits = progress.units.filter(
    (unit) => unit.status !== "NOT_STARTED",
  );
  const outcomeState = getCurriculumOutcomeEvidenceState({
    totalLearningEvidence: progress.summary.totalAnswered,
    outcomes: progress.outcomes,
  });
  return (
    <div className="parent-universal-progress">
      {scoring ? (
        <section
          className="parent-learning-section"
          aria-labelledby="parent-score-xp-mastery-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Điểm, XP và thành thạo</p>
              <h2 id="parent-score-xp-mastery-title">Tổng quan học tập mới</h2>
            </div>
          </div>
          <div className="scoring-result">
            <div>
              <span>Tổng XP</span>
              <strong>{scoring.totalXp} XP</strong>
            </div>
            <div>
              <span>Mục tiêu thành thạo</span>
              <strong>{scoring.masterySummary.mastered}</strong>
            </div>
            <div>
              <span>Nên ôn lại</span>
              <strong>{scoring.masterySummary.needsReview}</strong>
            </div>
          </div>
          <p className="parent-section-note">
            Hoàn thành bài học không đồng nghĩa kỹ năng đã thành thạo. Mức thành
            thạo dựa trên các câu trả lời gần nhất của từng mục tiêu.
          </p>
        </section>
      ) : (
        <section className="parent-learning-section" role="status">
          <h2>Tiến độ cơ bản vẫn được giữ nguyên</h2>
          <p className="parent-section-note">
            Điểm, XP và mức thành thạo tạm thời chưa sẵn sàng. Các lượt học
            và tiến độ đã lưu vẫn được hiển thị.
          </p>
        </section>
      )}
      {motivation ? (
        <MotivationOverview motivation={motivation} audience="ADULT" />
      ) : null}
      <section
        className="parent-learning-section"
        aria-labelledby="parent-unit-progress-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Theo chương trình của con</p>
            <h2 id="parent-unit-progress-title">Tiến trình theo chủ đề</h2>
          </div>
          <strong>
            {progress.summary.completedUnitCount}/{progress.units.length} đã
            hoàn thành
          </strong>
        </div>
        {!startedUnits.length ? (
          <div className="parent-empty-state">
            <h3>Con chưa bắt đầu chủ đề nào</h3>
            <p>
              Khi con mở bài học hoặc luyện tập, tiến trình sẽ xuất hiện ở
              đây.
            </p>
          </div>
        ) : (
          <ul className="parent-universal-units">
            {progress.units.map((unit) => (
              <li key={unit.unitId}>
                <div>
                  <strong>
                    {getVietnameseUnitLabel({
                      unitId: unit.unitId,
                      label: unit.title,
                    })}
                  </strong>
                  <span>
                    {unit.evidenceCount
                      ? `${unit.correctCount}/${unit.evidenceCount} câu đúng`
                      : "Chưa có câu trả lời"}
                  </span>
                </div>
                <span className="parent-mastery-label">
                  {parentMasteryLabels[unit.masteryLabel ?? "NOT_STARTED"]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="parent-universal-columns">
        <section
          className="parent-learning-section"
          aria-labelledby="parent-outcomes-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mục tiêu học tập</p>
              <h2 id="parent-outcomes-title">
                Theo mục tiêu chương trình có liên kết
              </h2>
            </div>
          </div>
          {outcomeState === "EVIDENCE_AVAILABLE" ? (
            <EvidenceList
              items={progress.outcomes}
              empty="Chưa có bằng chứng theo mục tiêu chương trình."
              kind="OUTCOME"
            />
          ) : (
            <div
              className="parent-empty-state"
              data-curriculum-outcome-state={outcomeState}
              role="status"
            >
              <h3>{curriculumOutcomeStateText[outcomeState].title}</h3>
              <p>{curriculumOutcomeStateText[outcomeState].description}</p>
              {outcomeState === "INSUFFICIENT_EVIDENCE" ? (
                <EvidenceList
                  items={progress.outcomes}
                  empty="Chưa có bằng chứng theo mục tiêu chương trình."
                  kind="OUTCOME"
                />
              ) : null}
            </div>
          )}
        </section>

        <section
          className="parent-learning-section"
          aria-labelledby="parent-skills-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Kỹ năng đã luyện</p>
              <h2 id="parent-skills-title">Theo kỹ năng</h2>
            </div>
          </div>
          <EvidenceList
            items={progress.skills}
            empty="Chưa có bằng chứng học tập theo kỹ năng."
            kind="SKILL"
          />
        </section>
      </div>

      <section
        className="parent-learning-section"
        aria-labelledby="parent-learning-insights-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Gợi ý đồng hành</p>
            <h2 id="parent-learning-insights-title">
              Nội dung đang tiến bộ và phần có thể luyện thêm
            </h2>
          </div>
        </div>
        <div className="parent-universal-columns">
          <div>
            <h3>Đang có tiến bộ</h3>
            <EvidenceList
              items={progress.strengths}
              empty="Chưa đủ bằng chứng để ghi nhận điểm mạnh."
              kind="LEARNING"
            />
          </div>
          <div>
            <h3>Nên luyện thêm</h3>
            <EvidenceList
              items={progress.needsPractice}
              empty="Chưa có nội dung nào được gắn nhãn cần luyện thêm."
              kind="LEARNING"
            />
          </div>
        </div>
        <p className="parent-section-note">{CURRENT_MASTERY_HELP}</p>
      </section>

      <section
        className="parent-learning-section"
        aria-labelledby="parent-assignment-evidence-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bài giáo viên giao</p>
            <h2 id="parent-assignment-evidence-title">
              Kết quả bài giáo viên giao
            </h2>
          </div>
          <strong>
            {progress.assignmentSummary.completedCount}/
            {progress.assignmentSummary.attemptCount} lượt đã nộp
          </strong>
        </div>
        <p>
          {progress.assignmentSummary.answeredCount
            ? `${progress.assignmentSummary.correctCount}/${progress.assignmentSummary.answeredCount} câu đúng · ${percent(progress.assignmentSummary.accuracyPercent)}`
            : "Chưa có bài giáo viên giao được làm."}
        </p>
        <div className="parent-universal-columns">
          <div>
            <h3>Mục tiêu trong bài giao</h3>
            <EvidenceList
              items={progress.assignmentOutcomes}
              empty="Chưa có kết quả theo mục tiêu từ bài giáo viên giao."
              kind="OUTCOME"
            />
          </div>
          <div>
            <h3>Kỹ năng trong bài giao</h3>
            <EvidenceList
              items={progress.assignmentSkills}
              empty="Chưa có kết quả theo kỹ năng từ bài giáo viên giao."
              kind="SKILL"
            />
          </div>
        </div>
        <p className="parent-section-note">
          Kết quả bài giáo viên giao được giữ tách biệt với luyện tập độc lập,
          nên không cộng trùng lượt học.
        </p>
      </section>

      <section
        className="parent-learning-section"
        aria-labelledby="parent-universal-history-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Hoạt động gần đây</p>
            <h2 id="parent-universal-history-title">Lịch sử luyện tập</h2>
          </div>
        </div>
        {!progress.attempts.length ? (
          <div className="parent-empty-state">
            <h3>Chưa có lịch sử luyện tập</h3>
            <p>Lượt học mới sẽ xuất hiện tại đây sau khi con bắt đầu.</p>
          </div>
        ) : (
          <ul className="parent-universal-history">
            {progress.attempts.map((attempt) => (
              <li key={attempt.attemptId}>
                <div>
                  <strong>
                    {getVietnameseUnitLabel({ label: attempt.unitTitle })}
                  </strong>
                  <span>
                    {attempt.correctCount}/{attempt.answeredCount} câu đã làm
                    đúng
                  </span>
                </div>
                <span>
                  {attempt.status === "COMPLETED"
                    ? "Đã hoàn thành"
                    : attempt.status === "ABANDONED"
                      ? "Đã thoát"
                      : "Đang học"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
