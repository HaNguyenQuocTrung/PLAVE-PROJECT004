import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

function pageRoutes(directory = "app"): string[] {
  const entries = readdirSync(directory);
  const files = entries.flatMap((entry) => {
    const path = `${directory}/${entry}`;
    return statSync(path).isDirectory() ? pageRoutes(path) : [path];
  });
  return files
    .filter((path) => path.endsWith("/page.tsx") || path === "app/page.tsx")
    .map((path) => path.replace(/^app/u, "").replace(/\/page[.]tsx$/u, "") || "/");
}

test("Sprint 7A inventory covers every application page with actionable risks", () => {
  const inventory = JSON.parse(read("artifacts/uiux-acceptance/inventory.json")) as {
    routes: Array<Record<string, unknown>>;
  };
  const knownRoutes = new Set(inventory.routes.map((entry) => entry.route));
  for (const route of pageRoutes()) {
    assert.ok(knownRoutes.has(route), `missing route inventory for ${route}`);
  }
  for (const entry of inventory.routes) {
    for (const field of [
      "route",
      "role",
      "auth",
      "goal",
      "mainCta",
      "currentComponents",
      "states",
      "responsiveRisks",
      "accessibilityRisks",
      "legacy",
      "screenshot",
    ]) {
      assert.ok(field in entry, `${String(entry.route)} is missing ${field}`);
    }
  }
});

test("global shell has Vietnamese landmarks, skip navigation and route focus", () => {
  const layout = read("app/layout.tsx");
  const focusManager = read("components/RouteFocusManager.tsx");
  const navigation = read("components/HeaderNavigation.tsx");
  assert.match(layout, /<html lang="vi">/u);
  assert.match(layout, /className="skip-link" href="#main-content"/u);
  assert.match(layout, /<main id="main-content" tabIndex=\{-1\}>/u);
  assert.match(layout, /<RouteFocusManager \/>/u);
  assert.match(focusManager, /previousPathname[.]current === pathname/u);
  assert.match(focusManager, /getElementById\("main-content"\)[?][.]focus/u);
  assert.match(navigation, /aria-expanded=\{menuOpen\}/u);
  assert.match(navigation, /aria-current=\{active \? "page" : undefined\}/u);
  assert.match(navigation, /event[.]key === "Escape"/u);
});

test("design tokens and responsive accessibility safeguards are explicit", () => {
  const css = read("app/globals.css");
  for (const token of [
    "--brand-primary",
    "--radius-xl",
    "--shadow-soft",
    "--focus-ring",
    "--touch-target",
    "--content-wide",
    "--z-header",
  ]) {
    assert.ok(css.includes(token), `missing token ${token}`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
  assert.match(css, /@media \(max-width: 360px\)/u);
  assert.match(css, /min-height:\s*var\(--touch-target\)/u);
  assert.match(css, /overflow-x:\s*auto/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /body:has\([.]practice-focus-shell\)[\s\S]*[.]site-footer/u);
});

test("practice variants guard submission and move focus to feedback", () => {
  for (const path of [
    "app/practice/[attemptId]/PracticeRunner.tsx",
    "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
    "app/adaptive-practice/[attemptId]/AdaptivePracticeRunner.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /feedbackRef/u, path);
    assert.match(source, /aria-live="polite"/u, path);
    assert.match(source, /tabIndex=\{-1\}/u, path);
    assert.match(source, /[.]focus\(\)/u, path);
    assert.match(source, /!answer[.]trim\(\)/u, path);
    assert.match(source, /loading=/u, path);
  }
});

test("authentication copy prevents account discovery and removes technical UI", () => {
  const registration = read("lib/auth/registration-result.ts");
  const registerPage = read("app/register/page.tsx");
  const login = read("app/login/actions.ts");
  assert.match(
    registration,
    /Nếu thông tin hợp lệ, PLAVE sẽ gửi hướng dẫn xác nhận/u,
  );
  assert.doesNotMatch(registerPage, />[^<]*(?:Supabase|onboarding)[^<]*</iu);
  assert.doesNotMatch(login, /không tồn tại|chưa đăng ký|đã tồn tại/iu);
});

test("student navigation keeps lessons canonical and hides internal rationale codes", () => {
  const navigation = read("lib/auth/navigation.ts");
  const competency = read("components/CompetencyLearningPathPanel.tsx");
  const catalog = read("components/UniversalCurriculumCatalog.tsx");
  assert.match(navigation, /href: "\/lessons"/u);
  assert.doesNotMatch(navigation, /href: "\/learn"/u);
  assert.match(
    competency,
    /reasonCodes[.]slice\(0, 2\)[.]map\(\(code\) => reasonText\[code\]\)/u,
  );
  assert.doesNotMatch(competency, /\{recommendation[.]reasonCodes\}/u);
  assert.doesNotMatch(competency, /confidenceLabel/u);
  assert.doesNotMatch(catalog, /recommendation[.]reasonCode/u);
});
