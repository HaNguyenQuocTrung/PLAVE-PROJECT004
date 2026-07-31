import { NextResponse } from "next/server";

import {
  adaptiveApiError,
  getAdaptivePracticeState,
  type AdaptiveApiErrorCode,
  type AdaptiveRpcCall,
} from "@/lib/practice/adaptive-api";
import { parseGetAdaptivePracticeStateRequest } from "@/lib/practice/adaptive-database-contract";
import { resolveServerAdaptivePilotAccess } from "@/lib/practice/adaptive-pilot-server";
import { isSameOriginRequest } from "@/lib/practice/errors";
import { getStudentLearningContext } from "@/lib/practice/server";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonNoStore(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: noStoreHeaders,
  });
}

function errorStatus(code: AdaptiveApiErrorCode) {
  if (code === "AUTH_REQUIRED") return 401;
  if (code === "ACCESS_DENIED") return 403;
  if (code === "PRACTICE_UNAVAILABLE") return 404;
  if (code === "REQUEST_FAILED") return 502;
  return 409;
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonNoStore(adaptiveApiError("INVALID_REQUEST"), 403);
  }

  const access = await getStudentLearningContext();
  if (!access.ok) {
    const code =
      access.reason === "UNAUTHENTICATED"
        ? "AUTH_REQUIRED"
        : "ACCESS_DENIED";
    return jsonNoStore(adaptiveApiError(code), errorStatus(code));
  }

  const searchParams = new URL(request.url).searchParams;
  const input = parseGetAdaptivePracticeStateRequest({
    attemptId: searchParams.get("attemptId"),
  });
  if (!input) {
    return jsonNoStore(adaptiveApiError("INVALID_REQUEST"), 400);
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
    return jsonNoStore(adaptiveApiError("PRACTICE_UNAVAILABLE"), 404);
  }

  const rpc: AdaptiveRpcCall = async (functionName, args) => {
    const result = await access.supabase.rpc(functionName, args);
    return { data: result.data, error: result.error };
  };
  const result = await getAdaptivePracticeState(rpc, input.attemptId);
  return jsonNoStore(
    result,
    result.ok ? 200 : errorStatus(result.error.code),
  );
}
