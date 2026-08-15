export type ParentUniversalMastery =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "NEEDS_PRACTICE"
  | "DEVELOPING"
  | "PROFICIENT"
  | "MASTERED";

export type ParentUniversalEvidence = {
  title: string;
  evidenceCount: number;
  correctCount: number;
  accuracyPercent: number | null;
  masteryLabel?: ParentUniversalMastery;
  lastActivityAt?: string | null;
  source: string;
};

export type ParentUniversalUnit = ParentUniversalEvidence & {
  unitId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

export type ParentUniversalAttempt = {
  attemptId: string;
  unitTitle: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  source: "LEGACY_GRADE1" | "UNIVERSAL_CURRICULUM";
};

export type ParentUniversalProgress = {
  student: { displayName: string; grade: number };
  compatibilityMode:
    | "LEGACY_GRADE1_AGGREGATED"
    | "UNIVERSAL_CURRICULUM";
  masteryPolicyVersion: string;
  masteryExplanation: string;
  summary: {
    attemptCount: number;
    completedAttemptCount: number;
    startedUnitCount: number;
    completedUnitCount: number;
    totalAnswered: number;
    totalCorrect: number;
    accuracyPercent: number | null;
    lastActivityAt: string | null;
    masteryLabel: ParentUniversalMastery;
  };
  units: ParentUniversalUnit[];
  outcomes: ParentUniversalEvidence[];
  skills: ParentUniversalEvidence[];
  attempts: ParentUniversalAttempt[];
  strengths: ParentUniversalEvidence[];
  needsPractice: ParentUniversalEvidence[];
  assignmentSummary: {
    attemptCount: number;
    completedCount: number;
    answeredCount: number;
    correctCount: number;
    accuracyPercent: number | null;
    lastActivityAt: string | null;
    evidenceSource: "TEACHER_ASSIGNMENT";
  };
  assignmentOutcomes: ParentUniversalEvidence[];
  assignmentSkills: ParentUniversalEvidence[];
};

export type ParentGeneratedCurriculumProgress = {
  grade: number;
  combinedSummary: ParentUniversalProgress["summary"];
  gradeOneGenerated: {
    units: ParentUniversalUnit[];
    outcomes: ParentUniversalEvidence[];
    skills: ParentUniversalEvidence[];
    attempts: ParentUniversalAttempt[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isOptionalTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isMastery(value: unknown): value is ParentUniversalMastery {
  return [
    "NOT_STARTED",
    "IN_PROGRESS",
    "NEEDS_PRACTICE",
    "DEVELOPING",
    "PROFICIENT",
    "MASTERED",
  ].includes(String(value));
}

function parseEvidence(
  value: unknown,
  requireMastery: boolean,
): ParentUniversalEvidence | null {
  if (
    !isRecord(value) ||
    typeof value.title !== "string" ||
    value.title.trim().length < 2 ||
    !isCount(value.evidence_count) ||
    !isCount(value.correct_count) ||
    value.correct_count > value.evidence_count ||
    !(
      value.accuracy_percent === null ||
      isPercent(value.accuracy_percent)
    ) ||
    typeof value.source !== "string" ||
    (requireMastery && !isMastery(value.mastery_label)) ||
    !(
      value.last_activity_at === undefined ||
      isOptionalTimestamp(value.last_activity_at)
    )
  ) {
    return null;
  }
  return {
    title: value.title,
    evidenceCount: value.evidence_count,
    correctCount: value.correct_count,
    accuracyPercent: value.accuracy_percent,
    ...(isMastery(value.mastery_label)
      ? { masteryLabel: value.mastery_label }
      : {}),
    ...(value.last_activity_at !== undefined
      ? { lastActivityAt: value.last_activity_at as string | null }
      : {}),
    source: value.source,
  };
}

function parseEvidenceList(
  value: unknown,
  requireMastery: boolean,
): ParentUniversalEvidence[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((item) => parseEvidence(item, requireMastery));
  return parsed.every(
    (item): item is ParentUniversalEvidence => item !== null,
  )
    ? parsed
    : null;
}

function parseUnits(value: unknown): ParentUniversalUnit[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((item) => {
    const evidence = parseEvidence(item, true);
    if (
      !evidence ||
      !isRecord(item) ||
      typeof item.unit_id !== "string" ||
      !["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(
        String(item.status),
      )
    ) {
      return null;
    }
    return {
      ...evidence,
      unitId: item.unit_id,
      status: item.status as ParentUniversalUnit["status"],
    };
  });
  return parsed.every(
    (item): item is ParentUniversalUnit => item !== null,
  )
    ? parsed
    : null;
}

function parseAttempts(value: unknown): ParentUniversalAttempt[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.attempt_id !== "string" ||
      typeof item.unit_title !== "string" ||
      !["IN_PROGRESS", "COMPLETED", "ABANDONED"].includes(
        String(item.status),
      ) ||
      !isCount(item.answered_count) ||
      !isCount(item.correct_count) ||
      !isCount(item.total_questions) ||
      item.total_questions < 1 ||
      !isTimestamp(item.started_at) ||
      !isOptionalTimestamp(item.completed_at) ||
      !["LEGACY_GRADE1", "UNIVERSAL_CURRICULUM"].includes(
        String(item.source),
      )
    ) {
      return null;
    }
    return {
      attemptId: item.attempt_id,
      unitTitle: item.unit_title,
      status: item.status as ParentUniversalAttempt["status"],
      answeredCount: item.answered_count,
      correctCount: item.correct_count,
      totalQuestions: item.total_questions,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      source: item.source as ParentUniversalAttempt["source"],
    };
  });
  return parsed.every(
    (item): item is ParentUniversalAttempt => item !== null,
  )
    ? parsed
    : null;
}

export function parseParentGeneratedCurriculumProgress(
  value: unknown,
): ParentGeneratedCurriculumProgress | null {
  if (
    !isRecord(value) ||
    !isCount(value.grade) ||
    value.grade < 1 ||
    value.grade > 9 ||
    !isRecord(value.combined_summary) ||
    !isRecord(value.grade_one_generated)
  ) {
    return null;
  }
  const summary = value.combined_summary;
  const units = parseUnits(value.grade_one_generated.units);
  const outcomes = parseEvidenceList(
    value.grade_one_generated.outcomes,
    true,
  );
  const skills = parseEvidenceList(value.grade_one_generated.skills, true);
  const attempts = parseAttempts(value.grade_one_generated.attempts);
  if (
    !units ||
    !outcomes ||
    !skills ||
    !attempts ||
    ![
      summary.attempt_count,
      summary.completed_attempt_count,
      summary.started_unit_count,
      summary.completed_unit_count,
      summary.total_answered,
      summary.total_correct,
    ].every(isCount) ||
    !(
      summary.accuracy_percent === null ||
      isPercent(summary.accuracy_percent)
    ) ||
    !isOptionalTimestamp(summary.last_activity_at) ||
    !isMastery(summary.mastery_label)
  ) {
    return null;
  }
  return {
    grade: value.grade,
    combinedSummary: {
      attemptCount: summary.attempt_count as number,
      completedAttemptCount: summary.completed_attempt_count as number,
      startedUnitCount: summary.started_unit_count as number,
      completedUnitCount: summary.completed_unit_count as number,
      totalAnswered: summary.total_answered as number,
      totalCorrect: summary.total_correct as number,
      accuracyPercent: summary.accuracy_percent,
      lastActivityAt: summary.last_activity_at,
      masteryLabel: summary.mastery_label,
    },
    gradeOneGenerated: {
      units,
      outcomes,
      skills,
      attempts,
    },
  };
}

export function mergeParentGeneratedCurriculumProgress(
  progress: ParentUniversalProgress,
  generated: ParentGeneratedCurriculumProgress,
): ParentUniversalProgress | null {
  if (generated.grade !== progress.student.grade) return null;
  if (generated.grade !== 1) {
    return {
      ...progress,
      summary: generated.combinedSummary,
    };
  }
  const outcomes = [
    ...progress.outcomes,
    ...generated.gradeOneGenerated.outcomes,
  ];
  const skills = [
    ...progress.skills,
    ...generated.gradeOneGenerated.skills,
  ];
  return {
    ...progress,
    summary: generated.combinedSummary,
    units: [...progress.units, ...generated.gradeOneGenerated.units],
    outcomes,
    skills,
    attempts: [
      ...progress.attempts,
      ...generated.gradeOneGenerated.attempts,
    ]
      .sort(
        (left, right) =>
          Date.parse(right.startedAt) - Date.parse(left.startedAt),
      )
      .slice(0, 50),
    strengths: [...outcomes, ...skills].filter(
      (item) =>
        item.masteryLabel === "PROFICIENT" ||
        item.masteryLabel === "MASTERED",
    ),
    needsPractice: [...outcomes, ...skills].filter(
      (item) => item.masteryLabel === "NEEDS_PRACTICE",
    ),
  };
}

export function parseParentUniversalProgress(
  value: unknown,
): ParentUniversalProgress | null {
  if (!isRecord(value) || !isRecord(value.student)) return null;
  const summary = value.summary;
  const assignment = value.assignment_summary;
  if (
    typeof value.student.display_name !== "string" ||
    !isCount(value.student.grade) ||
    value.student.grade < 1 ||
    value.student.grade > 9 ||
    ![
      "LEGACY_GRADE1_AGGREGATED",
      "UNIVERSAL_CURRICULUM",
    ].includes(String(value.compatibility_mode)) ||
    typeof value.mastery_policy_version !== "string" ||
    typeof value.mastery_explanation !== "string" ||
    !isRecord(summary) ||
    !isRecord(assignment)
  ) {
    return null;
  }
  const units = parseUnits(value.units);
  const outcomes = parseEvidenceList(value.outcomes, true);
  const skills = parseEvidenceList(value.skills, true);
  const attempts = parseAttempts(value.attempts);
  const strengths = parseEvidenceList(value.strengths, true);
  const needsPractice = parseEvidenceList(value.needs_practice, true);
  const assignmentOutcomes = parseEvidenceList(
    value.assignment_outcomes,
    false,
  );
  const assignmentSkills = parseEvidenceList(
    value.assignment_skills,
    false,
  );
  if (
    !units ||
    !outcomes ||
    !skills ||
    !attempts ||
    !strengths ||
    !needsPractice ||
    !assignmentOutcomes ||
    !assignmentSkills ||
    ![
      summary.attempt_count,
      summary.completed_attempt_count,
      summary.started_unit_count,
      summary.completed_unit_count,
      summary.total_answered,
      summary.total_correct,
      assignment.attempt_count,
      assignment.completed_count,
      assignment.answered_count,
      assignment.correct_count,
    ].every(isCount) ||
    !(
      summary.accuracy_percent === null ||
      isPercent(summary.accuracy_percent)
    ) ||
    !isOptionalTimestamp(summary.last_activity_at) ||
    !isMastery(summary.mastery_label) ||
    !(
      assignment.accuracy_percent === null ||
      isPercent(assignment.accuracy_percent)
    ) ||
    !isOptionalTimestamp(assignment.last_activity_at) ||
    assignment.evidence_source !== "TEACHER_ASSIGNMENT"
  ) {
    return null;
  }
  return {
    student: {
      displayName: value.student.display_name,
      grade: value.student.grade,
    },
    compatibilityMode:
      value.compatibility_mode as ParentUniversalProgress["compatibilityMode"],
    masteryPolicyVersion: value.mastery_policy_version,
    masteryExplanation: value.mastery_explanation,
    summary: {
      attemptCount: summary.attempt_count as number,
      completedAttemptCount: summary.completed_attempt_count as number,
      startedUnitCount: summary.started_unit_count as number,
      completedUnitCount: summary.completed_unit_count as number,
      totalAnswered: summary.total_answered as number,
      totalCorrect: summary.total_correct as number,
      accuracyPercent: summary.accuracy_percent,
      lastActivityAt: summary.last_activity_at,
      masteryLabel: summary.mastery_label,
    },
    units,
    outcomes,
    skills,
    attempts,
    strengths,
    needsPractice,
    assignmentSummary: {
      attemptCount: assignment.attempt_count as number,
      completedCount: assignment.completed_count as number,
      answeredCount: assignment.answered_count as number,
      correctCount: assignment.correct_count as number,
      accuracyPercent: assignment.accuracy_percent,
      lastActivityAt: assignment.last_activity_at,
      evidenceSource: "TEACHER_ASSIGNMENT",
    },
    assignmentOutcomes,
    assignmentSkills,
  };
}

export const parentMasteryLabels: Record<
  ParentUniversalMastery,
  string
> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang học",
  NEEDS_PRACTICE: "Cần luyện thêm",
  DEVELOPING: "Đang phát triển",
  PROFICIENT: "Đạt yêu cầu",
  MASTERED: "Đạt mức thành thạo theo tiêu chí hiện tại",
};
