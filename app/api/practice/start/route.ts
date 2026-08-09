import { NextResponse } from "next/server";

import {
  parseStartPracticeInput,
  parseStartPracticeRpcResult,
  type PracticeApiSuccess,
  type StartPracticeResult,
} from "@/lib/practice/contracts";
import {
  isSameOriginRequest,
  mapPracticeRpcError,
  practiceApiError,
} from "@/lib/practice/errors";
import { resolvePracticeRuntimeAccess } from "@/lib/practice/runtime-flags";
import { getStudentLearningContext } from "@/lib/practice/server";
import { revalidateStudentLearningProjections } from "@/lib/curriculum-runtime/revalidation";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonNoStore(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: noStoreHeaders,
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonNoStore(practiceApiError("INVALID_REQUEST"), 403);
  }

  const access = await getStudentLearningContext();
  if (!access.ok) {
    const code =
      access.reason === "UNAUTHENTICATED"
        ? "AUTH_REQUIRED"
        : "ACCESS_DENIED";
    return jsonNoStore(
      practiceApiError(code),
      code === "AUTH_REQUIRED" ? 401 : 403,
    );
  }

  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return jsonNoStore(practiceApiError("INVALID_REQUEST"), 400);
  }
  const input = parseStartPracticeInput(rawInput);
  if (!input) {
    return jsonNoStore(practiceApiError("INVALID_REQUEST"), 400);
  }

  // A browser cannot use the legacy fixed-practice RPC to bypass the frozen
  // candidate's DRAFT/HIDDEN publication boundary.
  if (
    resolvePracticeRuntimeAccess(input.unitSlug).kind !==
    "FIXED_RUNTIME"
  ) {
    return jsonNoStore(practiceApiError("UNIT_UNAVAILABLE"), 404);
  }

  const { data, error } = await access.supabase.rpc(
    "start_or_resume_practice",
    { p_unit_slug: input.unitSlug },
  );

  if (error) {
    return jsonNoStore(mapPracticeRpcError(error), 400);
  }

  const result = parseStartPracticeRpcResult(data);
  if (!result) {
    return jsonNoStore(practiceApiError("REQUEST_FAILED"), 502);
  }

  revalidateStudentLearningProjections();

  const response: PracticeApiSuccess<StartPracticeResult> = {
    ok: true,
    data: result,
  };
  return jsonNoStore(response);
}
