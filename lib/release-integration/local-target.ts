export type LocalReleaseTarget = Readonly<{
  hostname: "127.0.0.1" | "localhost" | "::1";
  port: string;
  database: string;
  username: string;
  password: string;
}>;

export function parseDisposableLocalReleaseTarget(
  databaseUrl: string | undefined,
  classification: string | undefined,
): LocalReleaseTarget {
  if (classification !== "DISPOSABLE_LOCAL") {
    throw new Error("LOCAL_RELEASE:DISPOSABLE_LOCAL_CLASSIFICATION_REQUIRED");
  }
  if (!databaseUrl) throw new Error("LOCAL_RELEASE:DATABASE_URL_REQUIRED");
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("LOCAL_RELEASE:DATABASE_URL_INVALID");
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error("LOCAL_RELEASE:POSTGRES_REQUIRED");
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error("LOCAL_RELEASE:REMOTE_TARGET_FORBIDDEN");
  }
  const database = parsed.pathname.replace(/^\//, "");
  if (!database || !parsed.username) {
    throw new Error("LOCAL_RELEASE:DATABASE_IDENTITY_REQUIRED");
  }
  return {
    hostname: parsed.hostname as LocalReleaseTarget["hostname"],
    port: parsed.port || "5432",
    database,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  };
}

export function buildSanitizedPostgresEnvironment(
  target: LocalReleaseTarget,
  path: string | undefined,
) {
  return {
    PATH: path ?? "/usr/bin:/bin:/usr/sbin:/sbin",
    LANG: "C",
    LC_ALL: "C",
    PGHOST: target.hostname,
    PGPORT: target.port,
    PGDATABASE: target.database,
    PGUSER: target.username,
    PGPASSWORD: target.password,
  } as const;
}

export function sanitizedLocalTargetLabel(target: LocalReleaseTarget) {
  return `${target.hostname}:${target.port}/${target.database}`;
}
