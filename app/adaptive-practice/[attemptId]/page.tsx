import { redirect } from "next/navigation";

import { LearningAccessState } from "@/components/LearningAccessState";
import {
  getAdaptivePracticeState,
  type AdaptiveRpcCall,
} from "@/lib/practice/adaptive-api";
import { parseGetAdaptivePracticeStateRequest } from "@/lib/practice/adaptive-database-contract";
import { resolveServerAdaptivePilotAccess } from "@/lib/practice/adaptive-pilot-server";
import {
  gradeTwoNumbersTo1000PublicationState,
} from "@/lib/practice/runtime-flags";
import { getStudentLearningContext } from "@/lib/practice/server";

import { AdaptivePracticeRunner } from "./AdaptivePracticeRunner";

export const metadata = {
  title: "Luyện tập theo năng lực",
};

export const dynamic = "force-dynamic";

type AdaptivePracticePageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function AdaptivePracticePage({
  params,
}: AdaptivePracticePageProps) {
  const { attemptId } = await params;
  const input = parseGetAdaptivePracticeStateRequest({ attemptId });
  if (!input) return <LearningAccessState kind="NOT_FOUND" />;

  const access = await getStudentLearningContext();
  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    if (access.reason === "ONBOARDING_REQUIRED") redirect("/onboarding");
    return (
      <LearningAccessState
        kind={
          access.reason === "ACCESS_DENIED"
            ? "FORBIDDEN"
            : "UNAVAILABLE"
        }
      />
    );
  }

  const pilotAccess = await resolveServerAdaptivePilotAccess(
    access.user.id,
    access.grade,
    async (functionName, args) => {
      const result = await access.supabase.rpc(functionName, args);
      return { data: result.data, error: result.error };
    },
  );
  if (pilotAccess.kind !== "ALLOWED") {
    return <LearningAccessState kind="NOT_FOUND" />;
  }

  const rpc: AdaptiveRpcCall = async (functionName, args) => {
    const result = await access.supabase.rpc(functionName, args);
    return { data: result.data, error: result.error };
  };
  const result = await getAdaptivePracticeState(rpc, input.attemptId);
  if (!result.ok) {
    return (
      <LearningAccessState
        kind={
          result.error.code === "PRACTICE_UNAVAILABLE"
            ? "NOT_FOUND"
            : "UNAVAILABLE"
        }
      />
    );
  }

  const { data: unit, error: unitError } = await access.supabase
    .from("learning_units")
    .select("slug, title")
    .eq("slug", result.data.unitSlug)
    .eq("grade", 2)
    .eq("published", false)
    .maybeSingle();

  if (
    unitError ||
    !unit ||
    unit.slug !== gradeTwoNumbersTo1000PublicationState.unitSlug ||
    typeof unit.title !== "string"
  ) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }

  return (
    <div className="practice-page practice-focus-shell page-shell">
      <AdaptivePracticeRunner
        initialState={result.data}
        unitTitle={unit.title}
      />
    </div>
  );
}
