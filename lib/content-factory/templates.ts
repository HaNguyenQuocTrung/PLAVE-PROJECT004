import { sha256 } from "./canonical.ts";
import type { CandidateQuestion, ExplanationSpec, FactoryGrade } from "./types.ts";

export type IntegerTemplate = Readonly<{
  id: string;
  version: string;
  grade: FactoryGrade;
  skillId: string;
  minimum: number;
  maximum: number;
  operation: "ADD" | "SUBTRACT";
  unit?: string;
}>;

function seededInteger(seed: string, offset: number, minimum: number, maximum: number) {
  const span = maximum - minimum + 1;
  return minimum + (Number.parseInt(sha256(`${seed}:${offset}`).slice(0, 8), 16) % span);
}

export function generateIntegerQuestion(template: IntegerTemplate, seed: string, fixtureOnly = false): Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }> {
  const left = seededInteger(seed, 0, template.minimum, template.maximum);
  let right = seededInteger(seed, 1, template.minimum, template.maximum);
  if (template.operation === "SUBTRACT" && right > left) right = left;
  const answer = template.operation === "ADD" ? left + right : left - right;
  const symbol = template.operation === "ADD" ? "+" : "−";
  const id = `${template.id}-${sha256(seed).slice(0, 12)}`;
  const displayAnswer = `${answer}${template.unit ? ` ${template.unit}` : ""}`;
  return {
    question: {
      id, grade: template.grade, blueprintId: `${template.id}-blueprint`, skillId: template.skillId,
      prompt: `Tính ${left} ${symbol} ${right}.`, options: null,
      answer: {
        type: "INTEGER_INPUT", exactValue: String(answer), ...(template.unit ? { unit: template.unit } : {}),
        derivation: { op: template.operation, left: { op: "VALUE", numerator: left, denominator: 1 }, right: { op: "VALUE", numerator: right, denominator: 1 } },
      },
      explanationId: `${id}-explanation`, difficulty: "CORE",
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: template.version, seed, sourceReferenceIds: ["synthetic-poc-only"] },
      reviewStatus: "GENERATED", published: false, pilotEligible: false, fixtureOnly,
    },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [`Thực hiện phép tính ${left} ${symbol} ${right}.`], finalAnswer: displayAnswer, evidenceReceiptIds: [] },
  };
}
