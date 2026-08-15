# Owner local Teacher invitation

This procedure is for the disposable/Owner-local PLAVE environment only. It
does not administer hosted Supabase.

## Prerequisites

1. From the PROJECT004 repository root, prove the isolated configuration and
   start the complete local acceptance environment:

   ```bash
   npm run owner-local-demo:preflight
   npm run owner-local-demo:start
   ```

2. Use a PLAVE app runtime that is configured to that same loopback Supabase
   stack. The invitation command rejects non-loopback API and PostgreSQL
   targets. A `production-local` runtime configured for remote development is
   not the Owner-local Teacher test environment.
3. START derives and verifies a continuous tracked canonical migration inventory
   from `0001` through the highest migration (currently `0045`) and applies it
   locally. Supabase seed execution is disabled because migrations plus the
   guarded local materializer own the complete bootstrap contract. Do not paste a
   database password, service key, invitation, or environment file into chat.

## Create exactly one invitation

Run one explicit invocation with a bounded lifetime of 1–168 hours:

```bash
npm run owner-local-demo:teacher-invite -- --expires-hours 24
```

The command calls the PostgreSQL-owner-only issuer exactly once. It prints:

- one newly generated invitation code, once, in this Terminal;
- the chosen lifetime and total invitation count; and
- confirmation that plaintext was not persisted.

The code is not written to a repository file, temporary file, URL, auth
metadata, or application log. The command also removes the legacy mode-0600
temporary plaintext file if an older helper left one behind. Never commit,
record, screenshot, or send the code or environment values through chat.

## Complete normal Teacher registration

1. Open the local PLAVE registration page, select **Teacher**, and enter a
   local test email plus the one-time code. Syntax is checked at signup, but
   the code is deliberately not stored in auth metadata.
2. If email confirmation is enabled, use only the local mail catcher to
   confirm the local test account. No real provider message is required.
3. Sign in and open Teacher onboarding. Enter the same code and complete the
   local profile.
4. Verify Teacher access remains unavailable before activation and becomes
   `ACTIVE` only after the confirmed Teacher account atomically claims the
   valid invitation.

Registration and activation are intentionally separate. The registration
action checks only the invitation shape and never stores it in Auth metadata;
the Teacher must retain the same plaintext code privately and enter it again at
`/teacher/onboarding`. A synthetic Teacher account is not evidence that this
invitation path works.

Selecting Teacher at signup creates an unactivated canonical `TEACHER`
profile. Activation additionally claims `public.teacher_invitations`, creates
the matching `public.teacher_profiles` row, and completes onboarding. Editing
`profiles.role` in Supabase Dashboard skips those invariants and is not the
normal or supported onboarding procedure.

## Inspect or revoke without plaintext

Inspect count, effective status, and earliest expiry without printing any
existing code, record identifier, or user identifier:

```bash
npm run owner-local-demo:teacher-invite -- --status
```

Revoke only when exactly one unused, unexpired invitation exists:

```bash
npm run owner-local-demo:teacher-invite -- --revoke-unused
```

Revocation fails closed unless that exact record is still unused, unexpired,
and `AVAILABLE`. Claimed, revoked, expired, missing, or malformed references
are not changed. The canonical database retains only the SHA-256 code hash;
expired and terminal records remain auditable without recoverable plaintext.

Hosted administration is a separate Owner-approved operation described in
`docs/TEACHER_INVITATION_OPERATIONS.md`. Never point this local command at a
hosted target and never use direct role editing as a substitute for invitation
activation.
