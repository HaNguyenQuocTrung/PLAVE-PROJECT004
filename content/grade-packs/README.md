# PLAVE grade packs

All Grades 1–9 use `content-factory-grade-pack-v1` and the shared `lib/content-factory` toolchain. These manifests are indexes, not proof of completion.

- Grade 1 references the immutable SQL release and canonical validator.
- Grade 2 references the byte-stable hidden candidate.
- Grades 3–9 now contain hidden Wave A candidates derived from the repository-locked
  MOET 2018 source inventory. A Wave A slice is bounded production evidence, not a
  claim that the grade curriculum is complete.
- Every Grade 2–9 structural source map is generated mechanically from the locked
  source fingerprint and canonical outcome/unit mappings. Open-ended experiential
  outcomes remain structural-only when deterministic verification is insufficient.
- Synthetic primary/secondary fixtures live only in test code and are rejected by production bundling.

Run `content:source-map`, `content:validate`, `content:coverage`, `content:report`,
`content:bundle`, or `content:simulate` with `--grades=1-9`, a range, or a
comma-separated list. All candidates default to `DRAFT/HIDDEN` with pilot, runtime
and retention disabled. No command mutates a database.
