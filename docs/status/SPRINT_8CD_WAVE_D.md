# SPRINT 8C.D — Generator V2 Wave D

Ngày: 2026-08-02  
Roadmap: Milestone 1 `COMPLETE_OWNER_APPROVED`; Milestone 2 `IN_PROGRESS_RESUMED`; Milestone 3 `COMPLETE_OWNER_APPROVED_LOCAL_MVP`  
Trạng thái: `COMPLETE_BROWSER_VALIDATED_OWNER_PRODUCT_REVIEW_REQUIRED`

## Exact scope

Wave D dùng nguyên taxonomy `wave: D` trong full-coverage matrix, không repartition và không suy luận bằng keyword. Exact inventory là:

`WAVE_D_OUTCOMES=232`

| Grade | Outcomes |
|---:|---:|
| 1 | 17 |
| 2 | 19 |
| 3 | 26 |
| 4 | 18 |
| 5 | 17 |
| 6 | 26 |
| 7 | 31 |
| 8 | 40 |
| 9 | 38 |
| **Total** | **232** |

Curriculum-strand distribution: Hình học và Đo lường 190; Hoạt động thực hành và trải nghiệm 19; Số và Đại số 17; Số và Phép tính 6. Machine-readable exact IDs, descriptions, units, prerequisites, interaction policies và contract state nằm trong `artifacts/generator-v2-wave-d/outcome-matrix.json`.

## Product contracts and generation

- 232/232 outcomes map trực tiếp `outcomeId → canonicalCapability → wave-d-v2.1`.
- 50 canonical capabilities; 229 implementations mới và 3 proven baselines được giữ nguyên.
- Unknown outcomes tiếp tục fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.
- Generic fallback, keyword/substring/regex routing, synthetic aliases và runtime LLM solving đều bằng 0.
- MONEY_FINANCE được route theo exact outcome: denomination, purchase/change, profit/loss, one-period interest/rate, transaction/bank-statement balance và payment-method evidence không còn bị chọn chỉ theo grade/difficulty.
- Geometry construction prompt, answer interaction và visual dùng cùng construction contract; polygon outcomes giữ đúng exact curriculum shape.

## Mathematical and diversity gates

| Gate | Result |
|---|---:|
| Generated and independently validated | 13.920/13.920 |
| Outcomes × difficulties × seeds | 232 × 3 × 20 |
| Exact duplicates | 0 |
| Maximum near-duplicate pair rate | 0,115789 ≤ 0,12 |
| Provenance | 8/8 for every sample |
| Fallback / keyword routing | 0 / 0 |
| Negative-control capability families | 50/50 PASS |
| Mathematically unsolvable outcomes | `[]` |

Validation recomputes exact integer/rational/controlled-decimal answers, symbolic coefficients/roots/substitution, geometry relations/dimensions, units, typed interactions, distractors, public boundary and prompt–visual alignment independently from generation.

## Authenticated local persistence proof

Fresh disposable local schema 0001–0042 và authenticated Student path PASS:

- 50/50 canonical capabilities; Grades 1–9; EASY/MEDIUM/HARD;
- 612 immutable generated questions/solutions/answers persisted;
- `GENERATED_V2` and provenance 8/8;
- start, concurrent start, correct/incorrect submit, CAS conflict, duplicate submit, exactly-once progress/history, completion and rollback PASS;
- process-restart resume returns the same snapshot without regeneration;
- RLS/role isolation and private-answer/solver boundary PASS;
- orphan records 0; fixture cleanup PASS; remaining listener none;
- remote access/mutation performed: NO.

## Local browser acceptance

Local `playwright-core` 1.51.1 and installed Chrome 150.0.7871.186 were used directly; in-app Browser was not used and no browser was downloaded.

- Required viewports: 390×844 and 1280×800, 2/2 PASS.
- Canonical capabilities: 50/50; Grades 1–9; all three difficulties.
- All 10 implemented interaction types represented.
- Correct/incorrect feedback, Next, process-restart resume, completion/results/history PASS.
- Console, hydration, page, overflow, private leak and prompt/visual mismatch: 0.
- 24/24 final screenshots opened at original detail and visually reviewed.
- Final critical/high issues: 0.

Review found and fixed real issues before the final clean run, including exact polygon shape routing, grade/outcome-specific money tasks, construction instruction/visual alignment, theorem-specific proof diagrams, internal-label translation, circle endpoint labels and spatial label collisions. Earlier defective screenshots are not final evidence.

## Regression results

- Waves A/B/C: 8/8 each; browser evidence contracts remain PASS.
- Generator V2 core 10/10; Wave D 10/10; full-coverage 6/6.
- Persistence/security 7/7; database proof contract 3/3.
- Practice 550/550.
- Curriculum 9/9 and universal curriculum 21/21.
- Competency 10/10; UI/UX 13/13.
- AI Tutor 25/25, quality 6/6, authenticated local runtime 9/9; paid provider requests 0; implementation changed: NO.
- Typecheck PASS; lint 0 errors/0 warnings; production build PASS (Next.js 16.2.12, 76/76 static pages).
- Current `npm audit` is not claimed PASS: sandbox DNS returned `getaddrinfo ENOTFOUND registry.npmjs.org`; the read-only retry was policy-rejected because dependency-metadata egress was not authorized. Last recorded project result is 0 vulnerabilities on 2026-08-01. This sprint changed neither dependencies nor lockfile.

## Coverage and remaining work

Generator V2 callable coverage is now 452/546. Wave D is 232/232 complete with no blocked product contract. Exactly 94 outcomes remain in Waves E–F (84 in E and 10 in F); full Milestone 2 completion and Owner usefulness approval are not claimed.

Evidence:

- `artifacts/generator-v2-wave-d/report.json`
- `artifacts/generator-v2-wave-d/outcome-matrix.json`
- `artifacts/generator-v2-wave-d/variant-registry.json`
- `artifacts/generator-v2-wave-d/diversity.json`
- `artifacts/generator-v2-wave-d/negative-controls.json`
- `artifacts/generator-v2-wave-d/database-proof.json`
- `artifacts/generator-v2-wave-d/browser-acceptance.json`
- `artifacts/generator-v2-wave-d/screenshot-review.json`
- `artifacts/generator-v2-wave-d/screenshots/`

## Boundaries

No migration, remote access/mutation, activation/publication, deployment, Git mutation, AI Tutor implementation change, default runtime enable or Wave E implementation was performed.

PLAVE GENERATOR V2 WAVE D COMPLETE — 232/232 OUTCOMES BROWSER VALIDATED
