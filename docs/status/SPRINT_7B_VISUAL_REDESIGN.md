# Sprint 7B — PLAVE Visual Redesign Foundation

Ngày: 2026-08-01  
Kết quả kỹ thuật: `V2_SITEWIDE_PROPAGATION_LOCAL_BROWSER_PASS`  
Product gate: `OWNER_VISUAL_ACCEPTANCE_GRANTED`  
Milestone 1: `COMPLETE_OWNER_APPROVED`

## Vì sao cần Sprint 7B

Owner bác acceptance trước vì giao diện tuy nhất quán và responsive hơn nhưng
vẫn là một lớp polish trên cấu trúc cũ: header ngang cho mọi vai trò, nhiều card
trắng giống nhau, hierarchy CTA yếu, catalog thành lưới đồng dạng và brand feeling
chưa khác biệt. Sprint 7B thay đổi thật colors, typography, shell, composition,
navigation, forms, cards, CTA placement và practice focus trên các màn hình đại
diện trước khi nhân rộng.

## Sprint 7B.1 — previous acceptance invalidated

Owner evidence chứng minh visual review trước đã bỏ sót một lỗi critical trên
`/lessons`; vì vậy claim `CRITICAL_HIGH_VISUAL_ISSUES=0` trước đó không hợp lệ.
Tại thời điểm 7B.1, V2 chưa được Owner duyệt. Owner sau đó đã duyệt phong cách
PLAVE V2 và yêu cầu áp dụng lên toàn bộ website; acceptance cũ vẫn được giữ là
invalidated, còn bản sitewide mới là evidence hiện hành.

Local Chromium đã tái hiện đúng lỗi trước khi sửa tại 1280×800, Student Grade 1,
personalized locked-prerequisite card trong `app/lessons/page.tsx`:

- Card rộng `968px` nhưng computed grid columns là `0px 897.812px`.
- Action region rộng `897.812px`; title và description computed width `0px`.
- “Phép cộng trong phạm vi 10” thành 21 dòng; description 53 dòng; card cao
  `2405.266px`.
- Không media query nào trong 700/768/980/1024/1040px active; không có container
  query ancestor. `writing-mode` là `horizontal-tb`, `white-space` và
  `word-break` đều `normal`.

Exact cascade root cause là tổ hợp:

1. `.catalog-page--v2 .unit-card { grid-template-columns: minmax(0, 1fr) auto; }`
2. `.catalog-page--v2 .unit-card__actions { grid-column: 2; grid-row: 1 / span 4; }`
3. Locked-note dài nằm trong action flex region và `.unit-card__locked-note` có
   `width: 100%`, làm auto track nhận max-content gần toàn card.
4. Global `h1, h2, h3, p { overflow-wrap: anywhere; }` không tạo zero-width
   track nhưng biến hậu quả thành wrapping từng ký tự.

Fix không dùng arbitrary fixed pixel width: card có bốn semantic regions
`status`, `content`, `metadata/progress`, `actions`; desktop/tablet dùng content
`minmax(0, 1fr)` và action `max-content`, mobile xếp bốn vùng thành một cột.
Locked-note được đưa về content region. Normal Vietnamese text dùng
`overflow-wrap: normal`; `anywhere` chỉ còn cho hai code/identifier surfaces.

After evidence tại cùng viewport: grid columns `739.281px 158.531px`, title
`739.281px`/1 dòng, description `739.281px`/1 dòng và card cao `185.656px`.
Computed evidence và ảnh sanitized:

- `artifacts/uiux-redesign-checkpoint/collapsed-layout-before.json`
- `artifacts/uiux-redesign-checkpoint/collapsed-layout-after.json`
- `artifacts/uiux-redesign-checkpoint/lesson-card-detail-before.png`
- `artifacts/uiux-redesign-checkpoint/lesson-card-detail-after.png`

## New direction implemented

- Navy/PLAVE blue/sky system với supporting colors có chức năng rõ ràng.
- Type scale lớn, chắc nhưng không kindergarten; Vietnamese và ký hiệu Toán đọc
  rõ trên mobile.
- Public landing dùng compact hero và SVG/CSS sky-math journey nguyên bản.
- Authenticated desktop dùng compact role-aware sidebar; mobile dùng logo/account
  row và touch navigation riêng.
- Auth dùng split composition desktop, progressive role selection và stacked
  mobile composition.
- Student Dashboard đặt continue/start trước, recommendation tiếp theo, rồi mới
  competency và activity.
- `/lessons` đặt recommendation lên trước metrics/catalog; trạng thái và CTA dễ
  scan hơn.
- Practice có distraction-free shell, stable question surface, 2-column answers
  desktop, 1-column mobile và text/icon/color feedback.
- Results dùng accomplishment hero, skill evidence và next-action hierarchy.
- Parent và Teacher dùng cùng brand language nhưng khác density và task priority.

Tài liệu token và contrast: `docs/design/PLAVE_VISUAL_SYSTEM_V2.md`.

## Components changed/created

Created: typed V2 token source, `PlaveIcon`, `SkyMathJourney`, `AuthBrandPanel`,
and a final V2 cascade layer. Changed: application/public header, role navigation,
role selector, buttons/forms via shared styles, Student summary, recommendation
ordering, universal lesson catalog presentation, practice runner, results, Parent
dashboard and Teacher dashboard.

No production dependency was added. No curriculum, generator, competency,
recommendation, auth, schema, role permission, release or runtime semantics were
changed.

## Representative screens implemented

- Public landing, login, registration/role selection.
- Student Dashboard, `/lessons`, lesson detail.
- Practice default/mobile/correct/incorrect and completion/results.
- Parent Dashboard and Teacher Dashboard.
- Public mobile menu, authenticated mobile navigation, empty/error/ineligible
  representative states.

## Browser and accessibility evidence

Local Playwright Core `1.51.1`, Chromium `150.0.7871.186`, loopback
`127.0.0.1:3016`; in-app Browser not used. Final run:

- Seven viewports PASS: 320×568, 360×800, 390×844, 768×1024, 1024×768,
  1280×800, 1440×900.
- Required redesign sizes 390×844, 768×1024, 1280×800 and 1440×900 included.
- Horizontal overflow 0, math overflow 0, header overlap 0, console errors 0,
  hydration errors 0, failed same-origin requests 0.
- DOM assertions PASS: one main landmark, heading order, accessible actions,
  form labels, unique IDs and image/SVG names.
- Keyboard focus, 48px primary controls, reduced motion and 200% zoom PASS.
- Axe was not added; the existing dev-only Playwright DOM scan plus manual
  keyboard/visual checks was used.

## Visual self-review

Kết quả review cũ đã bị invalidated. Ở vòng 7B.1, Codex mở lại 24 representative
PNGs và toàn bộ 7 lesson viewport PNGs ở original resolution, cộng before/after
detail. Review lần này kiểm tra trực tiếp narrow internal tracks,
character-level wrap, text/card bounds, content/action ratio và card height bên
cạnh hierarchy, spacing, typography và CTA.

Critical issue found/fixed trong 7B.1:

- Locked prerequisite lesson card có content track `0px` và action track gần
  toàn card → chuyển sang semantic grid, đưa locked note ra khỏi action và sửa
  wrapping policy.

Các issue đã sửa trong các render-review iteration trước vẫn được giữ:

- Sidebar logo became invisible on navy → restored original logo on a deliberate
  white logo surface.
- Grade 1 outer catalog rendered a two-column, excessively long grid → forced a
  single learning path; 7B.1 tiếp tục sửa inner card grid mà review trước bỏ sót.
- Practice mobile title and progress were squeezed into two columns → stacked the
  header and preserved full-width progress.
- Auth inherited legacy outer padding → removed the unused frame space.
- Initial mobile navigation artifact did not show account/brand → implemented a
  dedicated logo/account + touch navigation composition.
- Student hero had three competing CTAs → reduced it to one primary action.
- Parent navy copy and lesson CTA copy had weak inherited contrast → corrected
  both in the final cascade.
- Bảy lesson screenshots mới đặt affected card trọn dưới navigation ở đúng
  viewport thay vì chỉ chụp catalog hero.

Sau khi ghi nhận `found=1`, `fixed=1`, automated DOM audit và manual original-size
review không còn critical/high issue trên representative checkpoint. Owner đã
recheck và duyệt style sau evidence này; full-site visual acceptance vẫn là gate
riêng.

## Screenshot artifacts

Required set:

- `landing-desktop.png`, `landing-mobile.png`
- `login-desktop.png`, `login-mobile.png`, `register-role.png`
- `student-dashboard-desktop.png`, `student-dashboard-mobile.png`
- `lessons-desktop.png`, `lessons-mobile.png`
- `practice-desktop.png`, `practice-mobile.png`, `practice-correct.png`,
  `practice-incorrect.png`
- `results.png`, `parent-dashboard.png`, `teacher-dashboard.png`
- `mobile-navigation.png`

Additional reviewed evidence: `public-mobile-menu.png`, `lesson-detail.png`,
`history.png`, `competency-recommendation.png`, `empty-state.png`,
`error-state.png`, `ineligible-state.png`, `lesson-card-detail-before.png`,
`lesson-card-detail-after.png`, cùng `lessons-320.png`, `lessons-360.png`,
`lessons-390.png`, `lessons-768.png`, `lessons-1024.png`, `lessons-1280.png`,
`lessons-1440.png`.

All are under `artifacts/uiux-redesign-checkpoint/`. Feedback screenshots mask
private solution text; artifacts contain no UUID, email, token, allowlist or PII.

## Regression gates after the fix

- UI/navigation + collapsed-layout contracts: 13/13 PASS.
- Practice: 550/550 PASS; visual readability 3/3 PASS.
- Grades 1–9 curriculum: PASS; universal curriculum 21/21 PASS.
- Competency/recommendation: 10/10 PASS, including grade isolation.
- Parent/Teacher universal + bounded client runtime: 12/12 + 2/2 PASS.
- API/private-solution boundary: 6/6 PASS.
- Typecheck PASS; ESLint PASS.
- Production build PASS: 67 static/dynamic routes, compile 3.9s.
- Final local Playwright Core 1.51.1 / Chromium 150.0.7871.186: 7/7
  viewports, 51 sitewide screenshots, console/hydration 0.
- Generic DOM scan checked landing, auth, Student Dashboard, `/lessons` at seven
  viewports, lesson detail, practice, results, progress, Parent and Teacher. It
  fails on narrow/tall text, character-level wrapping, zero-size text and text
  escaping semantic cards.
- Lesson-card scan checks every rendered card: title width/line count, metadata
  width, content/action proportions, CTA bounds, internal overflow and excessive
  height. Results: mobile title max 2 lines; tablet/desktop max 1 line; page/card
  overflow 0 at all seven viewports.

## Sitewide propagation after Owner style approval

Owner đã duyệt phong cách V2 và mở gate propagation. Lớp V2 hiện áp dụng cho
toàn bộ nhóm route production hiện có, không làm lại inventory và không đổi
behavior:

- Public/auth/legal: landing, about, demo, login/register, password recovery,
  onboarding, confirmation, privacy, terms và not-found/recovery.
- Student: dashboard, `/lessons`, `/learn`, lesson detail, progress/history,
  classroom, assignment/review, diagnostic/review, goals, connections, profile,
  settings, practice shells và result states.
- Parent: dashboard, consent connection flow và child progress detail.
- Teacher: dashboard, onboarding/profile, classrooms/detail/gradebook, question
  workshop, assignment create/detail/analysis và empty/error states.
- Internal preview/control surfaces giữ nguyên quyền và runtime behavior nhưng
  dùng cùng typography, spacing, form, table và state language V2.

Route-level propagation dùng semantic modifiers và shared V2 cascade; các trang
dữ liệu dài dùng `minmax(0, 1fr)`, responsive table/form strategy và stacking
mobile thay vì fixed width. Normal Vietnamese wrapping giữ theo từ.

Local Playwright sitewide trên `127.0.0.1:3017` tạo 51 screenshot thật và 29
route/route-template evidence rows. Tất cả 7 viewport PASS, overflow 0,
clipped-visible-text 0, console/hydration 0. Fixture Parent/Teacher được tạo qua
UI consent/workflow local, teardown PASS; artifact che email, mã học sinh và mã
lớp. Codex đã mở 51/51 ảnh ở original resolution.

Các issue mới tìm thấy và sửa trong vòng sitewide self-review:

- Heading jump trên Student assignment page → thêm heading section hiển thị.
- Nested `main` trong diagnostic, preview và dynamic loading states → đổi inner
  region sang `div`/`section` đúng landmark.
- Dấu kiểm trang Giới thiệu đè ký tự đầu → dùng explicit icon/text grid.
- Fixture identifier còn đọc được trong ảnh profile/settings/class detail → mask
  tại screenshot layer, không đổi UI hay dữ liệu thật.
- Disposable database không có active universal release → không activation để
  “làm đẹp” evidence; thay bằng Grade 7 preview + shared runtime shell evidence.

Exact routes not yet propagated: **none**. Những route cần dữ liệu động không có
trong fixture được xác nhận qua shared production components và route-template
evidence; không có claim activation hoặc remote runtime.

## Stop decision

Owner đã duyệt visual result toàn site ngày 2026-08-01. Milestone 1 hoàn tất với
technical browser evidence và Owner acceptance; blocker còn lại: none. Milestone
2 đủ điều kiện được mở nhưng chưa được bắt đầu trong sprint này. Không có
generator hoặc AI Tutor work; không remote mutation, migration, deploy,
publication, activation, Git stage/commit/push hoặc runtime enablement.

MILESTONE 1 — PLAVE GRADES 1–9 UI/UX COMPLETE — OWNER APPROVED
