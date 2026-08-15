# Canonical Owner Teacher invitation operations

This is the credential-safe operator path for the canonical project. It does
not use a Supabase link, `.env.local`, a browser service-role key, or a database
URI in command-line arguments. Running any command is a separately authorized
remote database operation. Implementation and local tests do not authorize
running it against the canonical target.

Registration and activation are separate: `/register` checks only the code
shape and creates an unactivated `TEACHER`; the confirmed Teacher must enter the
same code again at `/teacher/onboarding`. The activation endpoint atomically
claims the invitation, creates `teacher_profiles`, and completes onboarding.

## Prepare protected files

Choose absolute paths outside the repository. Create the database credential
file with a trusted local editor while `umask 077` is active, put exactly one
PostgreSQL URI on its only line, then enforce mode `600`. Do not paste the URI
into a command or shell history.

```bash
umask 077
credential_file=/absolute/private/path/plave-canonical-database-uri
install -m 600 /dev/null "$credential_file"
"${EDITOR:?Set a trusted local editor}" "$credential_file"
chmod 600 "$credential_file"
```

The CLI accepts only a regular, non-symlink, current-user-owned mode-`600`
file. The URI must bind the canonical project ref through either its direct
database identity or its session-pooler username. The CLI passes only an
allowlisted `PG*` environment to `psql` and never renders the URI or password.

For `status` or `revoke`, put the plaintext invitation into a second protected
file without exposing it in shell history:

```bash
code_file=/absolute/private/path/plave-teacher-invitation-code
read -r -s invitation_code
printf '%s\n' "$invitation_code" > "$code_file"
unset invitation_code
chmod 600 "$code_file"
```

The CLI never deletes either file automatically. After the authorized
operation, inspect the two variable values, confirm they are the intended
absolute private paths, and remove exactly those files under the Owner's normal
credential-destruction procedure:

```bash
printf '%s\n' "$credential_file" "$code_file"
rm -- "$credential_file" "$code_file"
unset credential_file code_file
```

Plaintext cannot be recovered from the database because only its SHA-256 hash
is stored.

## Read-only target gate

Every command first opens a read-only transaction and fails closed unless all
of these facts agree:

- explicit project ref is `vvseikavrfhjchyrcgqi`;
- connection URI identity is bound to that ref;
- database is writable-primary PostgreSQL `postgres` under the database owner;
- canonical ledger is continuous and exactly matches the locally tracked
  inventory, currently `0001–0045`, with exactly one `0012`;
- invitation table, RLS, private issuer/revoker, authenticated activation RPC,
  owners, and grants match the invitation contract.

Hostname text alone is never sufficient. Any failed gate stops before the
mutation query and prints only a fixed failure code.

## Issue

Run only in an interactive terminal. Redirected/non-interactive output fails
closed because plaintext must be displayed exactly once and must not enter a
log or receipt.

```bash
npm run owner:teacher-invitation:issue -- \
  --project-ref vvseikavrfhjchyrcgqi \
  --expires-hours 24 \
  --credential-file "$credential_file"
```

Expiry is restricted to 1–168 hours. The command calls the existing
Postgres-owner-only issuer in one transaction and prints the new plaintext code
once. It never writes the code to a file. Transfer it through the Owner's
approved private channel; do not put it in a URL, ticket, screenshot, log, or
repository file.

## Status

```bash
npm run owner:teacher-invitation:status -- \
  --project-ref vvseikavrfhjchyrcgqi \
  --credential-file "$credential_file" \
  --code-file "$code_file"
```

Status returns only `AVAILABLE`, `CLAIMED`, `REVOKED`, `EXPIRED`, or `INVALID`,
a sanitized UTC expiry when present, and whether the invitation is usable. It
never prints a code, hash, UUID, URI, or user identity.

## Revoke

```bash
npm run owner:teacher-invitation:revoke -- \
  --project-ref vvseikavrfhjchyrcgqi \
  --credential-file "$credential_file" \
  --code-file "$code_file"
```

Revocation locks the hash-matched row and calls the private revoker only while
the invitation is still `AVAILABLE` and unexpired. Claimed, already revoked,
expired, and invalid codes are non-mutating outcomes and return a non-success
process status.

Local and canonical invitations belong to different databases and cannot be
interchanged. A prepared synthetic Teacher account is not a substitute for an
invitation onboarding proof.
