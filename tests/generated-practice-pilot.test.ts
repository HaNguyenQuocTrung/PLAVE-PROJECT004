import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import inventoryJson from "../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with { type: "json" };
import {
  evaluateGeneratedPracticePilotEligibility,
  getGeneratedPracticePilotConfiguration,
  parseGeneratedPracticePilotAllowlist,
} from "../lib/curriculum/generated-practice-pilot.ts";
import {
  deriveSemanticPilotAttemptSeed,
  generateSemanticPilotAttemptSnapshot,
} from "../lib/curriculum/semantic-pilot-generation.ts";
import { buildOutcomeSemanticContract } from "../lib/generation-semantic/variant-engine.ts";
import { validateRemoteGeneratedShadowCoverage } from "../lib/generation-semantic/remote-shadow.ts";
import { configureProject004GeneratedPilotUser } from "../scripts/configure-project004-generated-pilot-user.ts";
import {
  buildGeneratedPilotChildEnvironment,
  parseGeneratedPilotEnvironmentFile,
  project004GeneratedPilotRuntimeContract,
} from "../scripts/project004-generated-pilot-runtime.ts";
import {
  createProject004RemoteRuntimeConfig,
  serializeProject004RemoteRuntimeConfig,
} from "../scripts/project004-remote-runtime-connection.ts";
import {
  buildGeneratedPilotSigningSecretSql,
  waitForGeneratedPilotHealth,
} from "../scripts/start-project004-generated-pilot.ts";

const repositoryRoot = resolve(import.meta.dirname, "..");
const studentId = "11111111-1111-4111-8111-111111111111";
const otherStudentId = "22222222-2222-4222-8222-222222222222";
const runtimeEnvironment = {
  PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "true",
  PLAVE_GENERATED_PRACTICE_MODE: "PILOT_LIVE",
  PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS: studentId,
  PLAVE_GENERATED_PRACTICE_BIND_HOST: "127.0.0.1",
  PLAVE_PROJECT004_REMOTE_TARGET_NAME: "plave-project004-dev-clean",
  PLAVE_GENERATED_PRACTICE_PILOT_OWNER_STARTED: "true",
  PLAVE_GENERATED_PRACTICE_PILOT_SESSION: "a".repeat(64),
} as const;

type InventoryOutcome = {
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
  mappedUnitIds: string[];
};

const outcomes = (inventoryJson as { outcomes: InventoryOutcome[] }).outcomes;

function createFakeCanonicalWorkspace() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "project004-generated-pilot-"));
  const root = join(temporaryRoot, "PLAVE-PROJECT004");
  mkdirSync(join(root, "supabase"), { recursive: true });
  writeFileSync(join(root, "package.json"), '{"name":"plave-project004"}\n');
  writeFileSync(join(root, "supabase/config.toml"), 'project_id = "PLAVE-PROJECT004"\n');
  writeFileSync(join(root, "next.config.ts"), 'const cache = ".next-owner-local-project004";\n');
  const config = createProject004RemoteRuntimeConfig({
    projectRef: "abcdefghijklmnopqrst",
    publicUrl: "https://abcdefghijklmnopqrst.supabase.co",
    publishableKey: `sb_publishable_${"x".repeat(24)}`,
  });
  const envPath = join(root, ".env.remote-dev.local");
  writeFileSync(envPath, serializeProject004RemoteRuntimeConfig(config), { mode: 0o600 });
  chmodSync(envPath, 0o600);
  return { temporaryRoot, root };
}

test("generated-practice pilot allowlist is UUID-only, deduplicated, and malformed input denies everyone", () => {
  assert.deepEqual(
    { ...parseGeneratedPracticePilotAllowlist(undefined), userIds: [] },
    { valid: true, count: 0, userIds: [] },
  );
  const deduplicated = parseGeneratedPracticePilotAllowlist(`${studentId}, ${studentId.toUpperCase()}`);
  assert.equal(deduplicated.valid, true);
  assert.equal(deduplicated.count, 1);
  for (const malformed of ["not-a-uuid", `${studentId},`, `${studentId};${otherStudentId}`]) {
    const parsed = parseGeneratedPracticePilotAllowlist(malformed);
    assert.equal(parsed.valid, false);
    assert.equal(parsed.count, 0);
  }
});

test("PILOT_LIVE requires every server-side guard and exactly one eligible Student", () => {
  const configuration = getGeneratedPracticePilotConfiguration(runtimeEnvironment);
  assert.equal(configuration.enabled, true);
  assert.equal(configuration.allowlistCount, 1);
  assert.equal(evaluateGeneratedPracticePilotEligibility({
    configuration,
    userId: studentId,
    role: "STUDENT",
    schoolGrade: 2,
  }).eligible, true);
  for (const denied of [
    { userId: otherStudentId, role: "STUDENT", schoolGrade: 2 },
    { userId: studentId, role: "PARENT", schoolGrade: 2 },
    { userId: studentId, role: "TEACHER", schoolGrade: 2 },
    { userId: studentId, role: "STUDENT", schoolGrade: 0 },
    { userId: studentId, role: "STUDENT", schoolGrade: 10 },
  ]) {
    assert.equal(evaluateGeneratedPracticePilotEligibility({ configuration, ...denied }).eligible, false);
  }
  for (const override of [
    { PLAVE_GENERATED_PRACTICE_MODE: "OFF" },
    { PLAVE_GENERATED_PRACTICE_MODE: "SHADOW" },
    { PLAVE_GENERATED_PRACTICE_MODE: "LOCAL_LIVE" },
    { PLAVE_GENERATED_PRACTICE_BIND_HOST: "0.0.0.0" },
    { PLAVE_PROJECT004_REMOTE_TARGET_NAME: "plave-project004-dev" },
    { PLAVE_GENERATED_PRACTICE_PILOT_OWNER_STARTED: "false" },
    { PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS: `${studentId},${otherStudentId}` },
  ]) {
    assert.equal(getGeneratedPracticePilotConfiguration({ ...runtimeEnvironment, ...override }).enabled, false);
  }
});

test("secure local configuration writes one identity to a gitignored mode-0600 file without printing it", () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    const output = configureProject004GeneratedPilotUser({
      candidateRoot: root,
      prompt: () => ({ ok: true, value: studentId }),
    });
    const destination = join(root, project004GeneratedPilotRuntimeContract.allowlistFile);
    assert.equal(statSync(destination).mode & 0o777, 0o600);
    assert.equal(parseGeneratedPilotEnvironmentFile(readFileSync(destination, "utf8")).count, 1);
    assert.doesNotMatch(output, new RegExp(studentId, "u"));
    assert.match(output, /GENERATED_PILOT_ALLOWLIST_COUNT=1/u);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("pilot child environment is isolated from normal remote runtime and adaptive Grade 2 pilot", () => {
  const { temporaryRoot, root } = createFakeCanonicalWorkspace();
  try {
    const child = buildGeneratedPilotChildEnvironment({
      candidateRoot: root,
      allowlist: studentId,
      signingKey: "b".repeat(64),
      session: "c".repeat(64),
      environment: {
        PATH: process.env.PATH,
        PLAVE_ADAPTIVE_PILOT_USER_IDS: otherStudentId,
        SUPABASE_SERVICE_ROLE_KEY: "must-not-pass",
      },
    });
    assert.equal(child.PLAVE_GENERATED_PRACTICE_MODE, "PILOT_LIVE");
    assert.equal(child.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED, "true");
    assert.equal(child.PLAVE_PROJECT004_GENERATED_PILOT_RUNTIME, "true");
    assert.equal(child.PLAVE_GENERATED_PRACTICE_BIND_HOST, "127.0.0.1");
    assert.equal(child.PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS, studentId);
    assert.equal(child.PLAVE_ADAPTIVE_PILOT_USER_IDS, "");
    assert.equal(child.PLAVE_CONTROLLED_PILOT_ENABLED, "false");
    assert.equal(child.SUPABASE_SERVICE_ROLE_KEY, "");
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("server-derived seeds are deterministic and all 546 outcomes can produce immutable 8/8 provenance snapshots", () => {
  const seed = deriveSemanticPilotAttemptSeed({
    studentId,
    idempotencyKey: otherStudentId,
    signingKey: "d".repeat(64),
  });
  assert.equal(seed, deriveSemanticPilotAttemptSeed({
    studentId,
    idempotencyKey: otherStudentId,
    signingKey: "d".repeat(64),
  }));
  assert.doesNotMatch(seed, new RegExp(studentId, "u"));
  let generated = 0;
  const variants = new Set<string>();
  for (const outcome of outcomes) {
    const contract = buildOutcomeSemanticContract({
      id: outcome.id,
      grade: outcome.grade,
      strand: outcome.officialStrand,
      subdomain: outcome.subdomain ?? "",
      description: outcome.conciseParaphrase,
    });
    let snapshot: ReturnType<typeof generateSemanticPilotAttemptSnapshot> | null = null;
    for (const unitId of outcome.mappedUnitIds) {
      try {
        snapshot = generateSemanticPilotAttemptSnapshot({
          grade: outcome.grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
          unitId,
          outcomeId: outcome.id,
          attemptSeed: seed,
          baseDifficulty: "MEDIUM",
          selectionReason: "NO_EVIDENCE",
        });
        break;
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("MAPPING_INVALID")) throw error;
      }
    }
    assert.ok(snapshot, outcome.id);
    assert.equal(snapshot.questions.length, 12);
    assert.equal(snapshot.solutions.length, 12);
    assert.equal(new Set(snapshot.questions.map((question) => question.questionId)).size, 12);
    for (const question of snapshot.questions) {
      assert.equal(Object.keys(question.provenance).length, 8);
      assert.match(question.provenance.solverReceiptHash, /^[0-9a-f]{64}$/u);
      assert.match(question.provenance.astHash, /^[0-9a-f]{64}$/u);
      assert.match(question.provenance.visualHash, /^[0-9a-f]{64}$/u);
    }
    variants.add(contract.expectedVariant);
    generated += 1;
  }
  assert.equal(generated, 546);
  assert.ok(variants.size >= 50);
  const shadow = validateRemoteGeneratedShadowCoverage(outcomes);
  assert.equal(shadow.variants, 59);
  assert.equal(shadow.privateSolutionLeaks, 0);
  assert.equal(shadow.fallbackCount, 0);
});

test("ephemeral signing-secret SQL is exact, transactional, and never alters release/runtime/pilot state", () => {
  const install = buildGeneratedPilotSigningSecretSql({ action: "INSTALL", signingKey: "e".repeat(64) });
  const remove = buildGeneratedPilotSigningSecretSql({ action: "REMOVE", signingKey: "e".repeat(64) });
  for (const sql of [install, remove]) {
    assert.match(sql, /begin;/iu);
    assert.match(sql, /commit;/iu);
    assert.match(sql, /pg_advisory_xact_lock/iu);
    assert.match(sql, /private\.curriculum_generation_runtime_secret/iu);
    assert.doesNotMatch(sql, /update\s+public\.curriculum_releases|adaptive_curriculum|insert\s+into\s+public\.curriculum_attempts/iu);
  }
  assert.match(install, /count\(\*\)[\s\S]*<> 0/iu);
  assert.match(remove, /where singleton and signing_key_hex/iu);
});

test("launcher waits for the exact loopback pilot health payload and treats cold compilation as pending", async () => {
  let calls = 0;
  await waitForGeneratedPilotHealth({
    timeoutMs: 10,
    now: (() => { let time = 0; return () => ++time; })(),
    delay: async () => {},
    fetcher: async () => {
      calls += 1;
      if (calls === 1) return new Response(null, { status: 404 });
      return Response.json({
        status: "OK",
        version: "project004-generated-pilot-health-v1",
        mode: "PILOT_LIVE",
        loopbackOnly: true,
        targetValid: true,
        allowlistValid: true,
        allowlistCount: 1,
        adaptivePilotDisabled: true,
      });
    },
  });
  assert.equal(calls, 2);
});

test("actual routes hide the CTA from ineligible roles and APIs enforce server eligibility", () => {
  const sources = [
    "app/dashboard/page.tsx",
    "app/lessons/page.tsx",
    "app/learn/page.tsx",
    "app/api/on-demand-curriculum/answer/route.ts",
    "lib/curriculum/on-demand-runtime.ts",
    "lib/curriculum/generated-practice-pilot-diagnostics.ts",
  ].map((path) => readFileSync(resolve(repositoryRoot, path), "utf8"));
  assert.match(sources[0] ?? "", /generatedPilotEligible[\s\S]*GeneratedPracticePilotCard/u);
  assert.match(sources[1] ?? "", /generatedPilotEligible[\s\S]*GeneratedPracticePilotCard/u);
  for (const source of sources.slice(2, 5)) {
    assert.match(source, /GeneratedPracticePilotEligibility|generatedPilotEligible/u);
  }
  const serialized = sources.join("\n");
  assert.doesNotMatch(serialized, /NEXT_PUBLIC_PLAVE_GENERATED|PLAVE_ADAPTIVE_PILOT_USER_IDS.*GENERATED/u);
  assert.match(serialized, /allowlistCount/u);
  assert.doesNotMatch(sources.at(-1) ?? "", /userId|email|token|seed|solution/iu);
});

test("Node 22 executable smoke starts the exact launcher without remote access", () => {
  const result = spawnSync(
    process.execPath,
    ["--no-warnings", "--experimental-strip-types", "scripts/start-project004-generated-pilot.ts", "--smoke"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GENERATED_PILOT_START_EXECUTABLE=PASS/u);
  assert.match(result.stdout, /REMOTE_ACCESS_PERFORMED=NO/u);
  assert.match(result.stdout, /REMOTE_MUTATION_PERFORMED=NO/u);
});
