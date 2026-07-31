import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

const host = "127.0.0.1";
const port = 3012;
const url = `http://${host}:${port}/internal/generated-pilot-acceptance`;
const toolRoot = "/private/tmp/plave-playwright-tools";

async function waitForPage(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_500) });
      if (response.ok) return;
    } catch {
      // Next may still be compiling the local-only page.
    }
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error("GENERATED_PILOT_BROWSER_PAGE_TIMEOUT");
}

function stopGroup(pid: number | undefined) {
  if (!pid) return;
  try {
    if (process.platform === "win32") process.kill(pid, "SIGTERM");
    else process.kill(-pid, "SIGTERM");
  } catch {
    // The isolated child may already be stopped.
  }
}

export async function runGeneratedPilotBrowserSmoke(candidateRoot = process.cwd()) {
  const root = assertProject004Workspace(candidateRoot);
  const cache = resolve(root, ".next-generated-pilot-project004");
  if (existsSync(cache)) {
    if (lstatSync(cache).isSymbolicLink()) throw new Error("GENERATED_PILOT_BROWSER_CACHE_SYMLINK");
    rmSync(cache, { recursive: true, force: true });
  }
  const requireFromTool = createRequire(resolve(toolRoot, "package.json"));
  const playwrightPath = requireFromTool.resolve("playwright-core");
  const importedPlaywright = await import(pathToFileURL(playwrightPath).href);
  const playwright = (
    "default" in importedPlaywright
      ? importedPlaywright.default
      : importedPlaywright
  ) as typeof import("playwright-core");
  const { chromium } = playwright;
  const child = spawn(
    process.execPath,
    [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", host, "--port", String(port)],
    {
      cwd: root,
      detached: process.platform !== "win32",
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"x".repeat(24)}`,
        PLAVE_PROJECT004_REMOTE_RUNTIME_MODE: "REMOTE_DEVELOPMENT",
        PLAVE_PROJECT004_REMOTE_TARGET_NAME: "plave-project004-dev-clean",
        PLAVE_PROJECT004_GENERATED_PILOT_RUNTIME: "true",
        PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
        PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "true",
        PLAVE_GENERATED_PRACTICE_MODE: "PILOT_LIVE",
        PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS: "11111111-1111-4111-8111-111111111111",
        PLAVE_GENERATED_PRACTICE_BIND_HOST: host,
        PLAVE_GENERATED_PRACTICE_PILOT_OWNER_STARTED: "true",
        PLAVE_GENERATED_PRACTICE_PILOT_SESSION: "a".repeat(64),
        PLAVE_GENERATED_PRACTICE_ACCEPTANCE_UI: "true",
        PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED: "false",
        PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false",
        PLAVE_CONTROLLED_PILOT_ENABLED: "false",
        PLAVE_RETENTION_RUNTIME_ENABLED: "false",
        PLAVE_ADAPTIVE_PILOT_USER_IDS: "",
      },
    },
  );
  const stderr: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    const value = chunk.toString("utf8");
    if (/error|warning/iu.test(value)) stderr.push(value.replaceAll(root, "<PROJECT004>"));
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await waitForPage();
    browser = await chromium.launch({
      headless: true,
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });
    const artifactDirectory = resolve(root, "artifacts/generated-pilot-acceptance");
    mkdirSync(artifactDirectory, { recursive: true });
    const viewports = [
      { name: "mobile-390x844", width: 390, height: 844 },
      { name: "desktop-1280x800", width: 1280, height: 800 },
    ];
    let consoleErrors = 0;
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors += 1;
      });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Generated practice pilot" }).waitFor();
      await page.getByText("Luyện tập được tạo theo năng lực", { exact: true }).first().waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflow) throw new Error("GENERATED_PILOT_BROWSER_HORIZONTAL_OVERFLOW");
      const body = await page.locator("body").innerText();
      const serializedDom = await page.content();
      if (/normalizedCorrectAnswer|solverReceipt|seedFingerprint|privatePayloadHash|solutionSteps|rawSeed/iu.test(`${body}\n${serializedDom}`)) {
        throw new Error("GENERATED_PILOT_BROWSER_PRIVATE_PAYLOAD_LEAK");
      }
      await page.screenshot({ path: resolve(artifactDirectory, `${viewport.name}.png`), fullPage: true });
      await page.close();
    }
    if (consoleErrors !== 0) throw new Error("GENERATED_PILOT_BROWSER_CONSOLE_ERROR");
    return {
      viewports: viewports.length,
      consoleErrors,
      screenshots: viewports.map((viewport) => `artifacts/generated-pilot-acceptance/${viewport.name}.png`),
    };
  } finally {
    if (browser) await browser.close();
    stopGroup(child.pid);
    const exited = await Promise.race([
      new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
      new Promise<"TIMEOUT">((resolveExit) => setTimeout(() => resolveExit("TIMEOUT"), 5_000)),
    ]);
    if (exited === "TIMEOUT" && child.pid) {
      try {
        if (process.platform === "win32") process.kill(child.pid, "SIGKILL");
        else process.kill(-child.pid, "SIGKILL");
      } catch {
        // The exact child group may have exited during the grace period.
      }
      await Promise.race([
        new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
        new Promise<void>((resolveExit) => setTimeout(resolveExit, 2_000)),
      ]);
    }
    if (existsSync(cache)) {
      if (lstatSync(cache).isSymbolicLink()) throw new Error("GENERATED_PILOT_BROWSER_CACHE_SYMLINK");
      rmSync(cache, { recursive: true, force: true });
    }
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  try {
    const result = await runGeneratedPilotBrowserSmoke();
    process.stdout.write([
      "GENERATED_PILOT_BROWSER_SMOKE=PASS",
      `VIEWPORTS_TESTED=${result.viewports}/2`,
      `BROWSER_CONSOLE_ERRORS=${result.consoleErrors}`,
      "PRIVATE_SOLUTION_LEAKS=0",
      "REMOTE_ACCESS_PERFORMED=NO",
      "REMOTE_MUTATION_PERFORMED=NO",
      "",
    ].join("\n"));
  } catch (error) {
    process.stdout.write([
      "GENERATED_PILOT_BROWSER_SMOKE=FAIL",
      `ROOT_FAILURE_CODE=${error instanceof Error ? error.message.replace(/[^A-Z0-9_]/giu, "_").toUpperCase() : "BROWSER_SMOKE_FAILED"}`,
      "REMOTE_ACCESS_PERFORMED=NO",
      "REMOTE_MUTATION_PERFORMED=NO",
      "",
    ].join("\n"));
    process.exitCode = 1;
  }
}
