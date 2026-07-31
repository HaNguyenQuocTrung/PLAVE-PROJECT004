const DATABASE_URL_ERROR = "PLAVE_DB_URL_INVALID";

const fail = () => {
  throw new Error(DATABASE_URL_ERROR);
};

const extractRawAuthority = (databaseUrl) => {
  const match =
    /^(postgres(?:ql)?):\/\/([^/?#]+)(\/[^?#]*)(?:\?([^#]*))?(?:#(.*))?$/iu.exec(
      databaseUrl,
    );
  if (!match) fail();

  const [, , authority, pathname, query, fragment] = match;
  if (
    !authority ||
    pathname !== "/postgres" ||
    (query !== undefined && query !== "") ||
    (fragment !== undefined && fragment !== "")
  ) {
    fail();
  }

  const atMatches = authority.match(/@/gu) ?? [];
  if (atMatches.length !== 1) fail();

  const separatorIndex = authority.indexOf("@");
  const userInfo = authority.slice(0, separatorIndex);
  const hostAndPort = authority.slice(separatorIndex + 1);
  const passwordSeparatorIndex = userInfo.indexOf(":");
  if (passwordSeparatorIndex <= 0) fail();

  const rawUsername = userInfo.slice(0, passwordSeparatorIndex);
  const rawPassword = userInfo.slice(passwordSeparatorIndex + 1);
  if (!rawPassword || /%(?![0-9a-f]{2})/iu.test(rawPassword)) fail();
  if (/[@:/#?]/u.test(rawPassword)) fail();

  return { rawUsername, rawPassword, hostAndPort };
};

const parseExpectedProjectRef = (publicSupabaseUrl) => {
  let publicUrl;
  try {
    publicUrl = new URL(publicSupabaseUrl);
  } catch {
    fail();
  }

  const hostParts = publicUrl.hostname.toLowerCase().split(".");
  const projectRef = hostParts[0] ?? "";
  if (
    publicUrl.protocol !== "https:" ||
    publicUrl.hostname.toLowerCase() !== `${projectRef}.supabase.co` ||
    !/^[a-z0-9]{12,40}$/u.test(projectRef)
  ) {
    fail();
  }
  return projectRef;
};

const parseVerifiedConnection = (databaseUrl, publicSupabaseUrl) => {
  if (
    typeof databaseUrl !== "string" ||
    typeof publicSupabaseUrl !== "string" ||
    databaseUrl.length === 0 ||
    publicSupabaseUrl.length === 0
  ) {
    fail();
  }

  const projectRef = parseExpectedProjectRef(publicSupabaseUrl);
  const rawParts = extractRawAuthority(databaseUrl);

  let database;
  try {
    database = new URL(databaseUrl);
  } catch {
    fail();
  }

  const hostname = database.hostname.toLowerCase();
  const username = database.username;
  const protocol = database.protocol.toLowerCase();
  const sessionPoolerHost =
    /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/u.test(hostname);

  if (
    (protocol !== "postgres:" && protocol !== "postgresql:") ||
    rawParts.rawUsername !== `postgres.${projectRef}` ||
    username !== `postgres.${projectRef}` ||
    database.port !== "5432" ||
    database.pathname !== "/postgres" ||
    database.search !== "" ||
    database.hash !== "" ||
    !sessionPoolerHost ||
    rawParts.hostAndPort.toLowerCase() !== `${hostname}:5432`
  ) {
    fail();
  }

  let decodedPassword;
  try {
    decodedPassword = decodeURIComponent(rawParts.rawPassword);
  } catch {
    fail();
  }
  if (decodedPassword.length === 0) fail();

  const maskedProjectRef =
    projectRef.length > 8
      ? `${projectRef.slice(0, 4)}…${projectRef.slice(-4)}`
      : "verified";

  return {
    sanitized: Object.freeze({
      projectRef: maskedProjectRef,
      hostname,
      port: 5432,
      database: "postgres",
      connectionMode: "SESSION_POOLER",
    }),
    privateConnection: Object.freeze({
      PGHOST: hostname,
      PGPORT: "5432",
      PGUSER: `postgres.${projectRef}`,
      PGPASSWORD: decodedPassword,
      PGDATABASE: "postgres",
    }),
  };
};

export const validatePlaveDevDatabaseUrl = (
  databaseUrl,
  publicSupabaseUrl,
) => parseVerifiedConnection(databaseUrl, publicSupabaseUrl).sanitized;

export const getPrivatePlaveDevDatabaseEnvironment = (
  databaseUrl,
  publicSupabaseUrl,
) => parseVerifiedConnection(databaseUrl, publicSupabaseUrl).privateConnection;

export const getSupabaseCliDumpConnection = (
  databaseUrl,
  publicSupabaseUrl,
) => {
  const { privateConnection } = parseVerifiedConnection(
    databaseUrl,
    publicSupabaseUrl,
  );
  const username = encodeURIComponent(privateConnection.PGUSER);
  const hostname = privateConnection.PGHOST;
  const port = privateConnection.PGPORT;
  const database = encodeURIComponent(privateConnection.PGDATABASE);

  return Object.freeze({
    passwordlessDatabaseUrl:
      `postgresql://${username}@${hostname}:${port}/${database}`,
    childEnvironment: Object.freeze({
      // Explicit --db-url in CLI 2.110.0 resolves the standard libpq variable.
      // SUPABASE_DB_PASSWORD is also scoped to the child for forward-compatible
      // CLI behavior, but is not the active transport for this locked version.
      PGPASSWORD: privateConnection.PGPASSWORD,
      SUPABASE_DB_PASSWORD: privateConnection.PGPASSWORD,
    }),
  });
};

export const readPublicSupabaseUrlFromEnvFile = (envText) => {
  if (typeof envText !== "string") fail();
  const urlLine = envText
    .split(/\r?\n/u)
    .find((line) => line.startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  if (!urlLine) fail();

  const rawValue = urlLine.slice(urlLine.indexOf("=") + 1).trim();
  if (
    (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }
  return rawValue;
};

export { DATABASE_URL_ERROR };
