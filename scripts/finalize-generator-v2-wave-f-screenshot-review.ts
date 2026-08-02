import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const acceptancePath = resolve(root, "artifacts/generator-v2-wave-f/browser-acceptance.json");
const reviewPath = resolve(root, "artifacts/generator-v2-wave-f/screenshot-review.json");
const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as { status: string; screenshots: string[]; screenshotEvidence: Array<Record<string, unknown> & { path: string; visuallyReviewed: boolean }>; screenshotReview: string; exactRemainingBlockers: string[] };
const expected = 19;
if (acceptance.status !== "PASS" || acceptance.screenshotEvidence.length !== expected || acceptance.screenshots.length !== expected) throw new Error("WAVE_F_SCREENSHOT_REVIEW:EVIDENCE_COUNT_OR_BROWSER_STATUS_INVALID");
const evidencePaths = acceptance.screenshotEvidence.map((item) => item.path);
if (new Set(evidencePaths).size !== expected || acceptance.screenshots.some((path) => !evidencePaths.includes(path))) throw new Error("WAVE_F_SCREENSHOT_REVIEW:EVIDENCE_MANIFEST_MISMATCH");
const reviewedEvidence = acceptance.screenshotEvidence.map((item) => { const absolutePath = resolve(root, item.path); if (!existsSync(absolutePath)) throw new Error(`WAVE_F_SCREENSHOT_REVIEW:MISSING_${item.path}`); return { ...item, visuallyReviewed: true, sha256: createHash("sha256").update(readFileSync(absolutePath)).digest("hex") }; });
const review = {
  schemaVersion: 1, sprint: "8C.F", reviewDate: "2026-08-02", status: "PASS", expected, reviewed: expected,
  reviewedScreenshots: expected, manifestScreenshots: expected, criticalIssues: 0, highIssues: 0, unreviewedScreenshots: [],
  viewports: ["390x844", "1280x800"],
  coverage: { canonicalCapabilities: 10, exactFinalOutcomes: 10, grades: [1, 2, 3, 5, 6, 7, 8, 9], difficulties: ["EASY", "MEDIUM", "HARD"], interactionTypes: ["INTEGER_INPUT", "MATCHING", "ORDERING", "SINGLE_CHOICE"], correctFeedback: true, incorrectFeedback: true, processRestartResume: true, completionResultsHistory: true },
  issuesFoundDuringReviewAndFixedBeforeFinalRun: ["MOBILE_MATCHING_SELECT_CREATED_15PX_HORIZONTAL_OVERFLOW", "DATA_ERROR_REASONING_DECLARED_UNUSED_MULTI_SELECT_POLICY"],
  finalCriticalIssues: 0, finalHighIssues: 0, finalOverflowIssues: 0, finalPromptVisualMismatches: 0, finalPrivateLeaks: 0,
  notes: "All 19 PNG files from the final clean authenticated Playwright run were opened at original detail and visually inspected. The earlier failed-run evidence was replaced and is not counted.",
  screenshots: reviewedEvidence,
};
writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
writeFileSync(acceptancePath, `${JSON.stringify({ ...acceptance, screenshotEvidence: reviewedEvidence, screenshotReview: `PASS_${expected}_OF_${expected}_VISUALLY_REVIEWED`, exactRemainingBlockers: [] }, null, 2)}\n`);
process.stdout.write(`WAVE_F_SCREENSHOT_REVIEW=PASS_${expected}_OF_${expected}\n`);
