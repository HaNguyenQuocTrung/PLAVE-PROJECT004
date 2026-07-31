import { NextResponse } from "next/server";

import { getUniversalCurriculumRuntimeFlag } from "@/lib/curriculum-runtime/feature-flag";
import {
  adaptivePilotEnvironmentKeys,
  parseAdaptivePilotAllowlist,
  parseAdaptiveRuntimeFeatureFlags,
} from "@/lib/practice/adaptive-pilot";
import {
  ownerLocalHealthContract,
  type OwnerLocalHealth,
} from "@/lib/owner-local-health-contract";
import {
  getOnDemandRuntimeConfiguration,
} from "@/lib/curriculum/on-demand-feature-flag";

export const dynamic = "force-dynamic";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

function isAdaptivePilotDisabled() {
  const flags = parseAdaptiveRuntimeFeatureFlags({
    PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED:
      process.env.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED,
    PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED:
      process.env.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED,
    PLAVE_CONTROLLED_PILOT_ENABLED:
      process.env.PLAVE_CONTROLLED_PILOT_ENABLED,
    PLAVE_RETENTION_RUNTIME_ENABLED:
      process.env.PLAVE_RETENTION_RUNTIME_ENABLED,
  });
  const allowlist = parseAdaptivePilotAllowlist(
    process.env[adaptivePilotEnvironmentKeys.userIds],
  );
  return (
    flags.status === "VALID" &&
    Object.values(flags.flags).every((enabled) => !enabled) &&
    allowlist.status === "NOT_CONFIGURED"
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (
    !loopbackHosts.has(requestUrl.hostname) ||
    process.env.PLAVE_OWNER_LOCAL_DEMO !== "true"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const response: OwnerLocalHealth = {
    status: "OK",
    ...ownerLocalHealthContract,
    ownerMode: true,
    runtimeEnabled: getUniversalCurriculumRuntimeFlag().enabled,
    adaptivePilotDisabled: isAdaptivePilotDisabled(),
    onDemandGenerationEnabled:
      getOnDemandRuntimeConfiguration().enabled,
  };
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
