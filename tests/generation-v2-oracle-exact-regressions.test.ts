import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePublicQuestion,
  parseExactNumeric,
  type OracleCandidate,
} from "../lib/generation-v2-oracle/index.ts";
import {
  generateQuestion,
  publicQuestionOnly,
} from "../lib/generation-v2/index.ts";

function candidate(outcomeId: string, grade: number, seed: string) {
  return structuredClone(publicQuestionOnly(generateQuestion({
    outcomeId,
    grade,
    difficulty: "MEDIUM",
    seed,
    locale: "vi-VN",
  }))) as unknown as OracleCandidate;
}

test("F-005 rejects a denominator-one algebra answer forced to FRACTION_INPUT", () => {
  const mutated = candidate(
    "MOET2018-G7-NAA-P057-030",
    7,
    "sprint10d3-grade7-integer-interaction",
  ) as OracleCandidate & { interaction: { type: string; inputMode?: string } };
  assert.equal(mutated.interaction.type, "INTEGER_INPUT");
  mutated.interaction.type = "FRACTION_INPUT";
  mutated.interaction.inputMode = "text";

  const result = evaluatePublicQuestion(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.includes("ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH"));
});

test("F-005 canonicalizes exact integer root spellings before solution-set comparison", () => {
  for (const suffix of [".0", ".00"] as const) {
    const mutated = candidate(
      "MOET2018-G9-NAA-P072-011",
      9,
      `sprint10d3-quadratic-decimal-root-${suffix.length}`,
    ) as OracleCandidate & {
      interaction: { options: Array<{ id: string; label: string }> };
    };
    assert.equal(mutated.interaction.type, "ORDERING");
    mutated.interaction.options = mutated.interaction.options.map((option) => ({
      ...option,
      label: /^-?\d+$/u.test(option.label) ? `${option.label}${suffix}` : option.label,
    }));

    const result = evaluatePublicQuestion(mutated);
    assert.equal(result.ok, true, result.diagnostics.join(","));
  }
});

test("exact numeric parser accepts only complete contract-authorized representations", () => {
  for (const [value, key] of [
    ["5", "5/1"],
    ["5.0", "5/1"],
    ["5.00", "5/1"],
    ["10/2", "5/1"],
    ["-0", "0/1"],
    ["-0.0", "0/1"],
    ["-3.0", "-3/1"],
    ["  5.00  ", "5/1"],
  ] as const) {
    assert.equal(parseExactNumeric(value, { allowFraction: true })?.key, key);
  }
  for (const value of ["5tail", "NaN", "Infinity", "1e3", "1/0", "", " "]) {
    assert.equal(parseExactNumeric(value, { allowFraction: true }), null);
  }
  assert.equal(parseExactNumeric("10/2", { allowFraction: false }), null);
  assert.equal(
    parseExactNumeric("1.25e2", { allowFraction: false, allowScientific: true })?.key,
    "125/1",
  );
});
