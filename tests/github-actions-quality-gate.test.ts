import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { CORE_SCHEMA, load } = require("js-yaml") as {
  CORE_SCHEMA: unknown;
  load: (source: string, options: { schema: unknown }) => unknown;
};

const path = ".github/workflows/plave-quality-gate.yml";
const source = readFileSync(path, "utf8");
const workflow = load(source, { schema: CORE_SCHEMA }) as {
  name: string;
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: Record<string, {
    "runs-on": string;
    "timeout-minutes": number;
    steps: Array<{ name?: string; uses?: string; run?: string; with?: Record<string, unknown> }>;
  }>;
};

test("workflow syntax and trigger contract are exact", () => {
  assert.equal(workflow.name, "PLAVE Grades 1-9 Quality Gate");
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push", "workflow_dispatch"]);
  assert.deepEqual(workflow.on.push, { branches: ["fix/fyp-product-truth"] });
  assert.deepEqual(workflow.on.pull_request, { branches: ["main"] });
  assert.deepEqual(workflow.on.workflow_dispatch, {});
});

test("workflow is read-only, GitHub-hosted, bounded, and concurrency-safe", () => {
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.concurrency["cancel-in-progress"], true);
  assert.match(workflow.concurrency.group, /github[.]workflow/u);
  assert.match(workflow.concurrency.group, /github[.]ref/u);
  const job = workflow.jobs["quality-gate"];
  assert.ok(job);
  assert.equal(job["runs-on"], "ubuntu-latest");
  assert.equal(job["timeout-minutes"], 60);
  const checkout = job.steps.find((step) => step.uses === "actions/checkout@v4");
  assert.deepEqual(checkout?.with, { "fetch-depth": 1, "persist-credentials": false });
  assert.ok(job.steps.some((step) => step.uses === "actions/setup-node@v4"));
});

test("workflow reuses every canonical quality command", () => {
  for (const command of [
    "npm ci --ignore-scripts --no-audit --no-fund",
    "npm run --silent audit:offline-invocation",
    "npm run --silent typecheck",
    "tsconfig.secret-boundary.json",
    "npm run --silent lint",
    "npm run --silent security:secret-boundary",
    "tests/remote-rls-drift-remediation.test.mjs",
    "npm run --silent test:full:official",
    "npm run --silent build:production-local",
    "npm run --silent test:final-local-acceptance",
    "git diff --check",
  ]) assert.match(source, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), command);
});

test("workflow contains no unsafe trigger, permission, secret, deployment, or fallback", () => {
  for (const forbidden of [
    /pull_request_target/u,
    /permissions:[\s\S]*\bwrite\b/u,
    /secrets[.]/u,
    /continue-on-error/u,
    /[|][|]\s*true/u,
    /\bnpx\b/u,
    /\bnpm\s+audit\b/u,
    /\bdeploy\b/iu,
    /\bsupabase\s+(?:link|db\s+push)\b/iu,
    /\bpsql\b/u,
    /\.env[.]local/u,
    /\b3000\b/u,
  ]) assert.doesNotMatch(source, forbidden);
});

test("synthetic build values stay local-only and release defaults stay hidden", () => {
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL: http:\/\/127[.]0[.]0[.]1:54321/u);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: plave_ci_test_only_publishable_key/u);
  assert.match(source, /PLAVE_GRADES_2_9_RELEASE_MODE: HIDDEN/u);
  assert.match(source, /PLAVE_CURRICULUM_RUNTIME_ENABLED: "false"/u);
  assert.doesNotMatch(source, /PLAVE_GRADES_2_9_RELEASE_MODE:\s*PUBLIC/u);
});
