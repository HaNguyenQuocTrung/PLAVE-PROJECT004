import { createHash } from "node:crypto";
import { canonicalJson, sha256 } from "../curriculum-runtime/release.ts";
import { parsePracticeVisualSpec } from "../practice/visual.ts";
import {
  GENERATION_V1_POLICY,
  GENERATION_V1_VERSION,
  type GeneratedQuestion,
  type GenerationDifficulty,
  type GenerationSkill,
  type GenerationSpec,
} from "./contracts.ts";

const range: Record<GenerationDifficulty, number> = { EASY: 100, MEDIUM: 500, HARD: 1000 };
const skills: Record<GenerationSkill, { outcome: string; generator: string }> = {
  G2_COMPOSE_TO_1000: { outcome: "MOET2018-G2-NUM-P024-001", generator: "grade2-compose-add-subtract" },
  G2_COMPARE_LENGTH: { outcome: "MOET2018-G2-GEO-P027-017", generator: "grade2-compare-order" },
  G2_READ_LENGTH: { outcome: "MOET2018-G2-GEO-P027-012", generator: "grade2-measure-cm" },
};

function hash(seed: string) { return createHash("sha256").update(seed).digest("hex"); }
function number(seed: string, max: number, offset = 0) {
  return (Number.parseInt(hash(seed).slice(0, 8), 16) % max) + offset;
}
function unique(values: readonly string[]) { return new Set(values).size === values.length; }

export function validateGenerationSpec(spec: unknown): GenerationSpec {
  if (!spec || typeof spec !== "object") throw new Error("GENERATION_SPEC_INVALID");
  const value = spec as Record<string, unknown>;
  if (value.grade !== 2 || value.locale !== "vi-VN" || value.generatorVersion !== GENERATION_V1_VERSION ||
      typeof value.seed !== "string" || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(value.seed) ||
      !Object.prototype.hasOwnProperty.call(skills, String(value.skillId)) ||
      !["EASY", "MEDIUM", "HARD"].includes(String(value.difficulty)) ||
      value.questionType !== "MULTIPLE_CHOICE" || !Number.isInteger(value.requestedCount) ||
      Number(value.requestedCount) < 1 || Number(value.requestedCount) > 100) {
    throw new Error("GENERATION_SPEC_INVALID");
  }
  const skillId = value.skillId as GenerationSkill;
  if (value.outcomeId !== skills[skillId].outcome) throw new Error("GENERATION_OUTCOME_MISMATCH");
  return value as unknown as GenerationSpec;
}

function buildQuestion(spec: GenerationSpec, index: number): GeneratedQuestion {
  const max = range[spec.difficulty];
  const seed = `${spec.seed}:${index}`;
  const skill = spec.skillId;
  let prompt: string;
  let answer: number;
  let distractors: number[];
  let steps: string[];
  let visual: Record<string, unknown> | undefined;
  if (skill === "G2_COMPOSE_TO_1000") {
    const a = number(`${seed}:a`, Math.max(10, Math.floor(max / 2)), 1);
    const b = number(`${seed}:b`, Math.max(10, Math.floor(max / 2)), 1);
    answer = a + b <= 1000 ? a + b : a;
    prompt = `Tính ${a} + ${b}.`;
    distractors = [answer - 1, answer + 1, Math.abs(a - b)].filter((v) => v >= 0 && v !== answer);
    steps = [`Đặt ${a} và ${b} cùng hàng.`, `Cộng từng hàng: ${a} + ${b}.`, `Kết quả là ${answer}.`];
  } else if (skill === "G2_COMPARE_LENGTH") {
    const left = number(`${seed}:left`, Math.max(8, Math.floor(max / 10)), 1);
    const right = left + number(`${seed}:gap`, 8, 1);
    answer = index % 2 === 0 ? right : left;
    const comparisonWord = index % 2 === 0 ? "lớn hơn" : "ngắn hơn";
    const labels = ["bút chì", "thước kẻ", "sợi dây", "dải ruy-băng", "que tính"];
    prompt = `Độ dài nào ${comparisonWord} trong mẫu ${labels[index % labels.length]} ${index + 1}: ${left} cm hay ${right} cm?`;
    distractors = [answer === right ? left : right, 0, 999];
    steps = [`So sánh ${left} và ${right}.`, `${right} lớn hơn ${left}.`, "Chọn độ dài lớn hơn."];
  } else {
    const endValue = number(`${seed}:length`, 9, 2);
    answer = endValue;
    const objects = ["Đoạn thẳng", "Dải ruy-băng", "Sợi dây", "Que tính", "Băng giấy", "Thanh gỗ", "Dây len", "Nét vẽ", "Mảnh giấy", "Que kem"];
    const objectLabel = objects[index % objects.length];
    prompt = `${objectLabel} bắt đầu ở vạch 0 và kết thúc ở vạch ${endValue}. ${objectLabel} dài bao nhiêu cm?`;
    distractors = [endValue - 1, endValue + 1, endValue + 2].filter((v) => v > 0 && v !== endValue);
    steps = [`Đọc vạch đầu là 0 cm.`, `Đọc vạch cuối là ${endValue} cm.`, `Độ dài là ${endValue} cm.`];
    visual = { kind: "SIMPLE_RULER", description: `${objectLabel} trên thước xăng-ti-mét.`, objectLabel, unitLabel: "cm", startValue: 0, endValue, maxValue: Math.max(5, endValue) };
  }
  const options = skill === "G2_COMPARE_LENGTH"
    ? [String(answer), ...distractors.map(String)].slice(0, 4)
    : [answer, ...distractors].slice(0, 4).map(String);
  if (!unique(options) || options.length !== 4) throw new Error("GENERATION_REJECTED:DISTRACTOR_DUPLICATE");
  const correctIndex = 0;
  if (visual && !parsePracticeVisualSpec(visual)) throw new Error("GENERATION_REJECTED:VISUAL_INVALID");
  const generatedId = `g2-${skill.toLowerCase()}-${hash(`${spec.seed}:${index}`).slice(0, 16)}`;
  const publicPayload = { generatedId, prompt, options, grade: 2, skillId: skill, outcomeId: spec.outcomeId, difficulty: spec.difficulty, visual };
  return { generatedId, prompt, options, correctIndex, privateSolution: { steps, explanation: steps.at(-1) ?? "" }, grade: 2, skillId: skill, outcomeId: spec.outcomeId, difficulty: spec.difficulty, provenance: { generatorId: skills[skill].generator, generatorVersion: GENERATION_V1_VERSION, seedFingerprint: hash(spec.seed).slice(0, 16), difficultyPolicy: GENERATION_V1_POLICY }, ...(visual ? { visual } : {}), canonicalHash: sha256(publicPayload) };
}

export function generateGrade2Question(specInput: unknown, index: number) {
  const spec = validateGenerationSpec(specInput);
  if (!Number.isInteger(index) || index < 0 || index >= spec.requestedCount) throw new Error("GENERATION_INDEX_INVALID");
  return buildQuestion(spec, index);
}

export function independentValidateQuestion(question: GeneratedQuestion) {
  if (question.grade !== 2 || question.options.length !== 4 || !unique(question.options) || question.correctIndex !== 0) return { ok: false as const, code: "VALIDATOR_CONTRACT" };
  if (question.skillId === "G2_COMPOSE_TO_1000") {
    const match = question.prompt.match(/^Tính (\d+) \+ (\d+)\.$/u);
    if (!match || Number(question.options[0]) !== Number(match[1]) + Number(match[2])) return { ok: false as const, code: "MATH_RECOMPUTATION_FAILED" };
  }
  if (question.skillId === "G2_COMPARE_LENGTH") {
    const values = [...question.prompt.matchAll(/(\d+) cm/g)].map((item) => Number(item[1]));
    if (values.length !== 2 || Number(question.options[0]) !== (question.prompt.includes("ngắn hơn") ? Math.min(...values) : Math.max(...values))) return { ok: false as const, code: "MATH_RECOMPUTATION_FAILED" };
  }
  if (question.skillId === "G2_READ_LENGTH" && (!question.visual || question.visual.endValue !== Number(question.options[0]))) return { ok: false as const, code: "VISUAL_PROMPT_MISMATCH" };
  if (!question.privateSolution.steps.length || !question.prompt.includes("?" ) && question.skillId !== "G2_COMPOSE_TO_1000") return { ok: false as const, code: "AMBIGUOUS_PROMPT" };
  return { ok: true as const };
}

export function generateCandidateBatch(specs: readonly GenerationSpec[]) {
  const questions: GeneratedQuestion[] = [];
  const rejected = new Map<string, number>();
  const keys = new Set<string>();
  for (const spec of specs) for (let index = 0; index < spec.requestedCount; index += 1) {
    try {
      const q = generateGrade2Question(spec, index);
      const key = canonicalJson({ prompt: q.prompt, options: [...q.options].sort(), skillId: q.skillId, difficulty: q.difficulty });
      if (keys.has(key)) { rejected.set("DUPLICATE_SEMANTIC", (rejected.get("DUPLICATE_SEMANTIC") ?? 0) + 1); continue; }
      const validation = independentValidateQuestion(q);
      if (!validation.ok) { rejected.set(validation.code, (rejected.get(validation.code) ?? 0) + 1); continue; }
      keys.add(key); questions.push(q);
    } catch (error) { const code = error instanceof Error ? error.message : "GENERATION_REJECTED"; rejected.set(code, (rejected.get(code) ?? 0) + 1); }
  }
  return { questions, rejected: [...rejected.entries()].map(([code, count]) => ({ code, count })) };
}
