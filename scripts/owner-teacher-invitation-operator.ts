import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readFileSync,
} from "node:fs";
import { isAbsolute } from "node:path";

export const canonicalTeacherInvitationProjectRef =
  "vvseikavrfhjchyrcgqi";

export type OperatorCommand = "issue" | "status" | "revoke";

export class TeacherInvitationOperatorFailure extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

type PrivateDatabaseEnvironment = Readonly<{
  PGHOST: string;
  PGPORT: string;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
  PGSSLMODE: "require";
}>;

export type SafePsqlResult = Readonly<{
  status: number | null;
  stdout: string;
}>;

export type SafePsqlRunner = (
  sql: string,
  environment: PrivateDatabaseEnvironment,
) => SafePsqlResult;

export type CanonicalLedger = Readonly<{
  count: number;
  first: string;
  last: string;
}>;

type OperatorInput = Readonly<{
  command: OperatorCommand;
  projectRef: string;
  credentialFile: string;
  codeFile?: string;
  expiresHours?: number;
  ledger: CanonicalLedger;
}>;

export type ParsedOperatorArguments = Readonly<{
  command: OperatorCommand;
  projectRef: string;
  credentialFile: string;
  codeFile?: string;
  expiresHours?: number;
}>;

export type OperatorResult =
  | Readonly<{
      command: "issue";
      invitationCode: string;
      expiresHours: number;
    }>
  | Readonly<{
      command: "status";
      state: "AVAILABLE" | "CLAIMED" | "REVOKED" | "EXPIRED" | "INVALID";
      usable: boolean;
      expiresAt: string | null;
    }>
  | Readonly<{
      command: "revoke";
      outcome: "REVOKED" | "CLAIMED" | "REVOKED_ALREADY" | "EXPIRED" | "INVALID";
    }>;

function fail(code: string): never {
  throw new TeacherInvitationOperatorFailure(code);
}

function requiredOption(args: readonly string[], name: string) {
  const indexes = args
    .map((value, index) => (value === name ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length !== 1) fail("ARGUMENTS_INVALID");
  const value = args[indexes[0] + 1];
  if (!value || value.startsWith("--")) fail("ARGUMENTS_INVALID");
  return value;
}

export function parseOperatorArguments(
  argv: readonly string[],
): ParsedOperatorArguments {
  const [rawCommand, ...args] = argv;
  if (!["issue", "status", "revoke"].includes(String(rawCommand))) {
    fail("COMMAND_INVALID");
  }
  if (
    args.some((value) => /^postgres(?:ql)?:\/\//iu.test(value)) ||
    args.some((value) =>
      /^--(?:database(?:-?(?:uri|url))?|db-(?:uri|url)|password|service-role(?:-key)?)$/iu.test(
        value,
      ),
    )
  ) {
    fail("DIRECT_CREDENTIAL_ARGUMENT_REJECTED");
  }
  const command = rawCommand as OperatorCommand;
  const allowed = new Set([
    "--project-ref",
    "--credential-file",
    ...(command === "issue" ? ["--expires-hours"] : ["--code-file"]),
  ]);
  if (
    args.length === 0 ||
    args.length % 2 !== 0 ||
    args.some((value, index) => index % 2 === 0 && !allowed.has(value))
  ) {
    fail("ARGUMENTS_INVALID");
  }
  const projectRef = requiredOption(args, "--project-ref");
  if (projectRef !== canonicalTeacherInvitationProjectRef) {
    fail("PROJECT_REF_MISMATCH");
  }
  return {
    command,
    projectRef,
    credentialFile: requiredOption(args, "--credential-file"),
    ...(command === "issue"
      ? { expiresHours: Number(requiredOption(args, "--expires-hours")) }
      : { codeFile: requiredOption(args, "--code-file") }),
  };
}

function readProtectedFile(path: string, failureCode: string) {
  if (!isAbsolute(path)) fail(failureCode);
  let descriptor = -1;
  try {
    descriptor = openSync(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
  } catch {
    fail(failureCode);
  }
  try {
    const stat = fstatSync(descriptor);
    const currentUid = process.getuid?.();
    if (
      !stat.isFile() ||
      currentUid === undefined ||
      stat.uid !== currentUid ||
      (stat.mode & 0o7777) !== 0o600
    ) {
      fail(failureCode);
    }
    const content = readFileSync(descriptor, "utf8");
    const lines = content.split(/\r?\n/u);
    if (lines.at(-1) === "") lines.pop();
    if (lines.length !== 1 || !lines[0]) fail(failureCode);
    return lines[0];
  } catch (error) {
    if (error instanceof TeacherInvitationOperatorFailure) throw error;
    fail(failureCode);
  } finally {
    if (descriptor >= 0) closeSync(descriptor);
  }
}

export function loadProtectedInvitationCode(path: string) {
  const code = readProtectedFile(path, "CODE_FILE_INVALID");
  if (!/^PLV-TCH-[0-9A-F]{32}$/u.test(code)) {
    fail("CODE_FILE_INVALID");
  }
  return code;
}

export function loadProtectedDatabaseEnvironment(
  credentialFile: string,
  projectRef: string,
): PrivateDatabaseEnvironment {
  if (projectRef !== canonicalTeacherInvitationProjectRef) {
    fail("PROJECT_REF_MISMATCH");
  }
  const raw = readProtectedFile(
    credentialFile,
    "CREDENTIAL_FILE_INVALID",
  );
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(raw);
  } catch {
    fail("CREDENTIAL_FILE_INVALID");
  }
  const hostname = databaseUrl.hostname.toLowerCase();
  let username = "";
  let password = "";
  try {
    username = decodeURIComponent(databaseUrl.username);
    password = decodeURIComponent(databaseUrl.password);
  } catch {
    fail("CREDENTIAL_FILE_INVALID");
  }
  const direct =
    hostname === `db.${projectRef}.supabase.co` && username === "postgres";
  const pooler =
    /^aws-[0-9]+-[a-z0-9-]+[.]pooler[.]supabase[.]com$/u.test(hostname) &&
    username === `postgres.${projectRef}`;
  const parameters = [...databaseUrl.searchParams.entries()];
  const parametersValid =
    parameters.length === 0 ||
    (parameters.length === 1 &&
      parameters[0]?.[0] === "sslmode" &&
      parameters[0]?.[1] === "require");
  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    (!direct && !pooler) ||
    databaseUrl.pathname !== "/postgres" ||
    (direct && databaseUrl.port !== "5432") ||
    (pooler && !["5432", "6543"].includes(databaseUrl.port)) ||
    !parametersValid ||
    databaseUrl.hash ||
    !databaseUrl.password
  ) {
    fail("CREDENTIAL_FILE_INVALID");
  }
  return {
    PGHOST: hostname,
    PGPORT: databaseUrl.port,
    PGUSER: username,
    PGPASSWORD: password,
    PGDATABASE: "postgres",
    PGSSLMODE: "require",
  };
}

export const defaultSafePsqlRunner: SafePsqlRunner = (sql, database) => {
  const result = spawnSync(
    "psql",
    [
      "-X",
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--quiet",
    ],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      env: {
        PATH: process.env.PATH ?? "",
        NODE_ENV: "production",
        LANG: "C",
        LC_ALL: "C",
        PGAPPNAME: "plave-owner-teacher-invitation",
        PGCONNECT_TIMEOUT: "10",
        ...database,
      },
    },
  );
  return { status: result.status, stdout: result.stdout };
};

function contractPredicate(ledger: CanonicalLedger) {
  if (
    ledger.first !== "0001" ||
    !/^[0-9]{4}$/u.test(ledger.last) ||
    ledger.count !== Number(ledger.last)
  ) {
    fail("LOCAL_LEDGER_INVALID");
  }
  return `
    current_database() = 'postgres'
    and current_user = 'postgres'
    and not pg_is_in_recovery()
    and pg_catalog.to_regclass('auth.users') is not null
    and pg_catalog.to_regclass('storage.objects') is not null
    and pg_catalog.to_regclass('supabase_migrations.schema_migrations') is not null
    and (
      select count(*) = ${ledger.count}
      from supabase_migrations.schema_migrations
    )
    and (
      select count(*) = ${ledger.count}
        and min(version) = '${ledger.first}'
        and max(version) = '${ledger.last}'
        and count(distinct version) = ${ledger.count}
      from supabase_migrations.schema_migrations
      where version ~ '^[0-9]{4}$'
    )
    and not exists (
      select expected.number
      from generate_series(1, ${ledger.count}) as expected(number)
      where not exists (
        select 1 from supabase_migrations.schema_migrations as migration
        where migration.version = lpad(expected.number::text, 4, '0')
      )
    )
    and (
      select count(*) = 1
      from supabase_migrations.schema_migrations
      where version = '0012'
    )
    and pg_catalog.to_regclass('public.teacher_invitations') is not null
    and pg_catalog.to_regprocedure('private.issue_teacher_invitation(timestamp with time zone)') is not null
    and pg_catalog.to_regprocedure('private.revoke_teacher_invitation(uuid)') is not null
    and pg_catalog.to_regprocedure('public.activate_teacher_invitation(text,text)') is not null
    and (
      select count(*) = 10
      from information_schema.columns as column_definition
      where column_definition.table_schema = 'public'
        and column_definition.table_name = 'teacher_invitations'
        and column_definition.column_name in (
          'id', 'code_hash', 'status', 'expires_at',
          'teacher_user_id', 'created_at', 'claimed_at', 'revoked_at',
          'expired_at', 'updated_at'
        )
    )
    and (
      select count(*) = 10
      from information_schema.columns as column_definition
      where column_definition.table_schema = 'public'
        and column_definition.table_name = 'teacher_invitations'
    )
    and not exists (
      select expected.column_name, expected.data_type, expected.is_nullable
      from (values
        ('id', 'uuid', 'NO'),
        ('code_hash', 'bytea', 'NO'),
        ('status', 'text', 'NO'),
        ('expires_at', 'timestamp with time zone', 'NO'),
        ('teacher_user_id', 'uuid', 'YES'),
        ('created_at', 'timestamp with time zone', 'NO'),
        ('claimed_at', 'timestamp with time zone', 'YES'),
        ('revoked_at', 'timestamp with time zone', 'YES'),
        ('expired_at', 'timestamp with time zone', 'YES'),
        ('updated_at', 'timestamp with time zone', 'NO')
      ) as expected(column_name, data_type, is_nullable)
      except
      select
        column_definition.column_name,
        column_definition.data_type,
        column_definition.is_nullable
      from information_schema.columns as column_definition
      where column_definition.table_schema = 'public'
        and column_definition.table_name = 'teacher_invitations'
    )
    and (
      select count(*) = 6
      from pg_catalog.pg_constraint as constraint_definition
      where constraint_definition.conrelid = 'public.teacher_invitations'::regclass
        and constraint_definition.convalidated
        and constraint_definition.conname in (
          'teacher_invitations_pkey',
          'teacher_invitations_code_hash_key',
          'teacher_invitations_status_check',
          'teacher_invitations_code_hash_check',
          'teacher_invitations_expiry_check',
          'teacher_invitations_lifecycle_check'
        )
    )
    and not exists (
      select 1
      from information_schema.columns as column_definition
      where column_definition.table_schema = 'public'
        and column_definition.table_name = 'teacher_invitations'
        and column_definition.column_name in ('code', 'code_plaintext', 'invitation_code')
    )
    and (
      select relation.relrowsecurity
        and pg_catalog.pg_get_userbyid(relation.relowner) = 'postgres'
      from pg_catalog.pg_class as relation
      where relation.oid = 'public.teacher_invitations'::regclass
    )
    and (
      select pg_catalog.pg_get_userbyid(routine.proowner) = 'postgres'
        and routine.prosecdef
        and coalesce(routine.proconfig, array[]::text[]) @> array['search_path=""']::text[]
        and not exists (
          select 1
          from pg_catalog.aclexplode(
            coalesce(routine.proacl, pg_catalog.acldefault('f', routine.proowner))
          ) as permission
          where permission.privilege_type = 'EXECUTE'
            and permission.grantee <> routine.proowner
        )
      from pg_catalog.pg_proc as routine
      where routine.oid = 'private.issue_teacher_invitation(timestamp with time zone)'::regprocedure
    )
    and (
      select pg_catalog.pg_get_userbyid(routine.proowner) = 'postgres'
        and routine.prosecdef
        and coalesce(routine.proconfig, array[]::text[]) @> array['search_path=""']::text[]
        and not exists (
          select 1
          from pg_catalog.aclexplode(
            coalesce(routine.proacl, pg_catalog.acldefault('f', routine.proowner))
          ) as permission
          where permission.privilege_type = 'EXECUTE'
            and permission.grantee <> routine.proowner
        )
      from pg_catalog.pg_proc as routine
      where routine.oid = 'private.revoke_teacher_invitation(uuid)'::regprocedure
    )
    and (
      select pg_catalog.pg_get_userbyid(routine.proowner) = 'postgres'
        and routine.prosecdef
        and coalesce(routine.proconfig, array[]::text[]) @> array['search_path=""']::text[]
      from pg_catalog.pg_proc as routine
      where routine.oid = 'public.activate_teacher_invitation(text,text)'::regprocedure
    )
    and pg_catalog.pg_get_functiondef(
      'private.issue_teacher_invitation(timestamp with time zone)'::regprocedure
    ) ~ 'gen_random_bytes\\(16\\)'
    and pg_catalog.pg_get_functiondef(
      'private.issue_teacher_invitation(timestamp with time zone)'::regprocedure
    ) ~ 'digest\\(v_code, ''sha256'''
    and pg_catalog.pg_get_functiondef(
      'public.activate_teacher_invitation(text,text)'::regprocedure
    ) ~ 'auth[.]uid\\(\\)'
    and pg_catalog.pg_get_functiondef(
      'public.activate_teacher_invitation(text,text)'::regprocedure
    ) ~ 'teacher_profiles'
    and not pg_catalog.has_table_privilege('anon', 'public.teacher_invitations', 'SELECT')
    and not pg_catalog.has_table_privilege('anon', 'public.teacher_invitations', 'INSERT')
    and not pg_catalog.has_table_privilege('anon', 'public.teacher_invitations', 'UPDATE')
    and not pg_catalog.has_table_privilege('anon', 'public.teacher_invitations', 'DELETE')
    and not pg_catalog.has_table_privilege('authenticated', 'public.teacher_invitations', 'SELECT')
    and not pg_catalog.has_table_privilege('authenticated', 'public.teacher_invitations', 'INSERT')
    and not pg_catalog.has_table_privilege('authenticated', 'public.teacher_invitations', 'UPDATE')
    and not pg_catalog.has_table_privilege('authenticated', 'public.teacher_invitations', 'DELETE')
    and pg_catalog.has_function_privilege('authenticated', 'public.activate_teacher_invitation(text,text)', 'EXECUTE')
    and not pg_catalog.has_function_privilege('anon', 'public.activate_teacher_invitation(text,text)', 'EXECUTE')
  `;
}

export function buildTeacherInvitationGateSql(ledger: CanonicalLedger) {
  return `
    begin read only;
    set local statement_timeout = '15s';
    select 'PLAVE_TEACHER_INVITATION_GATE_V1|'
      || case when (${contractPredicate(ledger)}) then 'PASS' else 'FAIL' end;
    rollback;
  `;
}

function safeRun(
  runner: SafePsqlRunner,
  sql: string,
  database: PrivateDatabaseEnvironment,
  failureCode: string,
) {
  const result = runner(sql, database);
  if (result.status !== 0) fail(failureCode);
  return result.stdout.trim();
}

function assertRemoteGate(
  runner: SafePsqlRunner,
  database: PrivateDatabaseEnvironment,
  ledger: CanonicalLedger,
) {
  const output = safeRun(
    runner,
    buildTeacherInvitationGateSql(ledger),
    database,
    "REMOTE_TARGET_GATE_FAILED",
  );
  if (output !== "PLAVE_TEACHER_INVITATION_GATE_V1|PASS") {
    fail("REMOTE_TARGET_GATE_FAILED");
  }
}

function issueSql(expiresHours: number) {
  return `
    begin;
    set local statement_timeout = '15s';
    select private.issue_teacher_invitation(
      transaction_timestamp() + pg_catalog.make_interval(hours => ${expiresHours})
    );
    commit;
  `;
}

function statusSql(code: string) {
  return `
    begin read only;
    set local statement_timeout = '15s';
    with target as (
      select
        case
          when invitation.status = 'AVAILABLE'
            and invitation.expires_at <= transaction_timestamp()
          then 'EXPIRED'
          else invitation.status
        end as effective_status,
        invitation.expires_at
      from public.teacher_invitations as invitation
      where invitation.code_hash = extensions.digest('${code}', 'sha256')
    )
    select 'PLAVE_TEACHER_INVITATION_STATUS_V1|'
      || coalesce(target.effective_status, 'INVALID') || '|'
      || coalesce(
        to_char(target.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'NONE'
      ) || '|'
      || case when target.effective_status = 'AVAILABLE' then 'YES' else 'NO' end
    from (select 1) as singleton
    left join target on true;
    rollback;
  `;
}

function revokeSql(code: string) {
  return `
    begin;
    set local statement_timeout = '15s';
    with target as materialized (
      select invitation.id, invitation.status, invitation.expires_at
      from public.teacher_invitations as invitation
      where invitation.code_hash = extensions.digest('${code}', 'sha256')
      for update
    ), action as materialized (
      select private.revoke_teacher_invitation(target.id) as revoked
      from target
      where target.status = 'AVAILABLE'
        and target.expires_at > transaction_timestamp()
    )
    select 'PLAVE_TEACHER_INVITATION_REVOKE_V1|'
      || case
        when not exists (select 1 from target) then 'INVALID'
        when exists (select 1 from action where revoked) then 'REVOKED'
        when (select status from target) = 'CLAIMED' then 'CLAIMED'
        when (select status from target) = 'REVOKED' then 'REVOKED_ALREADY'
        when (select status from target) = 'EXPIRED'
          or (select expires_at from target) <= transaction_timestamp()
        then 'EXPIRED'
        else 'INVALID'
      end;
    commit;
  `;
}

export function runTeacherInvitationOperator(
  input: OperatorInput,
  runner: SafePsqlRunner = defaultSafePsqlRunner,
): OperatorResult {
  if (input.projectRef !== canonicalTeacherInvitationProjectRef) {
    fail("PROJECT_REF_MISMATCH");
  }
  if (
    input.command === "issue" &&
    (!Number.isInteger(input.expiresHours) ||
      Number(input.expiresHours) < 1 ||
      Number(input.expiresHours) > 168)
  ) {
    fail("EXPIRY_INVALID");
  }
  const database = loadProtectedDatabaseEnvironment(
    input.credentialFile,
    input.projectRef,
  );
  assertRemoteGate(runner, database, input.ledger);

  if (input.command === "issue") {
    const expiresHours = Number(input.expiresHours);
    const output = safeRun(
      runner,
      issueSql(expiresHours),
      database,
      "REMOTE_ISSUE_FAILED",
    );
    const invitationCodes = output
      .split(/\r?\n/u)
      .filter((line) => /^PLV-TCH-[0-9A-F]{32}$/u.test(line));
    if (invitationCodes.length !== 1) fail("REMOTE_ISSUE_FAILED");
    return {
      command: "issue",
      invitationCode: invitationCodes[0],
      expiresHours,
    };
  }

  if (!input.codeFile) fail("CODE_FILE_REQUIRED");
  const code = loadProtectedInvitationCode(input.codeFile);
  if (input.command === "status") {
    const output = safeRun(
      runner,
      statusSql(code),
      database,
      "REMOTE_STATUS_FAILED",
    );
    const match =
      /^PLAVE_TEACHER_INVITATION_STATUS_V1[|](AVAILABLE|CLAIMED|REVOKED|EXPIRED|INVALID)[|](NONE|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)[|](YES|NO)$/u.exec(
        output,
      );
    if (!match) fail("REMOTE_STATUS_FAILED");
    return {
      command: "status",
      state: match[1] as Extract<OperatorResult, { command: "status" }>["state"],
      expiresAt: match[2] === "NONE" ? null : match[2],
      usable: match[3] === "YES",
    };
  }

  const output = safeRun(
    runner,
    revokeSql(code),
    database,
    "REMOTE_REVOKE_FAILED",
  );
  const match =
    /^PLAVE_TEACHER_INVITATION_REVOKE_V1[|](REVOKED|CLAIMED|REVOKED_ALREADY|EXPIRED|INVALID)$/u.exec(
      output,
    );
  if (!match) fail("REMOTE_REVOKE_FAILED");
  return {
    command: "revoke",
    outcome: match[1] as Extract<OperatorResult, { command: "revoke" }>["outcome"],
  };
}
