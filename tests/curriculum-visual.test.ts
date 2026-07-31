import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import { CurriculumVisual } from "../app/curriculum-preview/CurriculumVisual.ts";
import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import type {
  PreviewVisualSpec,
  VisualRequirement,
} from "../lib/curriculum/types.ts";
import { createCurriculumVisualSpec } from "../lib/curriculum/visual.ts";

const visualKinds = [
  "COUNTER_ROW",
  "PLACE_VALUE_CHART",
  "FRACTION_BAR",
  "DECIMAL_PLACE_VALUE_CHART",
  "NUMBER_LINE",
  "RATIO_TABLE",
  "BALANCE_MODEL",
  "COORDINATE_PLANE",
  "SHAPE_SCENE",
  "SOLID_NET",
  "MEASUREMENT_SCALE",
  "ANGLE_DIAGRAM",
  "AREA_MODEL",
  "DATA_DISPLAY",
  "CLOCK_FACE",
] as const satisfies readonly VisualRequirement[];

test("all required visual kinds have typed data and accessible real markup", () => {
  const representedKinds = new Set(
    curriculumUnits.flatMap((unit) => [
      unit.requiredVisual,
      ...generatePreviewUnit(unit.slug).questions.map(
        (question) => question.visual.type,
      ),
    ]),
  );
  assert.deepEqual([...representedKinds].sort(), [...visualKinds].sort());

  for (const type of visualKinds) {
    const spec = createCurriculumVisualSpec({
      type,
      description: `Mô hình kiểm thử dễ hiểu cho ${type}.`,
      identity: `visual-test-${type}`,
      parameters: [
        { name: "left", value: 2.05 },
        { name: "right", value: 2.5 },
        { name: "denominator", value: 5 },
      ],
    });
    assert.equal(spec.type, type);
    const markup = renderToStaticMarkup(
      createElement(CurriculumVisual, { spec }),
    );
    assert.match(markup, /<figure/u);
    assert.match(markup, /role="img"/u);
    assert.match(markup, /aria-label=/u);
    assert.match(markup, /<figcaption/u);
    assert.match(markup, /curriculum-visual__canvas/u);
    assert.doesNotMatch(
      markup,
      /correctAnswer|solutionSteps|Đáp án|data:text\/html|<script/iu,
    );
  }
});

test("the visual payload follows unit kind and deterministic question data", () => {
  for (const unit of curriculumUnits) {
    const first = generatePreviewUnit(unit.slug, "visual-seed-a");
    const repeated = generatePreviewUnit(unit.slug, "visual-seed-a");
    assert.deepEqual(first.questions, repeated.questions);
    for (const question of first.questions) {
      const audit = first.audits.find(
        (candidate) => candidate.questionCode === question.code,
      );
      assert.ok(audit);
      assert.equal(
        question.visual.type,
        audit.visualRequirement ?? unit.requiredVisual,
      );
      assert.ok(question.visual.description.length >= 24);
      assert.equal("correctAnswer" in question.visual, false);
      assert.equal("solution" in question.visual, false);
    }
  }

  const first = createCurriculumVisualSpec({
    type: "COUNTER_ROW",
    description: "Một hàng chấm tròn dùng để kiểm thử.",
    identity: "visual-change-a",
  });
  const second = createCurriculumVisualSpec({
    type: "COUNTER_ROW",
    description: "Một hàng chấm tròn dùng để kiểm thử.",
    identity: "visual-change-b",
  });
  assert.notDeepEqual(first, second);
});

test("grouping, fractional number-line and ratio visuals preserve typed semantics", () => {
  const groups = createCurriculumVisualSpec({
    type: "COUNTER_ROW",
    description: "Ba nhóm, mỗi nhóm bốn chấm.",
    identity: "groups",
    parameters: [
      { name: "groups", value: 3 },
      { name: "itemsPerGroup", value: 4 },
    ],
  });
  assert.deepEqual(groups, {
    type: "COUNTER_ROW",
    description: "Ba nhóm, mỗi nhóm bốn chấm.",
    groups: 3,
    itemsPerGroup: 4,
  });

  const fraction = createCurriculumVisualSpec({
    type: "NUMBER_LINE",
    description: "Hai phân số trên trục số.",
    identity: "fractions",
    parameters: [
      { name: "leftNumerator", value: 2 },
      { name: "rightNumerator", value: 3 },
      { name: "denominator", value: 5 },
    ],
  });
  assert.equal(fraction.type, "NUMBER_LINE");
  if (fraction.type === "NUMBER_LINE") {
    assert.deepEqual(fraction.points, [0.4, 0.6]);
  }

  const onePart = createCurriculumVisualSpec({
    type: "FRACTION_BAR",
    description: "Một trong năm phần bằng nhau được tô.",
    identity: "one-part",
    parameters: [{ name: "denominator", value: 5 }],
  });
  assert.deepEqual(onePart, {
    type: "FRACTION_BAR",
    description: "Một trong năm phần bằng nhau được tô.",
    numerator: 1,
    denominator: 5,
  });

  const ratio = createCurriculumVisualSpec({
    type: "RATIO_TABLE",
    description: "Hai tỉ số tương đương.",
    identity: "ratio",
    parameters: [
      { name: "leftBase", value: 2 },
      { name: "rightBase", value: 3 },
      { name: "scale", value: 4 },
    ],
  });
  assert.equal(ratio.type, "RATIO_TABLE");
  if (ratio.type === "RATIO_TABLE") {
    assert.deepEqual(ratio.rows, [[2, 3], [8, 12]]);
  }
});

test("theory and examples render from typed contracts without prompt parsing", () => {
  for (const unit of curriculumUnits) {
    for (const item of [...unit.theory, ...unit.examples]) {
      const spec = createCurriculumVisualSpec({
        type: unit.requiredVisual,
        description: item.visualDescription,
        identity: item.id,
      });
      const markup = renderToStaticMarkup(
        createElement(CurriculumVisual, { spec }),
      );
      assert.match(markup, /<figure/u);
      assert.match(markup, /<figcaption/u);
    }
  }
  const builder = readFileSync("lib/curriculum/visual.ts", "utf8");
  assert.doesNotMatch(builder, /\bprompt\b/u);
});

test("unsupported visual kinds fail closed", () => {
  const unsupported = {
    type: "UNSUPPORTED_KIND",
    description: "Không được dựng đoán.",
  } as unknown as PreviewVisualSpec;
  const markup = renderToStaticMarkup(
    createElement(CurriculumVisual, { spec: unsupported }),
  );
  assert.match(markup, /data-visual-unsupported/u);
  assert.match(markup, /role="alert"/u);
  assert.doesNotMatch(markup, /<svg|<table/u);
});

test("preview CSS keeps visual, touch, focus and action contracts across 360, 768 and 1440 widths", () => {
  const styles = readFileSync("app/globals.css", "utf8");
  const previewRuleBodies = [
    ...styles.matchAll(/\.preview-[^{,\n]+\s*\{([^}]*)\}/gu),
  ]
    .map((match) => match[1])
    .join("\n");

  assert.doesNotMatch(
    previewRuleBodies,
    /(?:min-)?width:\s*(?:3[6-9]\d|[4-9]\d{2}|\d{4,})px/u,
  );
  assert.match(
    styles,
    /\.preview-page\s*>\s*\*\s*\{[^}]*max-width:\s*100%/u,
  );
  assert.match(
    styles,
    /\.curriculum-visual\s*\{[^}]*max-width:\s*min\(36rem,\s*100%\)/u,
  );
  assert.match(
    styles,
    /\.curriculum-visual__canvas\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/u,
  );
  assert.match(
    styles,
    /button,\s*\n\[role="button"\],[\s\S]*min-height:\s*44px/u,
  );
  assert.match(styles, /\.preview-option\s*\{[^}]*min-height:\s*48px/u);
  assert.match(styles, /\.grade-picker a\s*\{[^}]*min-height:\s*44px/u);
  assert.match(
    styles,
    /\.preview-page :where\([^)]*\)\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*word-break:\s*normal/u,
  );
  assert.match(
    styles,
    /\.preview-option:has\(input:focus-visible\)\s*\{[^}]*outline:\s*3px solid/u,
  );
  assert.match(
    styles,
    /\.preview-feedback\s*\{[^}]*padding:\s*1rem[^}]*line-height:\s*1\.6/u,
  );
  assert.match(
    styles,
    /@media \(max-width: 700px\)\s*\{[\s\S]*\.grade-picker\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)[\s\S]*\.preview-actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*1fr/u,
  );
  assert.match(
    styles,
    /\.preview-page\s*\{[^}]*env\(safe-area-inset-bottom\)/u,
  );
  assert.match(styles, /@media \(max-width: 420px\)/u);
});
