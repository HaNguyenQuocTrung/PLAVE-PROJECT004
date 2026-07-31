import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { runManagedChild } from "../scripts/project004-managed-child-process.ts";
import {
  classifyDisposableResources,
  disposableResourceThresholds,
} from "../scripts/project004-disposable-resource-classifier.ts";
import {
  renderDisposableStartTimingDiagnostic,
  type DisposableStartTimingDiagnosticReport,
} from "../scripts/project004-disposable-start-timing-diagnostic.ts";
import {
  DisposableSupabaseStartProgressTracker,
  constrainedDisposableStartPhaseDeadlineMs,
  deadlineProfileForResources,
  disposableStartPhaseDeadlineMs,
  renderDisposableStartProgress,
} from "../scripts/project004-supabase-start-progress.ts";
import { classifyDisposableStartTimeout } from "../scripts/run-project004-clean-disposable-proof.ts";

const root = resolve(import.meta.dirname, "..");
const gibibyte = 1024 ** 3;

function event(
  chunk: string,
  elapsedMs: number,
  stream: "STDOUT" | "STDERR" = "STDERR",
) {
  return { chunk, elapsedMs, stream };
}

test("parser accepts only canonical Supabase migration progress and handles chunk boundaries", () => {
  const tracker = new DisposableSupabaseStartProgressTracker();
  const first = tracker.consume(
    event("Applying migration 00", 100),
  );
  assert.equal(first.deadline, undefined);
  const second = tracker.consume(
    event("01_foundation.sql...\n", 110),
  );
  assert.equal(
    second.deadline?.timeoutMs,
    disposableStartPhaseDeadlineMs.MIGRATION_STALL,
  );
  assert.equal(
    second.snapshot.migrationLastObservedVersion,
    "0001",
  );
  assert.equal(second.snapshot.migrationObservedCount, 1);

  const ignored = tracker.consume(
    event(
      "Applying migration 9999_foreign.sql...\n" +
        "Applying migration 0040_out_of_order.sql...\n" +
        "random output 0040_private.sql\n",
      120,
    ),
  );
  assert.equal(ignored.deadline, undefined);
  assert.equal(ignored.snapshot.migrationObservedCount, 1);
});

test("8 GiB host with 7.75 GiB Docker allocation is constrained but supported", () => {
  const evidence = classifyDisposableResources({
    cpu: 4,
    dockerMemoryBytes: 8_323_530_752,
    hostMemoryBytes: 8_589_934_592,
    freeDiskBytes: 34 * gibibyte,
    postgresImageAvailable: true,
  });
  assert.equal(
    evidence.classification,
    "CONSTRAINED_BUT_SUPPORTED",
  );
  assert.equal(evidence.cpu.check, "ADEQUATE");
  assert.equal(
    evidence.memory.check,
    "CONSTRAINED_BUT_SUPPORTED",
  );
  assert.equal(evidence.disk.check, "ADEQUATE");
  assert.equal(evidence.image.check, "ADEQUATE");
  assert.equal(
    evidence.memory.requiredMinimumBytes,
    4 * gibibyte,
  );
  assert.equal(
    evidence.memory.recommendedBytes,
    8 * gibibyte,
  );
});

test("true RAM, CPU and disk shortages remain hard failures", () => {
  const baseline = {
    cpu: 4,
    dockerMemoryBytes: 8 * gibibyte,
    hostMemoryBytes: 8 * gibibyte,
    freeDiskBytes: 34 * gibibyte,
    postgresImageAvailable: true,
  };
  assert.equal(
    classifyDisposableResources({
      ...baseline,
      dockerMemoryBytes:
        disposableResourceThresholds.memoryBytes.minimum -
        1,
    }).classification,
    "INSUFFICIENT",
  );
  assert.equal(
    classifyDisposableResources({
      ...baseline,
      cpu:
        disposableResourceThresholds.cpu.minimum - 1,
    }).classification,
    "INSUFFICIENT",
  );
  assert.equal(
    classifyDisposableResources({
      ...baseline,
      freeDiskBytes:
        disposableResourceThresholds.freeDiskBytes.minimum -
        1,
    }).classification,
    "INSUFFICIENT",
  );
});

test("constrained supported profile adjusts bounded deadlines without disabling stall checks", () => {
  const profile = deadlineProfileForResources(
    "CONSTRAINED_BUT_SUPPORTED",
  );
  assert.deepEqual(
    profile,
    constrainedDisposableStartPhaseDeadlineMs,
  );
  assert.ok(
    profile.SERVICE_BOOTSTRAP >
      disposableStartPhaseDeadlineMs.SERVICE_BOOTSTRAP,
  );
  assert.ok(
    profile.MIGRATION_STALL >
      disposableStartPhaseDeadlineMs.MIGRATION_STALL,
  );
  assert.ok(profile.MIGRATION_STALL < profile.MIGRATION_TOTAL);
  assert.ok(profile.POST_MIGRATION_WAIT > 0);
  assert.throws(
    () => deadlineProfileForResources("INSUFFICIENT"),
    /DISPOSABLE_RESOURCE_PROFILE_INSUFFICIENT/u,
  );
  const tracker =
    new DisposableSupabaseStartProgressTracker(profile);
  const migration = tracker.consume(
    event("Applying migration 0001_safe.sql...\n", 100),
  );
  assert.equal(
    migration.deadline?.timeoutMs,
    constrainedDisposableStartPhaseDeadlineMs.MIGRATION_STALL,
  );
  const noise = tracker.consume(
    event("Still waiting without progress\n", 200),
  );
  assert.equal(noise.deadline, undefined);
});

test("deadlines extend only on new verified migration progress and retain a total cap", () => {
  const tracker = new DisposableSupabaseStartProgressTracker();
  const first = tracker.consume(
    event("Applying migration 0001_safe.sql...\n", 1_000),
  );
  assert.equal(
    first.deadline?.timeoutMs,
    disposableStartPhaseDeadlineMs.MIGRATION_STALL,
  );
  const duplicate = tracker.consume(
    event("Applying migration 0001_safe.sql...\n", 2_000),
  );
  assert.equal(duplicate.deadline, undefined);
  const nearCap = tracker.consume(
    event(
      "Applying migration 0002_safe.sql...\n",
      420_950,
    ),
  );
  assert.equal(nearCap.deadline?.timeoutMs, 50);
  const noise = tracker.consume(
    event("Downloading or waiting without migration evidence\n", 420_960),
  );
  assert.equal(noise.deadline, undefined);
});

test("post-migration deadline starts only after 0040 and a verified wait marker", () => {
  const tracker = new DisposableSupabaseStartProgressTracker();
  for (let version = 1; version <= 40; version += 1) {
    tracker.consume(
      event(
        `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
        version * 100,
      ),
    );
  }
  const update = tracker.consume(
    event("Waiting for health checks...\n", 4_100),
  );
  assert.equal(
    update.deadline?.timeoutMs,
    disposableStartPhaseDeadlineMs.POST_MIGRATION_WAIT,
  );
  assert.equal(update.snapshot.postMigrationWaitStarted, true);
  assert.deepEqual(tracker.timing(5_000), {
    serviceBootstrapMs: 100,
    migrationExecutionMs: 4_000,
    postMigrationWaitMs: 900,
  });
  assert.equal(
    tracker.currentPhaseElapsedMs(5_000),
    900,
  );
});

test("final Supabase success line without a newline is flushed after the child exits", () => {
  const tracker = new DisposableSupabaseStartProgressTracker();
  for (let version = 1; version <= 40; version += 1) {
    tracker.consume(
      event(
        `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
        version * 100,
      ),
    );
  }
  const buffered = tracker.consume(
    event(
      "Started supabase local development setup.",
      4_100,
      "STDOUT",
    ),
  );
  assert.equal(
    buffered.snapshot.postMigrationWaitStarted,
    false,
  );
  const flushed = tracker.flush(4_101);
  assert.equal(
    flushed.snapshot.postMigrationWaitStarted,
    true,
  );
  assert.deepEqual(flushed.markers, [
    "POST_MIGRATION_WAIT_STARTED=PASS",
  ]);
});

test("successful child exit after exact 0001-0040 is authoritative when CLI emits no post-wait text", () => {
  const tracker = new DisposableSupabaseStartProgressTracker();
  for (let version = 1; version <= 40; version += 1) {
    tracker.consume(
      event(
        `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
        version * 100,
      ),
    );
  }
  const completion =
    tracker.observeSuccessfulChildExit({
      childOk: true,
      childExited: true,
      elapsedMs: 4_100,
    });
  assert.equal(
    completion.snapshot.postMigrationWaitStarted,
    true,
  );
  assert.equal(
    completion.snapshot.postMigrationCompletionSource,
    "SUCCESSFUL_CHILD_EXIT_AFTER_40",
  );
  assert.deepEqual(completion.markers, [
    "POST_MIGRATION_WAIT_STARTED=PASS",
    "POST_MIGRATION_COMPLETION_SOURCE=SUCCESSFUL_CHILD_EXIT_AFTER_40",
  ]);
});

test("child-exit completion rejects missing migrations, nonzero exit, and unconfirmed exit", () => {
  for (const child of [
    { childOk: false, childExited: true },
    { childOk: true, childExited: false },
  ]) {
    const tracker =
      new DisposableSupabaseStartProgressTracker();
    for (let version = 1; version <= 40; version += 1) {
      tracker.consume(
        event(
          `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
          version,
        ),
      );
    }
    assert.equal(
      tracker.observeSuccessfulChildExit({
        ...child,
        elapsedMs: 100,
      }).snapshot.postMigrationWaitStarted,
      false,
    );
  }
  const incomplete =
    new DisposableSupabaseStartProgressTracker();
  incomplete.consume(
    event("Applying migration 0001_safe.sql...\n", 1),
  );
  assert.equal(
    incomplete.observeSuccessfulChildExit({
      childOk: true,
      childExited: true,
      elapsedMs: 100,
    }).snapshot.postMigrationWaitStarted,
    false,
  );
});

test("heartbeat elapsed is phase-local and cannot exceed the matching phase duration", () => {
  const tracker = new DisposableSupabaseStartProgressTracker();
  assert.equal(tracker.currentPhaseElapsedMs(30_000), 30_000);
  tracker.consume(
    event("Applying migration 0001_safe.sql...\n", 18_000),
  );
  assert.equal(tracker.currentPhaseElapsedMs(30_000), 12_000);
  for (let version = 2; version <= 40; version += 1) {
    tracker.consume(
      event(
        `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
        18_000 + version * 100,
      ),
    );
  }
  tracker.consume(
    event("Waiting for health checks...\n", 22_100),
  );
  const phaseElapsed = tracker.currentPhaseElapsedMs(30_003);
  const timing = tracker.timing(30_003);
  assert.equal(phaseElapsed, 7_903);
  assert.equal(
    phaseElapsed,
    timing.postMigrationWaitMs,
  );
  assert.ok(phaseElapsed < 13_257);
});

test("timeout classification follows the last evidenced phase", () => {
  const service = new DisposableSupabaseStartProgressTracker();
  assert.equal(
    classifyDisposableStartTimeout(service.snapshot()),
    "DISPOSABLE_STAGE_TIMEOUT_SERVICE_BOOTSTRAP",
  );
  service.consume(
    event("Applying migration 0001_safe.sql...\n", 1),
  );
  assert.equal(
    classifyDisposableStartTimeout(service.snapshot()),
    "DISPOSABLE_STAGE_TIMEOUT_MIGRATION_EXECUTION",
  );
  for (let version = 2; version <= 40; version += 1) {
    service.consume(
      event(
        `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
        version,
      ),
    );
  }
  service.consume(
    event("Starting containers...\n", 50),
  );
  assert.equal(
    classifyDisposableStartTimeout(service.snapshot()),
    "DISPOSABLE_STAGE_TIMEOUT_POST_MIGRATION_WAIT",
  );
});

test("renderer exposes aggregate-only progress", () => {
  const output = renderDisposableStartProgress(
    new DisposableSupabaseStartProgressTracker().snapshot(),
  );
  for (const marker of [
    "SERVICE_BOOTSTRAP_STARTED=PASS",
    "SERVICE_BOOTSTRAP_PASS=NOT_OBSERVED",
    "MIGRATION_PHASE_STARTED=NOT_OBSERVED",
    "MIGRATION_LAST_OBSERVED_VERSION=NOT_OBSERVED",
    "MIGRATION_OBSERVED_COUNT=0",
    "POST_MIGRATION_WAIT_STARTED=NOT_OBSERVED",
    "POST_MIGRATION_COMPLETION_SOURCE=NOT_OBSERVED",
  ]) {
    assert.match(output, new RegExp(marker, "u"));
  }
  assert.doesNotMatch(
    output,
    /url|port|key|password|token|container|identity|[.]sql/iu,
  );
});

test("diagnostic renderer reports only sanitized aggregate timing evidence", () => {
  const resourceEvidence = classifyDisposableResources({
    cpu: 4,
    dockerMemoryBytes: 8_323_530_752,
    hostMemoryBytes: 8_589_934_592,
    freeDiskBytes: 34 * gibibyte,
    postgresImageAvailable: true,
  });
  const report: DisposableStartTimingDiagnosticReport = {
    dockerDaemon: "PASS",
    dockerResourceState:
      "CONSTRAINED_BUT_SUPPORTED",
    imageState: "POSTGRES_AVAILABLE",
    resourceEvidence,
    progress: {
      serviceBootstrapStarted: true,
      serviceBootstrapPass: true,
      migrationPhaseStarted: true,
      migrationLastObservedVersion: "0012",
      migrationObservedCount: 12,
      postMigrationWaitStarted: false,
      postMigrationCompletionSource: "NOT_OBSERVED",
      currentPhase: "MIGRATION_EXECUTION",
    },
    timing: {
      serviceBootstrapMs: 40_000,
      migrationExecutionMs: 140_000,
      postMigrationWaitMs: 0,
    },
    terminationMs: 5_043,
    childExitConfirmed: "PASS",
    cleanup: "PASS",
    rootFailureCode:
      "DISPOSABLE_STAGE_TIMEOUT_MIGRATION_EXECUTION",
  };
  const output =
    renderDisposableStartTimingDiagnostic(report);
  assert.match(
    output,
    /MIGRATION_LAST_OBSERVED_VERSION=0012/u,
  );
  assert.match(
    output,
    /MIGRATION_OBSERVED_COUNT=12/u,
  );
  assert.match(
    output,
    /CHILD_TERMINATION_DURATION_MS=5043/u,
  );
  assert.match(
    output,
    /CPU_CHECK=ADEQUATE[\s\S]*CPU_OBSERVED=4[\s\S]*CPU_REQUIRED_MINIMUM=2/u,
  );
  assert.match(
    output,
    /MEMORY_CHECK=CONSTRAINED_BUT_SUPPORTED[\s\S]*MEMORY_OBSERVED_BYTES=8323530752[\s\S]*MEMORY_REQUIRED_MINIMUM_BYTES=4294967296/u,
  );
  assert.match(
    output,
    /DISK_CHECK=ADEQUATE[\s\S]*IMAGE_CHECK=ADEQUATE/u,
  );
  assert.doesNotMatch(
    output,
    /https?:|postgres(?:ql)?:|password|token|project.?id|container|identity|[.]sql/iu,
  );
});

test("managed child deadline is extended by verified progress but not arbitrary output", async () => {
  const run = async (line: string) => {
    const tracker =
      new DisposableSupabaseStartProgressTracker();
    return runManagedChild({
      executable: process.execPath,
      args: [
        "-e",
        `setTimeout(()=>process.stdout.write(${JSON.stringify(line)}),50);setTimeout(()=>process.exit(0),400)`,
      ],
      cwd: root,
      environment: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
      },
      timeoutMs: 300,
      terminationGraceMs: 50,
      killConfirmationMs: 500,
      stage: "SERVICE_BOOTSTRAP",
      onOutput: (outputEvent) =>
        tracker.consume(outputEvent).deadline,
    });
  };
  const progressed = await run(
    "Applying migration 0001_safe.sql...\n",
  );
  assert.equal(progressed.ok, true);
  const noise = await run("Still waiting...\n");
  assert.equal(noise.timedOut, true);
  assert.equal(noise.childExited, true);
});

test("timing diagnostic source is local-only and excludes content and fingerprint work", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/project004-disposable-start-timing-diagnostic.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /buildProject004RemoteDevCurriculumSql|buildProject004PrefixSemanticFingerprintSql|db push|db reset|--all/iu,
  );
  assert.match(source, /startDisposableStack/u);
  assert.match(source, /stopDisposableStack/u);
  assert.match(
    source,
    /REMOTE_ACCESS_PERFORMED=NO/u,
  );
});

test("Node 22 executable parser smoke performs no Docker, Supabase or remote operation", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-disposable-start-timing-diagnostic.ts",
      "--smoke",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "DISPOSABLE_START_PROGRESS_PARSER=PASS\n" +
      "PHASE_DEADLINE_CONTRACT=PASS\n" +
      "DOCKER_RESOURCE_CLASSIFIER=PASS\n" +
      "DOCKER_EXECUTION_PERFORMED=NO\n" +
      "SUPABASE_EXECUTION_PERFORMED=NO\n" +
      "REMOTE_ACCESS_PERFORMED=NO\n" +
      "REMOTE_MUTATION_PERFORMED=NO\n",
  );
});
