# Project primary decision

## PROMOTE_PROJECT004_TO_PRIMARY

All three prior HIGH findings are closed:

- Grade 5 decimal comparison now uses place value correctly and passes six required edge cases.
- All eight required visual kinds render typed, accessible HTML/CSS/SVG models and fail closed when unsupported.
- The aggregate suite now passes 717/717.

Final gates: zero BLOCKER, zero HIGH, lint PASS, typecheck PASS, production build PASS, Grade 1 regression PASS and frozen Grade 2 validation PASS. Migrations 0035–0037 and their checksums are unchanged; no secret or migration divergence was found.

PROJECT004 remains a Grades 1–9 vertical slice with 16 preview units and 192 preview questions, not a complete curriculum. Forty grade/domain gaps remain.

Promotion is a recommendation only. No copy, rename, Git mutation, remote SQL, activation, publication or deployment was performed.

Owner's next action: prepare and approve a filesystem-level promotion runbook with checksum backup and rollback before renaming or copying either project directory.
