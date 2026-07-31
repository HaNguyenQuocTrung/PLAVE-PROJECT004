# Automatic Question Generation V1

The local Grade 2 vertical slice is:

`Specification → Generator → Independent solver/validator → Duplicate detector → Candidate artifact → Human review → future guarded publication`

V1 covers representative addition/subtraction, comparison and centimetre measurement skills at EASY, MEDIUM and HARD. It uses deterministic seeds, stable hashes, typed provenance and `HEURISTIC_DIFFICULTY_V1`; it is not calibrated difficulty data.

Candidate artifacts are local-only, `DRAFT_REVIEW_REQUIRED`, and separate from runtime, database and the frozen active release. Public questions and private solutions are stored in separate artifact fields and are never sent to Student clients.

Reviewers must check mathematical semantics, Vietnamese wording, distractor misconceptions, visual/prompt parity and curriculum alignment before any future guarded publication. Expansion to Grades 1–9 should add bounded generators and independent validators without changing this boundary. Any future AI/LLM use is authoring assistance only; deterministic validation remains authoritative.
