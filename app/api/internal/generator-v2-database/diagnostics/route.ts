import { NextResponse } from "next/server";

import {
  getGeneratorV2DatabaseProofDiagnostics,
  isGeneratorV2DatabaseProofRequest,
} from "@/lib/generation-v2/database-proof-runtime";

export async function GET(request: Request) {
  if (!isGeneratorV2DatabaseProofRequest(request)) {
    return new NextResponse(null, { status: 404 });
  }
  const expected = process.env.PLAVE_GENERATOR_V2_DATABASE_PROOF_SESSION ?? "";
  if (!/^[0-9a-f]{64}$/u.test(expected) || request.headers.get("x-plave-proof-session") !== expected) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: getGeneratorV2DatabaseProofDiagnostics() });
}

