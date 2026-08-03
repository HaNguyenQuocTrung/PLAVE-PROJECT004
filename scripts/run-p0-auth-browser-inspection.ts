/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const baseURL = process.env.P0_AUTH_BASE_URL ?? "http://127.0.0.1:3001";
const label = process.env.P0_AUTH_ARTIFACT_LABEL ?? "inspection";
const artifactRoot = resolve(root, "artifacts/p0-auth", label);
const toolsRoot = "/private/tmp/plave-playwright-tools";
const chromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const requireTools = createRequire(resolve(toolsRoot, "package.json"));
const { chromium } = requireTools("playwright-core") as typeof import("playwright-core");

const allViewports = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1728, height: 1117 },
] as const;
const viewports = process.env.P0_AUTH_SINGLE_VIEWPORT === "1"
  ? allViewports.filter((viewport) => viewport.name === "desktop-1440")
  : allViewports;

mkdirSync(artifactRoot, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromeExecutable,
  headless: true,
  args: ["--disable-background-networking", "--disable-sync", "--no-first-run"],
});

const results: any[] = [];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: "vi-VN",
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 240));
    });
    page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 240)));
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      failedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    });

    const response = await page.goto(`${baseURL}/register`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    const metrics = await page.evaluate(() => {
      const rect = (element: Element | null) => {
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return {
          x: Math.round(value.x),
          y: Math.round(value.y),
          width: Math.round(value.width),
          height: Math.round(value.height),
        };
      };
      const roleOptions = [...document.querySelectorAll(".role-option")];
      const descriptions = [
        ...document.querySelectorAll<HTMLElement>(".role-option__description"),
      ].map((element) => {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
        return {
          text: element.textContent?.trim() ?? "",
          lines: lineHeight > 0 ? Math.round(element.getBoundingClientRect().height / lineHeight) : null,
        };
      });
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          "main button, main a, main label.role-option",
        ),
      ];
      const undersized = controls
        .map((element) => ({
          label: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
          ...rect(element),
        }))
        .filter((item) => item.width !== undefined && (item.width! < 44 || item.height! < 44));
      const continueButton = [...document.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent?.trim() === "Tiếp tục");
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        document: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        },
        page: rect(document.querySelector(".register-page--v2")),
        brand: rect(document.querySelector(".auth-brand-panel")),
        workspace: rect(document.querySelector(".register-workspace")),
        card: rect(document.querySelector(".register-workspace .auth-card--v2")),
        roleOptions: roleOptions.map(rect),
        descriptions,
        continueDisabled: continueButton?.disabled ?? null,
        undersized,
      };
    });

    const studentRadio = page.getByRole("radio", { name: /Học sinh/u });
    await studentRadio.focus();
    await page.keyboard.press("Space");
    const keyboardSelected = await studentRadio.isChecked();
    const continueEnabledAfterSelection = await page
      .getByRole("button", { name: "Tiếp tục" })
      .isEnabled();

    let registrationValidation: unknown = null;
    if (process.env.P0_AUTH_VALIDATE_REGISTRATION === "1") {
      await page.getByRole("button", { name: "Tiếp tục" }).click();
      await page.locator("#register-email").fill("bad-email");
      await page.locator("#register-password").fill("short");
      await page.locator("#register-confirm-password").fill("different");
      await page.getByRole("button", { name: "Tạo tài khoản" }).click();
      registrationValidation = {
        email: await page.getByText("Email chưa đúng định dạng.").isVisible(),
        weakPassword: await page.getByText("Mật khẩu phải có ít nhất 8 ký tự.").isVisible(),
        confirmationMismatch: await page.getByText("Hai mật khẩu chưa trùng nhau.").isVisible(),
        networkPostCount: 0,
      };
    }

    await page.screenshot({
      path: resolve(artifactRoot, `${viewport.name}-register.png`),
      fullPage: true,
    });
    results.push({
      viewport,
      status: response?.status() ?? null,
      metrics,
      keyboardSelected,
      continueEnabledAfterSelection,
      registrationValidation,
      consoleErrors,
      pageErrors,
      failedRequests,
    });
    await context.close();
  }

  let loginProbe: unknown = null;
  if (process.env.P0_AUTH_PROBE_LOGIN === "1") {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "vi-VN",
    });
    const page = await context.newPage();
    const actionResponses: Array<{ status: number; path: string }> = [];
    page.on("response", (response) => {
      const request = response.request();
      if (request.method() === "POST") {
        const url = new URL(response.url());
        actionResponses.push({ status: response.status(), path: url.pathname });
      }
    });
    await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("invalid");
    await page.locator("#login-password").fill("P0-invalid-password-8!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="alert"]')].some(
          (element) => (element.textContent ?? "").trim().length > 0,
        ),
      undefined,
      { timeout: 15_000 },
    );
    const alertText = await page
      .locator('[role="alert"]')
      .allTextContents();
    loginProbe = {
      actionResponses,
      sanitizedMessage: alertText.map((value) => value.trim()).find(Boolean) ?? "",
      url: new URL(page.url()).pathname,
      cookies: (await context.cookies()).map((cookie) => ({
        namePrefix: cookie.name.slice(0, 3),
        domain: cookie.domain,
        path: cookie.path,
        sameSite: cookie.sameSite,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
      })),
    };
    await context.close();
  }

  const report = {
    schemaVersion: 1,
    label,
    baseOrigin: new URL(baseURL).origin,
    generatedAt: new Date().toISOString(),
    results,
    loginProbe,
  };
  writeFileSync(resolve(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
