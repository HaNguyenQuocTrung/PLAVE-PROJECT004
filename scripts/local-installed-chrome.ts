import { spawn, type ChildProcess } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const DISPOSABLE_BROWSER_ROOT = "/private/tmp";

const candidates = [
  process.env.PLAVE_LOCAL_BROWSER_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  `${process.env.HOME ?? ""}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  `${process.env.HOME ?? ""}/Applications/Chromium.app/Contents/MacOS/Chromium`,
].filter((value): value is string => Boolean(value));

export function findInstalledBrowser() {
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through the explicit local executable inventory.
    }
  }
  throw new Error("PLAVE_LOCAL_BROWSER_EXECUTABLE_MISSING");
}

type CdpEvent = Readonly<{ method: string; params?: Record<string, unknown> }>;

class CdpConnection {
  private nextId = 1;
  private readonly pending = new Map<number, {
    resolve: (value: Record<string, unknown>) => void;
    reject: (error: Error) => void;
  }>();
  private readonly listeners = new Map<string, Set<(params: Record<string, unknown>) => void>>();
  private readonly socket: WebSocket;

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpEvent & {
        id?: number;
        result?: Record<string, unknown>;
        error?: { message?: string };
      };
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message ?? "CDP_COMMAND_FAILED"));
        else pending.resolve(message.result ?? {});
        return;
      }
      if (!message.method) return;
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) pending.reject(new Error("CDP_CONNECTION_CLOSED"));
      this.pending.clear();
    });
  }

  static connect(url: string) {
    return new Promise<CdpConnection>((resolvePromise, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener("open", () => resolvePromise(new CdpConnection(socket)), { once: true });
      socket.addEventListener("error", () => reject(new Error("CDP_CONNECTION_FAILED")), { once: true });
    });
  }

  send(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextId++;
    return new Promise<Record<string, unknown>>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP_COMMAND_TIMEOUT_${method}`));
      }, 20_000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); resolvePromise(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method: string, timeoutMs = 20_000) {
    return new Promise<Record<string, unknown>>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.off(method, listener);
        reject(new Error(`CDP_EVENT_TIMEOUT_${method}`));
      }, timeoutMs);
      const listener = (params: Record<string, unknown>) => {
        clearTimeout(timeout);
        this.off(method, listener);
        resolvePromise(params);
      };
      this.on(method, listener);
    });
  }

  on(method: string, listener: (params: Record<string, unknown>) => void) {
    const listeners = this.listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
  }

  off(method: string, listener: (params: Record<string, unknown>) => void) {
    this.listeners.get(method)?.delete(listener);
  }

  close() {
    this.socket.close();
  }
}

export type LocalChromePage = Readonly<{
  cdp: CdpConnection;
  evaluate: <T>(expression: string) => Promise<T>;
  navigate: (url: string) => Promise<void>;
  reload: () => Promise<void>;
  screenshot: () => Promise<Buffer>;
}>;

export type LocalChrome = Readonly<{
  executable: string;
  temporaryRoot: string;
  browser: CdpConnection;
  newPage: (url?: string) => Promise<LocalChromePage>;
}>;

async function waitForDevTools(temporaryRoot: string, child: ChildProcess) {
  const activePort = join(temporaryRoot, "profile", "DevToolsActivePort");
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("PLAVE_LOCAL_BROWSER_EXITED_EARLY");
    if (existsSync(activePort)) {
      const [port, path] = readFileSync(activePort, "utf8").trim().split("\n");
      if (/^\d+$/u.test(port ?? "") && path?.startsWith("/devtools/browser/")) {
        return { port: Number(port), url: `ws://127.0.0.1:${port}${path}` };
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error("PLAVE_LOCAL_BROWSER_DEVTOOLS_TIMEOUT");
}

async function stopBrowser(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolvePromise) => child.once("exit", () => resolvePromise())),
    new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 4_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

export async function withLocalInstalledChrome<T>(operation: (chrome: LocalChrome) => Promise<T>) {
  const executable = findInstalledBrowser();
  const temporaryRoot = mkdtempSync(join(DISPOSABLE_BROWSER_ROOT, "plave-local-chrome-"));
  const profile = join(temporaryRoot, "profile");
  mkdirSync(profile, { recursive: true, mode: 0o700 });
  const child = spawn(executable, [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-sync",
    "--disable-save-password-bubble",
    "--metrics-recording-only",
    "--safebrowsing-disable-auto-update",
    "--disable-features=OptimizationHints,MediaRouter,Translate,PasswordLeakDetection,PasswordManagerOnboarding",
    "--use-mock-keychain",
    "--password-store=basic",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
    "--remote-debugging-port=0",
    "--remote-allow-origins=*",
    `--user-data-dir=${profile}`,
    "about:blank",
  ], {
    env: {
      HOME: temporaryRoot,
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
      TMPDIR: DISPOSABLE_BROWSER_ROOT,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
    },
    stdio: "ignore",
  });
  let browser: CdpConnection | null = null;
  try {
    const devtools = await waitForDevTools(temporaryRoot, child);
    browser = await CdpConnection.connect(devtools.url);
    const newPage = async (url = "about:blank") => {
      const response = await fetch(`http://127.0.0.1:${String(devtools.port)}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
      if (!response.ok) throw new Error("PLAVE_LOCAL_BROWSER_TARGET_CREATE_FAILED");
      const target = await response.json() as { webSocketDebuggerUrl?: string };
      if (!target.webSocketDebuggerUrl) throw new Error("PLAVE_LOCAL_BROWSER_TARGET_MAPPING_FAILED");
      const cdp = await CdpConnection.connect(target.webSocketDebuggerUrl);
      await Promise.all([cdp.send("Page.enable"), cdp.send("Runtime.enable"), cdp.send("Network.enable"), cdp.send("Log.enable")]);
      const evaluate = async <Value>(expression: string) => {
        const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        const remote = result.result as { value?: Value; exceptionDetails?: unknown } | undefined;
        if (!remote || remote.exceptionDetails) throw new Error("PLAVE_LOCAL_BROWSER_EVALUATION_FAILED");
        return remote.value as Value;
      };
      const waitForCommittedDocument = async (
        expectedUrl: string,
        previousTimeOrigin: number,
        allowRedirect = false,
      ) => {
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
          try {
            const result = await evaluate<{ ready: string; href: string; timeOrigin: number }>(
              "({ready:document.readyState,href:location.href,timeOrigin:performance.timeOrigin})",
            );
            if (
              result.ready === "complete" &&
              (allowRedirect || result.href === expectedUrl) &&
              result.timeOrigin !== previousTimeOrigin
            ) return;
          } catch {
            // Execution context is replaced during navigation.
          }
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
        }
        throw new Error("PLAVE_LOCAL_BROWSER_NAVIGATION_TIMEOUT");
      };
      return {
        cdp,
        evaluate,
        navigate: async (nextUrl: string) => {
          const previousTimeOrigin = await evaluate<number>("performance.timeOrigin").catch(() => 0);
          await cdp.send("Page.navigate", { url: nextUrl });
          await waitForCommittedDocument(nextUrl, previousTimeOrigin, true);
        },
        reload: async () => {
          const expectedUrl = await evaluate<string>("location.href");
          const previousTimeOrigin = await evaluate<number>("performance.timeOrigin");
          await cdp.send("Page.reload", { ignoreCache: false });
          await waitForCommittedDocument(expectedUrl, previousTimeOrigin);
        },
        screenshot: async () => {
          const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
          if (typeof result.data !== "string") throw new Error("PLAVE_LOCAL_BROWSER_SCREENSHOT_FAILED");
          return Buffer.from(result.data, "base64");
        },
      } satisfies LocalChromePage;
    };
    return await operation({ executable, temporaryRoot, browser, newPage });
  } finally {
    try {
      await browser?.send("Browser.close");
    } catch {
      // Browser process cleanup below remains authoritative.
    }
    browser?.close();
    await stopBrowser(child);
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
