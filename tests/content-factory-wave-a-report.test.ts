import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { runAutomatedRepairLoop } from "../lib/content-factory/repair.ts";
import { createOfficialSourceMap, validateOfficialSourceMap } from "../lib/content-factory/official-source-map.ts";
import { buildWaveAEvidenceRows, renderWaveAEvidenceMarkdown } from "../lib/content-factory/wave-a-report.ts";
import type { CandidateBinding } from "../lib/content-factory/types.ts";

const expectedCandidates = new Map([
  [2, "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530"],
  [3, "3962afd424c7fef5f372b0a5fe13ae4c6b82353e05c8cfeee5a206782fb878d7"],
  [4, "dd813a0f7814890de406710ffb89ae2c56199f66a3ac38668db172de26e0bb43"],
  [5, "62173fd4fbf22e919beb48f9cced020538fcb833b44f258b56ce48b861f6fbf8"],
  [6, "f3c1b317afb19a2c189d69516be4948b70d5e7e7270f9c6543db5e186d9bfea4"],
  [7, "8db398fe279459f453ec0ac4bc2b3f39e8ac52b5ed0513df8dcb532e47338bdf"],
  [8, "80d4c7352b50461268c415433eae0bbbc5907479e72cbd391354939d34eedee1"],
  [9, "5c9bb2b629b017884c2c35a05f22c6fba70950f89aca4f23f003cb3166925705"],
]);

test("Grades 2-9 machine source maps remain exact projections of the locked official inventory", () => {
  for (const grade of [2, 3, 4, 5, 6, 7, 8, 9] as const) {
    const generated = JSON.parse(readFileSync(`content/grade-packs/generated/source-map-grade-${grade}.json`, "utf8")) as { records: ReturnType<typeof createOfficialSourceMap> };
    assert.deepEqual(validateOfficialSourceMap(grade, generated.records), []);
    assert.deepEqual(generated.records, createOfficialSourceMap(grade));
    assert.ok(generated.records.every((record) => record.sourceClassification === "SOURCE_VERIFIED"));
  }
});

test("merged Wave A evidence report reconciles source coverage, candidates and deny-all state", () => {
  const rows = buildWaveAEvidenceRows(productionGradePacks);
  assert.equal(rows[0]?.automatedVerificationCapabilityGaps, 312);
  const generated = JSON.parse(readFileSync("content/grade-packs/generated/wave-a-evidence.json", "utf8")) as { rows: typeof rows };
  assert.deepEqual(generated.rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-a-evidence.md", "utf8"), renderWaveAEvidenceMarkdown(rows));
  assert.equal(rows.length, 9);
  for (const row of rows.filter((item) => item.grade >= 2)) {
    assert.equal(row.sourceEvidenceGaps, 0);
    assert.equal(row.generated, 24);
    assert.equal(row.evidenceGatePassed, 24);
    assert.equal(row.verificationInsufficient, 0);
    assert.equal(row.rejected, 0);
    assert.equal(row.duplicate, 0);
    assert.equal(row.candidateEligible, 24);
    assert.equal(row.candidate?.bundleHash, expectedCandidates.get(row.grade));
    assert.equal(row.publication, "DRAFT");
    assert.equal(row.visibility, "HIDDEN");
    assert.equal(row.pilotEnabled || row.runtimeEnabled || row.retentionEnabled, false);
    assert.equal(row.curriculumCompletionClaim, false);
  }
});

test("Grade 2-9 manifests bind the generated source maps and exact candidate tuples", () => {
  for (const pack of productionGradePacks.filter((item) => item.grade >= 2)) {
    const manifest = JSON.parse(readFileSync(`content/grade-packs/grade-${pack.grade}/manifest.json`, "utf8")) as {
      sourceMap: string;
      candidate?: CandidateBinding;
      candidateId?: string;
      packVersion: string;
      bundleHash?: string;
      policyVersion?: string;
      publication: string;
      visibility: string;
      pilotEnabled: boolean;
      runtimeEnabled: boolean;
      retentionEnabled: boolean;
    };
    assert.equal(manifest.sourceMap, `content/grade-packs/generated/source-map-grade-${pack.grade}.json`);
    const tuple = manifest.candidate ?? { candidateId: manifest.candidateId, version: manifest.packVersion, bundleHash: manifest.bundleHash, policyVersion: manifest.policyVersion };
    assert.equal(tuple.candidateId, pack.candidate?.candidateId);
    assert.equal(tuple.version, pack.candidate?.version);
    assert.equal(tuple.bundleHash, pack.candidate?.bundleHash);
    assert.equal(tuple.policyVersion, pack.candidate?.policyVersion);
    assert.equal(manifest.publication, "DRAFT");
    assert.equal(manifest.visibility, "HIDDEN");
    assert.equal(manifest.pilotEnabled || manifest.runtimeEnabled || manifest.retentionEnabled, false);
  }
});

test("all new Wave A banks cover five instructional purposes without production duplicates", () => {
  const expectedPurposes = new Set(["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"]);
  for (const pack of productionGradePacks.filter((item) => item.grade >= 3)) {
    assert.equal(pack.questions.length, 24);
    assert.deepEqual(new Set(pack.questions.map((question) => question.instructionalPurpose)), expectedPurposes);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.equal(pack.quarantinedQuestions?.length, 0);
  }
});

test("automated repair loop passes verified banks, repairs NFC only and quarantines unsafe ambiguity", () => {
  for (const pack of productionGradePacks.filter((item) => item.grade >= 3)) {
    const result = runAutomatedRepairLoop(pack);
    assert.equal(result.generated, 24);
    assert.equal(result.repaired, 0);
    assert.equal(result.evidenceGatePassed.length, 24);
    assert.equal(result.verificationInsufficient.length, 0);
  }
  const pack = productionGradePacks[2]!;
  const question = pack.questions[0]!;
  const decomposed = { ...question, prompt: question.prompt.normalize("NFD") };
  const repaired = runAutomatedRepairLoop({ ...pack, questions: [decomposed] });
  assert.equal(repaired.repaired, 1);
  assert.equal(repaired.evidenceGatePassed[0]?.prompt, question.prompt);
  const unsafe = { ...question, prompt: "Có thể chọn <script>đáp án</script>." };
  const quarantined = runAutomatedRepairLoop({ ...pack, questions: [unsafe] });
  assert.equal(quarantined.evidenceGatePassed.length, 0);
  assert.equal(quarantined.verificationInsufficient[0]?.reviewStatus, "AUTOMATED_VERIFICATION_INSUFFICIENT");
  assert.ok(quarantined.diagnostics[0]?.codes.includes("UNSAFE_MARKUP"));
});

test("cross-grade prerequisite graph is resolvable, acyclic and keeps unverified edges hypothetical", () => {
  const graph = buildPrerequisiteGraph(productionGradePacks);
  assert.equal(graph.diagnostics.some((item) => item.code === "MISSING_PREREQUISITE_REFERENCE" || item.code === "PREREQUISITE_CYCLE" || item.code === "FORWARD_GRADE_REFERENCE"), false);
  const crossGrade = graph.edges.filter((edge) => {
    const from = /(?:^g|^moet2018-g)(\d)/u.exec(edge.fromSkillId)?.[1];
    const to = /(?:^g|^moet2018-g)(\d)/u.exec(edge.toSkillId)?.[1];
    return from && to && from !== to;
  });
  assert.ok(crossGrade.length >= 8);
  assert.ok(crossGrade.every((edge) => edge.evidence === "HYPOTHESIS_REQUIRES_EVIDENCE" && edge.sourceReferenceIds.length === 0));
});

test("merged bundle artifact is canonical and replay deterministic", () => {
  const first = buildDeterministicBundle(productionGradePacks);
  const second = buildDeterministicBundle([...productionGradePacks].reverse());
  assert.deepEqual(first, second);
  assert.equal(first.bundleHash, "eb832f02ab1a3d591ae086597097a474345ffef97d2de455e6a52a1e04ab2ff0");
  assert.equal(readFileSync("content/grade-packs/generated/bundle-grades-1-2-3-4-5-6-7-8-9.json", "utf8"), `${canonicalize(first)}\n`);
});
