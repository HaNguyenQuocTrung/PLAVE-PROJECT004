import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

import {
  validateSourceEvidence,
  type MathematicsOutcomeIndex,
  type SourceProvenanceManifest,
} from "../lib/curriculum/source-evidence.ts";
import {
  validateOfficialOutcomeInventory,
  type OfficialOutcomeInventory,
} from "../lib/curriculum/official-outcome-inventory.ts";
import {
  curriculumOutcomes,
  curriculumUnits,
} from "../lib/curriculum/registry.ts";
import { generatePreviewUnit } from "../lib/curriculum/engine.ts";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const provenancePath = resolve(
  projectRoot,
  "docs/curriculum/sources/SOURCE_PROVENANCE.json",
);
const outcomeIndexPath = resolve(
  projectRoot,
  "docs/curriculum/sources/MATHEMATICS_OUTCOME_INDEX_1_TO_9.json",
);
const coveragePath = resolve(
  projectRoot,
  "docs/curriculum/GRADES_1_TO_9_COVERAGE_STATUS.json",
);
const officialOutcomeInventoryPath = resolve(
  projectRoot,
  "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
);

const manifest = JSON.parse(
  readFileSync(provenancePath, "utf8"),
) as SourceProvenanceManifest;
const outcomeIndex = JSON.parse(
  readFileSync(outcomeIndexPath, "utf8"),
) as MathematicsOutcomeIndex;
const coverage = JSON.parse(readFileSync(coveragePath, "utf8")) as {
  sourceLockTargets: Readonly<Record<string, readonly number[]>>;
  remainingGaps: Readonly<Record<string, readonly number[]>>;
};
const officialOutcomeInventory = JSON.parse(
  readFileSync(officialOutcomeInventoryPath, "utf8"),
) as OfficialOutcomeInventory;

function readPdfPageCount(bytes: Buffer) {
  const source = bytes.toString("latin1");
  const directPageCount =
    source.match(/\/Type\s*\/Page(?!s)\b/gu)?.length ?? 0;
  if (directPageCount > 0) return directPageCount;

  const pageTreeCounts: number[] = [];
  const streamPattern = /stream\r?\n/gu;
  while (streamPattern.exec(source) !== null) {
    const end = source.indexOf("endstream", streamPattern.lastIndex);
    if (end < 0) break;
    const trailingCarriageReturn = source[end - 1] === "\r" ? 1 : 0;
    const compressed = bytes.subarray(
      streamPattern.lastIndex,
      end - trailingCarriageReturn,
    );
    try {
      const inflated = inflateSync(compressed).toString("latin1");
      for (const countMatch of inflated.matchAll(/\/Count\s+(\d+)/gu)) {
        pageTreeCounts.push(Number(countMatch[1]));
      }
    } catch {
      // Non-Flate and encrypted streams are irrelevant to this page-tree scan.
    }
    streamPattern.lastIndex = end + "endstream".length;
  }
  return pageTreeCounts.length > 0 ? Math.max(...pageTreeCounts) : null;
}

const actualFiles = manifest.documents.map((document) => {
  const bytes = readFileSync(resolve(projectRoot, document.localPath));
  const beginsWithPdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const beginsWithHtml = bytes
    .subarray(0, Math.min(bytes.length, 128))
    .toString("utf8")
    .trimStart()
    .toLowerCase()
    .startsWith("<!doctype html");
  return {
    localPath: document.localPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    fileSizeBytes: bytes.length,
    mediaType: beginsWithPdf
      ? ("application/pdf" as const)
      : beginsWithHtml
        ? ("text/html" as const)
        : ("unknown" as const),
    pdfHeader: beginsWithPdf
      ? bytes.subarray(0, 8).toString("ascii")
      : null,
    pageCount: beginsWithPdf ? readPdfPageCount(bytes) : null,
  };
});

const result = validateSourceEvidence(
  manifest,
  outcomeIndex,
  actualFiles,
  coverage.sourceLockTargets,
);
const primaryDocument = manifest.documents.find(
  (document) => document.id === officialOutcomeInventory.source.documentId,
);
const inventoryResult = primaryDocument
  ? validateOfficialOutcomeInventory(
      officialOutcomeInventory,
      curriculumUnits,
      curriculumOutcomes,
      primaryDocument,
      curriculumUnits.map((unit) => generatePreviewUnit(unit.slug)),
    )
  : {
      valid: false,
      errors: ["Official outcome inventory primary source is missing."],
    };
const errors = [...result.errors, ...inventoryResult.errors];

if (errors.length > 0) {
  console.error("SOURCE_OUTCOME_VALIDATION_FAILED");
  for (const error of errors) console.error(`- ${error}`);
  console.error(`lockedOutcomes=${outcomeIndex.lockedOutcomeCount}`);
  console.error(
    `sourceValidatedGaps=${outcomeIndex.gaps.filter((gap) => gap.outcomeIds.length > 0).length}`,
  );
  process.exitCode = 1;
} else {
  console.log("SOURCE_OUTCOME_VALIDATION_PASSED");
  console.log(`lockedOutcomes=${outcomeIndex.lockedOutcomeCount}`);
  console.log(
    `sourceValidatedApplicableGaps=${outcomeIndex.gaps.filter((gap) => gap.status === "TEACHABLE_IMPLEMENTED").length}`,
  );
  console.log(
    `notApplicableCells=${outcomeIndex.gaps.filter((gap) => gap.status === "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM").length}`,
  );
  console.log("remainingApplicableSourceGaps=0");
  console.log(
    `officialOutcomes=${officialOutcomeInventory.totalOfficialOutcomes}`,
  );
  console.log(
    `fullOfficialOutcomeCoverage=${officialOutcomeInventory.fullOfficialOutcomeCoverage}`,
  );
}
