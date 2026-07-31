import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type {
  Difficulty,
  OutcomeDescriptor,
} from "../lib/generation-semantic/engine.ts";
import {
  buildOutcomeSemanticContract,
  generateVariantAst,
  OUTCOME_SEMANTIC_VARIANTS,
  solverForOutcomeVariant,
  solveVariantAst,
  validateOutcomeSemanticAlignment,
} from "../lib/generation-semantic/variant-engine.ts";

type InventoryOutcome = {
  id: string;
  grade: number;
  officialStrand: string;
  subdomain?: string;
  conciseParaphrase: string;
};

const inventory = JSON.parse(
  readFileSync(
    "docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json",
    "utf8",
  ),
) as { outcomes: InventoryOutcome[] };

test("SHADOW proves all grades and semantic variants without persistence", () => {
  const grades = new Set<number>();
  const variants = new Set<string>();
  const difficulties: Difficulty[] = [
    "EASY",
    "MEDIUM",
    "HARD",
  ];
  let validated = 0;
  for (const outcome of inventory.outcomes) {
    const descriptor: OutcomeDescriptor = {
      id: outcome.id,
      grade: outcome.grade,
      strand: outcome.officialStrand,
      subdomain: outcome.subdomain ?? "",
      description: outcome.conciseParaphrase,
    };
    const contract = buildOutcomeSemanticContract(descriptor);
    grades.add(outcome.grade);
    variants.add(contract.expectedVariant);
    for (const difficulty of difficulties) {
      const ast = generateVariantAst(
        contract,
        outcome.conciseParaphrase,
        outcome.grade,
        difficulty,
        `shadow:${outcome.id}:${difficulty}`,
      );
      const receipt = solveVariantAst(contract, ast);
      assert.equal(
        validateOutcomeSemanticAlignment(contract, ast, {
          variant: receipt.variant,
          solver: receipt.solverId,
        }).ok,
        true,
      );
      validated += 1;
    }
  }
  assert.equal(grades.size, 9);
  assert.equal(OUTCOME_SEMANTIC_VARIANTS.length, 59);
  assert.ok(
    [...variants].every((variant) =>
      OUTCOME_SEMANTIC_VARIANTS.includes(
        variant as (typeof OUTCOME_SEMANTIC_VARIANTS)[number],
      )
    ),
  );
  const representative = buildOutcomeSemanticContract({
    id: "shadow-variant-registry",
    grade: 9,
    strand: "SỐ VÀ PHÉP TÍNH",
    subdomain: "Số và phép tính",
    description: "Thực hiện phép cộng.",
  });
  for (const variant of OUTCOME_SEMANTIC_VARIANTS) {
    const contract = {
      ...representative,
      outcomeId: `shadow-${variant.toLowerCase()}`,
      expectedVariant: variant,
      expectedSolver: solverForOutcomeVariant(variant),
    };
    const ast = generateVariantAst(
      contract,
      `Bằng chứng SHADOW cho ${variant}`,
      9,
      "MEDIUM",
      `shadow:variant:${variant}`,
    );
    const receipt = solveVariantAst(contract, ast);
    assert.equal(
      validateOutcomeSemanticAlignment(contract, ast, {
        variant: receipt.variant,
        solver: receipt.solverId,
      }).ok,
      true,
      variant,
    );
  }
  assert.equal(validated, 1_638);
  const runtime = readFileSync(
    "lib/curriculum/on-demand-runtime.ts",
    "utf8",
  );
  const shadowBranch = runtime.slice(
    runtime.indexOf('configuration.mode === "SHADOW"'),
    runtime.indexOf("const signature"),
  );
  assert.doesNotMatch(shadowBranch, /\.rpc\(|start_or_resume/u);
});
