import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateSourceEvidence,
  type MathematicsOutcomeIndex,
  type SourceProvenanceManifest,
} from "../lib/curriculum/source-evidence.ts";

const manifest = JSON.parse(
  readFileSync(
    new URL(
      "../docs/curriculum/sources/SOURCE_PROVENANCE.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as SourceProvenanceManifest;
const index = JSON.parse(
  readFileSync(
    new URL(
      "../docs/curriculum/sources/MATHEMATICS_OUTCOME_INDEX_1_TO_9.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as MathematicsOutcomeIndex;
const coverage = JSON.parse(
  readFileSync(
    new URL(
      "../docs/curriculum/GRADES_1_TO_9_COVERAGE_STATUS.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  sourceLockTargets: Readonly<Record<string, readonly number[]>>;
};
const actualFiles = manifest.documents.map((document) => {
  const bytes = readFileSync(new URL(`../${document.localPath}`, import.meta.url));
  return {
    localPath: document.localPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    fileSizeBytes: bytes.length,
    mediaType: "application/pdf" as const,
    pdfHeader: bytes.subarray(0, 8).toString("ascii"),
    pageCount: document.pageCount,
  };
});

test("official taxonomy accepts 37 applicable cells and three evidenced N/A cells", () => {
  const result = validateSourceEvidence(
    manifest,
    index,
    actualFiles,
    coverage.sourceLockTargets,
  );
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(index.domainTaxonomy?.officiallyApplicableCells, 37);
  assert.equal(index.domainTaxonomy?.remainingApplicableDomainGaps, 0);
});

test("official taxonomy rejects missing N/A pages and an applicable cell relabelled N/A", () => {
  const firstNaIndex = index.gaps.findIndex(
    (gap) => gap.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM",
  );
  assert.notEqual(firstNaIndex, -1);
  const missingPageGaps = [...index.gaps];
  missingPageGaps[firstNaIndex] = {
    ...missingPageGaps[firstNaIndex],
    notApplicableEvidence: {
      ...missingPageGaps[firstNaIndex].notApplicableEvidence!,
      pages: { start: 0, end: 0 },
    },
  };
  const missingPageResult = validateSourceEvidence(
    manifest,
    { ...index, gaps: missingPageGaps },
    actualFiles,
    coverage.sourceLockTargets,
  );
  assert.ok(
    missingPageResult.errors.some((error) =>
      error.includes("Official N/A evidence is invalid"),
    ),
  );

  const applicableIndex = index.gaps.findIndex(
    (gap) => gap.status === "TEACHABLE_IMPLEMENTED",
  );
  const relabelled = [...index.gaps];
  relabelled[applicableIndex] = {
    ...relabelled[applicableIndex],
    outcomeIds: [],
    status: "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM",
    notApplicableEvidence: index.gaps[firstNaIndex].notApplicableEvidence,
  };
  const relabelledResult = validateSourceEvidence(
    manifest,
    { ...index, gaps: relabelled },
    actualFiles,
    coverage.sourceLockTargets,
  );
  assert.ok(
    relabelledResult.errors.some((error) =>
      error.includes("Applicable cell cannot be marked not applicable"),
    ),
  );
});

test("official taxonomy rejects source drift and coverage/index contradiction", () => {
  const driftedFiles = [
    { ...actualFiles[0], sha256: "0".repeat(64) },
    ...actualFiles.slice(1),
  ];
  const driftResult = validateSourceEvidence(
    manifest,
    index,
    driftedFiles,
    coverage.sourceLockTargets,
  );
  assert.ok(
    driftResult.errors.includes("Source fingerprint mismatch: MOET-MATH-2018."),
  );

  const contradictoryCoverage = {
    ...coverage.sourceLockTargets,
    geometry: [7, 8],
  };
  const coverageResult = validateSourceEvidence(
    manifest,
    index,
    actualFiles,
    contradictoryCoverage,
  );
  assert.ok(
    coverageResult.errors.includes(
      "Source outcome index and coverage JSON gaps are inconsistent.",
    ),
  );
});
