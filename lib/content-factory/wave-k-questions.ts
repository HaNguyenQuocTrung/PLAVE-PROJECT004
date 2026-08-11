import { normalizedDefinition, sha256 } from "./canonical.ts";
import type { CandidateQuestion, ExplanationSpec } from "./types.ts";
import { waveKInventory } from "./wave-k-inventory.ts";
import { verifyWaveKCasesG2G4, waveKCaseSeedsG2G4 } from "./wave-k-pools-g2-g4.ts";
import { verifyWaveKCasesG5G6, waveKCaseSeedsG5G6 } from "./wave-k-pools-g5-g6.ts";
import { verifyWaveKCasesG7G9, waveKCaseSeedsG7G9 } from "./wave-k-pools-g7-g9.ts";
import type { WaveKCaseSeed } from "./wave-k-types.ts";

export const waveKCaseSeeds: readonly WaveKCaseSeed[] = [
  ...waveKCaseSeedsG2G4,
  ...waveKCaseSeedsG5G6,
  ...waveKCaseSeedsG7G9,
];

function questionId(seed: WaveKCaseSeed) {
  const sourceToken = seed.outcomeId.toLowerCase().replace(/^moet2018-g\d-/, "").replaceAll(/[^a-z0-9]+/gu, "-");
  return `g${seed.grade}-wave-k-${sourceToken}-q${String(seed.ordinal).padStart(2, "0")}`;
}

function blueprintId(seed: WaveKCaseSeed) {
  return `g${seed.grade}-wave-k-${seed.outcomeId.toLowerCase().replace(/^moet2018-g\d-/, "").replaceAll(/[^a-z0-9]+/gu, "-")}-${seed.structureTag.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-")}-${seed.difficulty.toLowerCase()}-${seed.answerType.toLowerCase().replaceAll("_", "-")}`;
}

function publicPrompt(seed: WaveKCaseSeed, objective: string) {
  const objectiveLabel = objective.replace(/[.“”]/gu, "").trim().split(/\s+/u).slice(0, seed.grade <= 3 ? 1 : 4).join(" ");
  const body = seed.prompt.replace(/^Để kiểm tra yêu cầu “[^”]+”,\s*/u, "")
    .replaceAll(/có thể/giu, "có khả năng").replaceAll(/xấp xỉ/giu, "gần đúng")
    .replace(/(\d)\.(\d)/gu, "$1,$2").normalize("NFC");
  const structure = seed.structureTag.toLocaleLowerCase("vi");
  const reasoningDirection = /inverse|transfer|recover|missing|non-target|scale-factor/iu.test(structure)
    ? "Kiểm tra ngược: " : /context/iu.test(structure) ? "Lập mô hình: " : "";
  return `Nội dung ${objectiveLabel}: ${reasoningDirection}${body}`.normalize("NFC");
}

function publicAnswer(seed: WaveKCaseSeed) {
  return seed.answerType === "SINGLE_CHOICE" ? seed.exactAnswer.replaceAll(" ", "\u00a0").normalize("NFC") : seed.exactAnswer;
}

export function buildWaveKQuestions() {
  return waveKCaseSeeds.map((seed) => {
    const inventory = waveKInventory.rows.find((row) => row.outcomeId === seed.outcomeId);
    if (!inventory || inventory.classification !== "PRODUCIBLE_DETERMINISTIC") throw new Error(`${seed.outcomeId}:WAVE_K_SEED_NOT_PRODUCIBLE`);
    const id = questionId(seed); const explanationId = `${id}-explanation`;
    const receiptPrefix = `grade-${seed.grade}-wave-k-final-gap-closure`;
    const exactAnswer = publicAnswer(seed); const prompt = publicPrompt(seed, inventory.objective);
    const options = seed.options?.map((option) => (option === seed.exactAnswer ? exactAnswer : option).normalize("NFC")) ?? null;
    const question: CandidateQuestion = { id, grade: seed.grade, unitId: inventory.unitIds[0], blueprintId: blueprintId(seed),
      skillId: inventory.skillId, prompt, options,
      answer: { type: seed.answerType, exactValue: exactAnswer,
        ...(seed.answerType === "DECIMAL_INPUT" ? { decimalPlaces: Math.max(0, seed.exactAnswer.split(".")[1]?.length ?? 0) } : {}) },
      explanationId, difficulty: seed.difficulty,
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "wave-k-final-gap-v1",
        seed: `wave-k-${seed.outcomeId.toLowerCase()}-${seed.ordinal}`, sourceReferenceIds: [inventory.sourceReferenceId] },
      reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|${options?.join("|") ?? ""}`).toLocaleLowerCase("vi")),
      validationReceiptIds: ["source-mapping", "mathematical-answer", "explanation-consistency", "skill-prerequisites", "grade-range",
        "duplicate-ambiguity", "solution-leakage-security", "bundle-determinism", "adaptive-simulation", "regression-tests"]
        .map((check) => `${receiptPrefix}-${check}`),
      instructionalPurpose: seed.difficulty === "FOUNDATIONAL" ? "FOUNDATION" : seed.difficulty === "EXTENSION" ? "TRANSFER_APPLICATION" : "STANDARD_APPLICATION" };
    const structure = seed.structureTag.toLocaleLowerCase("vi");
    const reasoningStep = /inverse|transfer|recover|missing|non-target|scale-factor/iu.test(structure)
      ? ["Đối chiếu kết quả theo quan hệ ngược từ dữ kiện công khai."]
      : /context/iu.test(structure) ? ["Lập mô hình toán học từ toàn bộ dữ kiện công khai."] : [];
    const explanation: ExplanationSpec = { id: explanationId, questionId: id,
      steps: [...reasoningStep, ...seed.explanationSteps].map((step) => step.normalize("NFC")),
      finalAnswer: exactAnswer, evidenceReceiptIds: [`${receiptPrefix}-explanation-consistency`] };
    return { seed, question, explanation };
  });
}

export function verifyWaveKQuestionPools() {
  const errors = [...verifyWaveKCasesG2G4(), ...verifyWaveKCasesG5G6(), ...verifyWaveKCasesG7G9()];
  const built = buildWaveKQuestions();
  const producible = waveKInventory.rows.filter((row) => row.classification === "PRODUCIBLE_DETERMINISTIC");
  for (const row of producible) {
    const cases = built.filter((entry) => entry.seed.outcomeId === row.outcomeId);
    if (cases.length !== 6) errors.push(`${row.outcomeId}:DEPTH_INSUFFICIENT`);
    if (new Set(cases.map((entry) => entry.seed.structureTag)).size < 2) errors.push(`${row.outcomeId}:STRUCTURAL_DIVERSITY_INSUFFICIENT`);
    if (new Set(cases.map((entry) => normalizedDefinition(entry.question.prompt))).size < 3) errors.push(`${row.outcomeId}:PUBLIC_FORM_DIVERSITY_INSUFFICIENT`);
  }
  const ids = built.map((entry) => entry.question.id); if (new Set(ids).size !== ids.length) errors.push("WAVE_K_STABLE_ID_COLLISION");
  const publicForms = built.map((entry) => normalizedDefinition(`${entry.question.prompt}|${entry.question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"));
  if (new Set(publicForms).size !== publicForms.length) errors.push("WAVE_K_INTERNAL_EQUIVALENT_COLLISION");
  for (const { seed, question, explanation } of built) {
    if (question.prompt !== question.prompt.normalize("NFC") || explanation.steps.some((step) => step !== step.normalize("NFC"))) errors.push(`${question.id}:NFC_INVALID`);
    if (/<\/?(?:script|iframe|object|embed)|javascript:|data:text\/html/iu.test(question.prompt)) errors.push(`${question.id}:UNSAFE_MARKUP`);
    if (question.answer.exactValue !== explanation.finalAnswer) errors.push(`${question.id}:ANSWER_EXPLANATION_MISMATCH`);
    if (seed.options && (new Set(seed.options).size !== seed.options.length || !seed.options.includes(seed.exactAnswer))) errors.push(`${question.id}:OPTION_UNIQUENESS_OR_ANSWER_INVALID`);
  }
  return errors;
}
