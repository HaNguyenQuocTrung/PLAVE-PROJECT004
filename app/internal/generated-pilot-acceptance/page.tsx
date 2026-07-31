import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CurriculumVisual } from "@/app/curriculum-preview/CurriculumVisual";
import { GeneratedPracticePilotCard } from "@/components/GeneratedPracticePilotCard";
import { getGeneratedPracticePilotConfiguration } from "@/lib/curriculum/generated-practice-pilot";
import { generateSemanticPilotAttemptSnapshot } from "@/lib/curriculum/semantic-pilot-generation";
import { buildOutcomeSemanticContract } from "@/lib/generation-semantic/variant-engine";
import inventoryJson from "@/docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json";

export const metadata = { title: "Generated pilot acceptance" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type InventoryOutcome = {
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
  mappedUnitIds: string[];
};

const inventory = inventoryJson as { outcomes: InventoryOutcome[] };

export default async function GeneratedPilotAcceptancePage() {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const pilot = getGeneratedPracticePilotConfiguration();
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAVE_GENERATED_PRACTICE_ACCEPTANCE_UI !== "true" ||
    (host !== "127.0.0.1" && host !== "localhost") ||
    !pilot.enabled
  ) {
    notFound();
  }
  const previews = ([2, 5, 7, 9] as const).flatMap((grade, index) => {
    const preferredVariants: Record<number, readonly string[]> = {
      2: ["DIRECT_MEASUREMENT", "PLACE_VALUE", "AREA"],
      5: ["AREA", "VOLUME", "FRACTION_RECOGNITION"],
      7: ["COORDINATE", "CHART_INTERPRETATION", "TABLE_INTERPRETATION"],
      9: ["CHART_INTERPRETATION", "COORDINATE", "ANGLE"],
    };
    const candidates = inventory.outcomes.filter((outcome) => {
      if (outcome.grade !== grade) return false;
      const contract = buildOutcomeSemanticContract({
        id: outcome.id,
        grade: outcome.grade,
        strand: outcome.officialStrand,
        subdomain: outcome.subdomain ?? "",
        description: outcome.conciseParaphrase,
      });
      return contract.expectedVisual !== "NONE";
    }).sort((left, right) => {
      const preferred = preferredVariants[grade] ?? [];
      const leftVariant = buildOutcomeSemanticContract({
        id: left.id, grade: left.grade, strand: left.officialStrand,
        subdomain: left.subdomain ?? "", description: left.conciseParaphrase,
      }).expectedVariant;
      const rightVariant = buildOutcomeSemanticContract({
        id: right.id, grade: right.grade, strand: right.officialStrand,
        subdomain: right.subdomain ?? "", description: right.conciseParaphrase,
      }).expectedVariant;
      const leftIndex = preferred.indexOf(leftVariant);
      const rightIndex = preferred.indexOf(rightVariant);
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
    });
    for (const outcome of candidates) {
      for (const unitId of outcome.mappedUnitIds) {
        try {
          const snapshot = generateSemanticPilotAttemptSnapshot({
            grade,
            unitId,
            outcomeId: outcome.id,
            attemptSeed: `pilot-${String(index + 1).repeat(48)}`,
            baseDifficulty: "MEDIUM",
            selectionReason: "NO_EVIDENCE",
          });
          const question = snapshot.questions[0];
          if (question) return [{ sample: { grade }, question }];
        } catch {
          // Continue until one canonical visual outcome maps to a release unit.
        }
      }
    }
    return [];
  });

  return (
    <div className="content-page page-shell" data-generated-pilot-acceptance>
      <header className="content-page__header">
        <p className="eyebrow">Kiểm tra giao diện local-only</p>
        <h1>Generated practice pilot</h1>
        <p>
          Bản xem trước chỉ chứa public payload đã sinh; không tạo attempt,
          không chấm bài và không chứa lời giải riêng tư.
        </p>
      </header>
      <GeneratedPracticePilotCard compact />
      <section className="unit-catalog" aria-labelledby="pilot-preview-title">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Public visual samples</p>
          <h2 id="pilot-preview-title">Mẫu hiển thị theo lớp</h2>
        </div>
        <div className="unit-catalog__grid">
          {previews.map(({ question, sample }) => (
            <article className="real-question-card" key={question.questionId}>
              <p className="question-count">Lớp {sample.grade}</p>
              <CurriculumVisual spec={question.visual} />
              <h3 className="real-question-card__prompt">{question.prompt}</h3>
              <div className="choice-grid" aria-label={`Lựa chọn cho mẫu lớp ${sample.grade}`}>
                {question.options?.map((option) => (
                  <div className="choice" key={option.key}>
                    <span className="choice__label" aria-hidden="true">{option.key}</span>
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
