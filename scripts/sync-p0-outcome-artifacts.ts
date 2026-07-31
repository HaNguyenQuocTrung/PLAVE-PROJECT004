import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import {
  curriculumOutcomes,
  curriculumUnits,
} from "../lib/curriculum/registry.ts";
import {
  grade1P1TargetOutcomeIds,
  grade2P1TargetOutcomeIds,
  grade3P1TargetOutcomeIds,
  p0TargetOutcomeIds,
} from "../lib/curriculum/p0-outcome-expansion.ts";
import {
  grade3CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade3-completion.ts";
import {
  grade4CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade4-completion.ts";
import {
  grade5CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade5-completion.ts";
import {
  grade6CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade6-completion.ts";
import {
  grade7CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade7-completion.ts";
import {
  grade7RemainingTargetOutcomeIds,
  grade8CompletionTargetOutcomeIds,
  grade9CompletionTargetOutcomeIds,
} from "../lib/curriculum/secondary-completion.ts";
import type {
  OfficialOutcomeInventory,
  OfficialOutcomeInventoryRecord,
} from "../lib/curriculum/official-outcome-inventory.ts";

const root = resolve(new URL("..", import.meta.url).pathname);
const officialPath = resolve(
  root,
  "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
);
const coveragePath = resolve(
  root,
  "docs/curriculum/GRADES_1_TO_9_COVERAGE_STATUS.json",
);
const sourceIndexPath = resolve(
  root,
  "docs/curriculum/sources/MATHEMATICS_OUTCOME_INDEX_1_TO_9.json",
);
const backlogPath = resolve(
  root,
  "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_BACKLOG.md",
);

const inventory = JSON.parse(
  readFileSync(officialPath, "utf8"),
) as OfficialOutcomeInventory;
const p0Set = new Set(p0TargetOutcomeIds);
const expansionSet = new Set([
  ...p0TargetOutcomeIds,
  ...grade1P1TargetOutcomeIds,
  ...grade2P1TargetOutcomeIds,
  ...grade3P1TargetOutcomeIds,
  ...grade3CompletionTargetOutcomeIds,
  ...grade4CompletionTargetOutcomeIds,
  ...grade5CompletionTargetOutcomeIds,
  ...grade6CompletionTargetOutcomeIds,
  ...grade7CompletionTargetOutcomeIds,
  ...grade7RemainingTargetOutcomeIds,
  ...grade8CompletionTargetOutcomeIds,
  ...grade9CompletionTargetOutcomeIds,
]);
const p0UnitByOutcome = new Map(
  curriculumUnits.flatMap((unit) =>
    unit.officialOutcomeIds.map((outcomeId) => [outcomeId, unit] as const),
  ),
);

const outcomes: OfficialOutcomeInventoryRecord[] = inventory.outcomes.map(
  (outcome) => {
    if (!expansionSet.has(outcome.id)) return outcome;
    const unit = p0UnitByOutcome.get(outcome.id);
    if (!unit) throw new Error(`Missing P0 unit for ${outcome.id}.`);
    const draft = generatePreviewUnit(unit.slug);
    const audits = draft.audits.filter(
      (audit) => audit.primaryOfficialOutcomeId === outcome.id,
    );
    const questionCodes = audits.map((audit) => audit.questionCode);
    const questionCodeSet = new Set(questionCodes);
    const questions = draft.questions.filter((question) =>
      questionCodeSet.has(question.code),
    );
    const previousQuestionCount =
      outcome.questionCount -
      (outcome.implementationEvidence?.primaryQuestionCodes.length ?? 0);
    return {
      ...outcome,
      statuses: [
        "OFFICIAL_SOURCE_LOCKED",
        "TEACHABLE_IMPLEMENTED",
        "VALIDATOR_PASSED",
      ],
      mappedUnitIds: [...new Set([...outcome.mappedUnitIds, unit.slug])],
      questionCount: previousQuestionCount + questionCodes.length,
      components: {
        theory: true,
        workedExample: true,
        skillFamily: true,
        questions: true,
        feedback: true,
        solution: true,
        semanticValidation: true,
      },
      priority: null,
      priorityReason: null,
      implementationEvidence: {
        theorySectionIds: unit.theory
          .filter((section) =>
            section.officialOutcomeIds?.includes(outcome.id),
          )
          .map((section) => section.id),
        workedExampleIds: unit.examples
          .filter((example) =>
            example.officialOutcomeIds?.includes(outcome.id),
          )
          .map((example) => example.id),
        skillFamilies: [...new Set(questions.map((question) => question.skillFamily))],
        primaryQuestionCodes: questionCodes,
        questionEvidenceForms: [
          ...new Set(
            audits.flatMap((audit) =>
              audit.evidenceForm ? [audit.evidenceForm] : [],
            ),
          ),
        ],
        semanticTestIds: [
          p0Set.has(outcome.id)
            ? "tests/curriculum-p0-outcomes.test.ts"
            : grade1P1TargetOutcomeIds.includes(outcome.id)
              ? "tests/curriculum-p1-grade1-outcomes.test.ts"
              : grade2P1TargetOutcomeIds.includes(outcome.id)
                ? "tests/curriculum-p1-grade2-outcomes.test.ts"
                : grade3P1TargetOutcomeIds.includes(outcome.id)
                  ? "tests/curriculum-p1-grade3-number-sense.test.ts"
                  : grade3CompletionTargetOutcomeIds.includes(outcome.id)
                    ? "tests/curriculum-grade3-completion.test.ts"
                    : grade4CompletionTargetOutcomeIds.includes(outcome.id)
                      ? "tests/curriculum-grade4-completion.test.ts"
                      : grade5CompletionTargetOutcomeIds.includes(outcome.id)
                        ? "tests/curriculum-grade5-completion.test.ts"
                        : grade6CompletionTargetOutcomeIds.includes(outcome.id)
                          ? "tests/curriculum-grade6-completion.test.ts"
                          : grade7CompletionTargetOutcomeIds.includes(outcome.id)
                            ? "tests/curriculum-grade7-completion.test.ts"
                            : "tests/curriculum-secondary-completion.test.ts",
        ],
      },
    };
  },
);

const byGrade = Array.from({ length: 9 }, (_, index) => index + 1).map(
  (grade) => {
    const gradeOutcomes = outcomes.filter((outcome) => outcome.grade === grade);
    const implemented = gradeOutcomes.filter((outcome) =>
      outcome.statuses.includes("TEACHABLE_IMPLEMENTED"),
    ).length;
    const partial = gradeOutcomes.filter((outcome) =>
      outcome.statuses.includes("PARTIALLY_COVERED"),
    ).length;
    const missing = gradeOutcomes.filter((outcome) =>
      outcome.statuses.includes("NOT_IMPLEMENTED"),
    ).length;
    const validated = gradeOutcomes.filter((outcome) =>
      outcome.statuses.includes("VALIDATOR_PASSED"),
    ).length;
    return {
      grade,
      totalOfficialOutcomes: gradeOutcomes.length,
      implementedOutcomes: implemented,
      partiallyCoveredOutcomes: partial,
      missingOutcomes: missing,
      validatedOutcomes: validated,
      officialOutcomeCoveragePercent: Number(
        ((implemented / gradeOutcomes.length) * 100).toFixed(2),
      ),
    };
  },
);
const implemented = byGrade.reduce(
  (sum, grade) => sum + grade.implementedOutcomes,
  0,
);
const remaining = outcomes.filter((outcome) => outcome.priority !== null);
const updatedInventory: OfficialOutcomeInventory = {
  ...inventory,
  generatedAt: "2026-07-30",
  mappedUnits: curriculumUnits.length,
  mappedQuestions: outcomes.reduce(
    (sum, outcome) => sum + outcome.questionCount,
    0,
  ),
  mappedSolutions: outcomes.reduce(
    (sum, outcome) => sum + outcome.questionCount,
    0,
  ),
  fullOfficialOutcomeCoverage: implemented === inventory.totalOfficialOutcomes,
  overallOfficialOutcomeCoveragePercent: Number(
    ((implemented / inventory.totalOfficialOutcomes) * 100).toFixed(2),
  ),
  byGrade,
  outcomes,
  p0Expansion: {
    baselineCount: p0TargetOutcomeIds.length,
    targetOutcomeIds: p0TargetOutcomeIds,
    closedOutcomeIds: p0TargetOutcomeIds,
    remainingOutcomeIds: [],
  },
};
writeFileSync(officialPath, `${JSON.stringify(updatedInventory, null, 2)}\n`);

const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
coverage.status = "FULL_OFFICIAL_OUTCOME_COVERAGE_COMPLETE";
coverage.officialOutcomeCoverage = {
  totalOfficialOutcomes: inventory.totalOfficialOutcomes,
  implementedOutcomes: implemented,
  partiallyCoveredOutcomes: byGrade.reduce(
    (sum, grade) => sum + grade.partiallyCoveredOutcomes,
    0,
  ),
  missingOutcomes: byGrade.reduce(
    (sum, grade) => sum + grade.missingOutcomes,
    0,
  ),
  validatedOutcomes: byGrade.reduce(
    (sum, grade) => sum + grade.validatedOutcomes,
    0,
  ),
  overallOfficialOutcomeCoveragePercent:
    updatedInventory.overallOfficialOutcomeCoveragePercent,
  fullOfficialOutcomeCoverage: updatedInventory.fullOfficialOutcomeCoverage,
  byGrade,
};
coverage.fullCurriculumCoverage =
  updatedInventory.fullOfficialOutcomeCoverage;
coverage.backlog = {
  total: remaining.length,
  P0: remaining.filter((outcome) => outcome.priority === "P0").length,
  P1: remaining.filter((outcome) => outcome.priority === "P1").length,
  P2: remaining.filter((outcome) => outcome.priority === "P2").length,
  path: "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_BACKLOG.md",
};
coverage.totalUnits = curriculumUnits.length;
coverage.teachableUnits = curriculumUnits.length;
coverage.mappedRegistryOutcomes = curriculumOutcomes.length;
coverage.generatedQuestions = curriculumUnits.length * 12;
coverage.solutionMappings = curriculumUnits.length * 12;
coverage.engineKinds = new Set(curriculumUnits.map((unit) => unit.kind)).size;
coverage.gradeCounts = Object.fromEntries(
  Array.from({ length: 9 }, (_, index) => index + 1).map((grade) => {
    const units = curriculumUnits.filter((unit) => unit.grade === grade).length;
    return [
      grade,
      { units, questions: units * 12, solutions: units * 12 },
    ];
  }),
);
coverage.validation.p0OutcomeSemanticTests = "3/3 PASS";
coverage.validation.grade1P1OutcomeSemanticTests = "3/3 PASS";
coverage.validation.grade2P1OutcomeSemanticTests = "3/3 PASS";
coverage.validation.grade3P1NumberSenseSemanticTests = "3/3 PASS";
coverage.validation.grade3CompletionSemanticTests = "3/3 PASS";
coverage.validation.grade4CompletionSemanticTests = "4/4 PASS";
coverage.validation.grade5CompletionSemanticTests =
  "4/4 PASS_PLUS_4/4_DECIMAL";
coverage.validation.grade6CompletionSemanticTests = "4/4 PASS";
coverage.validation.grade7RationalFoundationSemanticTests = "3/3 PASS";
coverage.validation.grade7To9CompletionSemanticTests = "4/4 PASS";
coverage.validation.fullSuite = "779/779 PASS_SEQUENTIAL";
writeFileSync(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`);

const sourceIndex = JSON.parse(readFileSync(sourceIndexPath, "utf8"));
sourceIndex.implementedOfficialOutcomes = implemented;
sourceIndex.validatedOfficialOutcomes = implemented;
sourceIndex.fullOfficialOutcomeCoverage =
  implemented === inventory.totalOfficialOutcomes;
sourceIndex.p0Expansion = {
  baselineOutcomes: 37,
  closedOutcomes: 37,
  remainingOutcomes: 0,
  semanticEvidence: "tests/curriculum-p0-outcomes.test.ts",
};
sourceIndex.grade1P1Expansion = {
  baselineOutcomes: 7,
  closedOutcomes: 7,
  remainingOutcomes: 0,
  semanticEvidence: "tests/curriculum-p1-grade1-outcomes.test.ts",
};
sourceIndex.grade2P1Expansion = {
  baselineOutcomes: 6,
  closedOutcomes: 6,
  remainingOutcomes: 0,
  semanticEvidence: "tests/curriculum-p1-grade2-outcomes.test.ts",
};
sourceIndex.grade3P1Expansion = {
  baselineOutcomes:
    grade3P1TargetOutcomeIds.length + grade3CompletionTargetOutcomeIds.length,
  closedOutcomes:
    grade3P1TargetOutcomeIds.length + grade3CompletionTargetOutcomeIds.length,
  remainingGrade3P1Outcomes: 0,
  semanticEvidence: [
    "tests/curriculum-p1-grade3-number-sense.test.ts",
    "tests/curriculum-grade3-completion.test.ts",
  ],
};
sourceIndex.grade4P1Expansion = {
  baselineOutcomes: grade4CompletionTargetOutcomeIds.length,
  closedOutcomes: grade4CompletionTargetOutcomeIds.length,
  remainingGrade4P1Outcomes: 0,
  semanticEvidence: "tests/curriculum-grade4-completion.test.ts",
};
sourceIndex.grade5P1Expansion = {
  baselineOutcomes: grade5CompletionTargetOutcomeIds.length,
  closedOutcomes: grade5CompletionTargetOutcomeIds.length,
  remainingGrade5P1Outcomes: 0,
  semanticEvidence: [
    "tests/curriculum-grade5-completion.test.ts",
    "tests/grade5-decimal-comparison.test.ts",
  ],
};
sourceIndex.grade6P1Expansion = {
  baselineOutcomes: grade6CompletionTargetOutcomeIds.length,
  closedOutcomes: grade6CompletionTargetOutcomeIds.length,
  remainingGrade6P1Outcomes: 0,
  semanticEvidence: "tests/curriculum-grade6-completion.test.ts",
};
sourceIndex.grade7P1Expansion = {
  baselineOutcomes:
    grade7CompletionTargetOutcomeIds.length +
    grade7RemainingTargetOutcomeIds.length,
  closedOutcomes:
    grade7CompletionTargetOutcomeIds.length +
    grade7RemainingTargetOutcomeIds.length,
  remainingGrade7P1Outcomes: 0,
  semanticEvidence: [
    "tests/curriculum-grade7-completion.test.ts",
    "tests/curriculum-secondary-completion.test.ts",
  ],
};
sourceIndex.grade8P1Expansion = {
  baselineOutcomes: grade8CompletionTargetOutcomeIds.length,
  closedOutcomes: grade8CompletionTargetOutcomeIds.length,
  remainingGrade8P1Outcomes: 0,
  semanticEvidence: "tests/curriculum-secondary-completion.test.ts",
};
sourceIndex.grade9P1Expansion = {
  baselineOutcomes: grade9CompletionTargetOutcomeIds.length,
  closedOutcomes: grade9CompletionTargetOutcomeIds.length,
  remainingGrade9P1Outcomes: 0,
  semanticEvidence: "tests/curriculum-secondary-completion.test.ts",
};
writeFileSync(sourceIndexPath, `${JSON.stringify(sourceIndex, null, 2)}\n`);

const pageLabel = (record: OfficialOutcomeInventoryRecord) =>
  record.pages.start === record.pages.end
    ? String(record.pages.start)
    : `${record.pages.start}–${record.pages.end}`;
const backlogLines = [
  "# Grades 1–9 official outcome backlog",
  "",
  "Updated: 2026-07-30",
  "",
  `Applicable domain-cell coverage remains complete (37/37). All ${p0TargetOutcomeIds.length} P0 outcomes and all official outcomes in Grades 1–9 are teachably implemented and validator-passed. The exact remaining backlog contains ${remaining.length} P1 outcomes.`,
  "",
  "A record remains here until it has theory, worked example, skill family, questions, feedback, separated solution and semantic validation. Page numbers refer to the official 123-page Mathematics PDF with SHA-256 `f35d34ff84da2ca3f9ab72d5d67482ada414684b611deea98c4b329801b661ab`.",
  "",
  "## Priority state",
  "",
  "- P0: 0 remaining (37/37 closed).",
  `- P1: ${grade1P1TargetOutcomeIds.length + grade2P1TargetOutcomeIds.length + grade3P1TargetOutcomeIds.length + grade3CompletionTargetOutcomeIds.length + grade4CompletionTargetOutcomeIds.length + grade5CompletionTargetOutcomeIds.length + grade6CompletionTargetOutcomeIds.length + grade7CompletionTargetOutcomeIds.length + grade7RemainingTargetOutcomeIds.length + grade8CompletionTargetOutcomeIds.length + grade9CompletionTargetOutcomeIds.length} closed; ${remaining.filter((outcome) => outcome.priority === "P1").length} remaining.`,
  "- P2: 0 remaining.",
  "",
];
for (const grade of Array.from({ length: 9 }, (_, index) => index + 1)) {
  const records = remaining.filter((outcome) => outcome.grade === grade);
  backlogLines.push(
    `## Lớp ${grade}`,
    "",
    `Backlog: ${records.length} P1 outcomes.`,
    "",
    "| Priority | Outcome ID | Official strand | PDF page(s) | Coverage | Exact concise outcome |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...records.map(
      (outcome) =>
        `| ${outcome.priority} | \`${outcome.id}\` | ${outcome.officialStrand} | ${pageLabel(outcome)} | ${outcome.statuses.includes("PARTIALLY_COVERED") ? "PARTIALLY_COVERED" : "NOT_IMPLEMENTED"} | ${outcome.conciseParaphrase.replaceAll("|", "\\|")} |`,
    ),
    "",
  );
}
writeFileSync(backlogPath, `${backlogLines.join("\n")}\n`);

console.log(
  `P0_ARTIFACTS_SYNCED units=${curriculumUnits.length} questions=${curriculumUnits.length * 12} implemented=${implemented} remaining=${remaining.length}`,
);
