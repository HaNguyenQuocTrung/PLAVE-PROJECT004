# Sprint 10A — Critical secret containment, reproducibility and baseline recovery

Ngày: 2026-08-02  
Active result: `COMPLETE`

Sprint này chỉ xử lý F-001, F-004, F-006, F-007 và active status F-009. Không
sửa Generator correctness, Student runtime integration, migration hoặc remote
state.

## Kết luận

Local secret containment, recurrence prevention, canonical compile, AI Tutor
touch target và clean-checkout reproducibility đều PASS. Sau explicit Owner
authorization, 945 validated files được ghi vào một local checkpoint; không local
secret/cache nào được stage và không push. Clean archive từ checkpoint tự
typecheck/build thành công, không cần overlay working-tree source.

Google key cũ đã được loại khỏi `.env.local` và mọi cache đã xác minh. Owner đã
xác nhận credential cũ bị revoke; trạng thái là `OWNER_CONFIRMED`, nguồn
`OWNER_EXPLICIT_DECISION`. Key mới vẫn unset trong các lần test. Không key nào
được in hoặc lưu trong report.

## Exact findings

| Finding | Kết quả Sprint 10A |
|---|---|
| F-001 — CRITICAL secret boundary | RESOLVED: local containment PASS; provider-side revocation Owner confirmed |
| F-004 — HIGH reproducibility | RESOLVED: checkpoint HEAD có 0 required untracked/modified files; clean-room typecheck/build PASS |
| F-006 — HIGH owner-local compile | RESOLVED: canonical owner TypeScript và owner production build PASS |
| F-007 — MEDIUM Tutor accessibility | RESOLVED: response-mode chip 34px → minimum 44px; 3/3 viewports PASS |
| F-009 — MEDIUM active status | Active docs/artifacts corrected; audit-writer lifecycle hardening remains tracked |

F-008 stale heading locator cũng được sửa bằng unique level-2 semantic locator
vì nó chặn chính canonical browser gate; không có Generator behavior change.

## Secret containment

- Baseline fingerprint: short non-reversible SHA-256 only.
- 17 generated cache files, 20 exact occurrences, 332,743,699 aggregate matching
  file bytes dưới `.next/dev/cache/turbopack` và
  `.next-remote-dev-project004/dev/cache/turbopack`.
- Files là untracked generated cache, mode `0644`; cache directories `0755`.
- Git index/history/stash exact matches = 0. Toàn bộ 740 Git blob objects được
  scan, match = 0.
- Cache roots bị ảnh hưởng đã được xóa chính xác; `.env.local` giữ mode `0600`
  và `GOOGLE_API_KEY` hiện unset.
- Post-cleanup Google-key/canary-shaped files trong `.next*`, docs, artifacts,
  public và local artifacts = 0. Client/static secret names/values = 0.
- Không production bundle, log, screenshot hoặc artifact chứa key value.

Runtime config không còn mang `apiKey` trong `AiTutorConfig`. Secret được đọc
server-side qua dynamic Node runtime environment lookup tại provider factory.
Không Client Component import server config; không `NEXT_PUBLIC`; không stringify
provider config có key.

Canonical command mới:

```text
npm run --silent security:secret-boundary
```

Command tạo random canary chỉ trong child environment, compile Tutor dev route,
chạy production build, scan source/dev cache/build/client/artifact/log boundaries,
dùng cache dirs mode `0700`, dừng process tree và xóa toàn bộ canary cache. Kết
quả cuối: canary 0, client/static 0, logs/artifacts 0, cleanup PASS, paid request 0.

## Clean-checkout reproducibility

Machine manifest:
`artifacts/remediation/clean-checkout-reproducibility.json`.

- Pre-checkpoint HEAD `37fc040`: 153 required untracked và 85 required modified
  files; đây là baseline failure lịch sử.
- Owner authorization: local stage + checkpoint commit, no push.
- Checkpoint audit HEAD: `5eb8eba`, 1,576 tracked files.
- Required untracked: 0; required modified: 0; ignored implementation: 0.
- Staged secret/cache paths: 0; staged secret-pattern hits: 0.
- Temporary clean room từ `git archive HEAD`, AI disabled và provider key unset:
  typecheck PASS, build PASS, cleanup PASS.
- Kết luận: `CLEAN_CHECKOUT_REPRODUCIBILITY=PASS`.

## Canonical TypeScript/runtime compile

Root cause hiện hành chính xác hơn summary cũ: owner config đã inherit alias,
nhưng `**/*.ts(x)` kéo audit/browser scripts ngoài app runtime vào production
compile. Sau khi đồng bộ source graph với Next runtime và tách generated type
mode:

- `tsc --noEmit --project tsconfig.owner-local.json`: PASS.
- `PLAVE_OWNER_LOCAL_DEMO=true npm run --silent build`: PASS, 77/77 static
  generation rows.
- Canonical normal typecheck/lint/build: PASS; lint 0 warnings.
- `acceptance:v2-sitewide` dừng trước Next tại
  `SUPABASE_LOCAL_IS_UNAVAILABLE`; không còn compile evidence fail trong lần này.
  Sprint không tự khởi động một non-disposable local stack.

## AI Tutor touch target

Control lỗi là mode chip `Gợi ý`, cao 34 CSS px. Chip và action controls liên
quan hiện tối thiểu 44 CSS px. Playwright Core 1.51.1 + Chrome 150 chạy authenticated
Student trên disposable schema 0001–0042:

- 320×568, 390×844, 1280×800: 3/3 PASS.
- Keyboard activation, accessible name, disabled state, tap/click và dialog focus:
  PASS.
- Console, hydration, page error, horizontal overflow, private leak và XSS: 0.
- 10 screenshots tạo; bốn screenshot đại diện được mở review ở original detail;
  final critical/high = 0.
- Provider là deterministic test adapter dưới Google config; real-provider claim
  không được tạo; paid requests = 0.

## Active milestone status

- Milestone 1: `COMPLETE_OWNER_APPROVED`.
- Milestone 2: `REOPENED_CRITICAL_REMEDIATION`.
- Milestone 3: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`.

Các Owner approvals cũ vẫn được lưu là historical decisions. Không milestone nào
được tự đóng lại.

## Gates và blockers

PASS: secret-boundary, clean-checkout reproducibility, AI Tutor 25/25, quality 6/6, local runtime 9/9,
three-viewport browser, remote runtime config 14/14, owner-local contract 14/14,
canonical typecheck, lint, owner/normal production builds, JSON/schema checks.

Blocked/failed:

- Canonical sitewide browser: BLOCKED vì local Supabase precondition, trước Next.
- Project identity test: pre-existing PROJECT003 references, ngoài 5 target của
  sprint; không tính PASS.
- `npm audit`: `UNVERIFIED_ENVIRONMENT_BLOCKED`; sandbox trả ENOTFOUND và policy
  từ chối gửi dependency metadata. Last verified 0 vulnerabilities ngày
  2026-08-01, không claim current PASS.

Remote mutations = 0. Git mutations = 1 Owner-authorized local checkpoint;
Git pushes = 0. Paid provider requests trong remediation = 0. Disposable
database/browser fixtures cleanup PASS. Milestones 2/3 vẫn giữ active reopened
status; Sprint 10A không tự đóng các product milestones.

SPRINT 10A COMPLETE — SECRET CONTAINED, REPRODUCIBILITY AND BASELINE GATES RESTORED
