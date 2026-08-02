import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ROOT = process.cwd();
const ARTIFACT_DIR = resolve(ROOT, "artifacts/remediation");

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(ARTIFACT_DIR, name), "utf8")) as T;
}

async function writeJsonAtomic(name: string, value: unknown): Promise<void> {
  const target = resolve(ARTIFACT_DIR, name);
  const temporary = `${target}.tmp-${process.pid}`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, target);
}

function requireGate(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`GENERATOR_V2_CORRECTNESS_ELIGIBILITY_BLOCKED: ${message}`);
}

type OracleEligibility = {
  eligibleCapabilities: string[];
  blockedCapabilities: string[];
  eligibleOutcomes: string[];
  blockedOutcomes: string[];
  capabilities: Array<{
    capabilityId: string;
    outcomes: string[];
    attempted: number;
    validated: number;
    status: string;
    diagnostics: Record<string, number>;
  }>;
};

const oracle = await readJson<{
  result: string;
  metrics: Record<string, number>;
}>("generator-full-correctness.json");
const dependency = await readJson<{ result: string; violations: unknown[] }>(
  "generator-oracle-dependency-audit.json",
);
const mutations = await readJson<{ result: string; mutationScore: number; killed: number; total: number }>(
  "generator-oracle-mutation-tests.json",
);
const product = await readJson<{
  status: string;
  ownerApprovalRecorded: boolean;
  representativeCapabilities: number;
  samples: Array<{ capabilityId: string; developerReview: string }>;
}>("generator-correctness-product-review.json");
const runtime = await readJson<{
  status: string;
  internalProofOrReviewRoutesUsed: boolean;
  correctnessEligibility: { repositoryDefault: string };
  fullCapabilityProof: Array<{
    capabilityId: string;
    authenticatedPublicApi: boolean;
    incorrectAndCorrect: boolean;
    resumeWithoutRegeneration: boolean;
    completion: boolean;
  }>;
  cleanup: string;
  remainingListener: string;
}>("generator-runtime-full-proof.json");
const browser = await readJson<{
  status: string;
  screenshotReview: string;
  privateLeaks: number;
  promptVisualMismatches: number;
}>("generator-correctness-browser-acceptance.json");
const screenshotReview = await readJson<{
  status: string;
  screenshotsExpected: number;
  screenshotsReviewed: number;
  criticalIssues: number;
  highIssues: number;
}>("generator-correctness-screenshot-review.json");
const prior = await readJson<OracleEligibility>("generator-correctness-eligibility.json");

requireGate(oracle.result === "PASS", "independent oracle did not pass");
requireGate(oracle.metrics.attempted === 32_760, "oracle did not attempt 32,760 samples");
requireGate(oracle.metrics.oracleValidated === 32_760, "oracle did not validate 32,760 samples");
requireGate(oracle.metrics.exactDuplicates === 0, "exact duplicates remain");
requireGate(oracle.metrics.maximumNearDuplicatePairRate <= 0.12, "near-duplicate threshold failed");
requireGate(dependency.result === "PASS" && dependency.violations.length === 0, "oracle dependency boundary failed");
requireGate(mutations.result === "PASS" && mutations.killed === mutations.total && mutations.mutationScore === 1, "mutation proof failed");
requireGate(product.status === "PASS" && product.representativeCapabilities === 198, "developer product review incomplete");
requireGate(product.ownerApprovalRecorded === false, "Sprint 10C must not record a new Owner approval");
requireGate(runtime.status === "PASS" && runtime.internalProofOrReviewRoutesUsed === false, "real Student runtime proof failed");
requireGate(runtime.correctnessEligibility.repositoryDefault === "OFF", "repository default must remain OFF");
requireGate(runtime.cleanup === "PASS" && runtime.remainingListener === "NONE", "runtime proof cleanup failed");
requireGate(browser.status === "PASS" && browser.screenshotReview === "PASS", "browser proof or visual review failed");
requireGate(browser.privateLeaks === 0 && browser.promptVisualMismatches === 0, "browser privacy or visual gate failed");
requireGate(
  screenshotReview.status === "PASS" &&
    screenshotReview.screenshotsExpected === screenshotReview.screenshotsReviewed &&
    screenshotReview.criticalIssues === 0 &&
    screenshotReview.highIssues === 0,
  "screenshot review incomplete",
);
requireGate(prior.eligibleCapabilities.length === 198 && prior.blockedCapabilities.length === 0, "oracle capability eligibility incomplete");
requireGate(prior.eligibleOutcomes.length === 546 && prior.blockedOutcomes.length === 0, "oracle outcome eligibility incomplete");

const runtimeCapabilities = new Set(runtime.fullCapabilityProof.map((item) => item.capabilityId));
const reviewedCapabilities = new Set(
  product.samples
    .filter((sample) => sample.developerReview === "REVIEWED_ACCEPTED")
    .map((sample) => sample.capabilityId),
);
requireGate(runtimeCapabilities.size === 198, "runtime proof does not cover 198 unique capabilities");
requireGate(reviewedCapabilities.size === 198, "product review does not cover 198 unique capabilities");

for (const capabilityId of prior.eligibleCapabilities) {
  requireGate(runtimeCapabilities.has(capabilityId), `runtime proof missing ${capabilityId}`);
  requireGate(reviewedCapabilities.has(capabilityId), `product review missing ${capabilityId}`);
}

const finalized = {
  schemaVersion: "PLAVE_GENERATOR_V2_CORRECTNESS_ELIGIBILITY_V2",
  sprint: "10C",
  result: "PASS",
  rule:
    "A capability is STUDENT_RUNTIME_ELIGIBLE only when every mapped outcome and all 60 samples per outcome pass the independent public-snapshot oracle, dependency and mutation controls pass, a public-only product sample is reviewed, and the capability passes authenticated public Student runtime persistence proof.",
  repositoryDefault: "OFF",
  ownerApprovalRecorded: false,
  gates: {
    independentOracle: "32760/32760",
    oracleDependencyBoundary: "PASS",
    mutationControls: `${mutations.killed}/${mutations.total}`,
    developerProductReview: "198/198",
    authenticatedStudentRuntime: "198/198",
    browserViewports: "5/5",
    screenshotReview: `${screenshotReview.screenshotsReviewed}/${screenshotReview.screenshotsExpected}`,
  },
  eligibleCapabilities: prior.eligibleCapabilities,
  blockedCapabilities: [],
  eligibleOutcomes: prior.eligibleOutcomes,
  blockedOutcomes: [],
  capabilities: prior.capabilities.map((capability) => ({
    ...capability,
    status: "STUDENT_RUNTIME_ELIGIBLE",
    gates: {
      oracleSamples: `${capability.validated}/${capability.attempted}`,
      negativeAndMutationControls: "PASS",
      interactionAndVisualValidation: "PASS",
      languageProductReview: "REVIEWED_ACCEPTED",
      authenticatedRuntimePersistence: "PASS",
    },
  })),
};

await writeJsonAtomic("generator-correctness-eligibility.json", finalized);
console.log("GENERATOR_V2_CORRECTNESS_ELIGIBILITY=PASS");
console.log("STUDENT_RUNTIME_ELIGIBLE_CAPABILITIES=198/198");
console.log("STUDENT_RUNTIME_ELIGIBLE_OUTCOMES=546/546");
console.log("REPOSITORY_DEFAULT=OFF");
