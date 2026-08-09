export const learningPersistenceSchemaCompatibilityVersion =
  "PLAVE_LEARNING_PERSISTENCE_SCHEMA_COMPATIBILITY_V1";

export type LearningPersistenceCapabilities = Readonly<{
  baseAttemptWrite: boolean;
  baseHistoryRead: boolean;
  baseParentProgressRead: boolean;
  scoringRead: boolean;
  parentScoringRead: boolean;
  motivationRead: boolean;
  parentMotivationRead: boolean;
}>;

export type LearningPersistenceCompatibility = Readonly<{
  version: typeof learningPersistenceSchemaCompatibilityVersion;
  classification:
    | "COMPLETE"
    | "BASE_PERSISTENCE_WITHOUT_ENRICHMENT"
    | "BASE_PERSISTENCE_UNAVAILABLE";
  studentHistory:
    | "AVAILABLE"
    | "AVAILABLE_BASE_ONLY"
    | "UNAVAILABLE_BASE_SCHEMA";
  parentProgress:
    | "AVAILABLE"
    | "AVAILABLE_BASE_ONLY"
    | "UNAVAILABLE_BASE_SCHEMA";
  safeCode:
    | "SCHEMA_COMPATIBLE"
    | "SCHEMA_ENRICHMENT_UNAVAILABLE"
    | "SCHEMA_REQUIRES_0038";
  safeMessage: string;
}>;

export function classifyLearningPersistenceSchema(
  capabilities: LearningPersistenceCapabilities,
): LearningPersistenceCompatibility {
  if (
    !capabilities.baseAttemptWrite ||
    !capabilities.baseHistoryRead ||
    !capabilities.baseParentProgressRead
  ) {
    return {
      version: learningPersistenceSchemaCompatibilityVersion,
      classification: "BASE_PERSISTENCE_UNAVAILABLE",
      studentHistory: "UNAVAILABLE_BASE_SCHEMA",
      parentProgress: "UNAVAILABLE_BASE_SCHEMA",
      safeCode: "SCHEMA_REQUIRES_0038",
      safeMessage:
        "The authenticated learning persistence schema is incomplete.",
    };
  }

  if (
    !capabilities.scoringRead ||
    !capabilities.parentScoringRead ||
    !capabilities.motivationRead ||
    !capabilities.parentMotivationRead
  ) {
    return {
      version: learningPersistenceSchemaCompatibilityVersion,
      classification: "BASE_PERSISTENCE_WITHOUT_ENRICHMENT",
      studentHistory: "AVAILABLE_BASE_ONLY",
      parentProgress: "AVAILABLE_BASE_ONLY",
      safeCode: "SCHEMA_ENRICHMENT_UNAVAILABLE",
      safeMessage:
        "Base learning evidence is available without optional scoring and motivation enrichment.",
    };
  }

  return {
    version: learningPersistenceSchemaCompatibilityVersion,
    classification: "COMPLETE",
    studentHistory: "AVAILABLE",
    parentProgress: "AVAILABLE",
    safeCode: "SCHEMA_COMPATIBLE",
    safeMessage: "Learning persistence and enrichment schemas are compatible.",
  };
}
