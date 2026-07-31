import { NextResponse } from "next/server";

import { getGeneratedPracticePilotConfiguration } from "@/lib/curriculum/generated-practice-pilot";

export const dynamic = "force-dynamic";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

function adaptivePilotDisabled() {
  return (
    process.env.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED === "false" &&
    process.env.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED === "false" &&
    process.env.PLAVE_CONTROLLED_PILOT_ENABLED === "false" &&
    process.env.PLAVE_RETENTION_RUNTIME_ENABLED === "false" &&
    (process.env.PLAVE_ADAPTIVE_PILOT_USER_IDS ?? "") === ""
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const pilot = getGeneratedPracticePilotConfiguration();
  if (!loopbackHosts.has(requestUrl.hostname) || !pilot.enabled) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(
    {
      status: "OK",
      version: "project004-generated-pilot-health-v1",
      mode: pilot.mode,
      loopbackOnly: pilot.loopbackOnly,
      targetValid: pilot.targetValid,
      allowlistValid: pilot.allowlistValid,
      allowlistCount: pilot.allowlistCount,
      adaptivePilotDisabled: adaptivePilotDisabled(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
