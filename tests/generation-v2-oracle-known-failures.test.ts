import assert from "node:assert/strict";
import test from "node:test";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  generateQuestion,
} from "../lib/generation-v2/index.ts";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

function sample(outcomeId: string, difficulty: Difficulty, seed: string) {
  const entry = GENERATOR_V2_OUTCOME_REGISTRY.find(
    (candidate) => candidate.outcomeId === outcomeId,
  );
  assert.ok(entry, `missing registry entry ${outcomeId}`);
  return generateQuestion({
    outcomeId,
    grade: entry.grade,
    difficulty,
    seed,
    locale: "vi-VN",
  }).publicSnapshot;
}

test("F-003 known public contracts state a complete, interaction-compatible task", () => {
  const sequence = sample(
    "MOET2018-G2-NUM-P024-002",
    "EASY",
    "sprint8cf-owner-moet2018-g2-num-p024-002-easy-19",
  );
  assert.match(sequence.publicPrompt, /số tiếp theo|số liền trước|ô trống/iu);
  assert.match(sequence.publicPrompt, /75[^\d]+77[^\d]+79/u);

  const rationalChange = sample(
    "MOET2018-G7-NAA-P056-005",
    "HARD",
    "sprint8cf-owner-moet2018-g7-naa-p056-005-hard-09",
  );
  assert.equal(rationalChange.interaction.type, "FRACTION_INPUT");
  assert.match(rationalChange.publicPrompt, /tăng|giảm|dương|âm/iu);

  const functionValue = sample(
    "MOET2018-G8-NAA-P064-018",
    "HARD",
    "sprint8cf-owner-moet2018-g8-naa-p064-018-hard-04",
  );
  assert.equal(functionValue.interaction.type, "INTEGER_INPUT");

  const rationalExpression = sample(
    "MOET2018-G8-NAA-P064-016",
    "HARD",
    "sprint8cf-owner-moet2018-g8-naa-p064-016-hard-05",
  );
  assert.match(rationalExpression.publicPrompt, /tổng|tích/iu);

  const gradeOneMeasure = sample(
    "MOET2018-G1-GEO-P023-008",
    "MEDIUM",
    "sprint8cf-owner-moet2018-g1-geo-p023-008-medium-04",
  );
  assert.match(gradeOneMeasure.publicPrompt, /cm/u);
  assert.doesNotMatch(gradeOneMeasure.publicPrompt, /đúng chiều|hệ số/u);

  const appliedMeasure = sample(
    "MOET2018-G2-GEO-P027-011",
    "MEDIUM",
    "sprint8cf-owner-moet2018-g2-geo-p027-011-medium-10",
  );
  assert.match(appliedMeasure.publicPrompt, /cộng|gộp|đổi/iu);
  assert.match(appliedMeasure.publicPrompt, /ml|l|cm|m/u);

  const cuboid = sample(
    "MOET2018-G5-GEO-P043-002",
    "MEDIUM",
    "sprint8cf-owner-moet2018-g5-geo-p043-002-medium-19",
  );
  assert.match(cuboid.publicPrompt, /diện tích toàn phần/iu);
  assert.match(cuboid.publicPrompt, /cm²/u);

  const trigonometry = sample(
    "MOET2018-G9-GEO-P074-008",
    "EASY",
    "sprint8cf-owner-moet2018-g9-geo-p074-008-easy-19",
  );
  assert.match(trigonometry.publicPrompt, /góc A/iu);
  assert.match(trigonometry.publicPrompt, /đối diện|kề/iu);

  const decimalChange = sample(
    "MOET2018-G6-NAA-P050-044",
    "EASY",
    "sprint8cf-owner-moet2018-g6-naa-p050-044-easy-01",
  );
  assert.match(decimalChange.publicPrompt, /thêm|bớt/iu);
});

test("ORDERING public interaction never serializes the canonical order", () => {
  const ordering = sample(
    "MOET2018-G1-NUM-P022-006",
    "HARD",
    "sprint10c-public-order-control",
  );
  assert.equal(ordering.interaction.type, "ORDERING");
  assert.equal(ordering.interaction.orderedItemIds, undefined);
});

test("circle-sector decimal tie rounds mathematically instead of by binary toFixed drift", () => {
  const entry = GENERATOR_V2_OUTCOME_REGISTRY.find(
    (candidate) => candidate.outcomeId === "MOET2018-G9-GEO-P075-026",
  );
  assert.ok(entry);
  const generated = generateQuestion({
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    difficulty: "MEDIUM",
    seed: "sprint10c-moet2018-g9-geo-p075-026-medium-13",
    locale: "vi-VN",
  });
  assert.equal(generated.privateSolution.correctResponse, 7.07);
});

test("repaired product prompts remain complete and interaction-compatible", () => {
  const fixtures = [
    sample("MOET2018-G4-NUM-P036-018", "EASY", "s10c-review-004-fraction-part-whole"),
    sample("MOET2018-G5-NUM-P041-006", "HARD", "s10c-review-057-fraction-application"),
    sample("MOET2018-G7-NAA-P056-006", "EASY", "s10c-review-067-rational-power"),
    sample("MOET2018-G9-NAA-P072-012", "HARD", "s10c-review-090-rational-equation-solving"),
    sample("MOET2018-G9-NAA-P073-023", "HARD", "s10c-review-096-linear-inequality-solving"),
  ];
  for (const fixture of fixtures) {
    assert.doesNotMatch(fixture.publicPrompt, /màu màu|phần còn lại hoặc kết quả|x−-|undefined|null/iu);
  }
  assert.match(fixtures[1]!.publicPrompt, /bước đầu|bước sau|tính trùng/iu);
  assert.match(fixtures[2]!.publicPrompt, /\(1\/3\)\^2/u);
  assert.match(fixtures[3]!.publicPrompt, /x \+ 4/u);
  assert.equal(fixtures[4]!.interaction.type, "SINGLE_CHOICE");
  assert.match(fixtures[4]!.publicPrompt, /Chọn tập nghiệm đúng/iu);
});

test("solid surface contracts expose meaningful dimensions and use total-area formulas", () => {
  const entry = GENERATOR_V2_OUTCOME_REGISTRY.find(
    (candidate) => candidate.outcomeId === "MOET2018-G9-GEO-P073-007",
  );
  assert.ok(entry);
  const generated = generateQuestion({
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    difficulty: "MEDIUM",
    seed: "s10c-review-119-solid-surface-volume",
    locale: "vi-VN",
  });
  assert.match(generated.publicSnapshot.publicPrompt, /bán kính đáy 5 cm, chiều cao 13 cm/iu);
  assert.match(generated.publicSnapshot.publicPrompt, /diện tích toàn phần/iu);
  assert.equal(generated.privateSolution.correctResponse, 565.2);
});

test("polynomial simplification removes a zero-coefficient term", () => {
  const generated = generateQuestion({
    outcomeId: "MOET2018-G8-NAA-P063-007",
    grade: 8,
    difficulty: "HARD",
    seed: "s10c-polynomial-cancellation-017",
    locale: "vi-VN",
  });
  assert.match(generated.publicSnapshot.publicPrompt, /bỏ hạng tử có hệ số 0/iu);
  assert.equal(generated.privateSolution.correctResponse, "9");
  assert.doesNotMatch(
    generated.privateSolution.solutionSteps.join(" "),
    /0x(?:\^2|²)/u,
  );
});

test("data ordering prompts never ask for an unrelated missing value", () => {
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    for (let index = 0; index < 20; index += 1) {
      const generated = generateQuestion({
        outcomeId: "MOET2018-G3-EXP-P034-002",
        grade: 3,
        difficulty,
        seed: `s10c-data-language-${difficulty.toLowerCase()}-${String(index).padStart(2, "0")}`,
        locale: "vi-VN",
      });
      assert.doesNotMatch(generated.publicSnapshot.publicPrompt, /tìm giá trị còn thiếu/iu);
      assert.match(
        generated.publicSnapshot.publicPrompt,
        /sắp xếp|chọn các bản ghi/iu,
      );
    }
  }
});

test("chart interpretation states one consistent public unit", () => {
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    for (let index = 0; index < 20; index += 1) {
      const generated = sample(
        "MOET2018-G7-STA-P061-001",
        difficulty,
        `s10c-chart-unit-${difficulty.toLowerCase()}-${String(index).padStart(2, "0")}`,
      );
      const unit = generated.publicData.unit;
      assert.equal(typeof unit, "string");
      assert.ok(unit);
      assert.match(generated.publicPrompt, new RegExp(String(unit), "u"));
      assert.equal(generated.visual.data.unit, unit);
      assert.equal(generated.interaction.unitLabel, unit);
    }
  }
});
