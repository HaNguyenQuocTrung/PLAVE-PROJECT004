import { achievementEligibility, calculateStreak, goalsFromProgress, localLearningDate, projectLevel,
  PLAVE_MOTIVATION_POLICY_V1 } from "../motivation/policy-v1.ts";
import { PLAVE_SCORING_POLICY_V1, type MasteryStatus } from "../scoring/policy-v1.ts";
import { canonicalize, sha256 } from "./canonical.ts";
import type { CandidateBinding, FactoryGrade } from "./types.ts";
import type { WaveLNextActionKind } from "./wave-l.ts";

export type WaveMHistoryRecord = Readonly<{
  schemaVersion: "plave-wave-m-history-record-v1";
  ownerId: string;
  schoolGrade: FactoryGrade;
  candidate: CandidateBinding;
  unitId: string;
  skillId: string;
  attemptId: string;
  startedAt: string;
  completedAt: string | null;
  questionsAttempted: readonly Readonly<{ questionId: string; correct: boolean }> [];
  scoring: Readonly<{ policyVersion: typeof PLAVE_SCORING_POLICY_V1; scorePercent: number; xpAwarded: number; totalXpAfter: number }>;
  motivation: Readonly<{ policyVersion: typeof PLAVE_MOTIVATION_POLICY_V1; levelAfter: number; streakAfter: number;
    goalState: "IN_PROGRESS" | "COMPLETED"; achievementIds: readonly string[] }>;
  masteryTransition: Readonly<{ from: MasteryStatus; to: MasteryStatus; provenance: "PLAVE_SCORING_POLICY_V1" | "PRODUCT_HYPOTHESIS" }>;
  remediationTransition: Readonly<{ fromSkillId: string | null; toSkillId: string | null; reasonCode: string }>;
  completionReason: "MASTERY" | "MAXIMUM_TERMINATION" | "FIXED_SAFE_COMPLETE" | "IN_PROGRESS" | "DEACTIVATED";
  nextAction: Readonly<{ kind: WaveLNextActionKind; reasonCode: string; targetSkillId: string | null }>;
  resumeState: "RESUMABLE" | "TERMINAL";
  candidateActiveAtRead: boolean;
  policyInterpretationFrozen: true;
}>;

export type WaveMHistoryState = Readonly<{
  records: readonly WaveMHistoryRecord[];
  mutations: readonly Readonly<{ idempotencyKey: string; commandHash: string; attemptId: string }> [];
}>;

export type WaveMViewActor = Readonly<{
  userId: string;
  role: "STUDENT" | "PARENT" | "TEACHER" | "ANONYMOUS";
  approvedStudentIds: readonly string[];
  authorizedStudentIds: readonly string[];
}>;

export const emptyWaveMHistoryState: WaveMHistoryState = Object.freeze({ records: [], mutations: [] });

function validInstant(value: string | null) {
  return value === null || Number.isFinite(Date.parse(value));
}

function validateHistoryRecord(record: WaveMHistoryRecord) {
  if (!record.ownerId || !record.attemptId || !record.unitId || !record.skillId) return "HISTORY_IDENTITY_REQUIRED";
  if (!validInstant(record.startedAt) || !validInstant(record.completedAt)) return "HISTORY_TIME_INVALID";
  if (record.completedAt && Date.parse(record.completedAt) < Date.parse(record.startedAt)) return "HISTORY_TIME_ORDER_INVALID";
  if (new Set(record.questionsAttempted.map((question) => question.questionId)).size !== record.questionsAttempted.length) return "HISTORY_DUPLICATE_QUESTION";
  if (record.scoring.totalXpAfter < record.scoring.xpAwarded || record.scoring.scorePercent < 0 || record.scoring.scorePercent > 100) return "HISTORY_SCORING_INVALID";
  return null;
}

export function appendWaveMHistoryExactlyOnce(state: WaveMHistoryState, input: Readonly<{
  idempotencyKey: string;
  expectedRecordCount: number;
  record: WaveMHistoryRecord;
}>) {
  const validation = validateHistoryRecord(input.record);
  if (validation) return { kind: "INVALID_RECORD" as const, reasonCode: validation, state, effectsApplied: false as const };
  const commandHash = sha256(canonicalize(input.record));
  const mutation = state.mutations.find((entry) => entry.idempotencyKey === input.idempotencyKey);
  if (mutation) return mutation.commandHash === commandHash
    ? { kind: "IDEMPOTENT_REPLAY" as const, reasonCode: "HISTORY_ALREADY_APPENDED", state, effectsApplied: false as const }
    : { kind: "IDEMPOTENCY_CONFLICT" as const, reasonCode: "HISTORY_MUTATION_CONFLICT", state, effectsApplied: false as const };
  if (input.expectedRecordCount !== state.records.length) return { kind: "CAS_CONFLICT" as const,
    reasonCode: "HISTORY_REVISION_CONFLICT", state, effectsApplied: false as const };
  if (state.records.some((record) => record.attemptId === input.record.attemptId)) return { kind: "ATTEMPT_ALREADY_RECORDED" as const,
    reasonCode: "HISTORY_ATTEMPT_ID_CONFLICT", state, effectsApplied: false as const };
  const next = { records: [...state.records, input.record], mutations: [...state.mutations,
    { idempotencyKey: input.idempotencyKey, commandHash, attemptId: input.record.attemptId }] };
  return { kind: "APPENDED" as const, reasonCode: "HISTORY_APPENDED", state: next, effectsApplied: true as const };
}

function authorizeHistoryRead(actor: WaveMViewActor, ownerId: string) {
  if (actor.role === "STUDENT") return actor.userId === ownerId ? "ALLOWED" as const : "CROSS_USER_DENIED" as const;
  if (actor.role === "PARENT") return actor.approvedStudentIds.includes(ownerId) ? "ALLOWED" as const : "PARENT_CONNECTION_REQUIRED" as const;
  if (actor.role === "TEACHER") return actor.authorizedStudentIds.includes(ownerId) ? "ALLOWED" as const : "TEACHER_SCOPE_REQUIRED" as const;
  return "AUTHENTICATION_REQUIRED" as const;
}

function stableHistory(records: readonly WaveMHistoryRecord[]) {
  return [...records].sort((left, right) => Date.parse(right.completedAt ?? right.startedAt) - Date.parse(left.completedAt ?? left.startedAt)
    || right.attemptId.localeCompare(left.attemptId));
}

export function readWaveMHistoryPage(state: WaveMHistoryState, input: Readonly<{
  actor: WaveMViewActor;
  ownerId: string;
  cursor: string | null;
  limit: number;
}>) {
  const authorization = authorizeHistoryRead(input.actor, input.ownerId);
  if (authorization !== "ALLOWED") return { ok: false as const, reasonCode: authorization, records: [] as readonly WaveMHistoryRecord[], nextCursor: null };
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50) return { ok: false as const,
    reasonCode: "PAGINATION_LIMIT_INVALID" as const, records: [] as readonly WaveMHistoryRecord[], nextCursor: null };
  const ordered = stableHistory(state.records.filter((record) => record.ownerId === input.ownerId));
  const start = input.cursor === null ? 0 : ordered.findIndex((record) => record.attemptId === input.cursor) + 1;
  if (input.cursor !== null && start === 0) return { ok: false as const, reasonCode: "PAGINATION_CURSOR_INVALID" as const,
    records: [] as readonly WaveMHistoryRecord[], nextCursor: null };
  const records = ordered.slice(start, start + input.limit);
  const nextCursor = start + input.limit < ordered.length ? records.at(-1)?.attemptId ?? null : null;
  return { ok: true as const, reasonCode: "HISTORY_READ_ALLOWED" as const, records, nextCursor };
}

export function authorizeWaveMAction(actor: WaveMViewActor, action: "READ_PROGRESS" | "READ_HISTORY" | "START" | "SUBMIT", ownerId: string) {
  if (action === "START" || action === "SUBMIT") return actor.role === "STUDENT" && actor.userId === ownerId
    ? { allowed: true as const, reasonCode: "STUDENT_SELF_ACTION" as const }
    : { allowed: false as const, reasonCode: "STUDENT_SELF_ACTION_REQUIRED" as const };
  const reason = authorizeHistoryRead(actor, ownerId);
  return reason === "ALLOWED" ? { allowed: true as const, reasonCode: "AUTHORIZED_STAKEHOLDER_READ" as const }
    : { allowed: false as const, reasonCode: reason };
}

export function deriveWaveMProgress(input: Readonly<{
  ownerId: string;
  schoolGrade: FactoryGrade;
  history: readonly WaveMHistoryRecord[];
  serverInventory: Readonly<{ candidateSkillCount: number; unitCount: number }>;
  asOf: string;
}>) {
  if (!Number.isFinite(Date.parse(input.asOf))) throw new Error("PROGRESS_AS_OF_INVALID");
  if (input.history.some((record) => record.ownerId !== input.ownerId || record.schoolGrade !== input.schoolGrade)) {
    throw new Error("PROGRESS_OWNER_OR_GRADE_MISMATCH");
  }
  if (new Set(input.history.map((record) => record.attemptId)).size !== input.history.length) throw new Error("PROGRESS_DUPLICATE_ATTEMPT_HISTORY");
  const ordered = [...input.history].sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt)
    || left.attemptId.localeCompare(right.attemptId));
  const latest = ordered.at(-1) ?? null;
  const completed = ordered.filter((record) => record.completedAt !== null && record.completionReason !== "IN_PROGRESS");
  const questionsAttempted = ordered.flatMap((record) => record.questionsAttempted);
  const evidencedSkills = new Set(ordered.filter((record) => record.questionsAttempted.length > 0).map((record) => record.skillId));
  const completedSkills = new Set(completed.map((record) => record.skillId));
  const totalXp = Math.max(0, ...ordered.map((record) => record.scoring.totalXpAfter));
  const today = localLearningDate(input.asOf); const learningDates = completed.map((record) => localLearningDate(record.completedAt!));
  const streak = calculateStreak(learningDates, today);
  const todayRecords = completed.filter((record) => localLearningDate(record.completedAt!) === today);
  const weekFloor = Date.parse(input.asOf) - 7 * 86_400_000;
  const weekRecords = completed.filter((record) => Date.parse(record.completedAt!) >= weekFloor && Date.parse(record.completedAt!) <= Date.parse(input.asOf));
  const dailyXp = todayRecords.reduce((sum, record) => sum + record.scoring.xpAwarded, 0);
  const weeklyXp = weekRecords.reduce((sum, record) => sum + record.scoring.xpAwarded, 0);
  const goals = goalsFromProgress({ dailyXp, dailyAttempts: todayRecords.length, weeklyXp, weeklyAttempts: weekRecords.length });
  const mastered = new Set(ordered.filter((record) => record.masteryTransition.to === "MASTERED").map((record) => record.skillId));
  const achievements = achievementEligibility({ completedAttemptCount: completed.length,
    correctAnswerCount: questionsAttempted.filter((question) => question.correct).length, totalXp,
    longestStreakDays: streak.longestStreakDays, masteredCount: mastered.size,
    perfectAttempt: completed.some((record) => record.scoring.scorePercent === 100), dailyGoalCompleted: goals.dailyCompleted,
    weeklyGoalCompleted: goals.weeklyCompleted, comeback: ordered.some((record) => record.masteryTransition.from === "NEEDS_REVIEW"
      && ["PROFICIENT", "MASTERED"].includes(record.masteryTransition.to)) });
  return { schemaVersion: "plave-wave-m-structured-progress-v1", ownerId: input.ownerId, schoolGrade: input.schoolGrade,
    current: { unitId: latest?.unitId ?? null, skillId: latest?.skillId ?? null }, attempts: { started: ordered.length, completed: completed.length },
    evidence: { count: questionsAttempted.length, correct: questionsAttempted.filter((question) => question.correct).length,
      accuracyPercent: questionsAttempted.length === 0 ? null : Math.round(100 * questionsAttempted.filter((question) => question.correct).length / questionsAttempted.length) },
    mastery: { state: latest?.masteryTransition.to ?? "NOT_STARTED", provenance: latest?.masteryTransition.provenance ?? "PRODUCT_HYPOTHESIS",
      masteredSkillCount: mastered.size }, remediation: { active: latest?.remediationTransition.toSkillId !== null && latest?.remediationTransition.toSkillId !== undefined,
      targetSkillId: latest?.remediationTransition.toSkillId ?? null }, retentionDue: latest?.nextAction.kind === "RETENTION_REVIEW",
    lastActivity: latest?.completedAt ?? latest?.startedAt ?? null, recommendedNextAction: latest?.nextAction ?? {
      kind: "GRADE_COMPLETE_WITH_FUTURE_PATH" as const, reasonCode: "NO_HISTORY_START_SAME_GRADE", targetSkillId: null },
    completionSummary: { denominatorKind: "QUESTION_BEARING_CANDIDATE_SKILLS" as const,
      candidateSkillCount: input.serverInventory.candidateSkillCount, evidencedSkillCount: evidencedSkills.size,
      completedSkillCount: completedSkills.size, unitCount: input.serverInventory.unitCount, curriculumPercentClaim: null },
    scoring: { policyVersion: PLAVE_SCORING_POLICY_V1, totalXp }, motivation: { policyVersion: PLAVE_MOTIVATION_POLICY_V1,
      level: projectLevel(totalXp), streak, goals, achievements }, historyDerived: true, clientSuppliedTotalsAccepted: false,
    schoolGradeMutation: false, candidateDeactivationDeletesHistory: false } as const;
}
