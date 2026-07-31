import {
  auditOutcomeGenerationCoverage,
} from "../lib/curriculum/generation-coverage.ts";

const report = auditOutcomeGenerationCoverage();

console.log("CURRICULUM_GENERATION_COVERAGE");
for (const grade of report.byGrade) {
  console.log(
    [
      `GRADE_${grade.grade}`,
      `TOTAL=${grade.total}`,
      `TRUE_PARAMETRIC=${grade.trueParametric}`,
      `MATERIALIZED_ONLY=${grade.materializedOnly}`,
      `INSUFFICIENT_STRATEGY=${grade.insufficientStrategy}`,
    ].join(" "),
  );
}
console.log(
  [
    "TOTAL",
    `OUTCOMES=${report.totalOutcomes}`,
    `TRUE_PARAMETRIC=${report.trueParametricOutcomes}`,
    `MATERIALIZED_ONLY=${report.materializedOnlyOutcomes}`,
    `INSUFFICIENT_STRATEGY=${report.insufficientStrategyOutcomes}`,
  ].join(" "),
);

const failures = report.outcomes.filter(
  (outcome) => outcome.classification !== "TRUE_PARAMETRIC",
);
for (const outcome of failures) {
  console.log(
    [
      outcome.outcomeId,
      outcome.classification,
      `REASONS=${outcome.reasonCodes.join(",") || "NONE"}`,
    ].join(" "),
  );
}
