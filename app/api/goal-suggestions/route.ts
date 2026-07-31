import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/same-origin";
import {
  isGoalSuggestionUuid,
  parseGoalSuggestionRequest,
} from "@/lib/goal-suggestions/contracts";
import {
  executeGoalSuggestionRequest,
  loadGoalSuggestionStateForCurrentActor,
} from "@/lib/goal-suggestions/server";

const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu góp ý mục tiêu không hợp lệ.",
  },
};

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const rawConnectionId = request.nextUrl.searchParams.get("connectionId");
  const connectionId =
    rawConnectionId === null
      ? null
      : isGoalSuggestionUuid(rawConnectionId)
        ? rawConnectionId
        : null;

  if (rawConnectionId !== null && !connectionId) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result =
    await loadGoalSuggestionStateForCurrentActor(connectionId);
  const response = result.ok
    ? result.role === "PARENT"
      ? {
          ok: true,
          data: {
            viewerRole: result.role,
            context: result.context,
          },
        }
      : {
          ok: true,
          data: {
            viewerRole: result.role,
            state: result.state,
          },
        }
    : {
        ok: false,
        error: {
          code: result.code,
          message: result.message,
        },
      };

  return NextResponse.json(response, {
    status: result.status,
    headers: noStoreHeaders,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(invalidRequest, {
      status: 403,
      headers: noStoreHeaders,
    });
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (!Number.isFinite(contentLength) || contentLength > 4096) {
    return NextResponse.json(invalidRequest, {
      status: 413,
      headers: noStoreHeaders,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const input = parseGoalSuggestionRequest(body);
  if (!input) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = await executeGoalSuggestionRequest(input);
  const response = result.ok
    ? { ok: true, data: { suggestion: result.suggestion } }
    : {
        ok: false,
        error: {
          code: result.code,
          message: result.message,
        },
      };

  return NextResponse.json(response, {
    status: result.status,
    headers: noStoreHeaders,
  });
}
