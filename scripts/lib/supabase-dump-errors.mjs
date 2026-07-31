const SAFE_DUMP_REASONS = Object.freeze([
  "AUTH_FAILED",
  "PASSWORD_PROPAGATION_PENDING",
  "DNS_FAILED",
  "CONNECTION_TIMEOUT",
  "SSL_FAILED",
  "DOCKER_UNAVAILABLE",
  "PERMISSION_DENIED",
  "CLI_VERSION_UNSUPPORTED",
  "ROLE_DUMP_UNSUPPORTED",
  "UNKNOWN",
]);

const classifySupabaseDumpFailure = (diagnosticText, stage) => {
  const normalized =
    typeof diagnosticText === "string" ? diagnosticText.toLowerCase() : "";
  const includesAny = (patterns) =>
    patterns.some((pattern) => normalized.includes(pattern));

  if (
    includesAny([
      "cannot connect to the docker daemon",
      "docker daemon is not running",
      "error during connect",
      "failed to inspect docker",
      "docker: command not found",
    ])
  ) {
    return "DOCKER_UNAVAILABLE";
  }
  if (
    includesAny([
      "password reset is still propagating",
      "password propagation pending",
      "credential propagation pending",
    ])
  ) {
    return "PASSWORD_PROPAGATION_PENDING";
  }
  if (
    includesAny([
      "password authentication failed",
      "authentication failed",
      "invalid password",
      "sqlstate 28p01",
    ])
  ) {
    return "AUTH_FAILED";
  }
  if (
    includesAny([
      "no such host",
      "name or service not known",
      "nodename nor servname provided",
      "temporary failure in name resolution",
      "server misbehaving",
    ])
  ) {
    return "DNS_FAILED";
  }
  if (
    includesAny([
      "connection timed out",
      "connect timeout",
      "i/o timeout",
      "context deadline exceeded",
      "deadline exceeded",
    ])
  ) {
    return "CONNECTION_TIMEOUT";
  }
  if (
    includesAny([
      "ssl error",
      "tls error",
      "certificate verify failed",
      "certificate signed by unknown authority",
      "server does not support ssl",
    ])
  ) {
    return "SSL_FAILED";
  }
  if (
    includesAny([
      "permission denied",
      "insufficient privilege",
      "must be owner",
      "sqlstate 42501",
    ])
  ) {
    return "PERMISSION_DENIED";
  }
  if (
    stage === "ROLES" &&
    includesAny([
      "unknown flag: --role-only",
      "flag provided but not defined: -role-only",
      "role-only is not supported",
    ])
  ) {
    return "ROLE_DUMP_UNSUPPORTED";
  }
  if (
    includesAny([
      "unsupported supabase cli version",
      "this command requires a newer version",
    ])
  ) {
    return "CLI_VERSION_UNSUPPORTED";
  }
  return "UNKNOWN";
};

export { SAFE_DUMP_REASONS, classifySupabaseDumpFailure };
