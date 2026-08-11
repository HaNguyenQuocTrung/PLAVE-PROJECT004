# PLAVE grade packs

All Grades 1–9 use `content-factory-grade-pack-v1` and the shared `lib/content-factory` toolchain. These manifests are indexes, not proof of completion.

- Grade 1 references the immutable SQL release and canonical validator.
- Grade 2 references the byte-stable hidden candidate.
- Grades 3–9 are explicit `SOURCE_REQUIRED` scaffolds.
- Synthetic primary/secondary fixtures live only in test code and are rejected by production bundling.

Run `content:validate`, `content:coverage`, `content:bundle`, or `content:simulate` with `--grades=1-9`, a range, or a comma-separated list.
