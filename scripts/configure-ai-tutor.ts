import { existsSync, openSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { ReadStream as TtyReadStream, WriteStream as TtyWriteStream } from "node:tty";

import {
  AI_TUTOR_CONFIG_LOCK_NAME,
  AiTutorConfigurationLockError,
  acquireConfigurationLock,
  mergeEnvironmentValues,
  writeEnvironmentAtomically,
  type ConfigurationLock,
} from "../lib/ai-tutor/configure-transaction.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

type ConfigurableProvider = "OPENAI" | "GOOGLE" | "DEEPSEEK";

const PROVIDERS = new Set<ConfigurableProvider>(["OPENAI", "GOOGLE", "DEEPSEEK"]);
const canonicalRoot = assertProject004Workspace();
const requestedTestRoot = process.env.PLAVE_AI_TUTOR_CONFIG_TEST_ROOT;
const temporaryRoot = resolve(tmpdir());
const root =
  process.env.NODE_ENV === "test" && requestedTestRoot
    ? resolve(requestedTestRoot)
    : canonicalRoot;
const useTestStdio =
  process.env.NODE_ENV === "test" &&
  Boolean(requestedTestRoot) &&
  process.env.PLAVE_AI_TUTOR_CONFIG_TEST_STDIO === "1";
const testInterruptStep =
  process.env.NODE_ENV === "test" && useTestStdio
    ? process.env.PLAVE_AI_TUTOR_CONFIG_TEST_INTERRUPT_STEP
    : undefined;
const testAnswers =
  process.env.NODE_ENV === "test" && useTestStdio && process.env.PLAVE_AI_TUTOR_CONFIG_TEST_ANSWERS
    ? JSON.parse(process.env.PLAVE_AI_TUTOR_CONFIG_TEST_ANSWERS) as string[]
    : undefined;
if (
  root !== canonicalRoot &&
  !(root === temporaryRoot || root.startsWith(`${temporaryRoot}${sep}`))
) {
  throw new Error("AI_TUTOR_TEST_ROOT_INVALID");
}
const target = resolve(root, ".env.local");
const lockPath = resolve(root, AI_TUTOR_CONFIG_LOCK_NAME);
const ttyPath = "/dev/tty";

class MaskedTtyOutput extends Writable {
  muted = false;
  readonly isTTY = true;
  private readonly destination: TtyWriteStream;

  constructor(destination: TtyWriteStream) {
    super();
    this.destination = destination;
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    if (this.muted) {
      callback();
      return;
    }
    this.destination.write(chunk, encoding, callback);
  }
}

async function openPromptSession(testStdio = false) {
  if (!testStdio && !existsSync(ttyPath)) throw new Error("AI_TUTOR_TTY_REQUIRED");
  const input = testStdio
    ? process.stdin
    : new TtyReadStream(openSync(ttyPath, "r"));
  const destination = testStdio
    ? process.stdout
    : new TtyWriteStream(openSync(ttyPath, "w"));
  const output = new MaskedTtyOutput(destination);
  const reader = createInterface({ input, output, terminal: true });
  const interrupt = new AbortController();
  reader.on("SIGINT", () => interrupt.abort());

  let promptStep = 0;
  const ask = async (prompt: string, masked: boolean) => {
    promptStep += 1;
    destination.write(prompt);
    output.muted = masked;
    try {
      if (testInterruptStep === String(promptStep)) {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        throw error;
      }
      const value = testAnswers
        ? (testAnswers.shift() ?? "")
        : await reader.question("", { signal: interrupt.signal });
      if (value.length > 1_024) throw new Error("AI_TUTOR_CONFIG_VALUE_TOO_LONG");
      return value.trim();
    } finally {
      output.muted = false;
      if (masked) destination.write("\n");
    }
  };
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    reader.close();
    output.end();
    if (!testStdio) {
      destination.end();
      input.destroy();
    }
  };
  return { ask, close };
}

function existingValue(content: string, key: string) {
  const match = content.match(new RegExp(`^${key}=([^\\r\\n]*)$`, "mu"));
  return match?.[1]?.trim() || null;
}

function validateKey(value: string) {
  return value.length >= 20 && value.length <= 512 && !/\s/u.test(value);
}

function validateModel(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,79}$/u.test(value);
}

let lock: ConfigurationLock | null = null;
let promptSession: Awaited<ReturnType<typeof openPromptSession>> | null = null;

try {
  lock = acquireConfigurationLock({ lockPath });
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  const existingProvider = existingValue(current, "PLAVE_AI_PROVIDER")?.toUpperCase();
  const defaultProvider = PROVIDERS.has(existingProvider as ConfigurableProvider)
    ? (existingProvider as ConfigurableProvider)
    : "GOOGLE";

  promptSession = await openPromptSession(useTestStdio);
  const enteredProvider = (
    await promptSession.ask(
      `Provider [${defaultProvider}] (OPENAI/GOOGLE/DEEPSEEK): `,
      false,
    )
  ).toUpperCase();
  const provider = (enteredProvider || defaultProvider) as ConfigurableProvider;
  if (!PROVIDERS.has(provider)) throw new Error("AI_TUTOR_PROVIDER_INVALID");

  let key: string | null;
  let model: string | null;
  let keyName: string;
  let modelName: string;
  if (provider === "GOOGLE") {
    key = existingValue(current, "GOOGLE_API_KEY");
    if (!key) key = await promptSession.ask("Nhập GOOGLE_API_KEY (được ẩn): ", true);
    model = existingValue(current, "GOOGLE_AI_MODEL") || "gemini-3.6-flash";
    keyName = "GOOGLE_API_KEY";
    modelName = "GOOGLE_AI_MODEL";
  } else if (provider === "OPENAI") {
    key = existingValue(current, "OPENAI_API_KEY");
    if (!key) key = await promptSession.ask("Nhập OPENAI_API_KEY (được ẩn): ", true);
    model = existingValue(current, "OPENAI_MODEL");
    if (!model) model = await promptSession.ask("OPENAI_MODEL (bắt buộc): ", false);
    if (model === "gpt-5.6-sol") throw new Error("AI_TUTOR_MODEL_NOT_ALLOWED");
    keyName = "OPENAI_API_KEY";
    modelName = "OPENAI_MODEL";
  } else {
    key = existingValue(current, "DEEPSEEK_API_KEY");
    if (!key) key = await promptSession.ask("Nhập DEEPSEEK_API_KEY (được ẩn): ", true);
    model = existingValue(current, "DEEPSEEK_MODEL");
    if (!model) model = await promptSession.ask("DEEPSEEK_MODEL (bắt buộc): ", false);
    keyName = "DEEPSEEK_API_KEY";
    modelName = "DEEPSEEK_MODEL";
  }
  if (!key || !validateKey(key) || !model || !validateModel(model)) {
    throw new Error("AI_TUTOR_CONFIGURATION_INVALID");
  }

  const next = mergeEnvironmentValues(current, [
    ["PLAVE_AI_TUTOR_ENABLED", "true"],
    ["PLAVE_AI_PROVIDER", provider],
    [keyName, key],
    [modelName, model],
  ]);
  writeEnvironmentAtomically(target, next);
  process.stdout.write(
    [
      `AI_TUTOR_PROVIDER=${provider}`,
      "AI_TUTOR_KEY_CONFIGURED=YES",
      "AI_TUTOR_KEY_FILE_MODE=0600",
      "AI_TUTOR_KEY_LOGGED=NO",
      `AI_TUTOR_STALE_LOCK_RECOVERED=${lock.recoveredStaleOwnerPid ? "YES" : "NO"}`,
    ].join("\n") + "\n",
  );
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    process.stderr.write("AI_TUTOR_CONFIGURATION_CANCELLED\n");
    process.exitCode = 130;
  } else if (error instanceof AiTutorConfigurationLockError) {
    process.stderr.write(
      [
        error.code,
        `AI_TUTOR_LOCK_PATH=${AI_TUTOR_CONFIG_LOCK_NAME}`,
        `AI_TUTOR_LOCK_OWNER_PID=${error.ownerPid ?? "UNKNOWN"}`,
      ].join("\n") + "\n",
    );
    process.exitCode = 73;
  } else if (error instanceof Error && /^AI_TUTOR_[A-Z0-9_]+$/u.test(error.message)) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  promptSession?.close();
  lock?.release();
}
