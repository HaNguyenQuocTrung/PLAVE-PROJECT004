import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { GENERATOR_V2_OUTCOME_REGISTRY, generateQuestion } from "@/lib/generation-v2";
import { buildFullOwnerReviewSampleSpecs, ownerReviewPublicQuestion } from "@/lib/generation-v2/owner-review";

import { GeneratorV2OwnerReview } from "./GeneratorV2OwnerReview";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "PLAVE Generator V2 · Owner usefulness review" };

export default async function GeneratorV2OwnerReviewPage() {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (process.env.NODE_ENV !== "development" || process.env.PLAVE_GENERATOR_V2_OWNER_REVIEW !== "true" || !["127.0.0.1", "localhost"].includes(host)) notFound();
  const samples = buildFullOwnerReviewSampleSpecs().map((spec) => {
    const entry = GENERATOR_V2_OUTCOME_REGISTRY.find((candidate) => candidate.outcomeId === spec.outcomeId)!;
    return {
      sampleId: spec.sampleId,
      outcomeId: spec.outcomeId,
      capabilityId: spec.capabilityId,
      variantId: entry.variantId,
      grade: spec.grade,
      domain: spec.outcomeId.includes("-NUM-") ? "NUMBERS_AND_OPERATIONS"
        : spec.outcomeId.includes("-NAA-") ? "ALGEBRA_AND_PREALGEBRA"
          : spec.outcomeId.includes("-GEO-") ? "GEOMETRY_AND_MEASUREMENT"
            : spec.outcomeId.includes("-STA-") ? "STATISTICS_AND_PROBABILITY"
              : "PRACTICE_AND_EXPERIENCE",
      title: entry.outcomeTitle,
      unitId: entry.unitId,
      family: entry.productFamilyId,
      difficulty: spec.difficulty,
      sampleNumber: spec.sampleNumber,
      question: ownerReviewPublicQuestion(generateQuestion({ outcomeId: spec.outcomeId, grade: spec.grade, difficulty: spec.difficulty, seed: spec.seed, locale: "vi-VN" })),
    };
  });
  return <GeneratorV2OwnerReview samples={samples} />;
}
