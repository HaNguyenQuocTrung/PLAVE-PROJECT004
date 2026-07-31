import {
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";

export type ManagedChildTerminationReason =
  | "NONE"
  | "TIMEOUT"
  | "SIGINT"
  | "SIGTERM";

export type ManagedChildResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  terminationReason: ManagedChildTerminationReason;
  termSent: boolean;
  killSent: boolean;
  childExited: boolean;
  elapsedMs: number;
  executionElapsedMs: number;
  terminationElapsedMs: number;
  spawnErrorCode: string;
};

type ManagedChildHeartbeat = {
  stage: string;
  elapsedMs: number;
};

export type ManagedChildOutputEvent = {
  stream: "STDOUT" | "STDERR";
  chunk: string;
  elapsedMs: number;
};

export type ManagedChildDeadlineUpdate = {
  timeoutMs: number;
};

export type ManagedChildOptions = {
  executable: string;
  args: string[];
  cwd: string;
  environment: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs: number;
  terminationGraceMs?: number;
  killConfirmationMs?: number;
  heartbeatMs?: number;
  maxBufferBytes?: number;
  abortSignal?: AbortSignal;
  stage: string;
  onHeartbeat?: (heartbeat: ManagedChildHeartbeat) => void;
  onOutput?: (
    event: ManagedChildOutputEvent,
  ) => ManagedChildDeadlineUpdate | undefined;
};

function appendBounded(
  current: string,
  chunk: Buffer | string,
  maximumBytes: number,
) {
  if (Buffer.byteLength(current) >= maximumBytes) {
    return current;
  }
  const value =
    typeof chunk === "string" ? chunk : chunk.toString("utf8");
  const remaining =
    maximumBytes - Buffer.byteLength(current);
  if (Buffer.byteLength(value) <= remaining) {
    return current + value;
  }
  return current + Buffer.from(value).subarray(0, remaining).toString("utf8");
}

function abortReason(
  signal: AbortSignal,
): "SIGINT" | "SIGTERM" {
  return signal.reason === "SIGTERM" ? "SIGTERM" : "SIGINT";
}

function signalManagedProcessGroup(
  child: ChildProcessWithoutNullStreams,
  signal: NodeJS.Signals,
) {
  if (typeof child.pid !== "number") return;
  try {
    process.kill(-child.pid, signal);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return;
  }
  try {
    child.kill(signal);
  } catch {
    // The close/error event remains the source of truth.
  }
}

export function runManagedChild(
  options: ManagedChildOptions,
): Promise<ManagedChildResult> {
  if (
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs <= 0
  ) {
    throw new Error("MANAGED_CHILD_TIMEOUT_INVALID");
  }
  const startedAt = Date.now();
  const terminationGraceMs =
    options.terminationGraceMs ?? 5_000;
  const killConfirmationMs =
    options.killConfirmationMs ?? 5_000;
  const heartbeatMs = options.heartbeatMs ?? 30_000;
  const maximumBytes =
    options.maxBufferBytes ?? 32 * 1024 * 1024;
  let stdout = "";
  let stderr = "";
  let settled = false;
  let closed = false;
  let status: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;
  let spawnErrorCode = "NONE";
  let terminationReason: ManagedChildTerminationReason =
    "NONE";
  let termSent = false;
  let killSent = false;
  let terminationStartedAt: number | null = null;

  return new Promise((resolveResult) => {
    const child = spawn(options.executable, options.args, {
      cwd: options.cwd,
      env: options.environment,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let terminationTimer:
      | ReturnType<typeof setTimeout>
      | undefined;
    let killConfirmationTimer:
      | ReturnType<typeof setTimeout>
      | undefined;

    let timeoutTimer: ReturnType<typeof setTimeout>;
    const armTimeout = (timeoutMs: number) => {
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs <= 0
      ) {
        return;
      }
      if (timeoutTimer) clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => {
        requestTermination("TIMEOUT");
      }, timeoutMs);
    };
    armTimeout(options.timeoutMs);

    const heartbeatTimer = setInterval(() => {
      options.onHeartbeat?.({
        stage: options.stage,
        elapsedMs: Math.max(0, Date.now() - startedAt),
      });
    }, heartbeatMs);

    const onAbort = () => {
      if (options.abortSignal) {
        requestTermination(abortReason(options.abortSignal));
      }
    };

    const clearManagedResources = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      clearInterval(heartbeatTimer);
      if (terminationTimer) clearTimeout(terminationTimer);
      if (killConfirmationTimer) {
        clearTimeout(killConfirmationTimer);
      }
      options.abortSignal?.removeEventListener(
        "abort",
        onAbort,
      );
    };

    const settle = (childExited: boolean) => {
      if (settled) return;
      settled = true;
      clearManagedResources();
      const finishedAt = Date.now();
      const elapsedMs = Math.max(0, finishedAt - startedAt);
      const executionElapsedMs =
        terminationStartedAt === null
          ? elapsedMs
          : Math.max(0, terminationStartedAt - startedAt);
      resolveResult({
        ok:
          childExited &&
          terminationReason === "NONE" &&
          status === 0 &&
          exitSignal === null &&
          spawnErrorCode === "NONE",
        stdout,
        stderr,
        status,
        signal: exitSignal,
        timedOut: terminationReason === "TIMEOUT",
        terminationReason,
        termSent,
        killSent,
        childExited,
        elapsedMs,
        executionElapsedMs,
        terminationElapsedMs:
          elapsedMs - executionElapsedMs,
        spawnErrorCode,
      });
    };

    function requestTermination(
      reason: Exclude<ManagedChildTerminationReason, "NONE">,
    ) {
      if (terminationReason !== "NONE" || closed) return;
      terminationReason = reason;
      terminationStartedAt = Date.now();
      termSent = true;
      signalManagedProcessGroup(child, "SIGTERM");
      terminationTimer = setTimeout(() => {
        if (closed) return;
        killSent = true;
        signalManagedProcessGroup(child, "SIGKILL");
        killConfirmationTimer = setTimeout(() => {
          if (!closed) settle(false);
        }, killConfirmationMs);
      }, terminationGraceMs);
    }

    const captureOutput = (
      stream: "STDOUT" | "STDERR",
      chunk: Buffer,
    ) => {
      if (stream === "STDOUT") {
        stdout = appendBounded(stdout, chunk, maximumBytes);
      } else {
        stderr = appendBounded(stderr, chunk, maximumBytes);
      }
      const update = options.onOutput?.({
        stream,
        chunk: chunk.toString("utf8"),
        elapsedMs: Math.max(0, Date.now() - startedAt),
      });
      if (
        update &&
        terminationReason === "NONE" &&
        !closed
      ) {
        armTimeout(update.timeoutMs);
      }
    };
    child.stdout.on("data", (chunk: Buffer) => {
      captureOutput("STDOUT", chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      captureOutput("STDERR", chunk);
    });
    child.stdin.on("error", () => {
      // Early child exit can close stdin before input is fully written.
    });
    child.once("error", (error: NodeJS.ErrnoException) => {
      spawnErrorCode = error.code ?? "SPAWN_ERROR";
    });
    child.once("close", (code, signal) => {
      closed = true;
      status = code;
      exitSignal = signal;
      settle(true);
    });

    options.abortSignal?.addEventListener(
      "abort",
      onAbort,
      { once: true },
    );
    if (options.abortSignal?.aborted) {
      onAbort();
    }
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });
}
