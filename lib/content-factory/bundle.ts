import { canonicalize, sha256 } from "./canonical.ts";
import type { FactoryGrade, GradePack } from "./types.ts";
import { validateGradePack } from "./validation.ts";

export type FactoryBundle = Readonly<{
  format: "plave-content-bundle-v1";
  grades: readonly FactoryGrade[];
  generatedAt: null;
  manifests: readonly Readonly<{ grade: FactoryGrade; packId: string; packVersion: string; candidate: GradePack["candidate"]; fileHash: string }>[];
  bundleHash: string;
}>;

export function buildDeterministicBundle(packs: readonly GradePack[]): FactoryBundle {
  if (packs.some((pack) => pack.testOnly || pack.questions.some((question) => question.fixtureOnly))) throw new Error("TEST_FIXTURE_IN_PRODUCTION_BUNDLE");
  for (const pack of packs) {
    const blockingDiagnostics = validateGradePack(pack).filter((item) => item.severity === "ERROR" || item.severity === "WARNING");
    if (blockingDiagnostics.length > 0 || pack.questions.some((question) => question.reviewStatus === "AUTOMATED_VERIFICATION_INSUFFICIENT")) {
      throw new Error("AUTOMATED_EVIDENCE_GATE_FAILED");
    }
  }
  const ordered = [...packs].sort((a, b) => a.grade - b.grade);
  const manifests = ordered.map((pack) => ({ grade: pack.grade, packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, fileHash: sha256(canonicalize(pack)) }));
  const core = { format: "plave-content-bundle-v1" as const, grades: ordered.map((pack) => pack.grade), generatedAt: null, manifests };
  return { ...core, bundleHash: sha256(canonicalize(core)) };
}
