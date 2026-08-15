import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { canonicalize } from "../lib/content-factory/canonical.ts";
import { titleFromCanonicalVietnameseEvidence } from "../lib/learning/vietnamese-title-policy.ts";
import { buildGradesTwoToNineDatabaseRelease } from "../lib/release-integration/inventory.ts";

const root = process.cwd();
const outputPath = resolve(
  root,
  "content/releases/grades-2-9/vietnamese-curriculum-labels.json",
);
const migrationPath = resolve(
  root,
  "supabase/migrations/0045_grades_2_9_local_public_release.sql",
);
const migrationSha256 = createHash("sha256")
  .update(readFileSync(migrationPath))
  .digest("hex");
const release = buildGradesTwoToNineDatabaseRelease();

const units = release.grades
  .flatMap((grade) => grade.units)
  .map((unit) => {
    const evidence = [
      { sourceField: "TITLE" as const, sourceIndex: 0, value: unit.title },
      { sourceField: "DESCRIPTION" as const, sourceIndex: 0, value: unit.description },
      ...unit.learningGoals.map((value, sourceIndex) => ({
        sourceField: "LEARNING_GOAL" as const,
        sourceIndex,
        value,
      })),
    ];
    const localized = evidence
      .map((item) => ({
        ...item,
        title: titleFromCanonicalVietnameseEvidence(item.value),
      }))
      .find((item) => item.title !== null);
    if (!localized?.title) {
      throw new Error(`VIETNAMESE_TITLE_EVIDENCE_MISSING:${unit.unitId}`);
    }
    return {
      unitId: unit.unitId,
      grade: unit.grade,
      title: localized.title,
      sourceField: localized.sourceField,
      sourceIndex: localized.sourceIndex,
    };
  })
  .sort((left, right) => left.unitId.localeCompare(right.unitId));

if (units.length !== 163 || new Set(units.map((unit) => unit.unitId)).size !== 163) {
  throw new Error("VIETNAMESE_TITLE_INVENTORY_COUNT_MISMATCH");
}

const core = {
  schemaVersion: "plave-vietnamese-curriculum-labels-v1",
  provenance: {
    source: "canonical Grades 2-9 release unit description/learning goals",
    sourceBuilder: "lib/release-integration/inventory.ts",
    sourceMigration: "supabase/migrations/0045_grades_2_9_local_public_release.sql",
    sourceMigrationSha256: migrationSha256,
    sourceInventoryHash: release.inventoryHash,
    transformation: "verbatim Vietnamese evidence excerpt; whitespace/punctuation normalization and bounded truncation only",
  },
  counts: {
    grades: 8,
    units: units.length,
    runtimeUnits: release.totals.runtimeUnits,
  },
  units,
};
const artifact = {
  ...core,
  artifactHash: createHash("sha256")
    .update(canonicalize(core))
    .digest("hex"),
};

writeFileSync(outputPath, `${canonicalize(artifact)}\n`, "utf8");
console.log(
  `VIETNAMESE_CURRICULUM_LABELS_OK units=${units.length} runtime_units=${release.totals.runtimeUnits} hash=${artifact.artifactHash}`,
);
