import test from "node:test";
import assert from "node:assert/strict";

import { parseGeneratedPracticeRuntimeConfiguration } from "../lib/curriculum/generated-practice-feature-flag.ts";

test("generated practice defaults OFF and malformed values fail closed", () => {
  assert.deepEqual(parseGeneratedPracticeRuntimeConfiguration({}), {
    enabled: false,
    mode: "OFF",
  });
  for (const input of [
    { enabled: "false", mode: "PILOT_LIVE" },
    { enabled: "TRUE", mode: "SHADOW" },
    { enabled: "true", mode: "LIVE" },
    { enabled: "true", mode: "" },
  ]) {
    assert.deepEqual(parseGeneratedPracticeRuntimeConfiguration(input), {
      enabled: false,
      mode: "OFF",
    });
  }
});

test("only explicit server modes enable generated practice", () => {
  assert.deepEqual(parseGeneratedPracticeRuntimeConfiguration({
    enabled: "true",
    mode: "SHADOW",
  }), { enabled: true, mode: "SHADOW" });
  assert.deepEqual(parseGeneratedPracticeRuntimeConfiguration({
    enabled: "true",
    mode: "PILOT_LIVE",
  }), { enabled: true, mode: "PILOT_LIVE" });
});
