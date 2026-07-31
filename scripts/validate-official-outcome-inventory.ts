import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  validateOfficialOutcomeInventory,
  type OfficialOutcomeInventory,
} from "../lib/curriculum/official-outcome-inventory.ts";
import {
  curriculumOutcomes,
  curriculumUnits,
} from "../lib/curriculum/registry.ts";
import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import type {
  SourceProvenanceManifest,
} from "../lib/curriculum/source-evidence.ts";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const inventory = JSON.parse(
  readFileSync(
    resolve(
      projectRoot,
      "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
    ),
    "utf8",
  ),
) as OfficialOutcomeInventory;
const manifest = JSON.parse(
  readFileSync(
    resolve(projectRoot, "docs/curriculum/sources/SOURCE_PROVENANCE.json"),
    "utf8",
  ),
) as SourceProvenanceManifest;
const primarySource = manifest.documents.find(
  (document) => document.id === inventory.source.documentId,
);
if (!primarySource) {
  console.error("OFFICIAL_OUTCOME_INVENTORY_VALIDATION_FAILED");
  console.error("- Primary source document is missing.");
  process.exitCode = 1;
} else {
  const result = validateOfficialOutcomeInventory(
    inventory,
    curriculumUnits,
    curriculumOutcomes,
    primarySource,
    curriculumUnits.map((unit) => generatePreviewUnit(unit.slug)),
  );
  if (!result.valid) {
    console.error("OFFICIAL_OUTCOME_INVENTORY_VALIDATION_FAILED");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("OFFICIAL_OUTCOME_INVENTORY_VALID");
    console.log(`officialOutcomes=${inventory.totalOfficialOutcomes}`);
    console.log(`mappedUnits=${inventory.mappedUnits}`);
    console.log(`mappedQuestions=${inventory.mappedQuestions}`);
    console.log(
      `implementedOutcomes=${inventory.byGrade.reduce((sum, grade) => sum + grade.implementedOutcomes, 0)}`,
    );
    console.log(
      `validatedOutcomes=${inventory.byGrade.reduce((sum, grade) => sum + grade.validatedOutcomes, 0)}`,
    );
    console.log(
      `overallCoveragePercent=${inventory.overallOfficialOutcomeCoveragePercent}`,
    );
    console.log(
      `fullOfficialOutcomeCoverage=${inventory.fullOfficialOutcomeCoverage}`,
    );
  }
}
