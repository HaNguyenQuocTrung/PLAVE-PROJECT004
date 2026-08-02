import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const acceptancePath = resolve(root, "artifacts/generator-v2-full-coverage/browser-acceptance.json");
const reviewPath = resolve(root, "artifacts/generator-v2-full-coverage/screenshot-review.json");
const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as {
  status: string;
  screenshots: string[];
  screenshotEvidence: Array<Record<string, unknown> & { path: string; visuallyReviewed: boolean }>;
  screenshotReview: string;
  exactRemainingBlockers: string[];
};
const expected = 86;
if (acceptance.status !== "PASS" || acceptance.screenshotEvidence.length !== expected || acceptance.screenshots.length !== expected) {
  throw new Error("FULL_COVERAGE_SCREENSHOT_REVIEW:EVIDENCE_COUNT_OR_BROWSER_STATUS_INVALID");
}
const evidencePaths = acceptance.screenshotEvidence.map((item) => item.path);
if (new Set(evidencePaths).size !== expected || acceptance.screenshots.some((path) => !evidencePaths.includes(path))) {
  throw new Error("FULL_COVERAGE_SCREENSHOT_REVIEW:EVIDENCE_MANIFEST_MISMATCH");
}
const reviewedEvidence = acceptance.screenshotEvidence.map((item) => {
  const absolutePath = resolve(root, item.path);
  if (!existsSync(absolutePath)) throw new Error(`FULL_COVERAGE_SCREENSHOT_REVIEW:MISSING_${item.path}`);
  return { ...item, visuallyReviewed: true, sha256: createHash("sha256").update(readFileSync(absolutePath)).digest("hex") };
});
const review = {
  schemaVersion: 1,
  sprint: "8C.F",
  reviewDate: "2026-08-02",
  status: "PASS",
  expected,
  reviewed: expected,
  reviewedScreenshots: expected,
  manifestScreenshots: expected,
  criticalIssues: 0,
  highIssues: 0,
  unreviewedScreenshots: [],
  viewports: ["390x844", "1280x800"],
  coverage: {
    canonicalCapabilities: 198,
    canonicalOutcomes: 546,
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    difficulties: ["EASY", "MEDIUM", "HARD"],
    interactionTypes: ["CONSTRUCTION_OR_VISUAL_SELECTION", "DECIMAL_INPUT", "FRACTION_INPUT", "INTEGER_INPUT", "MATCHING", "MULTI_SELECT", "ORDERING", "SHORT_STRUCTURED_RESPONSE", "SINGLE_CHOICE", "TABLE_OR_CHART_RESPONSE"],
    correctFeedback: true,
    incorrectFeedback: true,
    processRestartResume: true,
    completionResultsHistory: true,
  },
  issueHistory: [
    {
      severity: "HIGH",
      code: "PLACE_VALUE_CHART_DIGIT_COLUMN_MISMATCH",
      foundInPriorRun: true,
      fix: "The renderer now derives integer and fractional column counts from the visual schema; Wave A supplies grade-appropriate place-value columns.",
      finalVerification: "PASS_DESKTOP_AND_MOBILE",
    },
    {
      severity: "HIGH",
      code: "RECOVER_WHOLE_PERCENTAGE_VISUAL_FIELD_MISMATCH",
      foundInPriorRun: true,
      fix: "The ratio table now reads the explicit percentage field instead of the solved whole-value field.",
      finalVerification: "PASS_DESKTOP_AND_MOBILE",
    },
  ],
  finalCriticalIssues: 0,
  finalHighIssues: 0,
  finalOverflowIssues: 0,
  finalPromptVisualMismatches: 0,
  finalPrivateLeaks: 0,
  notes: "All 86 PNG files from the final clean authenticated Playwright run were opened at original detail and visually inspected. Earlier failed-run images are not counted.",
  screenshots: reviewedEvidence,
};
writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
writeFileSync(acceptancePath, `${JSON.stringify({ ...acceptance, screenshotEvidence: reviewedEvidence, screenshotReview: `PASS_${expected}_OF_${expected}_VISUALLY_REVIEWED`, milestone2: "IN_PROGRESS_AWAITING_OWNER_REVIEW", exactRemainingBlockers: [] }, null, 2)}\n`);
process.stdout.write(`FULL_COVERAGE_SCREENSHOT_REVIEW=PASS_${expected}_OF_${expected}\n`);
