import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import { getGeneratorV2DatabaseProofEntries } from "@/lib/generation-v2/database-proof-runtime";
import { getStudentLearningContext } from "@/lib/practice/server";

import { GeneratorV2DatabaseRunner } from "./GeneratorV2DatabaseRunner";

export const metadata = { title: "Generator V2 database proof" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GeneratorV2DatabaseProofPage() {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAVE_GENERATOR_V2_DATABASE_PROOF !== "true" ||
    !["127.0.0.1", "localhost"].includes(host)
  ) {
    notFound();
  }
  const access = await getStudentLearningContext();
  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    return <LearningAccessState kind="FORBIDDEN" />;
  }
  const entries = getGeneratorV2DatabaseProofEntries()
    .filter((entry) => entry.grade === access.grade)
    .map((entry) => ({
      variantId: entry.variantId,
      outcomeId: entry.outcomeId,
      grade: entry.grade,
      title: entry.outcomeTitle,
      family: entry.productFamilyId,
    }));
  return <GeneratorV2DatabaseRunner entries={entries} />;
}

