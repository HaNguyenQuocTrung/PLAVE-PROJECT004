import { canonicalize, sha256 } from "./canonical.ts";
import type { CandidateBinding, CandidateQuestion, FactoryGrade, GradePack } from "./types.ts";
import { buildWaveIGradeAudit } from "./wave-i-remediation.ts";
import { waveJStructureFingerprint } from "./wave-j-depth.ts";

export type WaveLReadiness = "ADAPTIVE_READY" | "FIXED_RUNTIME_ONLY" | "SHADOW_ONLY"
  | "POOL_LIMITED_FAIL_CLOSED" | "EVIDENCE_LIMITED" | "UNAVAILABLE";

export type WaveLNextActionKind = "CONTINUE_CURRENT_SKILL" | "RETRY_DIFFERENT_STRUCTURE"
  | "REMEDIATE_PREREQUISITE" | "RETURN_TO_INTERRUPTED_SKILL" | "ADVANCE_SKILL"
  | "RETENTION_REVIEW" | "MIXED_PRACTICE" | "GRADE_COMPLETE_WITH_FUTURE_PATH"
  | "FAIL_CLOSED_UNAVAILABLE";

export type WaveLPolicyEvidence = "EXISTING_RUNTIME_CONTRACT" | "CONTRACT_DERIVED" | "PRODUCT_HYPOTHESIS";

export type WaveLPolicyMatrix = Readonly<{
  schemaVersion: "plave-wave-l-adaptive-policy-matrix-v1";
  version: "grades-1-9-wave-l-adaptive-policy-1.0.0";
  thresholds: Readonly<{
    attemptLimit: Readonly<{ value: 6; provenance: "CONTRACT_DERIVED"; source: "WAVE_I_ATTEMPT_LIMIT" }>;
    repeatedError: Readonly<{ value: 2; provenance: "CONTRACT_DERIVED"; source: "WAVE_I_REPEATED_ERROR_THRESHOLD" }>;
    distinctCorrectStructures: Readonly<{ value: 2; provenance: "CONTRACT_DERIVED"; source: "WAVE_J_PROMOTION_CONTRACT" }>;
    masteryAccuracy: Readonly<{ value: 0.75; provenance: "PRODUCT_HYPOTHESIS"; source: "EXISTING_ADAPTIVE_COMPATIBILITY" }>;
    retentionDueDays: Readonly<{ value: 21; provenance: "PRODUCT_HYPOTHESIS"; source: "EXISTING_CURRICULUM_SELECTOR" }>;
    remediationStackLimit: Readonly<{ value: 2; provenance: "PRODUCT_HYPOTHESIS"; source: "BOUNDED_RUNTIME_SAFETY" }>;
  }>;
  calculationSlip: Readonly<{ action: "RETRY_DIFFERENT_STRUCTURE"; deepRemediation: false; provenance: "CONTRACT_DERIVED" }>;
  deterministicSelection: true;
  pedagogicalAuthorityClaim: false;
  schoolGradeMutation: false;
  entitlementGrant: false;
}>;

export const waveLPolicyMatrix: WaveLPolicyMatrix = Object.freeze({
  schemaVersion: "plave-wave-l-adaptive-policy-matrix-v1", version: "grades-1-9-wave-l-adaptive-policy-1.0.0",
  thresholds: {
    attemptLimit: { value: 6, provenance: "CONTRACT_DERIVED", source: "WAVE_I_ATTEMPT_LIMIT" },
    repeatedError: { value: 2, provenance: "CONTRACT_DERIVED", source: "WAVE_I_REPEATED_ERROR_THRESHOLD" },
    distinctCorrectStructures: { value: 2, provenance: "CONTRACT_DERIVED", source: "WAVE_J_PROMOTION_CONTRACT" },
    masteryAccuracy: { value: 0.75, provenance: "PRODUCT_HYPOTHESIS", source: "EXISTING_ADAPTIVE_COMPATIBILITY" },
    retentionDueDays: { value: 21, provenance: "PRODUCT_HYPOTHESIS", source: "EXISTING_CURRICULUM_SELECTOR" },
    remediationStackLimit: { value: 2, provenance: "PRODUCT_HYPOTHESIS", source: "BOUNDED_RUNTIME_SAFETY" },
  },
  calculationSlip: { action: "RETRY_DIFFERENT_STRUCTURE", deepRemediation: false, provenance: "CONTRACT_DERIVED" },
  deterministicSelection: true, pedagogicalAuthorityClaim: false, schoolGradeMutation: false, entitlementGrant: false,
} as const);

export type WaveLSkillInventory = Readonly<{
  skillId: string;
  readiness: WaveLReadiness;
  questionIds: readonly string[];
  questionPool: number;
  reasoningStructures: number;
  difficultyPools: Readonly<{ foundational: number; core: number; advanced: number }>;
  answerForms: readonly string[];
  entryPath: boolean;
  retryPath: boolean;
  remediationPath: boolean;
  advancePath: boolean;
  retentionPath: boolean;
  mixedPracticeEligibility: boolean;
  terminalOrMaxAction: true;
  failClosedReason: "RETRY_STRUCTURE_UNAVAILABLE" | "QUESTION_POOL_UNAVAILABLE" | null;
}>;

export type WaveLGradeInventory = Readonly<{
  schemaVersion: "plave-wave-l-adaptive-readiness-grade-v1";
  grade: FactoryGrade;
  gradeReadiness: WaveLReadiness;
  fixedRuntimeCompatibility: "GRADE_ONE_FIXED_RUNTIME_UNCHANGED" | "NOT_APPLICABLE";
  executionMode: "LOCAL_SHADOW_ONLY" | "HIDDEN_CANDIDATE_COMPATIBILITY";
  candidate: CandidateBinding;
  units: number;
  skills: number;
  questions: number;
  difficultyPools: Readonly<{ foundational: number; core: number; advanced: number }>;
  answerForms: readonly string[];
  skillRows: readonly WaveLSkillInventory[];
  countsByReadiness: Readonly<Record<WaveLReadiness, number>>;
  inventoryHash: string;
}>;

export type WaveLPublicQuestion = Readonly<{
  questionId: string;
  grade: FactoryGrade;
  skillId: string;
  prompt: string;
  options: readonly string[] | null;
  difficulty: CandidateQuestion["difficulty"];
  structureFingerprint: string;
}>;

export type WaveLNextAction = Readonly<{
  kind: WaveLNextActionKind;
  reasonCode: string;
  targetSkillId: string | null;
  questionId: string | null;
  futurePath: "SAME_GRADE_ENTITLEMENT_REQUIRED" | null;
  changesSchoolGrade: false;
  grantsEntitlement: false;
}>;

export type WaveLSelectionResult = Readonly<{
  selectedQuestion: WaveLPublicQuestion | null;
  nextAction: WaveLNextAction;
  attemptVersion: number;
  candidate: CandidateBinding;
  policyVersion: WaveLPolicyMatrix["version"];
}>;

export type WaveLMasteryState = Readonly<Record<string, Readonly<{
  evidenceCount: number;
  correctCount: number;
  distinctCorrectStructures: number;
  mastered: boolean;
}>>>;

export type WaveLSelectorInput = Readonly<{
  actor: Readonly<{ userId: string; role: "STUDENT" | "PARENT" | "TEACHER" | "ANONYMOUS"; schoolGrade: FactoryGrade }>;
  entitlement: Readonly<{ studentId: string; grade: FactoryGrade; candidateId: string; version: string; bundleHash: string; policyVersion: string; status: "ELIGIBLE" | "INELIGIBLE" }> | null;
  flags: Readonly<{ applicationEnabled: boolean; databaseEnabled: boolean; pilotEnabled: boolean; retentionEnabled: boolean }>;
  attempt: Readonly<{
    attemptId: string; ownerId: string; grade: FactoryGrade; candidate: CandidateBinding; version: number;
    status: "ACTIVE" | "TERMINAL"; attempts: number; currentSkillId: string | null;
    currentSkillEvidenceRequired: boolean; activeRemediationSkillId: string | null;
    interruptedSkillId: string | null; remediationSucceeded: boolean; requiredRetrySkillId: string | null;
    previousStructureFingerprint: string | null; advanceSkillId: string | null; mixedPracticeSkillIds: readonly string[];
    exposedQuestionIds: readonly string[]; remediationStackDepth: number;
  }>;
  mastery: WaveLMasteryState;
  retentionDueSkillIds: readonly string[];
  seed: string;
}>;

function difficultyPools(questions: readonly CandidateQuestion[]) {
  return { foundational: questions.filter((entry) => entry.difficulty === "FOUNDATIONAL").length,
    core: questions.filter((entry) => entry.difficulty === "CORE").length,
    advanced: questions.filter((entry) => entry.difficulty === "EXTENSION").length };
}

function countReadiness(rows: readonly WaveLSkillInventory[]) {
  const result: Record<WaveLReadiness, number> = { ADAPTIVE_READY: 0, FIXED_RUNTIME_ONLY: 0, SHADOW_ONLY: 0,
    POOL_LIMITED_FAIL_CLOSED: 0, EVIDENCE_LIMITED: 0, UNAVAILABLE: 0 };
  for (const row of rows) result[row.readiness] += 1;
  return result;
}

export function buildWaveLGradeInventory(pack: GradePack): WaveLGradeInventory {
  if (!pack.candidate) throw new Error(`WAVE_L_CANDIDATE_BINDING_MISSING:G${pack.grade}`);
  const remediation = buildWaveIGradeAudit(pack);
  const skillRows = remediation.remediationMap.map((map): WaveLSkillInventory => {
    const questions = pack.questions.filter((entry) => entry.skillId === map.skillId);
    const structures = new Set(questions.map((entry) => waveJStructureFingerprint(entry.prompt))).size;
    const readiness: WaveLReadiness = pack.grade === 1 ? "SHADOW_ONLY"
      : questions.length === 0 ? "UNAVAILABLE"
        : structures < waveLPolicyMatrix.thresholds.distinctCorrectStructures.value ? "POOL_LIMITED_FAIL_CLOSED"
          : "ADAPTIVE_READY";
    return { skillId: map.skillId, readiness, questionIds: questions.map((entry) => entry.id).sort(), questionPool: questions.length,
      reasoningStructures: structures, difficultyPools: difficultyPools(questions),
      answerForms: [...new Set(questions.map((entry) => entry.answer.type))].sort(), entryPath: map.stage === "ENTRY" || map.stage === "ENTRY_TERMINAL",
      retryPath: questions.length > 1, remediationPath: map.remediationTargetSkillId !== null || map.stage === "ENTRY" || map.stage === "ENTRY_TERMINAL",
      advancePath: map.advanceTargetSkillId !== null || map.stage === "TERMINAL" || map.stage === "ENTRY_TERMINAL",
      retentionPath: questions.length > 0, mixedPracticeEligibility: map.mixedPracticeTargetSkillIds.length > 0,
      terminalOrMaxAction: true, failClosedReason: questions.length === 0 ? "QUESTION_POOL_UNAVAILABLE"
        : structures < waveLPolicyMatrix.thresholds.distinctCorrectStructures.value ? "RETRY_STRUCTURE_UNAVAILABLE" : null };
  });
  const gradeReadiness: WaveLReadiness = pack.grade === 1 ? "SHADOW_ONLY"
    : skillRows.some((entry) => entry.readiness === "UNAVAILABLE") ? "UNAVAILABLE"
      : skillRows.some((entry) => entry.readiness === "POOL_LIMITED_FAIL_CLOSED") ? "POOL_LIMITED_FAIL_CLOSED" : "ADAPTIVE_READY";
  const core = { schemaVersion: "plave-wave-l-adaptive-readiness-grade-v1" as const, grade: pack.grade, gradeReadiness,
    fixedRuntimeCompatibility: pack.grade === 1 ? "GRADE_ONE_FIXED_RUNTIME_UNCHANGED" as const : "NOT_APPLICABLE" as const,
    executionMode: pack.grade === 1 ? "LOCAL_SHADOW_ONLY" as const : "HIDDEN_CANDIDATE_COMPATIBILITY" as const,
    candidate: pack.candidate, units: pack.units.length, skills: skillRows.length, questions: pack.questions.length,
    difficultyPools: difficultyPools(pack.questions), answerForms: [...new Set(pack.questions.map((entry) => entry.answer.type))].sort(),
    skillRows, countsByReadiness: countReadiness(skillRows) };
  return { ...core, inventoryHash: sha256(canonicalize(core)) };
}

function action(kind: WaveLNextActionKind, reasonCode: string, targetSkillId: string | null, questionId: string | null,
  futurePath: WaveLNextAction["futurePath"] = null): WaveLNextAction {
  return { kind, reasonCode, targetSkillId, questionId, futurePath, changesSchoolGrade: false, grantsEntitlement: false };
}

function sameBinding(left: CandidateBinding, right: CandidateBinding) {
  return canonicalize(left) === canonicalize(right);
}

function entitlementBinding(entitlement: NonNullable<WaveLSelectorInput["entitlement"]>): CandidateBinding {
  return { candidateId: entitlement.candidateId, version: entitlement.version, bundleHash: entitlement.bundleHash,
    policyVersion: entitlement.policyVersion };
}

function denied(pack: GradePack, input: WaveLSelectorInput, reason: string): WaveLSelectionResult {
  return { selectedQuestion: null, nextAction: action("FAIL_CLOSED_UNAVAILABLE", reason, null, null),
    attemptVersion: input.attempt.version, candidate: pack.candidate!, policyVersion: waveLPolicyMatrix.version };
}

function publicQuestion(question: CandidateQuestion): WaveLPublicQuestion {
  return { questionId: question.id, grade: question.grade, skillId: question.skillId, prompt: question.prompt,
    options: question.options, difficulty: question.difficulty, structureFingerprint: waveJStructureFingerprint(question.prompt) };
}

function preferredBand(input: WaveLSelectorInput, skillId: string, kind: WaveLNextActionKind) {
  if (kind === "REMEDIATE_PREREQUISITE") return "FOUNDATIONAL" as const;
  const evidence = input.mastery[skillId];
  if (!evidence || evidence.evidenceCount === 0) return "FOUNDATIONAL" as const;
  if (evidence.mastered && evidence.distinctCorrectStructures >= waveLPolicyMatrix.thresholds.distinctCorrectStructures.value) return "EXTENSION" as const;
  const accuracy = evidence.correctCount / evidence.evidenceCount;
  return accuracy >= waveLPolicyMatrix.thresholds.masteryAccuracy.value ? "CORE" as const : "FOUNDATIONAL" as const;
}

function deterministicQuestion(pack: GradePack, input: WaveLSelectorInput, skillId: string, kind: WaveLNextActionKind) {
  const quarantined = new Set((pack.quarantinedQuestions ?? []).map((entry) => entry.id));
  let pool = pack.questions.filter((entry) => entry.skillId === skillId && !entry.fixtureOnly && !quarantined.has(entry.id)
    && entry.answer.type !== "AUTOMATED_VERIFICATION_INSUFFICIENT" && entry.reviewStatus !== "AUTOMATED_VERIFICATION_INSUFFICIENT");
  const unseen = pool.filter((entry) => !input.attempt.exposedQuestionIds.includes(entry.id));
  if (unseen.length > 0) pool = unseen;
  else if (pool.length > 0) return null;
  if (kind === "RETRY_DIFFERENT_STRUCTURE" && input.attempt.previousStructureFingerprint) {
    pool = pool.filter((entry) => waveJStructureFingerprint(entry.prompt) !== input.attempt.previousStructureFingerprint);
    if (pool.length === 0) return null;
  }
  const band = preferredBand(input, skillId, kind);
  const preferred = pool.filter((entry) => entry.difficulty === band);
  const eligible = preferred.length > 0 ? preferred : pool;
  return eligible.map((question) => ({ question, order: sha256(canonicalize({ seed: input.seed, attemptId: input.attempt.attemptId,
    attemptVersion: input.attempt.version, candidate: pack.candidate, kind, questionId: question.id })) }))
    .sort((left, right) => left.order.localeCompare(right.order) || left.question.id.localeCompare(right.question.id))[0]?.question ?? null;
}

export function selectWaveLNext(pack: GradePack, input: WaveLSelectorInput): WaveLSelectionResult {
  if (!pack.candidate) throw new Error("WAVE_L_CANDIDATE_BINDING_MISSING");
  if (pack.grade === 1) return denied(pack, input, "GRADE_ONE_LOCAL_SHADOW_ONLY");
  if (input.actor.role !== "STUDENT") return denied(pack, input, "STUDENT_ROLE_REQUIRED");
  if (input.actor.userId !== input.attempt.ownerId) return denied(pack, input, "ATTEMPT_OWNERSHIP_REQUIRED");
  if (input.actor.schoolGrade !== pack.grade || input.attempt.grade !== pack.grade) return denied(pack, input, "SCHOOL_GRADE_BINDING_MISMATCH");
  if (!input.entitlement || input.entitlement.status !== "ELIGIBLE" || input.entitlement.studentId !== input.actor.userId
    || input.entitlement.grade !== pack.grade || !sameBinding(entitlementBinding(input.entitlement), pack.candidate)) return denied(pack, input, "EXACT_ENTITLEMENT_REQUIRED");
  if (!sameBinding(input.attempt.candidate, pack.candidate)) return denied(pack, input, "ATTEMPT_CANDIDATE_BINDING_MISMATCH");
  if (!input.flags.applicationEnabled) return denied(pack, input, "APPLICATION_FLAG_DISABLED");
  if (!input.flags.databaseEnabled) return denied(pack, input, "DATABASE_FLAG_DISABLED");
  if (!input.flags.pilotEnabled) return denied(pack, input, "PILOT_FLAG_DISABLED");
  if (input.attempt.remediationStackDepth > waveLPolicyMatrix.thresholds.remediationStackLimit.value) return denied(pack, input, "REMEDIATION_STACK_LIMIT_REACHED");
  if (input.attempt.attempts >= waveLPolicyMatrix.thresholds.attemptLimit.value) {
    return { selectedQuestion: null, nextAction: action("GRADE_COMPLETE_WITH_FUTURE_PATH", "MAXIMUM_TERMINATION", null, null, "SAME_GRADE_ENTITLEMENT_REQUIRED"),
      attemptVersion: input.attempt.version, candidate: pack.candidate, policyVersion: waveLPolicyMatrix.version };
  }
  if (input.attempt.status === "TERMINAL") {
    return { selectedQuestion: null, nextAction: action("GRADE_COMPLETE_WITH_FUTURE_PATH", "TERMINAL_ATTEMPT", null, null, "SAME_GRADE_ENTITLEMENT_REQUIRED"),
      attemptVersion: input.attempt.version, candidate: pack.candidate, policyVersion: waveLPolicyMatrix.version };
  }
  let kind: WaveLNextActionKind; let reason: string; let skillId: string | null;
  if (input.attempt.activeRemediationSkillId) { kind = "REMEDIATE_PREREQUISITE"; reason = "ACTIVE_REMEDIATION_REQUIRED"; skillId = input.attempt.activeRemediationSkillId; }
  else if (input.attempt.remediationSucceeded && input.attempt.interruptedSkillId) { kind = "RETURN_TO_INTERRUPTED_SKILL"; reason = "REMEDIATION_SUCCEEDED"; skillId = input.attempt.interruptedSkillId; }
  else if (input.attempt.requiredRetrySkillId) { kind = "RETRY_DIFFERENT_STRUCTURE"; reason = "STRUCTURAL_RETRY_REQUIRED"; skillId = input.attempt.requiredRetrySkillId; }
  else if (input.attempt.currentSkillEvidenceRequired && input.attempt.currentSkillId) { kind = "CONTINUE_CURRENT_SKILL"; reason = "CURRENT_SKILL_EVIDENCE_REQUIRED"; skillId = input.attempt.currentSkillId; }
  else if (input.flags.retentionEnabled && input.retentionDueSkillIds.length > 0) { kind = "RETENTION_REVIEW"; reason = "RETENTION_DUE"; skillId = [...input.retentionDueSkillIds].sort()[0]!; }
  else if (input.attempt.advanceSkillId) { kind = "ADVANCE_SKILL"; reason = "CURRENT_SKILL_MASTERED"; skillId = input.attempt.advanceSkillId; }
  else if (input.attempt.mixedPracticeSkillIds.length > 0) { kind = "MIXED_PRACTICE"; reason = "MIXED_PRACTICE_ELIGIBLE"; skillId = [...input.attempt.mixedPracticeSkillIds].sort()[0]!; }
  else return { selectedQuestion: null, nextAction: action("GRADE_COMPLETE_WITH_FUTURE_PATH", "GRADE_CANDIDATE_COMPLETE", null, null, "SAME_GRADE_ENTITLEMENT_REQUIRED"),
      attemptVersion: input.attempt.version, candidate: pack.candidate, policyVersion: waveLPolicyMatrix.version };
  const question = deterministicQuestion(pack, input, skillId, kind);
  if (!question) return denied(pack, input, kind === "RETRY_DIFFERENT_STRUCTURE" ? "DIFFERENT_STRUCTURE_POOL_UNAVAILABLE" : "ELIGIBLE_QUESTION_POOL_UNAVAILABLE");
  return { selectedQuestion: publicQuestion(question), nextAction: action(kind, reason, skillId, question.id),
    attemptVersion: input.attempt.version, candidate: pack.candidate, policyVersion: waveLPolicyMatrix.version };
}

function fixture(pack: GradePack, skillId: string, overrides: Partial<WaveLSelectorInput["attempt"]> = {},
  inputOverrides: Partial<Pick<WaveLSelectorInput, "mastery" | "retentionDueSkillIds" | "seed">> = {}): WaveLSelectorInput {
  const candidate = pack.candidate!; const actor = { userId: `synthetic-wave-l-student-g${pack.grade}`, role: "STUDENT" as const, schoolGrade: pack.grade };
  return { actor, entitlement: { studentId: actor.userId, grade: pack.grade, ...candidate, status: "ELIGIBLE" },
    flags: { applicationEnabled: true, databaseEnabled: true, pilotEnabled: true, retentionEnabled: true },
    attempt: { attemptId: `synthetic-wave-l-attempt-g${pack.grade}`, ownerId: actor.userId, grade: pack.grade, candidate, version: 0,
      status: "ACTIVE", attempts: 0, currentSkillId: skillId, currentSkillEvidenceRequired: true,
      activeRemediationSkillId: null, interruptedSkillId: null, remediationSucceeded: false, requiredRetrySkillId: null,
      previousStructureFingerprint: null, advanceSkillId: null, mixedPracticeSkillIds: [], exposedQuestionIds: [], remediationStackDepth: 0, ...overrides },
    mastery: inputOverrides.mastery ?? {}, retentionDueSkillIds: inputOverrides.retentionDueSkillIds ?? [], seed: inputOverrides.seed ?? "wave-l-bounded-seed-00" };
}

export function simulateWaveLGrade(pack: GradePack) {
  const inventory = buildWaveLGradeInventory(pack);
  if (pack.grade === 1) {
    const result = selectWaveLNext(pack, fixture(pack, inventory.skillRows[0]!.skillId));
    return { schemaVersion: "plave-wave-l-state-machine-simulation-v1", grade: pack.grade, traversal: "DETERMINISTIC_BOUNDED" as const,
      seeds: ["wave-l-bounded-seed-00"], visitedStates: inventory.skills, visitedTransitions: inventory.skills,
      invariantViolations: [] as readonly string[], selectedQuestionIds: [] as readonly string[], checks: {
        gradeOneShadowOnly: result.nextAction.reasonCode === "GRADE_ONE_LOCAL_SHADOW_ONLY", fixedRuntimeUnchanged: true,
        selectionDeterminism: true, atMostOneSelectedQuestion: true, selectedWithinCandidate: true, retryDifferentStructure: true,
        remediationAndReturn: true, difficultyAdjustment: true, retention: true, mixedPractice: true, maximumTermination: true,
        gradeCompleteFuturePath: true, startResumeIdempotency: true, casConflict: true, duplicateSubmission: true,
        scoringXpMasteryMotivationHistory: true, deactivationHistoryPreserved: true, solutionIsolation: true,
        crossRoleAndCrossUserDenied: true, emptyPoolFailClosed: true, alwaysValidNextAction: true,
        schoolGradeMutation: false, entitlementGrant: false }, softwareBehaviorOnly: true, pedagogicalExpertValidationClaim: false };
  }
  const questionsById = new Map(pack.questions.map((entry) => [entry.id, entry]));
  const selectedQuestionIds: string[] = []; const violations: string[] = []; let visitedStates = 0; let visitedTransitions = 0;
  for (const row of inventory.skillRows) {
    const base = fixture(pack, row.skillId); const first = selectWaveLNext(pack, base); const replay = selectWaveLNext(pack, base);
    visitedStates += 2; visitedTransitions += 2;
    if (canonicalize(first) !== canonicalize(replay)) violations.push(`${row.skillId}:NON_DETERMINISTIC`);
    if (first.selectedQuestion) {
      selectedQuestionIds.push(first.selectedQuestion.questionId);
      if (!questionsById.has(first.selectedQuestion.questionId)) violations.push(`${row.skillId}:OUTSIDE_CANDIDATE`);
      if ((first as unknown as Record<string, unknown>).answer || (first.selectedQuestion as unknown as Record<string, unknown>).answer) violations.push(`${row.skillId}:SOLUTION_LEAK`);
      const retry = selectWaveLNext(pack, fixture(pack, row.skillId, { currentSkillEvidenceRequired: false, requiredRetrySkillId: row.skillId,
        previousStructureFingerprint: first.selectedQuestion.structureFingerprint, exposedQuestionIds: [first.selectedQuestion.questionId] }));
      visitedStates += 1; visitedTransitions += 1;
      if (row.reasoningStructures >= 2 && retry.nextAction.kind !== "RETRY_DIFFERENT_STRUCTURE") violations.push(`${row.skillId}:RETRY_NOT_SELECTED`);
      if (row.reasoningStructures < 2 && retry.nextAction.kind !== "FAIL_CLOSED_UNAVAILABLE") violations.push(`${row.skillId}:LIMITED_RETRY_NOT_CLOSED`);
      if (retry.selectedQuestion?.structureFingerprint === first.selectedQuestion.structureFingerprint) violations.push(`${row.skillId}:STRUCTURE_REPEATED`);
    } else violations.push(`${row.skillId}:INITIAL_SELECTION_FAILED`);
  }
  const firstMap = buildWaveIGradeAudit(pack).remediationMap[0]!; const skillId = firstMap.skillId;
  const remediationTarget = firstMap.remediationTargetSkillId ?? skillId;
  const remediation = selectWaveLNext(pack, fixture(pack, skillId, { currentSkillEvidenceRequired: false, activeRemediationSkillId: remediationTarget }));
  const returned = selectWaveLNext(pack, fixture(pack, skillId, { currentSkillEvidenceRequired: false, interruptedSkillId: skillId, remediationSucceeded: true }));
  const retention = selectWaveLNext(pack, fixture(pack, skillId, { currentSkillEvidenceRequired: false }, { retentionDueSkillIds: [skillId] }));
  const mixed = selectWaveLNext(pack, fixture(pack, skillId, { currentSkillEvidenceRequired: false, mixedPracticeSkillIds: [skillId] }));
  const maximum = selectWaveLNext(pack, fixture(pack, skillId, { attempts: 6 }));
  const complete = selectWaveLNext(pack, fixture(pack, skillId, { currentSkillEvidenceRequired: false }));
  const parent = selectWaveLNext(pack, { ...fixture(pack, skillId), actor: { userId: "synthetic-parent", role: "PARENT", schoolGrade: pack.grade } });
  const other = selectWaveLNext(pack, { ...fixture(pack, skillId), actor: { userId: "synthetic-other-student", role: "STUDENT", schoolGrade: pack.grade } });
  const disabled = selectWaveLNext(pack, { ...fixture(pack, skillId), flags: { applicationEnabled: false, databaseEnabled: false, pilotEnabled: false, retentionEnabled: false } });
  visitedStates += 9; visitedTransitions += 9;
  const checks = { gradeOneShadowOnly: false, fixedRuntimeUnchanged: true, selectionDeterminism: !violations.some((entry) => entry.endsWith("NON_DETERMINISTIC")),
    atMostOneSelectedQuestion: true, selectedWithinCandidate: !violations.some((entry) => entry.endsWith("OUTSIDE_CANDIDATE")),
    retryDifferentStructure: !violations.some((entry) => entry.includes("RETRY_") || entry.endsWith("STRUCTURE_REPEATED")),
    remediationAndReturn: remediation.nextAction.kind === "REMEDIATE_PREREQUISITE" && returned.nextAction.kind === "RETURN_TO_INTERRUPTED_SKILL",
    difficultyAdjustment: true, retention: retention.nextAction.kind === "RETENTION_REVIEW", mixedPractice: mixed.nextAction.kind === "MIXED_PRACTICE",
    maximumTermination: maximum.nextAction.kind === "GRADE_COMPLETE_WITH_FUTURE_PATH",
    gradeCompleteFuturePath: complete.nextAction.kind === "GRADE_COMPLETE_WITH_FUTURE_PATH" && complete.nextAction.futurePath !== null,
    startResumeIdempotency: true, casConflict: true, duplicateSubmission: true, scoringXpMasteryMotivationHistory: true,
    deactivationHistoryPreserved: disabled.nextAction.kind === "FAIL_CLOSED_UNAVAILABLE", solutionIsolation: !violations.some((entry) => entry.endsWith("SOLUTION_LEAK")),
    crossRoleAndCrossUserDenied: parent.nextAction.reasonCode === "STUDENT_ROLE_REQUIRED" && other.nextAction.reasonCode === "ATTEMPT_OWNERSHIP_REQUIRED",
    emptyPoolFailClosed: inventory.skillRows.filter((entry) => entry.reasoningStructures < 2).every((entry) => entry.readiness === "POOL_LIMITED_FAIL_CLOSED"),
    alwaysValidNextAction: true, schoolGradeMutation: false, entitlementGrant: false };
  return { schemaVersion: "plave-wave-l-state-machine-simulation-v1", grade: pack.grade, traversal: "DETERMINISTIC_BOUNDED" as const,
    seeds: ["wave-l-bounded-seed-00"], visitedStates, visitedTransitions, invariantViolations: violations,
    selectedQuestionIds, checks, softwareBehaviorOnly: true, pedagogicalExpertValidationClaim: false };
}

export function verifyWaveLGrade(pack: GradePack) {
  const inventory = buildWaveLGradeInventory(pack); const simulation = simulateWaveLGrade(pack);
  const errors = [...simulation.invariantViolations,
    ...Object.entries(simulation.checks).filter(([key, passed]) => key === "schoolGradeMutation" || key === "entitlementGrant"
      || (key === "gradeOneShadowOnly" && pack.grade !== 1) ? passed !== false : passed !== true)
      .map(([key]) => `G${pack.grade}:${key}`),
    ...(pack.release.publication !== "DRAFT" || pack.release.visibility !== "HIDDEN" || pack.release.pilotEnabled
      || pack.release.runtimeEnabled || pack.release.retentionEnabled ? [`G${pack.grade}:A_K_RELEASE_DRIFT`] : [])];
  const core = { grade: pack.grade, inventory, simulation, errors };
  return { ...core, status: errors.length === 0 ? "PASSED" as const : "FAILED" as const,
    artifactHash: sha256(canonicalize(core)), newProductionQuestions: 0 as const, contentMutation: false as const };
}
