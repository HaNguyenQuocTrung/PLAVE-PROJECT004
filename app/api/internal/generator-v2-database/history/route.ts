import { NextResponse } from "next/server";

import {
  isGeneratorV2DatabaseProofRequest,
  loadGeneratorV2DatabaseProofHistory,
} from "@/lib/generation-v2/database-proof-runtime";

export async function GET(request: Request) {
  if (!isGeneratorV2DatabaseProofRequest(request)) {
    return new NextResponse(null, { status: 404 });
  }
  const result = await loadGeneratorV2DatabaseProofHistory();
  if (!result.ok) {
    const status = result.reason === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, error: { code: result.reason } }, { status });
  }
  return NextResponse.json({ ok: true, data: result.history });
}

