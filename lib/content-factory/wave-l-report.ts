import { auditWaveL } from "./wave-l-audit.ts";

export function renderWaveLMarkdown(audit = auditWaveL()) {
  const rows = audit.inventories.map((row) => `| ${row.grade} | ${row.gradeReadiness} | ${row.units} | ${row.skills} | ${row.questions} | ${row.countsByReadiness.ADAPTIVE_READY} | ${row.countsByReadiness.POOL_LIMITED_FAIL_CLOSED} | ${row.countsByReadiness.SHADOW_ONLY} |`);
  return ["# Wave L adaptive learning completion", "",
    "Wave L adds no production curriculum. It verifies deterministic adaptive compatibility for the frozen combined A–K candidate set.", "",
    "| Grade | Readiness | Units | Skills | Questions | Ready | Pool-limited | Shadow |", "|---:|---|---:|---:|---:|---:|---:|---:|", ...rows, "",
    `Frozen combined A–K bundle: \`${audit.frozen.combinedAKBundleActual}\`.`,
    `Compatibility artifact: \`${audit.compatibility.compatibilityHash}\`.`,
    `Visited states/transitions: ${audit.totals.visitedStates}/${audit.totals.visitedTransitions}; invariant violations: ${audit.totals.invariantViolations}.`,
    `Credential reads / Wave L network attempts: ${audit.totals.credentialReads}/${audit.totals.networkAttempts}.`,
    `Wave F registry incident and Wave K credential-read incident remain recorded; Wave L incidents: ${audit.invocationBoundary.waveLOperationalIncidentCount}.`,
    "", "The thresholds labelled PRODUCT_HYPOTHESIS are software policy values, not curriculum-authoritative or expert pedagogical claims.", ""].join("\n");
}
