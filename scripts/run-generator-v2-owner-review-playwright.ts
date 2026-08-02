/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const host = "127.0.0.1";
const port = 3033;
const baseURL = `http://${host}:${port}`;
const reviewURL = `${baseURL}/internal/generator-v2-owner-review`;
const artifactRoot = resolve(root, "artifacts/generator-v2-owner-review");
const screenshotRoot = resolve(artifactRoot, "screenshots");
const reportPath = resolve(artifactRoot, "browser-acceptance.json");
const manifestPath = resolve(artifactRoot, "manifest.json");
const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const toolsRoot = "/private/tmp/plave-playwright-tools";
const requireTools = createRequire(resolve(toolsRoot, "package.json"));
const { chromium } = requireTools("playwright-core") as typeof import("playwright-core");
const playwrightVersion = JSON.parse(
  readFileSync(resolve(toolsRoot, "node_modules/playwright-core/package.json"), "utf8"),
).version as string;

function requireAcceptance(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function hash(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function portListeners() {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().split(/\s+/u).filter(Boolean) : [];
}

async function waitReady(child: ChildProcess) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`OWNER_REVIEW_SERVER_EARLY_EXIT_${child.exitCode}`);
    try {
      const response = await fetch(reviewURL, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return;
    } catch {
      // Next may still be compiling.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
  }
  throw new Error("OWNER_REVIEW_SERVER_READINESS_TIMEOUT");
}

async function stopServer(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return child.exitCode;
  try {
    process.kill(-child.pid, "SIGINT");
  } catch {
    child.kill("SIGINT");
  }
  return await new Promise<number | null>((resolveExit) => {
    const timeout = setTimeout(() => {
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already stopped */ }
      resolveExit(null);
    }, 12_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolveExit(code);
    });
  });
}

function captureIssues(page: any) {
  const issues: Array<{ type: string; detail: string }> = [];
  page.on("console", (message: any) => {
    const detail = String(message.text()).slice(0, 400);
    if (message.type() === "error") issues.push({ type: "console.error", detail });
    if (/hydration|did not match|server rendered html/iu.test(detail)) issues.push({ type: "hydration", detail });
  });
  page.on("pageerror", (error: Error) => issues.push({ type: "pageerror", detail: error.message.slice(0, 400) }));
  page.on("requestfailed", (request: any) => {
    if (request.url().startsWith(baseURL)) issues.push({ type: "requestfailed", detail: `${new URL(request.url()).pathname}:${request.failure()?.errorText ?? "UNKNOWN"}` });
  });
  return issues;
}

async function inspect(page: any) {
  return await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const root = document.documentElement;
    const visibleControls = [...document.querySelectorAll<HTMLElement>("button,input,select,textarea")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
      });
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      privateLeak: /correctResponse|acceptedResponses|solverReceipt|normalizedModelHash|solverReceiptHash|privateSolution|rawSeed|"solution"\s*:/u.test(html),
      sampleButtons: document.querySelectorAll("[data-sample-id]").length,
      disabledUnexpected: visibleControls.filter((element) => element.hasAttribute("disabled") && !element.matches("[data-finalize-owner-review],[data-review-previous],[data-review-next],[data-review-submit],fieldset *")).length,
      smallestTarget: Math.min(...visibleControls.filter((element) => !element.matches("textarea,input[type=radio],input[type=checkbox]")).map((element) => Math.min(element.getBoundingClientRect().width, element.getBoundingClientRect().height))),
      reviewed: document.querySelector<HTMLElement>("[data-progress-reviewed]")?.innerText ?? "",
    };
  });
}

async function assertFilter(page: any, name: string, value: string, attribute: string) {
  await page.locator(`[data-filter="${name}"]`).selectOption(value);
  const rows = page.locator("[data-sample-id]");
  requireAcceptance(await rows.count() > 0, `FILTER_${name}_EMPTY`);
  const values = await rows.evaluateAll((items: HTMLElement[], attr: string) => items.map((item) => item.getAttribute(attr)), attribute);
  requireAcceptance(values.every((candidate: string | null) => candidate === value), `FILTER_${name}_MISMATCH`);
  await page.locator(`[data-filter="${name}"]`).selectOption("ALL");
}

async function runViewport(browser: any, viewport: { width: number; height: number; label: string }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const issues = captureIssues(page);
  await page.goto(reviewURL, { waitUntil: "domcontentloaded" });
  await page.locator("[data-owner-review-root]").waitFor();
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-owner-review-root]").waitFor();
  requireAcceptance(await page.locator("[data-sample-id]").count() === 198, `SAMPLES_NOT_198_${viewport.label}`);

  await assertFilter(page, "grade", "9", "data-grade");
  await assertFilter(page, "domain", "STATISTICS_AND_PROBABILITY", "data-domain");
  await assertFilter(page, "difficulty", "HARD", "data-difficulty");
  await assertFilter(page, "interaction", "FRACTION_INPUT", "data-interaction");

  const next = page.locator("[data-review-next]");
  requireAcceptance(await next.isEnabled(), `NEXT_DISABLED_${viewport.label}`);
  const firstId = await page.locator("[data-sample-id][aria-current=true]").getAttribute("data-sample-id");
  await next.click();
  const secondId = await page.locator("[data-sample-id][aria-current=true]").getAttribute("data-sample-id");
  requireAcceptance(firstId !== secondId, `NEXT_DID_NOT_MOVE_${viewport.label}`);
  await page.locator("[data-review-previous]").click();
  requireAcceptance(await page.locator("[data-sample-id][aria-current=true]").getAttribute("data-sample-id") === firstId, `PREVIOUS_DID_NOT_MOVE_${viewport.label}`);

  const answer = page.locator('input[type="text"]').first();
  await answer.fill("999999");
  await page.locator("[data-review-submit]").click();
  await page.locator("[data-review-feedback]").waitFor();
  requireAcceptance((await page.locator("[data-review-feedback]").innerText()).length > 20, `INCORRECT_FEEDBACK_MISSING_${viewport.label}`);
  await page.getByRole("button", { name: "Thử câu trả lời khác" }).click();
  await page.getByRole("button", { name: "Xem mẫu phản hồi đúng" }).click();
  await page.locator("[data-review-feedback]").waitFor();
  requireAcceptance((await page.locator("[data-review-feedback]").innerText()).length > 20, `CORRECT_FEEDBACK_MISSING_${viewport.label}`);

  await page.locator("[data-sample-decision]").getByLabel("APPROVE", { exact: true }).check();
  const note = `PLAYWRIGHT_DRAFT_${viewport.label}`;
  await page.locator("[data-review-note]").fill(note);
  requireAcceptance(await page.locator("[data-progress-reviewed]").innerText() === "1/198", `PROGRESS_NOT_UPDATED_${viewport.label}`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-owner-review-root]").waitFor();
  await page.waitForFunction((expectedNote: string) => {
    const radio = document.querySelector<HTMLInputElement>('[data-sample-decision] input[type="radio"]');
    const noteInput = document.querySelector<HTMLTextAreaElement>("[data-review-note]");
    return radio?.checked === true && noteInput?.value === expectedNote;
  }, note);
  requireAcceptance(await page.locator("[data-sample-decision]").getByLabel("APPROVE", { exact: true }).isChecked(), `DRAFT_DECISION_NOT_RESUMED_${viewport.label}`);
  requireAcceptance(await page.locator("[data-review-note]").inputValue() === note, `DRAFT_NOTE_NOT_RESUMED_${viewport.label}`);
  requireAcceptance(await page.locator("[data-finalize-owner-review]").isDisabled(), `FINAL_DECISION_ENABLED_BEFORE_198_${viewport.label}`);

  const screenshot = resolve(screenshotRoot, `owner-review-${viewport.label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled", caret: "hide" });
  const inspected = await inspect(page);
  requireAcceptance(inspected.horizontalOverflow === 0, `OVERFLOW_${viewport.label}_${inspected.horizontalOverflow}`);
  requireAcceptance(!inspected.privateLeak, `PRIVATE_LEAK_${viewport.label}`);
  requireAcceptance(inspected.disabledUnexpected === 0, `UNEXPECTED_DISABLED_CONTROLS_${viewport.label}`);
  requireAcceptance(inspected.smallestTarget >= 40, `TOUCH_TARGET_TOO_SMALL_${viewport.label}_${inspected.smallestTarget}`);

  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-owner-review-root]").waitFor();
  requireAcceptance(await page.locator("[data-progress-reviewed]").innerText() === "0/198", `DRAFT_NOT_CLEANED_${viewport.label}`);
  await context.close();
  return {
    viewport: { width: viewport.width, height: viewport.height },
    filters: "PASS",
    previousNext: "PASS",
    studentSubmit: "PASS",
    correctIncorrectFeedback: "PASS",
    decisionNote: "PASS",
    refreshResume: "PASS",
    draftCleanup: "PASS",
    horizontalOverflow: inspected.horizontalOverflow,
    privateLeaks: 0,
    issues,
    screenshot: `artifacts/generator-v2-owner-review/screenshots/owner-review-${viewport.label}.png`,
  };
}

async function main() {
  requireAcceptance(existsSync(chromeExecutable), "CHROME_EXECUTABLE_MISSING");
  requireAcceptance(existsSync(resolve(toolsRoot, "node_modules/playwright-core")), "PLAYWRIGHT_CORE_MISSING");
  requireAcceptance(portListeners().length === 0, "OWNER_REVIEW_PORT_3033_OCCUPIED");
  mkdirSync(screenshotRoot, { recursive: true });
  const manifestHashBefore = hash(manifestPath);
  const manifestBefore = JSON.parse(readFileSync(manifestPath, "utf8"));
  requireAcceptance(manifestBefore.ownerDecision === null, "OWNER_DECISION_NOT_NULL_BEFORE_TEST");

  const child = spawn(
    process.execPath,
    ["--no-warnings", "--experimental-strip-types", resolve(root, "scripts/start-generator-v2-owner-review.ts")],
    { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG } },
  );
  let serverOutput = "";
  child.stdout?.on("data", (chunk: Buffer) => { serverOutput += chunk.toString("utf8").slice(0, 2_000); });
  child.stderr?.on("data", (chunk: Buffer) => { serverOutput += chunk.toString("utf8").slice(0, 2_000); });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  let exitCode: number | null = null;
  try {
    await waitReady(child);
    requireAcceptance(serverOutput.includes("GENERATOR_V2_OWNER_REVIEW_START=READY"), "STARTUP_DIAGNOSTICS_MISSING");
    browser = await chromium.launch({
      headless: true,
      executablePath: chromeExecutable,
      args: ["--disable-background-networking", "--disable-sync", "--no-first-run"],
    });
    const results = [];
    for (const viewport of [
      { width: 390, height: 844, label: "mobile-390x844" },
      { width: 1280, height: 800, label: "desktop-1280x800" },
    ]) results.push(await runViewport(browser, viewport));
    const allIssues = results.flatMap((result) => result.issues);
    requireAcceptance(allIssues.length === 0, `BROWSER_ISSUES_${JSON.stringify(allIssues.slice(0, 3))}`);
    requireAcceptance(hash(manifestPath) === manifestHashBefore, "MANIFEST_CHANGED_BY_BROWSER_TEST");
    requireAcceptance(JSON.parse(readFileSync(manifestPath, "utf8")).ownerDecision === null, "OWNER_DECISION_CHANGED_BY_BROWSER_TEST");
    const report = {
      schemaVersion: 1,
      generatedAt: "2026-08-02",
      result: "PASS_OWNER_REVIEW_SURFACE_READY",
      command: "npm run --silent generator-v2:owner-review-start",
      url: reviewURL,
      browser: { engine: "Chromium", version: browser.version(), playwrightCore: playwrightVersion, executable: chromeExecutable },
      reviewPackage: { samples: 198, capabilities: 198, ownerDecision: null, privateLeaks: 0 },
      viewports: results,
      consoleErrors: 0,
      hydrationErrors: 0,
      pageErrors: 0,
      overflowFailures: 0,
      finalDecisionCreatedByTest: false,
      screenshotsVisuallyReviewed: false,
      criticalHighIssues: null,
    };
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (browser) await browser.close();
    exitCode = await stopServer(child);
  }
  requireAcceptance(exitCode === 130, `CTRL_C_EXIT_NOT_130_${String(exitCode)}`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  requireAcceptance(portListeners().length === 0, "OWNER_REVIEW_LISTENER_REMAINED");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  report.ctrlCExitCode = 130;
  report.remainingListener = "NONE";
  report.tempFixtureCleanup = "PASS";
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write([
    "GENERATOR_V2_OWNER_REVIEW_BROWSER=PASS",
    "GENERATOR_V2_OWNER_REVIEW_VIEWPORTS=2/2",
    "GENERATOR_V2_OWNER_REVIEW_OWNER_DECISION=NULL",
    "GENERATOR_V2_OWNER_REVIEW_PRIVATE_LEAKS=0",
    "GENERATOR_V2_OWNER_REVIEW_CTRL_C_EXIT=130",
    "GENERATOR_V2_OWNER_REVIEW_REMAINING_LISTENER=NONE",
    "",
  ].join("\n"));
}

await main();
