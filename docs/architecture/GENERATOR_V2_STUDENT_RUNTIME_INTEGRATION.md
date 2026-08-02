# Generator V2 — Student runtime integration

Ngày: 2026-08-02
Sprint: 10B
Trạng thái repository mặc định: `OFF`

## Mục đích và giới hạn

Tài liệu này mô tả điểm nối nhỏ nhất đưa Generator V2 vào đúng Student practice
runtime mà không thay static practice, không dùng internal proof/review route và
không bật 546 outcomes trước Sprint 10C. Sprint 10B chỉ cho phép sáu cặp
outcome/capability đã được kiểm tra trực tiếp trong disposable local runtime;
540 outcomes còn lại fail closed với `CORRECTNESS_REVIEW_REQUIRED`.

## Source-to-runtime flow

```text
Student /lessons
  -> /learn/[gradeSlug]/[lessonSlug]
  -> UniversalCurriculumStartButton
  -> POST /api/curriculum-runtime/start
       -> authenticated Student access + grade
       -> server maps unitSlug -> release unit -> official outcome ID
       -> server resolves exact outcome ID -> canonical capability
       -> server selects actual mode
          STATIC
            -> start_or_resume_curriculum_unit (0038)
          GENERATED_V2 (all policy gates must pass)
            -> deterministic server seed
            -> generateQuestion + independent validation
            -> to0041Question + signed immutable snapshot
            -> start_or_resume_semantic_generated_curriculum (0041/0042)
       -> public state says STATIC or GENERATED_V2
  -> /curriculum-practice/[attemptId]
       -> generated state RPC first, static state RPC only when no generated row
       -> no silent generated-to-static downgrade
  -> POST /api/curriculum-runtime/answer
       -> database-owned attempt mode and ownership
       -> generated or static submit RPC
       -> CAS + idempotency + server-side correctness
  -> feedback -> next -> completion
  -> /learning-progress and /learning-history
```

## Architecture inventory

| Concern | Existing/static source | Generator V2 Student source |
|---|---|---|
| Student catalog | `/lessons`, `/learn/[gradeSlug]/[lessonSlug]` | unchanged |
| Browser start contract | `UniversalCurriculumStartButton` sends only `unitSlug` and `idempotencyKey` | unchanged; browser cannot choose mode/outcome/capability/seed |
| Public start API | `/api/curriculum-runtime/start` | same endpoint; server selects mode |
| Static start | `start_or_resume_curriculum_unit` in migration 0038 | unchanged |
| Generated start | previously only proof/review surfaces | `start_or_resume_semantic_generated_curriculum` through public Student API |
| State/resume | `get_curriculum_attempt_state` | `get_generated_curriculum_attempt_state`; immutable snapshot reused |
| Submit | `submit_curriculum_answer` | `submit_generated_curriculum_answer` |
| Progress/history | 0038 progress/history RPCs | same authenticated projections; generated writes remain exactly-once |
| Registry | static materialized release bank | exact `outcomeId -> variantId`; unknown is not inferred |
| Rendering | static `CurriculumVisual` and static inputs | typed Generator V2 interaction/visual surface in the same Student runner |

The old on-demand/generated-pilot pipeline and internal Generator V2 proof/Owner
review routes remain separate. They are not called by the Student integration and
were not used as Sprint 10B product evidence.

## Server-owned mode contract

The response exposes `runtimeMode: STATIC | GENERATED_V2`; it does not expose the
seed, outcome selection internals, solver receipt, hashes or private solution.
The client request parser rejects any extra routing or correctness fields.

`GENERATED_V2` requires all of the following:

1. authenticated `STUDENT` with completed profile;
2. `PLAVE_CURRICULUM_RUNTIME_ENABLED=true`;
3. `GENERATOR_V2_STUDENT_RUNTIME_ENABLED=true`;
4. loopback request host;
5. release exactly `LOCAL_VERIFICATION`;
6. schema contract exactly `0042`;
7. valid server-only signing key;
8. exact release unit for the Student grade;
9. prerequisites satisfied;
10. exact implemented outcome/capability mapping;
11. both outcome and capability explicitly allowlisted;
12. eligibility state `STUDENT_RUNTIME_ELIGIBLE`.

Repository defaults are deny-all. Global OFF keeps the pre-existing static path.
When global generated mode is ON, a failed generated gate returns a typed error;
it never disguises the request as generated and never falls back to generic
arithmetic. Static mode is used only by the explicit repository-default product
selection contract.

## Eligibility model

Each registry outcome resolves to one of:

- `INTERNAL_ONLY` — no callable product mapping;
- `CORRECTNESS_REVIEW_REQUIRED` — implemented but not Student-eligible;
- `STUDENT_RUNTIME_ELIGIBLE` — present in the bounded verification declaration
  and explicitly enabled for both outcome and capability in one local process.

The Sprint 10B verification set is six exact outcomes/capabilities across Grades
2, 3, 4, 6, 7 and 9. Declaring this set in source does not enable it: the global,
release, schema, signing and two allowlist gates are all still required. Sprint
10C must review correctness before eligibility can expand.

## Persistence and transaction boundary

No migration was added. Schema 0001–0042 already provides:

- immutable generated attempt/question rows;
- private solution separation;
- semantic provenance locks and 8/8 fields;
- authenticated ownership and RLS;
- concurrent-start/idempotency uniqueness;
- revision CAS and duplicate-submit replay;
- deferred provenance validation fixed by migration 0042;
- atomic progress/history updates and rollback on injected failure.

Generation completes before the single signed start RPC. A rejected generation or
database transaction returns a sanitized typed error; no partial attempt, question,
answer, progress or history row is published.

## Public boundary

Before submit, public state contains only prompt, typed interaction, sanitized
visual/accessibility data and Student progress. It excludes private answer,
accepted responses, raw seed, capability/outcome IDs, solver receipt and private
hashes. After submit, feedback is returned by the authenticated database contract;
structured correct answers are formatted as Student-readable fractions, ordering
or matching labels instead of raw JSON.

## Internal surfaces excluded from evidence

The following do not count as Student runtime proof:

- `/internal/generator-v2` and `/api/internal/generator-v2/*`;
- `/internal/generator-v2-owner-review` and its local decision API;
- the standalone database-proof route/harness;
- the Generator product audit renderer;
- test-only generation endpoints or direct privileged inserts.

The Sprint 10B browser recorder rejects any observed request whose path begins
with `/internal` or `/api/internal`.

## Safe extension after Sprint 10C

To add eligibility, a maintainer must fix and directly review the public product
contract, keep the exact release outcome mapping, add the outcome and capability
to the bounded eligibility declaration, run deterministic solver/validator and
negative controls, then repeat authenticated database/browser acceptance. Adding
an outcome to an environment allowlist alone is insufficient.
