/**
 * Competency and learning-path policy V1.
 *
 * This is a pure domain module. It does not read the database, call Supabase,
 * invoke UI code, or make a pedagogical diagnosis. Thresholds and weights are
 * PRODUCT_HYPOTHESIS values and must be versioned when changed.
 */

export const COMPETENCY_POLICY_VERSION = "competency-v1-product-hypothesis" as const;
export const LEARNING_PATH_POLICY_VERSION = "learning-path-v1-product-hypothesis" as const;

export type CompetencyConfidence = "LOW" | "MEDIUM" | "HIGH";
export type CompetencyStatus =
  | "NOT_STARTED"
  | "DEVELOPING"
  | "BASIC"
  | "PROFICIENT"
  | "SECURE";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type CompetencyEvidence = Readonly<{
  evidenceId: string;
  skillId: string;
  schoolGrade: number;
  submittedAt: string;
  correct: boolean;
  difficulty: Difficulty;
  hintUsed: boolean;
  retentionCheck: boolean;
  accepted: boolean;
  duplicate: boolean;
  casConflict: boolean;
}>;

export type CompetencyEvidenceSummary = Readonly<{
  skillId: string;
  schoolGrade: number;
  evidenceCount: number;
  correctCount: number;
  lastPracticedAt: string | null;
  hintDataAvailable: false;
  difficultyDataAvailable: false;
  retentionDataAvailable: false;
}>;

export type SkillCompetency = Readonly<{
  skillId: string;
  displayName?: string;
  schoolGrade: number;
  masteryScore: number;
  confidence: CompetencyConfidence;
  evidenceCount: number;
  lastPracticedAt: string | null;
  retentionDueAt: string | null;
  status: CompetencyStatus;
  policyVersion: typeof COMPETENCY_POLICY_VERSION;
  explanation: string;
}>;

export type LearningPathCandidate = Readonly<{
  candidateId: string;
  skillId: string;
  schoolGrade: number;
  title: string;
  curriculumOrder: number;
  sequenceRelevance: number;
  unfinishedEngagement: number;
  active: boolean;
  visible: boolean;
  pilotOnly: boolean;
  prerequisiteSkillIds: readonly string[];
}>;

export type LearningPathReasonCode =
  | "PREREQUISITE_GAP"
  | "LOW_MASTERY"
  | "CURRICULUM_NEXT"
  | "RETENTION_DUE"
  | "CONTINUE_IN_PROGRESS"
  | "NO_EVIDENCE";

export type LearningPathRecommendation = Readonly<{
  policyVersion: typeof LEARNING_PATH_POLICY_VERSION;
  candidateId: string;
  skillId: string;
  schoolGrade: number;
  title: string;
  score: number;
  reasonCodes: readonly LearningPathReasonCode[];
  explanation: string;
}>;

export const competencyHypotheses = {
  correctnessWeight: 0.5,
  independenceWeight: 0.15,
  consistencyWeight: 0.15,
  recencyWeight: 0.1,
  retentionWeight: 0.1,
  developingBelow: 50,
  basicBelow: 70,
  proficientBelow: 85,
  mediumConfidenceEvidence: 3,
  highConfidenceEvidence: 8,
  retentionWindowDays: 21,
} as const;

export const learningPathWeights = {
  prerequisiteGap: 0.35,
  lowMastery: 0.3,
  sequenceRelevance: 0.15,
  forgettingRisk: 0.1,
  unfinishedEngagement: 0.1,
} as const;

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function daysSince(timestamp: string | null, now: Date) {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, (now.getTime() - parsed) / 86_400_000);
}

function difficultyWeight(difficulty: Difficulty) {
  return difficulty === "EASY" ? 0.8 : difficulty === "HARD" ? 1.2 : 1;
}

function statusFor(score: number, evidenceCount: number): CompetencyStatus {
  if (evidenceCount === 0) return "NOT_STARTED";
  if (score < competencyHypotheses.developingBelow) return "DEVELOPING";
  if (score < competencyHypotheses.basicBelow) return "BASIC";
  if (score < competencyHypotheses.proficientBelow) return "PROFICIENT";
  return "SECURE";
}

function confidenceFor(evidenceCount: number): CompetencyConfidence {
  if (evidenceCount >= competencyHypotheses.highConfidenceEvidence) return "HIGH";
  if (evidenceCount >= competencyHypotheses.mediumConfidenceEvidence) return "MEDIUM";
  return "LOW";
}

function acceptedEvidence(evidence: readonly CompetencyEvidence[]) {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    if (!item.accepted || item.duplicate || item.casConflict || seen.has(item.evidenceId)) return false;
    seen.add(item.evidenceId);
    return true;
  });
}

export function computeSkillCompetency(input: Readonly<{
  skillId: string;
  schoolGrade: number;
  evidence: readonly CompetencyEvidence[];
  now: Date;
}>): SkillCompetency {
  const evidence = acceptedEvidence(
    input.evidence.filter(
      (item) => item.skillId === input.skillId && item.schoolGrade === input.schoolGrade,
    ),
  ).sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
  const evidenceCount = evidence.length;
  const lastPracticedAt = evidence.at(-1)?.submittedAt ?? null;
  const mostRecentDays = daysSince(lastPracticedAt, input.now);
  const correctness = evidenceCount
    ? clamp(
        (evidence.reduce(
          (sum, item) => sum + (item.correct ? difficultyWeight(item.difficulty) : 0),
          0,
        ) /
          evidence.reduce((sum, item) => sum + difficultyWeight(item.difficulty), 0)) *
          100,
      )
    : 0;
  const independence = evidenceCount
    ? (evidence.filter((item) => !item.hintUsed).length / evidenceCount) * 100
    : 0;
  const consistency = evidenceCount
    ? Math.max(
        evidence.filter((item) => item.correct).length / evidenceCount,
        1 - evidence.filter((item) => item.correct).length / evidenceCount,
      ) * 100
    : 0;
  const recency = mostRecentDays === null ? 0 : clamp(100 * Math.exp(-mostRecentDays / 30));
  const retentionChecks = evidence.filter((item) => item.retentionCheck);
  const retention = retentionChecks.length
    ? (retentionChecks.filter((item) => item.correct).length / retentionChecks.length) * 100
    : 0;
  const masteryScore = Math.round(
    clamp(
      correctness * competencyHypotheses.correctnessWeight +
        independence * competencyHypotheses.independenceWeight +
        consistency * competencyHypotheses.consistencyWeight +
        recency * competencyHypotheses.recencyWeight +
        retention * competencyHypotheses.retentionWeight,
    ),
  );
  const status = statusFor(masteryScore, evidenceCount);
  const confidence = confidenceFor(evidenceCount);
  const retentionDueAt = lastPracticedAt
    ? new Date(
        Date.parse(lastPracticedAt) + competencyHypotheses.retentionWindowDays * 86_400_000,
      ).toISOString()
    : null;
  return {
    skillId: input.skillId,
    schoolGrade: input.schoolGrade,
    masteryScore,
    confidence,
    evidenceCount,
    lastPracticedAt,
    retentionDueAt,
    status,
    policyVersion: COMPETENCY_POLICY_VERSION,
    explanation:
      evidenceCount === 0
        ? "Chưa có đủ bằng chứng trả lời để ước tính năng lực; đây là PRODUCT_HYPOTHESIS, không phải chẩn đoán sư phạm."
        : `Điểm tạm tính ${masteryScore}/100 từ ${evidenceCount} bằng chứng; độ tin cậy ${confidence}. Đây là PRODUCT_HYPOTHESIS, không phải chẩn đoán sư phạm.`,
  };
}

export function computeSkillCompetencyFromSummary(
  input: Readonly<{
    summary: CompetencyEvidenceSummary;
    now: Date;
  }>,
): SkillCompetency {
  const { summary } = input;
  const count = Math.max(0, Math.floor(summary.evidenceCount));
  const correct = Math.max(0, Math.min(count, Math.floor(summary.correctCount)));
  const recency = daysSince(summary.lastPracticedAt, input.now);
  const correctness = count ? (correct / count) * 100 : 0;
  const recencyScore = recency === null ? 0 : clamp(100 * Math.exp(-recency / 30));
  const availableWeight = competencyHypotheses.correctnessWeight + competencyHypotheses.recencyWeight;
  const masteryScore = Math.round(
    clamp(
      (correctness * competencyHypotheses.correctnessWeight +
        recencyScore * competencyHypotheses.recencyWeight) /
        availableWeight,
    ),
  );
  const confidence = confidenceFor(count);
  const status = statusFor(masteryScore, count);
  const retentionDueAt = summary.lastPracticedAt
    ? new Date(
        Date.parse(summary.lastPracticedAt) + competencyHypotheses.retentionWindowDays * 86_400_000,
      ).toISOString()
    : null;
  return {
    skillId: summary.skillId,
    schoolGrade: summary.schoolGrade,
    masteryScore,
    confidence,
    evidenceCount: count,
    lastPracticedAt: summary.lastPracticedAt,
    retentionDueAt,
    status,
    policyVersion: COMPETENCY_POLICY_VERSION,
    explanation:
      count === 0
        ? "Chưa đủ dữ liệu để ước tính; hint, difficulty độc lập và retention hiện chưa có dữ liệu."
        : `Ước tính ${masteryScore}/100 từ ${count} bằng chứng hoạt động học; hint, difficulty độc lập và retention hiện chưa có dữ liệu. Đây không phải chẩn đoán sư phạm.`,
  };
}

function forgettingRisk(competency: SkillCompetency, now: Date) {
  const due = daysSince(competency.retentionDueAt, now);
  return due === null ? 0 : clamp(due * 10);
}

export function recommendNextLearningPath(input: Readonly<{
  schoolGrade: number;
  competencies: readonly SkillCompetency[];
  candidates: readonly LearningPathCandidate[];
  now: Date;
  adaptivePilotEnabled: boolean;
}>): LearningPathRecommendation | null {
  const bySkill = new Map(input.competencies.map((item) => [item.skillId, item]));
  const eligible = input.candidates.filter((candidate) => {
    if (candidate.schoolGrade !== input.schoolGrade || !candidate.active || !candidate.visible) return false;
    if (candidate.pilotOnly && !input.adaptivePilotEnabled) return false;
    return candidate.prerequisiteSkillIds.every(
      (id) => bySkill.get(id)?.status === "SECURE",
    );
  });
  if (!eligible.length) return null;
  const ranked = eligible.map((candidate) => {
    const competency = bySkill.get(candidate.skillId);
    const mastery = competency?.masteryScore ?? 0;
    const prerequisiteGap = candidate.prerequisiteSkillIds.length
      ? candidate.prerequisiteSkillIds.reduce(
          (sum, id) => sum + (100 - (bySkill.get(id)?.masteryScore ?? 0)),
          0,
        ) / candidate.prerequisiteSkillIds.length
      : 0;
    const score = Math.round(
      prerequisiteGap * learningPathWeights.prerequisiteGap +
        (100 - mastery) * learningPathWeights.lowMastery +
        clamp(candidate.sequenceRelevance) * learningPathWeights.sequenceRelevance +
        forgettingRisk(competency ?? computeSkillCompetency({ skillId: candidate.skillId, schoolGrade: input.schoolGrade, evidence: [], now: input.now }), input.now) * learningPathWeights.forgettingRisk +
        clamp(candidate.unfinishedEngagement) * learningPathWeights.unfinishedEngagement,
    );
    const reasonCodes: LearningPathReasonCode[] = [];
    if (prerequisiteGap > 0) reasonCodes.push("PREREQUISITE_GAP");
    if (!competency || competency.evidenceCount === 0) reasonCodes.push("NO_EVIDENCE");
    if (mastery < competencyHypotheses.basicBelow) reasonCodes.push("LOW_MASTERY");
    if (forgettingRisk(competency ?? computeSkillCompetency({ skillId: candidate.skillId, schoolGrade: input.schoolGrade, evidence: [], now: input.now }), input.now) > 0) reasonCodes.push("RETENTION_DUE");
    if (candidate.unfinishedEngagement > 0) reasonCodes.push("CONTINUE_IN_PROGRESS");
    if (candidate.sequenceRelevance > 0) reasonCodes.push("CURRICULUM_NEXT");
    const primary = reasonCodes[0] ?? "CURRICULUM_NEXT";
    const explanation = primary === "NO_EVIDENCE"
      ? `Nên học “${candidate.title}” vì em chưa có bằng chứng cho kỹ năng này trong lớp ${input.schoolGrade}.`
      : `Nên học “${candidate.title}” vì kỹ năng hiện ở mức ${mastery}%, bằng chứng gần đây còn cần củng cố và nội dung này thuộc lộ trình lớp ${input.schoolGrade}.`;
    return { policyVersion: LEARNING_PATH_POLICY_VERSION, candidateId: candidate.candidateId, skillId: candidate.skillId, schoolGrade: input.schoolGrade, title: candidate.title, score, reasonCodes, explanation };
  });
  return ranked.sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId))[0] ?? null;
}
