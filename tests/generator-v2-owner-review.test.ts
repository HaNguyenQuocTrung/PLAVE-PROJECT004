import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { recordOwnerReviewDecision } from "../lib/generation-v2/owner-review-result-server.ts";
import {
  buildGeneratorV2OwnerReviewChildEnvironment,
  GeneratorV2OwnerReviewRuntimeFailure,
  startGeneratorV2OwnerReview,
  validateGeneratorV2OwnerReviewManifest,
} from "../scripts/start-generator-v2-owner-review.ts";
import {
  createProject004RemoteRuntimeConfig,
  writeProject004RemoteRuntimeConfigFile,
} from "../scripts/project004-remote-runtime-connection.ts";

const workspaceRoot = resolve(import.meta.dirname, "..");

function createDecisionWorkspace() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "generator-owner-review-"));
  const root = join(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(join(root, "supabase"), { recursive: true });
  mkdirSync(join(root, "artifacts/generator-v2-owner-review"), { recursive: true });
  mkdirSync(join(root, "docs/status"), { recursive: true });
  writeFileSync(join(root, "package.json"), '{"name":"plave-project004"}\n');
  writeFileSync(join(root, "supabase/config.toml"), 'project_id = "PLAVE-PROJECT004"\n');
  writeFileSync(join(root, "next.config.ts"), 'const cache = ".next-owner-local-project004";\n');
  writeProject004RemoteRuntimeConfigFile(createProject004RemoteRuntimeConfig({
    projectRef: "abcdefghijklmnopqrst",
    publicUrl: "https://abcdefghijklmnopqrst.supabase.co",
    publishableKey: `sb_publishable_${"x".repeat(24)}`,
  }), root);
  copyFileSync(
    join(workspaceRoot, "artifacts/generator-v2-owner-review/manifest.json"),
    join(root, "artifacts/generator-v2-owner-review/manifest.json"),
  );
  // The repository artifact is a finalized immutable Owner record. Decision
  // workflow tests use an explicit derived, unfinalized fixture instead of
  // rewriting or pretending the canonical record is editable.
  const derivedManifestPath = join(root, "artifacts/generator-v2-owner-review/manifest.json");
  const derivedManifest = JSON.parse(readFileSync(derivedManifestPath, "utf8"));
  derivedManifest.ownerDecision = null;
  derivedManifest.ownerNotes = null;
  writeFileSync(derivedManifestPath, `${JSON.stringify(derivedManifest, null, 2)}\n`);
  copyFileSync(
    join(workspaceRoot, "docs/status/SPRINT_8C_GENERATOR_V2_FULL_COVERAGE.md"),
    join(root, "docs/status/SPRINT_8C_GENERATOR_V2_FULL_COVERAGE.md"),
  );
  copyFileSync(
    join(workspaceRoot, "docs/status/PLAVE_THREE_MILESTONE_ROADMAP.md"),
    join(root, "docs/status/PLAVE_THREE_MILESTONE_ROADMAP.md"),
  );
  return { temporaryRoot, root };
}

test("finalized Owner fixture remains an immutable 198-sample public-only record", () => {
  const manifest = JSON.parse(readFileSync(
    join(workspaceRoot, "artifacts/generator-v2-owner-review/manifest.json"),
    "utf8",
  ));
  assert.equal(manifest.sampleCount, 198);
  assert.equal(manifest.samples.length, 198);
  assert.equal(new Set(manifest.samples.map((sample: { capabilityId: string }) => sample.capabilityId)).size, 198);
  assert.equal(manifest.ownerDecision, "APPROVED");
  assert.equal(manifest.samples.every((sample: { publicSnapshot: { publicData: unknown } }) =>
    Object.keys(sample.publicSnapshot.publicData as object).length === 0), true);
});

test("derived unfinalized fixture satisfies the optional Owner-review launcher contract", () => {
  const { temporaryRoot, root } = createDecisionWorkspace();
  try {
    assert.deepEqual(validateGeneratorV2OwnerReviewManifest(root), { samples: 198, capabilities: 198, grades: 9, domains: 5, difficulties: 3, interactions: 10 });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("launcher forwards only validated public auth config and the child-only review flag", () => {
  const { temporaryRoot, root } = createDecisionWorkspace();
  try {
    const child = buildGeneratorV2OwnerReviewChildEnvironment(root, {
      PATH: "/safe/path",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-pass",
      DATABASE_URL: "must-not-pass",
      GOOGLE_API_KEY: "must-not-pass",
      PLAVE_GENERATOR_V2_OWNER_REVIEW: "false",
    });
    assert.equal(child.PLAVE_GENERATOR_V2_OWNER_REVIEW, "true");
    assert.equal(child.NEXT_PUBLIC_SUPABASE_URL, "https://abcdefghijklmnopqrst.supabase.co");
    assert.equal(child.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"), true);
    assert.equal(child.SUPABASE_SERVICE_ROLE_KEY, "");
    assert.equal(child.DATABASE_URL, "");
    assert.equal(child.GOOGLE_API_KEY, "");
    assert.equal(child.PLAVE_AI_TUTOR_ENABLED, "false");
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("occupied review port reports PID/command metadata and never spawns or kills it", async () => {
  const { temporaryRoot, root } = createDecisionWorkspace();
  const listener = { pid: 76543, command: "unrelated-local-server", endpoint: "127.0.0.1:3033" };
  let spawned = false;
  try {
    await assert.rejects(
      startGeneratorV2OwnerReview({
        candidateRoot: root,
        inspectPort: () => [listener],
        spawnChild: (() => {
          spawned = true;
          throw new Error("MUST_NOT_SPAWN");
        }) as never,
      }),
      (error: unknown) => {
        assert.ok(error instanceof GeneratorV2OwnerReviewRuntimeFailure);
        assert.equal(error.code, "GENERATOR_V2_OWNER_REVIEW_PORT_OCCUPIED");
        assert.deepEqual(error.listeners, [listener]);
        return true;
      },
    );
    assert.equal(spawned, false);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("final decision fails closed below 198 reviews", () => {
  const { temporaryRoot, root } = createDecisionWorkspace();
  try {
    assert.throws(
      () => recordOwnerReviewDecision({
        overallDecision: "APPROVE",
        overallNote: "",
        decisions: {},
      }, root),
      /OWNER_REVIEW_198_OF_198_REQUIRED/u,
    );
    const manifest = JSON.parse(readFileSync(
      join(root, "artifacts/generator-v2-owner-review/manifest.json"),
      "utf8",
    ));
    assert.equal(manifest.ownerDecision, null);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("an explicit 198/198 decision writes public result, manifest and milestone docs", () => {
  const { temporaryRoot, root } = createDecisionWorkspace();
  try {
    const manifestPath = join(root, "artifacts/generator-v2-owner-review/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const decisions = Object.fromEntries(manifest.samples.map((sample: { sampleId: string }, index: number) => [
      sample.sampleId,
      { decision: index === 0 ? "NEEDS_REVISION" : "APPROVE", note: index === 0 ? "Review lại wording." : "" },
    ]));
    const result = recordOwnerReviewDecision({
      overallDecision: "NEEDS_REVISION",
      overallNote: "Một capability cần chỉnh.",
      decisions,
    }, root);
    assert.equal(result.reviewed, 198);
    assert.equal(result.approved, 197);
    assert.equal(result.needsRevision, 1);
    assert.equal(result.unreviewed, 0);
    assert.equal(result.privateSolutionIncluded, false);
    const updated = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(updated.ownerDecision, "NEEDS_REVISION");
    const publicResult = readFileSync(
      join(root, "artifacts/generator-v2-owner-review/result.json"),
      "utf8",
    );
    assert.doesNotMatch(publicResult, /publicSnapshot|correctResponse|"privateSolution"\s*:|solverReceipt/u);
    for (const statusFile of ["SPRINT_8C_GENERATOR_V2_FULL_COVERAGE.md", "PLAVE_THREE_MILESTONE_ROADMAP.md"]) {
      const status = readFileSync(join(root, "docs/status", statusFile), "utf8");
      assert.equal((status.match(/GENERATOR_V2_OWNER_REVIEW_DECISION_START/gu) ?? []).length, 1);
      assert.match(status, /- Decision: `NEEDS_REVISION`[.]/u);
      assert.match(status, /Reviewed: 198\/198; approved: 197; rejected: 0; needs revision: 1; unreviewed: 0[.]/u);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
