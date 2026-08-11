import { strict as assert } from "node:assert";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { gradeSevenWaveAPack } from "../lib/content-factory/grade7-wave-a.ts";
import { gradeEightWaveAPack } from "../lib/content-factory/grade8-wave-a.ts";
import { gradeNineWaveAPack } from "../lib/content-factory/grade9-wave-a.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import {
  createOfficialSourceMap,
  validateOfficialSourceMap,
} from "../lib/content-factory/official-source-map.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

const packs = [gradeSevenWaveAPack, gradeEightWaveAPack, gradeNineWaveAPack] as const;

const expectedCandidates = [
  {
    candidateId: "g7-rational-operations-wave-a-rc1",
    version: "g7-rational-operations-1.0.0-wave-a",
    bundleHash: "8db398fe279459f453ec0ac4bc2b3f39e8ac52b5ed0513df8dcb532e47338bdf",
    policyVersion: "g7-rational-operations-policy-1.0.0-wave-a",
  },
  {
    candidateId: "g8-linear-equations-wave-a-rc1",
    version: "g8-linear-equations-1.0.0-wave-a",
    bundleHash: "80d4c7352b50461268c415433eae0bbbc5907479e72cbd391354939d34eedee1",
    policyVersion: "g8-linear-equations-policy-1.0.0-wave-a",
  },
  {
    candidateId: "g9-linear-systems-wave-a-rc1",
    version: "g9-linear-systems-1.0.0-wave-a",
    bundleHash: "5c9bb2b629b017884c2c35a05f22c6fba70950f89aca4f23f003cb3166925705",
    policyVersion: "g9-linear-systems-policy-1.0.0-wave-a",
  },
] as const;

test("Grades 7-9 Wave A source maps are complete mechanical views of locked evidence", () => {
  assert.deepEqual([7, 8, 9].map((grade) => createOfficialSourceMap(grade as 7 | 8 | 9).length), [76, 76, 85]);
  for (const grade of [7, 8, 9] as const) {
    const records = createOfficialSourceMap(grade);
    assert.deepEqual(validateOfficialSourceMap(grade, records), []);
    assert.ok(records.every((record) => record.sourceClassification === "SOURCE_VERIFIED"));
    assert.ok(records.every((record) => record.sourceReference.documentId === "MOET-MATH-2018"));
  }
});

test("Grades 7-9 Wave A packs pass exact automated evidence gates and remain hidden", () => {
  for (const [index, pack] of packs.entries()) {
    assert.deepEqual(validateGradePack(pack).filter((item) => item.severity !== "INFO"), []);
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.explanations.length, 24);
    assert.equal(pack.quarantinedQuestions?.length, 0);
    assert.equal(pack.production?.evidenceGatePassed, 24);
    assert.equal(pack.production?.verificationInsufficient, 0);
    assert.equal(pack.production?.duplicate, 0);
    assert.deepEqual(pack.candidate, expectedCandidates[index]);
    assert.deepEqual(pack.release, {
      publication: "DRAFT",
      visibility: "HIDDEN",
      pilotEnabled: false,
      runtimeEnabled: false,
      retentionEnabled: false,
    });
    assert.ok(pack.questions.every((question) =>
      question.reviewStatus === "BUNDLED" &&
      !question.published &&
      !question.pilotEligible &&
      !question.fixtureOnly &&
      /^[a-f0-9]{64}$/u.test(question.duplicateFingerprint ?? "") &&
      question.validationReceiptIds?.length === 10
    ));
  }
  assert.deepEqual(validateCrossPackDuplicates(packs), []);
});

test("Grades 7-9 exact derivations, explanations and deterministic bundles replay identically", () => {
  const first = buildDeterministicBundle(packs);
  const second = buildDeterministicBundle([...packs].reverse());
  assert.equal(canonicalize(first), canonicalize(second));
  assert.match(first.bundleHash, /^[a-f0-9]{64}$/u);
  for (const pack of packs) {
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.equal(new Set(pack.questions.map((question) => canonicalize(question))).size, 24);
  }
});

test("Grades 7-9 Wave A prerequisite boundary is acyclic and source hypotheses stay labeled", () => {
  const graph = buildPrerequisiteGraph(productionGradePacks);
  assert.equal(graph.diagnostics.some((item) =>
    (item.code === "PREREQUISITE_CYCLE" || item.code === "MISSING_PREREQUISITE_REFERENCE") &&
    /moet2018-g[789]-/u.test(item.entityId)
  ), false);
  assert.ok(graph.edges.length >= 6);
  const secondaryEdges = graph.edges.filter((edge) => /^moet2018-g[789]-/u.test(edge.toSkillId));
  assert.ok(secondaryEdges.every((edge) => edge.evidence === "HYPOTHESIS_REQUIRES_EVIDENCE"));
  for (const pack of packs) {
    const waveSkills = new Set(pack.questions.map((question) => question.skillId));
    assert.ok([...waveSkills].every((skillId) => graph.edges.some((edge) => edge.toSkillId === skillId || edge.fromSkillId === skillId)));
  }
});

test("Grades 7-9 Wave A simulations cover mastery, remediation, maximum, CAS and duplicate submit behavior", () => {
  for (const pack of packs) {
    const policy = { version: pack.adaptivePolicy.version, minimumQuestions: 4, maximumQuestions: 8, masteryCorrect: 4 };
    const earlyAnswers = pack.questions.slice(0, 8).map((question, index) => ({ submissionId: `early-${index}`, questionId: question.id, correct: true }));
    const early = simulateCandidate(pack.grade, pack.questions, policy, [earlyAnswers[0]!, earlyAnswers[0]!, ...earlyAnswers.slice(1)]);
    assert.equal(early.status, "MASTERED_EARLY");
    assert.equal(early.solutionLeakage, false);
    assert.equal(early.casConflictsRejected, 1);
    assert.equal(early.duplicateSubmits, 1);
    assert.ok(early.scoring.xp > 0 && early.scoring.masteryEvidence >= 4);

    const remediation = simulateCandidate(pack.grade, pack.questions, policy, pack.questions.slice(0, 2).map((question, index) => ({ submissionId: `remediation-${index}`, questionId: question.id, correct: false })));
    assert.equal(remediation.status, "REMEDIATION_REQUIRED");

    const maximumAnswers = pack.questions.slice(0, 8).map((question, index) => ({ submissionId: `maximum-${index}`, questionId: question.id, correct: false }));
    const maximum = simulateCandidate(pack.grade, pack.questions, policy, [...maximumAnswers, maximumAnswers[0]!]);
    assert.equal(maximum.status, "MAXIMUM_REACHED");
  }
});
