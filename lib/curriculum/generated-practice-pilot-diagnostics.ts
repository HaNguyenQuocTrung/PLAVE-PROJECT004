import "server-only";

type GeneratedPilotDiagnostic = Readonly<{
  route: "/api/on-demand-curriculum/start" | "/api/on-demand-curriculum/answer";
  mode: "OFF" | "SHADOW" | "PILOT_LIVE";
  loopbackOnly: boolean;
  allowlistValid: boolean;
  allowlistCount: number;
  eligible: boolean;
  role: "STUDENT";
  schoolGrade: number;
  failureClass: string;
  outcomeId?: string;
  variantId?: string;
}>;

function stableCode(value: string) {
  return /^[A-Z0-9_-]{1,160}$/u.test(value) ? value : "UNCLASSIFIED_FAILURE";
}

export function recordGeneratedPilotDiagnostic(input: GeneratedPilotDiagnostic) {
  console.info("[generated-practice-pilot]", JSON.stringify({
    route: input.route,
    mode: input.mode,
    loopbackOnly: input.loopbackOnly,
    allowlistValid: input.allowlistValid,
    allowlistCount: input.allowlistCount,
    eligible: input.eligible,
    role: input.role,
    schoolGrade:
      Number.isInteger(input.schoolGrade) && input.schoolGrade >= 1 && input.schoolGrade <= 9
        ? input.schoolGrade
        : 0,
    failureClass: stableCode(input.failureClass),
    ...(input.outcomeId ? { outcomeId: stableCode(input.outcomeId) } : {}),
    ...(input.variantId ? { variantId: stableCode(input.variantId) } : {}),
  }));
}
