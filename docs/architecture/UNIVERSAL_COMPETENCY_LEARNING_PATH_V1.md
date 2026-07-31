# Universal competency and learning path V1

Status: local pure-domain engine; no remote mutation, migration, publication,
or adaptive-pilot activation.

## Audit result

The existing universal progress contract already exposes per-student unit,
outcome, and skill evidence counts, correct counts, last activity, and a
versioned mastery label. The fixed universal submit path is idempotent and
CAS-safe; duplicate submissions and revision conflicts do not create another
answer evidence row. Existing migration 0036 contains a richer adaptive POC,
including question difficulty and answer timing, but its runtime and pilot are
disabled and this V1 engine does not depend on it.

The current public progress contract does not expose independent hint usage,
per-answer difficulty weighting, or explicit retention-check evidence. V1
therefore accepts those fields as typed evidence inputs but does not infer them
from response time. No schema change is justified yet; persistence remains a
future contract decision after local integration review.

## Deterministic policy

`lib/competency/engine.ts` implements the versioned PRODUCT_HYPOTHESIS policy:

- mastery combines correctness/difficulty, independence, consistency, recency,
  and retention with weights `50/15/15/10/10`;
- confidence is LOW/MEDIUM/HIGH based on evidence volume, never from one answer;
- status is NOT_STARTED/DEVELOPING/BASIC/PROFICIENT/SECURE;
- accepted evidence is deduplicated by evidence ID and excludes duplicate,
  rejected, and CAS-conflicted submissions;
- time is not negative evidence; it is only used for a bounded recency signal;
- all outputs include the policy version and a non-diagnostic explanation.

`recommendNextLearningPath` ranks only active, visible, same-grade candidates
with secure prerequisites and a disabled-pilot guard. Its weighted signals are
`35/30/15/10/10` for prerequisite gap, low mastery, curriculum relevance,
forgetting risk, and unfinished engagement. Every result includes stable reason
codes and Vietnamese explanation text.

`lib/competency/view-model.ts` defines the future UI/API shapes “Năng lực của
em” and “Bài nên học tiếp”; it deliberately does not connect to a UI or
Supabase client and marks the result as a product hypothesis.

Grades 1–9 are isolated by `schoolGrade`; Grade 1 compatibility and the Grade 2
adaptive pilot remain unchanged.
