import { mkdir, writeFile } from "node:fs/promises";
import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import { auditOutcomeGenerationCoverage } from "../lib/curriculum/generation-coverage.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import { buildUniversalCurriculumRelease, UNIVERSAL_CURRICULUM_RELEASE_ID } from "../lib/curriculum-runtime/release.ts";

const expected = { grades: 9, units: 171, outcomes: 546, questions: 2052 };
const release = buildUniversalCurriculumRelease();
const outcomes = (inventoryJson as { outcomes: readonly { id: string; grade: number; mappedUnitIds: readonly string[] }[] }).outcomes;
const coverage = auditOutcomeGenerationCoverage();
if (new Set(curriculumUnits.map((unit) => unit.grade)).size !== expected.grades || curriculumUnits.length !== expected.units || outcomes.length !== expected.outcomes || release.questions.length !== expected.questions) {
  throw new Error("UNIVERSAL_CURRICULUM_BASELINE_DRIFT");
}
const units = new Map(curriculumUnits.map((unit) => [unit.slug, unit]));
const questions = new Map(release.questions.map((question) => [question.questionId, question]));
const matrix = coverage.outcomes.map((outcome) => {
  const unit = units.get(outcome.mappedUnitIds[0] ?? "");
  const question = questions.get(outcome.questionCodes[0] ?? "");
  return {
    grade: outcome.grade,
    domain: unit?.domain ?? "UNKNOWN",
    unit: unit?.slug ?? "UNKNOWN",
    outcome: outcome.outcomeId,
    generatorFamily: outcome.classification === "TRUE_PARAMETRIC" ? "EXISTING_PARAMETRIC_PREVIEW" : "NONE",
    answerType: question?.answerType ?? "UNKNOWN",
    visualType: question?.visual?.type ?? "NONE",
    status: outcome.classification === "TRUE_PARAMETRIC"
      ? "SUPPORTED"
      : outcome.classification === "MATERIALIZED_ONLY"
        ? "PARTIALLY_SUPPORTED"
        : "BLOCKED_MISSING_CONTRACT",
    reasons: outcome.reasonCodes,
  };
});
const blocked = matrix.filter((row) => row.status !== "SUPPORTED");
const artifact = {
  schemaVersion: 1,
  sourceReleaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
  baseline: expected,
  observed: { grades: new Set(curriculumUnits.map((unit) => unit.grade)).size, units: curriculumUnits.length, outcomes: outcomes.length, questions: release.questions.length },
  coverage: { grades: expected.grades, units: expected.units, outcomes: expected.outcomes, supportedOutcomes: matrix.length - blocked.length, blockedOutcomes: blocked.length },
  matrix,
};
await mkdir("artifacts/generation-coverage", { recursive: true });
await writeFile("artifacts/generation-coverage/universal-v1-coverage.json", JSON.stringify(artifact, null, 2), { mode: 0o600 });
console.log(`BASELINE grades=${expected.grades}/${expected.grades} units=${expected.units}/${expected.units} outcomes=${expected.outcomes}/${expected.outcomes} questions=${expected.questions}/${expected.questions}`);
console.log(`SUPPORTED_OUTCOMES=${matrix.length - blocked.length}`);
console.log(`BLOCKED_OUTCOMES=${blocked.length}`);
for (const row of blocked) console.log(`BLOCKED ${row.outcome} ${row.status} reasons=${row.reasons.join(",")}`);
if (blocked.length > 0) process.exitCode = 2;
