import {
  parentMasteryLabels,
  type ParentUniversalEvidence,
  type ParentUniversalProgress as ParentUniversalProgressData,
} from "@/lib/parent-dashboard/universal-contracts";

type Props = {
  progress: ParentUniversalProgressData;
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
}: {
  items: ParentUniversalEvidence[];
  empty: string;
}) {
  if (!items.length) {
    return <p className="parent-section-note">{empty}</p>;
  }
  return (
    <ul className="parent-universal-evidence">
      {items.map((item, index) => (
        <li key={`${item.source}-${item.title}-${index}`}>
          <div>
            <strong>{item.title}</strong>
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

export function ParentUniversalProgress({ progress }: Props) {
  const startedUnits = progress.units.filter(
    (unit) => unit.status !== "NOT_STARTED",
  );
  return (
    <div className="parent-universal-progress">
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
                  <strong>{unit.title}</strong>
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
              <h2 id="parent-outcomes-title">Theo yêu cầu chương trình</h2>
            </div>
          </div>
          <EvidenceList
            items={progress.outcomes}
            empty="Chưa có bằng chứng học tập theo mục tiêu chương trình."
          />
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
              Điểm mạnh và nội dung cần luyện
            </h2>
          </div>
        </div>
        <div className="parent-universal-columns">
          <div>
            <h3>Đang làm tốt</h3>
            <EvidenceList
              items={progress.strengths}
              empty="Chưa đủ bằng chứng để ghi nhận điểm mạnh."
            />
          </div>
          <div>
            <h3>Nên luyện thêm</h3>
            <EvidenceList
              items={progress.needsPractice}
              empty="Chưa có nội dung nào được gắn nhãn cần luyện thêm."
            />
          </div>
        </div>
        <p className="parent-section-note">{progress.masteryExplanation}</p>
      </section>

      <section
        className="parent-learning-section"
        aria-labelledby="parent-assignment-evidence-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bài giáo viên giao</p>
            <h2 id="parent-assignment-evidence-title">
              Kết quả assignment riêng biệt
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
              empty="Chưa có evidence theo mục tiêu từ bài giáo viên giao."
            />
          </div>
          <div>
            <h3>Kỹ năng trong bài giao</h3>
            <EvidenceList
              items={progress.assignmentSkills}
              empty="Chưa có evidence theo kỹ năng từ bài giáo viên giao."
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
                  <strong>{attempt.unitTitle}</strong>
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
