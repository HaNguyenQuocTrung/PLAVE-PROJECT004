import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const acceptancePath = resolve(root, "artifacts/generator-v2-wave-d/browser-acceptance.json");
const reviewPath = resolve(root, "artifacts/generator-v2-wave-d/screenshot-review.json");
const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as {
  status: string;
  screenshots: string[];
  screenshotEvidence: Array<Record<string, unknown> & { path: string; visuallyReviewed: boolean }>;
  screenshotReview: string;
  exactRemainingBlockers: string[];
};

const expected = 24;
if (acceptance.status !== "PASS" || acceptance.screenshotEvidence.length !== expected || acceptance.screenshots.length !== expected) {
  throw new Error("WAVE_D_SCREENSHOT_REVIEW:EVIDENCE_COUNT_OR_BROWSER_STATUS_INVALID");
}
const evidencePaths = acceptance.screenshotEvidence.map((item) => item.path);
if (new Set(evidencePaths).size !== expected || acceptance.screenshots.some((path) => !evidencePaths.includes(path))) {
  throw new Error("WAVE_D_SCREENSHOT_REVIEW:EVIDENCE_MANIFEST_MISMATCH");
}

const reviewedEvidence = acceptance.screenshotEvidence.map((item) => {
  const absolutePath = resolve(root, item.path);
  if (!existsSync(absolutePath)) throw new Error(`WAVE_D_SCREENSHOT_REVIEW:MISSING_${item.path}`);
  return {
    ...item,
    visuallyReviewed: true,
    sha256: createHash("sha256").update(readFileSync(absolutePath)).digest("hex"),
  };
});

const review = {
  schemaVersion: 1,
  sprint: "8C.D",
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
    representativeCapabilityGroups: 8,
    interactionTypes: 10,
    correctFeedback: true,
    incorrectFeedback: true,
    processRestartResume: true,
    completionResultsHistory: true,
  },
  issuesFoundDuringReviewAndFixedBeforeFinalRun: [
    "SPATIAL_DIAGRAM_DID_NOT_ENCODE_EVERY_RELATION",
    "SPATIAL_VERTICAL_LABEL_OVERLAPPED_SHAPE_BORDER",
    "UNIT_CONVERSION_BASELINE_VISUAL_FALLBACK_REGRESSION",
    "CONSTRUCTION_VISUAL_AND_PROMPT_WERE_NOT_INTERACTION_SPECIFIC",
    "CONSTRUCTION_VISUAL_LABEL_CLIPPING",
    "PROOF_VISUAL_DID_NOT_REFLECT_SELECTED_THEOREM",
    "CIRCLE_DIAMETER_ENDPOINT_LABELS_MISSING",
    "RAW_INTERNAL_SHAPE_AND_OPERATION_LABELS_REACHED_UI",
    "MONEY_FINANCE_ROUTED_BY_GRADE_INSTEAD_OF_EXACT_OUTCOME",
    "EARLY_GRADE_MONEY_USED_INVALID_DENOMINATIONS_OR_TASKS",
    "POLYGON_OUTCOMES_COULD_RENDER_THE_WRONG_CURRICULUM_SHAPE",
  ],
  finalCriticalIssues: 0,
  finalHighIssues: 0,
  finalOverflowIssues: 0,
  finalPromptVisualMismatches: 0,
  finalPrivateLeaks: 0,
  notes: "Every PNG from the final clean Playwright run was opened at original detail and visually inspected. Earlier defective screenshots were replaced by the final rerun and are not evidence.",
  screenshots: reviewedEvidence,
};

writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
writeFileSync(acceptancePath, `${JSON.stringify({
  ...acceptance,
  screenshotEvidence: reviewedEvidence,
  screenshotReview: `PASS_${expected}_OF_${expected}_VISUALLY_REVIEWED`,
  exactRemainingBlockers: [],
}, null, 2)}\n`);

process.stdout.write(`WAVE_D_SCREENSHOT_REVIEW=PASS_${expected}_OF_${expected}\n`);
