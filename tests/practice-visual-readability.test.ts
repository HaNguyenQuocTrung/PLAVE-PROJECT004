import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getReadableLabelStep } from "../lib/practice/visual.ts";

test("shared measurement renderer keeps readable labels across short and long ranges", () => {
  assert.equal(getReadableLabelStep(6), 1);
  assert.equal(getReadableLabelStep(12), 1);
  assert.equal(getReadableLabelStep(24), 4);
  assert.equal(getReadableLabelStep(48), 8);
});

test("measurement renderer contract preserves endpoints, unit legend and accessibility", () => {
  const renderer = readFileSync("components/PracticeVisual.tsx", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");
  assert.match(renderer, /getReadableLabelStep\(spec\.maxValue\)/u);
  assert.match(renderer, /value === 0 \|\| value === spec\.maxValue/u);
  assert.match(renderer, /practice-visual__measurement-guide/u);
  assert.match(renderer, /practice-visual__unit-legend/u);
  assert.match(renderer, /spec\.objectLabel\} bắt đầu ở vạch/u);
  assert.match(styles, /\.practice-visual__tick-label[\s\S]*font-size: 4\.8px/u);
  assert.match(styles, /\.practice-visual__measurement-guide/u);
  assert.match(styles, /\.practice-visual__unit-legend/u);
});

test("number lines use the same density policy without removing integer ticks", () => {
  const renderer = readFileSync("components/PracticeVisual.tsx", "utf8");
  assert.match(renderer, /const labelStep = getReadableLabelStep\(spec\.end - spec\.start\)/u);
  assert.match(renderer, /value === spec\.start \|\| value === spec\.end/u);
  assert.match(renderer, /practice-visual__number-line-tick/u);
});
