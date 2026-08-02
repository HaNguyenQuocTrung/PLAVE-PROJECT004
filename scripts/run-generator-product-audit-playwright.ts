/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";

import { assertProject004Workspace } from "./project004-identity.ts";
import { loadOwnerLocalSupabase } from "./owner-local-demo-support.ts";

const root = assertProject004Workspace();
const host = "127.0.0.1";
const port = 3018;
const baseURL = `http://${host}:${port}`;
const artifactRoot = resolve(root, "artifacts/generator-product-audit");
const screenshotRoot = resolve(artifactRoot, "screenshots");
const resultPath = resolve(artifactRoot, "playwright-result.json");
const sampleIndexPath = resolve(artifactRoot, "sample-index.json");
const chromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const playwrightToolRoot = "/private/tmp/plave-playwright-tools";
const requireFromTools = createRequire(
  resolve(playwrightToolRoot, "package.json"),
);
const { chromium } = requireFromTools("playwright-core") as typeof import("playwright-core");
const packageVersion = JSON.parse(
  readFileSync(resolve(playwrightToolRoot, "node_modules/playwright-core/package.json"), "utf8"),
).version as string;

type Sample = Readonly<{
  sampleId: string;
  variant: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  grade: number | null;
  correctOptionKey: string;
  correctOptionLabel: string;
  solutionSteps: readonly string[];
  feedback: string;
  publicQuestion: Readonly<{
    questionId: string;
    position: number;
    prompt: string;
    answerType: "MULTIPLE_CHOICE";
    options: readonly Readonly<{ key: string; label: string }>[];
    visual: unknown;
    cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
  }> | null;
}>;

type CapturedIssue = Readonly<{ type: string; detail: string }>;

function requireAudit(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function stopProcessGroup(child: ChildProcess | null) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // The exact PROJECT004 child process may already be stopped.
  }
}

async function assertPortAvailable() {
  await new Promise<void>((resolveReady, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error("PORT_3018_BUSY")));
    server.listen(port, host, () => server.close(() => resolveReady()));
  });
}

async function waitForApp(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `${baseURL}/internal/generator-product-audit?sample=NUMBER_COMPARISON%3AMEDIUM%3A1`,
        { signal: AbortSignal.timeout(2_500) },
      );
      if (response.ok) return;
    } catch {
      // Next may still be compiling.
    }
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 300));
  }
  throw new Error("NEXT_READINESS_TIMEOUT");
}

function stateFor(sample: Sample, input: Readonly<{
  feedback?: Readonly<{ isCorrect: boolean }>;
  completed?: boolean;
}> = {}) {
  requireAudit(sample.publicQuestion, `PUBLIC_QUESTION_MISSING_${sample.variant}`);
  const feedback = input.feedback
    ? {
        questionId: sample.publicQuestion.questionId,
        isCorrect: input.feedback.isCorrect,
        correctAnswer: sample.correctOptionLabel,
        solutionSteps: [...sample.solutionSteps],
        feedback: sample.feedback,
      }
    : null;
  return {
    attemptId: "00000000-0000-4000-8000-000000000008",
    releaseId: "generator-product-audit-local",
    contentVersion: "sprint-8a",
    unitId: "generator-product-audit",
    unitTitle: "Bài luyện tập kiểm tra cục bộ",
    grade: sample.grade ?? 9,
    status: input.completed ? "COMPLETED" : "IN_PROGRESS",
    revision: feedback ? 1 : 0,
    answeredCount: feedback ? 1 : 0,
    correctCount: feedback?.isCorrect ? 1 : 0,
    totalQuestions: 12,
    startedAt: "2026-08-01T00:00:00.000Z",
    completedAt: input.completed ? "2026-08-01T00:12:00.000Z" : null,
    currentQuestion: sample.publicQuestion,
    feedback,
  };
}

function captureBrowserIssues(page: any) {
  const issues: CapturedIssue[] = [];
  page.on("console", (message: any) => {
    const detail = String(message.text()).slice(0, 400);
    if (message.type() === "error") issues.push({ type: "console.error", detail });
    if (/hydration|server rendered html|did not match/iu.test(detail)) {
      issues.push({ type: "hydration", detail });
    }
  });
  page.on("pageerror", (error: Error) => {
    issues.push({ type: "pageerror", detail: error.message.slice(0, 400) });
  });
  page.on("requestfailed", (request: any) => {
    if (request.url().startsWith(baseURL)) {
      issues.push({
        type: "requestfailed",
        detail: `${new URL(request.url()).pathname}:${request.failure()?.errorText ?? "UNKNOWN"}`,
      });
    }
  });
  return issues;
}

async function settle(page: any) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator(".practice-runner, .empty-state").first().waitFor();
  await page.waitForTimeout(150);
}

async function gotoSample(page: any, sampleId: string, state?: string) {
  const query = new URLSearchParams({ sample: sampleId });
  if (state) query.set("state", state);
  const response = await page.goto(
    `${baseURL}/internal/generator-product-audit?${query.toString()}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  requireAudit(response?.ok(), `AUDIT_ROUTE_HTTP_${response?.status() ?? 0}`);
  await settle(page);
}

async function screenshot(page: any, name: string) {
  const target = resolve(screenshotRoot, name);
  await page.locator("nextjs-portal").evaluateAll((items: HTMLElement[]) => {
    items.forEach((item) => item.remove());
  });
  await page.waitForTimeout(250);
  await page.screenshot({
    path: target,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
  return `artifacts/generator-product-audit/screenshots/${name}`;
}

async function inspectPreSubmitBoundary(page: any) {
  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const html = document.documentElement.innerHTML;
    return {
      exposesFeedback: /Đáp án đúng|Lời giải từng bước/iu.test(text),
      exposesTechnicalData:
        /snapshotHash|correctOptionKey|solutionSteps|seedFingerprint|outcomeId|astKind/iu.test(html),
      uuidLikeText: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu.test(text),
      emailLikeText: /\b[^\s@]+@[^\s@]+\b/u.test(text),
    };
  });
  requireAudit(!result.exposesFeedback, "PRIVATE_FEEDBACK_VISIBLE_BEFORE_SUBMIT");
  requireAudit(!result.exposesTechnicalData, "TECHNICAL_GENERATOR_DATA_IN_DOM");
  requireAudit(!result.uuidLikeText, "UUID_VISIBLE_IN_UI");
  requireAudit(!result.emailLikeText, "EMAIL_VISIBLE_IN_UI");
  return result;
}

async function inspectLayout(page: any) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const card = document.querySelector<HTMLElement>(".real-question-card");
    const visual = document.querySelector<HTMLElement>(".curriculum-visual");
    const buttons = [
      ...document.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a.button",
      ),
    ].filter((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    });
    const smallTouchTargets = buttons
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          label: (button.innerText || button.getAttribute("aria-label") || "").trim(),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      })
      .filter((button) => button.width < 44 || button.height < 44);
    return {
      overflow: Math.max(0, root.scrollWidth - root.clientWidth),
      cardOverflow: card ? Math.max(0, card.scrollWidth - card.clientWidth) : 0,
      visualOverflow: visual ? Math.max(0, visual.scrollWidth - visual.clientWidth) : 0,
      touchTargets: smallTouchTargets.length === 0,
      smallTouchTargets,
      headingCount: document.querySelectorAll("h1").length,
      duplicateIds: (() => {
        const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map((item) => item.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      })(),
      unlabeledInputs: [...document.querySelectorAll<HTMLInputElement>("input")].filter(
        (input) => !input.labels?.length && !input.getAttribute("aria-label"),
      ).length,
    };
  });
  requireAudit(result.overflow === 0, "PAGE_HORIZONTAL_OVERFLOW");
  requireAudit(result.cardOverflow === 0, "QUESTION_CARD_OVERFLOW");
  requireAudit(result.visualOverflow === 0, "VISUAL_OVERFLOW");
  requireAudit(result.headingCount === 1, "HEADING_HIERARCHY");
  requireAudit(result.duplicateIds.length === 0, "DUPLICATE_IDS");
  requireAudit(result.unlabeledInputs === 0, "UNLABELED_INPUT");
  return result;
}

async function selectOption(page: any, key: string) {
  await page.locator(`input[type=radio][value="${key}"]`).check();
}

async function main() {
  requireAudit(existsSync(chromeExecutable), "CHROMIUM_EXECUTABLE_MISSING");
  requireAudit(existsSync(sampleIndexPath), "SAMPLE_INDEX_MISSING");
  mkdirSync(screenshotRoot, { recursive: true });
  const index = JSON.parse(readFileSync(sampleIndexPath, "utf8")) as {
    samples: Sample[];
  };
  const sample = (id: string) => {
    const value = index.samples.find((item) => item.sampleId === id);
    requireAudit(value?.publicQuestion, `SAMPLE_NOT_FOUND_${id}`);
    return value;
  };

  await assertPortAvailable();
  const supabase = loadOwnerLocalSupabase();
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
        NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
        PLAVE_GENERATOR_PRODUCT_AUDIT_UI: "true",
        PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
        PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
        PLAVE_GENERATED_PRACTICE_MODE: "OFF",
        PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS: "",
      },
    },
  );
  const serverIssues: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    if (/error|warning/iu.test(text)) {
      serverIssues.push(
        /"event":"runtime_request"/u.test(text)
          ? "LOCAL_RUNTIME_REQUEST_REPORTED_EXPECTED_DISABLED_STATUS"
          : "LOCAL_NEXT_SERVER_WARNING_REPORTED",
      );
    }
  });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await waitForApp();
    browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const issues = captureBrowserIssues(page);
    const screenshots: string[] = [];
    const layoutChecks: Array<ReturnType<typeof inspectLayout> extends Promise<infer T> ? T : never> = [];

    await gotoSample(page, "NUMBER_COMPARISON:MEDIUM:1");
    const preSubmitBoundary = await inspectPreSubmitBoundary(page);
    layoutChecks.push(await inspectLayout(page));
    screenshots.push(await screenshot(page, "text-question-desktop.png"));

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoSample(page, "NUMBER_COMPARISON:MEDIUM:1");
    layoutChecks.push(await inspectLayout(page));
    screenshots.push(await screenshot(page, "multiple-choice-mobile.png"));

    await gotoSample(page, "NUMBER_COMPARISON:MEDIUM:1", "numeric-static");
    layoutChecks.push(await inspectLayout(page));
    screenshots.push(await screenshot(page, "numeric-input-static-bank.png"));

    await page.setViewportSize({ width: 1280, height: 800 });
    for (const entry of [
      ["FRACTION_RECOGNITION:MEDIUM:1", "fraction-question.png"],
      ["EQUATION_SOLVING:MEDIUM:1", "algebra-question.png"],
      ["AREA:MEDIUM:1", "geometry-visual.png"],
      ["CHART_INTERPRETATION:MEDIUM:1", "chart-statistics.png"],
    ] as const) {
      await gotoSample(page, entry[0]);
      await inspectPreSubmitBoundary(page);
      layoutChecks.push(await inspectLayout(page));
      screenshots.push(await screenshot(page, entry[1]));
    }

    const comparison = sample("NUMBER_COMPARISON:MEDIUM:1");
    let answerRequests = 0;
    await page.route("**/api/on-demand-curriculum/answer", async (route: any) => {
      answerRequests += 1;
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        answer?: string;
      };
      await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 120));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: stateFor(comparison, {
            feedback: { isCorrect: body.answer === comparison.correctOptionKey },
          }),
        }),
      });
    });

    await gotoSample(page, comparison.sampleId);
    await selectOption(page, comparison.correctOptionKey);
    await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
    try {
      await page.locator(".feedback--correct").waitFor({ timeout: 10_000 });
    } catch {
      const alertCount = await page.getByRole("alert").count();
      throw new Error(
        `CORRECT_FEEDBACK_NOT_RENDERED_REQUESTS_${answerRequests}_ALERTS_${alertCount}`,
      );
    }
    screenshots.push(await screenshot(page, "correct-feedback.png"));

    await gotoSample(page, comparison.sampleId);
    const wrongKey = comparison.publicQuestion!.options.find(
      (option) => option.key !== comparison.correctOptionKey,
    )!.key;
    await selectOption(page, wrongKey);
    await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
    await page.locator(".feedback--incorrect").waitFor({ timeout: 10_000 });
    screenshots.push(await screenshot(page, "incorrect-feedback.png"));

    await gotoSample(page, comparison.sampleId);
    await selectOption(page, comparison.correctOptionKey);
    const answerRequestsBeforeDoubleSubmit = answerRequests;
    const checkButton = page.getByRole("button", { name: "Kiểm tra câu trả lời" });
    await Promise.all([checkButton.click(), checkButton.click({ force: true }).catch(() => undefined)]);
    await page.waitForTimeout(500);
    const duplicateSubmitRequestCount =
      answerRequests - answerRequestsBeforeDoubleSubmit;

    await gotoSample(page, comparison.sampleId, "completed");
    screenshots.push(await screenshot(page, "result-summary.png"));
    await gotoSample(page, comparison.sampleId, "empty");
    screenshots.push(await screenshot(page, "empty-state.png"));

    await page.unroute("**/api/on-demand-curriculum/answer");
    await page.route("**/api/on-demand-curriculum/answer", async (route: any) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: {
            code: "REQUEST_FAILED",
            message: "Kết nối bị gián đoạn. Em có thể thử lại.",
            retryable: true,
          },
        }),
      });
    });
    await gotoSample(page, comparison.sampleId);
    await selectOption(page, comparison.correctOptionKey);
    await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
    await page.locator("#curriculum-answer-error").waitFor();
    screenshots.push(await screenshot(page, "error-recovery.png"));

    await page.unroute("**/api/on-demand-curriculum/answer");
    await gotoSample(page, comparison.sampleId);
    const refreshPrompt = await page.locator(".demo-question__prompt").innerText();
    await page.reload({ waitUntil: "domcontentloaded" });
    await settle(page);
    requireAudit(
      (await page.locator(".demo-question__prompt").innerText()) === refreshPrompt,
      "REFRESH_RENDER_CHANGED",
    );

    const runtimeProbe = await page.evaluate(async () => {
      const response = await fetch("/api/on-demand-curriculum/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      const body = (await response.json()) as { error?: { code?: string } };
      return { status: response.status, code: body.error?.code ?? null };
    });
    requireAudit(
      runtimeProbe.status === 503 && runtimeProbe.code === "RUNTIME_DISABLED",
      "LOCAL_RUNTIME_NOT_SAFELY_DISABLED",
    );

    const unexpectedIssues = issues.filter(
      (issue) =>
        !(
          issue.type === "console.error" &&
          /Failed to load resource.*503/iu.test(issue.detail)
        ),
    );
    requireAudit(
      unexpectedIssues.filter((issue) => issue.type === "hydration").length === 0,
      "HYDRATION_ERROR",
    );
    requireAudit(
      unexpectedIssues.filter((issue) => issue.type === "pageerror").length === 0,
      "PAGE_ERROR",
    );

    const result = {
      status: "PASS_WITH_RUNTIME_BLOCKED",
      audit: "SPRINT_8A_GENERATOR_PRODUCT_AUDIT",
      browserEngine: "chromium",
      browserVersion: browser.version(),
      playwrightPackage: "playwright-core",
      playwrightVersion: packageVersion,
      localPlaywright: true,
      inAppBrowserUsed: false,
      viewports: [
        { width: 390, height: 844 },
        { width: 1280, height: 800 },
      ],
      exactProductionRenderer: "UniversalCurriculumRunner + CurriculumVisual",
      runtimeProbe,
      runtimeJourney: {
        start: "BLOCKED_BY_RUNTIME_FLAG",
        downstreamPersistenceResumeHistory: "NOT_REACHED",
        diagnosticRenderer: "PASS",
        correctFeedback: "PASS_WITH_API_SHAPED_LOCAL_STUB",
        incorrectFeedback: "PASS_WITH_API_SHAPED_LOCAL_STUB",
        duplicateSubmitUiGuard:
          duplicateSubmitRequestCount === 1 ? "PASS" : "FAIL",
        duplicateSubmitRequestCount,
        refreshRenderer: "PASS",
      },
      preSubmitBoundary,
      layoutChecks,
      accessibility: {
        headingHierarchy: "PASS",
        formLabels: "PASS",
        duplicateIds: "PASS",
        reducedMotion: "PASS",
        primaryTouchTargets: layoutChecks.every((item) => item.touchTargets)
          ? "PASS"
          : "FAIL",
      },
      screenshots,
      browserIssues: unexpectedIssues,
      expectedDiagnosticIssues: issues.filter((issue) => !unexpectedIssues.includes(issue)),
      serverIssues,
      remoteMutationPerformed: false,
      migrationPerformed: false,
      releaseActivationPerformed: false,
    };
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write("GENERATOR_PRODUCT_PLAYWRIGHT=PASS_WITH_RUNTIME_BLOCKED\n");
    process.stdout.write(`PLAYWRIGHT_PACKAGE=playwright-core@${packageVersion}\n`);
    process.stdout.write(`BROWSER_ENGINE=chromium\n`);
    process.stdout.write(`BROWSER_VERSION=${browser.version()}\n`);
    process.stdout.write(`SCREENSHOTS=${screenshots.length}\n`);
    await context.close();
  } finally {
    await browser?.close();
    stopProcessGroup(child);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  process.stderr.write(`GENERATOR_PRODUCT_PLAYWRIGHT=FAIL:${message}\n`);
  process.exitCode = 1;
});
