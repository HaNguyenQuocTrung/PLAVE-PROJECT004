import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT,
  validateRemoteGeneratedShadowCoverage,
  type RemoteShadowOutcome,
} from "../lib/generation-semantic/remote-shadow.ts";
import type {
  Migration0041PreflightReport,
  Migration0041RemoteCounts,
} from "../scripts/project004-remote-migration-0041.ts";
import {
  executeRemoteGeneratedShadow,
  renderRemoteGeneratedShadow,
  runRemoteGeneratedShadowCommand,
} from "../scripts/run-project004-remote-generated-shadow.ts";

const repositoryRoot = resolve(import.meta.dirname, "..");
const outcomes = (
  JSON.parse(
    readFileSync(
      resolve(
        repositoryRoot,
        "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
      ),
      "utf8",
    ),
  ) as { outcomes: RemoteShadowOutcome[] }
).outcomes;

function counts(
  override: Partial<Migration0041RemoteCounts> = {},
): Migration0041RemoteCounts {
  return {
    migrationCount: 41,
    prefixMigrationCount: 40,
    migrationFirst: "0001",
    migrationLast: "0041",
    migration0041Count: 1,
    foreignMigrationCount: 0,
    migration0041ChecksumMatches: 0,
    migration0041SourceHashMatches: 1,
    missingMigrationCount: 0,
    duplicateMigrationCount: 0,
    tableCount: 1,
    provenanceFieldCount: 8,
    supportFieldCount: 2,
    provenanceConstraintCount: 3,
    provenanceTriggerCount: 3,
    provenanceFunctionCount: 4,
    oldStartAuthenticatedExecute: 0,
    semanticStartAuthenticatedExecute: 1,
    functionGrantLeakCount: 0,
    partialProvenanceRowCount: 0,
    generatedQuestionRows: 0,
    legacyQuestionRows: 0,
    pendingQuestionRows: 0,
    semanticQuestionRows: 0,
    attemptRows: 5,
    privateSolutionRows: 0,
    generatedAnswerRows: 0,
    materializedAnswerRows: 5,
    learningHistoryRows: 41,
    exactActiveReleaseCount: 1,
    otherReleaseCount: 0,
    releaseUnits: 171,
    releaseQuestions: 2052,
    releaseSolutions: 2052,
    releaseOutcomes: 546,
    legacyUnits: 14,
    legacyQuestions: 336,
    legacySolutions: 336,
    legacyDiagnosticRows: 24,
    adaptiveReleaseCount: 1,
    adaptiveExactDisabledCount: 1,
    adaptiveEnabledCount: 0,
    rlsGapCount: 0,
    privateGrantLeakCount: 0,
    primaryKeyContractCount: 1,
    ...override,
  };
}

function preflight(
  remoteCounts: Migration0041RemoteCounts = counts(),
): Migration0041PreflightReport {
  return {
    ok: true,
    project004Canonical: "PASS",
    remoteIdentityGuard: "PASS",
    endpointMode: "POOLER_SESSION",
    localPrefixChecksums: "PASS",
    localMigration0041Checksum: "PASS",
    prefixSchemaFingerprint: "NOT_APPLICABLE",
    remoteMigration0041Checksum: "UNAVAILABLE",
    remoteMigration0041SourceHash: "PASS",
    generatedRuntimeRemoteOff: "PASS",
    remotePhase: "ALREADY_APPLIED",
    migration0041Eligible: "NO",
    releaseContract: "PASS",
    grade1Boundary: "PASS",
    adaptivePilotDisabled: "PASS",
    rlsPrivateBoundary: "PASS",
    counts: remoteCounts,
    config: null,
    resolvedEndpoint: null,
    rootFailureCode: "ALREADY_APPLIED",
    currentRunMutationPerformed: "NO",
    remoteQuery: {
      sqlstate: "NONE",
      failureStage: "NONE",
      failedStatementClass: "NONE",
      preconditionId: "NONE",
      stderrClass: "NONE",
      connectionVerified: "PASS",
      readOnlyVerified: "PASS",
      missingRoutineClass: "NONE",
    },
    remoteMigrationChecksumCapability: "UNAVAILABLE",
  };
}

test("pure remote shadow coverage validates 546 outcomes, 59 variants, and 1638 samples without payload leakage", () => {
  const result = validateRemoteGeneratedShadowCoverage(outcomes);
  assert.equal(result.ok, true);
  assert.equal(result.grades, 9);
  assert.equal(result.outcomes, 546);
  assert.equal(result.variants, 59);
  assert.equal(result.variantProbeCount, 59);
  assert.equal(result.variantProbes.length, 59);
  assert.equal(
    new Set(result.variantProbes.map((receipt) => receipt.variantId)).size,
    59,
  );
  assert.equal(result.requested, 1_638);
  assert.equal(result.generated, 1_638);
  assert.equal(result.independentlySolved, 1_638);
  assert.equal(result.familyCorrect, 1_638);
  assert.equal(result.outcomeCorrect, 1_638);
  assert.equal(result.difficultyCorrect, 1_638);
  assert.equal(result.uniqueAnswerPolicyPass, 1_638);
  assert.equal(result.publicPrivateBoundaryPass, 1_638);
  assert.equal(result.provenanceComplete, 1_638);
  assert.equal(result.visualContractPass, 1_638);
  assert.equal(result.fallbackCount, 0);
  assert.equal(result.privateSolutionLeaks, 0);
  assert.equal(result.failures.length, 0);
  const serialized = JSON.stringify({
    samples: result.samples,
    variantProbes: result.variantProbes,
  });
  assert.doesNotMatch(
    serialized,
    /correctAnswer|correctIndex|normalizedInputs|derivedResult|rawSeed|prompt|solutionSteps/u,
  );
});

test("shadow execution performs two read-only preflights and proves remote counts unchanged", () => {
  let preflightCalls = 0;
  let artifactValue: unknown;
  const report = executeRemoteGeneratedShadow({
    environment: { NODE_ENV: "test" },
    outcomes,
    preflight: () => {
      preflightCalls += 1;
      return preflight();
    },
    writeArtifact: (_root, value) => {
      artifactValue = value;
      return ".local-artifacts/generated-shadow/test.json";
    },
  });
  assert.equal(report.ok, true);
  assert.equal(preflightCalls, 2);
  assert.equal(report.remoteShadowMutationPerformed, "NO");
  assert.equal(report.studentRuntimeChanged, "NO");
  assert.equal(report.generatedRuntimeRemoteAfter, "OFF");
  assert.equal(report.coverage?.generated, 1_638);
  assert.ok(artifactValue);
});

test("preexisting generated rows fail before shadow generation", () => {
  let coverageCalls = 0;
  let preflightCalls = 0;
  const report = executeRemoteGeneratedShadow({
    environment: { NODE_ENV: "test" },
    outcomes,
    preflight: () => {
      preflightCalls += 1;
      return preflight(counts({ generatedQuestionRows: 1 }));
    },
    coverage: (...args) => {
      coverageCalls += 1;
      return validateRemoteGeneratedShadowCoverage(...args);
    },
  });
  assert.equal(report.ok, false);
  assert.equal(report.rootFailureCode, "REMOTE_SHADOW_PRECONDITION_FAILED");
  assert.equal(preflightCalls, 1);
  assert.equal(coverageCalls, 0);
  assert.equal(report.remoteShadowMutationPerformed, "NO");
});

test("a changed post-shadow count fails closed and never claims no mutation", () => {
  const states = [preflight(), preflight(counts({ attemptRows: 6 }))];
  const report = executeRemoteGeneratedShadow({
    environment: { NODE_ENV: "test" },
    outcomes,
    preflight: () => states.shift() ?? preflight(),
    writeArtifact: () => {
      throw new Error("ARTIFACT_MUST_NOT_RUN");
    },
  });
  assert.equal(report.ok, false);
  assert.equal(
    report.rootFailureCode,
    "REMOTE_SHADOW_REMOTE_COUNTS_CHANGED",
  );
  assert.equal(report.remoteShadowMutationPerformed, "UNVERIFIED");
});

test("coverage exception still performs the read-only postflight", () => {
  let preflightCalls = 0;
  const report = executeRemoteGeneratedShadow({
    environment: { NODE_ENV: "test" },
    outcomes,
    preflight: () => {
      preflightCalls += 1;
      return preflight();
    },
    coverage: () => {
      throw new Error("GENERATOR_FAMILY_NOT_IMPLEMENTED");
    },
  });
  assert.equal(report.ok, false);
  assert.equal(preflightCalls, 2);
  assert.equal(
    report.rootFailureCode,
    "REMOTE_SHADOW_COVERAGE_EXECUTION_FAILED",
  );
  assert.equal(report.remoteShadowMutationPerformed, "NO");
});

test("local artifact is mode 0600 and contains hashes/counts but no identity, seed, prompt, or solution", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "project004-shadow-"));
  try {
    const report = executeRemoteGeneratedShadow({
      environment: { NODE_ENV: "test" },
      candidateRoot: temporaryRoot,
      outcomes,
      preflight: () => preflight(),
    });
    assert.equal(report.ok, true);
    const artifactPath = resolve(temporaryRoot, report.artifactPath);
    assert.equal(statSync(artifactPath).mode & 0o777, 0o600);
    const artifact = readFileSync(artifactPath, "utf8");
    assert.match(artifact, /"coverageHash"/u);
    assert.doesNotMatch(
      artifact,
      /email|userId|studentId|rawSeed|correctAnswer|correctIndex|prompt|solutionSteps|databasePassword|projectRef/u,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("secure command clears prompted secrets and renders only sanitized aggregate markers", () => {
  const values = [
    "abcdefghijklmnopqrst",
    "test-password-not-for-remote",
  ];
  const captured: { environment: NodeJS.ProcessEnv | null } = {
    environment: null,
  };
  const command = runRemoteGeneratedShadowCommand({
    environment: { NODE_ENV: "test" },
    prompt: () => ({ ok: true, value: values.shift() ?? "" }),
    execute: (options) => {
      captured.environment = options.environment;
      return {
        ...executeRemoteGeneratedShadow({
          ...options,
          outcomes,
          preflight: () => preflight(),
          writeArtifact: () => "shadow.json",
        }),
      };
    },
  });
  assert.equal(command.exitCode, 0);
  assert.equal(
    captured.environment?.PLAVE_PROJECT004_REMOTE_PROJECT_REF,
    "",
  );
  assert.equal(
    captured.environment?.PLAVE_PROJECT004_REMOTE_DB_PASSWORD,
    "",
  );
  assert.match(command.output, /^GRADES=9\/9$/mu);
  assert.match(
    command.output,
    /^REMOTE_SHADOW_MUTATION_PERFORMED=NO$/mu,
  );
  assert.doesNotMatch(
    command.output,
    /abcdefghijklmnopqrst|test-password-not-for-remote/u,
  );
});

test("Node 22 executable smoke validates the exact local shadow path without remote access", () => {
  const result = spawnSync(
    "npm",
    ["run", "--silent", "smoke:remote-dev-generated-shadow"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: process.env,
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    new RegExp(
      `SHADOW_SAMPLES=${REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT}/` +
        `${REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT}`,
      "u",
    ),
  );
  assert.match(result.stdout, /SHADOW_VARIANTS=59\/59/u);
  assert.match(result.stdout, /REMOTE_ACCESS_PERFORMED=NO/u);
  assert.match(
    result.stdout,
    /REMOTE_SHADOW_MUTATION_PERFORMED=NO/u,
  );
});

test("production shadow runner has no apply, runtime-start, or student mutation path", () => {
  const source = readFileSync(
    resolve(repositoryRoot, "scripts/run-project004-remote-generated-shadow.ts"),
    "utf8",
  );
  assert.match(source, /executeMigration0041RemotePreflight/u);
  assert.doesNotMatch(
    source,
    /executeMigration0041RemoteApply|remote-migration-0041-apply|universal-activate|runtime-start|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(/u,
  );
});

test("renderer exposes one safe failure only and no payload content", () => {
  const report = executeRemoteGeneratedShadow({
    environment: { NODE_ENV: "test" },
    outcomes,
    preflight: () => preflight(),
    coverage: () => ({
      ...validateRemoteGeneratedShadowCoverage(outcomes),
      ok: false,
      failures: [
        {
          outcomeId: "OUTCOME-001",
          variantId: "AREA",
          difficulty: "HARD",
          failureClass: "SHADOW_VISUAL_AST_MISMATCH",
        },
      ],
    }),
  });
  const output = renderRemoteGeneratedShadow(report);
  assert.match(output, /SHADOW_FAILURE_OUTCOME_ID=OUTCOME-001/u);
  assert.match(output, /SHADOW_FAILURE_VARIANT_ID=AREA/u);
  assert.match(
    output,
    /SHADOW_FAILURE_CLASS=SHADOW_VISUAL_AST_MISMATCH/u,
  );
  assert.doesNotMatch(output, /correctAnswer|prompt|solution/u);
});
