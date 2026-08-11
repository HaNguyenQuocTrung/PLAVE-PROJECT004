import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditWaveL } from "../lib/content-factory/wave-l-audit.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { renderWaveLMarkdown } from "../lib/content-factory/wave-l-report.ts";

const audit = auditWaveL(); if (audit.errors.length) throw new Error(`WAVE_L_BUILD_BLOCKED:${audit.errors.slice(0, 50).join(",")}`);
const output = join(process.cwd(), "content/grade-packs/generated"); mkdirSync(output, { recursive: true });
const json = (name: string, value: unknown) => writeFileSync(join(output, name), `${canonicalize(value)}\n`, "utf8");
json("wave-l-adaptive-readiness.json", { schemaVersion: "plave-wave-l-adaptive-readiness-v1", grades: audit.inventories, totals: audit.totals });
json("wave-l-policy-matrix.json", audit.policy);
json("wave-l-selection-next-action-contract.json", { schemaVersion: "plave-wave-l-selection-next-action-contract-v1",
  priority: ["ACTIVE_REMEDIATION_REQUIREMENT", "RETRY_DIFFERENT_STRUCTURE", "CURRENT_SKILL_EVIDENCE", "RETENTION_DUE", "ADVANCE_CANDIDATE", "MIXED_PRACTICE", "FAIL_CLOSED_TERMINAL"],
  actions: ["CONTINUE_CURRENT_SKILL", "RETRY_DIFFERENT_STRUCTURE", "REMEDIATE_PREREQUISITE", "RETURN_TO_INTERRUPTED_SKILL",
    "ADVANCE_SKILL", "RETENTION_REVIEW", "MIXED_PRACTICE", "GRADE_COMPLETE_WITH_FUTURE_PATH", "FAIL_CLOSED_UNAVAILABLE"],
  deterministic: true, serverOwnedEligibility: true, noSolutionBeforeSubmit: true, schoolGradeMutation: false, entitlementGrant: false });
json("wave-l-runtime-isolation-audit.json", audit.runtimeIsolation);
json("wave-l-state-machine-report.json", { schemaVersion: "plave-wave-l-state-machine-report-v1", proofs: audit.properties,
  totals: { states: audit.totals.visitedStates, transitions: audit.totals.visitedTransitions, invariantViolations: audit.totals.invariantViolations } });
json("wave-l-local-e2e-report.json", audit.localE2E);
json("wave-l-credential-safe-invocation.json", audit.credentialSafe);
json("wave-l-invocation-boundary.json", audit.invocationBoundary);
json("wave-l-combined-a-k-runtime-compatibility.json", audit.compatibility);
json("wave-l-independent-audit.json", audit);
writeFileSync(join(output, "wave-l-independent-audit.md"), renderWaveLMarkdown(audit), "utf8");
console.log(`WAVE_L_BUILD_OK grades=${audit.totals.grades} questions=${audit.totals.questions} skills=${audit.totals.skills} states=${audit.totals.visitedStates} transitions=${audit.totals.visitedTransitions} combined_a_k=${audit.frozen.combinedAKBundleActual} compatibility=${audit.compatibility.compatibilityHash}`);
