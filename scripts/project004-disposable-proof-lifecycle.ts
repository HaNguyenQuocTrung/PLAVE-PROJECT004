import {
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const disposableProofStageTimeoutMs = {
  WORKSPACE_PREPARATION: 30_000,
  SERVICE_BOOTSTRAP: 180_000,
  MIGRATION_EXECUTION: 420_000,
  POST_MIGRATION_WAIT: 60_000,
  RUNTIME_HISTORY_QUERY: 30_000,
  SEMANTIC_FINGERPRINT: 60_000,
  CONTENT_TRANSACTION: 420_000,
  POST_APPLY_DIAGNOSTIC: 60_000,
  ACTIVATION_PREFLIGHT: 60_000,
  ACTIVATION_TRANSACTION: 60_000,
  ACTIVATION_JOURNEY: 180_000,
  DEACTIVATION_TRANSACTION: 60_000,
  CLEANUP: 120_000,
} as const;

export type DisposableProofStage =
  keyof typeof disposableProofStageTimeoutMs;

export type DisposableProofRunState = {
  version: "PROJECT004_DISPOSABLE_PROOF_RUN_STATE_V1";
  stage: DisposableProofStage;
  status:
    | "STARTED"
    | "PASS"
    | "FAIL"
    | "INTERRUPTED"
    | "TIMEOUT";
  sequence: number;
  durationMs: number;
  signal: "NONE" | "SIGINT" | "SIGTERM";
};

export const disposableProofRunStateRelativePath =
  "supabase/.temp/project004-proof-run-state.json";

export class DisposableProofInterruptedError extends Error {
  readonly signal: "SIGINT" | "SIGTERM";

  constructor(signal: "SIGINT" | "SIGTERM") {
    super(`DISPOSABLE_PROOF_INTERRUPTED_${signal}`);
    this.name = "DisposableProofInterruptedError";
    this.signal = signal;
  }
}

export class DisposableProofLifecycle {
  private workdir = "";
  private sequence = 0;
  private stageStartedAt = 0;
  private stateValue?: DisposableProofRunState;
  private readonly emit: (line: string) => void;
  private readonly now: () => number;
  private signalValue: "NONE" | "SIGINT" | "SIGTERM" =
    "NONE";

  constructor(options?: {
    emit?: (line: string) => void;
    now?: () => number;
  }) {
    this.emit =
      options?.emit ??
      ((line) => {
        process.stdout.write(`${line}\n`);
      });
    this.now = options?.now ?? (() => Date.now());
  }

  attachWorkdir(workdir: string) {
    this.workdir = resolve(workdir);
    if (this.stateValue) this.persist();
  }

  detachWorkdir() {
    this.workdir = "";
  }

  begin(stage: DisposableProofStage) {
    this.sequence += 1;
    this.stageStartedAt = this.now();
    this.stateValue = {
      version: "PROJECT004_DISPOSABLE_PROOF_RUN_STATE_V1",
      stage,
      status: "STARTED",
      sequence: this.sequence,
      durationMs: 0,
      signal: this.signalValue,
    };
    this.emit(`DISPOSABLE_PROGRESS=${stage}:START`);
    this.persist();
  }

  finish(
    status: "PASS" | "FAIL" | "TIMEOUT",
  ) {
    if (!this.stateValue) return;
    const durationMs = Math.max(
      0,
      this.now() - this.stageStartedAt,
    );
    this.stateValue = {
      ...this.stateValue,
      status,
      durationMs,
      signal: this.signalValue,
    };
    this.emit(
      `DISPOSABLE_PROGRESS=${this.stateValue.stage}:${status}:${String(durationMs)}ms`,
    );
    this.persist();
  }

  heartbeat(stage: string, elapsedMs: number) {
    const safeStage = /^(?:[A-Z][A-Z0-9_]{1,63})$/u.test(
      stage,
    )
      ? stage
      : "UNKNOWN_STAGE";
    this.emit(
      `DISPOSABLE_HEARTBEAT=${safeStage}:${String(Math.max(0, Math.trunc(elapsedMs)))}ms`,
    );
  }

  currentStageElapsedMs() {
    if (!this.stateValue) return 0;
    return Math.max(0, this.now() - this.stageStartedAt);
  }

  interrupt(signal: "SIGINT" | "SIGTERM") {
    if (this.signalValue !== "NONE") return;
    this.signalValue = signal;
    if (this.stateValue) {
      this.stateValue = {
        ...this.stateValue,
        status: "INTERRUPTED",
        durationMs: Math.max(
          0,
          this.now() - this.stageStartedAt,
        ),
        signal,
      };
      this.persist();
    }
    this.emit(`DISPOSABLE_SIGNAL=${signal}:RECEIVED`);
  }

  throwIfInterrupted() {
    if (this.signalValue !== "NONE") {
      throw new DisposableProofInterruptedError(
        this.signalValue,
      );
    }
  }

  get state() {
    return this.stateValue
      ? { ...this.stateValue }
      : undefined;
  }

  get signal() {
    return this.signalValue;
  }

  private persist() {
    if (!this.workdir || !this.stateValue) return;
    const markerPath = resolve(
      this.workdir,
      disposableProofRunStateRelativePath,
    );
    mkdirSync(dirname(markerPath), {
      recursive: true,
      mode: 0o700,
    });
    writeFileSync(
      markerPath,
      `${JSON.stringify(this.stateValue)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }
}

export function installDisposableProofSignalHandlers(
  lifecycle: DisposableProofLifecycle,
) {
  const controller = new AbortController();
  let handled = false;
  const interrupt = (signal: "SIGINT" | "SIGTERM") => {
    if (handled) return;
    handled = true;
    lifecycle.interrupt(signal);
    controller.abort(signal);
  };
  const onSigint = () => interrupt("SIGINT");
  const onSigterm = () => interrupt("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  return {
    signal: controller.signal,
    dispose() {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    },
  };
}
