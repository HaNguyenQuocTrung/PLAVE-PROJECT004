import {
  curriculumOutcomes,
  curriculumUnits,
  domainCoverage,
} from "../lib/curriculum/registry.ts";
import {
  validateAllPreviewUnits,
  validateCurriculumRegistry,
} from "../lib/curriculum/validation.ts";
import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};

const registry = validateCurriculumRegistry();
const previews = validateAllPreviewUnits();
const errors = [...registry.errors, ...previews.errors];

if (errors.length > 0) {
  console.error("GRADES_1_TO_9_VALIDATION_FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const blueprintGaps = domainCoverage.filter(
    (entry) => entry.status === "BLUEPRINT_ONLY",
  ).length;
  console.log("GRADES_1_TO_9_VERTICAL_SLICE_VALID");
  console.log(`grades=${new Set(curriculumUnits.map((unit) => unit.grade)).size}`);
  console.log(`teachableUnits=${curriculumUnits.length}`);
  console.log(`mappedOutcomes=${curriculumOutcomes.length}`);
  console.log(`generatedQuestions=${curriculumUnits.length * 12}`);
  console.log(`blueprintDomainGaps=${blueprintGaps}`);
  const fullCurriculumCoverage =
    blueprintGaps === 0 &&
    inventoryJson.fullOfficialOutcomeCoverage &&
    inventoryJson.byGrade.every(
      (grade) =>
        grade.validatedOutcomes === grade.totalOfficialOutcomes &&
        grade.missingOutcomes === 0 &&
        grade.partiallyCoveredOutcomes === 0,
    );
  console.log(`fullCurriculumCoverage=${fullCurriculumCoverage}`);
}
