import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import {
  withLocalInstalledChrome,
  type LocalChromePage,
} from "./local-installed-chrome.ts";

const root = process.cwd();
const canonicalStorageKey = "sb-vvseikavrfhjchyrcgqi-auth-token";
const productionLocalUrl = "http://localhost:3000";
const temporaryRoots: string[] = [];

type BrowserReceipt = Readonly<{
  caseName: string;
  firstRenderMs: number;
  routes: readonly string[];
  consoleErrors: number;
  uncaughtExceptions: number;
  hydrationErrors: number;
  serviceWorkers: number;
  cacheEntries: number;
}>;

function wait(milliseconds: number) {
  return new Promise<void>((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForPath(page: LocalChromePage, expected: string, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await page
      .evaluate<{ path: string; heading: boolean }>(
        "({path:location.pathname,heading:Boolean(document.querySelector('main h1, main h2'))})",
      )
      .catch(() => ({ path: "", heading: false }));
    if (state.path === expected && state.heading) return;
    await wait(50);
  }
  throw new Error(`BROWSER_ROUTE_TIMEOUT_${expected.replaceAll("/", "_")}`);
}

async function assertPointerTarget(page: LocalChromePage, selector: string) {
  const expression = `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLElement)) return false;
    element.scrollIntoView({block: "center", inline: "center", behavior: "instant"});
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).pointerEvents !== "none" && Boolean(target && (target === element || element.contains(target)));
  })()`;
  if (!(await page.evaluate<boolean>(expression))) {
    throw new Error("BROWSER_POINTER_TARGET_BLOCKED");
  }
}

async function clickAndWait(page: LocalChromePage, selector: string, expected: string) {
  await assertPointerTarget(page, selector);
  const clicked = await page.evaluate<boolean>(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLElement)) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) throw new Error("BROWSER_CLICK_TARGET_MISSING");
  await waitForPath(page, expected);
}

async function keyboardActivateAndWait(
  page: LocalChromePage,
  selector: string,
  expected: string,
) {
  const focused = await page.evaluate<boolean>(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLElement)) return false;
    element.scrollIntoView({block: "center", inline: "center", behavior: "instant"});
    element.focus();
    return document.activeElement === element;
  })()`);
  if (!focused) throw new Error("BROWSER_KEYBOARD_TARGET_MISSING");
  await page.cdp.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await page.cdp.send("Input.dispatchKeyEvent", {
    type: "char",
    text: "\r",
    unmodifiedText: "\r",
  });
  await page.cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await waitForPath(page, expected);
}

async function browserCase(input: Readonly<{
  caseName: string;
  baseUrl: string;
  cookie?: Readonly<{ name: string; value: string }>;
  expectNotice?: "RECOVERED" | "UNAVAILABLE";
  expectCookieAfter?: boolean;
  protectedReason?: "auth-unavailable" | null;
}>) {
  let temporaryProfile = "";
  const receipt = await withLocalInstalledChrome(async (chrome) => {
    temporaryProfile = chrome.temporaryRoot;
    const page = await chrome.newPage();
    let consoleErrors = 0;
    let uncaughtExceptions = 0;
    let hydrationErrors = 0;
    page.cdp.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") consoleErrors += 1;
      const args = Array.isArray(params.args) ? params.args : [];
      if (
        args.some((entry) =>
          /hydration|uncaught/iu.test(
            String((entry as { value?: unknown }).value ?? ""),
          ),
        )
      ) {
        hydrationErrors += 1;
      }
    });
    page.cdp.on("Runtime.exceptionThrown", () => {
      uncaughtExceptions += 1;
    });

    if (input.cookie) {
      const result = await page.cdp.send("Network.setCookie", {
        name: input.cookie.name,
        value: input.cookie.value,
        url: `${input.baseUrl}/`,
        path: "/",
        sameSite: "Lax",
      });
      if (result.success !== true) throw new Error("BROWSER_SYNTHETIC_COOKIE_SETUP_FAILED");
    }

    const started = Date.now();
    await page.navigate(`${input.baseUrl}/`);
    const firstRenderMs = Date.now() - started;
    if (firstRenderMs > 6_000) throw new Error("BROWSER_FIRST_RENDER_UNBOUNDED");

    if (input.expectNotice) {
      const expectedText =
        input.expectNotice === "RECOVERED"
          ? "Phiên đăng nhập cũ"
          : "Tạm thời chưa thể xác minh đăng nhập";
      const notice = await page.evaluate<string>(
        "document.querySelector('.auth-session-notice')?.textContent ?? ''",
      );
      if (!notice.includes(expectedText)) throw new Error("BROWSER_AUTH_NOTICE_MISSING");
    }

    await clickAndWait(page, 'main a[href="/demo"]', "/demo");
    await clickAndWait(page, 'footer a[href="/privacy"]', "/privacy");
    await keyboardActivateAndWait(page, 'footer a[href="/about"]', "/about");
    const routes = ["/demo", "/privacy", "/about"];

    if (input.cookie) {
      const allCookies = (await page.cdp.send("Network.getAllCookies")) as {
        cookies?: Array<{ name?: unknown }>;
      };
      const retained =
        allCookies.cookies?.filter(({ name }) => name === input.cookie?.name).length ?? 0;
      if ((retained > 0) !== input.expectCookieAfter) {
        throw new Error("BROWSER_AUTH_COOKIE_RECOVERY_MISMATCH");
      }
    }

    await page.navigate(`${input.baseUrl}/dashboard`);
    await waitForPath(page, "/login");
    const protectedState = await page.evaluate<{ path: string; reason: string | null }>(
      "({path:location.pathname,reason:new URL(location.href).searchParams.get('error')})",
    );
    if (protectedState.path !== "/login") throw new Error("BROWSER_PROTECTED_ROUTE_BYPASS");
    if (protectedState.reason !== input.protectedReason) {
      throw new Error("BROWSER_PROTECTED_REDIRECT_REASON_MISMATCH");
    }

    const storage = await page.evaluate<{ serviceWorkers: number; cacheEntries: number }>(
      "Promise.all([navigator.serviceWorker?.getRegistrations?.() ?? [],caches?.keys?.() ?? []]).then(([workers,keys])=>({serviceWorkers:workers.length,cacheEntries:keys.length}))",
    );
    if (storage.serviceWorkers !== 0 || storage.cacheEntries !== 0) {
      throw new Error("BROWSER_UNEXPECTED_PERSISTENT_CACHE");
    }
    if (consoleErrors !== 0 || uncaughtExceptions !== 0 || hydrationErrors !== 0) {
      throw new Error("BROWSER_CONSOLE_OR_HYDRATION_FAILURE");
    }

    return {
      caseName: input.caseName,
      firstRenderMs,
      routes,
      consoleErrors,
      uncaughtExceptions,
      hydrationErrors,
      serviceWorkers: storage.serviceWorkers,
      cacheEntries: storage.cacheEntries,
    } satisfies BrowserReceipt;
  });
  if (!temporaryProfile || existsSync(temporaryProfile)) {
    throw new Error("BROWSER_DISPOSABLE_PROFILE_CLEANUP_FAILED");
  }
  return receipt;
}

async function listen(server: Server) {
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("LOOPBACK_LISTENER_INVALID");
  return address.port;
}

async function closeServer(server: Server) {
  if (!server.listening) return;
  await new Promise<void>((resolvePromise, reject) =>
    server.close((error) => (error ? reject(error) : resolvePromise())),
  );
}

async function reservePort() {
  const server = createServer();
  const port = await listen(server);
  await closeServer(server);
  if (port === 3000) throw new Error("SYNTHETIC_APP_PORT_COLLISION");
  return port;
}

async function stopChild(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolvePromise) => child.once("exit", () => resolvePromise())),
    wait(5_000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function waitForApp(url: string, child: ChildProcess) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("SYNTHETIC_NEXT_EXITED_EARLY");
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // The loopback listener may not be ready yet.
    }
    await wait(100);
  }
  throw new Error("SYNTHETIC_NEXT_START_TIMEOUT");
}

function syntheticExpiredSession() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: "00000000-0000-4000-8000-000000000001",
    exp: 1,
    aud: "authenticated",
  })}.synthetic`;
  return `base64-${encode({
    access_token: accessToken,
    refresh_token: "synthetic-refresh-token",
    expires_at: 1,
    expires_in: 1,
    token_type: "bearer",
  })}`;
}

async function syntheticUnavailableCase() {
  const appPort = await reservePort();
  const temporaryRoot = mkdtempSync("/private/tmp/plave-auth-acceptance-");
  temporaryRoots.push(temporaryRoot);
  const child = spawn(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve(root, "scripts/start-production-local.ts"),
      "--hostname",
      "127.0.0.1",
      "--port",
      String(appPort),
    ],
    {
      cwd: root,
      env: {
        HOME: temporaryRoot,
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        TMPDIR: "/private/tmp",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        PLAVE_PRODUCTION_LOCAL: "true",
        PLAVE_AUTH_FAILURE_TEST_MODE: "UNREACHABLE",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:59999",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let childOutput = "";
  child.stdout?.on("data", (chunk) => {
    childOutput += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    childOutput += String(chunk);
  });

  try {
    const baseUrl = `http://127.0.0.1:${String(appPort)}`;
    await waitForApp(baseUrl, child);
    const receipt = await browserCase({
      caseName: "synthetic-stale-unreachable",
      baseUrl,
      cookie: { name: canonicalStorageKey, value: syntheticExpiredSession() },
      expectNotice: "UNAVAILABLE",
      expectCookieAfter: true,
      protectedReason: "auth-unavailable",
    });
    await wait(100);
    const authRequestCount = (
      childOutput.match(/PLAVE_AUTH_TEST_ADAPTER=NETWORK_FAILURE/gu) ?? []
    ).length;
    if (authRequestCount !== 1) throw new Error("AUTH_RETRY_COUNT_NOT_BOUNDED");
    if (/AuthRetryableFetchError|UnhandledPromiseRejection/gu.test(childOutput)) {
      throw new Error("AUTH_ERROR_FLOOD_NOT_COLLAPSED");
    }
    if (/synthetic-refresh-token|00000000-0000-4000-8000-000000000001/gu.test(childOutput)) {
      throw new Error("AUTH_DIAGNOSTIC_SECRET_LEAK");
    }
    return { receipt, authRequestCount };
  } catch (error) {
    const code = error instanceof Error ? error.message : "SYNTHETIC_ACCEPTANCE_FAILED";
    const authRequestCount = (
      childOutput.match(/PLAVE_AUTH_TEST_ADAPTER=NETWORK_FAILURE/gu) ?? []
    ).length;
    const boundaryDiagnostics = (
      childOutput.match(/PLAVE_AUTH_CHECK=TEMPORARILY_UNAVAILABLE/gu) ?? []
    ).length;
    throw new Error(
      `${code}; AUTH_REQUESTS=${String(authRequestCount)}; BOUNDARY_DIAGNOSTICS=${String(boundaryDiagnostics)}`,
    );
  } finally {
    await stopChild(child);
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

const receipts: BrowserReceipt[] = [];
try {
  const health = await fetch(productionLocalUrl, { redirect: "manual" });
  if (!health.ok) throw new Error("PRODUCTION_LOCAL_PORT_3000_UNAVAILABLE");

  receipts.push(
    await browserCase({
      caseName: "clean-anonymous",
      baseUrl: productionLocalUrl,
      protectedReason: null,
    }),
  );
  receipts.push(
    await browserCase({
      caseName: "malformed-session-recovered",
      baseUrl: productionLocalUrl,
      cookie: { name: canonicalStorageKey, value: "base64-c3ludGhldGljLW1hbGZvcm1lZA" },
      expectNotice: "RECOVERED",
      expectCookieAfter: false,
      protectedReason: null,
    }),
  );
  const unavailable = await syntheticUnavailableCase();
  receipts.push(unavailable.receipt);

  for (const receipt of receipts) {
    process.stdout.write(
      `${receipt.caseName.toUpperCase().replaceAll("-", "_")}=PASS; FIRST_RENDER_MS=${String(receipt.firstRenderMs)}; ROUTES=${receipt.routes.join(",")}; CONSOLE_ERRORS=${String(receipt.consoleErrors)}; UNCAUGHT=${String(receipt.uncaughtExceptions)}\n`,
    );
  }
  process.stdout.write("AUTH_REFRESH_REQUESTS_DURING_SYNTHETIC_OUTAGE=1\n");
  process.stdout.write("PROTECTED_ROUTE_FAIL_CLOSED=PASS\n");
  process.stdout.write("DISPOSABLE_BROWSER_AND_RUNTIME_CLEANUP=PASS\n");
} finally {
  for (const path of temporaryRoots) {
    if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  }
}
