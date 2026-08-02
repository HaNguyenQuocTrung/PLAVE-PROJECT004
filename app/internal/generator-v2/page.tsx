import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { GENERATOR_V2_OUTCOME_REGISTRY, WAVE_A_OUTCOME_CONTRACTS } from "@/lib/generation-v2";

import { GeneratorV2LocalRunner } from "./GeneratorV2LocalRunner";

export const metadata = { title: "Generator V2 local product slice" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GeneratorV2LocalPage() {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (process.env.NODE_ENV !== "development" || process.env.PLAVE_GENERATOR_V2_LOCAL !== "true" || !["127.0.0.1", "localhost"].includes(host)) notFound();
  const waveAIds = new Set(WAVE_A_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId));
  return (
    <GeneratorV2LocalRunner entries={GENERATOR_V2_OUTCOME_REGISTRY.filter((entry) => waveAIds.has(entry.outcomeId)).map((entry) => ({
      outcomeId: entry.outcomeId,
      variantId: entry.variantId,
      grade: entry.grade,
      title: entry.outcomeTitle,
      family: entry.productFamilyId,
    }))} />
  );
}
