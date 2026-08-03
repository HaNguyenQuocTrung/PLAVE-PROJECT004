import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSemanticDiversitySignature,
  classifySemanticVariation,
  evaluatePublicQuestion,
  type OracleCandidate,
} from "../lib/generation-v2-oracle/index.ts";
import {
  generateQuestion,
  publicQuestionOnly,
} from "../lib/generation-v2/index.ts";
import { isGeneratorV2DatabaseAnswerCompatible } from "../lib/generation-v2/answer-transport.ts";
import { plotLinearEquation } from "../lib/generation-v2/linear-graph.ts";

const difficulties = ["EASY", "MEDIUM", "HARD"] as const;

function generate(outcomeId: string, grade: number, difficulty: (typeof difficulties)[number], seedNumber: number) {
  return generateQuestion({
    outcomeId,
    grade,
    difficulty,
    seed: `sprint10c-${outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(seedNumber).padStart(2, "0")}`,
    locale: "vi-VN",
  });
}

function records(value: unknown) {
  assert.ok(Array.isArray(value));
  return value as ReadonlyArray<Readonly<Record<string, unknown>>>;
}

test("Sprint 10D graph regression: every canonical line encodes y=mx+b geometry", () => {
  let nonzeroIntercepts = 0;
  let total = 0;
  for (const difficulty of difficulties) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const snapshot = generateQuestion({
        outcomeId: "MOET2018-G8-NAA-P064-012",
        grade: 8,
        difficulty,
        seed: `sprint10d-graph-${difficulty.toLowerCase()}-${seed}`,
        locale: "vi-VN",
      }).publicSnapshot;
      const candidates = records(snapshot.visual.data.candidateGraphs);
      const line = candidates.find((candidate) => candidate.kind === "LINE");
      assert.ok(line);
      const slope = Number(line.slope);
      const intercept = Number(line.intercept);
      nonzeroIntercepts += Number(intercept !== 0);
      total += 1;
      const window = line.window as Readonly<Record<string, unknown>>;
      assert.ok(window, "canonical line must expose its mathematical window");
      const points = records(line.plottedPoints);
      assert.ok(points.length >= 2, "canonical line must expose at least two clipped points");
      for (const point of points) {
        assert.ok(Math.abs(Number(point.y) - (slope * Number(point.x) + intercept)) < 1e-7);
      }
      if (intercept !== 0) {
        assert.ok(points.some((point) => Number(point.x) === 0 && Number(point.y) === intercept));
        assert.ok(points.some((point) => Number(point.y) !== slope * Number(point.x)));
      }
    }
  }
  assert.equal(total, 60);
  assert.equal(nonzeroIntercepts, 58, "reproduce the exact Sprint 10D affected count");
});

test("Sprint 10D interaction regression: Grade 7 denominator-one answers use integer input", () => {
  let denominatorOne = 0;
  for (const difficulty of difficulties) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const generated = generate("MOET2018-G7-NAA-P057-030", 7, difficulty, seed);
      const answer = generated.privateSolution.correctResponse;
      const isDenominatorOne = typeof answer === "number" || (
        typeof answer === "object" && answer !== null && !Array.isArray(answer) &&
        Number((answer as Readonly<Record<string, unknown>>).denominator) === 1
      );
      denominatorOne += Number(isDenominatorOne);
      assert.equal(generated.publicSnapshot.interaction.type, "INTEGER_INPUT");
    }
  }
  assert.equal(denominatorOne, 60);
});

test("Sprint 10D fraction regression: prompt color has a stable accessible visual region", () => {
  const colorPattern = /màu (xanh|lam|lục|vàng|tím|cam)/iu;
  let colorReferences = 0;
  for (const difficulty of difficulties) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const snapshot = generate("MOET2018-G4-NUM-P036-018", 4, difficulty, seed).publicSnapshot;
      const promptColor = snapshot.publicPrompt.match(colorPattern)?.[1]?.toLocaleLowerCase("vi");
      assert.ok(promptColor);
      colorReferences += 1;
      const regions = records(snapshot.visual.data.semanticRegions);
      const shaded = regions.find((region) => region.id === "fraction-shaded");
      assert.ok(shaded);
      assert.equal(shaded.colorLabel, promptColor);
      assert.equal(shaded.pattern, "DIAGONAL_STRIPES");
      assert.match(snapshot.visual.description, new RegExp(`màu ${promptColor}`, "iu"));
      assert.match(snapshot.accessibility.visualAlternative, /phần được tô|vạch chéo/iu);
    }
  }
  assert.equal(colorReferences, 60);
});

test("Sprint 10D oracle regression: an extra quadratic root is rejected exactly", () => {
  const generated = generate("MOET2018-G9-NAA-P072-011", 9, "MEDIUM", 1);
  const candidate = structuredClone(publicQuestionOnly(generated)) as unknown as OracleCandidate;
  assert.equal(candidate.interaction.type, "ORDERING");
  const mutated = {
    ...candidate,
    interaction: {
      ...candidate.interaction,
      options: [...(candidate.interaction.options ?? []), { id: "root-extraneous", label: "999" }],
    },
  } satisfies OracleCandidate;
  const result = evaluatePublicQuestion(mutated);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics, ["ORACLE_EXTRANEOUS_SOLUTION"]);
});

test("Sprint 10D diversity regression: full audit uses structural public-model signatures", () => {
  const source = readFileSync(new URL("../scripts/audit-generator-v2-independent-oracle.ts", import.meta.url), "utf8");
  assert.match(source, /buildSemanticDiversitySignature/u);
  assert.match(source, /structuralDiversity/u);
  assert.match(source, /contextualDiversity/u);
  assert.match(source, /visualInteractionDiversity/u);
  assert.doesNotMatch(source, /definition:\s*"same Vietnamese prompt after numeric literals are normalized"/u);
});

test("linear graph geometry supports positive, negative, zero and fractional slopes", () => {
  for (const [slope, intercept] of [[2, 3], [-2, -3], [0, 4], [0.5, -2]] as const) {
    const points = plotLinearEquation(slope, intercept);
    assert.ok(points.length >= 2);
    assert.ok(points.every((point) => Math.abs(point.y - (slope * point.x + intercept)) < 1e-7));
    assert.ok(points.some((point) => point.x === 0 && point.y === intercept));
  }
});

test("quadratic oracle reports each exact answer-set defect", () => {
  const baseline = publicQuestionOnly(generate("MOET2018-G9-NAA-P072-011", 9, "MEDIUM", 2)) as unknown as OracleCandidate;
  assert.equal(baseline.interaction.options?.length, 2);
  const mutations = [
    {
      expected: "ORACLE_MISSING_SOLUTION",
      candidate: { ...baseline, interaction: { ...baseline.interaction, options: baseline.interaction.options?.slice(0, 1) } },
    },
    {
      expected: "ORACLE_DUPLICATE_SOLUTION",
      candidate: { ...baseline, interaction: { ...baseline.interaction, options: [...(baseline.interaction.options ?? []), { id: "duplicate", label: baseline.interaction.options![0]!.label }] } },
    },
    {
      expected: "ORACLE_INVALID_SOLUTION_FORMAT",
      candidate: { ...baseline, interaction: { ...baseline.interaction, options: [{ ...baseline.interaction.options![0]!, label: "not-a-root" }, baseline.interaction.options![1]!] } },
    },
    {
      expected: "ORACLE_DOMAIN_VIOLATION",
      candidate: { ...baseline, publicData: { ...baseline.publicData, values: [0, 1, 1] } },
    },
  ] as const;
  for (const mutation of mutations) {
    assert.ok(evaluatePublicQuestion(mutation.candidate as OracleCandidate).diagnostics.includes(mutation.expected));
  }
});

test("semantic diversity distinguishes parameter-only, context, structural and visual changes", () => {
  const baseline = publicQuestionOnly(generate("MOET2018-G4-NUM-P036-018", 4, "MEDIUM", 1)) as unknown as OracleCandidate;
  const signature = buildSemanticDiversitySignature(baseline);
  const parameter = buildSemanticDiversitySignature({ ...baseline, publicData: { ...baseline.publicData, totalParts: 20, selectedParts: 5 }, visual: { ...baseline.visual, data: { ...baseline.visual.data, totalParts: 20, selectedParts: 5 } } });
  const context = buildSemanticDiversitySignature({ ...baseline, publicData: { ...baseline.publicData, representation: "một ngữ cảnh khác" } });
  const structural = buildSemanticDiversitySignature({ ...baseline, publicData: { ...baseline.publicData, operation: "COMPARE_FRACTIONS" } });
  const interaction = buildSemanticDiversitySignature({ ...baseline, interaction: { ...baseline.interaction, type: "SINGLE_CHOICE" } });
  assert.equal(classifySemanticVariation(signature, parameter), "PARAMETER_VARIATION");
  assert.equal(classifySemanticVariation(signature, context), "CONTEXTUAL_VARIATION");
  assert.equal(classifySemanticVariation(signature, structural), "STRUCTURAL_MATHEMATICAL_VARIATION");
  assert.equal(classifySemanticVariation(signature, interaction), "INTERACTION_VISUAL_VARIATION");
});

test("integer interaction accepts an integer and rejects fraction-shaped transport", () => {
  const generated = generate("MOET2018-G7-NAA-P057-030", 7, "EASY", 1);
  assert.equal(generated.publicSnapshot.interaction.type, "INTEGER_INPUT");
  assert.equal(isGeneratorV2DatabaseAnswerCompatible(generated.publicSnapshot.interaction, "-12"), true);
  assert.equal(isGeneratorV2DatabaseAnswerCompatible(generated.publicSnapshot.interaction, '{"numerator":-12,"denominator":1}'), false);
});
