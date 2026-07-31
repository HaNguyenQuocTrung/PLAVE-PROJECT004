import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, lstatSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { assertProject004Workspace } from "./project004-identity.ts";
import {
  buildProject004RemoteRuntimeChildEnvironment,
  loadProject004RemoteRuntimeConfigFile,
  project004RemoteRuntimeContract,
  Project004RemoteRuntimeFailure,
  renderProject004RemoteRuntimeContractSmoke,
} from "./project004-remote-runtime-connection.ts";

function terminateChild(child: ChildProcess, signal: NodeJS.Signals) {
  if (!child.pid || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    // The child may have exited between the status check and signal.
  }
}

export async function startProject004RemoteRuntime(options?: {
  candidateRoot?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  spawnChild?: typeof spawn;
  onPrepared?: () => void;
}) {
  const root = assertProject004Workspace(
    options?.candidateRoot ?? process.cwd(),
  );
  const config = loadProject004RemoteRuntimeConfigFile(root);
  const childEnvironment =
    buildProject004RemoteRuntimeChildEnvironment(
      config,
      options?.environment ?? process.env,
    );
  const cachePath = resolve(
    root,
    project004RemoteRuntimeContract.cacheDirectory,
  );
  if (existsSync(cachePath)) {
    if (lstatSync(cachePath).isSymbolicLink()) {
      throw new Project004RemoteRuntimeFailure(
        "REMOTE_RUNTIME_CACHE_SYMLINK_REJECTED",
      );
    }
    rmSync(cachePath, { recursive: true, force: true });
  }
  const nextBin = resolve(
    root,
    "node_modules/next/dist/bin/next",
  );
  const spawnChild = options?.spawnChild ?? spawn;
  options?.onPrepared?.();
  const child = spawnChild(
    process.execPath,
    [
      nextBin,
      "dev",
      "--hostname",
      project004RemoteRuntimeContract.loopbackHost,
      "--port",
      String(project004RemoteRuntimeContract.loopbackPort),
    ],
    {
      cwd: root,
      env: childEnvironment,
      stdio: "inherit",
      detached: process.platform !== "win32",
    },
  );

  let stopping = false;
  const stop = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    terminateChild(child, signal);
  };
  const onSigint = () => stop("SIGTERM");
  const onSigterm = () => stop("SIGTERM");
  const removeSignalListeners = () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  };
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  return await new Promise<number>((resolveExit, reject) => {
    child.once("error", (error) => {
      removeSignalListeners();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      removeSignalListeners();
      if (signal && !stopping) {
        resolveExit(1);
        return;
      }
      resolveExit(code ?? 0);
    });
  });
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    const output = renderProject004RemoteRuntimeContractSmoke();
    process.stdout.write(output);
    if (
      !output.includes("REMOTE_RUNTIME_CONFIG_CONTRACT=PASS")
    ) {
      process.exitCode = 1;
    }
  } else {
    try {
      process.exitCode = await startProject004RemoteRuntime({
        onPrepared: () => {
          process.stdout.write(
            [
              "PROJECT004_CANONICAL=PASS",
              "REMOTE_RUNTIME_TARGET_GUARD=PASS",
              "REMOTE_RUNTIME_SECRET_BOUNDARY=PASS",
              "REMOTE_RUNTIME_LOOPBACK_ONLY=PASS",
              "REMOTE_RUNTIME_START=BEGIN",
              "",
            ].join("\n"),
          );
        },
      });
    } catch (error) {
      const code =
        error instanceof Project004RemoteRuntimeFailure
          ? error.code
          : "REMOTE_RUNTIME_START_FAILED";
      process.stdout.write(
        [
          "REMOTE_RUNTIME_START=FAIL",
          `ROOT_FAILURE_CODE=${code}`,
          "",
        ].join("\n"),
      );
      process.exitCode = 1;
    }
  }
}
