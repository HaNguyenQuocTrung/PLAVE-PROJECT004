import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("README reports the current build metrics and honest release state", () => {
  const readme = readFileSync("README.md", "utf8");
  assert.match(readme, /76 static pages/u);
  assert.match(readme, /115 application routes/u);
  assert.match(readme, /Grade 1 fixed-runtime/u);
  assert.match(readme, /Grades 2–9 verified curriculum packages held as `DRAFT\/HIDDEN` and inactive/u);
  assert.match(readme, /ordinary users cannot access those hidden candidates/u);
  assert.doesNotMatch(readme, /77\/77 routes/u);
  assert.doesNotMatch(readme, /Sprint 11B acceptance is incomplete/u);
});

test("historical submission JSON is explicit about supersession and points to canonical final inventory", () => {
  const path = "docs/operations/FINAL_SUBMISSION_STATUS.json";
  const historical = JSON.parse(readFileSync(path, "utf8")) as {
    recordStatus: string;
    supersededBy: string;
    supersessionNotice: string;
    totalUnits: number;
    totalQuestions: number;
    canonicalFinalInventory: Record<string, number>;
  };
  assert.equal(historical.recordStatus, "ARCHIVED_NON_OPERATIONAL");
  assert.match(historical.supersessionNotice, /historical only/u);
  assert.equal(historical.totalUnits, 171);
  assert.equal(historical.totalQuestions, 2052);
  assert.equal(existsSync(historical.supersededBy), true);
  const canonical = JSON.parse(readFileSync(historical.supersededBy, "utf8")) as { totals: Record<string, number> };
  assert.deepEqual(historical.canonicalFinalInventory, {
    questions: canonical.totals.questions,
    skills: canonical.totals.skills,
    units: canonical.totals.units,
    publishedCandidates: canonical.totals.publishedCandidates,
    activeCandidates: canonical.totals.activeCandidates,
    defaultEntitlementCount: canonical.totals.defaultEntitlementCount,
  });
});

test("final handoff document agrees with the canonical inventory and keeps candidates hidden", () => {
  const completion = readFileSync("docs/final/PLAVE_FYP_COMPLETION.md", "utf8");
  assert.match(completion, /2,772 questions/u);
  assert.match(completion, /338 question-bearing skills/u);
  assert.match(completion, /176 units/u);
  assert.match(completion, /DRAFT\/HIDDEN/u);
  assert.match(completion, /zero default entitlement/u);
});
