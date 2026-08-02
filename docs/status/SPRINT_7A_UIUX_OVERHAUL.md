# SPRINT 7A / 7A.1 — PLAVE UI/UX Overhaul

Ngày acceptance: 2026-08-01  
Trạng thái: `TECHNICAL_ACCEPTANCE_PASS_OWNER_REVIEW_REQUIRED`

## Kết quả

UI/UX overhaul Sprint 7A đã được xác nhận kỹ thuật bằng Playwright chạy trực tiếp
từ shell với browser local thật. Đây chưa phải product completion vì Owner chưa
visual-review. Không dùng in-app Browser/Browser MCP, không remote mutation,
migration, activation, publication hoặc deploy. Generated runtime vẫn mặc định
OFF; preserve unrelated legacy runtime controls; curriculum/generator/competency
semantics và private-solution boundary không thay đổi.

Browser evidence:

- `PLAYWRIGHT_PACKAGE=playwright-core`
- `PLAYWRIGHT_VERSION=1.51.1`
- `CHROMIUM_EXECUTABLE_AVAILABLE=YES`
- `BROWSER_ENGINE=chromium`
- `BROWSER_VERSION=150.0.7871.186`
- `BROWSER_STRATEGY=LOCAL_PLAYWRIGHT`
- `IN_APP_BROWSER_USED=NO`
- `VIEWPORTS=7/7`, `SCREENSHOTS=22`
- Console errors: 0; hydration errors: 0; page errors: 0; failed same-origin
  requests: 0; server warnings: 0.

Raw result: `artifacts/uiux-acceptance/playwright-result.json`. Machine-readable
acceptance: `artifacts/uiux-acceptance/report.json`.

## Routes và screens

Sprint 7A.1 không audit lại route inventory. Inventory Sprint 7A vẫn đủ 50 page
routes/54 entries, không thiếu route dưới `app/`, tại
`artifacts/uiux-acceptance/inventory.json`.

Các nhóm đã giữ trong acceptance: Public, Authentication, Student, Parent,
Teacher, Practice, Result/history, competency/recommendation, account/legal,
error/not-found và generated-practice pilot. `/lessons` tiếp tục là catalog và
learning destination chính; `/learn` không được đưa lại vào primary navigation.

Browser journeys đã PASS:

- Anonymous: landing, login, role registration, protected-route redirect,
  mobile menu và 404 recovery.
- Student zero-progress: local login, dashboard 0/13, recommendation đầu tiên,
  lessons, lesson detail và start practice.
- Returning Student: select/submit, correct + incorrect feedback, next,
  completion, history và progress/competency cập nhật.
- Parent: local login, dashboard/empty state và Student-route denial.
- Teacher: local invite fixture, dashboard, question workshop và practice denial.
- Generated pilot: exact existing local preview PASS ở 390×844 và 1280×800,
  eligible CTA visible, console 0, private leak 0; normal runtime OFF hides CTA;
  ineligible route/API gates PASS.

## Design system và implementation

Sprint 7A đã chuẩn hóa brand/functional colors, typography, content widths,
spacing, radius, border, restrained shadow, focus ring, 44px touch target,
reduced motion và z-index. Shared primitives gồm `Button`, `PageHeader`,
`PasswordField`, `RouteFocusManager`, `Alert`, `StatusBadge`, `EmptyState`,
`LoadingState` và `Skeleton`; navigation, competency, catalogs, practice start và
access states dùng chung đã được củng cố.

Các screen đã đại tu gồm landing/about, auth, shell/navigation, Student
dashboard, lesson catalog/detail, practice/feedback/completion/history,
competency/recommendation, Parent, Teacher, settings/legal và global states.

Browser review Sprint 7A.1 sửa thêm:

- Việt hóa các skill title legacy còn hiển thị tiếng Anh cho Student.
- Chờ RSC/streaming content thật của Parent, Teacher và completion trước khi chụp.
- Reset scroll trước full-page capture và loại Next dev indicator khỏi artifact.
- Chụp empty state có context thay vì frame trắng.
- Giữ text/icon “Chính xác/Chưa chính xác” nhưng mask phần feedback riêng tư.
- Không đưa review answer list/private solution vào completion artifact.
- Phân loại riêng đúng một console resource message của navigation 404 có chủ ý;
  không dùng wildcard ignore.

## Responsive

Tất cả viewport bắt buộc PASS:

- 320×568
- 360×800
- 390×844
- 768×1024
- 1024×768
- 1280×800
- 1440×900

Mỗi viewport có horizontal overflow 0, header không che main, footer nằm trong
page width, focus visible, primary touch targets đạt 44px, math visual overflow 0,
console/hydration 0. Reflow tương đương zoom 200% tại desktop có overflow 0.

## Accessibility

Không có axe dependency trong project, nên dùng DOM assertion fallback đúng yêu
cầu: một main landmark, H1, heading order, form labels, action names, image/SVG
names, duplicate IDs, keyboard Tab + focus visible, touch targets, reduced motion
và zoom 200%. Mobile menu và practice feedback focus contracts PASS;
correct/incorrect có icon + text, không chỉ màu. Contrast được kiểm tra qua tokens
và visual review trên ảnh render. Không mở destructive dialog vì fixtures rỗng;
native-dialog focus contract hiện có được giữ nguyên.

## Screenshot review

22 ảnh thật nằm dưới `artifacts/uiux-acceptance/screenshots/`:

- `landing-desktop.png`, `landing-mobile.png`, `login-desktop.png`,
  `register-role-mobile.png`, `mobile-menu.png`.
- `student-dashboard-desktop.png`, `student-dashboard-mobile.png`,
  `lessons-desktop.png`, `lessons-mobile.png`, `lesson-detail.png`.
- `practice-desktop.png`, `practice-mobile.png`, `practice-correct.png`,
  `practice-incorrect.png`, `practice-complete.png`.
- `history.png`, `competency-recommendation.png`, `parent-dashboard.png`,
  `teacher-dashboard.png`, `empty-state.png`, `error-state.png`,
  `ineligible-state.png`.

Codex đã mở và inspect 22/22 ảnh sau lần chụp cuối. Sau bốn vòng
chụp–review–sửa–chụp lại: critical remaining 0, high remaining 0. Ảnh không chứa
PII, UUID, email, token, allowlist hoặc private solution.

## Tests

- UI/UX + navigation contracts: 9/9 PASS.
- Practice: 550/550 PASS.
- Practice visual readability: 3/3 PASS.
- Universal curriculum: 21/21 PASS.
- Grades 1–9 curriculum: 9/9 PASS; 171 units/546 outcomes giữ nguyên.
- Semantic generator/contracts: 7/7 PASS; 546/546 outcomes, 59 families.
- Generation v1: 4/4 PASS; on-demand generation: 9/9 PASS.
- Generated persistence: 7/7 PASS.
- Competency/recommendation: 10/10 PASS; grade isolation included.
- Parent/Teacher collaboration: 14/14 PASS.
- Generated và unrelated legacy runtime control gates: 21/21 PASS.
- On-demand API/private boundary: 6/6 PASS.
- Registration: 5/5 PASS.
- Exact generated-pilot browser smoke: 2/2 viewports PASS.
- Sprint 7A local Playwright: 7/7 viewports PASS.
- Typecheck: PASS; ESLint: PASS.
- Production build: PASS, 67 routes, compile 4.1s.

Các warning duy nhất trong Node test runner là experimental type-stripping và
module-type performance warnings của dependency/tooling; không phải frontend
runtime warning và không xuất hiện trong browser console.

## Performance và frontend quality

Không thêm runtime dependency. Production build và client/private-boundary tests
PASS. Browser không ghi nhận request loop, failed same-origin request, uncaught
error, hydration mismatch hoặc layout issue severity critical/high. Practice focus
shell tiếp tục loại global header/footer. CSS legacy chưa được refactor rộng vì
không phục vụ trực tiếp acceptance.

## Files và blocker

Danh sách chính xác các file thay đổi nằm trong
`artifacts/uiux-acceptance/report.json#filesMateriallyChanged`. Sprint 7A.1 thêm
harness `scripts/run-sprint7a-local-playwright.ts`, package script acceptance,
localization Student skill labels, report và screenshot artifacts.

Technical browser blockers: none. Product acceptance blocker:
`OWNER_VISUAL_REVIEW_REQUIRED`. Local Supabase và Next processes do acceptance
khởi động được dừng theo lifecycle; không có Git stage/commit/reset.

Historical Sprint 7A technical gate: PASS. Superseded by the Owner acceptance
record in the sitewide V2 follow-up below.

## Sitewide V2 follow-up

Owner đã duyệt phong cách PLAVE V2 sau Sprint 7B.1. Foundation sau đó được áp
dụng lên toàn bộ Public/Auth, Student, Parent, Teacher, account/legal,
lesson/practice/result và recovery surfaces. Local Playwright sitewide cuối dùng
Chromium `150.0.7871.186`: 7/7 viewport, 51 screenshots, 29 route/template rows,
console errors 0, hydration errors 0 và fixture cleanup PASS. Exact remaining
routes not propagated: 0. Evidence: `artifacts/uiux-v2-sitewide/report.json`.

Owner đã visual-accept toàn site ngày 2026-08-01; Milestone 1 được đóng là
`COMPLETE_OWNER_APPROVED`. Milestone 2 đủ điều kiện nhưng chưa được bắt đầu; AI
Tutor vẫn khóa sau Milestone 2.
