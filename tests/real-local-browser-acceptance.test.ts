import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const chrome = read("scripts/local-installed-chrome.ts");
const stack = read("scripts/real-local-grades-1-9-stack.ts");
const journey = read("scripts/run-browser-grades-1-9-acceptance.ts");
const smoke = read("scripts/smoke-local-installed-browser.ts");
const css = read("app/internal/generator-v2/generator-v2.module.css");
const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
const receiptBuilder = read("scripts/build-real-local-browser-e2e-receipt.ts");

test("installed Chrome uses a disposable mock-keychain profile and sanitized child environment", () => {
  assert.match(chrome, /const DISPOSABLE_BROWSER_ROOT = "\/private\/tmp"/u);
  assert.match(chrome, /"--use-mock-keychain"/u);
  assert.match(chrome, /"--password-store=basic"/u);
  assert.match(chrome, /`--user-data-dir=\$\{profile\}`/u);
  assert.match(chrome, /rmSync\(temporaryRoot, \{ recursive: true, force: true \}\)/u);
  assert.doesNotMatch(chrome, /Library\/Application Support\/Google\/Chrome/u);
  assert.doesNotMatch(chrome, /env:\s*\{\s*\.\.\.process\.env/gu);
});

test("browser smoke proves navigation, JavaScript, screenshot, console and network events", () => {
  for (const evidence of ["navigate", "Runtime.consoleAPICalled", "Network.requestWillBeSent", "screenshot", "javascript-pass"]) {
    assert.match(smoke, new RegExp(evidence, "u"));
  }
  assert.equal(packageJson.scripts["smoke:local-installed-browser"], "node --no-warnings --experimental-strip-types scripts/smoke-local-installed-browser.ts");
});

test("real stack is disposable, production-mode, offline and never binds port 3000", () => {
  assert.match(stack, /"--pull=never"/u);
  assert.match(stack, /"build", "--webpack"/u);
  assert.match(stack, /"start", "--hostname", "127\.0\.0\.1", "--port"/u);
  assert.match(stack, /address\.port === 3000/u);
  assert.match(stack, /--exclude=\.env\*/u);
  assert.match(stack, /npm_config_offline: "true"/u);
  assert.match(stack, /docker\(root, home, \["stop", auth\]/u);
  assert.match(stack, /docker\(root, home, \["cp", resolve\(root, "supabase\/migrations"/u);
  assert.doesNotMatch(stack, /docker\(root, home, \["(?:pull|build)"/u);
});

test("journey covers Grades 1-9, thirteen fixed-safe skills and persisted browser UI", () => {
  assert.match(journey, /const grades = \[1, 2, 3, 4, 5, 6, 7, 8, 9\]/u);
  assert.match(journey, /rows\.length === 13/u);
  for (const evidence of [
    "REFRESH_RESUME", "INCORRECT_FEEDBACK", "CORRECT_FEEDBACK", "HISTORY_EXACTLY_ONCE",
    "RELOGIN_PERSISTENCE", "FIXED_SAFE_NO_ADAPTIVE_MASTERY", "DEACTIVATION_DATABASE_PRESERVED",
    "REACTIVATION_RESUME", "SCHOOL_GRADE_IMMUTABLE", "NO_ENTITLEMENT_GRANT",
  ]) assert.match(journey, new RegExp(evidence, "u"));
  assert.equal(packageJson.scripts["acceptance:real-local-browser"], "node --no-warnings --experimental-strip-types scripts/run-browser-grades-1-9-acceptance.ts");
});

test("authorization matrix includes anonymous, cross-user, Parent and Teacher denial", () => {
  for (const evidence of [
    "ANONYMOUS_DENIED", "ANONYMOUS_DIRECT_URL_DENIED", "CROSS_USER_ATTEMPT_DENIED",
    "WRONG_GRADE_DIRECT_URL_DENIED", "APPROVED_PARENT_VIEW", "UNAPPROVED_PARENT_DENIED",
    "PARENT_CANNOT_START", "AUTHORIZED_TEACHER_VIEW", "UNAUTHORIZED_TEACHER_DENIED",
    "TEACHER_CANNOT_START",
  ]) assert.match(journey, new RegExp(evidence, "u"));
});

test("mobile accessibility, solution isolation and screenshot evidence remain explicit", () => {
  for (const evidence of [
    "NO_HORIZONTAL_OVERFLOW", "NO_PRE_SUBMIT_LEAK", "NO_STORAGE_LEAK", "ACCESSIBLE_NAMES",
    "KEYBOARD_FOCUS_TARGET", "FORM_VALIDATION", "grade-1-catalog.png", "grade-2-adaptive-feedback.png",
    "grade-9-correct-feedback.png", "mobile-learn-grade-2.png", "parent-authorized-progress.png",
  ]) assert.match(journey, new RegExp(evidence, "u"));
});

test("generator-v2 CSS module scopes focus selectors to local classes", () => {
  assert.match(css, /\.practiceShell input:focus-visible,\.practiceShell select:focus-visible/u);
  assert.doesNotMatch(css, /(?:^|,)input:focus-visible,select:focus-visible/u);
});

test("browser receipt is deterministic, sanitized and excludes transient ports and identities", () => {
  assert.equal(packageJson.scripts["build:real-local-browser-receipt"], "node --no-warnings --experimental-strip-types scripts/build-real-local-browser-e2e-receipt.ts");
  assert.match(receiptBuilder, /receiptHash: sha256\(canonicalize\(core\)\)/u);
  assert.match(receiptBuilder, /macOSKeychainAccesses: 0/u);
  assert.match(receiptBuilder, /externalNetworkAttempts: 0/u);
  assert.doesNotMatch(receiptBuilder, /sessionToken|syntheticPassword|dynamicPort:\s*\d+/u);
});
