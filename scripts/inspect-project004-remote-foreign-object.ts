import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { buildProject004ForeignObjectInspectionSql } from "./project004-remote-dev-baseline.ts";
import {
  buildSupabaseCliEnvironment,
  loadAndVerifyMigrationPlan,
  project004RemoteDevContract,
  runCapturedCommand,
  withEphemeralLinkedProjectRef,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";

type InspectionCommandRunner = (
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
) => SafeCommandResult;

export type SafeForeignObjectInspection = {
  foreignObjectCount: number;
  objectCategory:
    | "SCHEMA"
    | "RELATION"
    | "ROUTINE"
    | "POLICY"
    | "TRIGGER";
  schemaCategory:
    | "PUBLIC_APPLICATION_SURFACE"
    | "PRIVATE_APPLICATION_SURFACE"
    | "FOREIGN_SCHEMA";
  ownerCategory:
    | "PLATFORM_SUPERUSER"
    | "PLATFORM_SERVICE_ROLE"
    | "APPLICATION_OR_UNKNOWN_OWNER"
    | "UNKNOWN_OWNER";
  extensionDependencyCount: number;
  platformConfigurationProvenance:
    | "SUPABASE_AUTOMATIC_RLS"
    | "UNCONFIRMED";
  automaticRlsProvenance: "YES" | "NO";
  dataApiProvenance:
    | "NO_DIRECT_CATALOG_DEPENDENCY"
    | "UNCONFIRMED";
  safeObjectIdentifier:
    | "public.rls_auto_enable()"
    | `HASH:${string}`;
  plaveMigrationConflict: "YES" | "NO";
  matchingActiveEventTriggerCount: number;
};

function fail(code: string): never {
  throw new Error(code);
}

export function resolveGuardedProject004Ref(rawOutput: string) {
  let projects: unknown;
  try {
    projects = JSON.parse(rawOutput);
  } catch {
    fail("CLI_OUTPUT_UNRECOGNIZED");
  }
  if (!Array.isArray(projects)) {
    fail("CLI_OUTPUT_UNRECOGNIZED");
  }
  const matches = projects.filter(
    (project) =>
      project &&
      typeof project === "object" &&
      "name" in project &&
      project.name === project004RemoteDevContract.projectName,
  ) as Array<Record<string, unknown>>;
  if (matches.length !== 1) {
    fail("PROJECT_NOT_FOUND_OR_UNAUTHORIZED");
  }
  const projectRef =
    typeof matches[0]?.ref === "string"
      ? matches[0].ref
      : typeof matches[0]?.id === "string"
        ? matches[0].id
        : "";
  if (!/^[a-z0-9]{20}$/u.test(projectRef)) {
    fail("PROJECT_REF_INVALID_FORMAT");
  }
  return projectRef;
}

export function parseSafeForeignObjectInspection(
  rawOutput: string,
): SafeForeignObjectInspection {
  const match =
    /INSPECTION_V1\|(\d+)\|(SCHEMA|RELATION|ROUTINE|POLICY|TRIGGER)\|(PUBLIC_APPLICATION_SURFACE|PRIVATE_APPLICATION_SURFACE|FOREIGN_SCHEMA)\|(PLATFORM_SUPERUSER|PLATFORM_SERVICE_ROLE|APPLICATION_OR_UNKNOWN_OWNER|UNKNOWN_OWNER)\|(\d+)\|(SUPABASE_AUTOMATIC_RLS|UNCONFIRMED)\|(YES|NO)\|(NO_DIRECT_CATALOG_DEPENDENCY|UNCONFIRMED)\|(public[.]rls_auto_enable[(][)]|HASH:[0-9a-f]{32})\|(YES|NO)\|(\d+)/u.exec(
      rawOutput,
    );
  if (!match) fail("CATALOG_INSPECTION_OUTPUT_UNRECOGNIZED");
  const [
    ,
    foreignObjectCount,
    objectCategory,
    schemaCategory,
    ownerCategory,
    extensionDependencyCount,
    platformConfigurationProvenance,
    automaticRlsProvenance,
    dataApiProvenance,
    safeObjectIdentifier,
    plaveMigrationConflict,
    matchingActiveEventTriggerCount,
  ] = match;
  return {
    foreignObjectCount: Number(foreignObjectCount),
    objectCategory:
      objectCategory as SafeForeignObjectInspection["objectCategory"],
    schemaCategory:
      schemaCategory as SafeForeignObjectInspection["schemaCategory"],
    ownerCategory:
      ownerCategory as SafeForeignObjectInspection["ownerCategory"],
    extensionDependencyCount: Number(
      extensionDependencyCount,
    ),
    platformConfigurationProvenance:
      platformConfigurationProvenance as SafeForeignObjectInspection["platformConfigurationProvenance"],
    automaticRlsProvenance:
      automaticRlsProvenance as SafeForeignObjectInspection["automaticRlsProvenance"],
    dataApiProvenance:
      dataApiProvenance as SafeForeignObjectInspection["dataApiProvenance"],
    safeObjectIdentifier:
      safeObjectIdentifier as SafeForeignObjectInspection["safeObjectIdentifier"],
    plaveMigrationConflict:
      plaveMigrationConflict as SafeForeignObjectInspection["plaveMigrationConflict"],
    matchingActiveEventTriggerCount: Number(
      matchingActiveEventTriggerCount,
    ),
  };
}

export function renderSafeForeignObjectInspection(
  inspection: SafeForeignObjectInspection,
) {
  return [
    "REMOTE_IDENTITY_GUARD=PASS",
    "READ_ONLY_CATALOG_INSPECTION=PASS",
    `FOREIGN_OBJECT_COUNT=${inspection.foreignObjectCount}`,
    `OBJECT_CATEGORY=${inspection.objectCategory}`,
    `SCHEMA_CATEGORY=${inspection.schemaCategory}`,
    `OWNER_CATEGORY=${inspection.ownerCategory}`,
    `EXTENSION_DEPENDENCY_COUNT=${inspection.extensionDependencyCount}`,
    `PLATFORM_CONFIGURATION_PROVENANCE=${inspection.platformConfigurationProvenance}`,
    `AUTOMATIC_RLS_PROVENANCE=${inspection.automaticRlsProvenance}`,
    `DATA_API_PROVENANCE=${inspection.dataApiProvenance}`,
    `SAFE_OBJECT_IDENTIFIER=${inspection.safeObjectIdentifier}`,
    `PLAVE_MIGRATION_CONFLICT=${inspection.plaveMigrationConflict}`,
    `MATCHING_ACTIVE_EVENT_TRIGGER_COUNT=${inspection.matchingActiveEventTriggerCount}`,
    "REMOTE_MUTATION_PERFORMED=NO",
  ].join("\n") + "\n";
}

export function inspectProject004RemoteForeignObject(options?: {
  candidateRoot?: string;
  environment?: NodeJS.ProcessEnv;
  runner?: InspectionCommandRunner;
}) {
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const environment = options?.environment ?? process.env;
  const runner = options?.runner ?? runCapturedCommand;
  const { root, plan } =
    loadAndVerifyMigrationPlan(candidateRoot);
  const cliEnvironment =
    buildSupabaseCliEnvironment(environment);
  const projectsResult = runner(
    "supabase",
    ["projects", "list", "--output", "json"],
    cliEnvironment,
  );
  if (!projectsResult.ok) fail("CLI_NOT_AUTHENTICATED");
  const projectRef = resolveGuardedProject004Ref(
    projectsResult.stdout,
  );
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "plave-project004-foreign-inspection-"),
  );
  const queryPath = join(
    temporaryDirectory,
    "catalog-inspection.sql",
  );
  try {
    writeFileSync(
      queryPath,
      buildProject004ForeignObjectInspectionSql(root, plan),
      { mode: 0o600 },
    );
    const queryResult = withEphemeralLinkedProjectRef(
      root,
      projectRef,
      () =>
        runner(
          "supabase",
          ["db", "query", "--linked", "--file", queryPath],
          cliEnvironment,
        ),
    );
    if (!queryResult.ok) fail("CATALOG_INSPECTION_FAILED");
    return parseSafeForeignObjectInspection(
      `${queryResult.stdout}\n${queryResult.stderr}`,
    );
  } finally {
    rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
}

function safeFailureOutput(error: unknown) {
  const code =
    error instanceof Error &&
    /^[A-Z][A-Z0-9_]+$/u.test(error.message)
      ? error.message
      : "UNCLASSIFIED_FAILURE";
  return (
    "REMOTE_IDENTITY_GUARD=FAIL\n" +
    "READ_ONLY_CATALOG_INSPECTION=FAIL\n" +
    `ROOT_FAILURE_CODE=${code}\n` +
    "REMOTE_MUTATION_PERFORMED=NO\n"
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    const inspection = inspectProject004RemoteForeignObject();
    process.stdout.write(
      renderSafeForeignObjectInspection(inspection),
    );
  } catch (error) {
    process.stdout.write(safeFailureOutput(error));
    process.exitCode = 1;
  }
}
