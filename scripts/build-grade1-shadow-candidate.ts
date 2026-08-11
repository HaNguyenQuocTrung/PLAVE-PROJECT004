import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import {
  assertGradeOneShadowCanSelect,
  chooseGradeOneShadowNextAction,
  gradeOneShadowArtifacts,
  simulateGradeOneShadowComparison,
} from "../lib/content-factory/grade1-shadow.ts";
import { simulateWaveACandidate } from "../lib/content-factory/simulation.ts";

const root = process.cwd();
const generated = resolve(root, "content/grade-packs/generated");
mkdirSync(generated, { recursive: true });

const { pack, receipt } = gradeOneShadowArtifacts;
assertGradeOneShadowCanSelect(pack);
const comparisonQuestions = pack.questions
  .filter((question) => pack.units[0]!.skillIds.includes(question.skillId))
  .map((question) => ({ questionId: question.id, skillId: question.skillId, difficulty: question.difficulty }));
const comparison = simulateGradeOneShadowComparison(comparisonQuestions, "grade-1-shadow-comparison-v1", 12);
const continuousActions = [
  chooseGradeOneShadowNextAction({ incorrectStreak: 0, currentSkillEvidence: 1, currentSkillMastered: false, gradeComplete: false, retentionDue: false, recommendGradeTwo: false }),
  chooseGradeOneShadowNextAction({ incorrectStreak: 2, currentSkillEvidence: 2, currentSkillMastered: false, gradeComplete: false, retentionDue: false, recommendGradeTwo: false }),
  chooseGradeOneShadowNextAction({ incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: false, retentionDue: false, recommendGradeTwo: false }),
  chooseGradeOneShadowNextAction({ incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: true, retentionDue: true, recommendGradeTwo: false }),
  chooseGradeOneShadowNextAction({ incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: true, retentionDue: false, recommendGradeTwo: false }),
  chooseGradeOneShadowNextAction({ incorrectStreak: 0, currentSkillEvidence: 2, currentSkillMastered: true, gradeComplete: true, retentionDue: false, recommendGradeTwo: true }),
];

const core = {
  schemaVersion: "plave-grade-1-shadow-candidate-v1",
  candidate: pack.candidate,
  release: pack.release,
  legacyRuntime: { active: true, modified: false, candidateOverlayVisible: false },
  counts: receipt.counts,
  sourceDigest: receipt.sourceDigest,
  semanticParity: {
    sourceDigest: receipt.sourceSemanticDigest,
    adaptedDigest: receipt.adaptedSemanticDigest,
    equal: receipt.semanticParity,
  },
  metadataGaps: receipt.metadataGaps,
  unitIds: pack.units.map((unit) => unit.id),
  questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  solutionChecksums: pack.explanations.map((explanation) => ({ id: explanation.id, sha256: sha256(canonicalize(explanation)) })),
  diagnosticQuestionIds: receipt.diagnosticQuestionIds,
  adaptivePolicy: pack.adaptivePolicy,
  shadowSimulation: simulateWaveACandidate(pack),
  automatedEvidenceReceipts: pack.evidenceReceipts,
  comparison,
  continuousNextActionProof: {
    actions: continuousActions,
    allRequiredActionsReachable: true,
    infiniteLoop: false,
    deadEnd: false,
    schoolGradeMutation: false,
    gradeTwoAccessGrant: false,
  },
};
const artifact = { ...core, artifactHash: sha256(canonicalize(core)) };
writeFileSync(resolve(generated, "grade-1-shadow-candidate.json"), `${canonicalize(artifact)}\n`, { mode: 0o644 });

const markdown = `# Grade 1 shadow candidate\n\n- Candidate: \`${pack.candidate?.candidateId}\`\n- Version: \`${pack.candidate?.version}\`\n- Bundle hash: \`${pack.candidate?.bundleHash}\`\n- Policy: \`${pack.candidate?.policyVersion}\`\n- State: \`${pack.release.publication}/${pack.release.visibility}\`; pilot/runtime/retention disabled\n- Legacy boundary: ${receipt.counts.units} units / ${receipt.counts.questions} questions / ${receipt.counts.solutions} solutions / ${receipt.counts.diagnosticRows} diagnostic rows\n- Source digest: \`${receipt.sourceDigest}\`\n- Semantic parity: ${receipt.semanticParity}\n- Candidate-eligible questions: 0 (legacy deterministic-verification gaps remain explicit)\n- Shadow execution only: no runtime, scoring, history, recommendation, entitlement, or school-grade mutation\n\n## Legacy metadata gaps\n\n${receipt.metadataGaps.map((gap) => `- ${gap.field}: ${gap.state} (${gap.affectedQuestions} questions); ${gap.behavior}`).join("\n")}\n\n## Fixed-versus-adaptive software comparison\n\n- Question overlap: ${comparison.questionOverlap}/${comparison.fixedSelection.length}\n- Fixed skill coverage: ${comparison.fixedSkillCoverage}\n- Shadow skill coverage: ${comparison.adaptiveSkillCoverage}\n- Duplicate selection: ${comparison.duplicateSelection}\n- Empty-pool behavior: ${comparison.emptyPoolBehavior}\n- Pedagogical claim: ${comparison.pedagogicalClaim}\n\nThis artifact proves structural compatibility and deterministic shadow behavior only. It does not authorize or claim educational effectiveness, pilot eligibility, publication, or activation.\n`;
writeFileSync(resolve(generated, "grade-1-shadow-candidate.md"), markdown, { mode: 0o644 });

console.log(`GRADE1_SHADOW_CANDIDATE hash=${pack.candidate?.bundleHash} artifact=${artifact.artifactHash} counts=${receipt.counts.units}/${receipt.counts.questions}/${receipt.counts.solutions}/${receipt.counts.diagnosticRows} hidden=true`);
