import type { OracleCandidate } from "./types.ts";

export type SemanticVariationClass =
  | "EXACT_DUPLICATE"
  | "SURFACE_VARIATION_ONLY"
  | "PARAMETER_VARIATION"
  | "STRUCTURAL_MATHEMATICAL_VARIATION"
  | "CONTEXTUAL_VARIATION"
  | "INTERACTION_VISUAL_VARIATION";

export type SemanticDiversitySignature = Readonly<{
  exact: string;
  lexical: string;
  lexicalTemplate: string;
  parameterExact: string;
  parameterBucket: string;
  structural: string;
  context: string;
  interactionVisual: string;
  distractorFamily: string;
  difficultyDimensions: string;
  semanticIdentity: string;
}>;

function normalizeText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("vi").replaceAll("−", "-").replace(/\s+/gu, " ").trim();
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Readonly<Record<string, unknown>>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function collectNumbers(value: unknown, output: number[] = []): readonly number[] {
  if (typeof value === "number" && Number.isFinite(value)) output.push(value);
  else if (typeof value === "string") {
    for (const match of value.matchAll(/-?\d+(?:[.,]\d+)?/gu)) {
      const parsed = Number(match[0].replace(",", "."));
      if (Number.isFinite(parsed)) output.push(parsed);
    }
  }
  else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, output));
  else if (value && typeof value === "object") Object.values(value as Readonly<Record<string, unknown>>).forEach((item) => collectNumbers(item, output));
  return output;
}

function numberBucket(value: number) {
  const sign = value < 0 ? "NEG" : value > 0 ? "POS" : "ZERO";
  const magnitude = Math.abs(value);
  const band = magnitude < 1 ? "LT1" : magnitude < 10 ? "1D" : magnitude < 100 ? "2D" : magnitude < 1_000 ? "3D" : "4D_PLUS";
  return `${sign}:${Number.isInteger(value) ? "INTEGER" : "DECIMAL"}:${band}`;
}

function selectedEntries(value: unknown, keyPattern: RegExp, output: Array<readonly [string, unknown]> = [], path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => selectedEntries(item, keyPattern, output, `${path}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Readonly<Record<string, unknown>>)) {
      const next = path ? `${path}.${key}` : key;
      if (keyPattern.test(key)) output.push([next, item]);
      selectedEntries(item, keyPattern, output, next);
    }
  }
  return output;
}

function optionShape(label: string) {
  const normalized = normalizeText(label);
  if (/^-?\d+(?:[.,]\d+)?$/u.test(normalized)) return "NUMERIC";
  if (/^-?\d+\s*\/\s*-?\d+$/u.test(normalized)) return "FRACTION";
  if (/[xy²^=<>]/u.test(normalized)) return "SYMBOLIC";
  return "TEXT";
}

function promptContextFamilies(prompt: string) {
  const normalized = normalizeText(prompt);
  const families: string[] = [];
  for (const match of normalized.matchAll(/\b(?:tại|trong|ở|dựa trên)\s+([^:,.]+)/gu)) {
    const family = match[1]?.trim();
    if (family) families.push(family);
  }
  return [...new Set(families)].sort();
}

/** Builds independent evidence from public model data only. */
export function buildSemanticDiversitySignature(candidate: OracleCandidate): SemanticDiversitySignature {
  const data = candidate.publicData;
  const numbers = [
    ...collectNumbers(data),
    ...collectNumbers(candidate.visual.data),
    ...collectNumbers(candidate.interaction),
  ];
  const lexical = normalizeText(candidate.publicPrompt);
  const lexicalTemplate = lexical.replace(/-?\d+(?:[.,]\d+)?/gu, "#");
  const structuralFingerprint = normalizeText(String(data.structuralFingerprint ?? "")).replace(/-?\d+(?:[.,]\d+)?/gu, "#");
  const structuralEvidence = {
    capability: candidate.variantId,
    task: data.task ?? data.taskMode ?? null,
    operation: data.operation ?? data.query ?? null,
    unknownPosition: data.unknown ?? data.target ?? null,
    valueArity: Array.isArray(data.values) ? data.values.length : null,
    rationalArity: Array.isArray(data.rationals) ? data.rationals.length : null,
    labelArity: Array.isArray(data.labels) ? data.labels.length : null,
    constraintKeys: selectedEntries(data, /constraint|domain|relation|condition|precision|round|scale/iu).map(([path]) => path).sort(),
    structuralFingerprint,
  };
  const contexts = selectedEntries(data, /context|scenario|object|representation|unit|shape|category/iu)
    .map(([path, value]) => [path, typeof value === "string" ? normalizeText(value) : value] as const);
  const publicContext = {
    structured: contexts,
    promptScenarioFamilies: promptContextFamilies(candidate.publicPrompt),
  };
  const options = candidate.interaction.options ?? [];
  const interactionVisual = {
    interaction: candidate.interaction.type,
    optionCount: options.length,
    choiceCount: candidate.interaction.choiceCount ?? null,
    answerForm: candidate.interaction.inputMode ?? candidate.interaction.type,
    visualType: candidate.visual.type,
    visualTopology: selectedEntries(candidate.visual.data, /modelType|shape|graphKind|kind|operation|topology|pattern/iu),
  };
  const distractorFamily = stable({ count: options.length, shapes: options.map((option) => optionShape(option.label)).sort() });
  const difficultyDimensions = stable({ difficulty: candidate.difficulty, structure: data.difficultyStructure ?? null, structuralFingerprint });
  const parameterExact = stable(numbers);
  const parameterBucket = stable(numbers.map(numberBucket));
  const structural = stable(structuralEvidence);
  const context = stable(publicContext);
  const interactionVisualKey = stable(interactionVisual);
  const semanticIdentity = stable({ structural, parameterExact, context, interactionVisual: interactionVisualKey, distractorFamily, difficultyDimensions });
  return {
    exact: stable({ prompt: candidate.publicPrompt, data: candidate.publicData, interaction: candidate.interaction, visual: candidate.visual }),
    lexical,
    lexicalTemplate,
    parameterExact,
    parameterBucket,
    structural,
    context,
    interactionVisual: interactionVisualKey,
    distractorFamily,
    difficultyDimensions,
    semanticIdentity,
  };
}

export function classifySemanticVariation(left: SemanticDiversitySignature, right: SemanticDiversitySignature): SemanticVariationClass {
  if (left.exact === right.exact) return "EXACT_DUPLICATE";
  if (left.semanticIdentity === right.semanticIdentity) return "SURFACE_VARIATION_ONLY";
  if (left.structural !== right.structural) return "STRUCTURAL_MATHEMATICAL_VARIATION";
  if (left.context !== right.context) return "CONTEXTUAL_VARIATION";
  if (left.interactionVisual !== right.interactionVisual || left.distractorFamily !== right.distractorFamily) return "INTERACTION_VISUAL_VARIATION";
  return "PARAMETER_VARIATION";
}
