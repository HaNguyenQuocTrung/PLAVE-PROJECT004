import { Button } from "@/components/Button";
import { getLessonPath } from "@/lib/practice/catalog";
import type { LearningUnit } from "@/lib/practice/contracts";

type ControlledPilotCardProps = {
  unit: LearningUnit;
  compact?: boolean;
};

export function ControlledPilotCard({
  unit,
  compact = false,
}: ControlledPilotCardProps) {
  return (
    <section
      className="unit-card unit-card--recommended"
      aria-labelledby={compact ? "pilot-dashboard-title" : "pilot-lessons-title"}
    >
      <div className="unit-card__heading">
        <span className="unit-status unit-status--available">
          Thử nghiệm có kiểm soát
        </span>
        <span aria-label="Luyện tập thích ứng từ 12 đến tối đa 24 câu">
          12–24 câu
        </span>
      </div>
      <h2 id={compact ? "pilot-dashboard-title" : "pilot-lessons-title"}>
        {unit.title}
      </h2>
      <p>{unit.description}</p>
      <p className="unit-card__progress">
        Bài thử nghiệm điều chỉnh số câu theo bằng chứng ở từng kỹ năng. Nội
        dung này không thay đổi lớp học hiện tại của em.
      </p>
      <div className="unit-card__actions">
        <Button href={getLessonPath(unit.slug)}>
          Xem bài thử nghiệm
        </Button>
      </div>
    </section>
  );
}
