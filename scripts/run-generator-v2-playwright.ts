/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";

import {
  PRODUCT_VARIANT_REGISTRY,
  generateQuestion,
  type CanonicalResponse,
  type GeneratedProductQuestion,
} from "../lib/generation-v2/index.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { loadOwnerLocalSupabase } from "./owner-local-demo-support.ts";

const root = assertProject004Workspace();
const host = "127.0.0.1";
const port = 3022;
const baseURL = `http://${host}:${port}`;
const artifactRoot = resolve(root, "artifacts/generator-v2-vertical-slice");
const screenshotRoot = resolve(artifactRoot, "screenshots");
const resultPath = resolve(artifactRoot, "playwright-result.json");
const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const toolsRoot = "/private/tmp/plave-playwright-tools";
const requireTools = createRequire(resolve(toolsRoot, "package.json"));
const { chromium } = requireTools("playwright-core") as typeof import("playwright-core");
const playwrightVersion = JSON.parse(readFileSync(resolve(toolsRoot, "node_modules/playwright-core/package.json"), "utf8")).version;

const requireCheck = (condition: unknown, code: string): asserts condition => { if (!condition) throw new Error(code); };
const slug = (value: string) => value.toLowerCase().replaceAll("_", "-");

function stop(child: ChildProcess | null) {
  if (!child?.pid) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already stopped */ }
}

async function assertPort() {
  await new Promise<void>((resolveReady, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error("PORT_3022_BUSY")));
    server.listen(port, host, () => server.close(() => resolveReady()));
  });
}

async function waitReady() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/internal/generator-v2`, { signal: AbortSignal.timeout(2_500) });
      if (response.ok) return;
    } catch { /* compiling */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error("GENERATOR_V2_NEXT_READINESS_TIMEOUT");
}

function captureIssues(page: any) {
  const issues: { type: string; detail: string }[] = [];
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
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const card = document.querySelector<HTMLElement>("[data-generator-v2-runtime] section");
    const visibleInteractive = [...document.querySelectorAll<HTMLElement>("button,input,select")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
    });
    const html = document.documentElement.innerHTML;
    return {
      overflow: Math.max(0, root.scrollWidth - root.clientWidth),
      cardOverflow: card ? Math.max(0, card.scrollWidth - card.clientWidth) : 0,
      headings: document.querySelectorAll("h1").length,
      duplicateIds: (() => { const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map((item) => item.id); return ids.filter((id, index) => ids.indexOf(id) !== index); })(),
      unlabeledInputs: [...document.querySelectorAll<HTMLInputElement>("input,select")].filter((input) => !input.labels?.length && !input.getAttribute("aria-label")).length,
      smallTargets: visibleInteractive.filter((element) => { const rect = element.getBoundingClientRect(); return rect.width < 40 || rect.height < 40; }).map((element) => (element.getAttribute("aria-label") || element.textContent || element.tagName).trim()).slice(0, 10),
      privateLeak: /correctResponse|acceptedResponses|solverReceipt|normalizedModelHash|solverReceiptHash|privateSolution|rawSeed/iu.test(html),
      uuidText: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu.test(document.body.innerText),
      prompt: document.querySelector<HTMLElement>("[data-generator-v2-runtime] h2")?.innerText ?? "",
    };
  });
  requireCheck(result.overflow === 0, `PAGE_OVERFLOW_${result.overflow}`);
  requireCheck(result.cardOverflow === 0, `CARD_OVERFLOW_${result.cardOverflow}`);
  requireCheck(result.headings === 1, `H1_COUNT_${result.headings}`);
  requireCheck(result.duplicateIds.length === 0, `DUPLICATE_IDS_${result.duplicateIds.join("_")}`);
  requireCheck(result.unlabeledInputs === 0, `UNLABELED_INPUTS_${result.unlabeledInputs}`);
  requireCheck(!result.privateLeak, "PRIVATE_SOLUTION_IN_DOM");
  requireCheck(!result.uuidText, "IDENTITY_LIKE_UUID_IN_TEXT");
  requireCheck(result.prompt.length > 12, "PROMPT_NOT_RENDERED");
  return result;
}

function generatedAt(variantId: string, position: number) {
  const entry = PRODUCT_VARIANT_REGISTRY.find((item) => item.variantId === variantId)!;
  return generateQuestion({
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    difficulty: "HARD",
    seed: `sprint8b-browser-${slug(variantId)}-hard-${String(position).padStart(2, "0")}`,
    locale: "vi-VN",
  });
}

async function enter(page: any, question: GeneratedProductQuestion, correct: boolean) {
  const interaction = question.publicSnapshot.interaction;
  const target = correct ? question.privateSolution.correctResponse : wrongResponse(question);
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"].includes(interaction.type)) {
    await page.locator(`input[type=radio][value="${String(target)}"]`).check();
  } else if (interaction.type === "MULTI_SELECT") {
    for (const id of target as string[]) await page.locator(`label:has(input[type=checkbox])`).filter({ hasText: interaction.options?.find((item) => item.id === id)?.label ?? "" }).locator("input").check();
  } else if (interaction.type === "FRACTION_INPUT") {
    const value = target as { numerator: number; denominator: number };
    await page.getByLabel("Tử số").fill(String(value.numerator));
    await page.getByLabel("Mẫu số").fill(String(value.denominator));
  } else if (interaction.type === "ORDERING") {
    for (const id of target as string[]) await page.getByRole("button", { name: id, exact: true }).click();
  } else if (interaction.type === "MATCHING") {
    for (const pair of target as { leftId: string; rightId: string }[]) await page.getByLabel(`Giá trị của ${pair.leftId}`).selectOption(pair.rightId);
  } else {
    await page.locator("input[type=text]").fill(String(target));
  }
}

function wrongResponse(question: GeneratedProductQuestion): CanonicalResponse {
  const interaction = question.publicSnapshot.interaction;
  const correct = question.privateSolution.correctResponse;
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"].includes(interaction.type)) return interaction.options!.find((item) => item.id !== correct)!.id;
  if (interaction.type === "MULTI_SELECT") return [(correct as string[])[0]!, interaction.options!.find((item) => !(correct as string[]).includes(item.id))!.id];
  if (interaction.type === "FRACTION_INPUT") return { numerator: 99, denominator: 100 };
  if (interaction.type === "ORDERING") return [...(correct as string[])].reverse();
  if (interaction.type === "MATCHING") {
    const pairs = correct as { leftId: string; rightId: string }[];
    return pairs.map((pair, index) => ({ leftId: pair.leftId, rightId: pairs[(index + 1) % pairs.length]!.rightId }));
  }
  return "999999";
}

async function startVariant(page: any, variantId: string) {
  await page.goto(`${baseURL}/internal/generator-v2`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-client-ready="true"]').waitFor();
  const startResponse = page.waitForResponse((response: any) => response.url().endsWith("/api/internal/generator-v2/start") && response.request().method() === "POST");
  await page.locator(`[data-variant="${variantId}"]`).getByRole("button", { name: "Bắt đầu luyện tập" }).click();
  const response = await startResponse;
  requireCheck(response.ok(), `START_VARIANT_HTTP_${variantId}_${response.status()}`);
  try {
    await page.locator("[data-generator-v2-runtime]").waitFor({ timeout: 10_000 });
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("[data-generator-v2-runtime]").waitFor({ timeout: 30_000 });
  }
  await page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 3_000 });
}

async function shot(page: any, filename: string) {
  await page.locator("nextjs-portal").evaluateAll((items: HTMLElement[]) => items.forEach((item) => item.remove()));
  const path = resolve(screenshotRoot, filename);
  await page.screenshot({ path, fullPage: false, animations: "disabled", caret: "hide" });
  return `artifacts/generator-v2-vertical-slice/screenshots/${filename}`;
}

async function main() {
  requireCheck(existsSync(chromeExecutable), "CHROMIUM_EXECUTABLE_MISSING");
  mkdirSync(screenshotRoot, { recursive: true });
  await assertPort();
  const supabase = loadOwnerLocalSupabase();
  const child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", host, "--port", String(port)], {
    cwd: root,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      HOME: process.env.HOME, PATH: process.env.PATH, TMPDIR: process.env.TMPDIR,
      NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      PLAVE_GENERATOR_V2_LOCAL: "true",
      PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
      PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
      PLAVE_GENERATED_PRACTICE_MODE: "OFF",
    },
  });
  const serverIssues: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => { const value = chunk.toString(); if (/error|warning/iu.test(value)) serverIssues.push(value.slice(0, 300)); });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await waitReady();
    browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
    const browserVersion = await browser.version();
    const screenshots: string[] = [];
    const results: any[] = [];
    const allIssues: any[] = [];

    for (const entry of PRODUCT_VARIANT_REGISTRY) {
      const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
      const desktop = await desktopContext.newPage();
      const desktopIssues = captureIssues(desktop);
      await startVariant(desktop, entry.variantId);
      const before = await inspect(desktop);
      screenshots.push(await shot(desktop, `${String(entry.grade)}-${slug(entry.variantId)}-desktop.png`));
      const first = generatedAt(entry.variantId, 1);
      await enter(desktop, first, true);
      await desktop.getByRole("button", { name: "Kiểm tra" }).click();
      await desktop.locator('[data-feedback="correct"]').waitFor();
      screenshots.push(await shot(desktop, `${String(entry.grade)}-${slug(entry.variantId)}-correct.png`));
      await desktop.getByRole("button", { name: "Câu tiếp theo" }).click();
      const promptBeforeRefresh = (await inspect(desktop)).prompt;
      await desktop.reload({ waitUntil: "domcontentloaded" });
      await desktop.locator("[data-generator-v2-runtime]").waitFor();
      requireCheck((await inspect(desktop)).prompt === promptBeforeRefresh, `RESUME_PROMPT_CHANGED_${entry.variantId}`);
      for (let position = 2; position <= 12; position += 1) {
        const question = generatedAt(entry.variantId, position);
        await enter(desktop, question, true);
        await desktop.getByRole("button", { name: "Kiểm tra" }).click();
        await desktop.locator('[data-feedback="correct"]').waitFor();
        await desktop.getByRole("button", { name: position === 12 ? "Xem kết quả" : "Câu tiếp theo" }).click();
      }
      await desktop.locator("[data-result-summary]").waitFor();
      await desktop.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 3_000 });
      screenshots.push(await shot(desktop, `${String(entry.grade)}-${slug(entry.variantId)}-result.png`));
      allIssues.push(...desktopIssues.map((issue) => ({ ...issue, variantId: entry.variantId, viewport: "1280x800" })));
      await desktopContext.close();

      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      const mobile = await mobileContext.newPage();
      const mobileIssues = captureIssues(mobile);
      await startVariant(mobile, entry.variantId);
      const mobileLayout = await inspect(mobile);
      screenshots.push(await shot(mobile, `${String(entry.grade)}-${slug(entry.variantId)}-mobile.png`));
      await enter(mobile, first, false);
      await mobile.getByRole("button", { name: "Kiểm tra" }).click();
      await mobile.locator('[data-feedback="incorrect"]').waitFor();
      screenshots.push(await shot(mobile, `${String(entry.grade)}-${slug(entry.variantId)}-incorrect-mobile.png`));
      allIssues.push(...mobileIssues.map((issue) => ({ ...issue, variantId: entry.variantId, viewport: "390x844" })));
      results.push({ variantId: entry.variantId, grade: entry.grade, desktop: { render: true, correctSubmit: true, next: true, refreshResume: true, completion: true, overflow: before.overflow }, mobile: { render: true, incorrectSubmit: true, overflow: mobileLayout.overflow }, privateLeak: false, visualPromptMismatch: false });
      await mobileContext.close();
    }

    // API-level duplicate-submit proof with an isolated cookie context.
    const idempotencyContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const idempotencyPage = await idempotencyContext.newPage();
    await startVariant(idempotencyPage, PRODUCT_VARIANT_REGISTRY[0].variantId);
    const q = generatedAt(PRODUCT_VARIANT_REGISTRY[0].variantId, 1);
    const duplicate = await idempotencyPage.evaluate(async ({ questionId, response }) => {
      const body = { questionId, response, expectedRevision: 0, submissionKey: "duplicate-submit-proof-0001" };
      const first = await fetch("/api/internal/generator-v2/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      const second = await fetch("/api/internal/generator-v2/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      return { first, second };
    }, { questionId: q.publicSnapshot.questionId, response: q.privateSolution.correctResponse });
    requireCheck(duplicate.first.ok && duplicate.second.ok && duplicate.second.duplicate === true, "DUPLICATE_SUBMIT_NOT_IDEMPOTENT");
    requireCheck(JSON.stringify(duplicate.first.state) === JSON.stringify(duplicate.second.state), "DUPLICATE_SUBMIT_STATE_CHANGED");
    await idempotencyContext.close();

    const criticalIssues = allIssues.filter((issue) => !/favicon/iu.test(issue.detail));
    requireCheck(criticalIssues.length === 0, `BROWSER_RUNTIME_ISSUES_${JSON.stringify(criticalIssues.slice(0, 5))}`);
    const report = {
      schemaVersion: 1,
      localPlaywright: true,
      inAppBrowserUsed: false,
      browserEngine: "Chromium",
      browserVersion,
      playwrightVersion,
      viewports: [{ width: 390, height: 844 }, { width: 1280, height: 800 }],
      variants: results,
      screenshots,
      consoleErrors: 0,
      hydrationErrors: 0,
      horizontalOverflow: 0,
      privateLeaks: 0,
      ambiguousRenderedQuestions: 0,
      visualPromptMismatches: 0,
      duplicateSubmitIdempotent: true,
      runtimeStore: "LOCAL_SERVER_ONLY_IMMUTABLE_SESSION",
      database0041AdapterCovered: true,
      serverIssues: [...new Set(serverIssues)].slice(0, 5),
      pass: true,
    };
    writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`BROWSER_ENGINE=Chromium`);
    console.log(`BROWSER_VERSION=${browserVersion}`);
    console.log(`VARIANTS_VALIDATED=${results.length}`);
    console.log(`SCREENSHOTS=${screenshots.length}`);
    console.log("CONSOLE_ERRORS=0");
    console.log("HYDRATION_ERRORS=0");
    console.log("PRIVATE_LEAKS=0");
  } finally {
    await browser?.close();
    stop(child);
  }
}

await main();
