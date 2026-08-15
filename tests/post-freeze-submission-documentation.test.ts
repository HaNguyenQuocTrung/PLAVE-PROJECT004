import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";

const readmePath = resolve("README.md");
const readme = () => readFileSync(readmePath, "utf8");

test("README is a complete product-truth handoff rather than a stale metric snapshot", () => {
  const source = readme();
  for (const heading of [
    "Current product truth",
    "Users and product surfaces",
    "Core learning behavior",
    "Architecture",
    "Repository structure",
    "Prerequisites",
    "Environment configuration",
    "Local setup",
    "Database and migrations",
    "Testing and quality",
    "Security and privacy",
    "Deployment status",
    "Known limitations",
    "Academic context",
    "License and contributions",
    "Evidence freshness",
  ]) assert.match(source, new RegExp(`^## ${heading}$`, "mu"), heading);

  assert.match(source, /Grade 1[\s\S]*fixed-practice runtime/u);
  assert.match(source, /Grades 2–9[\s\S]*remain `HIDDEN`/u);
  assert.match(source, /migration(?:s)? `0045`, `0046` and\s+`0047`/u);
  assert.match(source, /skill\/question-to-outcome mapping has not been proven/u);
  assert.match(source, /not evidence of learning effectiveness/u);
  assert.match(source, /Locally demonstrated and configured, not deployed/u);
  assert.match(source, /No `LICENSE` file is currently included/u);
  assert.doesNotMatch(source, /curriculum-aligned lessons/u);
  assert.doesNotMatch(source, /production.ready|production-ready/iu);
  assert.doesNotMatch(source, /\b\d{2,},?\d*\/\d{2,},?\d*\b/u);
  assert.doesNotMatch(source, /\/Users\/|\/private\/tmp\//u);
});

test("README commands are backed by package scripts or tracked executables", () => {
  const source = readme();
  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const scriptCommands = [...source.matchAll(/^npm run (?:--silent )?([^\s`]+).*$/gmu)]
    .map((match) => match[1] ?? "");
  for (const command of scriptCommands) {
    assert.equal(Boolean(manifest.scripts[command]), true, `missing npm script: ${command}`);
  }
  assert.equal(existsSync("scripts/run-ci-quality-test-group.ts"), true);
  assert.equal(existsSync("tsconfig.secret-boundary.json"), true);
  assert.equal(existsSync(".env.example"), true);
});

test("README relative links resolve to tracked handoff resources", () => {
  const source = readme();
  const links = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)]
    .map((match) => match[1])
    .filter((target) => !/^(?:https?:|#)/u.test(target));
  for (const target of links) {
    const path = resolve(dirname(readmePath), target.split("#", 1)[0] ?? "");
    assert.equal(existsSync(path), true, `broken README link: ${target}`);
    assert.equal(statSync(path).isFile() || statSync(path).isDirectory(), true);
  }
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
  const canonical = JSON.parse(readFileSync(historical.supersededBy, "utf8")) as {
    inventory: { allGrades: Record<string, number> };
  };
  assert.deepEqual(historical.canonicalFinalInventory, {
    questions: canonical.inventory.allGrades.questions,
    skills: canonical.inventory.allGrades.skills,
    units: canonical.inventory.allGrades.units,
    publishedCandidates: 0,
    activeCandidates: 0,
    defaultEntitlementCount: 0,
  });
});

test("final handoff keeps local acceptance separate from hidden remote activation", () => {
  const completion = readFileSync("docs/final/PLAVE_FYP_COMPLETION.md", "utf8");
  const readiness = readFileSync("docs/final/PLAVE_RELEASE_READINESS.md", "utf8");
  assert.match(completion, /Repository default remains `HIDDEN`/u);
  assert.match(completion, /Default entitlement count remains zero/u);
  assert.match(readiness, /Remote migrations 0045–0047/u);
  assert.match(readiness, /HIDDEN_NOT_ACTIVATED/u);
  assert.match(readiness, /NOT_YET_EXECUTED/u);
});
