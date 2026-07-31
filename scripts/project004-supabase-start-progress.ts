import type {
  ManagedChildDeadlineUpdate,
  ManagedChildOutputEvent,
} from "./project004-managed-child-process.ts";
import { disposableProofStageTimeoutMs } from "./project004-disposable-proof-lifecycle.ts";
import type { DisposableResourceClassification } from "./project004-disposable-resource-classifier.ts";

export type DisposableStartDeadlineProfile = {
  SERVICE_BOOTSTRAP: number;
  MIGRATION_STALL: number;
  MIGRATION_TOTAL: number;
  POST_MIGRATION_WAIT: number;
};

export const disposableStartPhaseDeadlineMs: DisposableStartDeadlineProfile = {
  SERVICE_BOOTSTRAP:
    disposableProofStageTimeoutMs.SERVICE_BOOTSTRAP,
  MIGRATION_STALL: 90_000,
  MIGRATION_TOTAL:
    disposableProofStageTimeoutMs.MIGRATION_EXECUTION,
  POST_MIGRATION_WAIT:
    disposableProofStageTimeoutMs.POST_MIGRATION_WAIT,
} as const;

export const constrainedDisposableStartPhaseDeadlineMs:
  DisposableStartDeadlineProfile = {
    SERVICE_BOOTSTRAP: 240_000,
    MIGRATION_STALL: 120_000,
    MIGRATION_TOTAL: 600_000,
    POST_MIGRATION_WAIT: 90_000,
  };

export function deadlineProfileForResources(
  classification: DisposableResourceClassification,
) {
  if (classification === "INSUFFICIENT") {
    throw new Error(
      "DISPOSABLE_RESOURCE_PROFILE_INSUFFICIENT",
    );
  }
  return classification === "CONSTRAINED_BUT_SUPPORTED"
    ? constrainedDisposableStartPhaseDeadlineMs
    : disposableStartPhaseDeadlineMs;
}

export type DisposableStartProgressSnapshot = {
  serviceBootstrapStarted: true;
  serviceBootstrapPass: boolean;
  migrationPhaseStarted: boolean;
  migrationLastObservedVersion: string;
  migrationObservedCount: number;
  postMigrationWaitStarted: boolean;
  postMigrationCompletionSource:
    | "OUTPUT_MARKER"
    | "SUCCESSFUL_CHILD_EXIT_AFTER_40"
    | "NOT_OBSERVED";
  currentPhase:
    | "SERVICE_BOOTSTRAP"
    | "MIGRATION_EXECUTION"
    | "POST_MIGRATION_WAIT";
};

export type DisposableStartProgressUpdate = {
  snapshot: DisposableStartProgressSnapshot;
  deadline?: ManagedChildDeadlineUpdate;
  markers: string[];
};

export type DisposableStartPhaseTiming = {
  serviceBootstrapMs: number;
  migrationExecutionMs: number;
  postMigrationWaitMs: number;
};

const canonicalVersions = Array.from(
  { length: 40 },
  (_, index) => String(index + 1).padStart(4, "0"),
);
const canonicalVersionSet = new Set(canonicalVersions);

function migrationVersion(line: string) {
  const match =
    /\b(?:applying|running|executing)\s+(?:migration\s+)?(?:[^ \t\r\n/\\]+[/\\])*((?:000[1-9]|00[12][0-9]|003[0-9]|0040))(?:_[a-z0-9][a-z0-9_-]*)?[.]sql(?:[.]{3})?\b/iu.exec(
      line,
    );
  const version = match?.[1] ?? "";
  return canonicalVersionSet.has(version) ? version : null;
}

function postMigrationWait(line: string) {
  return /\b(?:starting (?:remaining )?containers|waiting for health checks|started supabase local development setup|finished supabase start)\b/iu.test(
    line,
  );
}

export class DisposableSupabaseStartProgressTracker {
  private readonly buffers = {
    STDOUT: "",
    STDERR: "",
  };
  private readonly observedVersions = new Set<string>();
  private migrationStartedAtMs: number | null = null;
  private postWaitStartedAtMs: number | null = null;
  private servicePass = false;
  private postWait = false;
  private postMigrationCompletionSource:
    DisposableStartProgressSnapshot["postMigrationCompletionSource"] =
      "NOT_OBSERVED";
  private readonly deadlines: DisposableStartDeadlineProfile;

  constructor(
    deadlines: DisposableStartDeadlineProfile =
      disposableStartPhaseDeadlineMs,
  ) {
    this.deadlines = deadlines;
  }

  snapshot(): DisposableStartProgressSnapshot {
    const ordered = canonicalVersions.filter((version) =>
      this.observedVersions.has(version),
    );
    return {
      serviceBootstrapStarted: true,
      serviceBootstrapPass: this.servicePass,
      migrationPhaseStarted:
        this.migrationStartedAtMs !== null,
      migrationLastObservedVersion:
        ordered.at(-1) ?? "NOT_OBSERVED",
      migrationObservedCount: ordered.length,
      postMigrationWaitStarted: this.postWait,
      postMigrationCompletionSource:
        this.postMigrationCompletionSource,
      currentPhase: this.postWait
        ? "POST_MIGRATION_WAIT"
        : this.migrationStartedAtMs !== null
          ? "MIGRATION_EXECUTION"
          : "SERVICE_BOOTSTRAP",
    };
  }

  consume(
    event: ManagedChildOutputEvent,
  ): DisposableStartProgressUpdate {
    this.buffers[event.stream] += event.chunk;
    const pieces = this.buffers[event.stream].split(/\r?\n/u);
    this.buffers[event.stream] = pieces.pop() ?? "";
    const markers: string[] = [];
    let deadline: ManagedChildDeadlineUpdate | undefined;
    for (const line of pieces) {
      const version = migrationVersion(line);
      const expectedVersion =
        canonicalVersions[this.observedVersions.size];
      if (
        version &&
        version === expectedVersion &&
        !this.observedVersions.has(version)
      ) {
        this.observedVersions.add(version);
        if (this.migrationStartedAtMs === null) {
          this.migrationStartedAtMs = event.elapsedMs;
          this.servicePass = true;
          markers.push(
            "SERVICE_BOOTSTRAP_PASS=PASS",
            "MIGRATION_PHASE_STARTED=PASS",
          );
        }
        const migrationElapsed =
          event.elapsedMs - this.migrationStartedAtMs;
        const remainingTotal = Math.max(
          1,
          this.deadlines.MIGRATION_TOTAL -
            migrationElapsed,
        );
        deadline = {
          timeoutMs: Math.min(
            this.deadlines.MIGRATION_STALL,
            remainingTotal,
          ),
        };
        markers.push(
          `MIGRATION_LAST_OBSERVED_VERSION=${version}`,
          `MIGRATION_OBSERVED_COUNT=${String(this.observedVersions.size)}`,
        );
      }
      if (
        !this.postWait &&
        this.observedVersions.size === 40 &&
        this.observedVersions.has("0040") &&
        postMigrationWait(line)
      ) {
        this.postWait = true;
        this.postMigrationCompletionSource = "OUTPUT_MARKER";
        this.postWaitStartedAtMs = event.elapsedMs;
        deadline = {
          timeoutMs:
            this.deadlines.POST_MIGRATION_WAIT,
        };
        markers.push("POST_MIGRATION_WAIT_STARTED=PASS");
      }
    }
    return {
      snapshot: this.snapshot(),
      deadline,
      markers,
    };
  }

  flush(elapsedMs: number): DisposableStartProgressUpdate {
    const markers: string[] = [];
    let deadline: ManagedChildDeadlineUpdate | undefined;
    for (const stream of ["STDOUT", "STDERR"] as const) {
      if (!this.buffers[stream]) continue;
      const update = this.consume({
        stream,
        chunk: "\n",
        elapsedMs,
      });
      markers.push(...update.markers);
      deadline = update.deadline ?? deadline;
    }
    return {
      snapshot: this.snapshot(),
      deadline,
      markers,
    };
  }

  observeSuccessfulChildExit(options: {
    childOk: boolean;
    childExited: boolean;
    elapsedMs: number;
  }): DisposableStartProgressUpdate {
    const markers: string[] = [];
    if (
      !this.postWait &&
      options.childOk &&
      options.childExited &&
      this.observedVersions.size === 40 &&
      this.observedVersions.has("0040")
    ) {
      this.postWait = true;
      this.postWaitStartedAtMs = options.elapsedMs;
      this.postMigrationCompletionSource =
        "SUCCESSFUL_CHILD_EXIT_AFTER_40";
      markers.push(
        "POST_MIGRATION_WAIT_STARTED=PASS",
        "POST_MIGRATION_COMPLETION_SOURCE=SUCCESSFUL_CHILD_EXIT_AFTER_40",
      );
    }
    return {
      snapshot: this.snapshot(),
      markers,
    };
  }

  timing(
    executionElapsedMs: number,
  ): DisposableStartPhaseTiming {
    const boundedElapsed = Math.max(
      0,
      Math.trunc(executionElapsedMs),
    );
    const migrationStart =
      this.migrationStartedAtMs ?? boundedElapsed;
    const postStart =
      this.postWaitStartedAtMs ?? boundedElapsed;
    return {
      serviceBootstrapMs: Math.max(
        0,
        Math.min(boundedElapsed, migrationStart),
      ),
      migrationExecutionMs:
        this.migrationStartedAtMs === null
          ? 0
          : Math.max(
              0,
              Math.min(boundedElapsed, postStart) -
                migrationStart,
            ),
      postMigrationWaitMs:
        this.postWaitStartedAtMs === null
          ? 0
          : Math.max(0, boundedElapsed - postStart),
    };
  }

  currentPhaseElapsedMs(executionElapsedMs: number) {
    const boundedElapsed = Math.max(
      0,
      Math.trunc(executionElapsedMs),
    );
    if (
      this.postWait &&
      this.postWaitStartedAtMs !== null
    ) {
      return Math.max(
        0,
        boundedElapsed - this.postWaitStartedAtMs,
      );
    }
    if (this.migrationStartedAtMs !== null) {
      return Math.max(
        0,
        boundedElapsed - this.migrationStartedAtMs,
      );
    }
    return boundedElapsed;
  }
}

export function renderDisposableStartProgress(
  progress: DisposableStartProgressSnapshot,
) {
  return [
    "SERVICE_BOOTSTRAP_STARTED=PASS",
    `SERVICE_BOOTSTRAP_PASS=${progress.serviceBootstrapPass ? "PASS" : "NOT_OBSERVED"}`,
    `MIGRATION_PHASE_STARTED=${progress.migrationPhaseStarted ? "PASS" : "NOT_OBSERVED"}`,
    `MIGRATION_LAST_OBSERVED_VERSION=${progress.migrationLastObservedVersion}`,
    `MIGRATION_OBSERVED_COUNT=${String(progress.migrationObservedCount)}`,
    `POST_MIGRATION_WAIT_STARTED=${progress.postMigrationWaitStarted ? "PASS" : "NOT_OBSERVED"}`,
    `POST_MIGRATION_COMPLETION_SOURCE=${progress.postMigrationCompletionSource}`,
  ].join("\n");
}
