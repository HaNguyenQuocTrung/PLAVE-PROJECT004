# PLAVE Motivation Policy V1

`PLAVE_MOTIVATION_POLICY_V1` is a server-authoritative projection over the
Sprint 11A XP ledger, completed attempts and mastery projection. It does not
replace Score, XP or Mastery and it does not add XP reward cycles.

Level uses `25 × (L - 1) × (L + 2)`, capped at level 50. Streaks use completed
non-empty attempts and the fixed `Asia/Ho_Chi_Minh` calendar. Daily goals are
20 XP plus one completed attempt; weekly goals are 100 XP plus three completed
attempts. Achievement awards are append-only and unique per Student,
achievement and policy version.

Migration `0044_motivation_level_streak_goals_achievements.sql` is additive and
local-only in this sprint. Direct Student mutation of ledgers is denied by RLS;
Parent/Teacher visibility remains read-only and relationship-scoped.

Deferred: leaderboard, competition, virtual currency, streak freeze, user goal
editing, adaptive recommendations, and full Parent/Teacher analytics.
