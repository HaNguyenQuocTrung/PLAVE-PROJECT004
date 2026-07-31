import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

const inventory = JSON.parse(
  readFileSync(
    new URL(
      "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as OfficialOutcomeInventory;
const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../docs/curriculum/sources/SOURCE_PROVENANCE.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as SourceProvenanceManifest;
const primarySource = manifest.documents.find(
  (document) => document.id === inventory.source.documentId,
);
assert.ok(primarySource);
const drafts = curriculumUnits.map((unit) => generatePreviewUnit(unit.slug));

test("exhaustive official inventory maps every current unit and question", () => {
  const result = validateOfficialOutcomeInventory(
    inventory,
    curriculumUnits,
    curriculumOutcomes,
    primarySource,
    drafts,
  );
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(inventory.mappedUnits, curriculumUnits.length);
  assert.equal(inventory.mappedQuestions, curriculumUnits.length * 12);
  assert.equal(inventory.mappedSolutions, curriculumUnits.length * 12);
});

test("official inventory fails on source drift and incomplete teachable evidence", () => {
  const changedFingerprint: OfficialOutcomeInventory = {
    ...inventory,
    source: { ...inventory.source, sha256: "0".repeat(64) },
  };
  const fingerprintResult = validateOfficialOutcomeInventory(
    changedFingerprint,
    curriculumUnits,
    curriculumOutcomes,
    primarySource,
    drafts,
  );
  assert.ok(
    fingerprintResult.errors.includes(
      "Official outcome inventory source fingerprint is inconsistent.",
    ),
  );

  const firstImplementedIndex = inventory.outcomes.findIndex((outcome) =>
    outcome.statuses.includes("TEACHABLE_IMPLEMENTED"),
  );
  assert.notEqual(firstImplementedIndex, -1);
  const outcomes = [...inventory.outcomes];
  outcomes[firstImplementedIndex] = {
    ...outcomes[firstImplementedIndex],
    components: {
      ...outcomes[firstImplementedIndex].components,
      semanticValidation: false,
    },
  };
  const evidenceResult = validateOfficialOutcomeInventory(
    { ...inventory, outcomes },
    curriculumUnits,
    curriculumOutcomes,
    primarySource,
    drafts,
  );
  assert.ok(
    evidenceResult.errors.some((error) =>
      error.includes("Teachable outcome is missing required components"),
    ),
  );
});

test("official inventory rejects a unit reference to a missing outcome", () => {
  const units = [
    { ...curriculumUnits[0], outcomeIds: ["MISSING-OFFICIAL-OUTCOME"] },
    ...curriculumUnits.slice(1),
  ];
  const result = validateOfficialOutcomeInventory(
    inventory,
    units,
    curriculumOutcomes,
    primarySource,
    drafts,
  );
  assert.ok(
    result.errors.includes(
      `Unit references a non-existent curriculum outcome: ${curriculumUnits[0].slug}/MISSING-OFFICIAL-OUTCOME.`,
    ),
  );
});
