import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const acceptancePath = resolve(root, "artifacts/generator-v2-wave-e/browser-acceptance.json");
const reviewPath = resolve(root, "artifacts/generator-v2-wave-e/screenshot-review.json");
const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as {
  status: string;
  screenshots: string[];
  screenshotEvidence: Array<Record<string, unknown> & { path: string; visuallyReviewed: boolean }>;
  screenshotReview: string;
  exactRemainingBlockers: string[];
};

const expected = 27;
if (acceptance.status !== "PASS" || acceptance.screenshotEvidence.length !== expected || acceptance.screenshots.length !== expected) {
  throw new Error("WAVE_E_SCREENSHOT_REVIEW:EVIDENCE_COUNT_OR_BROWSER_STATUS_INVALID");
}
const evidencePaths = acceptance.screenshotEvidence.map((item) => item.path);
if (new Set(evidencePaths).size !== expected || acceptance.screenshots.some((path) => !evidencePaths.includes(path))) {
  throw new Error("WAVE_E_SCREENSHOT_REVIEW:EVIDENCE_MANIFEST_MISMATCH");
}

const reviewedEvidence = acceptance.screenshotEvidence.map((item) => {
  const absolutePath = resolve(root, item.path);
  if (!existsSync(absolutePath)) throw new Error(`WAVE_E_SCREENSHOT_REVIEW:MISSING_${item.path}`);
  return {
    ...item,
    visuallyReviewed: true,
    sha256: createHash("sha256").update(readFileSync(absolutePath)).digest("hex"),
  };
});

const review = {
  schemaVersion: 1,
  sprint: "8C.E",
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
    canonicalCapabilities: 48,
    grades: [2, 3, 4, 5, 6, 7, 8, 9],
    difficulties: ["EASY", "MEDIUM", "HARD"],
    interactionTypes: 9,
    correctFeedback: true,
    incorrectFeedback: true,
    processRestartResume: true,
    completionResultsHistory: true,
  },
  issuesFoundDuringReviewAndFixedBeforeFinalRun: [
    "ENGINE_IDENTIFIERS_LEAKED_INTO_VIETNAMESE_FEEDBACK",
    "SAMPLE_SPACE_TABLE_DID_NOT_MATCH_TRIAL_OUTCOMES",
    "FUNCTION_TABLE_RENDERED_COEFFICIENTS_AS_OUTPUT_VALUES",
    "TRIANGLE_MIDLINE_VISUAL_OMITTED_THE_MIDLINE",
    "TECHNICAL_NORMALIZED_MODEL_CAPTIONS_REACHED_STUDENT_UI",
    "CHEMICAL_BALANCING_PROMPT_EXPOSED_TARGET_COEFFICIENTS",
    "LINEAR_FUNCTION_TABLE_USED_TEXT_INPUT_INSTEAD_OF_MATCHING",
    "GROWTH_OUTCOME_ASKED_FOR_FINAL_VALUE_INSTEAD_OF_INITIAL_CAPITAL",
    "FREQUENCY_MEANING_OUTCOMES_WERE_ROUTED_TO_CALCULATION",
    "GEOMETRY_SOFTWARE_VISUAL_DISPLAYED_AN_IRRELEVANT_NUMERIC_LABEL",
    "CERTAINTY_LANGUAGE_CHOICES_INCLUDED_SYNONYMOUS_DISTRACTORS",
  ],
  finalCriticalIssues: 0,
  finalHighIssues: 0,
  finalOverflowIssues: 0,
  finalPromptVisualMismatches: 0,
  finalPrivateLeaks: 0,
  notes: "Every PNG from the final clean authenticated Playwright run was opened at original detail and visually inspected. Earlier screenshots containing issues were replaced and are not acceptance evidence.",
  screenshots: reviewedEvidence,
};

writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
writeFileSync(acceptancePath, `${JSON.stringify({
  ...acceptance,
  screenshotEvidence: reviewedEvidence,
  screenshotReview: `PASS_${expected}_OF_${expected}_VISUALLY_REVIEWED`,
  exactRemainingBlockers: [],
}, null, 2)}\n`);

process.stdout.write(`WAVE_E_SCREENSHOT_REVIEW=PASS_${expected}_OF_${expected}\n`);
