import "server-only";

import {
  parseAdaptivePilotAvailability,
  resolveConfiguredAdaptivePilotAccess,
  type AdaptivePilotEnvironment,
  type AdaptivePilotAvailability,
} from "@/lib/practice/adaptive-pilot";
import {
  parseLearningUnit,
  type LearningUnit,
} from "@/lib/practice/contracts";
import type { AdaptiveRuntimeGate } from "@/lib/practice/runtime-flags";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type PilotAvailabilityRpc = (
  functionName: "get_adaptive_controlled_pilot_availability",
  args: Readonly<{ p_unit_slug: string }>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

export type ServerAdaptivePilotAccess =
  | Readonly<{
      kind: "DENIED";
      gate: AdaptiveRuntimeGate;
    }>
  | Readonly<{
      kind: "ALLOWED";
      gate: Extract<AdaptiveRuntimeGate, { kind: "RPC_ALLOWED" }>;
      availability: AdaptivePilotAvailability;
    }>;

function getServerAdaptivePilotEnvironment(): AdaptivePilotEnvironment {
  return {
    PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS:
      process.env.PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS,
    PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED:
      process.env.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED,
    PLAVE_CONTROLLED_PILOT_ENABLED:
      process.env.PLAVE_CONTROLLED_PILOT_ENABLED,
    PLAVE_RETENTION_RUNTIME_ENABLED:
      process.env.PLAVE_RETENTION_RUNTIME_ENABLED,
  };
}

export async function resolveServerAdaptivePilotAccess(
  userId: string,
  grade: number,
  rpc: PilotAvailabilityRpc,
  unitSlug?: string,
): Promise<ServerAdaptivePilotAccess> {
  const configured = resolveConfiguredAdaptivePilotAccess(
    userId,
    grade,
    getServerAdaptivePilotEnvironment(),
    unitSlug,
  );
  if (configured.gate.kind !== "RPC_ALLOWED" || !configured.candidate) {
    return { kind: "DENIED", gate: configured.gate };
  }

  const result = await rpc(
    "get_adaptive_controlled_pilot_availability",
    { p_unit_slug: configured.candidate.unitSlug },
  );
  const availability =
    result.error === null
      ? parseAdaptivePilotAvailability(result.data, configured.candidate)
      : null;
  if (!availability) {
    return {
      kind: "DENIED",
      gate: { kind: "DENIED", reason: "CANDIDATE_NOT_VISIBLE" },
    };
  }

  return { kind: "ALLOWED", gate: configured.gate, availability };
}

export async function loadServerAdaptivePilotUnit(
  supabase: ServerSupabaseClient,
  userId: string,
  grade: number,
): Promise<LearningUnit | null> {
  const access = await resolveServerAdaptivePilotAccess(
    userId,
    grade,
    async (functionName, args) => {
      const result = await supabase.rpc(functionName, args);
      return { data: result.data, error: result.error };
    },
  );
  if (access.kind !== "ALLOWED") return null;

  const { data, error } = await supabase
    .from("learning_units")
    .select(
      "slug, grade, title, description, learning_objectives, lesson_content, total_questions, prerequisite_unit_slug",
    )
    .eq("slug", access.availability.unitSlug)
    .eq("grade", grade)
    .eq("published", false)
    .maybeSingle();
  if (error) return null;
  return parseLearningUnit(data);
}
