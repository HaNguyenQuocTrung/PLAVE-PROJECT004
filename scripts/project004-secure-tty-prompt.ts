import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  openSync,
  readSync,
  writeSync,
} from "node:fs";

export type SecurePromptFailureCode =
  | "SECURE_PROMPT_CANCELLED"
  | "SECURE_TTY_UNAVAILABLE"
  | "SECURE_TTY_CONFIGURATION_FAILED"
  | "SECURE_TTY_READ_FAILED"
  | "SECURE_PROMPT_TIMEOUT";

export type SecurePromptResult =
  | { ok: true; value: string }
  | { ok: false; code: SecurePromptFailureCode };

export type SecureTtyAdapter = {
  open: () => number;
  close: (fd: number) => void;
  write: (fd: number, value: string) => void;
  read: (fd: number, buffer: Buffer) => number;
  readMode: (fd: number) => string | null;
  setMaskedMode: (fd: number) => boolean;
  restoreMode: (fd: number, mode: string) => boolean;
  now: () => number;
};

function runStty(
  fd: number,
  args: string[],
  captureOutput = false,
) {
  const result = spawnSync("/bin/stty", args, {
    env: process.env,
    encoding: "utf8",
    stdio: [
      fd,
      captureOutput ? "pipe" : "ignore",
      "ignore",
    ],
    timeout: 5_000,
  });
  return {
    ok: result.status === 0 && result.signal === null,
    stdout:
      captureOutput && typeof result.stdout === "string"
        ? result.stdout
        : "",
  };
}

export const systemSecureTtyAdapter: SecureTtyAdapter = {
  open: () => openSync("/dev/tty", constants.O_RDWR),
  close: (fd) => closeSync(fd),
  write: (fd, value) => {
    writeSync(fd, value);
  },
  read: (fd, buffer) =>
    readSync(fd, buffer, 0, buffer.length, null),
  readMode: (fd) => {
    const result = runStty(fd, ["-g"], true);
    const mode = result.stdout.trim();
    return result.ok && mode ? mode : null;
  },
  setMaskedMode: (fd) =>
    runStty(
      fd,
      [
        "-echo",
        "-icanon",
        "-isig",
        "min",
        "0",
        "time",
        "1",
      ],
    ).ok,
  restoreMode: (fd, mode) => runStty(fd, [mode]).ok,
  now: () => Date.now(),
};

function cancelledByte(byte: number) {
  return byte === 0x03 || byte === 0x04 || byte === 0x1b;
}

export function readMaskedLineFromControllingTty(options: {
  label: string;
  adapter?: SecureTtyAdapter;
  timeoutMs?: number;
  maxBytes?: number;
}): SecurePromptResult {
  const adapter = options.adapter ?? systemSecureTtyAdapter;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const maxBytes = options.maxBytes ?? 512;
  const inputBytes: number[] = [];
  const buffer = Buffer.alloc(1024);
  let fd: number | null = null;
  let savedMode: string | null = null;
  let promptWritten = false;

  try {
    try {
      fd = adapter.open();
    } catch {
      return { ok: false, code: "SECURE_TTY_UNAVAILABLE" };
    }

    savedMode = adapter.readMode(fd);
    if (!savedMode) {
      return {
        ok: false,
        code: "SECURE_TTY_CONFIGURATION_FAILED",
      };
    }
    if (!adapter.setMaskedMode(fd)) {
      return {
        ok: false,
        code: "SECURE_TTY_CONFIGURATION_FAILED",
      };
    }

    adapter.write(fd, options.label);
    promptWritten = true;
    const deadline = adapter.now() + timeoutMs;

    while (adapter.now() < deadline) {
      let bytesRead = 0;
      try {
        bytesRead = adapter.read(fd, buffer);
      } catch {
        return { ok: false, code: "SECURE_TTY_READ_FAILED" };
      }
      if (bytesRead === 0) continue;

      for (let index = 0; index < bytesRead; index += 1) {
        const byte = buffer[index] ?? 0;
        if (cancelledByte(byte)) {
          return {
            ok: false,
            code: "SECURE_PROMPT_CANCELLED",
          };
        }
        if (byte === 0x0a || byte === 0x0d) {
          return {
            ok: true,
            value: Buffer.from(inputBytes).toString("utf8"),
          };
        }
        if (byte === 0x08 || byte === 0x7f) {
          inputBytes.pop();
          continue;
        }
        if (inputBytes.length < maxBytes) {
          inputBytes.push(byte);
        }
      }
    }
    return { ok: false, code: "SECURE_PROMPT_TIMEOUT" };
  } finally {
    buffer.fill(0);
    inputBytes.fill(0);
    if (fd !== null) {
      if (promptWritten) {
        try {
          adapter.write(fd, "\n");
        } catch {
          // Terminal restoration still runs below.
        }
      }
      if (savedMode) {
        try {
          adapter.restoreMode(fd, savedMode);
        } catch {
          // Closing the controlling terminal is still required.
        }
      }
      try {
        adapter.close(fd);
      } catch {
        // The terminal may already have disappeared.
      }
    }
  }
}
