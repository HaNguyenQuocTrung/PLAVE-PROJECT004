import { NextResponse, type NextRequest } from "next/server";

import { completeOnboardingRequest } from "@/app/onboarding/actions";
import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { parseOnboardingSubmission } from "@/lib/onboarding/validation";

const invalidRequest = {
  ok: false,
  message: "Yêu cầu onboarding không hợp lệ.",
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(invalidRequest, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 4096) {
    return NextResponse.json(invalidRequest, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(invalidRequest, { status: 400 });
  }

  const input = parseOnboardingSubmission(body);
  if (!input) {
    return NextResponse.json(invalidRequest, { status: 400 });
  }

  const result = await completeOnboardingRequest(input);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
