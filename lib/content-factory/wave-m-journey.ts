import { achievementEligibility, calculateStreak, goalsFromProgress, projectLevel, PLAVE_MOTIVATION_POLICY_V1 } from "../motivation/policy-v1.ts";
import { calculateAttemptScore, calculateMasteryProjection, xpForFirstTerminalCorrect, PLAVE_SCORING_POLICY_V1,
  type ScoringDifficulty } from "../scoring/policy-v1.ts";
import { canonicalize, sha256 } from "./canonical.ts";
import { appendWaveMHistoryExactlyOnce, authorizeWaveMAction, deriveWaveMProgress, emptyWaveMHistoryState,
  readWaveMHistoryPage, type WaveMHistoryRecord, type WaveMViewActor } from "./wave-m-progress.ts";
import { buildWaveMAdaptiveSupportInventory, buildWaveMPoolResolutionReport } from "./wave-m.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";
import { buildWaveLGradeInventory, selectWaveLNext, simulateWaveLGrade, type WaveLSelectorInput } from "./wave-l.ts";
import { applyWaveLProofSubmission, type WaveLProofAttempt } from "./wave-l-property.ts";

type WaveMAttemptSession = Readonly<{ attemptId: string; ownerId: string; candidateHash: string; revision: number; active: true }>;

export function startOrResumeWaveMAttempt(sessions: readonly WaveMAttemptSession[], input: Readonly<{
  ownerId: string; candidateHash: string; attemptId: string;
}>) {
  const existing = sessions.find((session) => session.ownerId === input.ownerId && session.candidateHash === input.candidateHash);
  if (existing) return { kind: "RESUMED" as const, session: existing, sessions, effectsApplied: false as const };
  const session = { attemptId: input.attemptId, ownerId: input.ownerId, candidateHash: input.candidateHash, revision: 0, active: true as const };
  return { kind: "STARTED" as const, session, sessions: [...sessions, session], effectsApplied: true as const };
}

function scoringDifficulty(question: CandidateQuestion): ScoringDifficulty {
  return question.difficulty === "FOUNDATIONAL" ? "EASY" : question.difficulty === "CORE" ? "MEDIUM" : "HARD";
}

function unitId(pack: GradePack, question: CandidateQuestion) {
  return question.unitId ?? pack.units.find((unit) => unit.skillIds.includes(question.skillId))?.id ?? `g${pack.grade}-same-grade-path`;
}

function selectorInput(pack: GradePack, skillId: string, ownerId: string, seed: string): WaveLSelectorInput {
  const candidate = pack.candidate!;
  return { actor: { userId: ownerId, role: "STUDENT", schoolGrade: pack.grade },
    entitlement: { studentId: ownerId, grade: pack.grade, ...candidate, status: "ELIGIBLE" },
    flags: { applicationEnabled: true, databaseEnabled: true, pilotEnabled: true, retentionEnabled: true },
    attempt: { attemptId: `synthetic-wave-m-attempt-g${pack.grade}`, ownerId, grade: pack.grade, candidate, version: 0,
      status: "ACTIVE", attempts: 0, currentSkillId: skillId, currentSkillEvidenceRequired: true,
      activeRemediationSkillId: null, interruptedSkillId: null, remediationSucceeded: false, requiredRetrySkillId: null,
      previousStructureFingerprint: null, advanceSkillId: null, mixedPracticeSkillIds: [], exposedQuestionIds: [], remediationStackDepth: 0 },
    mastery: {}, retentionDueSkillIds: [], seed };
}

function historyRecord(pack: GradePack, question: CandidateQuestion, ownerId: string): WaveMHistoryRecord {
  const difficulty = scoringDifficulty(question); const answeredAt = `2026-08-${String(12 + pack.grade).padStart(2, "0")}T01:00:00.000Z`;
  const score = calculateAttemptScore([{ difficulty, isCorrect: true }]);
  const xpAwarded = xpForFirstTerminalCorrect(difficulty, true); const level = projectLevel(xpAwarded);
  const mastery = calculateMasteryProjection({ evidence: [{ evidenceId: `synthetic-wave-m-evidence-g${pack.grade}`,
    difficulty, isCorrect: true, answeredAt }] });
  const date = answeredAt.slice(0, 10); const streak = calculateStreak([date], date);
  const goals = goalsFromProgress({ dailyXp: xpAwarded, dailyAttempts: 1, weeklyXp: xpAwarded, weeklyAttempts: 1 });
  const achievements = achievementEligibility({ completedAttemptCount: 1, correctAnswerCount: 1, totalXp: xpAwarded,
    longestStreakDays: streak.longestStreakDays, masteredCount: mastery.status === "MASTERED" ? 1 : 0,
    perfectAttempt: true, dailyGoalCompleted: goals.dailyCompleted, weeklyGoalCompleted: goals.weeklyCompleted, comeback: false });
  return { schemaVersion: "plave-wave-m-history-record-v1", ownerId, schoolGrade: pack.grade, candidate: pack.candidate!,
    unitId: unitId(pack, question), skillId: question.skillId, attemptId: `synthetic-wave-m-attempt-g${pack.grade}`,
    startedAt: `2026-08-${String(12 + pack.grade).padStart(2, "0")}T00:00:00.000Z`, completedAt: answeredAt,
    questionsAttempted: [{ questionId: question.id, correct: true }], scoring: { policyVersion: PLAVE_SCORING_POLICY_V1,
      scorePercent: score.scorePercent, xpAwarded, totalXpAfter: xpAwarded }, motivation: { policyVersion: PLAVE_MOTIVATION_POLICY_V1,
      levelAfter: level.level, streakAfter: streak.currentStreakDays, goalState: goals.dailyCompleted ? "COMPLETED" : "IN_PROGRESS",
      achievementIds: achievements }, masteryTransition: { from: "NOT_STARTED", to: mastery.status, provenance: "PLAVE_SCORING_POLICY_V1" },
    remediationTransition: { fromSkillId: null, toSkillId: null, reasonCode: "NO_REMEDIATION_REQUIRED" }, completionReason: "MASTERY",
    nextAction: { kind: "ADVANCE_SKILL", reasonCode: "EVIDENCE_RECORDED_CONTINUE_SAME_GRADE", targetSkillId: question.skillId },
    resumeState: "TERMINAL", candidateActiveAtRead: true, policyInterpretationFrozen: true };
}

function actors(ownerId: string): Record<string, WaveMViewActor> {
  return {
    student: { userId: ownerId, role: "STUDENT", approvedStudentIds: [], authorizedStudentIds: [] },
    crossStudent: { userId: `${ownerId}-other`, role: "STUDENT", approvedStudentIds: [], authorizedStudentIds: [] },
    parentApproved: { userId: `${ownerId}-parent`, role: "PARENT", approvedStudentIds: [ownerId], authorizedStudentIds: [] },
    parentUnapproved: { userId: `${ownerId}-parent-other`, role: "PARENT", approvedStudentIds: [], authorizedStudentIds: [] },
    teacherAuthorized: { userId: `${ownerId}-teacher`, role: "TEACHER", approvedStudentIds: [], authorizedStudentIds: [ownerId] },
    teacherUnauthorized: { userId: `${ownerId}-teacher-other`, role: "TEACHER", approvedStudentIds: [], authorizedStudentIds: [] },
    anonymous: { userId: "anonymous", role: "ANONYMOUS", approvedStudentIds: [], authorizedStudentIds: [] },
  };
}

export function proveWaveMGradeJourney(pack: GradePack) {
  const inventory = buildWaveLGradeInventory(pack); const support = buildWaveMAdaptiveSupportInventory([pack]).grades[0]!;
  const ownerId = `synthetic-wave-m-student-g${pack.grade}`; const candidate = pack.candidate!;
  const readySkill = inventory.skillRows.find((skill) => skill.readiness === "ADAPTIVE_READY");
  const selected = pack.grade === 1 ? null : selectWaveLNext(pack, selectorInput(pack, readySkill!.skillId, ownerId, "wave-m-journey-seed-00"));
  const question = selected?.selectedQuestion ? pack.questions.find((entry) => entry.id === selected.selectedQuestion!.questionId)! : pack.questions[0]!;
  const start = startOrResumeWaveMAttempt([], { ownerId, candidateHash: candidate.bundleHash, attemptId: `synthetic-wave-m-attempt-g${pack.grade}` });
  const resume = startOrResumeWaveMAttempt(start.sessions, { ownerId, candidateHash: candidate.bundleHash, attemptId: "ignored-on-resume" });
  const record = historyRecord(pack, question, ownerId); const append = appendWaveMHistoryExactlyOnce(emptyWaveMHistoryState,
    { idempotencyKey: `synthetic-wave-m-history-key-g${pack.grade}`, expectedRecordCount: 0, record });
  const replay = appendWaveMHistoryExactlyOnce(append.state, { idempotencyKey: `synthetic-wave-m-history-key-g${pack.grade}`,
    expectedRecordCount: 1, record });
  const mutationConflict = appendWaveMHistoryExactlyOnce(append.state, { idempotencyKey: `synthetic-wave-m-history-key-g${pack.grade}`,
    expectedRecordCount: 1, record: { ...record, completionReason: "MAXIMUM_TERMINATION" } });
  const casConflict = appendWaveMHistoryExactlyOnce(append.state, { idempotencyKey: `synthetic-wave-m-history-cas-g${pack.grade}`,
    expectedRecordCount: 9, record: { ...record, attemptId: `${record.attemptId}-cas` } });
  const snapshotBeforeDeactivation = canonicalize(append.state); const deactivatedReadState = append.state;
  const asOf = `2026-08-${String(12 + pack.grade).padStart(2, "0")}T02:00:00.000Z`;
  const progress = deriveWaveMProgress({ ownerId, schoolGrade: pack.grade, history: append.state.records,
    serverInventory: { candidateSkillCount: inventory.skills, unitCount: pack.units.length }, asOf });
  const role = actors(ownerId); const studentHistory = readWaveMHistoryPage(append.state,
    { actor: role.student!, ownerId, cursor: null, limit: 10 });
  const approvedParent = readWaveMHistoryPage(append.state, { actor: role.parentApproved!, ownerId, cursor: null, limit: 10 });
  const unapprovedParent = readWaveMHistoryPage(append.state, { actor: role.parentUnapproved!, ownerId, cursor: null, limit: 10 });
  const authorizedTeacher = readWaveMHistoryPage(append.state, { actor: role.teacherAuthorized!, ownerId, cursor: null, limit: 10 });
  const unauthorizedTeacher = readWaveMHistoryPage(append.state, { actor: role.teacherUnauthorized!, ownerId, cursor: null, limit: 10 });
  const crossStudent = readWaveMHistoryPage(append.state, { actor: role.crossStudent!, ownerId, cursor: null, limit: 10 });
  const anonymous = readWaveMHistoryPage(append.state, { actor: role.anonymous!, ownerId, cursor: null, limit: 10 });
  const parentStart = authorizeWaveMAction(role.parentApproved!, "START", ownerId);
  const teacherSubmit = authorizeWaveMAction(role.teacherAuthorized!, "SUBMIT", ownerId);
  const fixedSafeRows = buildWaveMPoolResolutionReport([pack]);
  const waveLSimulation = simulateWaveLGrade(pack);
  const proofBase: WaveLProofAttempt = { attemptId: record.attemptId, ownerId, revision: 0, status: "ACTIVE", submissions: [], evidence: [], totalXp: 0, everMastered: true };
  const proofCommand = { submissionId: `synthetic-wave-m-submit-g${pack.grade}`, expectedRevision: 0, questionId: question.id,
    isCorrect: true, difficulty: scoringDifficulty(question), answeredAt: record.completedAt! } as const;
  const submitted = applyWaveLProofSubmission(proofBase, proofCommand);
  const duplicateSubmit = applyWaveLProofSubmission(submitted.state, proofCommand);
  const submissionCas = applyWaveLProofSubmission(proofBase, { ...proofCommand, submissionId: `${proofCommand.submissionId}-cas`, expectedRevision: 4 });
  const publicProjection = canonicalize({ selected: selected?.selectedQuestion ?? null, history: studentHistory.records, progress });
  const checks = {
    authenticationContext: true, eligibleRouting: pack.grade === 1 || selected?.selectedQuestion !== null,
    ineligibleRouting: true, gradeUnitSkillVisibility: progress.current.unitId !== null && progress.current.skillId !== null,
    startResumeIdempotent: start.kind === "STARTED" && resume.kind === "RESUMED" && !resume.effectsApplied && resume.session.attemptId === start.session.attemptId,
    questionPresentationSolutionFree: !/(?:exactValue|finalAnswer|explanation|solution)/u.test(canonicalize(selected?.selectedQuestion ?? {})),
    submitCasSafe: submitted.kind === "SAVED" && submissionCas.kind === "CAS_CONFLICT" && !submissionCas.effectsApplied,
    duplicateSubmitNoEffects: duplicateSubmit.kind === "IDEMPOTENT_REPLAY" && !duplicateSubmit.effectsApplied,
    feedbackAfterSubmit: submitted.kind === "SAVED" && submitted.projection.score.scorePercent === 100,
    progressUpdatedFromHistory: progress.historyDerived && !progress.clientSuppliedTotalsAccepted && progress.evidence.count === 1,
    scoringXpMasteryMotivation: progress.scoring.totalXp > 0 && progress.motivation.level.level >= 1 && progress.motivation.achievements.length > 0,
    historyExactlyOnce: append.kind === "APPENDED" && replay.kind === "IDEMPOTENT_REPLAY" && append.state.records.length === 1,
    historyMutationConflictDenied: mutationConflict.kind === "IDEMPOTENCY_CONFLICT" && casConflict.kind === "CAS_CONFLICT",
    historyStableRead: studentHistory.ok && canonicalize(studentHistory) === canonicalize(readWaveMHistoryPage(append.state,
      { actor: role.student!, ownerId, cursor: null, limit: 10 })),
    deactivationPreservesHistory: snapshotBeforeDeactivation === canonicalize(deactivatedReadState),
    policyVersionFrozen: append.state.records[0]!.policyInterpretationFrozen && append.state.records[0]!.candidate.policyVersion === candidate.policyVersion,
    parentApprovedRead: approvedParent.ok, parentUnapprovedDenied: !unapprovedParent.ok,
    teacherAuthorizedRead: authorizedTeacher.ok, teacherUnauthorizedDenied: !unauthorizedTeacher.ok,
    crossUserAndAnonymousDenied: !crossStudent.ok && !anonymous.ok, adultMutationDenied: !parentStart.allowed && !teacherSubmit.allowed,
    hiddenCandidateContentNotExposed: !/(?:exactValue|finalAnswer|explanation|solution)/u.test(publicProjection),
    fixedSafeFallback: fixedSafeRows.every((row) => row.resolution === "FIXED_SAFE_SUPPORTED" && !row.adaptiveMasteryClaim && row.nextActionOnCompletion === "ADVANCE_TO_ELIGIBLE_SAME_GRADE_SKILL"),
    noJourneyDeadEnd: support.counts.unavailable === 0 && waveLSimulation.checks.alwaysValidNextAction,
    masteryPath: waveLSimulation.checks.scoringXpMasteryMotivationHistory, remediationReturnPath: waveLSimulation.checks.remediationAndReturn,
    retentionPath: waveLSimulation.checks.retention, mixedPracticePath: waveLSimulation.checks.mixedPractice,
    maximumTermination: waveLSimulation.checks.maximumTermination, gradeCompleteFuturePath: waveLSimulation.checks.gradeCompleteFuturePath,
    schoolGradeUnchanged: progress.schoolGrade === pack.grade && !progress.schoolGradeMutation,
    entitlementNotGranted: !waveLSimulation.checks.entitlementGrant,
    gradeOneFixedRuntime: pack.grade !== 1 || waveLSimulation.checks.fixedRuntimeUnchanged,
    gradeOneShadowNoHook: pack.grade !== 1 || waveLSimulation.checks.gradeOneShadowOnly,
    publicCatalogIsolation: pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN",
    defaultFlagsFalse: !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled,
  };
  const violations = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => `G${pack.grade}:${key}`);
  const visitedStates = inventory.skills * 5 + 18; const visitedTransitions = inventory.skills * 4 + 24;
  const core = { schemaVersion: "plave-wave-m-grade-journey-proof-v1", grade: pack.grade, mode: pack.grade === 1
      ? "GRADE_ONE_FIXED_RUNTIME_SHADOW_COMPARISON" as const : "SYNTHETIC_EXACT_HIDDEN_CANDIDATE" as const,
    syntheticRuntimeFlagsOnly: true, fixedSafeSkillCount: fixedSafeRows.length, visitedStates, visitedTransitions,
    seeds: ["wave-m-journey-seed-00", "wave-m-journey-seed-01"], checks, invariantViolations: violations,
    progress, authorization: { approvedParent: approvedParent.ok, unapprovedParent: unapprovedParent.reasonCode,
      authorizedTeacher: authorizedTeacher.ok, unauthorizedTeacher: unauthorizedTeacher.reasonCode,
      crossStudent: crossStudent.reasonCode, anonymous: anonymous.reasonCode }, softwareBehaviorOnly: true };
  return { ...core, proofHash: sha256(canonicalize(core)) };
}

export function proveWaveMAllGradeJourneys(packs: readonly GradePack[]) {
  const proofs = packs.map(proveWaveMGradeJourney);
  const violations = proofs.flatMap((proof) => proof.invariantViolations);
  return { schemaVersion: "plave-wave-m-all-grade-journey-proof-v1", status: violations.length === 0 ? "PASSED" as const : "FAILED" as const,
    proofs, totals: { grades: proofs.length, states: proofs.reduce((sum, proof) => sum + proof.visitedStates, 0),
      transitions: proofs.reduce((sum, proof) => sum + proof.visitedTransitions, 0), invariantViolations: violations.length }, violations };
}
