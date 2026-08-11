import type { AnswerContract, MathExpression, ValidationDiagnostic } from "./types.ts";

type Rational = Readonly<{ numerator: number; denominator: number }>;
function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
function normalize(numerator: number, denominator: number): Rational {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) throw new Error("UNDEFINED_EXPRESSION");
  const sign = denominator < 0 ? -1 : 1; const divisor = gcd(numerator, denominator);
  return { numerator: sign * numerator / divisor, denominator: Math.abs(denominator) / divisor };
}
export function evaluateExpression(expression: MathExpression): Rational {
  if (expression.op === "VALUE") return normalize(expression.numerator, expression.denominator);
  if (expression.op === "SQRT") {
    const value = evaluateExpression(expression.value); if (value.numerator < 0) throw new Error("INVALID_ROOT");
    const n = Math.sqrt(value.numerator); const d = Math.sqrt(value.denominator);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT");
    return normalize(n, d);
  }
  const left = evaluateExpression(expression.left); const right = evaluateExpression(expression.right);
  if (expression.op === "ADD") return normalize(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
  if (expression.op === "SUBTRACT") return normalize(left.numerator * right.denominator - right.numerator * left.denominator, left.denominator * right.denominator);
  if (expression.op === "MULTIPLY") return normalize(left.numerator * right.numerator, left.denominator * right.denominator);
  return normalize(left.numerator * right.denominator, left.denominator * right.numerator);
}

export function validateMathContract(answer: AnswerContract, entityId: string): readonly ValidationDiagnostic[] {
  const result: ValidationDiagnostic[] = [];
  if (answer.derivation) {
    try {
      const value = evaluateExpression(answer.derivation); const expected = value.denominator === 1 ? String(value.numerator) : `${value.numerator}/${value.denominator}`;
      if (answer.exactValue !== expected) result.push({ code: "CORRECT_ANSWER_DERIVATION", severity: "ERROR", entityId, message: "Declared answer differs from deterministic derivation." });
    } catch (error) { result.push({ code: error instanceof Error ? error.message : "UNDEFINED_EXPRESSION", severity: "ERROR", entityId, message: "Mathematical expression is outside its valid domain." }); }
  }
  if (answer.geometry?.kind === "TRIANGLE_SIDES") {
    const [a, b, c] = [...answer.geometry.sides].sort((x, y) => x - y);
    if (a <= 0 || a + b <= c) result.push({ code: "INVALID_GEOMETRY_CONSTRAINT", severity: "ERROR", entityId, message: "Triangle side constraints are invalid." });
  }
  return result;
}
