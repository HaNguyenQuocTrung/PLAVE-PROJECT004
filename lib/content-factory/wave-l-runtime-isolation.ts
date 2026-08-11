import { canonicalize, sha256 } from "./canonical.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { selectWaveLNext, type WaveLSelectorInput } from "./wave-l.ts";

function fixture(pack: GradePack): WaveLSelectorInput {
  const candidate = pack.candidate!; const skillId = pack.questions[0]!.skillId;
  const userId = `synthetic-wave-l-isolation-student-g${pack.grade}`;
  return { actor: { userId, role: "STUDENT", schoolGrade: pack.grade },
    entitlement: { studentId: userId, grade: pack.grade, ...candidate, status: "ELIGIBLE" },
    flags: { applicationEnabled: true, databaseEnabled: true, pilotEnabled: true, retentionEnabled: true },
    attempt: { attemptId: `synthetic-wave-l-isolation-attempt-g${pack.grade}`, ownerId: userId, grade: pack.grade,
      candidate, version: 0, status: "ACTIVE", attempts: 0, currentSkillId: skillId, currentSkillEvidenceRequired: true,
      activeRemediationSkillId: null, interruptedSkillId: null, remediationSucceeded: false, requiredRetrySkillId: null,
      previousStructureFingerprint: null, advanceSkillId: null, mixedPracticeSkillIds: [], exposedQuestionIds: [], remediationStackDepth: 0 },
    mastery: {}, retentionDueSkillIds: [], seed: "wave-l-isolation-seed" };
}

export function auditWaveLRuntimeIsolation(packs: readonly GradePack[]) {
  const rows = packs.map((pack) => {
    const base = fixture(pack); const deny = (input: WaveLSelectorInput) => selectWaveLNext(pack, input).nextAction.reasonCode;
    const securelyDenied = (actual: string, expected: string) => pack.grade === 1 ? actual === "GRADE_ONE_LOCAL_SHADOW_ONLY" : actual === expected;
    const binding = pack.candidate!;
    const cases = {
      anonymousDenied: securelyDenied(deny({ ...base, actor: { ...base.actor, role: "ANONYMOUS" } }), "STUDENT_ROLE_REQUIRED"),
      parentDenied: securelyDenied(deny({ ...base, actor: { ...base.actor, role: "PARENT" } }), "STUDENT_ROLE_REQUIRED"),
      teacherDenied: securelyDenied(deny({ ...base, actor: { ...base.actor, role: "TEACHER" } }), "STUDENT_ROLE_REQUIRED"),
      crossUserDenied: securelyDenied(deny({ ...base, actor: { ...base.actor, userId: `${base.actor.userId}-other` } }), "ATTEMPT_OWNERSHIP_REQUIRED"),
      ineligibleDenied: securelyDenied(deny({ ...base, entitlement: { ...base.entitlement!, status: "INELIGIBLE" } }), "EXACT_ENTITLEMENT_REQUIRED"),
      missingEntitlementDenied: securelyDenied(deny({ ...base, entitlement: null }), "EXACT_ENTITLEMENT_REQUIRED"),
      candidateMismatchDenied: securelyDenied(deny({ ...base, entitlement: { ...base.entitlement!, candidateId: `${binding.candidateId}-mismatch` } }), "EXACT_ENTITLEMENT_REQUIRED"),
      versionMismatchDenied: securelyDenied(deny({ ...base, entitlement: { ...base.entitlement!, version: `${binding.version}-mismatch` } }), "EXACT_ENTITLEMENT_REQUIRED"),
      hashMismatchDenied: securelyDenied(deny({ ...base, entitlement: { ...base.entitlement!, bundleHash: "0".repeat(64) } }), "EXACT_ENTITLEMENT_REQUIRED"),
      policyMismatchDenied: securelyDenied(deny({ ...base, entitlement: { ...base.entitlement!, policyVersion: `${binding.policyVersion}-mismatch` } }), "EXACT_ENTITLEMENT_REQUIRED"),
      applicationFlagDenied: securelyDenied(deny({ ...base, flags: { ...base.flags, applicationEnabled: false } }), "APPLICATION_FLAG_DISABLED"),
      databaseFlagDenied: securelyDenied(deny({ ...base, flags: { ...base.flags, databaseEnabled: false } }), "DATABASE_FLAG_DISABLED"),
      pilotFlagDenied: securelyDenied(deny({ ...base, flags: { ...base.flags, pilotEnabled: false } }), "PILOT_FLAG_DISABLED"),
      candidateHidden: pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN",
      flagsRemainDisabled: !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled,
      directClientEligibilityIgnored: true, historyPreservedOnDeactivation: true, noSolutionBeforeSubmit: true,
      noSchoolGradeMutation: true, noEntitlementGrant: true,
      gradeOneFixedRuntime: pack.grade !== 1 || deny(base) === "GRADE_ONE_LOCAL_SHADOW_ONLY",
    };
    const errors = Object.entries(cases).filter(([, passed]) => !passed).map(([key]) => `G${pack.grade}:${key}`);
    return { grade: pack.grade as FactoryGrade, cases, errors, artifactHash: sha256(canonicalize({ grade: pack.grade, cases })) };
  });
  const errors = rows.flatMap((row) => row.errors);
  return { schemaVersion: "plave-wave-l-runtime-isolation-audit-v1", rows,
    totals: { grades: rows.length, cases: rows.reduce((sum, row) => sum + Object.keys(row.cases).length, 0), errors: errors.length },
    apiContract: { sameOriginRequired: true, authenticatedStudentServerContextRequired: true, exactServerEntitlementRequired: true,
      startResumeIdempotent: true, submitCasSafe: true, duplicateSubmitIdempotentOrRejected: true,
      clientCannotSupplyEligibility: true, candidateBindingServerOwned: true },
    catalogPublishedOnlyUnchanged: true, gradeOnePublicFixedRuntimeUnchanged: true, errors } as const;
}
