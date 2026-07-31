# PROJECT004 remote generated-practice shadow

This operation validates generated-practice against the clean PROJECT004 remote-development schema and release without changing Student runtime or remote data.

## Boundary

- Exact target: `plave-project004-dev-clean`.
- Credentials are prompted from `/dev/tty`, held in process memory, and cleared after the command.
- The remote checks run through the canonical migration-0041 read-only preflight transport.
- Generated practice is enabled as `SHADOW` only inside the command process. The normal runtime profile remains `OFF`.
- No start/submit RPC, DDL, DML, activation, publication, deployment, persistent link, or network listener is used.

## Operation

Run once from the PROJECT004 repository:

```sh
npm run --silent remote-dev:generated-shadow
```

The command validates the 41/41 migration state, eight provenance fields, ACTIVE/ACTIVE universal release, Grade 1 boundary, disabled Grade 2 pilot, private-solution boundary, and zero pre-existing generated rows. It then generates and independently validates 1,638 in-memory samples covering 546 outcomes, 59 declared semantic variants, and EASY/MEDIUM/HARD. A second read-only preflight must prove attempt, generated-question, private-solution, generated-answer, and history counts unchanged.

Successful output ends with:

```text
REMOTE_SHADOW_MUTATION_PERFORMED=NO
STUDENT_RUNTIME_CHANGED=NO
GENERATED_RUNTIME_REMOTE_AFTER=OFF
ROOT_FAILURE_CODE=NONE
PROJECT004_REMOTE_GENERATED_SHADOW=PASS
```

The sanitized local receipt is written with mode `0600` under `.local-artifacts/generated-shadow/`. It contains aggregate coverage and hashes, never identity, raw seed, prompt, answer, solution, token, URL, or credentials.
