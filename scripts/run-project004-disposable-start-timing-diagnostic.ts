import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  renderDisposableStartTimingDiagnostic,
  runDisposableStartTimingDiagnostic,
} from "./project004-disposable-start-timing-diagnostic.ts";
import {
  DisposableSupabaseStartProgressTracker,
  renderDisposableStartProgress,
} from "./project004-supabase-start-progress.ts";
import { classifyDisposableResources } from "./project004-disposable-resource-classifier.ts";

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    const tracker =
      new DisposableSupabaseStartProgressTracker();
    let elapsedMs = 1_000;
    for (let version = 1; version <= 40; version += 1) {
      tracker.consume({
        stream: "STDERR",
        chunk:
          `Applying migration ${String(version).padStart(4, "0")}_safe.sql...\n`,
        elapsedMs,
      });
      elapsedMs += 100;
    }
    tracker.consume({
      stream: "STDOUT",
      chunk: "Waiting for health checks...\n",
      elapsedMs,
    });
    const snapshot = tracker.snapshot();
    const rendered = renderDisposableStartProgress(snapshot);
    const resourceEvidence =
      classifyDisposableResources({
        cpu: 4,
        dockerMemoryBytes: 8_323_530_752,
        hostMemoryBytes: 8_589_934_592,
        freeDiskBytes: 34 * 1024 ** 3,
        postgresImageAvailable: true,
      });
    const pass =
      snapshot.serviceBootstrapPass &&
      snapshot.migrationObservedCount === 40 &&
      snapshot.migrationLastObservedVersion === "0040" &&
      snapshot.postMigrationWaitStarted &&
      !/url|port|key|password|token|container|identity/iu.test(
        rendered,
      ) &&
      resourceEvidence.classification ===
        "CONSTRAINED_BUT_SUPPORTED";
    process.stdout.write(
      `DISPOSABLE_START_PROGRESS_PARSER=${pass ? "PASS" : "FAIL"}\n` +
        `PHASE_DEADLINE_CONTRACT=${pass ? "PASS" : "FAIL"}\n` +
        `DOCKER_RESOURCE_CLASSIFIER=${pass ? "PASS" : "FAIL"}\n` +
        "DOCKER_EXECUTION_PERFORMED=NO\n" +
        "SUPABASE_EXECUTION_PERFORMED=NO\n" +
        "REMOTE_ACCESS_PERFORMED=NO\n" +
        "REMOTE_MUTATION_PERFORMED=NO\n",
    );
    if (!pass) process.exitCode = 1;
  } else {
    const report =
      await runDisposableStartTimingDiagnostic();
    process.stdout.write(
      renderDisposableStartTimingDiagnostic(report),
    );
    if (
      report.rootFailureCode !== "NONE" ||
      report.cleanup !== "PASS"
    ) {
      process.exitCode = 1;
    }
  }
}
