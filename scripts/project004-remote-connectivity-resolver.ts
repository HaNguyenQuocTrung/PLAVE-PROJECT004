import {
  RemoteDevGuardFailure,
  buildRemoteDatabaseEnvironment,
  buildSupabaseCliEnvironment,
  project004RemoteDevContract,
  type ProjectRecord,
  type RemoteDevPrivateConfig,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";

export type RemoteConnectivityFailureCode =
  | "NONE"
  | "PROJECT_NOT_ACTIVE"
  | "DNS_RESOLUTION_FAILED"
  | "NETWORK_UNREACHABLE"
  | "TLS_FAILED"
  | "DATABASE_PASSWORD_INVALID"
  | "DIRECT_IPV6_UNAVAILABLE"
  | "POOLER_UNAVAILABLE"
  | "CONNECTION_TIMEOUT"
  | "DATABASE_CONNECTION_REFUSED"
  | "DATABASE_ERROR_UNRECOGNIZED";

export type RemoteConnectivityEndpointMode =
  | "DIRECT"
  | "POOLER_SESSION"
  | "NONE";

export type RemoteConnectivityCommandRunner = (
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
) => SafeCommandResult;

export type ResolvedRemoteDatabaseEndpoint = {
  mode: Exclude<RemoteConnectivityEndpointMode, "NONE">;
  host: string;
  port: "5432";
  user: string;
  sslMode: "require";
};

export type RemoteConnectivityResolutionEvidence = {
  endpointMode: RemoteConnectivityEndpointMode;
  directConnectivity: "PASS" | "FAIL";
  directFailureCode: RemoteConnectivityFailureCode;
  poolerFallback: "PASS" | "FAIL" | "NOT_RUN";
  poolerFailureCode: RemoteConnectivityFailureCode | "NOT_RUN";
  readOnlySelect1: "PASS" | "FAIL";
};

export type RemoteConnectivityResolution = {
  endpoint: ResolvedRemoteDatabaseEndpoint;
  evidence: RemoteConnectivityResolutionEvidence;
};

export class RemoteConnectivityResolutionError extends RemoteDevGuardFailure {
  readonly evidence: RemoteConnectivityResolutionEvidence;

  constructor(
    code: RemoteConnectivityFailureCode,
    evidence: RemoteConnectivityResolutionEvidence,
  ) {
    super(code);
    this.evidence = evidence;
  }
}

const connectivityPayload =
  "PROJECT004_REMOTE_CONNECTIVITY_V1|1";

export const project004RemoteConnectivitySql = String.raw`
begin read only;
set local statement_timeout = '10s';
select 'PROJECT004_REMOTE_CONNECTIVITY_V1|' || (select 1)::text;
rollback;
`;

export const project004RemoteConnectivityPsqlArgs = [
  "--no-psqlrc",
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--set",
  "ON_ERROR_STOP=1",
  "--command",
  project004RemoteConnectivitySql,
] as const;

function combinedOutput(result: SafeCommandResult) {
  return `${result.stdout}\n${result.stderr}`;
}

export function classifyRemoteConnectivityFailure(
  result: SafeCommandResult,
  mode: Exclude<RemoteConnectivityEndpointMode, "NONE">,
): RemoteConnectivityFailureCode {
  if (result.timedOut) {
    return "CONNECTION_TIMEOUT";
  }
  const output = combinedOutput(result);
  if (
    /password authentication failed|invalid password|password rejected/iu.test(
      output,
    )
  ) {
    return "DATABASE_PASSWORD_INVALID";
  }
  if (
    /could not translate host name|name or service not known|nodename nor servname provided|temporary failure in name resolution|no address associated with hostname/iu.test(
      output,
    )
  ) {
    return "DNS_RESOLUTION_FAILED";
  }
  if (
    /ssl error|tls error|certificate verify failed|certificate validation failed|server does not support ssl|ssl handshake/iu.test(
      output,
    )
  ) {
    return "TLS_FAILED";
  }
  if (/connection refused/iu.test(output)) {
    return "DATABASE_CONNECTION_REFUSED";
  }
  if (/network is unreachable|no route to host/iu.test(output)) {
    return mode === "DIRECT"
      ? "DIRECT_IPV6_UNAVAILABLE"
      : "NETWORK_UNREACHABLE";
  }
  if (
    /connection timed out|timed out|timeout expired|connect timeout|operation timed out/iu.test(
      output,
    )
  ) {
    const ipv6AddressObserved =
      /(?:^|[\s(])(?:[0-9a-f]{0,4}:){2,}[0-9a-f:]{0,}(?:[\s),]|$)/iu.test(
        output,
      );
    return mode === "DIRECT" && ipv6AddressObserved
      ? "DIRECT_IPV6_UNAVAILABLE"
      : "CONNECTION_TIMEOUT";
  }
  if (
    mode === "POOLER_SESSION" &&
    /tenant or user not found|supavisor|pooler unavailable/iu.test(
      output,
    )
  ) {
    return "POOLER_UNAVAILABLE";
  }
  return "DATABASE_ERROR_UNRECOGNIZED";
}

function responsePassed(result: SafeCommandResult) {
  if (!result.ok) return false;
  return (
    result.stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line === connectivityPayload).length === 1
  );
}

function projectRecordRef(record: ProjectRecord) {
  return typeof record.ref === "string"
    ? record.ref
    : typeof record.id === "string"
      ? record.id
      : "";
}

export function selectProject004ConnectivityProject(
  records: readonly ProjectRecord[],
  config: RemoteDevPrivateConfig,
) {
  const matches = records.filter(
    (record) => projectRecordRef(record) === config.projectRef,
  );
  if (
    matches.length !== 1 ||
    matches[0]?.name !== project004RemoteDevContract.projectName
  ) {
    throw new RemoteDevGuardFailure(
      matches.length === 0
        ? "PROJECT_NOT_FOUND_OR_UNAUTHORIZED"
        : "REMOTE_NAME_MISMATCH",
    );
  }
  const project = matches[0];
  const status =
    typeof project.status === "string"
      ? project.status.toUpperCase()
      : "";
  if (
    !["ACTIVE_HEALTHY", "ACTIVE", "HEALTHY"].includes(status)
  ) {
    throw new RemoteDevGuardFailure("PROJECT_NOT_ACTIVE");
  }
  return project;
}

function poolerRegion(project: ProjectRecord) {
  const value =
    typeof project.region === "string"
      ? project.region.trim().toLowerCase()
      : "";
  return /^[a-z]{2}(?:-[a-z0-9]+)+-[0-9]$/u.test(value)
    ? value
    : null;
}

function directEndpoint(
  config: RemoteDevPrivateConfig,
): ResolvedRemoteDatabaseEndpoint {
  return {
    mode: "DIRECT",
    host: `db.${config.projectRef}.supabase.co`,
    port: "5432",
    user: "postgres",
    sslMode: "require",
  };
}

function poolerEndpoint(
  config: RemoteDevPrivateConfig,
  region: string,
): ResolvedRemoteDatabaseEndpoint {
  return {
    mode: "POOLER_SESSION",
    host: `aws-0-${region}.pooler.supabase.com`,
    port: "5432",
    user: `postgres.${config.projectRef}`,
    sslMode: "require",
  };
}

export function assertResolvedRemoteDatabaseEndpoint(
  config: RemoteDevPrivateConfig,
  endpoint: ResolvedRemoteDatabaseEndpoint,
) {
  const direct = directEndpoint(config);
  if (
    endpoint.mode === "DIRECT" &&
    endpoint.host === direct.host &&
    endpoint.port === direct.port &&
    endpoint.user === direct.user &&
    endpoint.sslMode === "require"
  ) {
    return;
  }
  if (
    endpoint.mode === "POOLER_SESSION" &&
    /^aws-0-[a-z]{2}(?:-[a-z0-9]+)+-[0-9][.]pooler[.]supabase[.]com$/u.test(
      endpoint.host,
    ) &&
    endpoint.port === "5432" &&
    endpoint.user === `postgres.${config.projectRef}` &&
    endpoint.sslMode === "require"
  ) {
    return;
  }
  throw new RemoteDevGuardFailure(
    "REMOTE_CONNECTIVITY_ENDPOINT_INVALID",
  );
}

export function buildResolvedRemoteDatabaseEnvironment(
  config: RemoteDevPrivateConfig,
  endpoint: ResolvedRemoteDatabaseEndpoint,
  environment: NodeJS.ProcessEnv = process.env,
) {
  assertResolvedRemoteDatabaseEndpoint(config, endpoint);
  return {
    ...buildRemoteDatabaseEnvironment(config, environment),
    PGHOST: endpoint.host,
    PGPORT: endpoint.port,
    PGUSER: endpoint.user,
    PGSSLMODE: endpoint.sslMode,
    LC_ALL: "C",
    LANG: "C",
  };
}

export function buildResolvedRemoteCliEnvironment(
  config: RemoteDevPrivateConfig,
  endpoint: ResolvedRemoteDatabaseEndpoint,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const databaseEnvironment =
    buildResolvedRemoteDatabaseEnvironment(
      config,
      endpoint,
      environment,
    );
  return {
    ...buildSupabaseCliEnvironment(environment),
    PGHOST: databaseEnvironment.PGHOST,
    PGPORT: databaseEnvironment.PGPORT,
    PGUSER: databaseEnvironment.PGUSER,
    PGPASSWORD: databaseEnvironment.PGPASSWORD,
    PGDATABASE: databaseEnvironment.PGDATABASE,
    PGSSLMODE: "require",
    PGCONNECT_TIMEOUT: databaseEnvironment.PGCONNECT_TIMEOUT,
    SUPABASE_DB_PASSWORD: config.databasePassword,
    LC_ALL: "C",
    LANG: "C",
  };
}

export function resolvedRemotePoolerUrl(
  config: RemoteDevPrivateConfig,
  endpoint: ResolvedRemoteDatabaseEndpoint,
) {
  assertResolvedRemoteDatabaseEndpoint(config, endpoint);
  if (endpoint.mode === "DIRECT") return null;
  return (
    `postgresql://${endpoint.user}@${endpoint.host}:` +
    `${endpoint.port}/postgres?sslmode=require`
  );
}

function executeConnectivityQuery(
  runner: RemoteConnectivityCommandRunner,
  environment: NodeJS.ProcessEnv,
) {
  return runner(
    "psql",
    [...project004RemoteConnectivityPsqlArgs],
    environment,
  );
}

export function resolveProject004RemoteDatabaseEndpoint(options: {
  config: RemoteDevPrivateConfig;
  project: ProjectRecord;
  environment?: NodeJS.ProcessEnv;
  runner: RemoteConnectivityCommandRunner;
}): RemoteConnectivityResolution {
  const environment = options.environment ?? process.env;
  const direct = directEndpoint(options.config);
  const directResult = executeConnectivityQuery(
    options.runner,
    buildResolvedRemoteDatabaseEnvironment(
      options.config,
      direct,
      environment,
    ),
  );
  if (responsePassed(directResult)) {
    return {
      endpoint: direct,
      evidence: {
        endpointMode: "DIRECT",
        directConnectivity: "PASS",
        directFailureCode: "NONE",
        poolerFallback: "NOT_RUN",
        poolerFailureCode: "NOT_RUN",
        readOnlySelect1: "PASS",
      },
    };
  }

  const directFailure = classifyRemoteConnectivityFailure(
    directResult,
    "DIRECT",
  );
  const directEvidence: RemoteConnectivityResolutionEvidence = {
    endpointMode: "DIRECT",
    directConnectivity: "FAIL",
    directFailureCode: directFailure,
    poolerFallback: "NOT_RUN",
    poolerFailureCode: "NOT_RUN",
    readOnlySelect1: "FAIL",
  };
  if (
    directFailure !== "DIRECT_IPV6_UNAVAILABLE" &&
    directFailure !== "DNS_RESOLUTION_FAILED"
  ) {
    throw new RemoteConnectivityResolutionError(
      directFailure,
      directEvidence,
    );
  }

  const region = poolerRegion(options.project);
  if (!region) {
    throw new RemoteConnectivityResolutionError(
      "POOLER_UNAVAILABLE",
      {
        ...directEvidence,
        poolerFallback: "FAIL",
        poolerFailureCode: "POOLER_UNAVAILABLE",
      },
    );
  }
  const pooler = poolerEndpoint(options.config, region);
  const poolerResult = executeConnectivityQuery(
    options.runner,
    buildResolvedRemoteDatabaseEnvironment(
      options.config,
      pooler,
      environment,
    ),
  );
  if (responsePassed(poolerResult)) {
    return {
      endpoint: pooler,
      evidence: {
        ...directEvidence,
        endpointMode: "POOLER_SESSION",
        poolerFallback: "PASS",
        poolerFailureCode: "NONE",
        readOnlySelect1: "PASS",
      },
    };
  }
  const poolerFailure = classifyRemoteConnectivityFailure(
    poolerResult,
    "POOLER_SESSION",
  );
  throw new RemoteConnectivityResolutionError(poolerFailure, {
    ...directEvidence,
    endpointMode: "POOLER_SESSION",
    poolerFallback: "FAIL",
    poolerFailureCode: poolerFailure,
  });
}
