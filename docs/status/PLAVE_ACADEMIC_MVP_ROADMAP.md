# PLAVE Academic MVP Roadmap

Ngày cập nhật: 2026-08-03

## Locked product baseline

- Milestone 1: `COMPLETE_OWNER_APPROVED`.
- Milestone 2: `REMEDIATION_VERIFIED_AWAITING_FINAL_ACADEMIC_ACCEPTANCE`.
- Milestone 3: `REMEDIATION_VERIFIED_COMPLETE_OWNER_APPROVED_LOCAL_MVP`.
- Generator V2: 546/546 outcomes, 198/198 capabilities independently verified;
  repository default remains OFF.
- Production deployment, remote activation and production certification remain
  out of scope.

## Academic MVP sequence

| Sprint | Scope | Active status |
|---|---|---|
| 11A | Server-authoritative Attempt Score, exactly-once XP and outcome mastery | `COMPLETE_LOCAL_FOUNDATION` |
| 11B | Level, Streak and Achievements on top of the V1 ledger | `NOT_STARTED` |
| 12A | Expanded Parent/Teacher analytics | `NOT_STARTED` |
| Future | Adaptive recommendations, learning-cycle anti-farming, notifications | `NOT_STARTED` |

Sprint 11A intentionally excludes Level, badge, streak, leaderboard, adaptive
recommendation, notifications, payment and social features. Completion of the
local foundation does not change Milestone 2 to Owner-approved, enable Generator
by default, apply migration 0043 remotely or declare production readiness.

## Sprint 11A decision record

- Policy is versioned as `PLAVE_SCORING_POLICY_V1`.
- Migration 0043 is additive and local-only; migrations 0001–0042 are immutable.
- New curriculum attempts use weighted Score and XP/mastery evidence.
- Historical records are not retroactively granted XP when immutable evidence is
  incomplete.
- Static and GENERATED_V2 practice share one server-side scoring transaction.
- Student sees own data; approved Parent/Teacher relationships receive bounded
  read-only summaries; direct mutation stays denied.
- Sprint 11B must consume the append-only XP ledger and mastery projection rather
  than invent a second points pipeline.

## Remaining gates beyond 11A

- Final academic acceptance for Milestone 2 is still an explicit future Owner
  decision.
- Generator repository default remains OFF until a separately authorized release.
- Migration 0043 needs a separately approved remote deployment plan before any
  non-local activation.
- Learning-cycle anti-farming requires an explicit durable cycle/identity contract;
  V1 deliberately uses unique persisted question identity instead of a weak
  heuristic.
