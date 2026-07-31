import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  parseGeneratedPracticeRuntimeConfiguration,
} from "../lib/curriculum/generated-practice-feature-flag.ts";
import {
  REMOTE_GENERATED_SHADOW_DURATION_LIMIT_MS,
  REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT,
  validateRemoteGeneratedShadowCoverage,
  type RemoteShadowCoverageResult,
  type RemoteShadowOutcome,
} from "../lib/generation-semantic/remote-shadow.ts";
import {
  executeMigration0041RemotePreflight,
  project004Migration0041Contract,
  type Migration0041PreflightReport,
  type Migration0041RemoteCounts,
} from "./project004-remote-migration-0041.ts";
import {
  promptProject004UniversalRemoteEnvironment,
} from "./run-project004-remote-universal-preflight.ts";
import type {
  SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

const shadowArtifactRelativePath =
  ".local-artifacts/generated-shadow/remote-shadow-latest.json";

type SecurePrompt = (label: string) => SecurePromptResult;

type SafeRemoteSnapshot = Readonly<{
  migrations: number;
  migrationFirst: string;
  migrationLast: string;
  provenanceFields: number;
  attemptRows: number;
  generatedQuestionRows: number;
  privateSolutionRows: number;
  generatedAnswerRows: number;
  learningHistoryRows: number;
  releaseUnits: number;
  releaseQuestions: number;
  releaseSolutions: number;
  releaseOutcomes: number;
}>;

export type RemoteGeneratedShadowReport = Readonly<{
  ok: boolean;
  project004Canonical: string;
  remoteIdentityGuard: string;
  endpointMode: string;
  migrationsApplied: string;
  provenanceFields: string;
  releaseContract: string;
  grade1Boundary: string;
  adaptivePilotDisabled: string;
  rlsPrivateBoundary: string;
  before: SafeRemoteSnapshot | null;
  after: SafeRemoteSnapshot | null;
  coverage: RemoteShadowCoverageResult | null;
  artifactPath: string;
  remoteShadowMutationPerformed: "NO" | "UNVERIFIED";
  studentRuntimeChanged: "NO" | "UNVERIFIED";
  generatedRuntimeRemoteAfter: "OFF" | "NOT_RUN" | "UNVERIFIED";
  rootFailureCode: string;
}>;

function emptyReport(rootFailureCode: string): RemoteGeneratedShadowReport {
  return {
    ok: false,
    project004Canonical: "NOT_RUN",
    remoteIdentityGuard: "NOT_RUN",
    endpointMode: "NOT_RUN",
    migrationsApplied: "NOT_RUN",
    provenanceFields: "NOT_RUN",
    releaseContract: "NOT_RUN",
    grade1Boundary: "NOT_RUN",
    adaptivePilotDisabled: "NOT_RUN",
    rlsPrivateBoundary: "NOT_RUN",
    before: null,
    after: null,
    coverage: null,
    artifactPath: "NOT_RUN",
    remoteShadowMutationPerformed: "NO",
    studentRuntimeChanged: "NO",
    generatedRuntimeRemoteAfter: "NOT_RUN",
    rootFailureCode,
  };
}

function safeSnapshot(counts: Migration0041RemoteCounts): SafeRemoteSnapshot {
  return {
    migrations: counts.migrationCount,
    migrationFirst: counts.migrationFirst,
    migrationLast: counts.migrationLast,
    provenanceFields: counts.provenanceFieldCount,
    attemptRows: counts.attemptRows,
    generatedQuestionRows: counts.generatedQuestionRows,
    privateSolutionRows: counts.privateSolutionRows,
    generatedAnswerRows: counts.generatedAnswerRows,
    learningHistoryRows: counts.learningHistoryRows,
    releaseUnits: counts.releaseUnits,
    releaseQuestions: counts.releaseQuestions,
    releaseSolutions: counts.releaseSolutions,
    releaseOutcomes: counts.releaseOutcomes,
  };
}

function validRemoteShadowBoundary(report: Migration0041PreflightReport) {
  const counts = report.counts;
  return Boolean(
    report.ok &&
      report.currentRunMutationPerformed === "NO" &&
      report.remotePhase === "ALREADY_APPLIED" &&
      report.project004Canonical === "PASS" &&
      report.remoteIdentityGuard === "PASS" &&
      report.generatedRuntimeRemoteOff === "PASS" &&
      report.releaseContract === "PASS" &&
      report.grade1Boundary === "PASS" &&
      report.adaptivePilotDisabled === "PASS" &&
      report.rlsPrivateBoundary === "PASS" &&
      counts &&
      counts.migrationCount === 41 &&
      counts.migrationFirst === "0001" &&
      counts.migrationLast === "0041" &&
      counts.provenanceFieldCount === 8 &&
      counts.supportFieldCount === 2 &&
      counts.partialProvenanceRowCount === 0 &&
      counts.generatedQuestionRows === 0 &&
      counts.privateSolutionRows === 0 &&
      counts.generatedAnswerRows === 0 &&
      counts.releaseUnits === 171 &&
      counts.releaseQuestions === 2052 &&
      counts.releaseSolutions === 2052 &&
      counts.releaseOutcomes === 546,
  );
}

function mutationBoundarySame(
  before: SafeRemoteSnapshot,
  after: SafeRemoteSnapshot,
) {
  return (
    before.attemptRows === after.attemptRows &&
    before.generatedQuestionRows === after.generatedQuestionRows &&
    before.privateSolutionRows === after.privateSolutionRows &&
    before.generatedAnswerRows === after.generatedAnswerRows &&
    before.learningHistoryRows === after.learningHistoryRows
  );
}

function readCanonicalOutcomes(candidateRoot: string) {
  const parsed = JSON.parse(
    readFileSync(
      resolve(
        candidateRoot,
        "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
      ),
      "utf8",
    ),
  ) as { outcomes?: unknown };
  if (!Array.isArray(parsed.outcomes)) {
    throw new Error("REMOTE_SHADOW_OUTCOME_INVENTORY_INVALID");
  }
  return parsed.outcomes as RemoteShadowOutcome[];
}

function writeAggregateArtifact(
  candidateRoot: string,
  value: Readonly<{
    before: SafeRemoteSnapshot;
    after: SafeRemoteSnapshot;
    coverage: RemoteShadowCoverageResult;
    remoteShadowMutationPerformed: "NO";
    studentRuntimeChanged: "NO";
    generatedRuntimeRemoteAfter: "OFF";
  }>,
) {
  const artifactPath = resolve(candidateRoot, shadowArtifactRelativePath);
  mkdirSync(resolve(candidateRoot, ".local-artifacts/generated-shadow"), {
    recursive: true,
    mode: 0o700,
  });
  const artifact = {
    schemaVersion: 1,
    mode: "SHADOW",
    targetClass: "PROJECT004_CLEAN_REMOTE_DEVELOPMENT",
    sampleLimit: REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT,
    durationLimitMs: REMOTE_GENERATED_SHADOW_DURATION_LIMIT_MS,
    before: value.before,
    after: value.after,
    coverage: value.coverage,
    remoteShadowMutationPerformed: value.remoteShadowMutationPerformed,
    studentRuntimeChanged: value.studentRuntimeChanged,
    generatedRuntimeRemoteAfter: value.generatedRuntimeRemoteAfter,
  };
  const serialized = JSON.stringify(artifact, null, 2);
  if (
    /(?:email|userId|studentId|rawSeed|correctAnswer|correctIndex|prompt|solutionSteps|databasePassword|projectRef)/u.test(
      serialized,
    )
  ) {
    throw new Error("REMOTE_SHADOW_ARTIFACT_PRIVATE_DATA_REJECTED");
  }
  writeFileSync(artifactPath, serialized, {
    encoding: "utf8",
    mode: 0o600,
  });
  return shadowArtifactRelativePath;
}

export function executeRemoteGeneratedShadow(options: Readonly<{
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  preflight?: typeof executeMigration0041RemotePreflight;
  coverage?: typeof validateRemoteGeneratedShadowCoverage;
  outcomes?: readonly RemoteShadowOutcome[];
  writeArtifact?: typeof writeAggregateArtifact;
}>): RemoteGeneratedShadowReport {
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const preflight = options.preflight ?? executeMigration0041RemotePreflight;
  const coverageRunner =
    options.coverage ?? validateRemoteGeneratedShadowCoverage;
  const runtimeConfiguration =
    parseGeneratedPracticeRuntimeConfiguration({
      enabled: "true",
      mode: "SHADOW",
    });
  if (
    !runtimeConfiguration.enabled ||
    runtimeConfiguration.mode !== "SHADOW"
  ) {
    return emptyReport("REMOTE_SHADOW_MODE_FAIL_CLOSED");
  }

  const beforeReport = preflight({
    environment: options.environment,
    candidateRoot,
  });
  if (!validRemoteShadowBoundary(beforeReport) || !beforeReport.counts) {
    return {
      ...emptyReport("REMOTE_SHADOW_PRECONDITION_FAILED"),
      project004Canonical: beforeReport.project004Canonical,
      remoteIdentityGuard: beforeReport.remoteIdentityGuard,
      endpointMode: beforeReport.endpointMode,
      migrationsApplied: beforeReport.counts
        ? `${beforeReport.counts.migrationCount}/41`
        : "NOT_RUN",
      provenanceFields: beforeReport.counts
        ? `${beforeReport.counts.provenanceFieldCount}/8`
        : "NOT_RUN",
      releaseContract: beforeReport.releaseContract,
      grade1Boundary: beforeReport.grade1Boundary,
      adaptivePilotDisabled: beforeReport.adaptivePilotDisabled,
      rlsPrivateBoundary: beforeReport.rlsPrivateBoundary,
      before: beforeReport.counts
        ? safeSnapshot(beforeReport.counts)
        : null,
      generatedRuntimeRemoteAfter:
        beforeReport.generatedRuntimeRemoteOff === "PASS"
          ? "OFF"
          : "NOT_RUN",
    };
  }

  const before = safeSnapshot(beforeReport.counts);
  let coverage: RemoteShadowCoverageResult | null = null;
  let coverageExecutionFailed = false;
  try {
    coverage = coverageRunner(
      options.outcomes ?? readCanonicalOutcomes(candidateRoot),
    );
  } catch {
    coverageExecutionFailed = true;
  }

  const afterReport = preflight({
    environment: options.environment,
    candidateRoot,
  });
  if (!validRemoteShadowBoundary(afterReport) || !afterReport.counts) {
    return {
      ...emptyReport("REMOTE_SHADOW_POSTFLIGHT_FAILED"),
      project004Canonical: "PASS",
      remoteIdentityGuard: "PASS",
      endpointMode: beforeReport.endpointMode,
      migrationsApplied: "41/41",
      provenanceFields: "8/8",
      releaseContract: "PASS",
      grade1Boundary: "PASS",
      adaptivePilotDisabled: "PASS",
      rlsPrivateBoundary: "PASS",
      before,
      coverage,
      generatedRuntimeRemoteAfter:
        afterReport.generatedRuntimeRemoteOff === "PASS"
          ? "OFF"
          : "UNVERIFIED",
      remoteShadowMutationPerformed: "UNVERIFIED",
      studentRuntimeChanged: "UNVERIFIED",
    };
  }
  const after = safeSnapshot(afterReport.counts);
  if (coverageExecutionFailed || !coverage) {
    return {
      ...emptyReport("REMOTE_SHADOW_COVERAGE_EXECUTION_FAILED"),
      project004Canonical: "PASS",
      remoteIdentityGuard: "PASS",
      endpointMode: beforeReport.endpointMode,
      migrationsApplied: "41/41",
      provenanceFields: "8/8",
      releaseContract: "PASS",
      grade1Boundary: "PASS",
      adaptivePilotDisabled: "PASS",
      rlsPrivateBoundary: "PASS",
      before,
      after,
      generatedRuntimeRemoteAfter: "OFF",
      remoteShadowMutationPerformed: mutationBoundarySame(before, after)
        ? "NO"
        : "UNVERIFIED",
      studentRuntimeChanged: "NO",
    };
  }
  if (!coverage.ok) {
    return {
      ...emptyReport("REMOTE_SHADOW_SEMANTIC_VALIDATION_FAILED"),
      project004Canonical: "PASS",
      remoteIdentityGuard: "PASS",
      endpointMode: beforeReport.endpointMode,
      migrationsApplied: "41/41",
      provenanceFields: "8/8",
      releaseContract: "PASS",
      grade1Boundary: "PASS",
      adaptivePilotDisabled: "PASS",
      rlsPrivateBoundary: "PASS",
      before,
      after,
      coverage,
      generatedRuntimeRemoteAfter: "OFF",
      remoteShadowMutationPerformed: mutationBoundarySame(before, after)
        ? "NO"
        : "UNVERIFIED",
      studentRuntimeChanged: "NO",
    };
  }
  if (!mutationBoundarySame(before, after)) {
    return {
      ...emptyReport("REMOTE_SHADOW_REMOTE_COUNTS_CHANGED"),
      project004Canonical: "PASS",
      remoteIdentityGuard: "PASS",
      endpointMode: beforeReport.endpointMode,
      migrationsApplied: "41/41",
      provenanceFields: "8/8",
      releaseContract: "PASS",
      grade1Boundary: "PASS",
      adaptivePilotDisabled: "PASS",
      rlsPrivateBoundary: "PASS",
      before,
      after,
      coverage,
      generatedRuntimeRemoteAfter: "OFF",
      remoteShadowMutationPerformed: "UNVERIFIED",
      studentRuntimeChanged: "NO",
    };
  }
  let artifactPath: string;
  try {
    artifactPath = (options.writeArtifact ?? writeAggregateArtifact)(
      candidateRoot,
      {
        before,
        after,
        coverage,
        remoteShadowMutationPerformed: "NO",
        studentRuntimeChanged: "NO",
        generatedRuntimeRemoteAfter: "OFF",
      },
    );
  } catch {
    return {
      ...emptyReport("REMOTE_SHADOW_ARTIFACT_WRITE_FAILED"),
      project004Canonical: "PASS",
      remoteIdentityGuard: "PASS",
      endpointMode: beforeReport.endpointMode,
      migrationsApplied: "41/41",
      provenanceFields: "8/8",
      releaseContract: "PASS",
      grade1Boundary: "PASS",
      adaptivePilotDisabled: "PASS",
      rlsPrivateBoundary: "PASS",
      before,
      after,
      coverage,
      generatedRuntimeRemoteAfter: "OFF",
    };
  }
  return {
    ok: true,
    project004Canonical: "PASS",
    remoteIdentityGuard: "PASS",
    endpointMode: beforeReport.endpointMode,
    migrationsApplied: "41/41",
    provenanceFields: "8/8",
    releaseContract: "PASS",
    grade1Boundary: "PASS",
    adaptivePilotDisabled: "PASS",
    rlsPrivateBoundary: "PASS",
    before,
    after,
    coverage,
    artifactPath,
    remoteShadowMutationPerformed: "NO",
    studentRuntimeChanged: "NO",
    generatedRuntimeRemoteAfter: "OFF",
    rootFailureCode: "NONE",
  };
}

export function renderRemoteGeneratedShadow(report: RemoteGeneratedShadowReport) {
  const firstFailure = report.coverage?.failures[0];
  const before = report.before;
  const after = report.after;
  const coverage = report.coverage;
  return [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `REMOTE_DATABASE_ENDPOINT_MODE=${report.endpointMode}`,
    "NETWORK_LISTENER=NONE",
    "SHADOW_RUNTIME_SCOPE=COMMAND_PROCESS_ONLY",
    `MIGRATIONS_APPLIED=${report.migrationsApplied}`,
    `PROVENANCE_FIELDS=${report.provenanceFields}`,
    `RELEASE_CONTRACT=${report.releaseContract}`,
    `GRADE1_BOUNDARY=${report.grade1Boundary}`,
    `GRADE2_CONTROLLED_ADAPTIVE_PILOT=${
      report.adaptivePilotDisabled === "PASS" ? "DISABLED" : "NOT_RUN"
    }`,
    `RLS_PRIVATE_SOLUTION_BOUNDARY=${report.rlsPrivateBoundary}`,
    `SHADOW_SAMPLE_LIMIT=${REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT}`,
    `SHADOW_DURATION_LIMIT_MS=${REMOTE_GENERATED_SHADOW_DURATION_LIMIT_MS}`,
    `GRADES=${coverage ? `${coverage.grades}/9` : "NOT_RUN"}`,
    `OUTCOMES=${coverage ? `${coverage.outcomes}/546` : "NOT_RUN"}`,
    `SEMANTIC_VARIANTS=${coverage ? `${coverage.variants}/59` : "NOT_RUN"}`,
    `REQUESTED=${coverage?.requested ?? "NOT_RUN"}`,
    `GENERATED=${coverage?.generated ?? "NOT_RUN"}`,
    `INDEPENDENTLY_SOLVED=${coverage?.independentlySolved ?? "NOT_RUN"}`,
    `FAMILY_CORRECT=${coverage?.familyCorrect ?? "NOT_RUN"}`,
    `OUTCOME_CORRECT=${coverage?.outcomeCorrect ?? "NOT_RUN"}`,
    `DIFFICULTY_CORRECT=${coverage?.difficultyCorrect ?? "NOT_RUN"}`,
    `UNIQUE_ANSWER_POLICY=${coverage?.uniqueAnswerPolicyPass ?? "NOT_RUN"}`,
    `PUBLIC_PRIVATE_BOUNDARY=${coverage?.publicPrivateBoundaryPass ?? "NOT_RUN"}`,
    `PROVENANCE_COMPLETE=${coverage?.provenanceComplete ?? "NOT_RUN"}`,
    `VISUAL_CONTRACT=${coverage?.visualContractPass ?? "NOT_RUN"}`,
    `GENERATOR_FAMILY_FALLBACK_COUNT=${coverage?.fallbackCount ?? "NOT_RUN"}`,
    `PRIVATE_SOLUTION_LEAKS=${coverage?.privateSolutionLeaks ?? "NOT_RUN"}`,
    `SHADOW_FAILURE_OUTCOME_ID=${firstFailure?.outcomeId ?? "NONE"}`,
    `SHADOW_FAILURE_VARIANT_ID=${firstFailure?.variantId ?? "NONE"}`,
    `SHADOW_FAILURE_CLASS=${firstFailure?.failureClass ?? "NONE"}`,
    `REMOTE_COUNTS_BEFORE=${
      before
        ? `${before.attemptRows}/${before.generatedQuestionRows}/${before.privateSolutionRows}/${before.generatedAnswerRows}/${before.learningHistoryRows}`
        : "NOT_RUN"
    }`,
    `ATTEMPT_ROWS_BEFORE=${before?.attemptRows ?? "NOT_RUN"}`,
    `GENERATED_QUESTION_ROWS_BEFORE=${before?.generatedQuestionRows ?? "NOT_RUN"}`,
    `PRIVATE_SOLUTION_ROWS_BEFORE=${before?.privateSolutionRows ?? "NOT_RUN"}`,
    `GENERATED_ANSWER_ROWS_BEFORE=${before?.generatedAnswerRows ?? "NOT_RUN"}`,
    `LEARNING_HISTORY_ROWS_BEFORE=${before?.learningHistoryRows ?? "NOT_RUN"}`,
    `ATTEMPT_ROWS_AFTER=${after?.attemptRows ?? "NOT_RUN"}`,
    `GENERATED_QUESTION_ROWS_AFTER=${after?.generatedQuestionRows ?? "NOT_RUN"}`,
    `PRIVATE_SOLUTION_ROWS_AFTER=${after?.privateSolutionRows ?? "NOT_RUN"}`,
    `GENERATED_ANSWER_ROWS_AFTER=${after?.generatedAnswerRows ?? "NOT_RUN"}`,
    `LEARNING_HISTORY_ROWS_AFTER=${after?.learningHistoryRows ?? "NOT_RUN"}`,
    `REMOTE_COUNTS_AFTER=${
      after
        ? `${after.attemptRows}/${after.generatedQuestionRows}/${after.privateSolutionRows}/${after.generatedAnswerRows}/${after.learningHistoryRows}`
        : "NOT_RUN"
    }`,
    `SHADOW_ARTIFACT=${report.artifactPath}`,
    `REMOTE_SHADOW_MUTATION_PERFORMED=${report.remoteShadowMutationPerformed}`,
    `STUDENT_RUNTIME_CHANGED=${report.studentRuntimeChanged}`,
    `GENERATED_RUNTIME_REMOTE_AFTER=${report.generatedRuntimeRemoteAfter}`,
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `PROJECT004_REMOTE_GENERATED_SHADOW=${report.ok ? "PASS" : "FAIL"}`,
    "",
  ].join("\n");
}

export function runRemoteGeneratedShadowCommand(options?: Readonly<{
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  prompt?: SecurePrompt;
  execute?: typeof executeRemoteGeneratedShadow;
}>) {
  const prompted = promptProject004UniversalRemoteEnvironment({
    environment: options?.environment,
    prompt: options?.prompt,
  });
  if (!prompted.ok) {
    const report = emptyReport(prompted.code);
    return {
      exitCode: 1,
      report,
      output: renderRemoteGeneratedShadow(report),
    };
  }
  try {
    const report = (options?.execute ?? executeRemoteGeneratedShadow)({
      environment: prompted.environment,
      candidateRoot: options?.candidateRoot,
    });
    return {
      exitCode: report.ok ? 0 : 1,
      report,
      output: renderRemoteGeneratedShadow(report),
    };
  } catch {
    const report = emptyReport("REMOTE_SHADOW_OPERATION_FAILED");
    return {
      exitCode: 1,
      report,
      output: renderRemoteGeneratedShadow(report),
    };
  } finally {
    prompted.clear();
  }
}

export function renderRemoteGeneratedShadowSmoke(
  candidateRoot = process.cwd(),
) {
  const coverage = validateRemoteGeneratedShadowCoverage(
    readCanonicalOutcomes(candidateRoot),
  );
  const runtime = parseGeneratedPracticeRuntimeConfiguration({
    enabled: "true",
    mode: "SHADOW",
  });
  const pass =
    coverage.ok &&
    coverage.generated === REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT &&
    runtime.enabled &&
    runtime.mode === "SHADOW" &&
    project004Migration0041Contract.targetName ===
      "plave-project004-dev-clean";
  return [
    `REMOTE_GENERATED_SHADOW_EXECUTABLE=${pass ? "PASS" : "FAIL"}`,
    `SHADOW_SAMPLES=${coverage.generated}/${REMOTE_GENERATED_SHADOW_SAMPLE_LIMIT}`,
    `SHADOW_VARIANTS=${coverage.variants}/59`,
    "NETWORK_LISTENER=NONE",
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_SHADOW_MUTATION_PERFORMED=NO",
    "",
  ].join("\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    process.stdout.write(renderRemoteGeneratedShadowSmoke());
  } else {
    const result = runRemoteGeneratedShadowCommand();
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  }
}
