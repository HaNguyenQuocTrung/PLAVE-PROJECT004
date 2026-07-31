import { randomBytes } from "node:crypto";
import { statfsSync } from "node:fs";
import { tmpdir, totalmem } from "node:os";

import { cleanDisposablePostgresImage } from "./project004-clean-disposable-proof.ts";
import {
  reserveDisposablePorts,
} from "./project004-disposable-port-reservation.ts";
import {
  classifyDisposableResources,
  type DisposableResourceEvidence,
} from "./project004-disposable-resource-classifier.ts";
import {
  DisposableProofInterruptedError,
  DisposableProofLifecycle,
  installDisposableProofSignalHandlers,
} from "./project004-disposable-proof-lifecycle.ts";
import {
  assertDisposableMigrationWorkspaceSmokeMarker,
  prepareDisposableMigrationWorkspace,
} from "./project004-disposable-migration-workspace.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import {
  renderDisposableStartProgress,
  type DisposableStartPhaseTiming,
  type DisposableStartProgressSnapshot,
} from "./project004-supabase-start-progress.ts";
import {
  classifyDisposableStartFailure,
  classifyDisposableStartTimeout,
  cleanLocalCommandEnvironment,
  startDisposableStack,
  stopDisposableStack,
} from "./run-project004-clean-disposable-proof.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

export type DisposableStartTimingDiagnosticReport = {
  dockerDaemon: "PASS" | "FAIL";
  dockerResourceState:
    DisposableResourceEvidence["classification"];
  imageState:
    | "POSTGRES_AVAILABLE"
    | "POSTGRES_NOT_AVAILABLE"
    | "NOT_RUN";
  progress: DisposableStartProgressSnapshot;
  timing: DisposableStartPhaseTiming;
  terminationMs: number;
  childExitConfirmed: "PASS" | "FAIL" | "NOT_RUN";
  cleanup: "PASS" | "FAIL" | "NOT_RUN";
  rootFailureCode: string;
  resourceEvidence: DisposableResourceEvidence;
};

const emptyProgress: DisposableStartProgressSnapshot = {
  serviceBootstrapStarted: true,
  serviceBootstrapPass: false,
  migrationPhaseStarted: false,
  migrationLastObservedVersion: "NOT_OBSERVED",
  migrationObservedCount: 0,
  postMigrationWaitStarted: false,
  postMigrationCompletionSource: "NOT_OBSERVED",
  currentPhase: "SERVICE_BOOTSTRAP",
};

function emptyDiagnostic(): DisposableStartTimingDiagnosticReport {
  const resourceEvidence = classifyDisposableResources({
    cpu: 0,
    dockerMemoryBytes: 0,
    hostMemoryBytes: totalmem(),
    freeDiskBytes: 0,
    postgresImageAvailable: false,
  });
  return {
    dockerDaemon: "FAIL",
    dockerResourceState: "INSUFFICIENT",
    imageState: "NOT_RUN",
    progress: emptyProgress,
    timing: {
      serviceBootstrapMs: 0,
      migrationExecutionMs: 0,
      postMigrationWaitMs: 0,
    },
    terminationMs: 0,
    childExitConfirmed: "NOT_RUN",
    cleanup: "NOT_RUN",
    rootFailureCode: "DISPOSABLE_TIMING_DIAGNOSTIC_NOT_RUN",
    resourceEvidence,
  };
}

export async function readOnlyDockerEvidence(
  root: string,
  environment: NodeJS.ProcessEnv,
  abortSignal: AbortSignal,
) {
  const common = {
    cwd: root,
    environment,
    timeoutMs: 30_000,
    terminationGraceMs: 5_000,
    killConfirmationMs: 5_000,
    heartbeatMs: 30_000,
    abortSignal,
    stage: "DOCKER_RESOURCE_PREFLIGHT",
  };
  const daemon = await runManagedChild({
    ...common,
    executable: "docker",
    args: [
      "version",
      "--format",
      "{{.Server.Version}}",
    ],
  });
  if (!daemon.ok || !daemon.childExited) {
    return {
      daemon: "FAIL" as const,
      evidenceAvailable: false,
      resources: classifyDisposableResources({
        cpu: 0,
        dockerMemoryBytes: 0,
        hostMemoryBytes: totalmem(),
        freeDiskBytes: 0,
        postgresImageAvailable: false,
      }),
    };
  }
  const info = await runManagedChild({
    ...common,
    executable: "docker",
    args: [
      "info",
      "--format",
      "{{.MemTotal}}|{{.NCPU}}",
    ],
  });
  const fields = info.stdout.trim().split("|");
  const dockerMemory = Number(fields[0]);
  const dockerCpu = Number(fields[1]);
  let availableBytes = 0;
  try {
    const filesystem = statfsSync(tmpdir());
    availableBytes =
      Number(filesystem.bavail) * Number(filesystem.bsize);
  } catch {
    availableBytes = 0;
  }
  const image = await runManagedChild({
    ...common,
    executable: "docker",
    args: [
      "image",
      "inspect",
      "--format",
      "{{.Id}}",
      cleanDisposablePostgresImage,
    ],
  });
  const evidenceAvailable =
    info.ok &&
    info.childExited &&
    Number.isSafeInteger(dockerMemory) &&
    Number.isSafeInteger(dockerCpu) &&
    availableBytes > 0 &&
    image.childExited;
  const resources = classifyDisposableResources({
    cpu: dockerCpu,
    dockerMemoryBytes: dockerMemory,
    hostMemoryBytes: totalmem(),
    freeDiskBytes: availableBytes,
    postgresImageAvailable: image.ok,
  });
  return {
    daemon: "PASS" as const,
    evidenceAvailable,
    resources,
  };
}

export async function runDisposableStartTimingDiagnostic() {
  const root = assertProject004Workspace();
  assertDisposableMigrationWorkspaceSmokeMarker(root);
  const environment = cleanLocalCommandEnvironment();
  const report = emptyDiagnostic();
  const lifecycle = new DisposableProofLifecycle();
  const signals =
    installDisposableProofSignalHandlers(lifecycle);
  let reservation:
    | Awaited<ReturnType<typeof reserveDisposablePorts>>
    | undefined;
  let reservationReleased = false;
  let workdir = "";
  let projectId = "";
  let childExitConfirmed = true;
  try {
    const docker = await readOnlyDockerEvidence(
      root,
      environment,
      signals.signal,
    );
    report.dockerDaemon = docker.daemon;
    report.resourceEvidence = docker.resources;
    report.dockerResourceState =
      docker.resources.classification;
    report.imageState =
      docker.resources.image.observed === "AVAILABLE"
        ? "POSTGRES_AVAILABLE"
        : "POSTGRES_NOT_AVAILABLE";
    lifecycle.throwIfInterrupted();
    if (docker.daemon !== "PASS") {
      report.rootFailureCode = "DOCKER_DAEMON_UNAVAILABLE";
      return report;
    }
    if (!docker.evidenceAvailable) {
      report.rootFailureCode =
        "DOCKER_RESOURCE_EVIDENCE_UNAVAILABLE";
      return report;
    }
    if (
      docker.resources.image.check === "INSUFFICIENT"
    ) {
      report.rootFailureCode =
        "DISPOSABLE_POSTGRES_IMAGE_NOT_AVAILABLE";
      return report;
    }
    if (
      docker.resources.classification === "INSUFFICIENT"
    ) {
      report.rootFailureCode =
        "DOCKER_RESOURCES_INSUFFICIENT";
      return report;
    }

    reservation = await reserveDisposablePorts();
    projectId =
      `plave-project004-clean-proof-${randomBytes(6).toString("hex")}`;
    workdir = prepareDisposableMigrationWorkspace({
      candidateRoot: root,
      projectId,
      ports: reservation.ports,
    }).workdir;
    lifecycle.attachWorkdir(workdir);
    await reservation.release();
    reservationReleased = true;

    lifecycle.begin("SERVICE_BOOTSTRAP");
    const started = await startDisposableStack(
      workdir,
      lifecycle,
      signals.signal,
      docker.resources.classification,
    );
    report.progress = started.progress;
    report.timing = started.phaseTiming;
    report.terminationMs = started.terminationElapsedMs;
    report.childExitConfirmed = started.childExited
      ? "PASS"
      : "FAIL";
    childExitConfirmed = started.childExited;
    if (!started.childExited) {
      lifecycle.finish("FAIL");
      report.rootFailureCode =
        "DISPOSABLE_CHILD_EXIT_UNCONFIRMED";
      return report;
    }
    lifecycle.throwIfInterrupted();
    if (started.timedOut) {
      lifecycle.finish("TIMEOUT");
      report.rootFailureCode =
        classifyDisposableStartTimeout(started.progress);
      return report;
    }
    if (!started.ok) {
      lifecycle.finish("FAIL");
      report.rootFailureCode =
        classifyDisposableStartFailure(
          `${started.stdout}\n${started.stderr}`,
        );
      return report;
    }
    if (
      !started.progress.serviceBootstrapPass ||
      started.progress.migrationObservedCount !== 40 ||
      started.progress.migrationLastObservedVersion !==
        "0040" ||
      !started.progress.postMigrationWaitStarted
    ) {
      lifecycle.finish("FAIL");
      report.rootFailureCode =
        "DISPOSABLE_START_PROGRESS_UNRECOGNIZED";
      return report;
    }
    lifecycle.finish("PASS");
    report.rootFailureCode = "NONE";
    return report;
  } catch (error) {
    if (error instanceof DisposableProofInterruptedError) {
      report.rootFailureCode =
        `DISPOSABLE_TIMING_DIAGNOSTIC_INTERRUPTED_${error.signal}`;
    } else {
      report.rootFailureCode =
        "DISPOSABLE_TIMING_DIAGNOSTIC_FAILED";
    }
    return report;
  } finally {
    if (reservation && !reservationReleased) {
      await reservation.release();
    }
    if (workdir && childExitConfirmed) {
      lifecycle.begin("CLEANUP");
      const cleanup = await stopDisposableStack(
        workdir,
        projectId,
        lifecycle,
      );
      report.cleanup = cleanup.ok ? "PASS" : "FAIL";
      lifecycle.finish(
        cleanup.timedOut
          ? "TIMEOUT"
          : cleanup.ok
            ? "PASS"
            : "FAIL",
      );
      if (cleanup.ok) lifecycle.detachWorkdir();
      if (!cleanup.ok && report.rootFailureCode === "NONE") {
        report.rootFailureCode =
          "DISPOSABLE_TIMING_DIAGNOSTIC_CLEANUP_FAILED";
      }
    } else if (!workdir) {
      report.cleanup = "PASS";
    }
    signals.dispose();
  }
}

export function renderDisposableStartTimingDiagnostic(
  report: DisposableStartTimingDiagnosticReport,
) {
  return [
    "PROJECT004_CANONICAL=PASS",
    `DOCKER_DAEMON=${report.dockerDaemon}`,
    `DOCKER_RESOURCE_STATE=${report.dockerResourceState}`,
    `IMAGE_STATE=${report.imageState}`,
    `CPU_CHECK=${report.resourceEvidence.cpu.check}`,
    `CPU_OBSERVED=${String(report.resourceEvidence.cpu.observed)}`,
    `CPU_REQUIRED_MINIMUM=${String(report.resourceEvidence.cpu.requiredMinimum)}`,
    `CPU_RECOMMENDED=${String(report.resourceEvidence.cpu.recommended)}`,
    `MEMORY_CHECK=${report.resourceEvidence.memory.check}`,
    `MEMORY_OBSERVED_BYTES=${String(report.resourceEvidence.memory.dockerObservedBytes)}`,
    `HOST_MEMORY_OBSERVED_BYTES=${String(report.resourceEvidence.memory.hostObservedBytes)}`,
    `MEMORY_REQUIRED_MINIMUM_BYTES=${String(report.resourceEvidence.memory.requiredMinimumBytes)}`,
    `MEMORY_RECOMMENDED_BYTES=${String(report.resourceEvidence.memory.recommendedBytes)}`,
    `DISK_CHECK=${report.resourceEvidence.disk.check}`,
    `DISK_OBSERVED_BYTES=${String(report.resourceEvidence.disk.observedBytes)}`,
    `DISK_REQUIRED_MINIMUM_BYTES=${String(report.resourceEvidence.disk.requiredMinimumBytes)}`,
    `DISK_RECOMMENDED_BYTES=${String(report.resourceEvidence.disk.recommendedBytes)}`,
    `IMAGE_CHECK=${report.resourceEvidence.image.check}`,
    `IMAGE_OBSERVED=${report.resourceEvidence.image.observed}`,
    `IMAGE_REQUIRED=${report.resourceEvidence.image.required}`,
    renderDisposableStartProgress(report.progress),
    `SERVICE_BOOTSTRAP_DURATION_MS=${String(report.timing.serviceBootstrapMs)}`,
    `MIGRATION_EXECUTION_DURATION_MS=${String(report.timing.migrationExecutionMs)}`,
    `POST_MIGRATION_WAIT_DURATION_MS=${String(report.timing.postMigrationWaitMs)}`,
    `CHILD_TERMINATION_DURATION_MS=${String(report.terminationMs)}`,
    `CHILD_EXIT_CONFIRMED=${report.childExitConfirmed}`,
    `DISPOSABLE_CLEANUP=${report.cleanup}`,
    "CONTENT_TRANSACTION=NOT_RUN",
    "SEMANTIC_FINGERPRINT=NOT_RUN",
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
  ].join("\n") + "\n";
}
