export const perGradeCheckNames = [
  "curriculumVisible",
  "independentPracticeStarted",
  "databaseGradedAnswer",
  "attemptHistoryPersisted",
  "unitOutcomeSkillProgress",
  "linkedParentProgress",
  "unlinkedParentDenied",
  "teacherAssignmentPublished",
  "studentAssignmentSubmitted",
  "teacherGradebookEvidence",
  "wrongGradeCrossClassroomDenied",
  "noSolutionLeakBeforeSubmit",
] as const;

export type PerGradeEvidence = Readonly<{
  grade: number;
  evidenceType: "LIVE_LOCAL_DATABASE";
  curriculumVisible: "PASS";
  independentPracticeStarted: "PASS";
  databaseGradedAnswer: "PASS";
  attemptHistoryPersisted: "PASS";
  unitOutcomeSkillProgress: "PASS";
  linkedParentProgress: "PASS";
  unlinkedParentDenied: "PASS";
  teacherAssignmentPublished: "PASS";
  studentAssignmentSubmitted: "PASS";
  teacherGradebookEvidence: "PASS";
  wrongGradeCrossClassroomDenied: "PASS";
  noSolutionLeakBeforeSubmit: "PASS";
  overall: "PASS";
}>;

export function parsePerGradeEvidence(output: string): PerGradeEvidence[] {
  const markerPrefix = "PER_GRADE_EVIDENCE_JSON=";
  const markers = output
    .split(/\r?\n/)
    .filter((line) => line.startsWith(markerPrefix));
  if (markers.length !== 1) {
    throw new Error(
      `Live verification must emit exactly one per-grade evidence marker; received ${markers.length}.`,
    );
  }

  const parsed: unknown = JSON.parse(
    markers[0].slice(markerPrefix.length),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("evidenceType" in parsed) ||
    parsed.evidenceType !== "LIVE_LOCAL_DATABASE" ||
    !("grades" in parsed) ||
    !Array.isArray(parsed.grades) ||
    parsed.grades.length !== 9
  ) {
    throw new Error("Live per-grade evidence has an invalid envelope.");
  }

  const expectedRowKeys = new Set([
    "grade",
    "evidenceType",
    ...perGradeCheckNames,
    "overall",
  ]);
  const seenGrades = new Set<number>();
  for (const row of parsed.grades) {
    if (
      typeof row !== "object" ||
      row === null ||
      Array.isArray(row) ||
      !("grade" in row) ||
      typeof row.grade !== "number" ||
      !Number.isInteger(row.grade) ||
      row.grade < 1 ||
      row.grade > 9 ||
      seenGrades.has(row.grade) ||
      !("evidenceType" in row) ||
      row.evidenceType !== "LIVE_LOCAL_DATABASE" ||
      !("overall" in row) ||
      row.overall !== "PASS" ||
      Object.keys(row).length !== expectedRowKeys.size ||
      Object.keys(row).some((key) => !expectedRowKeys.has(key))
    ) {
      throw new Error(
        "Live per-grade evidence contains an invalid or duplicate grade row.",
      );
    }

    seenGrades.add(row.grade);
    for (const checkName of perGradeCheckNames) {
      if (!(checkName in row) || row[checkName] !== "PASS") {
        throw new Error(
          `Grade ${row.grade} failed live check ${checkName}.`,
        );
      }
    }
  }

  for (let expectedGrade = 1; expectedGrade <= 9; expectedGrade += 1) {
    if (!seenGrades.has(expectedGrade)) {
      throw new Error(
        `Grade ${expectedGrade} has no live-local PASS evidence.`,
      );
    }
  }

  return parsed.grades as PerGradeEvidence[];
}
