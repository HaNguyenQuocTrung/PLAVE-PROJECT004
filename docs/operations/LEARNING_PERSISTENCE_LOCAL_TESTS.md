# Local learning-persistence regression tests

These Docker-required tests exercise only disposable loopback Supabase and
Next.js resources. They do not load `.env.local`, contact hosted Supabase, send
provider email, or reuse the application on port 3000.

## Prerequisites

- Docker Desktop is running.
- Supabase CLI is available at `/opt/homebrew/bin/supabase`.
- Node.js and the repository dependencies are installed.
- Ports are selected dynamically; port 3000 must already remain under its
  existing Owner process.

Run the complete persistence proof:

```text
npm run test:learning-persistence-local
```

The complete command starts two sequential disposable namespaces. The first
applies migrations 0001–0042 and proves the explicit 0038/0043 schema-skew
classification. The second applies migrations 0001–0044 and proves ordinary
Grades 1–9 learning, the Grade 3 application/API journey, Parent aggregates,
and Teacher-assignment persistence. Typical runtime is several minutes,
depending on Docker image and Next.js cache availability.

Focused commands are also available:

```text
npm run test:grade3-history-local
npm run test:teacher-assignment-persistence-local
npm run test:learning-schema-skew-local
npm run test:learning-persistence-contract
```

The contract command is a fast non-Docker test. The other commands create
fresh synthetic `.invalid` accounts and use normal Auth, consent, classroom,
assignment, attempt, answer, History, Progress, and Parent RPC contracts.
Passwords and invitation plaintext are random, memory-only, and never printed.

Ordinary Grade 2 is tested through the visible fixed universal curriculum. It
is separate from the Grade 2 adaptive candidate, which remains `DRAFT`,
`HIDDEN`, disabled, and unexercised.

Every dynamic command owns a unique `PLAVE-PROJECT004-ROUND2I-*` namespace.
Success, assertion failure, SIGINT, and SIGTERM all enter the same cleanup
boundary. The runner stops only its child application and Supabase project,
uses `supabase stop --no-backup`, removes its temporary workspace, checks for
owned container/volume/network/listener residue, and confirms the port-3000
listener identity did not change. It never runs Docker prune.
