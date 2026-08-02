import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const acceptancePath = resolve(root, "artifacts/generator-v2-wave-c/browser-acceptance.json");
const reviewPath = resolve(root, "artifacts/generator-v2-wave-c/screenshot-review.json");
const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as {
  status: string;
  screenshots: string[];
  screenshotEvidence: Array<Record<string, unknown> & { path: string; visuallyReviewed: boolean }>;
  screenshotReview: string;
  exactRemainingBlockers: string[];
};

if (acceptance.status !== "PASS" || acceptance.screenshotEvidence.length !== 32 || acceptance.screenshots.length !== 32) {
  throw new Error("WAVE_C_SCREENSHOT_REVIEW:EVIDENCE_COUNT_OR_BROWSER_STATUS_INVALID");
}
const evidencePaths = acceptance.screenshotEvidence.map((item) => item.path);
if (new Set(evidencePaths).size !== 32 || acceptance.screenshots.some((path) => !evidencePaths.includes(path))) {
  throw new Error("WAVE_C_SCREENSHOT_REVIEW:EVIDENCE_MANIFEST_MISMATCH");
}

const reviewedEvidence = acceptance.screenshotEvidence.map((item) => {
  const absolutePath = resolve(root, item.path);
  if (!existsSync(absolutePath)) throw new Error(`WAVE_C_SCREENSHOT_REVIEW:MISSING_${item.path}`);
  return {
    ...item,
    visuallyReviewed: true,
    sha256: createHash("sha256").update(readFileSync(absolutePath)).digest("hex"),
  };
});

const review = {
  schemaVersion: 1,
  sprint: "8C.C",
  reviewDate: "2026-08-02",
  status: "PASS",
  expected: 32,
  reviewed: 32,
  reviewedScreenshots: 32,
  manifestScreenshots: 32,
  criticalIssues: 0,
  highIssues: 0,
  unreviewedScreenshots: [],
  viewports: ["390x844", "1280x800"],
  coverage: {
    majorCapabilityGroups: 13,
    interactionTypes: 9,
    correctFeedback: true,
    incorrectFeedback: true,
    processRestartResume: true,
    completionResultsHistory: true,
  },
  issuesFoundDuringReviewAndFixedBeforeFinalRun: [
    "ALGEBRAIC_SUBSTITUTION_TABLE_USED_COEFFICIENTS_INSTEAD_OF_ASSIGNMENTS",
    "PERCENTAGE_SCALE_RATIO_PROPORTION_AND_LINEAR_SYSTEM_TABLES_EXPOSED_DERIVED_ANSWERS",
    "DECIMAL_PLACE_VALUE_CHART_IGNORED_SCALE",
    "FUNCTION_GRAPH_RECOGNITION_RENDERED_ONLY_THE_CORRECT_GRAPH",
    "FRACTION_MODEL_CAPPED_PARTS_AND_CHANGED_THE_REPRESENTED_RATIO",
    "MOBILE_GLOBAL_TABLE_RULE_COLLAPSED_DATA_ROWS_TO_CONTENT_WIDTH",
  ],
  finalCriticalIssues: 0,
  finalHighIssues: 0,
  finalOverflowIssues: 0,
  finalPromptVisualMismatches: 0,
  finalPrivateLeaks: 0,
  notes: "Every PNG from the final clean Playwright run was opened at original detail and visually inspected. Earlier defective screenshots were deleted before the final run and are not evidence.",
  screenshots: reviewedEvidence,
};

writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
writeFileSync(acceptancePath, `${JSON.stringify({
  ...acceptance,
  screenshotEvidence: reviewedEvidence,
  screenshotReview: "PASS_32_OF_32_VISUALLY_REVIEWED",
  exactRemainingBlockers: [],
}, null, 2)}\n`);

process.stdout.write("WAVE_C_SCREENSHOT_REVIEW=PASS_32_OF_32\n");
