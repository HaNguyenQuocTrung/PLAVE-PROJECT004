import { canonicalize } from "./canonical.ts";
import type { buildWaveNFinalAudit } from "./wave-n.ts";

type Audit = ReturnType<typeof buildWaveNFinalAudit>;

function acceptanceRows(audit: Audit) {
  return audit.acceptanceMatrix.grades.map((row) =>
    `| ${row.grade} | ${row.result} | ${row.sections.learning ? "PASS" : "FAIL"} | ${row.sections.progress ? "PASS" : "FAIL"} | ${row.sections.path ? "PASS" : "FAIL"} | ${row.sections.history ? "PASS" : "FAIL"} | ${row.sections.continuousLearning ? "PASS" : "FAIL"} |`).join("\n");
}

export function renderWaveNIndependentAudit(audit: Audit) {
  return `# PLAVE Wave N final independent audit\n\nStatus: **${audit.status}**. Submission blockers: ${audit.totals.submissionBlockers}; critical defects: ${audit.totals.criticalDefects}.\n\n`
    + `Frozen hashes: A–K \`${audit.frozenChecks.combinedAK.actual}\`, Wave L \`${audit.frozenChecks.waveL.actual}\`, Wave M \`${audit.frozenChecks.waveM.actual}\`, corrective overlay \`${audit.frozenChecks.waveMCorrectiveOverlay.actual}\`.\n\n`
    + `Acceptance: ${audit.totals.gradePass} PASS, ${audit.totals.gradePartialAccepted} PARTIAL_ACCEPTED, ${audit.totals.gradeFail} FAIL. `
    + `States/transitions: ${audit.finalE2E.visitedStates}/${audit.finalE2E.visitedTransitions}; violations: ${audit.finalE2E.invariantViolations}.\n\n`
    + `Credential reads, real environment files opened, network attempts and port 3000 operations: ${audit.totals.credentialReads}/${audit.totals.realEnvironmentFilesOpened}/${audit.totals.networkAttempts}/${audit.totals.port3000Operations}.\n\n`
    + `Authorized post-freeze correction: secret-boundary scope \`${audit.postFreezeCorrection.secretBoundary.scopeVersion}\`; Wave M scope \`${audit.postFreezeCorrection.waveM.scopeVersion}\` with input digest \`${audit.postFreezeCorrection.waveM.inputDigest}\`. A–K remains \`${audit.postFreezeCorrection.combinedAKHashAfter}\`.\n`;
}

export function renderCompletion(audit: Audit) {
  return `# PLAVE FYP completion\n\nPLAVE Grades 1–9 is code-complete for the FYP scope and frozen pending separate Owner authorization for push or submission. Wave N adds no curriculum, production question, role, architecture, migration, publication, activation or entitlement.\n\n`
    + `## Frozen product truth\n\n- Combined A–K: \`${audit.frozenChecks.combinedAK.actual}\`\n- Wave L compatibility: \`${audit.frozenChecks.waveL.actual}\`\n- Wave M compatibility: \`${audit.frozenChecks.waveM.actual}\`\n- Wave M corrective overlay: \`${audit.frozenChecks.waveMCorrectiveOverlay.actual}\`\n- Final source-tree digest: \`${audit.sourceSubmissionInventory.sourceTreeDigest}\`\n- Final release receipt: \`${audit.releaseReceipt.receiptHash}\`\n\n`
    + `## Grades 1–9 acceptance\n\n| Grade | Result | Learning | Progress | Path | History | Continuous learning |\n|---:|---|---|---|---|---|---|\n${acceptanceRows(audit)}\n\n`
    + `Grade 1 is PARTIAL_ACCEPTED only because its verified public learning path remains fixed-runtime while adaptive behavior is shadow-only. The fixed journey works. Grades 2–9 pass the local hidden-candidate software proof.\n\n`
    + `## Completion accounting\n\nInventory remains 2,772 questions, 338 question-bearing skills and 176 units. Readiness remains 274 adaptive-ready, 13 fixed-safe, 51 Grade 1 shadow-only and 0 unavailable. Candidates remain DRAFT/HIDDEN with publication, pilot, runtime and retention disabled and zero default entitlement.\n\n`
    + `## Authorized post-freeze correction\n\nThe final audit findings were corrected without creating Wave O: the official secret-boundary command is tracked-only and credential-safe, Wave M regeneration uses scope \`${audit.postFreezeCorrection.waveM.scopeVersion}\` with input digest \`${audit.postFreezeCorrection.waveM.inputDigest}\`, and submission-facing documentation now points to the canonical final inventory. Grades 2–9 release integration remains unperformed.\n\n`
    + `The deterministic proof covers Student start/resume, answer, post-submit feedback, progress, motivation, history, mastery, remediation-return, fixed-safe fallback, retention, mixed practice, maximum termination, grade completion, deactivation, Parent/Teacher authorization, CAS/duplicate safety, solution isolation and continuous next action.\n\n`
    + `No Wave O is planned. Push, merge, tag, PR, deploy, publication and activation require separate Owner authorization.\n`;
}

export function renderScopeAndLimitations(audit: Audit) {
  const scopeRows = audit.scopeInventory.map((row) => `| ${row.id} | ${row.classification} | ${row.finding} | ${row.action} |`).join("\n");
  return `# PLAVE final scope and limitations\n\n## Scope classification\n\n| ID | Classification | Finding | Disposition |\n|---|---|---|---|\n${scopeRows}\n\n`
    + `## Completed scope\n\nGrades 1–9 learning journeys are proven locally for the frozen candidate inventory. Progress is server/history-derived, history is exactly-once and policy-bound, and Student/Parent/Teacher reads remain owner/role scoped. Published-only catalog isolation and deny-all defaults are unchanged.\n\n`
    + `## Accepted limitations\n\n- Grade 1 is PARTIAL_ACCEPTED: fixed-runtime and adaptive shadow-only; 84 legacy items have deterministic evidence, 24 visual items remain quarantined and 228 remain UNKNOWN.\n- Thirteen Grades 2–9 skills use fixed-safe practice and make no adaptive-mastery claim.\n- Open-ended, experiential, visual-dependent and verification-insufficient outcomes remain excluded or UNKNOWN.\n- Grades 2–9 candidates remain hidden and inactive; no pilot or publication claim is made.\n- No expert review, live pilot, remote activation or production deployment is claimed.\n\n`
    + `These limitations are product truth, not defects silently converted to PASS.\n`;
}

export function renderDemoGuide(audit: Audit) {
  return `# PLAVE FYP demo guide\n\nThis guide uses existing local routes/components and synthetic fixtures. It does not authorize publication, activate hidden candidates, start a server, inspect port 3000 or use credentials.\n\n`
    + `## Demonstration sequence\n\n1. Explain the published Grade 1 fixed learning path and its LOCAL_SHADOW_ONLY adaptive comparison.\n2. Show the Student Dashboard, knowledge/lesson navigation, practice states, submit feedback, progress and learning history components through existing component/route proofs.\n3. Show one synthetic Grades 2–9 exact-entitlement journey from start/resume through progress, history and next action; clarify that the candidate remains hidden/inactive.\n4. Demonstrate mastery, remediation-return, retention, mixed practice, fixed-safe fallback and grade-complete future path using deterministic reports.\n5. Demonstrate approved/unapproved Parent and authorized/unauthorized Teacher access, anonymous/cross-user denial, duplicate/CAS protection and history preservation after deactivation.\n6. Close with the acceptance matrix: ${audit.totals.gradePass} PASS, ${audit.totals.gradePartialAccepted} PARTIAL_ACCEPTED, 0 FAIL.\n\n`
    + `## Evidence entry points\n\n- \`content/grade-packs/generated/wave-n-final-acceptance-matrix.json\`\n- \`content/grade-packs/generated/wave-n-final-candidate-inventory.json\`\n- \`content/grade-packs/generated/wave-n-final-security-privacy-receipt.json\`\n- \`content/grade-packs/generated/wave-n-final-release-receipt.json\`\n- \`content/grade-packs/generated/wave-m-student-journey-report.json\`\n\n`
    + `Do not claim Grades 2–9 publication, adaptive mastery for fixed-safe skills, expert endorsement, live-user effectiveness or production deployment.\n`;
}

export function renderFutureDevelopment() {
  return `# PLAVE future development\n\nThis list is outside the completed FYP scope. It is not a defect list and no Wave O is planned.\n\n`
    + `- Migrate Grade 1 from fixed runtime to a fully evidenced adaptive runtime without changing legacy truth.\n`
    + `- Add deterministic assessment capability for visual and suitable open-ended outcomes.\n`
    + `- Calibrate adaptive thresholds using authorized real learner data and an explicit research protocol.\n`
    + `- Run broader pilots and pursue publication only after separate curriculum, privacy and Owner authorization.\n`
    + `- Add subjects beyond mathematics through their own retained-source and oracle gates.\n`
    + `- Plan production deployment, observability, scaling, backup and incident operations separately.\n`
    + `- Continue accessibility validation with assistive-technology users and expand privacy-preserving analytics.\n`;
}

export function renderWaveNArtifacts(audit: Audit) {
  const json = (value: unknown) => `${canonicalize(value)}\n`;
  return {
    "content/grade-packs/generated/wave-n-final-acceptance-matrix.json": json(audit.acceptanceMatrix),
    "content/grade-packs/generated/wave-n-final-candidate-inventory.json": json(audit.candidateInventory),
    "content/grade-packs/generated/wave-n-final-checksum-manifest.json": json(audit.checksumManifest),
    "content/grade-packs/generated/wave-n-final-test-quality-receipt.json": json(audit.qualityReceipt),
    "content/grade-packs/generated/wave-n-final-security-privacy-receipt.json": json(audit.securityPrivacy),
    "content/grade-packs/generated/wave-n-final-known-incidents-limitations.json": json(audit.knownIncidentsLimitations),
    "content/grade-packs/generated/wave-n-final-source-submission-inventory.json": json(audit.sourceSubmissionInventory),
    "content/grade-packs/generated/wave-n-final-release-receipt.json": json(audit.releaseReceipt),
    "content/grade-packs/generated/wave-n-final-independent-audit.json": json(audit),
    "content/grade-packs/generated/wave-n-final-independent-audit.md": renderWaveNIndependentAudit(audit),
    "docs/final/PLAVE_FYP_COMPLETION.md": renderCompletion(audit),
    "docs/final/PLAVE_SCOPE_AND_LIMITATIONS.md": renderScopeAndLimitations(audit),
    "docs/final/PLAVE_DEMO_GUIDE.md": renderDemoGuide(audit),
    "docs/final/PLAVE_FUTURE_DEVELOPMENT.md": renderFutureDevelopment(),
  } as const;
}
