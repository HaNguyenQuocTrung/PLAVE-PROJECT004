import assert from "node:assert/strict";
import test from "node:test";

import {
  auditOutcomeGenerationCoverage,
} from "../lib/curriculum/generation-coverage.ts";
import {
  generateOnDemandAttemptSnapshot,
  verifyOnDemandAttemptSnapshot,
} from "../lib/curriculum/on-demand-generation.ts";
import {
  normalizeCurriculumAnswer,
} from "../lib/curriculum-runtime/release.ts";
import type {
  PreviewVisualSpec,
} from "../lib/curriculum/types.ts";

const deepAuditSeeds = Array.from(
  { length: 8 },
  (_, index) => `secondary-quality-seed-${index + 1}`,
);

function assertVisualInvariant(visual: PreviewVisualSpec) {
  assert.ok(visual.description.trim().length >= 24);
  switch (visual.type) {
    case "COUNTER_ROW":
      assert.ok(visual.groups > 0);
      assert.ok(visual.itemsPerGroup > 0);
      break;
    case "PLACE_VALUE_CHART":
      assert.ok(Number.isInteger(visual.value));
      assert.ok(visual.value >= 0);
      break;
    case "FRACTION_BAR":
      assert.ok(visual.denominator > 0);
      assert.ok(visual.numerator >= 0);
      for (const comparison of visual.comparisons ?? []) {
        assert.ok(comparison.denominator > 0);
        assert.ok(comparison.numerator >= 0);
      }
      break;
    case "DECIMAL_PLACE_VALUE_CHART":
      assert.ok(visual.values.length > 0);
      assert.ok(visual.values.every((value) => Number.isFinite(Number(value))));
      break;
    case "NUMBER_LINE":
      assert.ok(visual.minimum < visual.maximum);
      assert.ok(
        visual.points.every(
          (point) => point >= visual.minimum && point <= visual.maximum,
        ),
      );
      break;
    case "RATIO_TABLE": {
      const [[leftA, rightA], [leftB, rightB]] = visual.rows;
      assert.ok([leftA, rightA, leftB, rightB].every(Number.isFinite));
      assert.ok([leftA, rightA, leftB, rightB].every((value) => value >= 0));
      break;
    }
    case "BALANCE_MODEL":
      assert.ok(visual.variableBlocks > 0);
      assert.ok(visual.leftUnits >= 0);
      assert.ok(visual.rightUnits >= 0);
      break;
    case "COORDINATE_PLANE":
      assert.ok(visual.points.length > 0);
      assert.ok(
        visual.points.every(
          (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
        ),
      );
      break;
    case "SHAPE_SCENE":
      assert.ok(["CIRCLE", "TRIANGLE", "SQUARE", "RECTANGLE"].includes(
        visual.shape,
      ));
      break;
    case "SOLID_NET":
      assert.equal(
        visual.faceCount,
        visual.solid === "CYLINDER" ? 3 : 6,
      );
      break;
    case "MEASUREMENT_SCALE":
      assert.ok(visual.start < visual.end);
      assert.equal(visual.unit, "cm");
      break;
    case "ANGLE_DIAGRAM":
      assert.ok(visual.degrees > 0 && visual.degrees < 360);
      break;
    case "AREA_MODEL":
      assert.ok(visual.width > 0);
      assert.ok(visual.height > 0);
      break;
    case "DATA_DISPLAY":
      assert.ok(visual.entries.length > 0);
      assert.ok(
        visual.entries.every(
          (entry) =>
            entry.label.trim().length > 0 &&
            Number.isInteger(entry.count) &&
            entry.count >= 0,
        ),
      );
      break;
    case "CLOCK_FACE":
      assert.ok(visual.hour >= 1 && visual.hour <= 12);
      assert.ok([0, 15, 30, 45].includes(visual.minute));
      break;
  }
}

test("Grades 7–9 true-parametric outcomes pass deep deterministic quality invariants", () => {
  const outcomes = auditOutcomeGenerationCoverage().outcomes.filter(
    (outcome) =>
      outcome.classification === "TRUE_PARAMETRIC" &&
      outcome.grade >= 7,
  );
  assert.equal(outcomes.length, 47);

  for (const outcome of outcomes) {
    const unitId = outcome.mappedUnitIds.find((candidate) =>
      outcome.questionCodes.some((code) =>
        code.startsWith(`${candidate}-q`),
      ),
    );
    assert.ok(unitId, outcome.outcomeId);
    const snapshots = deepAuditSeeds.map((seed) =>
      generateOnDemandAttemptSnapshot({
        grade: outcome.grade as 7 | 8 | 9,
        unitId,
        seed: `${seed}-g${outcome.grade}`,
        selectionReason: "WEAK_RECENT_EVIDENCE",
        preferredOutcomeIds: [outcome.outcomeId],
      }),
    );
    assert.deepEqual(
      snapshots[0],
      generateOnDemandAttemptSnapshot({
        grade: outcome.grade as 7 | 8 | 9,
        unitId,
        seed: `${deepAuditSeeds[0]}-g${outcome.grade}`,
        selectionReason: "WEAK_RECENT_EVIDENCE",
        preferredOutcomeIds: [outcome.outcomeId],
      }),
    );
    assert.ok(snapshots.every(verifyOnDemandAttemptSnapshot));
    assert.ok(new Set(snapshots.map((item) => item.snapshotHash)).size > 1);

    const semanticVariants = new Set<string>();
    for (const snapshot of snapshots) {
      assert.equal(
        new Set(snapshot.questions.map((question) => question.prompt)).size,
        snapshot.questions.length,
        `${outcome.outcomeId} has a prompt collision`,
      );
      assert.ok(
        new Set(
          snapshot.questions.map(
            (question) => question.contract.evidenceForm,
          ),
        ).size >= 2,
        `${outcome.outcomeId} lacks multiple evidence forms`,
      );
      snapshot.questions.forEach((question, index) => {
        const solution = snapshot.solutions[index];
        assert.equal(solution?.questionId, question.questionId);
        assert.equal(
          solution.normalizedCorrectAnswer,
          normalizeCurriculumAnswer(solution.correctAnswer),
        );
        assert.ok(solution.solutionSteps.length >= 2);
        assert.ok(solution.feedback.trim().length >= 3);
        assert.ok(question.misconceptionTags.length > 0);
        assertVisualInvariant(question.visual);
        if (question.answerType === "MULTIPLE_CHOICE") {
          assert.ok(question.options);
          assert.equal(question.options.length, 4);
          assert.equal(
            new Set(question.options.map((option) => option.label)).size,
            4,
          );
          assert.ok(
            question.options.some(
              (option) =>
                option.key === solution.correctAnswer ||
                option.label === solution.correctAnswer,
            ),
          );
        } else {
          assert.equal(question.options, null);
        }
        semanticVariants.add(
          JSON.stringify({
            prompt: question.prompt,
            visual: question.visual,
            answer: solution.correctAnswer,
            steps: solution.solutionSteps,
          }),
        );
      });
    }
    assert.ok(
      semanticVariants.size > snapshots[0].questions.length,
      `${outcome.outcomeId} only repeats one semantic form`,
    );
  }
});

test("deep audit remains a technical gate, not expert endorsement", () => {
  const source = "technical deterministic invariant audit";
  assert.doesNotMatch(source, /expert|endorsement|pedagogical approval/i);
});
