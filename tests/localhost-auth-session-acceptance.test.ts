import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync(
  new URL("../scripts/run-localhost-auth-session-acceptance.ts", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

test("localhost auth acceptance owns disposable Chrome/runtime lifecycle without secret environment inheritance", () => {
  assert.match(script, /withLocalInstalledChrome/u);
  assert.match(script, /mkdtempSync\("\/private\/tmp\/plave-auth-acceptance-"\)/u);
  assert.match(script, /rmSync\(temporaryRoot, \{ recursive: true, force: true \}\)/u);
  assert.match(script, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key"/u);
  assert.match(script, /scripts\/start-production-local[.]ts/u);
  assert.match(script, /PLAVE_AUTH_FAILURE_TEST_MODE: "UNREACHABLE"/u);
  assert.doesNotMatch(script, /env:\s*\{\s*\.\.\.process\.env/gu);
  assert.doesNotMatch(script, /\.env\.local|Library\/Application Support\/Google\/Chrome/gu);
});

test("production-local wrapper blocks dotenv discovery and gives Next an allowlisted disposable environment", () => {
  const wrapper = readFileSync(
    new URL("../scripts/start-production-local.ts", import.meta.url),
    "utf8",
  );
  assert.match(wrapper, /createProductionLocalTemporaryRoot\(\)/u);
  assert.match(wrapper, /TMPDIR: temporaryTmp/u);
  assert.doesNotMatch(wrapper, /\/private\/tmp\/plave-production-local-/u);
  assert.match(wrapper, /__NEXT_PROCESSED_ENV: "true"/u);
  assert.match(wrapper, /npm_config_offline: "true"/u);
  assert.match(wrapper, /"--exclude=.env\*"/u);
  assert.match(wrapper, /PRODUCTION_LOCAL_WORKSPACE=DISPOSABLE_ENV_EXCLUDED/u);
  assert.match(wrapper, /PRODUCTION_LOCAL_BUILD=PROMOTED_SANITIZED/u);
  assert.match(wrapper, /assertProductionLocalBuildBinding\(buildRoot, runtime\.source\)/u);
  assert.match(wrapper, /writeProductionLocalBuildBinding\(built, runtime\.source\)/u);
  assert.match(wrapper, /PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID/u);
  assert.match(wrapper, /buildMode \? \["--webpack"\] : \[\]/u);
  assert.match(wrapper, /PRODUCTION_LOCAL_AUTH_TEST_MODE_TARGET_INVALID/u);
  assert.match(wrapper, /mock-unreachable-auth-fetch[.]mjs/u);
  assert.match(wrapper, /rmSync\(temporaryRoot, \{ recursive: true, force: true \}\)/u);
  assert.match(wrapper, /process\.once\("exit", cleanup\)/u);
  assert.doesNotMatch(wrapper, /env:\s*\{\s*\.\.\.process\.env/gu);
});

test("browser acceptance clicks public links, uses keyboard navigation and proves protected fail-closed", () => {
  for (const evidence of [
    "assertPointerTarget",
    "clickAndWait",
    "keyboardActivateAndWait",
    'main a[href="/demo"]',
    'footer a[href="/privacy"]',
    'footer a[href="/about"]',
    'page.navigate(`${input.baseUrl}/dashboard`)',
    'waitForPath(page, "/login")',
  ]) {
    assert.match(script, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.match(script, /AUTH_RETRY_COUNT_NOT_BOUNDED/u);
  assert.match(script, /AUTH_ERROR_FLOOD_NOT_COLLAPSED/u);
  assert.match(script, /AUTH_DIAGNOSTIC_SECRET_LEAK/u);
});

test("acceptance covers clean, malformed recovery and unreachable auth with scoped cookie assertions", () => {
  assert.match(script, /caseName: "clean-anonymous"/u);
  assert.match(script, /caseName: "malformed-session-recovered"/u);
  assert.match(script, /caseName: "synthetic-stale-unreachable"/u);
  assert.match(script, /expectCookieAfter: false/u);
  assert.match(script, /expectCookieAfter: true/u);
  assert.match(script, /serviceWorkers !== 0 \|\| storage\.cacheEntries !== 0/u);
  assert.equal(
    packageJson.scripts["acceptance:localhost-auth-session"],
    "node --no-warnings --experimental-strip-types scripts/run-localhost-auth-session-acceptance.ts",
  );
});
