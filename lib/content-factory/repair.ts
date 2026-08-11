import { normalizedDefinition, sha256 } from "./canonical.ts";
import type { CandidateQuestion, GradePack } from "./types.ts";
import { validateCandidateQuestion } from "./validation.ts";

export type AutomatedRepairResult = Readonly<{
  generated: number;
  repaired: number;
  evidenceGatePassed: readonly CandidateQuestion[];
  verificationInsufficient: readonly CandidateQuestion[];
  diagnostics: readonly Readonly<{ questionId: string; codes: readonly string[] }>[];
}>;

function canonicalFingerprint(question: Pick<CandidateQuestion, "prompt" | "options">) {
  return sha256(
    normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"),
  );
}

function safeRepresentationRepair(question: CandidateQuestion): CandidateQuestion {
  const prompt = question.prompt.normalize("NFC");
  const options = question.options?.map((option) => option.normalize("NFC")) ?? null;
  return {
    ...question,
    prompt,
    options,
    duplicateFingerprint: canonicalFingerprint({ prompt, options }),
  };
}

export function runAutomatedRepairLoop(pack: GradePack): AutomatedRepairResult {
  const evidenceGatePassed: CandidateQuestion[] = [];
  const verificationInsufficient: CandidateQuestion[] = [];
  const diagnostics: { questionId: string; codes: string[] }[] = [];
  let repaired = 0;
  for (const original of pack.questions) {
    let candidate = original;
    let findings = validateCandidateQuestion(candidate, pack);
    if (findings.some((item) => item.code === "NON_NFC")) {
      candidate = safeRepresentationRepair(candidate);
      repaired += 1;
      findings = validateCandidateQuestion(candidate, { ...pack, questions: pack.questions.map((question) => question.id === candidate.id ? candidate : question) });
    }
    const blocking = findings.filter((item) => item.severity === "ERROR" || item.severity === "WARNING");
    if (blocking.length === 0) evidenceGatePassed.push(candidate);
    else {
      verificationInsufficient.push({
        ...candidate,
        reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT",
        published: false,
        pilotEligible: false,
      });
      diagnostics.push({ questionId: candidate.id, codes: blocking.map((item) => item.code) });
    }
  }
  return {
    generated: pack.questions.length,
    repaired,
    evidenceGatePassed,
    verificationInsufficient,
    diagnostics,
  };
}
