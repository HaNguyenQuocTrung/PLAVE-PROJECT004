import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GENERATOR_V2_OUTCOME_REGISTRY, WAVE_E_ENGINE_VERSION, WAVE_E_OUTCOME_CONTRACTS, generateQuestion, isWaveEImplementedByNewEngine, publicQuestionOnly, validateStudentResponse } from "../lib/generation-v2/index.ts";

const matrix = JSON.parse(readFileSync("artifacts/generator-v2-wave-e/outcome-matrix.json", "utf8")); const diversity = JSON.parse(readFileSync("artifacts/generator-v2-wave-e/diversity.json", "utf8")); const report = JSON.parse(readFileSync("artifacts/generator-v2-wave-e/report.json", "utf8"));
test("Wave E locks 86 explicit contracts and 48 mathematical capabilities", () => { assert.equal(WAVE_E_OUTCOME_CONTRACTS.length, 86); assert.equal(new Set(WAVE_E_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId)).size, 86); assert.equal(new Set(WAVE_E_OUTCOME_CONTRACTS.map((contract) => contract.canonicalVariantId)).size, 48); assert.equal(WAVE_E_OUTCOME_CONTRACTS.filter(isWaveEImplementedByNewEngine).length, 84); assert.equal(WAVE_E_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === "PROVEN_V2_BASELINE").length, 2); assert.equal(matrix.count, 86); assert.equal(matrix.inventoryRecordedBeforeImplementation, true); });
test("Wave E generates, validates, and keeps private fields outside public snapshots", () => { for (const [index, contract] of WAVE_E_OUTCOME_CONTRACTS.entries()) { const q = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `wave-e-unit-${index}`, locale: "vi-VN" }); assert.equal(q.validation.ok, true); assert.equal(q.provenance.questionSource, "GENERATED_V2"); assert.equal(JSON.stringify(publicQuestionOnly(q)).includes("correctResponse"), false); assert.equal(validateStudentResponse(q, q.privateSolution.correctResponse).isCorrect, true); } });
test("Wave E new engine remains deterministic after Wave F integration", () => { const contract = WAVE_E_OUTCOME_CONTRACTS.find(isWaveEImplementedByNewEngine)!; const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM" as const, seed: "wave-e-deterministic", locale: "vi-VN" as const }; assert.equal(contract.engineVersion, WAVE_E_ENGINE_VERSION); assert.deepEqual(generateQuestion(input), generateQuestion(input)); });
test("Wave E certainty-language choices do not contain synonymous distractors", () => { const contract = WAVE_E_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "EVENT_CERTAINTY_LANGUAGE")!; for (let seed = 0; seed < 20; seed += 1) { const q = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM", seed: `certainty-language-${seed}`, locale: "vi-VN" }); const labels = q.publicSnapshot.interaction.options?.map((option) => option.label) ?? []; assert.equal(labels.includes("luôn luôn") && labels.includes("chắc chắn"), false); } });
test("Wave E relative-frequency generator separates the legacy Sprint 8C collision with public experiment evidence", () => {
  const input = (suffix: "01" | "04") => ({
    outcomeId: "MOET2018-G6-STA-P054-009",
    grade: 6,
    difficulty: "HARD" as const,
    seed: `sprint8c-moet2018-g6-sta-p054-009-hard-${suffix}`,
    locale: "vi-VN" as const,
  });
  const first = generateQuestion(input("01"));
  const second = generateQuestion(input("04"));
  const publicFingerprint = (question: ReturnType<typeof generateQuestion>) => {
    const snapshot = publicQuestionOnly(question);
    return JSON.stringify({
      prompt: snapshot.publicPrompt,
      data: snapshot.publicData,
      interaction: snapshot.interaction,
      visual: snapshot.visual,
    });
  };
  assert.notEqual(publicFingerprint(first), publicFingerprint(second));
  assert.match(first.publicSnapshot.publicPrompt, /Khi .+, biến cố “.+” xảy ra/u);
  assert.match(second.publicSnapshot.publicPrompt, /Khi .+, biến cố “.+” xảy ra/u);
  assert.deepEqual(first, generateQuestion(input("01")));
  assert.deepEqual(second, generateQuestion(input("04")));
  assert.equal(
    first.provenance.publicSnapshotHash,
    generateQuestion(input("01")).provenance.publicSnapshotHash,
  );
  assert.equal(
    second.provenance.publicSnapshotHash,
    generateQuestion(input("04")).provenance.publicSnapshotHash,
  );
});
test("Wave E theoretical-probability generator separates the Wave E audit collision with public sample-space evidence", () => {
  const input = (suffix: "04" | "09") => ({
    outcomeId: "MOET2018-G7-STA-P062-010",
    grade: 7,
    difficulty: "MEDIUM" as const,
    seed: `s8ce-moet2018-g7-sta-p062-010-medium-${suffix}`,
    locale: "vi-VN" as const,
  });
  const fingerprint = (suffix: "04" | "09") => {
    const snapshot = publicQuestionOnly(generateQuestion(input(suffix)));
    return JSON.stringify({
      prompt: snapshot.publicPrompt,
      data: snapshot.publicData,
      interaction: snapshot.interaction,
      visual: snapshot.visual,
    });
  };
  assert.notEqual(fingerprint("04"), fingerprint("09"));
  assert.deepEqual(generateQuestion(input("04")), generateQuestion(input("04")));
  assert.deepEqual(generateQuestion(input("09")), generateQuestion(input("09")));
});
test("Wave E audit records 5,160 validated samples and remains stable in the 546 registry", () => { assert.equal(diversity.result, "PASS"); assert.equal(diversity.audit.generatedSamples, 5160); assert.equal(diversity.summary.maximumExactDuplicateRate, 0); assert.ok(diversity.summary.maximumNearDuplicatePairRate <= 0.12); assert.equal(GENERATOR_V2_OUTCOME_REGISTRY.length, 546); assert.equal(report.coverage.claimsMilestone2Complete, false); });
