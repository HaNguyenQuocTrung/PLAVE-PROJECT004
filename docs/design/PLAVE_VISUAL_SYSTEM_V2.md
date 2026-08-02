# PLAVE Visual System V2

Trạng thái: Owner approved; Milestone 1 complete  
Ngày: 2026-08-01  
Phạm vi sản phẩm: Toán lớp 1–9

## Brand idea

PLAVE V2 dùng hình ảnh bầu trời như một cảm giác về không gian và sự tự do,
không dùng như trang trí dày đặc. Hệ thống ưu tiên ba ý: một bước học rõ ràng,
tiến bộ không áp lực, và một giao diện có thể lớn lên cùng học sinh 6–15 tuổi.

- Navy tạo nền tảng tin cậy cho navigation và headings.
- PLAVE blue chỉ dẫn hành động chính và trạng thái active.
- Sky blue/pale sky tạo khoảng thở và phân vùng học tập.
- Turquoise thể hiện tiến bộ; warm yellow chỉ dùng cho khuyến nghị.
- Đỏ chỉ dùng cho lỗi hoặc câu chưa đúng.
- Đường quỹ đạo, điểm nối và ký hiệu Toán là ngôn ngữ đồ họa nguyên bản; không
  dùng stock photography hay emoji chức năng.

## Color tokens

Nguồn typed: `lib/design/visual-system-v2.ts`. CSS tokens nằm trong
`app/globals.css`; lớp cascade cuối cho checkpoint nằm trong
`app/visual-system-v2.css`.

| Token | Giá trị | Vai trò |
|---|---:|---|
| Primary navy | `#0B1F46` | Heading, sidebar, high-emphasis surface |
| PLAVE blue | `#1768E5` | Primary CTA, active navigation |
| Sky blue | `#64C8F4` | Graphic accent, supporting highlight |
| Pale sky | `#F1F8FF` | Calm learning background |
| White surface | `#FFFFFF` | Form, question and content surface |
| Text primary | `#10213F` | Body/high-emphasis content |
| Text secondary | `#52637D` | Supporting content |
| Border | `#D7E4F0` | Structural separation |
| Success | `#087F6B` | Correct/progress |
| Warning | `#A86405` | Caution only |
| Error | `#BE3344` | Error/incorrect |
| Recommendation | `#F2B84B` | Recommended next step |
| Competency | `#6556D9` | Competency evidence |
| Focus ring | `#0B74DE` | Keyboard focus |

WCAG contrast checks for normal text: navy/white `16.17:1`, PLAVE blue/white
`5.06:1`, primary text/white `16.01:1`, secondary text/white `6.11:1`,
success/white `4.93:1`, warning/white `4.68:1`, error/white `5.61:1`, focus/white
`4.60:1`, navy/pale-sky `15.10:1`. Decorative sky accents are not used as the
sole carrier of text or state.

## Typography

The font stack is local/system-only: `Inter`, `Avenir Next`, platform UI and
`Segoe UI`. It makes no external font request, retains Vietnamese diacritics,
clear numerals and common mathematical symbols, and degrades safely across
platforms.

| Style | Size | Use |
|---|---:|---|
| Display | `clamp(3rem, 7vw, 5.6rem)` | Landing identity only |
| Page title | `clamp(2.25rem, 4.8vw, 4rem)` | Primary page goal |
| Section heading | `clamp(1.55rem, 3vw, 2.35rem)` | Major content section |
| Card heading | `1.125rem` | Semantic grouping title |
| Body | `1rem` | Default reading |
| Supporting | `0.9375rem` | Explanation/evidence |
| Label | `0.875rem` | Form and UI label |
| Caption | `0.78rem` | Metadata only |
| Button | `0.9375rem` | Action label |

Display headings use a compact line-height and restrained negative tracking;
body content uses `1.62`. Bold is concentrated in headings, state and primary
actions rather than entire paragraphs.

## Layout architecture

- Public: translucent compact top navigation, two-column compact hero on
  desktop, single-column hero on mobile, trustworthy footer.
- Authenticated desktop: `15.5rem` navy sidebar with role-aware navigation,
  active state and account area. Learning content remains within `72rem`.
- Authenticated mobile: logo/account row plus a five-item touch navigation row;
  no desktop sidebar is squeezed into the viewport.
- Practice: global shell is removed, question width is capped at `60rem`, one
  prompt is the visual focus, progress remains visible, and actions stay within
  reach.
- Parent/Teacher: same sidebar, type and tokens; Parent emphasizes consent and
  summary, Teacher uses a denser metric strip and task hierarchy.

Breakpoints: application shell `980px`, mobile composition `700px`. Primary
touch target is `48px`; content gutters use `clamp(1rem, 3vw, 2.5rem)`.

## Component language

- Buttons: solid blue primary, bordered white secondary, quiet text tertiary,
  red-outline destructive; 48px default height and explicit focus/disabled state.
- Inputs: persistent label, 52px control, 1.5px border, focus halo, inline action
  for password visibility, safe autofill colors.
- Navigation: one SVG stroke icon family, label plus icon active state, no emoji.
- Cards: reserved for a lesson, recommendation, question, consent unit or result;
  ordinary sections use dividers and whitespace.
- Progress: turquoise bar plus text/count; state never relies on color alone.
- Answer options: large targets, key tile, border/background selected state,
  icon + wording + color for correct/incorrect feedback.
- Empty/error: short Vietnamese explanation and a recoverable action where safe.
- Graphics: CSS/SVG sky paths and math constellations with accessible names or
  `aria-hidden` when decorative.

## Accessibility and motion

The foundation retains skip navigation, semantic landmarks, route focus,
visible focus, natural accessible names, labeled forms, text state alongside
color, reduced-motion handling and 200% zoom support. Practice feedback receives
focus after grading. SVG math descriptions never reveal the answer before
submission.

## Propagation rule

Owner đã duyệt visual language này cho sitewide propagation. Production routes
dùng semantic V2 page modifiers và shared cascade cuối, trong khi behavior,
authorization và runtime controls được giữ nguyên. Technical propagation còn
thiếu 0 route; browser evidence nằm tại `artifacts/uiux-v2-sitewide/report.json`.
Owner đã visual-accept bộ screenshot toàn site ngày 2026-08-01; Milestone 1 đã
được đóng. Các thay đổi sau này phải giữ V2 consistency trừ khi Owner mở một
design revision mới.
