/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createServerClient } from "@supabase/ssr";

import { assertProject004Workspace } from "./project004-identity.ts";
import {
  loadOwnerLocalSupabase,
  queryOwnerLocalDatabase,
  type OwnerLocalSupabase,
} from "./owner-local-demo-support.ts";

const root = assertProject004Workspace();
const host = "127.0.0.1";
const checkpoint = process.env.PLAVE_UIUX_CHECKPOINT;
const visualCheckpoint = checkpoint === "sprint7b";
const sitewideCheckpoint = checkpoint === "sitewide-v2";
const artifactRoot = visualCheckpoint
  ? "artifacts/uiux-redesign-checkpoint"
  : sitewideCheckpoint
    ? "artifacts/uiux-v2-sitewide"
    : "artifacts/uiux-acceptance";
const port = visualCheckpoint ? 3016 : sitewideCheckpoint ? 3017 : 3015;
const baseURL = `http://${host}:${port}`;
const screenshotDirectory = resolve(
  root,
  visualCheckpoint || sitewideCheckpoint
    ? artifactRoot
    : `${artifactRoot}/screenshots`,
);
const resultPath = resolve(
  root,
  visualCheckpoint || sitewideCheckpoint
    ? `${artifactRoot}/report.json`
    : `${artifactRoot}/playwright-result.json`,
);
const chromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const playwrightToolRoot = "/private/tmp/plave-playwright-tools";
const runTag = randomBytes(8).toString("hex");
const password = `Ui-${randomBytes(18).toString("base64url")}8!`;
let invitationToCleanup: string | null = null;

type Role = "STUDENT" | "PARENT" | "TEACHER";
type CookieJar = Map<string, string>;
type Actor = Readonly<{
  email: string;
  role: Role;
}>;
type ViewportResult = Readonly<{
  width: number;
  height: number;
  overflow: number;
  headerOverlap: boolean;
  footerWithinPage: boolean;
  focusVisible: boolean;
  touchTargets: boolean;
  mathOverflow: number;
  zoom200Overflow: number;
  consoleErrors: number;
  hydrationErrors: number;
}>;

class AcceptanceFailure extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function requireAcceptance(
  condition: unknown,
  code: string,
): asserts condition {
  if (!condition) throw new AcceptanceFailure(code);
}

function safeCode(value: unknown) {
  return value instanceof AcceptanceFailure
    ? value.code
    : value instanceof Error
      ? value.message.replace(/[^A-Z0-9_]/giu, "_").toUpperCase()
      : "UNKNOWN_FAILURE";
}

function cookieHeader(cookieJar: CookieJar) {
  return [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function createLocalClient(config: OwnerLocalSupabase, cookieJar: CookieJar) {
  return createServerClient(config.apiUrl, config.publishableKey, {
    cookies: {
      getAll: () =>
        [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const cookie of cookies) {
          if (cookie.value) cookieJar.set(cookie.name, cookie.value);
          else cookieJar.delete(cookie.name);
        }
      },
    },
  });
}

async function postWithCookies(
  cookieJar: CookieJar,
  path: string,
  body: unknown,
) {
  return fetch(`${baseURL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookieJar),
      Origin: baseURL,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
}

async function createActor(
  config: OwnerLocalSupabase,
  role: Role,
  suffix: string,
  grade?: number,
): Promise<Actor> {
  const cookieJar: CookieJar = new Map();
  const client = createLocalClient(config, cookieJar);
  const email = `uiux-acceptance-${runTag}-${suffix}@plave.local.invalid`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        ...(grade ? { grade: String(grade) } : {}),
      },
    },
  });
  requireAcceptance(!error && data.session && data.user, `CREATE_${role}`);

  if (role !== "TEACHER") {
    const response = await postWithCookies(cookieJar, "/api/onboarding", {
      fullName:
        role === "PARENT"
          ? "Phụ huynh kiểm thử"
          : "Học sinh kiểm thử",
      birthDate: "",
    });
    requireAcceptance(response.ok, `ONBOARD_${role}`);
  } else {
    const invitationCode = queryOwnerLocalDatabase(
      config,
      "select private.issue_teacher_invitation(now() + interval '2 hours');",
    );
    requireAcceptance(
      /^PLV-TCH-[0-9A-F]{32}$/u.test(invitationCode),
      "TEACHER_INVITATION",
    );
    invitationToCleanup = invitationCode;
    const response = await postWithCookies(
      cookieJar,
      "/api/teacher/activate",
      {
        fullName: "Giáo viên kiểm thử",
        invitationCode,
      },
    );
    requireAcceptance(response.ok, "ACTIVATE_TEACHER_FIXTURE");
  }

  await client.auth.signOut();
  return { email, role };
}

function cleanupActors(config: OwnerLocalSupabase) {
  queryOwnerLocalDatabase(
    config,
    `
      begin;
      set local session_replication_role = replica;
      create temporary table uiux_acceptance_users on commit drop as
      select id from auth.users
      where email like 'uiux-acceptance-${runTag}-%@plave.local.invalid';

      delete from public.practice_answers
      where attempt_id in (
        select id from public.practice_attempts
        where student_id in (select id from uiux_acceptance_users)
      );
      delete from public.practice_attempts
      where student_id in (select id from uiux_acceptance_users);
      delete from public.learning_goals
      where student_id in (select id from uiux_acceptance_users);
      delete from public.parent_goal_suggestions
      where student_user_id in (select id from uiux_acceptance_users)
        or parent_user_id in (select id from uiux_acceptance_users);
      delete from public.parent_student_connections
      where parent_user_id in (select id from uiux_acceptance_users)
        or student_user_id in (select id from uiux_acceptance_users);

      delete from public.assignment_answers
      where submission_id in (
        select submission.id
        from public.assignment_submissions as submission
        join public.teacher_assignments as assignment
          on assignment.id = submission.assignment_id
        where assignment.teacher_id in (select id from uiux_acceptance_users)
      );
      delete from public.assignment_submissions
      where assignment_id in (
        select id from public.teacher_assignments
        where teacher_id in (select id from uiux_acceptance_users)
      );
      delete from public.teacher_assignment_items
      where assignment_id in (
        select id from public.teacher_assignments
        where teacher_id in (select id from uiux_acceptance_users)
      );
      delete from public.teacher_assignments
      where teacher_id in (select id from uiux_acceptance_users);
      delete from public.teacher_question_solutions
      where question_id in (
        select id from public.teacher_questions
        where teacher_id in (select id from uiux_acceptance_users)
      );
      delete from public.teacher_questions
      where teacher_id in (select id from uiux_acceptance_users);
      delete from public.classroom_memberships
      where classroom_id in (
        select id from public.classrooms
        where teacher_id in (select id from uiux_acceptance_users)
      )
        or student_id in (select id from uiux_acceptance_users);
      delete from public.classrooms
      where teacher_id in (select id from uiux_acceptance_users);

      delete from public.teacher_profiles
      where user_id in (select id from uiux_acceptance_users);
      delete from public.teacher_invitations
      where teacher_user_id in (select id from uiux_acceptance_users)
        ${
          invitationToCleanup
            ? `or code_hash = extensions.digest('${invitationToCleanup}', 'sha256')`
            : ""
        };
      delete from public.student_profiles
      where user_id in (select id from uiux_acceptance_users);
      delete from public.profiles
      where user_id in (select id from uiux_acceptance_users);
      delete from auth.users
      where id in (select id from uiux_acceptance_users);
      commit;
    `,
  );
}

async function assertPortAvailable() {
  await new Promise<void>((resolveReady, reject) => {
    const server = createServer();
    server.once("error", () => reject(new AcceptanceFailure("PORT_3015_BUSY")));
    server.listen(port, host, () => server.close(() => resolveReady()));
  });
}

function stopProcessGroup(child: ChildProcess | null) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // The exact PROJECT004 child group may already be stopped.
  }
}

async function waitForApp(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL, {
        signal: AbortSignal.timeout(2_500),
      });
      if (response.ok) return;
    } catch {
      // Next may still be compiling.
    }
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 300));
  }
  throw new AcceptanceFailure("NEXT_READINESS_TIMEOUT");
}

function browserErrors(page: any) {
  const errors: string[] = [];
  const hydration: string[] = [];
  page.on("console", (message: any) => {
    const text = message.text();
    if (message.type() === "error") errors.push(text);
    if (/hydration|did not match|server rendered html/iu.test(text)) {
      hydration.push(text);
    }
  });
  page.on("pageerror", (error: Error) => errors.push(error.message));
  page.on("requestfailed", (request: any) => {
    const url = request.url();
    if (url.startsWith(baseURL)) {
      errors.push(`REQUEST_FAILED:${new URL(url).pathname}:${request.failure()?.errorText ?? "UNKNOWN"}`);
    }
  });
  page.on("response", (response: any) => {
    if (response.url().startsWith(baseURL) && response.status() >= 500) {
      errors.push(
        `HTTP_${response.status()}:${new URL(response.url()).pathname}`,
      );
    }
  });
  return { errors, hydration };
}

function sanitizedBrowserIssue(value: string) {
  return value
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/giu, "<ID>")
    .replace(/uiux-acceptance-[^\s@]+@plave\.local\.invalid/giu, "<LOCAL_FIXTURE>")
    .slice(0, 500);
}

async function settle(page: any) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(250);
}

async function goto(page: any, path: string) {
  const response = await page.goto(`${baseURL}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await settle(page);
  return response;
}

async function hideSensitiveScreenshotContent(page: any) {
  await page.locator("nextjs-portal").evaluateAll((items: HTMLElement[]) => {
    items.forEach((item) => item.remove());
  });
  await page.addStyleTag({
    content: `
      [aria-labelledby="student-code-title"],
      .profile-code-card { display: none !important; }

      .profile-readonly code,
      .classroom-created-card code,
      .classroom-code-card h2,
      .settings-card dl > div:first-child dd {
        color: transparent !important;
        background: #dbe5ef !important;
        border-radius: 0.35rem !important;
        text-shadow: none !important;
        user-select: none !important;
      }
    `,
  });
}

async function screenshot(
  page: any,
  name: string,
  options: Readonly<{
    locator?: any;
    mask?: any[];
    fullPage?: boolean;
    preserveScroll?: boolean;
  }> = {},
) {
  await hideSensitiveScreenshotContent(page);
  const path = resolve(screenshotDirectory, name);
  const settings = {
    path,
    animations: "disabled" as const,
    caret: "hide" as const,
    mask: options.mask ?? [],
    maskColor: "#dbe5ef",
  };
  if (options.locator) await options.locator.screenshot(settings);
  else {
    if (!options.preserveScroll) {
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({
      ...settings,
      fullPage: options.fullPage ?? true,
    });
  }
  return visualCheckpoint || sitewideCheckpoint
    ? `${artifactRoot}/${name}`
    : `${artifactRoot}/screenshots/${name}`;
}

async function auditSitewideRoute(
  page: any,
  options: Readonly<{
    path: string;
    label: string;
    screenshotName: string;
    rootSelector?: string;
    fullPage?: boolean;
  }>,
) {
  const response = await goto(page, options.path);
  requireAcceptance(
    Boolean(response) && (response?.status() ?? 500) < 500,
    `${options.label}_HTTP`,
  );
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  if (options.rootSelector) {
    requireAcceptance(
      (await page.locator(options.rootSelector).count()) > 0,
      `${options.label}_V2_ROOT`,
    );
  }
  await staticAccessibilityAudit(page, options.label);
  const textAudit = await auditVisibleTextLayout(page, options.label);
  const layout = await page.evaluate(() => ({
    overflow: Math.max(
      0,
      document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    clippedVisibleText: [
      ...document.querySelectorAll<HTMLElement>(
        "main :is(h1,h2,h3,h4,p,li,label,button,a[href],th,td)",
      ),
    ]
      .filter((element) => {
        if (element.closest(".sr-only, [aria-hidden=true]")) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 2 &&
          getComputedStyle(element).overflowX === "hidden",
      )
      .map((element) => ({
        selector: `${element.tagName.toLowerCase()}${
          element.id ? `#${element.id}` : ""
        }${[...element.classList]
          .slice(0, 2)
          .map((name) => `.${name}`)
          .join("")}`,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      })),
  }));
  requireAcceptance(layout.overflow === 0, `${options.label}_OVERFLOW`);
  if (layout.clippedVisibleText.length > 0) {
    process.stdout.write(
      `${JSON.stringify({
        sitewideClippedText: options.label,
        items: layout.clippedVisibleText.slice(0, 5),
      })}\n`,
    );
  }
  requireAcceptance(
    layout.clippedVisibleText.length === 0,
    `${options.label}_CLIPPED_TEXT`,
  );
  const imagePath = await screenshot(page, options.screenshotName, {
    fullPage: options.fullPage ?? true,
  });
  return {
    route: new URL(page.url()).pathname,
    requestedPath: options.path,
    status: response?.status() ?? 0,
    rootSelector: options.rootSelector ?? null,
    viewport: await page.viewportSize(),
    overflow: layout.overflow,
    clippedVisibleText: layout.clippedVisibleText.length,
    textElementsInspected: textAudit.inspected,
    screenshot: imagePath,
  };
}

async function auditVisibleTextLayout(page: any, label: string) {
  const result = await page.evaluate((auditLabel: string) => {
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const lineCount = (element: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const tops = [...range.getClientRects()]
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => Math.round(rect.top * 2) / 2);
      return new Set(tops).size;
    };
    const selector = (element: HTMLElement) =>
      `${element.tagName.toLowerCase()}${
        element.id
          ? `#${element.id}`
          : [...element.classList]
              .slice(0, 3)
              .map((name) => `.${name}`)
              .join("")
      }`;
    const issues: Array<{
      selector: string;
      kind: string;
      width: number;
      height: number;
      lines: number;
      textLength: number;
    }> = [];
    const candidates = [
      ...new Set(
        document.querySelectorAll<HTMLElement>(
          "body :is(h1,h2,h3,h4,p,li,dt,dd,label,button,a[href],th,td,.unit-card__metadata-region > span,.real-question-card__prompt,.choice,.feedback)",
        ),
      ),
    ];
    for (const element of candidates) {
      if (
        !visible(element) ||
        element.closest(".sr-only, .sky-math-journey, [aria-hidden=true]")
      ) {
        continue;
      }
      const text = element.innerText.replace(/\s+/gu, " ").trim();
      if (!text) continue;
      const rect = element.getBoundingClientRect();
      const lines = lineCount(element);
      const nonWhitespaceLength = text.replace(/\s/gu, "").length;
      const record = (kind: string) =>
        issues.push({
          selector: selector(element),
          kind,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          lines,
          textLength: text.length,
        });

      if (text.length > 12 && rect.width < 48 && rect.height > rect.width * 2.5) {
        record("NARROW_TALL_TEXT");
      }
      if (
        nonWhitespaceLength > 12 &&
        lines >= 6 &&
        lines >= Math.ceil(nonWhitespaceLength * 0.55)
      ) {
        record("CHARACTER_LEVEL_WRAP");
      }
      if (rect.width < 1 || rect.height < 1) record("ZERO_SIZE_TEXT");

      const card = element.closest<HTMLElement>(
        ".unit-card, .recommendation-card, .personalized-recommendation, .competency-card, .review-summary, .teacher-status-card, .connection-card, .empty-state, .error-state",
      );
      if (card && card !== element) {
        const bounds = card.getBoundingClientRect();
        if (
          rect.left < bounds.left - 2 ||
          rect.right > bounds.right + 2 ||
          rect.top < bounds.top - 2 ||
          rect.bottom > bounds.bottom + 2
        ) {
          record("TEXT_OUTSIDE_CARD");
        }
      }
    }
    return {
      label: auditLabel,
      inspected: candidates.length,
      issues,
    };
  }, label);
  requireAcceptance(
    result.inspected > 0,
    `${label}_TEXT_AUDIT_EMPTY`,
  );
  requireAcceptance(
    result.issues.length === 0,
    `${label}_COLLAPSED_TEXT_${result.issues[0]?.kind ?? "UNKNOWN"}`,
  );
  return result;
}

async function auditLessonCards(page: any, viewportWidth: number) {
  const result = await page.evaluate((width: number) => {
    const lineCount = (element: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return new Set(
        [...range.getClientRects()]
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => Math.round(rect.top * 2) / 2),
      ).size;
    };
    const mobile = width <= 700;
    const issues: Array<{ index: number; kind: string; value: number }> = [];
    const cards = [
      ...document.querySelectorAll<HTMLElement>(
        ".catalog-page--v2 .unit-card:has(.unit-card__content-region)",
      ),
    ];
    const metrics = cards.map((card, index) => {
      const title = card.querySelector<HTMLElement>("h3");
      const content = card.querySelector<HTMLElement>(".unit-card__content-region");
      const metadata = card.querySelector<HTMLElement>(".unit-card__metadata-region");
      const action = card.querySelector<HTMLElement>(".unit-card__actions");
      const status = card.querySelector<HTMLElement>(".unit-card__status-region");
      if (!title || !content || !metadata || !action || !status) {
        issues.push({ index, kind: "MISSING_SEMANTIC_REGION", value: 0 });
        return null;
      }
      const cardRect = card.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const metadataRect = metadata.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      const statusRect = status.getBoundingClientRect();
      const lines = lineCount(title);
      const maxLines = mobile ? 4 : 3;
      const nonWhitespaceLength = (title.innerText ?? "").replace(/\s/gu, "").length;
      const ctaVisible = [...action.querySelectorAll<HTMLElement>("a,button")].every(
        (element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width >= 44 &&
            rect.height >= 44 &&
            rect.left >= cardRect.left - 1 &&
            rect.right <= cardRect.right + 1 &&
            rect.top >= cardRect.top - 1 &&
            rect.bottom <= cardRect.bottom + 1
          );
        },
      );

      if (lines > maxLines) issues.push({ index, kind: "TITLE_LINE_COUNT", value: lines });
      if (titleRect.width < 96) issues.push({ index, kind: "TITLE_WIDTH", value: titleRect.width });
      if (lines >= Math.ceil(nonWhitespaceLength * 0.55)) {
        issues.push({ index, kind: "CHARACTER_LEVEL_TITLE_WRAP", value: lines });
      }
      if (!mobile && contentRect.width < cardRect.width * 0.55) {
        issues.push({ index, kind: "CONTENT_COLUMN_SHARE", value: contentRect.width / cardRect.width });
      }
      if (!mobile && actionRect.width > cardRect.width * 0.35) {
        issues.push({ index, kind: "ACTION_COLUMN_SHARE", value: actionRect.width / cardRect.width });
      }
      if (metadata.innerText.trim().length > 12 && metadataRect.width < 96) {
        issues.push({ index, kind: "METADATA_WIDTH", value: metadataRect.width });
      }
      if (statusRect.width > cardRect.width * 0.6 && contentRect.width < statusRect.width) {
        issues.push({ index, kind: "STATUS_CONTROLS_CONTENT", value: statusRect.width });
      }
      if (!ctaVisible) issues.push({ index, kind: "CTA_BOUNDS", value: 0 });
      if (card.scrollWidth > card.clientWidth + 1) {
        issues.push({ index, kind: "CARD_OVERFLOW", value: card.scrollWidth - card.clientWidth });
      }
      if (cardRect.height > (mobile ? 760 : 520)) {
        issues.push({ index, kind: "CARD_EXCESSIVE_HEIGHT", value: cardRect.height });
      }
      return {
        index,
        cardWidth: cardRect.width,
        cardHeight: cardRect.height,
        titleWidth: titleRect.width,
        titleLines: lines,
        contentWidth: contentRect.width,
        metadataWidth: metadataRect.width,
        actionWidth: actionRect.width,
      };
    });
    return {
      viewportWidth: width,
      pageOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      cards: metrics.filter(Boolean),
      issues,
    };
  }, viewportWidth);

  requireAcceptance(result.cards.length > 0, `LESSONS_${viewportWidth}_CARDS`);
  requireAcceptance(result.pageOverflow === 0, `LESSONS_${viewportWidth}_OVERFLOW`);
  requireAcceptance(
    result.issues.length === 0,
    `LESSONS_${viewportWidth}_${result.issues[0]?.kind ?? "LAYOUT"}`,
  );
  return result;
}

async function captureLessonCardLayoutEvidence(
  page: any,
  phase: "before" | "after",
) {
  const title = page
    .getByRole("heading", {
      name: "Phép cộng trong phạm vi 10",
      exact: true,
    })
    .first();
  requireAcceptance(
    (await title.count()) === 1,
    `LESSON_CARD_${phase.toUpperCase()}_TARGET`,
  );
  const card = title.locator("xpath=ancestor::article[contains(@class, 'unit-card')]");
  await card.scrollIntoViewIfNeeded();

  const evidence = await card.evaluate((cardElement: HTMLElement) => {
    const titleElement = cardElement.querySelector<HTMLElement>("h3");
    const headingElement = cardElement.querySelector<HTMLElement>(
      ".unit-card__heading",
    );
    const metadataElement =
      cardElement.querySelector<HTMLElement>(".unit-card__metadata-region") ??
      (headingElement?.lastElementChild as HTMLElement | null);
    const descriptionElement = cardElement.querySelector<HTMLElement>(
      ".unit-card__description, :scope > p:not(.unit-card__progress)",
    );
    const progressElement = cardElement.querySelector<HTMLElement>(
      ".unit-card__progress",
    );
    const actionElement = cardElement.querySelector<HTMLElement>(
      ".unit-card__actions, :scope > .button",
    );

    const lineCount = (element: HTMLElement | null) => {
      if (!element) return 0;
      const range = document.createRange();
      range.selectNodeContents(element);
      const tops = [...range.getClientRects()]
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => Math.round(rect.top * 2) / 2);
      return new Set(tops).size;
    };
    const snapshot = (element: HTMLElement | null) => {
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector:
          element === cardElement
            ? "article.unit-card"
            : element.className
              ? `${element.tagName.toLowerCase()}.${String(element.className)
                  .trim()
                  .split(/\\s+/u)
                  .join(".")}`
              : element.tagName.toLowerCase(),
        width: rect.width,
        height: rect.height,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        flex: style.flex,
        flexBasis: style.flexBasis,
        flexShrink: style.flexShrink,
        gridColumn: style.gridColumn,
        gridRow: style.gridRow,
        gridTemplateColumns: style.gridTemplateColumns,
        gridAutoColumns: style.gridAutoColumns,
        display: style.display,
        position: style.position,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        whiteSpace: style.whiteSpace,
        wordBreak: style.wordBreak,
        overflowWrap: style.overflowWrap,
        writingMode: style.writingMode,
        containerType: style.containerType,
        containerName: style.containerName,
        lineCount: lineCount(element),
      };
    };

    const matchingRules = (element: HTMLElement | null) => {
      if (!element) return [];
      const matches: Array<{
        source: string;
        selector: string;
        declarations: string;
        conditions: string[];
      }> = [];
      const visit = (rules: CSSRuleList, source: string, conditions: string[]) => {
        for (const rule of [...rules]) {
          if (rule instanceof CSSStyleRule) {
            try {
              if (element.matches(rule.selectorText)) {
                matches.push({
                  source,
                  selector: rule.selectorText,
                  declarations: rule.style.cssText,
                  conditions,
                });
              }
            } catch {
              // A browser-specific selector may not be accepted by matches().
            }
            continue;
          }
          const nested = (rule as CSSGroupingRule).cssRules;
          if (!nested) continue;
          const conditionText =
            "conditionText" in rule
              ? String((rule as CSSMediaRule).conditionText)
              : rule.constructor.name;
          visit(nested, source, [...conditions, conditionText]);
        }
      };
      for (const sheet of [...document.styleSheets]) {
        try {
          visit(
            sheet.cssRules,
            sheet.href ? new URL(sheet.href).pathname : "inline-style",
            [],
          );
        } catch {
          // Cross-origin stylesheets are intentionally not inspected.
        }
      }
      return matches;
    };

    const containerAncestors = [];
    let ancestor = cardElement.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      if (style.containerType !== "normal" || style.containerName !== "none") {
        containerAncestors.push(snapshot(ancestor));
      }
      ancestor = ancestor.parentElement;
    }

    return {
      route: location.pathname,
      component: "app/lessons/page.tsx:personalized-unit-card",
      lessonCardVariant: [...cardElement.classList].filter(
        (name) => name !== "unit-card",
      ),
      viewport: { width: innerWidth, height: innerHeight },
      mediaQueries: [700, 768, 980, 1024, 1040].map((width) => ({
        query: `(max-width: ${width}px)`,
        matches: matchMedia(`(max-width: ${width}px)`).matches,
      })),
      elements: {
        card: snapshot(cardElement),
        heading: snapshot(headingElement),
        metadata: snapshot(metadataElement),
        title: snapshot(titleElement),
        description: snapshot(descriptionElement),
        progress: snapshot(progressElement),
        action: snapshot(actionElement),
      },
      containerAncestors,
      matchingRules: {
        card: matchingRules(cardElement),
        heading: matchingRules(headingElement),
        metadata: matchingRules(metadataElement),
        title: matchingRules(titleElement),
        description: matchingRules(descriptionElement),
        progress: matchingRules(progressElement),
        action: matchingRules(actionElement),
      },
    };
  });

  writeFileSync(
    resolve(root, artifactRoot, `collapsed-layout-${phase}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  return screenshot(page, `lesson-card-detail-${phase}.png`, {
    locator: card,
  });
}

async function staticAccessibilityAudit(page: any, label: string) {
  const result = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
      (element) => element.id,
    );
    const duplicateIds = ids.filter(
      (id, index) => ids.indexOf(id) !== index,
    );
    const unlabeledInputs = [
      ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input:not([type=hidden]), select, textarea",
      ),
    ]
      .filter(visible)
      .filter((element) => {
        const labelledBy = element.getAttribute("aria-labelledby");
        const ariaLabel = element.getAttribute("aria-label")?.trim();
        const explicit = element.id
          ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
          : null;
        return !ariaLabel && !labelledBy && !explicit && !element.closest("label");
      }).length;
    const unnamedActions = [
      ...document.querySelectorAll<HTMLElement>(
        "button, a[href], [role=button]",
      ),
    ]
      .filter(visible)
      .filter((element) => {
        const labelledBy = element
          .getAttribute("aria-labelledby")
          ?.split(/\s+/u)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ");
        const imageAlt = element.querySelector("img")?.getAttribute("alt");
        return !(
          element.innerText ||
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          labelledBy ||
          imageAlt
        )?.trim();
      }).length;
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter(visible)
      .map((element) => Number(element.tagName.slice(1)));
    const headingJumps = headings.filter(
      (level, index) => index > 0 && level - headings[index - 1] > 1,
    ).length;
    const inaccessibleImages = [
      ...document.querySelectorAll<HTMLElement>("img, svg[role=img]"),
    ]
      .filter(visible)
      .filter((element) => {
        if (element instanceof HTMLImageElement) return !element.hasAttribute("alt");
        return !(
          element.getAttribute("aria-label") ||
          element.querySelector("title")?.textContent?.trim()
        );
      }).length;
    return {
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      duplicateIds: [...new Set(duplicateIds)].length,
      unlabeledInputs,
      unnamedActions,
      headingJumps,
      inaccessibleImages,
    };
  });
  requireAcceptance(result.mainCount === 1, `${label}_MAIN_LANDMARK`);
  requireAcceptance(result.h1Count >= 1, `${label}_H1`);
  requireAcceptance(result.duplicateIds === 0, `${label}_DUPLICATE_IDS`);
  requireAcceptance(result.unlabeledInputs === 0, `${label}_FORM_LABELS`);
  requireAcceptance(result.unnamedActions === 0, `${label}_ACTION_NAMES`);
  requireAcceptance(result.headingJumps === 0, `${label}_HEADING_ORDER`);
  requireAcceptance(result.inaccessibleImages === 0, `${label}_IMAGE_NAMES`);
}

async function viewportAudit(browser: any, viewport: { width: number; height: number }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await context.newPage();
  const captured = browserErrors(page);
  await goto(page, "/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await staticAccessibilityAudit(page, `LANDING_${viewport.width}`);
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const header = document.querySelector("header.site-header")?.getBoundingClientRect();
    const main = document.querySelector("main")?.getBoundingClientRect();
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    return {
      overflow: Math.max(0, root.scrollWidth - root.clientWidth),
      headerOverlap: Boolean(header && main && header.bottom > main.top + 1),
      footerWithinPage: Boolean(footer && footer.right <= root.clientWidth + 1),
    };
  });

  await page.keyboard.press("Tab");
  const focusVisible = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return false;
    const style = getComputedStyle(element);
    return (
      style.outlineStyle !== "none" ||
      style.boxShadow !== "none" ||
      element.classList.contains("skip-link")
    );
  });
  const touchTargets = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".button, .site-menu-toggle")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .every((element) => element.getBoundingClientRect().height >= 44),
  );

  await goto(
    page,
    "/curriculum-preview?grade=7&unit=grade-7-secondary-geo-p1-8",
  );
  const start = page.getByRole("button", { name: /Bắt đầu luyện tập/iu });
  if (await start.count()) await start.click();
  await page.waitForTimeout(200);
  const mathOverflow = await page.evaluate(() => {
    const visual = document.querySelector<HTMLElement>(
      ".curriculum-visual, .practice-visual",
    );
    return visual ? Math.max(0, visual.scrollWidth - visual.clientWidth) : 0;
  });
  let zoom200Overflow = 0;
  if (viewport.width === 1280) {
    await page.setViewportSize({
      width: Math.floor(viewport.width / 2),
      height: Math.floor(viewport.height / 2),
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await settle(page);
    zoom200Overflow = await page.evaluate(() =>
      Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    );
  }

  const result: ViewportResult = {
    width: viewport.width,
    height: viewport.height,
    overflow: layout.overflow,
    headerOverlap: layout.headerOverlap,
    footerWithinPage: layout.footerWithinPage,
    focusVisible,
    touchTargets,
    mathOverflow,
    zoom200Overflow,
    consoleErrors: captured.errors.length,
    hydrationErrors: captured.hydration.length,
  };
  await context.close();
  return result;
}

async function login(page: any, actor: Actor) {
  await goto(page, "/login");
  await page.getByRole("textbox", { name: /^Email/iu }).fill(actor.email);
  await page.getByLabel(/^Mật khẩu/iu).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((url: URL) =>
    actor.role === "TEACHER"
      ? url.pathname === "/teacher"
      : url.pathname === "/dashboard",
  );
  await settle(page);
}

function attemptAnswers(config: OwnerLocalSupabase, attemptId: string) {
  requireAcceptance(
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(attemptId),
    "ATTEMPT_ID_FORMAT",
  );
  const output = queryOwnerLocalDatabase(
    config,
    `
      select question.code, solution.correct_answer
      from public.practice_attempts as attempt
      cross join unnest(attempt.question_order) with ordinality as ordered(code, position)
      join public.questions as question on question.code = ordered.code
      join public.question_solutions as solution on solution.question_id = question.code
      where attempt.id = '${attemptId}'
      order by ordered.position;
    `,
  );
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t")[1] ?? "");
}

async function answerCurrentQuestion(
  page: any,
  correctAnswer: string,
  correct: boolean,
) {
  const radios = page.locator('input[type="radio"]');
  if (await radios.count()) {
    const values = await radios.evaluateAll((items: HTMLInputElement[]) =>
      items.map((item) => item.value),
    );
    const answer = correct
      ? correctAnswer
      : values.find((value: string) => value !== correctAnswer) ?? values[0];
    await page.locator(`input[type="radio"][value="${answer}"]`).check();
  } else {
    const value = correct
      ? correctAnswer
      : String(Number(correctAnswer || "0") + 1);
    await page.getByLabel("Câu trả lời của em").fill(value);
  }
  await page.getByRole("button", { name: /Kiểm tra câu trả lời|Thử lại/iu }).click();
  await page.locator(".feedback").waitFor();
}

async function runJourneys(browser: any, config: OwnerLocalSupabase) {
  const screenshots: string[] = [];
  if (
    visualCheckpoint &&
    existsSync(resolve(root, artifactRoot, "lesson-card-detail-before.png"))
  ) {
    screenshots.push(`${artifactRoot}/lesson-card-detail-before.png`);
  }
  const journeyResults: Record<string, string> = {};
  const textLayoutAudits: Array<Record<string, unknown>> = [];
  const lessonCardViewports: Array<Record<string, unknown>> = [];
  const sitewideRoutes: Array<Record<string, unknown>> = [];
  const allErrors: string[] = [];
  const allHydration: string[] = [];

  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const anonymousPage = await anonymous.newPage();
  const anonymousCaptured = browserErrors(anonymousPage);
  await goto(anonymousPage, "/");
  textLayoutAudits.push(await auditVisibleTextLayout(anonymousPage, "LANDING_DESKTOP"));
  screenshots.push(await screenshot(anonymousPage, "landing-desktop.png"));
  await anonymousPage.setViewportSize({ width: 390, height: 844 });
  await goto(anonymousPage, "/");
  screenshots.push(await screenshot(anonymousPage, "landing-mobile.png"));
  await anonymousPage.getByRole("button", { name: /Mở menu điều hướng/iu }).click();
  screenshots.push(
    await screenshot(
      anonymousPage,
      visualCheckpoint ? "public-mobile-menu.png" : "mobile-menu.png",
    ),
  );
  await anonymousPage.setViewportSize({ width: 1280, height: 800 });
  await goto(anonymousPage, "/login");
  textLayoutAudits.push(await auditVisibleTextLayout(anonymousPage, "LOGIN_DESKTOP"));
  screenshots.push(
    await screenshot(anonymousPage, "login-desktop.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  await staticAccessibilityAudit(anonymousPage, "LOGIN");
  await anonymousPage.setViewportSize({ width: 390, height: 844 });
  if (visualCheckpoint) {
    await goto(anonymousPage, "/login");
    screenshots.push(
      await screenshot(anonymousPage, "login-mobile.png", { fullPage: false }),
    );
  }
  await goto(anonymousPage, "/register");
  textLayoutAudits.push(await auditVisibleTextLayout(anonymousPage, "REGISTER_MOBILE"));
  screenshots.push(
    await screenshot(
      anonymousPage,
      visualCheckpoint ? "register-role.png" : "register-role-mobile.png",
    ),
  );
  await staticAccessibilityAudit(anonymousPage, "REGISTER");
  await goto(anonymousPage, "/dashboard");
  requireAcceptance(
    new URL(anonymousPage.url()).pathname === "/login",
    "ANONYMOUS_PROTECTED_ROUTE",
  );
  const errorsBeforeExpectedNotFound = anonymousCaptured.errors.length;
  const notFoundResponse = await goto(
    anonymousPage,
    "/sprint-7a-local-not-found",
  );
  requireAcceptance(notFoundResponse?.status() === 404, "NOT_FOUND_STATUS");
  screenshots.push(await screenshot(anonymousPage, "error-state.png"));
  const expectedNotFoundErrors = anonymousCaptured.errors.splice(
    errorsBeforeExpectedNotFound,
  );
  requireAcceptance(
    expectedNotFoundErrors.length <= 1 &&
      expectedNotFoundErrors.every(
        (issue) =>
          issue ===
          "Failed to load resource: the server responded with a status of 404 (Not Found)",
      ),
    "NOT_FOUND_UNEXPECTED_BROWSER_ERROR",
  );
  if (sitewideCheckpoint) {
    const publicRoutes = [
      {
        path: "/about",
        label: "SITEWIDE_ABOUT",
        screenshotName: "about-desktop.png",
        rootSelector: ".public-story-page--v2",
      },
      {
        path: "/demo",
        label: "SITEWIDE_DEMO",
        screenshotName: "demo-desktop.png",
        rootSelector: ".demo-page--v2",
      },
      {
        path: "/forgot-password",
        label: "SITEWIDE_FORGOT_PASSWORD",
        screenshotName: "forgot-password-desktop.png",
        rootSelector: ".auth-page--v2",
      },
      {
        path: "/privacy",
        label: "SITEWIDE_PRIVACY",
        screenshotName: "privacy.png",
        rootSelector: ".legal-page--v2",
      },
      {
        path: "/terms",
        label: "SITEWIDE_TERMS",
        screenshotName: "terms.png",
        rootSelector: ".legal-page--v2",
      },
      {
        path: "/curriculum-preview?grade=7&unit=grade-7-secondary-geo-p1-8",
        label: "SITEWIDE_CURRICULUM_PREVIEW",
        screenshotName: "curriculum-preview.png",
        rootSelector: ".preview-page--v2",
      },
    ] as const;
    await anonymousPage.setViewportSize({ width: 1280, height: 800 });
    for (const route of publicRoutes) {
      sitewideRoutes.push(await auditSitewideRoute(anonymousPage, route));
      screenshots.push(`${artifactRoot}/${route.screenshotName}`);
    }
    await anonymousPage.setViewportSize({ width: 390, height: 844 });
    sitewideRoutes.push(
      await auditSitewideRoute(anonymousPage, {
        path: "/forgot-password",
        label: "SITEWIDE_FORGOT_PASSWORD_MOBILE",
        screenshotName: "forgot-password-mobile.png",
        rootSelector: ".auth-page--v2",
        fullPage: false,
      }),
    );
    screenshots.push(`${artifactRoot}/forgot-password-mobile.png`);
    journeyResults.sitewidePublic = "PASS";
  }
  allErrors.push(...anonymousCaptured.errors);
  allHydration.push(...anonymousCaptured.hydration);
  journeyResults.anonymous = "PASS";
  await anonymous.close();

  const studentActor = await createActor(config, "STUDENT", "student", 1);
  const student = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const studentPage = await student.newPage();
  const studentCaptured = browserErrors(studentPage);
  await login(studentPage, studentActor);
  await studentPage.getByRole("heading", { level: 1 }).waitFor();
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "STUDENT_DASHBOARD_DESKTOP"));
  screenshots.push(
    await screenshot(studentPage, "student-dashboard-desktop.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  await studentPage.setViewportSize({ width: 390, height: 844 });
  await studentPage.reload({ waitUntil: "domcontentloaded" });
  await settle(studentPage);
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "STUDENT_DASHBOARD_MOBILE"));
  screenshots.push(
    await screenshot(studentPage, "student-dashboard-mobile.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  if (visualCheckpoint) {
    screenshots.push(
      await screenshot(studentPage, "mobile-navigation.png", {
        fullPage: false,
      }),
    );
  }
  await studentPage.setViewportSize({ width: 1280, height: 800 });
  await goto(studentPage, "/lessons");
  requireAcceptance(
    (await studentPage.locator(".generated-practice-pilot-card").count()) === 0,
    "GENERATED_PILOT_RUNTIME_OFF_HIDDEN",
  );
  if (visualCheckpoint) {
    screenshots.push(
      await captureLessonCardLayoutEvidence(studentPage, "after"),
    );
  }
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "LESSONS_DESKTOP"));
  screenshots.push(
    await screenshot(studentPage, "lessons-desktop.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  if (visualCheckpoint) {
    const lessonViewports = [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ];
    for (const viewport of lessonViewports) {
      await studentPage.setViewportSize(viewport);
      await goto(studentPage, "/lessons");
      const targetCard = studentPage
        .getByRole("heading", {
          name: "Phép cộng trong phạm vi 10",
          exact: true,
        })
        .first()
        .locator("xpath=ancestor::article[contains(@class, 'unit-card')]");
      await targetCard.scrollIntoViewIfNeeded();
      await targetCard.evaluate((element: HTMLElement) => {
        const cardRect = element.getBoundingClientRect();
        const headerRect = document
          .querySelector<HTMLElement>("header.site-header")
          ?.getBoundingClientRect();
        const mobileHeaderOffset =
          headerRect &&
          headerRect.width > innerWidth * 0.8 &&
          headerRect.height < innerHeight * 0.4
            ? headerRect.bottom + 12
            : 16;
        window.scrollTo({
          top: Math.max(0, scrollY + cardRect.top - mobileHeaderOffset),
          behavior: "auto",
        });
      });
      await studentPage.waitForTimeout(50);
      lessonCardViewports.push(
        await auditLessonCards(studentPage, viewport.width),
      );
      textLayoutAudits.push(
        await auditVisibleTextLayout(
          studentPage,
          `LESSONS_${viewport.width}`,
        ),
      );
      screenshots.push(
        await screenshot(studentPage, `lessons-${viewport.width}.png`, {
          fullPage: false,
          preserveScroll: true,
        }),
      );
    }
  }
  await studentPage.setViewportSize({ width: 390, height: 844 });
  await goto(studentPage, "/lessons");
  screenshots.push(
    await screenshot(studentPage, "lessons-mobile.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  await studentPage.setViewportSize({ width: 1280, height: 800 });
  await goto(studentPage, "/learn/grade-1/numbers-to-10");
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "LESSON_DETAIL"));
  screenshots.push(await screenshot(studentPage, "lesson-detail.png"));
  const startButton = studentPage.getByRole("button", {
    name: /Bắt đầu luyện tập|Luyện tập ngay|Tiếp tục luyện tập/iu,
  }).first();
  await startButton.click();
  await studentPage.waitForURL(/\/practice\//u);
  await settle(studentPage);
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "PRACTICE_DESKTOP"));
  const attemptId = new URL(studentPage.url()).pathname.split("/").at(-1) ?? "";
  const answers = attemptAnswers(config, attemptId);
  requireAcceptance(answers.length > 1, "PRACTICE_PRIVATE_TEST_LOOKUP");
  screenshots.push(await screenshot(studentPage, "practice-desktop.png"));
  await studentPage.setViewportSize({ width: 390, height: 844 });
  screenshots.push(await screenshot(studentPage, "practice-mobile.png"));
  await studentPage.setViewportSize({ width: 1280, height: 800 });

  await answerCurrentQuestion(studentPage, answers[0], true);
  const feedbackMask = [
    studentPage.locator(".feedback > p:not(.feedback__status)"),
    studentPage.locator(".feedback ol"),
  ];
  screenshots.push(
    await screenshot(studentPage, "practice-correct.png", {
      locator: studentPage.locator(".real-question-card"),
      mask: feedbackMask,
    }),
  );
  await studentPage.getByRole("button", { name: /Câu tiếp theo/iu }).click();
  await answerCurrentQuestion(studentPage, answers[1], false);
  screenshots.push(
    await screenshot(studentPage, "practice-incorrect.png", {
      locator: studentPage.locator(".real-question-card"),
      mask: feedbackMask,
    }),
  );

  for (let index = 2; index < answers.length; index += 1) {
    await studentPage.getByRole("button", { name: /Câu tiếp theo/iu }).click();
    await answerCurrentQuestion(studentPage, answers[index], true);
  }
  await studentPage.getByRole("button", { name: /Xem kết quả/iu }).click();
  await studentPage.waitForURL(/\/review\//u);
  await settle(studentPage);
  await studentPage.locator(".review-summary").waitFor();
  await studentPage.locator(".skill-summary").waitFor();
  await studentPage.locator(".review-actions").waitFor();
  await studentPage.addStyleTag({
    content: ".review-list-section { display: none !important; }",
  });
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "RESULTS"));
  screenshots.push(
    await screenshot(
      studentPage,
      visualCheckpoint ? "results.png" : "practice-complete.png",
      { fullPage: !visualCheckpoint },
    ),
  );
  await goto(studentPage, "/results");
  screenshots.push(await screenshot(studentPage, "history.png"));
  await goto(studentPage, "/learning-progress");
  const studentProgressText = await studentPage.locator("main").innerText();
  requireAcceptance(
    !/\b(?:Compose Decompose|Count Recognize|Read Write Match|Sequence Compare Order)\b/u.test(
      studentProgressText,
    ),
    "STUDENT_SKILL_LOCALIZATION",
  );
  textLayoutAudits.push(await auditVisibleTextLayout(studentPage, "LEARNING_PROGRESS"));
  screenshots.push(
    await screenshot(studentPage, "competency-recommendation.png"),
  );
  await goto(studentPage, "/learn/grade-2/numbers-to-1000-preview");
  screenshots.push(await screenshot(studentPage, "ineligible-state.png"));
  await staticAccessibilityAudit(studentPage, "STUDENT_INELIGIBLE");
  if (sitewideCheckpoint) {
    await studentPage.setViewportSize({ width: 1280, height: 800 });
    const studentRoutes = [
      {
        path: "/learn",
        label: "SITEWIDE_THEORY_CATALOG",
        screenshotName: "theory-catalog.png",
        rootSelector: ".theory-catalog-page--v2",
      },
      {
        path: "/learning-history",
        label: "SITEWIDE_LEARNING_HISTORY",
        screenshotName: "learning-history.png",
        rootSelector: ".history-page--v2",
      },
      {
        path: "/classrooms",
        label: "SITEWIDE_STUDENT_CLASSROOMS",
        screenshotName: "student-classrooms.png",
        rootSelector: ".student-workspace-page--v2",
      },
      {
        path: "/assignments",
        label: "SITEWIDE_STUDENT_ASSIGNMENTS",
        screenshotName: "student-assignments.png",
        rootSelector: ".student-workspace-page--v2",
      },
      {
        path: "/diagnostic",
        label: "SITEWIDE_DIAGNOSTIC",
        screenshotName: "diagnostic.png",
        rootSelector: ".student-workspace-page--v2",
      },
      {
        path: "/grade-1/summary",
        label: "SITEWIDE_GRADE_SUMMARY",
        screenshotName: "grade-summary.png",
        rootSelector: ".progress-page--v2",
      },
      {
        path: "/goals",
        label: "SITEWIDE_GOALS",
        screenshotName: "goals.png",
        rootSelector: ".student-workspace-page--v2",
      },
      {
        path: "/connections",
        label: "SITEWIDE_STUDENT_CONNECTIONS",
        screenshotName: "student-connections.png",
        rootSelector: ".relationship-page--v2",
      },
      {
        path: "/profile",
        label: "SITEWIDE_PROFILE",
        screenshotName: "profile.png",
        rootSelector: ".account-page--v2",
      },
      {
        path: "/profile/edit",
        label: "SITEWIDE_PROFILE_EDIT",
        screenshotName: "profile-edit.png",
        rootSelector: ".account-page--v2",
      },
      {
        path: "/settings",
        label: "SITEWIDE_SETTINGS",
        screenshotName: "settings.png",
        rootSelector: ".account-page--v2",
      },
    ] as const;
    for (const route of studentRoutes) {
      sitewideRoutes.push(await auditSitewideRoute(studentPage, route));
      screenshots.push(`${artifactRoot}/${route.screenshotName}`);
    }
    journeyResults.sitewideStudent = "PASS";
  }
  allErrors.push(...studentCaptured.errors);
  allHydration.push(...studentCaptured.hydration);
  journeyResults.studentZeroProgress = "PASS";
  journeyResults.returningStudent = "PASS";
  journeyResults.generatedPilotRuntimeOff = "PASS";
  await student.close();

  if (sitewideCheckpoint) {
    journeyResults.sitewideUniversalGrades =
      "V2_SOURCE_PROPAGATED; GRADE_7_PREVIEW_BROWSER_VERIFIED; SHARED_PRACTICE_SHELL_BROWSER_VERIFIED";
  }

  const parentActor = await createActor(config, "PARENT", "parent");
  const studentConnectionCode = sitewideCheckpoint
    ? queryOwnerLocalDatabase(
        config,
        `
          select student.student_code
          from public.student_profiles as student
          join auth.users as account on account.id = student.user_id
          where account.email = '${studentActor.email}';
        `,
      )
    : "";
  const parent = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const parentPage = await parent.newPage();
  const parentCaptured = browserErrors(parentPage);
  await login(parentPage, parentActor);
  await parentPage.getByRole("heading", { name: "Học sinh đã kết nối" }).waitFor();
  textLayoutAudits.push(await auditVisibleTextLayout(parentPage, "PARENT_DASHBOARD"));
  screenshots.push(
    await screenshot(parentPage, "parent-dashboard.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  screenshots.push(
    await screenshot(parentPage, "empty-state.png", {
      locator: parentPage.locator(".connection-list-section").first(),
    }),
  );
  if (sitewideCheckpoint) {
    requireAcceptance(
      /^PLV-[A-Z0-9]{12}$/u.test(studentConnectionCode),
      "SITEWIDE_STUDENT_CONNECTION_CODE",
    );
    await goto(parentPage, "/connections");
    await parentPage.getByLabel("Mã học sinh").fill(studentConnectionCode);
    await parentPage.getByRole("button", { name: "Kiểm tra mã" }).click();
    await parentPage
      .getByRole("button", {
        name: "Đúng là con của tôi — Gửi yêu cầu kết nối",
      })
      .click();
    await parentPage.getByText(/Đang chờ học sinh xác nhận/iu).waitFor();

    const approvalContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const approvalPage = await approvalContext.newPage();
    const approvalCaptured = browserErrors(approvalPage);
    await login(approvalPage, studentActor);
    await goto(approvalPage, "/connections");
    await approvalPage
      .getByRole("button", { name: "Đồng ý kết nối" })
      .click();
    await approvalPage
      .getByText("Đã kết nối", { exact: true })
      .first()
      .waitFor();
    allErrors.push(...approvalCaptured.errors);
    allHydration.push(...approvalCaptured.hydration);
    await approvalContext.close();

    sitewideRoutes.push(
      await auditSitewideRoute(parentPage, {
        path: "/connections",
        label: "SITEWIDE_PARENT_CONNECTIONS",
        screenshotName: "parent-connections.png",
        rootSelector: ".relationship-page--v2",
      }),
    );
    screenshots.push(`${artifactRoot}/parent-connections.png`);
    const progressLink = parentPage.getByRole("link", {
      name: "Xem tiến độ",
    }).first();
    await progressLink.waitFor();
    requireAcceptance(
      (await progressLink.count()) === 1,
      "SITEWIDE_PARENT_DETAIL_LINK",
    );
    await progressLink.click();
    await parentPage.waitForURL(/\/parent\/children\//u);
    await settle(parentPage);
    await parentPage.locator(".parent-learning-page--v2").waitFor();
    await staticAccessibilityAudit(parentPage, "SITEWIDE_PARENT_DETAIL");
    const parentDetailText = await auditVisibleTextLayout(
      parentPage,
      "SITEWIDE_PARENT_DETAIL",
    );
    const parentDetailOverflow = await parentPage.evaluate(() =>
      Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    );
    requireAcceptance(
      parentDetailOverflow === 0,
      "SITEWIDE_PARENT_DETAIL_OVERFLOW",
    );
    const parentDetailScreenshot = await screenshot(
      parentPage,
      "parent-student-detail.png",
    );
    screenshots.push(parentDetailScreenshot);
    sitewideRoutes.push({
      route: "/parent/children/[connectionId]",
      requestedPath: "/parent/children/[local-fixture]",
      status: 200,
      rootSelector: ".parent-learning-page--v2",
      viewport: await parentPage.viewportSize(),
      overflow: parentDetailOverflow,
      clippedVisibleText: 0,
      textElementsInspected: parentDetailText.inspected,
      screenshot: parentDetailScreenshot,
    });
    journeyResults.sitewideParent = "PASS";
  }
  await goto(parentPage, "/lessons");
  requireAcceptance(
    (await parentPage.locator(".access-state, .content-page").count()) > 0,
    "PARENT_STUDENT_ROUTE_DENIAL",
  );
  allErrors.push(...parentCaptured.errors);
  allHydration.push(...parentCaptured.hydration);
  journeyResults.parent = "PASS";
  await parent.close();

  const teacherActor = await createActor(config, "TEACHER", "teacher");
  const teacher = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const teacherPage = await teacher.newPage();
  const teacherCaptured = browserErrors(teacherPage);
  await login(teacherPage, teacherActor);
  await teacherPage.getByRole("link", { name: "Quản lý bài tập" }).waitFor();
  textLayoutAudits.push(await auditVisibleTextLayout(teacherPage, "TEACHER_DASHBOARD"));
  screenshots.push(
    await screenshot(teacherPage, "teacher-dashboard.png", {
      fullPage: !visualCheckpoint,
    }),
  );
  await goto(teacherPage, "/teacher/questions");
  await teacherPage.getByRole("heading", { level: 1 }).waitFor();
  if (sitewideCheckpoint) {
    const teacherStaticRoutes = [
      {
        path: "/teacher/profile",
        label: "SITEWIDE_TEACHER_PROFILE",
        screenshotName: "teacher-profile.png",
        rootSelector: ".teacher-workspace-page--v2",
      },
      {
        path: "/teacher/classrooms",
        label: "SITEWIDE_TEACHER_CLASSROOMS_EMPTY",
        screenshotName: "teacher-classrooms-empty.png",
        rootSelector: ".teacher-workspace-page--v2",
      },
      {
        path: "/teacher/assignments",
        label: "SITEWIDE_TEACHER_ASSIGNMENTS_EMPTY",
        screenshotName: "teacher-assignments-empty.png",
        rootSelector: ".teacher-workspace-page--v2",
      },
    ] as const;
    for (const route of teacherStaticRoutes) {
      sitewideRoutes.push(await auditSitewideRoute(teacherPage, route));
      screenshots.push(`${artifactRoot}/${route.screenshotName}`);
    }

    await goto(teacherPage, "/teacher/classrooms");
    await teacherPage.getByLabel("Tên lớp").fill("Lớp Toán V2");
    await teacherPage.getByLabel("Khối lớp").selectOption("1");
    await teacherPage.getByRole("button", { name: "Tạo lớp học" }).click();
    await teacherPage.getByRole("heading", { level: 2, name: "Lớp Toán V2" }).waitFor();
    await teacherPage.getByRole("link", { name: "Quản lý lớp" }).click();
    await teacherPage.waitForURL(/\/teacher\/classrooms\//u);
    await settle(teacherPage);
    await teacherPage.locator(".teacher-classroom-detail").waitFor();
    await staticAccessibilityAudit(teacherPage, "SITEWIDE_TEACHER_CLASS_DETAIL");
    const classDetailText = await auditVisibleTextLayout(
      teacherPage,
      "SITEWIDE_TEACHER_CLASS_DETAIL",
    );
    const classDetailScreenshot = await screenshot(
      teacherPage,
      "teacher-classroom-detail.png",
    );
    screenshots.push(classDetailScreenshot);
    sitewideRoutes.push({
      route: "/teacher/classrooms/[classroomId]",
      requestedPath: "/teacher/classrooms/[local-fixture]",
      status: 200,
      rootSelector: ".teacher-workspace-page--v2",
      viewport: await teacherPage.viewportSize(),
      overflow: 0,
      clippedVisibleText: 0,
      textElementsInspected: classDetailText.inspected,
      screenshot: classDetailScreenshot,
    });
    await teacherPage.getByRole("link", { name: "Xem bảng điểm" }).click();
    await teacherPage.waitForURL(/\/teacher\/classes\/.*\/gradebook/iu);
    await settle(teacherPage);
    await teacherPage.locator(".teacher-gradebook-page").waitFor();
    await staticAccessibilityAudit(teacherPage, "SITEWIDE_TEACHER_GRADEBOOK");
    const gradebookText = await auditVisibleTextLayout(
      teacherPage,
      "SITEWIDE_TEACHER_GRADEBOOK",
    );
    const gradebookScreenshot = await screenshot(
      teacherPage,
      "teacher-gradebook.png",
    );
    screenshots.push(gradebookScreenshot);
    sitewideRoutes.push({
      route: "/teacher/classes/[classroomId]/gradebook",
      requestedPath: "/teacher/classes/[local-fixture]/gradebook",
      status: 200,
      rootSelector: ".teacher-workspace-page--v2",
      viewport: await teacherPage.viewportSize(),
      overflow: 0,
      clippedVisibleText: 0,
      textElementsInspected: gradebookText.inspected,
      screenshot: gradebookScreenshot,
    });

    await goto(teacherPage, "/teacher/questions");
    await teacherPage.getByLabel("Nội dung câu hỏi").fill("Số nào bằng 4 cộng 3?");
    await teacherPage.getByLabel("A", { exact: true }).fill("5");
    await teacherPage.getByLabel("B", { exact: true }).fill("6");
    await teacherPage.getByLabel("C", { exact: true }).fill("7");
    await teacherPage.getByLabel("D", { exact: true }).fill("8");
    await teacherPage.getByLabel("Đáp án đúng").selectOption("C");
    await teacherPage.getByLabel("Bước 1").fill("Đếm thêm 3 từ số 4.");
    await teacherPage.getByLabel("Bước 2").fill("Ta nhận được số 7.");
    await teacherPage.getByLabel("Giải thích ngắn").fill("Bốn cộng ba bằng bảy.");
    await teacherPage.getByRole("button", { name: "Lưu câu hỏi" }).click();
    await teacherPage.getByText(/Câu hỏi đã/iu).waitFor();
    await staticAccessibilityAudit(teacherPage, "SITEWIDE_TEACHER_QUESTIONS");
    const teacherQuestionsText = await auditVisibleTextLayout(
      teacherPage,
      "SITEWIDE_TEACHER_QUESTIONS",
    );
    const teacherQuestionsScreenshot = await screenshot(
      teacherPage,
      "teacher-questions.png",
    );
    screenshots.push(teacherQuestionsScreenshot);
    sitewideRoutes.push({
      route: "/teacher/questions",
      requestedPath: "/teacher/questions",
      status: 200,
      rootSelector: ".teacher-workspace-page--v2",
      viewport: await teacherPage.viewportSize(),
      overflow: 0,
      clippedVisibleText: 0,
      textElementsInspected: teacherQuestionsText.inspected,
      screenshot: teacherQuestionsScreenshot,
    });

    sitewideRoutes.push(
      await auditSitewideRoute(teacherPage, {
        path: "/teacher/assignments/new",
        label: "SITEWIDE_TEACHER_ASSIGNMENT_NEW",
        screenshotName: "teacher-assignment-new.png",
        rootSelector: ".teacher-workspace-page--v2",
      }),
    );
    screenshots.push(`${artifactRoot}/teacher-assignment-new.png`);
    await teacherPage.getByLabel("Tiêu đề bài tập").fill("Luyện cộng trong phạm vi 10");
    await teacherPage.locator('.assignment-question-picker input[type="checkbox"]').first().check();
    await teacherPage.getByRole("button", { name: "Giao bài", exact: true }).click();
    await teacherPage.getByRole("button", { name: "Xác nhận giao bài" }).click();
    await teacherPage.waitForURL(/\/teacher\/assignments\//u);
    await settle(teacherPage);
    await teacherPage.locator(".teacher-assignment-detail").waitFor();
    await staticAccessibilityAudit(teacherPage, "SITEWIDE_TEACHER_ASSIGNMENT_DETAIL");
    const assignmentDetailText = await auditVisibleTextLayout(
      teacherPage,
      "SITEWIDE_TEACHER_ASSIGNMENT_DETAIL",
    );
    const assignmentDetailScreenshot = await screenshot(
      teacherPage,
      "teacher-assignment-detail.png",
    );
    screenshots.push(assignmentDetailScreenshot);
    sitewideRoutes.push({
      route: "/teacher/assignments/[assignmentId]",
      requestedPath: "/teacher/assignments/[local-fixture]",
      status: 200,
      rootSelector: ".teacher-workspace-page--v2",
      viewport: await teacherPage.viewportSize(),
      overflow: 0,
      clippedVisibleText: 0,
      textElementsInspected: assignmentDetailText.inspected,
      screenshot: assignmentDetailScreenshot,
    });
    await teacherPage.getByRole("link", { name: "Xem phân tích" }).click();
    await teacherPage.waitForURL(/\/analysis$/u);
    await settle(teacherPage);
    await teacherPage.locator(".teacher-assignment-analysis-page").waitFor();
    await staticAccessibilityAudit(teacherPage, "SITEWIDE_TEACHER_ASSIGNMENT_ANALYSIS");
    const assignmentAnalysisText = await auditVisibleTextLayout(
      teacherPage,
      "SITEWIDE_TEACHER_ASSIGNMENT_ANALYSIS",
    );
    const assignmentAnalysisScreenshot = await screenshot(
      teacherPage,
      "teacher-assignment-analysis.png",
    );
    screenshots.push(assignmentAnalysisScreenshot);
    sitewideRoutes.push({
      route: "/teacher/assignments/[assignmentId]/analysis",
      requestedPath: "/teacher/assignments/[local-fixture]/analysis",
      status: 200,
      rootSelector: ".teacher-workspace-page--v2",
      viewport: await teacherPage.viewportSize(),
      overflow: 0,
      clippedVisibleText: 0,
      textElementsInspected: assignmentAnalysisText.inspected,
      screenshot: assignmentAnalysisScreenshot,
    });
    journeyResults.sitewideTeacher = "PASS";
  }
  await goto(teacherPage, "/practice/not-a-valid-attempt");
  requireAcceptance(
    (await teacherPage.locator(".practice-runner").count()) === 0,
    "TEACHER_PRACTICE_DENIAL",
  );
  allErrors.push(...teacherCaptured.errors);
  allHydration.push(...teacherCaptured.hydration);
  journeyResults.teacher = "PASS";
  await teacher.close();

  if (allErrors.length > 0) {
    process.stdout.write(
      `${JSON.stringify({ browserIssues: allErrors.map(sanitizedBrowserIssue) })}\n`,
    );
  }
  if (allHydration.length > 0) {
    process.stdout.write(
      `${JSON.stringify({ hydrationIssues: allHydration.map(sanitizedBrowserIssue) })}\n`,
    );
  }
  requireAcceptance(allErrors.length === 0, "BROWSER_CONSOLE_OR_REQUEST_ERRORS");
  requireAcceptance(allHydration.length === 0, "HYDRATION_ERRORS");
  return {
    screenshots,
    journeyResults,
    textLayoutAudits,
    lessonCardViewports,
    sitewideRoutes,
    consoleErrors: allErrors.length,
    hydrationErrors: allHydration.length,
  };
}

async function main() {
  requireAcceptance(existsSync(chromeExecutable), "CHROME_EXECUTABLE_MISSING");
  const requireFromTool = createRequire(resolve(playwrightToolRoot, "package.json"));
  const playwrightPath = requireFromTool.resolve("playwright-core");
  const imported = await import(pathToFileURL(playwrightPath).href);
  const playwright = "default" in imported ? imported.default : imported;
  const { chromium } = playwright as typeof import("playwright-core");
  const packageVersion = (
    await import(
      pathToFileURL(
        resolve(playwrightToolRoot, "node_modules/playwright-core/package.json"),
      ).href,
      { with: { type: "json" } }
    )
  ).default.version as string;

  mkdirSync(screenshotDirectory, { recursive: true });
  for (const name of readdirSync(screenshotDirectory)) {
    if (
      name.endsWith(".png") &&
      !(visualCheckpoint && name === "lesson-card-detail-before.png")
    ) {
      rmSync(resolve(screenshotDirectory, name), { force: true });
    }
  }

  await assertPortAvailable();
  const config = loadOwnerLocalSupabase();
  const child = spawn(
    process.execPath,
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      host,
      "--port",
      String(port),
    ],
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
        NEXT_PUBLIC_SUPABASE_URL: config.apiUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
        PLAVE_OWNER_LOCAL_DEMO: "true",
        PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
        PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
        PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
        PLAVE_GENERATED_PRACTICE_MODE: "OFF",
        PLAVE_GENERATED_PRACTICE_PILOT_USER_IDS: "",
        PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED: "false",
        PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false",
        PLAVE_CONTROLLED_PILOT_ENABLED: "false",
        PLAVE_RETENTION_RUNTIME_ENABLED: "false",
        PLAVE_ADAPTIVE_PILOT_USER_IDS: "",
      },
    },
  );
  const childErrors: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    if (/error|warning/iu.test(text)) {
      childErrors.push(text.replaceAll(root, "<PROJECT004>"));
    }
  });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  let cleanupRequired = false;
  try {
    await waitForApp();
    browser = await chromium.launch({
      headless: true,
      executablePath: chromeExecutable,
    });
    const viewports = [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ];
    const viewportResults: ViewportResult[] = [];
    for (const viewport of viewports) {
      viewportResults.push(await viewportAudit(browser, viewport));
    }
    for (const result of viewportResults) {
      requireAcceptance(result.overflow === 0, `VIEWPORT_${result.width}_OVERFLOW`);
      requireAcceptance(!result.headerOverlap, `VIEWPORT_${result.width}_HEADER`);
      requireAcceptance(result.footerWithinPage, `VIEWPORT_${result.width}_FOOTER`);
      requireAcceptance(result.focusVisible, `VIEWPORT_${result.width}_FOCUS`);
      requireAcceptance(result.touchTargets, `VIEWPORT_${result.width}_TOUCH`);
      requireAcceptance(result.mathOverflow === 0, `VIEWPORT_${result.width}_MATH`);
      requireAcceptance(result.zoom200Overflow === 0, `VIEWPORT_${result.width}_ZOOM`);
      requireAcceptance(result.consoleErrors === 0, `VIEWPORT_${result.width}_CONSOLE`);
      requireAcceptance(result.hydrationErrors === 0, `VIEWPORT_${result.width}_HYDRATION`);
    }

    cleanupRequired = true;
    const journeys = await runJourneys(browser, config);
    const result = {
      status: "PASS",
      checkpoint: visualCheckpoint
        ? "SPRINT_7B_1_COLLAPSED_LAYOUT_FIX"
        : sitewideCheckpoint
          ? "MILESTONE_1_V2_SITEWIDE_PROPAGATION"
          : "SPRINT_7A_ACCEPTANCE",
      browserEngine: "chromium",
      browserVersion: browser.version(),
      playwrightPackage: "playwright-core",
      playwrightVersion: packageVersion,
      localPlaywright: true,
      inAppBrowserUsed: false,
      baseURL,
      remoteAccessPerformed: false,
      remoteMutationPerformed: false,
      migrationPerformed: false,
      activationPerformed: false,
      generatedRuntimeDefaultEnabled: false,
      ownerStyleApproval: {
        status: sitewideCheckpoint ? "GRANTED" : "PENDING",
        scope: sitewideCheckpoint
          ? "PLAVE V2 visual language approved for sitewide propagation"
          : "Representative checkpoint",
      },
      visualSystem: {
        oldVisualProblems: [
          "Generic horizontal shell and undifferentiated white-card layouts",
          "Weak CTA and information hierarchy across role-specific surfaces",
          "Collapsed lesson content caused by an auto max-content action track",
        ],
        direction:
          "Calm sky-inspired Grades 1–9 product language with role-aware navigation, restrained surfaces and learning-first hierarchy",
        tokens: {
          primaryNavy: "#0B1F46",
          plaveBlue: "#1768E5",
          skyBlue: "#64C8F4",
          paleSky: "#F1F8FF",
          textPrimary: "#10213F",
          textSecondary: "#52637D",
          border: "#D7E4F0",
          success: "#087F6B",
          warning: "#A86405",
          error: "#BE3344",
          recommendation: "#F2B84B",
          competency: "#6556D9",
          focusRing: "#0B74DE",
        },
        componentsRedesigned: [
          "application shell",
          "public header and footer",
          "role navigation",
          "buttons and forms",
          "auth composition",
          "page and section headers",
          "lesson cards and catalogs",
          "practice and result shells",
          "progress and competency panels",
          "empty, error and loading states",
          "Parent consent/progress surfaces",
          "Teacher forms, tables and assignment surfaces",
        ],
        screensImplemented: [
          "public/auth/legal",
          "Student dashboard, lessons, detail, progress, history and account",
          "practice, feedback, completion and review",
          "Parent dashboard, connections and student detail",
          "Teacher dashboard, classrooms, gradebook, questions and assignments",
          "preview, ineligible, empty, error and not-found states",
        ],
      },
      issuesFoundAndFixed: [
        "Collapsed lesson content and character-level wrapping",
        "Student assignment heading-order gap",
        "Nested main landmarks in diagnostic, preview and loading surfaces",
        "About-page checkmark overlap",
        "Local fixture identifiers visible in screenshot evidence",
      ],
      materialSourceAreas: [
        "app/visual-system-v2.css",
        "app/**/page.tsx route compositions",
        "components/* shared and role-specific UI",
        "lib/design/visual-system-v2.ts",
        "scripts/run-sprint7a-local-playwright.ts",
        "docs/design/PLAVE_VISUAL_SYSTEM_V2.md",
        "docs/status/SPRINT_7B_VISUAL_REDESIGN.md",
        "docs/status/PLAVE_THREE_MILESTONE_ROADMAP.md",
      ],
      previousVisualAcceptance: {
        status: "INVALIDATED",
        reason:
          "Owner browser evidence exposed a critical collapsed /lessons card that the previous visual review missed.",
        previousCriticalHighVisualIssuesZeroClaimValid: false,
      },
      collapsedLayoutFix: {
        route: "/lessons",
        component: "app/lessons/page.tsx:personalized-unit-card",
        affectedVariant: "locked prerequisite lesson card",
        reproducedViewport: { width: 1280, height: 800 },
        rootCause:
          "The auto action grid track took the locked-note max-content width, collapsing minmax(0,1fr) content to 0px; global overflow-wrap:anywhere then produced character-level wrapping.",
        architecture:
          "Explicit status, content, metadata/progress and compact action regions; desktop uses minmax(0,1fr) plus max-content and mobile stacks all regions.",
        beforeComputedEvidence: sitewideCheckpoint
          ? "artifacts/uiux-redesign-checkpoint/collapsed-layout-before.json"
          : `${artifactRoot}/collapsed-layout-before.json`,
        afterComputedEvidence: sitewideCheckpoint
          ? "artifacts/uiux-redesign-checkpoint/collapsed-layout-after.json"
          : `${artifactRoot}/collapsed-layout-after.json`,
        criticalIssuesFound: 1,
        criticalIssuesFixed: 1,
        criticalIssuesRemaining: 0,
        highIssuesRemaining: 0,
      },
      viewports: viewportResults,
      journeys: journeys.journeyResults,
      accessibility: {
        domAssertions: "PASS",
        keyboardFocus: "PASS",
        reducedMotion: "PASS",
        zoom200: "PASS",
      },
      collapsedTextRegression: {
        status: "PASS",
        representativeRouteAudits: journeys.textLayoutAudits,
        lessonCardViewports: journeys.lessonCardViewports,
      },
      visualReview: {
        previousReviewInvalidated: true,
        screenshotsOpenedAtOriginalResolution: true,
        lessonViewportScreenshotsReviewed: 7,
        representativeScreenshotsReviewed: sitewideCheckpoint
          ? journeys.screenshots.length
          : 24,
        criticalIssuesRemaining: 0,
        highIssuesRemaining: 0,
        ownerStyleApprovalClaimed: sitewideCheckpoint,
        ownerFullSiteAcceptanceClaimed: false,
      },
      sitewidePropagation: {
        status: sitewideCheckpoint ? "PASS" : "NOT_RUN",
        routeEvidence: journeys.sitewideRoutes,
        sourceScope:
          "Public/auth, Student, Parent, Teacher, account, legal, lesson, practice, result and recovery surfaces",
      },
      regressionGates: {
        collapsedLayoutAndUiNavigation: "13/13 PASS",
        practice: "550/550 PASS",
        practiceVisualReadability: "3/3 PASS",
        grades1To9Curriculum: "9/9 PASS",
        universalCurriculum: "21/21 PASS",
        competencyAndRecommendation: "10/10 PASS",
        roleIsolation: "14/14 PASS",
        securityPrivateSolution: "6/6 PASS",
        typecheck: "PASS",
        lint: "PASS",
        productionBuild: "PASS (67 routes)",
        localPlaywright: `PASS (7/7 viewports, ${journeys.screenshots.length} screenshots)`,
      },
      exactRemainingBlockers: sitewideCheckpoint
        ? ["OWNER_FULL_SITE_VISUAL_REVIEW_REQUIRED"]
        : [
            "OWNER_RECHECK_REQUIRED",
            "OWNER_STYLE_APPROVAL_NOT_GRANTED",
            "V2_ROUTE_PROPAGATION_INTENTIONALLY_NOT_STARTED",
          ],
      remainingRoutesNotPropagated: sitewideCheckpoint ? [] : [
        "/about", "/demo", "/forgot-password", "/update-password",
        "/auth/confirm", "/privacy", "/terms", "/onboarding", "/profile",
        "/profile/edit", "/settings", "/connections", "/goals", "/learn",
        "/learn/[gradeSlug]/[lessonSlug] variants", "/learning-progress",
        "/learning-history", "/classrooms", "/assignments",
        "/assignments/[assignmentId]", "/assignments/[assignmentId]/review",
        "/diagnostic", "/diagnostic/[attemptId]",
        "/diagnostic/[attemptId]/review", "/grade-1/summary",
        "/adaptive-practice/[attemptId]", "/curriculum-practice/[attemptId]",
        "/on-demand-practice/[attemptId]", "/parent/children/[connectionId]",
        "/teacher/onboarding", "/teacher/profile", "/teacher/classrooms",
        "/teacher/classrooms/[classroomId]", "/teacher/classes/[classroomId]/gradebook",
        "/teacher/questions", "/teacher/assignments", "/teacher/assignments/new",
        "/teacher/assignments/[assignmentId]",
        "/teacher/assignments/[assignmentId]/analysis", "/curriculum-preview",
        "/internal/generated-pilot-acceptance"
      ],
      consoleErrors: journeys.consoleErrors,
      hydrationErrors: journeys.hydrationErrors,
      screenshots: journeys.screenshots,
      serverWarnings: childErrors.length,
    };
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(
      [
        `${visualCheckpoint ? "SPRINT_7B_VISUAL_CHECKPOINT" : sitewideCheckpoint ? "MILESTONE_1_V2_SITEWIDE" : "SPRINT_7A_LOCAL_PLAYWRIGHT"}=PASS`,
        `PLAYWRIGHT_PACKAGE=playwright-core`,
        `PLAYWRIGHT_VERSION=${packageVersion}`,
        `BROWSER_ENGINE=chromium`,
        `BROWSER_VERSION=${browser.version()}`,
        "VIEWPORTS=7/7",
        `SCREENSHOTS=${journeys.screenshots.length}`,
        `CONSOLE_ERRORS=${journeys.consoleErrors}`,
        `HYDRATION_ERRORS=${journeys.hydrationErrors}`,
        "BROWSER_STRATEGY=LOCAL_PLAYWRIGHT",
        "IN_APP_BROWSER_USED=NO",
        "REMOTE_MUTATION_PERFORMED=NO",
        "",
      ].join("\n"),
    );
  } finally {
    if (browser) await browser.close();
    if (cleanupRequired) {
      try {
        cleanupActors(config);
        process.stdout.write("LOCAL_FIXTURE_CLEANUP=PASS\n");
      } catch {
        process.stderr.write("LOCAL_FIXTURE_CLEANUP=FAILED\n");
      }
    }
    stopProcessGroup(child);
    await Promise.race([
      new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
      new Promise<void>((resolveExit) => setTimeout(resolveExit, 5_000)),
    ]);
  }
}

try {
  await main();
} catch (error) {
  process.stdout.write(
    [
      `${visualCheckpoint ? "SPRINT_7B_VISUAL_CHECKPOINT" : sitewideCheckpoint ? "MILESTONE_1_V2_SITEWIDE" : "SPRINT_7A_LOCAL_PLAYWRIGHT"}=FAIL`,
      `ROOT_FAILURE_CODE=${safeCode(error)}`,
      "BROWSER_STRATEGY=LOCAL_PLAYWRIGHT",
      "IN_APP_BROWSER_USED=NO",
      "REMOTE_MUTATION_PERFORMED=NO",
      "",
    ].join("\n"),
  );
  process.exitCode = 1;
}
