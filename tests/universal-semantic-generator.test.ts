import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  generateAst,
  renderPrompt,
  solveAst,
  validateSemantic,
  type Family,
} from "../lib/generation-semantic/engine.ts";
import {
  buildOutcomeSemanticContract,
  generateVariantAst,
  solveVariantAst,
  validateOutcomeSemanticAlignment,
} from "../lib/generation-semantic/variant-engine.ts";

const families: Family[] = [
  "INTEGER_ARITHMETIC", "FRACTION", "DECIMAL", "RATIO_PERCENT",
  "DIVISIBILITY", "POWER_ROOT", "EXPRESSION", "EQUATION", "INEQUALITY",
  "FUNCTION", "MEASUREMENT", "GEOMETRY", "COORDINATE", "STATISTICS",
  "PROBABILITY", "WORD_PROBLEM",
];

test("every semantic family has a distinct AST, prompt, and independent solver", () => {
  const solvers = new Set<string>();
  for (const family of families) {
    const ast = generateAst(family, 7, "MEDIUM", `family-${family}`);
    assert.equal(ast.family, family);
    assert.ok(renderPrompt(ast).length > 12);
    const solved = solveAst(ast);
    assert.equal(validateSemantic(ast, family, solved.answer).ok, true);
    solvers.add(solved.solver);
  }
  assert.ok(solvers.size >= 10);
});

test("metadata relabeling cannot make addition pass another family validator", () => {
  const addition = generateAst("INTEGER_ARITHMETIC", 5, "EASY", "negative");
  for (const family of families.filter((item) => item !== "INTEGER_ARITHMETIC")) {
    const result = validateSemantic(addition, family, solveAst(addition).answer);
    assert.deepEqual(result, { ok: false, code: "SEMANTIC_FAMILY_MISMATCH" });
  }
});

test("difficulty changes actual AST complexity", () => {
  for (const family of families) {
    const values = (["EASY", "MEDIUM", "HARD"] as const).map(
      (difficulty) => generateAst(family, 7, difficulty, `difficulty-${family}`).complexity,
    );
    assert.deepEqual(values, [1, 2, 3]);
  }
});

test("outcome validator rejects a concrete AST from the wrong semantic variant", () => {
  const outcome = {
    id: "negative-ordering",
    grade: 3,
    strand: "SỐ VÀ PHÉP TÍNH",
    subdomain: "So sánh và sắp xếp số",
    description: "Sắp xếp các số theo thứ tự tăng dần.",
  };
  const contract = buildOutcomeSemanticContract(outcome);
  const ast = generateVariantAst(contract, outcome.description, 3, "EASY", "ordering");
  const receipt = solveVariantAst(contract, ast);
  assert.equal(validateOutcomeSemanticAlignment(
    contract,
    ast,
    { variant: receipt.variant, solver: receipt.solverId },
  ).ok, true);
  const relabeled = { ...ast, variant: "NUMBER_COMPARISON" as const };
  assert.equal(validateOutcomeSemanticAlignment(
    contract,
    relabeled,
    { variant: receipt.variant, solver: receipt.solverId },
  ).ok, false);
});

test("outcome-semantic proof covers every outcome and separates private solutions", async () => {
  const artifact = JSON.parse(
    await readFile("artifacts/generated-candidates/universal-semantic-1638-proof.json", "utf8"),
  );
  assert.equal(artifact.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(artifact.manifest.semanticallySupported, 546);
  assert.equal(artifact.manifest.familyFallbackCount, 0);
  assert.equal(artifact.manifest.generated, 1638);
  assert.equal(artifact.manifest.independentlySolved, 1638);
  assert.equal(artifact.manifest.familyCorrect, 1638);
  assert.equal(artifact.manifest.outcomeCorrect, 1638);
  assert.equal(artifact.manifest.semanticallyValidated, 546);
  assert.equal(artifact.manifest.difficultyTripletsValid, 546);
  assert.equal(artifact.manifest.privateSolutionLeaks, 0);
  assert.equal(Object.values(artifact.manifest.variantCounts).reduce(
    (sum: number, value) => sum + Number(value),
    0,
  ), 546);
  assert.ok(artifact.publicQuestions.every((question: Record<string, unknown>) =>
    !Object.hasOwn(question, "answer") &&
    !Object.hasOwn(question, "correctIndex") &&
    !Object.hasOwn(question, "ast")
  ));
});
