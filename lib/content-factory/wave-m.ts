import { canonicalize, sha256 } from "./canonical.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { buildWaveLGradeInventory } from "./wave-l.ts";
import { waveJStructureFingerprint } from "./wave-j-depth.ts";

export type WaveMPoolResolution =
  | "CORRECTIVE_ADAPTIVE_OVERLAY"
  | "FIXED_SAFE_SUPPORTED"
  | "FAIL_CLOSED_UNAVAILABLE";

export type WaveMSkillSupport = "ADAPTIVE_READY" | "FIXED_SAFE_SUPPORTED" | "SHADOW_ONLY" | "UNAVAILABLE";

export type WaveMPoolResolutionRow = Readonly<{
  grade: FactoryGrade;
  skillId: string;
  before: "POOL_LIMITED_FAIL_CLOSED";
  resolution: WaveMPoolResolution;
  questionCount: number;
  reasoningStructureCount: number;
  sourceReferenceIds: readonly string[];
  fixedSequenceQuestionIds: readonly string[];
  adaptiveMasteryClaim: false;
  curriculumExpanded: false;
  aKArtifactsMutated: false;
  sanitizedReasonCode: "FIXED_POOL_SOURCE_VERIFIED_SINGLE_STRUCTURE" | "FIXED_POOL_EVIDENCE_INSUFFICIENT";
  nextActionOnCompletion: "ADVANCE_TO_ELIGIBLE_SAME_GRADE_SKILL" | "FAIL_CLOSED_TO_SAFE_SAME_GRADE_PATH";
}>;

const expectedPoolLimitedByGrade = Object.freeze({ 2: 3, 5: 1, 6: 3, 7: 2, 8: 2, 9: 2 } as const);

function poolIsFixedSafe(pack: GradePack, skillId: string) {
  const quarantined = new Set((pack.quarantinedQuestions ?? []).map((question) => question.id));
  const questions = pack.questions.filter((question) => question.skillId === skillId);
  const ids = new Set(questions.map((question) => question.id));
  return questions.length >= 2 && ids.size === questions.length && questions.every((question) =>
    !question.fixtureOnly && !quarantined.has(question.id) && question.provenance.sourceReferenceIds.length > 0
      && question.answer.type !== "AUTOMATED_VERIFICATION_INSUFFICIENT"
      && question.reviewStatus !== "AUTOMATED_VERIFICATION_INSUFFICIENT");
}

export function buildWaveMPoolResolutionReport(packs: readonly GradePack[]) {
  const rows: WaveMPoolResolutionRow[] = [];
  for (const pack of packs) {
    const inventory = buildWaveLGradeInventory(pack);
    for (const skill of inventory.skillRows.filter((row) => row.readiness === "POOL_LIMITED_FAIL_CLOSED")) {
      const questions = pack.questions.filter((question) => question.skillId === skill.skillId);
      const fixedSafe = poolIsFixedSafe(pack, skill.skillId);
      rows.push({
        grade: pack.grade,
        skillId: skill.skillId,
        before: "POOL_LIMITED_FAIL_CLOSED",
        resolution: fixedSafe ? "FIXED_SAFE_SUPPORTED" : "FAIL_CLOSED_UNAVAILABLE",
        questionCount: questions.length,
        reasoningStructureCount: new Set(questions.map((question) => waveJStructureFingerprint(question.prompt))).size,
        sourceReferenceIds: [...new Set(questions.flatMap((question) => question.provenance.sourceReferenceIds))].sort(),
        fixedSequenceQuestionIds: fixedSafe ? questions.map((question) => question.id).sort() : [],
        adaptiveMasteryClaim: false,
        curriculumExpanded: false,
        aKArtifactsMutated: false,
        sanitizedReasonCode: fixedSafe ? "FIXED_POOL_SOURCE_VERIFIED_SINGLE_STRUCTURE" : "FIXED_POOL_EVIDENCE_INSUFFICIENT",
        nextActionOnCompletion: fixedSafe ? "ADVANCE_TO_ELIGIBLE_SAME_GRADE_SKILL" : "FAIL_CLOSED_TO_SAFE_SAME_GRADE_PATH",
      });
    }
  }
  return rows.sort((left, right) => left.grade - right.grade || left.skillId.localeCompare(right.skillId));
}

const correctiveOverlayCore = Object.freeze({
  schemaVersion: "plave-wave-m-corrective-overlay-v1",
  policyVersion: "grades-1-9-wave-m-corrective-overlay-1.0.0",
  questions: [] as readonly never[],
  reasonCode: "NO_CORRECTIVE_QUESTION_REQUIRED_FIXED_SAFE_PATHS_SUFFICIENT",
  productionBundleMember: false,
  aKArtifactsMutated: false,
} as const);

export const waveMCorrectiveOverlay = Object.freeze({
  ...correctiveOverlayCore,
  overlayHash: sha256(canonicalize(correctiveOverlayCore)),
});

export function buildWaveMAdaptiveSupportInventory(packs: readonly GradePack[]) {
  const resolutions = buildWaveMPoolResolutionReport(packs);
  const resolutionBySkill = new Map(resolutions.map((row) => [`${row.grade}:${row.skillId}`, row]));
  const grades = packs.map((pack) => {
    const waveL = buildWaveLGradeInventory(pack);
    const skills = waveL.skillRows.map((skill) => {
      const resolution = resolutionBySkill.get(`${pack.grade}:${skill.skillId}`);
      const support: WaveMSkillSupport = skill.readiness === "SHADOW_ONLY" ? "SHADOW_ONLY"
        : skill.readiness === "ADAPTIVE_READY" ? "ADAPTIVE_READY"
          : resolution?.resolution === "FIXED_SAFE_SUPPORTED" ? "FIXED_SAFE_SUPPORTED" : "UNAVAILABLE";
      return { skillId: skill.skillId, support, questionCount: skill.questionPool,
        reasoningStructureCount: skill.reasoningStructures, adaptiveMasteryClaim: support === "ADAPTIVE_READY",
        fixedRuntimePractice: support === "FIXED_SAFE_SUPPORTED" || support === "SHADOW_ONLY",
        continuousNextAction: true, schoolGradeMutation: false, entitlementGrant: false } as const;
    });
    const counts = {
      adaptiveReady: skills.filter((skill) => skill.support === "ADAPTIVE_READY").length,
      fixedSafe: skills.filter((skill) => skill.support === "FIXED_SAFE_SUPPORTED").length,
      shadowOnly: skills.filter((skill) => skill.support === "SHADOW_ONLY").length,
      unavailable: skills.filter((skill) => skill.support === "UNAVAILABLE").length,
    };
    const gradeSupport = pack.grade === 1 ? "FIXED_RUNTIME_WITH_SHADOW_EVIDENCE" as const
      : counts.unavailable > 0 ? "ADAPTIVE_WITH_FAIL_CLOSED_GAPS" as const
        : counts.fixedSafe > 0 ? "ADAPTIVE_WITH_FIXED_SAFE_PATHS" as const : "ADAPTIVE_READY" as const;
    return { grade: pack.grade, candidate: pack.candidate, questions: pack.questions.length, skills: skills.length,
      units: pack.units.length, gradeSupport, counts, skillRows: skills };
  });
  const totals = {
    adaptiveReady: grades.reduce((sum, grade) => sum + grade.counts.adaptiveReady, 0),
    fixedSafe: grades.reduce((sum, grade) => sum + grade.counts.fixedSafe, 0),
    shadowOnly: grades.reduce((sum, grade) => sum + grade.counts.shadowOnly, 0),
    unavailable: grades.reduce((sum, grade) => sum + grade.counts.unavailable, 0),
  };
  return { schemaVersion: "plave-wave-m-adaptive-fixed-safe-inventory-v1", grades, resolutions,
    correctiveOverlay: waveMCorrectiveOverlay, totals } as const;
}

export function verifyWaveMPoolResolutions(packs: readonly GradePack[]) {
  const report = buildWaveMPoolResolutionReport(packs);
  const counts = new Map<number, number>();
  for (const row of report) counts.set(row.grade, (counts.get(row.grade) ?? 0) + 1);
  const errors: string[] = [];
  if (report.length !== 13) errors.push(`POOL_LIMITED_COUNT_DRIFT:${report.length}`);
  for (const [grade, expected] of Object.entries(expectedPoolLimitedByGrade)) {
    if ((counts.get(Number(grade)) ?? 0) !== expected) errors.push(`G${grade}:POOL_LIMITED_COUNT_DRIFT`);
  }
  if (report.some((row) => row.resolution === "CORRECTIVE_ADAPTIVE_OVERLAY")) errors.push("UNNECESSARY_CORRECTIVE_OVERLAY_CREATED");
  if (report.some((row) => row.resolution === "FAIL_CLOSED_UNAVAILABLE")) errors.push("FIXED_SAFE_EVIDENCE_GAP");
  if (waveMCorrectiveOverlay.questions.length !== 0 || waveMCorrectiveOverlay.productionBundleMember) errors.push("A_K_OVERLAY_ISOLATION_DRIFT");
  return { status: errors.length === 0 ? "PASSED" as const : "FAILED" as const, rows: report, counts: {
    adaptiveOverlay: report.filter((row) => row.resolution === "CORRECTIVE_ADAPTIVE_OVERLAY").length,
    fixedSafe: report.filter((row) => row.resolution === "FIXED_SAFE_SUPPORTED").length,
    unavailable: report.filter((row) => row.resolution === "FAIL_CLOSED_UNAVAILABLE").length,
  }, overlayHash: waveMCorrectiveOverlay.overlayHash, errors };
}
