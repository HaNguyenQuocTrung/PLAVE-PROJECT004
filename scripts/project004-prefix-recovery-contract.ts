import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  loadAndVerifyMigrationPlan,
  type MigrationPlan,
} from "./project004-remote-dev-guard.ts";
import {
  buildCanonicalPrefixSourceFingerprint,
  prefixSemanticCategories,
  prefixSemanticFingerprintVersion,
  type PrefixSemanticFingerprint,
} from "./project004-prefix-semantic-fingerprint.ts";
import type { SafeForeignObjectInspection } from "./inspect-project004-remote-foreign-object.ts";
import type { RemotePartialStateAuditReport } from "./project004-remote-partial-state-audit.ts";

export const prefixSemanticManifestPath =
  "docs/operations/PROJECT004_PREFIX_0038_SEMANTIC_FINGERPRINT.json";

export type PrefixSemanticManifest = {
  version: typeof prefixSemanticFingerprintVersion;
  prefixFirst: "0001";
  prefixLast: "0038";
  migrationCount: 38;
  canonicalSourceFingerprintSha256: string;
  canonicalCatalogStatus: "VERIFIED" | "UNVERIFIED";
  canonicalCatalogOverallSha256: string | null;
  canonicalCategoryFingerprints: Array<{
    category: string;
    count: number;
    sha256: string;
  }>;
  freshLocalIntegration: {
    migration0039: "PASS" | "UNVERIFIED";
    migration0040: "PASS" | "UNVERIFIED";
  };
  recoveryAuthorization: "NOT_AUTHORIZED";
  note: string;
};

export type RecoveryExtraObjectClassification =
  | "NONE"
  | "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS"
  | "FOREIGN_OR_UNVERIFIED";

export type ForwardRecoveryGateInput = {
  incident: RemotePartialStateAuditReport;
  semanticFingerprintMatches: boolean;
  semanticMismatchCount: number;
  extraObjectClassification: RecoveryExtraObjectClassification;
  forwardPreconditionsPass: boolean;
  migration0039FreshLocalPass: boolean;
  migration0040FreshLocalPass: boolean;
};

function isSha256(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/u.test(value)
  );
}

export function loadPrefixSemanticManifest(
  candidateRoot = process.cwd(),
) {
  const { root, plan } =
    loadAndVerifyMigrationPlan(candidateRoot);
  const raw = JSON.parse(
    readFileSync(
      resolve(root, prefixSemanticManifestPath),
      "utf8",
    ),
  ) as PrefixSemanticManifest;
  if (
    raw.version !== prefixSemanticFingerprintVersion ||
    raw.prefixFirst !== "0001" ||
    raw.prefixLast !== "0038" ||
    raw.migrationCount !== 38 ||
    raw.recoveryAuthorization !== "NOT_AUTHORIZED" ||
    raw.canonicalSourceFingerprintSha256 !==
      buildCanonicalPrefixSourceFingerprint(plan, 38)
  ) {
    throw new Error("PREFIX_SEMANTIC_MANIFEST_INVALID");
  }
  if (raw.canonicalCatalogStatus === "VERIFIED") {
    if (
      !isSha256(raw.canonicalCatalogOverallSha256) ||
      raw.canonicalCategoryFingerprints.length !==
        prefixSemanticCategories.length
    ) {
      throw new Error("PREFIX_SEMANTIC_MANIFEST_INVALID");
    }
    const seen = new Set<string>();
    for (const entry of raw.canonicalCategoryFingerprints) {
      if (
        !prefixSemanticCategories.includes(
          entry.category as never,
        ) ||
        seen.has(entry.category) ||
        !Number.isSafeInteger(entry.count) ||
        entry.count < 0 ||
        !isSha256(entry.sha256)
      ) {
        throw new Error("PREFIX_SEMANTIC_MANIFEST_INVALID");
      }
      seen.add(entry.category);
    }
  } else if (
    raw.canonicalCatalogOverallSha256 !== null ||
    raw.canonicalCategoryFingerprints.length !== 0
  ) {
    throw new Error("PREFIX_SEMANTIC_MANIFEST_INVALID");
  }
  return { root, plan, manifest: raw };
}

export function semanticFingerprintFromManifest(
  manifest: PrefixSemanticManifest,
): PrefixSemanticFingerprint | null {
  if (
    manifest.canonicalCatalogStatus !== "VERIFIED" ||
    !manifest.canonicalCatalogOverallSha256
  ) {
    return null;
  }
  return {
    version: prefixSemanticFingerprintVersion,
    categories: prefixSemanticCategories.map((category) => {
      const entry = manifest.canonicalCategoryFingerprints.find(
        (candidate) => candidate.category === category,
      );
      if (!entry) {
        throw new Error("PREFIX_SEMANTIC_MANIFEST_INVALID");
      }
      return {
        category,
        count: entry.count,
        sha256: entry.sha256,
      };
    }),
    overallSha256: manifest.canonicalCatalogOverallSha256,
  };
}

export function classifyRecoveryExtraObject(options: {
  extraObjectCount: number;
  inspection: SafeForeignObjectInspection | null;
}): RecoveryExtraObjectClassification {
  if (options.extraObjectCount === 0) return "NONE";
  const inspection = options.inspection;
  if (
    options.extraObjectCount === 1 &&
    inspection?.foreignObjectCount === 1 &&
    inspection.objectCategory === "ROUTINE" &&
    inspection.schemaCategory ===
      "PUBLIC_APPLICATION_SURFACE" &&
    inspection.ownerCategory === "PLATFORM_SUPERUSER" &&
    inspection.extensionDependencyCount === 0 &&
    inspection.platformConfigurationProvenance ===
      "SUPABASE_AUTOMATIC_RLS" &&
    inspection.automaticRlsProvenance === "YES" &&
    inspection.dataApiProvenance ===
      "NO_DIRECT_CATALOG_DEPENDENCY" &&
    inspection.safeObjectIdentifier ===
      "public.rls_auto_enable()" &&
    inspection.plaveMigrationConflict === "NO" &&
    inspection.matchingActiveEventTriggerCount === 1
  ) {
    return "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS";
  }
  return "FOREIGN_OR_UNVERIFIED";
}

function canonicalPrefixHistoryPass(
  incident: RemotePartialStateAuditReport,
) {
  return (
    incident.migration?.count === 38 &&
    incident.migration.firstLast === "0001/0038" &&
    incident.migration.contiguousPrefix === "PASS" &&
    incident.migration.prefixLast === "0038" &&
    incident.migration.missingMigrations === "0039,0040" &&
    incident.migration.foreignMigrations === 0 &&
    incident.migration.duplicateVersions === 0 &&
    (incident.migration.outOfOrderVersions === 0 ||
      incident.migration.outOfOrderVersions === "NOT_AVAILABLE")
  );
}

export function assessForwardRecoveryEligibility(
  input: ForwardRecoveryGateInput,
) {
  const effectiveExtraObjectCount =
    input.extraObjectClassification ===
    "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS"
      ? 0
      : (input.incident.schema?.extraObjects ?? -1);
  const checks = {
    canonicalPrefixHistory: canonicalPrefixHistoryPass(
      input.incident,
    ),
    semanticFingerprint:
      input.semanticFingerprintMatches &&
      input.semanticMismatchCount === 0,
    extraObjectProvenance:
      input.extraObjectClassification === "NONE" ||
      input.extraObjectClassification ===
        "PLATFORM_BASELINE_SUPABASE_AUTOMATIC_RLS",
    noEffectiveExtraObjects: effectiveExtraObjectCount === 0,
    schemaSurface:
      input.incident.schema?.missingObjects === 0 &&
      input.incident.schema.expectedForPrefix ===
        input.incident.schema.observedCanonical,
    securityBoundary:
      input.incident.schema?.rlsPrivateBoundary === "PASS",
    noIdentityOrStorageData:
      input.incident.data?.authUsers === 0 &&
      input.incident.data.storageObjects === 0 &&
      input.incident.data.syntheticUsers === 0,
    forwardPreconditions: input.forwardPreconditionsPass,
    migration0039FreshLocal:
      input.migration0039FreshLocalPass,
    migration0040FreshLocal:
      input.migration0040FreshLocalPass,
  };
  return {
    eligible: Object.values(checks).every(Boolean),
    checks,
    effectiveExtraObjectCount,
  };
}

export function buildForwardRecoveryPreconditionSql() {
  return String.raw`
begin read only;
set local statement_timeout = '20s';
with
required_prefix_relations(name) as (
  values
    ('public.curriculum_releases'),
    ('public.curriculum_release_units'),
    ('public.curriculum_release_questions'),
    ('private.curriculum_release_solutions'),
    ('public.teacher_assignments'),
    ('public.parent_student_connections'),
    ('public.curriculum_attempts')
),
future_relations(name) as (
  values
    ('public.teacher_curriculum_assignment_drafts'),
    ('public.teacher_curriculum_assignment_draft_items'),
    ('private.assignment_submission_mutations'),
    ('public.student_assignment_outcome_progress'),
    ('public.student_assignment_skill_progress'),
    ('private.curriculum_generation_runtime_secret'),
    ('public.curriculum_generated_questions'),
    ('private.curriculum_generated_solutions'),
    ('public.curriculum_generated_answers')
),
future_columns(relation_name, column_name) as (
  values
    ('public.teacher_questions', 'content_source'),
    ('public.teacher_assignments', 'content_source'),
    ('public.assignment_submissions', 'revision'),
    ('public.curriculum_attempts', 'generation_mode')
),
future_routines(signature) as (
  values
    ('public.get_teacher_curriculum_catalog(uuid,text,text,text,text,integer,integer)'),
    ('public.create_teacher_curriculum_assignment_draft(uuid,text,text,timestamp with time zone,text,text,text,text,text[],smallint,text,uuid)'),
    ('public.start_or_resume_generated_curriculum(jsonb,text,uuid)'),
    ('public.submit_generated_curriculum_answer(uuid,text,text,integer,uuid)')
)
select concat_ws(
  '|',
  'FORWARD_PRECONDITION_V1',
  (
    select count(*)
    from required_prefix_relations
    where pg_catalog.to_regclass(name) is null
  ),
  (
    select count(*)
    from future_relations
    where pg_catalog.to_regclass(name) is not null
  ),
  (
    select count(*)
    from future_columns
    where exists (
      select 1
      from pg_catalog.pg_attribute as attribute
      where attribute.attrelid =
        pg_catalog.to_regclass(future_columns.relation_name)
        and attribute.attname = future_columns.column_name
        and attribute.attnum > 0
        and not attribute.attisdropped
    )
  ),
  (
    select count(*)
    from future_routines
    where pg_catalog.to_regprocedure(signature) is not null
  ),
  (
    (select count(*) from public.curriculum_releases) +
    (select count(*) from public.curriculum_release_units) +
    (select count(*) from public.curriculum_release_questions) +
    (select count(*) from private.curriculum_release_solutions)
  ),
  (
    select count(*)
    from public.adaptive_practice_releases
    where runtime_enabled
      or controlled_pilot_enabled
      or retention_runtime_enabled
      or publication_status <> 'DRAFT'
      or student_visibility <> 'HIDDEN'
  ),
  (
    select count(*)
    from public.adaptive_practice_pilot_members
  )
);
commit;
`;
}

export function parseForwardRecoveryPrecondition(
  output: string,
) {
  const line = output
    .split(/\r?\n/u)
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .at(-1);
  const match =
    /^FORWARD_PRECONDITION_V1\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)$/u.exec(
      line ?? "",
    );
  if (!match) {
    throw new Error("FORWARD_PRECONDITION_OUTPUT_INVALID");
  }
  const values = match.slice(1).map(Number);
  if (
    values.some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    throw new Error("FORWARD_PRECONDITION_OUTPUT_INVALID");
  }
  const [
    missingPrefixRelations,
    futureRelations,
    futureColumns,
    futureRoutines,
    releaseContentRows,
    runtimeEnabledRows,
    pilotMemberRows,
  ] = values;
  return {
    pass: values.every((value) => value === 0),
    missingPrefixRelations,
    futureRelations,
    futureColumns,
    futureRoutines,
    releaseContentRows,
    runtimeEnabledRows,
    pilotMemberRows,
  };
}

export function remainingMigrationPlan(plan: MigrationPlan) {
  const remaining = plan.migrations.slice(38);
  if (
    remaining.length !== 2 ||
    remaining[0]?.version !== "0039" ||
    remaining[1]?.version !== "0040"
  ) {
    throw new Error("FORWARD_MIGRATION_PLAN_INVALID");
  }
  return remaining;
}

export function verifyForwardRecoveryDryRunOutput(
  output: string,
  plan: MigrationPlan,
) {
  const remaining = remainingMigrationPlan(plan);
  let previousPosition = -1;
  for (const entry of remaining) {
    const filePosition = output.indexOf(entry.file);
    const versionPosition =
      new RegExp(`\\b${entry.version}\\b`, "u").exec(
        output,
      )?.index ?? -1;
    const position =
      filePosition >= 0 ? filePosition : versionPosition;
    if (position < 0 || position <= previousPosition) {
      throw new Error("FORWARD_DRY_RUN_PLAN_MISMATCH");
    }
    previousPosition = position;
  }
  for (const entry of plan.migrations.slice(0, 38)) {
    if (
      output.includes(entry.file) ||
      new RegExp(`\\b${entry.version}\\b`, "u").test(output)
    ) {
      throw new Error("FORWARD_DRY_RUN_UNEXPECTED_MIGRATION");
    }
  }
  if (/include[-_ ]?seed|seed[.]sql/iu.test(output)) {
    throw new Error("FORWARD_DRY_RUN_SEED_DETECTED");
  }
  return {
    count: 2,
    first: remaining[0]?.version ?? "",
    last: remaining[1]?.version ?? "",
  };
}
