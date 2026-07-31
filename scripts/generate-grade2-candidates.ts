import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  GENERATION_V1_POLICY,
  GENERATION_V1_VERSION,
  type GenerationDifficulty,
  type GenerationSpec,
} from "../lib/generation-v1/contracts.ts";
import { generateCandidateBatch } from "../lib/generation-v1/grade2.ts";

const seed = "grade2-v1-sample";
const skills = [
  ["G2_COMPOSE_TO_1000", "MOET2018-G2-NUM-P024-001"],
  ["G2_COMPARE_LENGTH", "MOET2018-G2-GEO-P027-017"],
  ["G2_READ_LENGTH", "MOET2018-G2-GEO-P027-012"],
] as const;
const difficulties: GenerationDifficulty[] = ["EASY", "MEDIUM", "HARD"];
const specs = skills.flatMap(([skillId, outcomeId]) => difficulties.map((difficulty) => ({
  grade: 2 as const, skillId, outcomeId, generatorId: `grade2-${skillId.toLowerCase()}`,
  generatorVersion: GENERATION_V1_VERSION, seed: `${seed}-${skillId.toLowerCase().replaceAll("_", "-")}-${difficulty.toLowerCase()}`,
  locale: "vi-VN" as const, difficulty, questionType: "MULTIPLE_CHOICE" as const, requestedCount: 10,
} satisfies GenerationSpec)));
const result = generateCandidateBatch(specs);
const publicQuestions = result.questions.map((question) => {
  const { privateSolution, ...publicQuestion } = question;
  void privateSolution;
  return publicQuestion;
});
const privateSolutions = result.questions.map((question) => ({ generatedId: question.generatedId, ...question.privateSolution }));
const counts = Object.fromEntries(specs.map((spec) => [`${spec.skillId}/${spec.difficulty}`, result.questions.filter((q) => q.skillId === spec.skillId && q.difficulty === spec.difficulty).length]));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const artifact = {
  status: "DRAFT_REVIEW_REQUIRED",
  manifest: { schemaVersion: 1, generatorVersion: GENERATION_V1_VERSION, difficultyPolicy: GENERATION_V1_POLICY, seed, requested: 90, generated: result.questions.length, validated: result.questions.length, rejected: result.rejected.reduce((sum, item) => sum + item.count, 0), duplicate: result.rejected.find((item) => item.code.startsWith("DUPLICATE"))?.count ?? 0, counts, publicHash: hash(publicQuestions), privateHash: hash(privateSolutions) },
  publicQuestions,
  privateSolutions,
  rejections: result.rejected,
};
await mkdir("artifacts/generated-candidates", { recursive: true });
await writeFile("artifacts/generated-candidates/grade2-v1-sample.json", JSON.stringify(artifact, null, 2), { mode: 0o600 });
console.log(`GENERATED_CANDIDATE requested=90 generated=${result.questions.length} validated=${result.questions.length} rejected=${artifact.manifest.rejected} duplicate=${artifact.manifest.duplicate}`);
console.log(`COUNTS ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(" ")}`);
console.log("STATUS=DRAFT_REVIEW_REQUIRED");
