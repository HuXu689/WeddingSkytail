# PLAN_TASK_REWORK — Sửa chất lượng UI thiệp, hiệu ứng, quyền riêng tư public và quy trình nhiều phiên

> CHECKPOINT KHỞI TẠO: trạng thái NOT_STARTED. Chưa task nào của file này được thực hiện.
> File này là kế hoạch THAY THẾ cho phần việc "làm đẹp / sửa phát sinh" của `PLAN_TASK.md` và `PLAN_TASK_FEATURES.md`.
> Các task F01–F13 và T01–T22 trong hai file cũ là LỊCH SỬ: không chạy lại, không đánh dấu lại; chỉ tham chiếu để không sửa trùng hoặc phá thứ đã đúng (xem phụ lục mục 12).
> Đặt file này ở gốc repository. Đây là nơi lưu tiến độ duy nhất cho chuỗi phiên rework; mỗi phiên chỉ đọc/ghi file này + code.

## 0. Cách chạy

1. Mở AI coding tại repository root. Không cần đọc lại toàn bộ hai plan cũ; đọc file này là đủ bối cảnh.
2. Gửi **Prompt bắt đầu** bên dưới nguyên khối.
3. AI khảo sát lại hiện trạng (R01), điền bổ sung đường dẫn thật vào Project Snapshot, rồi làm lần lượt theo Task Ledger.
4. Sau MỖI task: cập nhật trạng thái task, ghi Task Log, lưu bằng chứng (log + screenshot) vào `.qa-artifacts/rework/<task-id>/`, cập nhật Handoff.
5. Khi phiên sắp hết hoặc bị ngắt: phiên mới gửi **Prompt tiếp tục**, đối chiếu code thật với trạng thái ghi trong file, khôi phục task IN_PROGRESS từ diff. Không chạy lại migration/seed mù quáng.
6. File kế hoạch giúp phục hồi công việc; code trên đĩa + checkpoint mới là cơ sở tiếp tục, không phải bộ nhớ chat.

### Prompt bắt đầu — sao chép nguyên khối

```text
Bạn là Senior Product Designer + Full-stack Engineer + QA. Hãy đọc PLAN_TASK_REWORK.md tại gốc repository trước tiên; đọc thêm PLAN_TASK.md và PLAN_TASK_FEATURES.md CHỈ ở phần phụ lục ánh xạ (mục 12 của file rework) để biết việc cũ đã chốt ở đâu.

Nhiệm vụ: sửa các vấn đề đã phân tích trong Problem Register (mục 2): quyền riêng tư mốc lịch trình/nghi lễ trên thiệp public, chất lượng thị giác và typography, lịch tháng, hệ hiệu ứng, giao diện các section nội dung, RSVP/lời chúc/hộp quà, editor quản trị; kèm quy trình checkpoint để chạy nhiều phiên.

Quy tắc bắt buộc:
- Khảo sát trước khi sửa: stack, routes, schema, API, CSS, test hiện có. Dẫn đường dẫn file thật; không tuyên bố đã đọc/chạy thứ chưa làm.
- KHÔNG thêm dependency mới, không rewrite toàn bộ, không đổi schema nếu không bắt buộc; giữ hành vi và logic bảo mật hiện có (server filtering, idempotency, quyền owner/editor).
- Mọi task UI chỉ được DONE khi có bằng chứng ảnh chụp màn hình trước/sau ở ít nhất 2 breakpoint (390px và 1440px) lưu trong .qa-artifacts/rework/<task-id>/, kèm log test/typecheck/build.
- Không tự commit/push/deploy, không chạy migration production, không seed dữ liệu thật, không in secret/token/số tài khoản vào log hoặc tài liệu.
- Dữ liệu minh họa phải gắn nhãn DEMO và không xuất bản như dữ liệu thật.
- Tôn trọng prefers-reduced-motion; không dùng animation gây layout shift; không glassmorphism/gradient tím mặc định.
- Sau mỗi task cập nhật Task Ledger, Task Log và Handoff trong PLAN_TASK_REWORK.md trước khi dừng.
Bắt đầu bằng R01 (khảo sát + baseline ảnh chụp hiện trạng).
```

### Prompt tiếp tục / khôi phục phiên — sao chép nguyên khối

```text
Tiếp tục theo PLAN_TASK_REWORK.md. Đọc mục 3 (Snapshot), 6 (Task Ledger), 8 (Checkpoint + Task Log) và 11 (Handoff). Kiểm tra git status/diff và các file đang sửa trước khi thay đổi.
Đối chiếu trạng thái ghi trong file với code thật: không tin task DONE nếu thiếu bằng chứng (log + screenshot đúng đường dẫn); không làm lại task DONE đã xác minh; không tự ý mở rộng phạm vi.
Nếu phiên trước chết giữa chừng: khôi phục task IN_PROGRESS từ diff và trạng thái dev thực tế; chạy lại test liên quan để xác nhận điểm dừng; KHÔNG chạy lại seed/migration/đột biến dữ liệu.
Tóm tắt 5 dòng trạng thái rồi tiếp tục task đang dở hoặc task TODO đủ dependency. Cập nhật file này sau mỗi task.
```

### Quy tắc bằng chứng cho AI thực thi

- "Đã chạy" phải kèm tên lệnh + kết quả thật (số test pass/fail, exit code).
- "Đẹp hơn" phải kèm ảnh chụp trước/sau cùng URL, cùng breakpoint; ảnh lưu thành file, không mô tả bằng lời suông.
- "Không lộ dữ liệu riêng" phải kèm kết quả grep payload public (lệnh ở mục 7).
- Mọi giới hạn còn lại ghi vào mục 11 Blockers, không che bằng câu khẳng định chung.

## 1. Phạm vi, nguyên tắc và định nghĩa hoàn thành

### Phải có

- Thiệp public (`/w/[slug]`) chỉ hiển thị đúng phần chủ thiệp CHỌN công khai; mốc nghi lễ riêng không xuất hiện mặc định; editor cho thấy rõ danh sách những gì sẽ public trước khi lưu.
- Hệ thị giác nhất quán: type scale, spacing scale, màu theo accent, độ sâu lớp nền, họa tiết theo theme; không còn khối chữ trần trên nền phẳng.
- Lịch tháng đẹp và dễ chạm trên mobile: ô ngày rõ trạng thái (hôm nay / ngày cưới / có mốc / trống), chuyển tháng có chuyển động nhẹ, khối chi tiết gắn với ngày đang chọn.
- Hệ hiệu ứng có chủ đích: mở thiệp, reveal theo tầng, đổi tháng lịch, mở/đóng disclosure, mục mới trong feed lời chúc, hover/press của nút; tất cả tắt khi prefers-reduced-motion.
- Các section INTRO/FAMILY/CEREMONY/TIMELINE/DRESS_CODE có bố cục riêng biệt, đọc nhanh được, không giống nhau một khuôn.
- Editor quản trị: form nhóm rõ ràng, xem trước 3 ngữ cảnh dễ hiểu, cảnh báo public rõ ràng.
- Checklist QA thật: ảnh 3 breakpoint × 3 theme × public/guest, contrast, keyboard, reduced-motion, fallback offline; một lượt browser→DB trên PostgreSQL disposable để đóng các NOT VERIFIED cũ.

### Ngoài phạm vi mặc định

- Không thêm thư viện UI/animation/map mới; không dịch vụ trả phí; không social login/analytics.
- Không đổi schema DB trừ khi task quyền riêng tư bắt buộc (ưu tiên sửa default ở frontend + cảnh báo; backend đã lọc PRIVATE ở server).
- Không tự tải font/ảnh từ mạng; nếu cần font self-host phải hỏi trước (asset nặng, ảnh hưởng bundle).
- Không xây cổng thanh toán, không xác nhận chuyển khoản, không tuyên bố đã nhận tiền.
- Không redesign admin theo hướng dashboard; chỉ làm form rõ ràng và nhất quán.

### Thứ tự ưu tiên

1. Quyền riêng tư và dữ liệu đúng (R02) — rủi ro nhất, sửa trước.
2. Nền thị giác + typography (R03, R04) — mọi task đẹp sau này dựa vào đây.
3. Từng khối giao diện theo luồng đọc của khách (R05→R09).
4. Editor (R10), QA tổng + đóng NOT VERIFIED (R11), dọn dẹp bàn giao (R12).

### Định nghĩa "đẹp" đo được (tránh DONE cảm tính)

- Không tràn ngang ở 360/390/768/1440; mục tiêu chạm ≥ 40px cho ô lịch và nút chính trên mobile.
- Contrast chữ/nền ≥ 4.5:1 cho body, ≥ 3:1 cho chữ lớn; chạy `scripts/contrast-audit.mjs` và ghi kết quả.
- Mỗi màn hình chính dùng tối đa 2 font family và 1 thang type scale chung; heading/body/caption phân biệt bằng kích thước + weight + spacing, không chỉ bằng màu.
- Mọi chuyển động dùng transform/opacity, durata ≤ 400ms cho tương tác trực tiếp, ≤ 700ms cho reveal; không animation vòng lặp vô hạn trừ ornament rất nhẹ ở cover.
- Nội dung mẫu trong ảnh QA là dữ liệu DEMO có nhãn, không lorem ipsum.



## 2. Phân tích hiện trạng — Problem Register

> Bằng chứng dưới đây được đối chiếu trực tiếp từ code và ảnh chụp trong `.qa-artifacts/` tại thời điểm lập kế hoạch.
> Cột "Task xử lý" trỏ tới Task Ledger mục 6. Không sửa vấn đề ngoài danh sách này nếu chưa thêm vào register.

| ID | Vấn đề | Bằng chứng hiện trạng | Nguyên nhân gốc | Task xử lý |
|---|---|---|---|---|
| P01 | Mốc nghi lễ/lich trình riêng tự xuất hiện trên thiệp public | `section-editor.tsx` dòng 39, 117 và 248 (nút "Thêm mốc"): mốc TIMELINE mới mặc định `audience:'PUBLIC'`; `shared/wedding-calendar.ts` `publicCalendar()` lấy mốc PUBLIC vào lịch tháng ở `/w/[slug]`; ảnh `.qa-artifacts/rework/R01/before-calendar-public-390.png` hiện mốc trên bản public | Default nguy hiểm + thiếu màn hình "những gì sẽ public" trước khi lưu; fallback `startsAt` của hàng cũ cũng lọt ra bản public | R02 |
| P02 | Giao diện sơ sài, thiếu chiều sâu: nền kem phẳng, divider mảnh, section như danh sách chữ trần, cover gradient phẳng với khối tròn placeholder | `.qa-artifacts/elegant-390.png`, `private-form-390.png`, `invitation-review/sections-mobile.png` | CSS viết theo từng cụm qua nhiều đợt, không có type scale/spacing scale/layer nền dùng chung; `color-tokens.css` chỉ là palette compat dạng hex thô, không phải token ngữ nghĩa | R03, R05, R06 |
| P03 | Chữ tiếng Việt lệch dấu ở chữ serif cỡ lớn ("Trầ n Thanh Bình") trên cover và tên nhân vật INTRO — **ĐÃ SỬA ở R04 (RD13)** | R01 xác nhận trên build hiện tại: `before-vietnamese-mobile.png`, `before-vietnamese-desktop.png`; byte fixture là NFC (`U+1EA7`) nên KHÔNG phải lỗi dữ liệu NFD; R04 A/B proof: `text-rendering:optimizeLegibility` (globals h1–h3) là nguyên nhân | Sửa bằng `.wedding-canvas h1,h2,h3{text-rendering:auto}` + test contract; bằng chứng sau sửa `R04/view-clip-intro-base.png`, `after-r04-elegant-390.png` | R04 (DONE) |
| P04 | Lịch tháng khô cứng: `<table>` trần, nút tháng vuông nhạt, chip "1 mốc" bé, khối chi tiết rời khỏi lưới, không chuyển động đổi tháng | `wedding-month-calendar.tsx`, `calendar-public-390.png` | Component làm tối giản cho đúng chức năng, chưa có lượt thiết kế thị giác | R07 |
| P05 | Thiếu hiệu ứng: chỉ 5 `@keyframes` (`cardIn`, `heroReveal`, `sectionReveal`, `introFloat`, `gift-open`) + reveal one-shot; không transition cho đổi tháng, disclosure, feed, hover/press | `design.css` (đếm @keyframes ở R01), `motion.ts` | Motion chưa được coi là hệ thống; mỗi đợt thêm một hiệu ứng rời rạc | R08 |
| P06 | RSVP / lời chúc / hộp quà đủ hành vi nhưng nghèo thị giác: disclosure phẳng, feed lời chúc như danh sách mặc định | `guest-disclosure.tsx`, `wish-book.tsx`, `wish-feed.tsx`, `gift-box.tsx` | Ưu tiên hành vi ở đợt feature; phần nhìn chưa được đầu tư | R09 |
| P07 | Editor quản trị thô: form dài một khối, nhóm trường không rõ, chuyển ngữ cảnh xem trước khó thấy dù đã có 3 context | `section-editor.tsx` (file 26KB), `admin.css` | Admin chỉ được làm mức "dùng được" | R10 |
| P08 | Quy trình nghiệm thu cảm tính: task cũ DONE nhờ contract test grep chuỗi source; danh sách NOT VERIFIED dài (browser→DB E2E, device thật, QR thật, Safari/Zalo) | `PLAN_TASK_FEATURES.md` mục Test Log/Handoff; `tests/*.test.mjs` đa số là test chuỗi/class | Acceptance criteria thiếu bằng chứng thị giác và E2E thật | R01, R11 |
| P09 | Gốc repo bẩn: ~120 file `.log` của các phiên cũ; `.qa-artifacts` chứa cả Chrome profile nặng | listing gốc repo | Không có quy tắc dọn log theo phiên | R12 |
| P10 | File plan cũ 109–135KB, checkpoint trùng lặp khiến phiên mới tốn token và dễ đọc nhầm trạng thái | `PLAN_TASK.md`, `PLAN_TASK_FEATURES.md` | Kế hoạch append-only không nén lại | File này + R12 |

### Ghi chú phân tích thêm

- **P01 chi tiết:** backend `SectionService.list(...)` đã lọc `audience='PRIVATE'` và mốc PRIVATE khỏi payload public ở server — lớp bảo vệ thật vẫn đúng. Vấn đề nằm ở default phía editor khiến chủ thiệp vô tình công khai nghi lễ riêng, và ở chỗ không có màn hình tóm tắt "bản public sẽ gồm những gì". Hướng sửa: đổi default mốc mới sang PRIVATE, thêm panel "Nội dung sẽ công khai" liệt kê section PUBLIC + mốc PUBLIC + cảnh báo khi bật PUBLIC cho CEREMONY; giữ nguyên server filtering.
- **P03 chi tiết (đã cập nhật ở R01):** byte fixture là NFC (`U+1EA7`) nhưng chữ serif cỡ lớn vẫn lệch. R04 phải probe trực tiếp trong browser: (1) lấy `textContent` code point + `getComputedStyle().fontFamily` của `.intro-person-name` và `.family-member-name`; (2) kiểm glyph fallback bằng canvas measure cho U+1EA7/U+1EC7 ở các cỡ chữ; (3) thử tắt `font-kerning`/`font-feature-settings` và đổi font stack để cô lập nguyên nhân; (4) thêm fixture NFD phòng ngừa và giữ ảnh trước/sau.
- **P05 chi tiết:** `globals.css` đã có kill-switch `prefers-reduced-motion` toàn cục — giữ nguyên và xây hệ motion token trên nền đó, không phá hành vi hiện có.
- **Không coi là lỗi:** việc thiệp public có lịch tháng và lời chúc đã duyệt là chủ đích sản phẩm; chỉ sửa phần quyền (P01) và phần nhìn (P04, P06).

## 3. Project Snapshot — baseline đã xác minh

> Điền bổ sung ở R01 nếu có sai khác. Đường dẫn tương đối so với gốc repo.

| Hạng mục | Kết quả xác minh |
|---|---|
| Frontend | Next.js 16.4.2 (App Router, trang `'use client'`), React 19.3.1, TypeScript ~5.9.3; không có thư viện UI/animation bên ngoài |
| Chạy/test FE | `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` (= `node --test tests/*.test.mjs`, 38 file test) trong `frontend/` |
| CSS thiệp | `frontend/src/app/globals.css`, `frontend/src/app/color-tokens.css` (palette compat), `frontend/src/features/invitation/design.css` (~50KB) |
| Routes khách | `/w/[slug]` thiệp chung public; `/i/[token]` redeem link; `/invitation/[id]` lời mời riêng của khách |
| Component thiệp chính | `features/invitation/`: `design.tsx` (WeddingCanvas), `sections.tsx`, `wedding-month-calendar.tsx`, `venue-map.tsx`, `wish-book.tsx`, `wish-feed.tsx`, `gift-box.tsx`, `guest-disclosure.tsx`, `album.tsx`, `music-control.tsx`, `motion.ts` |
| Shared | `shared/wedding-calendar.ts` (publicCalendar/guestCalendar/monthCells), `shared/text.ts` (NFC), `shared/api.ts`, `shared/time.ts` |
| Admin | `app/admin/*` + `features/admin/*`: `section-editor.tsx`, `design-editor.tsx`, `gift-editor.tsx`, `layout-editor.tsx`, `shell.tsx`; CSS `app/admin/admin.css` |
| Backend | Spring Boot (Java), PostgreSQL + Flyway `backend/src/main/resources/db/migration/V1..V26`; test `mvn test` trong `backend/` |
| Quyền public | `wedding/SectionService.java` lọc `audience='PRIVATE'` và mốc PRIVATE ở server; `publicCalendar()` FE chỉ là projection phụ |
| QA scripts | `scripts/browser-qa.mjs`, `invitation-review-qa.mjs`, `contrast-audit.mjs`, `contrast-pixels.mjs`, `features-persistence-qa.ps1`, `seed-demo.ps1` |
| Ảnh bằng chứng cũ | `.qa-artifacts/*.png` và `.qa-artifacts/invitation-review/*.png` (dùng làm ảnh "trước" cho R01) |
| Trạng thái git | HEAD `07e73c3`; working tree sạch tại thời điểm khảo sát; không tự commit |
| Môi trường R01 | Node v24.15.0, npm 11.12.1, Chrome headless qua CDP (đường dẫn mặc định), Docker 29.8.0, Java 25.0.1, mvn khả dụng |
| Baseline R01 | `.qa-artifacts/rework/R01/`: log `fe-test.log` (161/161 pass), `fe-typecheck.log`, `fe-build.log`, `invitation-review.log`, `editor-review.log` (đều exit 0) + 13 ảnh `before-*.png` + `notes.md` |

### Khảo sát bắt buộc ở R01 (không bỏ qua)

1. Chạy `npm test`, `npm run typecheck`, `npm run build` trong `frontend/`; ghi log vào `.qa-artifacts/rework/R01/`.
2. Chụp ảnh hiện trạng public + guest + editor ở 390/768/1440 bằng script QA hiện có hoặc browser thủ công; lưu làm baseline "trước".
3. Đối chiếu từng dòng Problem Register với code hiện tại; nếu vấn đề nào đã hết (ví dụ P03), ghi "KHÔNG CÒN" kèm bằng chứng và bỏ task tương ứng khỏi lượt làm.
4. Kiểm tra `git status` để bảo toàn thay đổi chưa commit của người dùng nếu có.

## 4. Hướng thiết kế thống nhất

### Ngôn ngữ thị giác: "giấy và ánh sáng"

- Nền thiệp là lớp giấy ấm có chiều sâu: gradient rất nhẹ + vignette mềm tạo bằng CSS thuần (không ảnh ngoài), khác nhau theo theme; nội dung đặt trên "tờ giấy" có bóng đổ mờ để tách lớp.
- Họa tiết theo theme giữ đúng tinh thần hiện có: ELEGANT = nét lá/đường mảnh; TRADITIONAL = khung đôi + song hỷ; MODERN = lưới lệch và chữ lớn. Không pha trộn họa tiết giữa các theme.
- Divider không còn là đường kẻ mảnh đơn độc: dùng cặp "đường + ornament nhỏ" (✦ ❧ 囍 theo theme) căn giữa hoặc lệch theo bố cục section.
- Cấm: glassmorphism, gradient tím/hồng neon, bóng đổ cứng đen, bo góc uniforme mọi thứ, card chồng card không lý do.

### Typography

- Giữ font hệ thống hiện tại (không tải font mới khi chưa được đồng ý); xây type scale dùng chung qua CSS variable: display (tên hai bạn), h2 section, h3 mục con, body, caption/small; mỗi bậc kèm line-height và letter-spacing xác định.
- Tên hai bạn và tiêu đề section dùng weight tương phản mạnh với body (ví dụ 600–700 so với 400), kích thước nhảy bậc rõ; caption uppercase chỉ dùng cho eyebrow ngắn.
- Mọi chuỗi hiển thị đi qua `oneLine/text` (NFC); thêm rule lint/test: không render tên trực tiếp từ payload bỏ qua helper.

### Spacing, radius, shadow, màu

- Spacing scale 4/8/12/16/24/32/48/64 dùng cho padding/margin/gap; không giá trị lẻ ngoài scale trừ căn chỉnh optics 1–2px có comment.
- Radius tối đa 2 cấp (nhỏ cho control, vừa cho tờ giấy); shadow 2 cấp (nâng nhẹ, dialog); accent chỉ từ `accents` hiện có (OLIVE/BURGUNDY/NAVY).
- Màu trạng thái nhất quán: riêng tư = trung tính kèm icon khóa; công khai = accent; lỗi = đỏ trầm; không dùng màu làm tín hiệu duy nhất.

### Hệ hiệu ứng (motion tokens)

- Token: `--dur-fast:160ms`, `--dur-med:280ms`, `--dur-slow:560ms`, easing chuẩn `cubic-bezier(.2,.7,.2,1)`; reveal dùng opacity+translateY ≤ 16px, stagger 60–90ms giữa các khối cùng màn.
- Áp dụng có danh sách đóng: mở phong bì cover, reveal section theo tầng, đổi tháng lịch (fade+slide ngang theo hướng), mở/đóng disclosure (opacity+translate, không animate height bằng JS), mục feed mới vào, hover/press nút (translateY 1px + shadow), mở hộp quà (giữ hiệu ứng hiện có), lightbox album.
- Tất cả nằm trong vùng đã có kill-switch `prefers-reduced-motion` của `globals.css`; không animate phần tử đang chứa focus người dùng đang gõ.

## 5. Đặc tả chi tiết theo nhóm vấn đề

### R-A. Quyền riêng tư mốc lịch trình và nghi lễ (P01)

Hiện trạng: mốc TIMELINE mới trong editor mặc định `audience:'PUBLIC'` (`section-editor.tsx` dòng 39, 117); `publicCalendar()` đưa mốc PUBLIC vào lịch tháng bản public; fallback `startsAt` của hàng cũ cũng ra bản public; backend đã lọc PRIVATE đúng nên không cần đổi schema.

Yêu cầu:
- Đổi default mốc TIMELINE mới (cả `timelineForEditor` cho hàng cũ chưa có payload lẫn `add()`) sang `PRIVATE`; chủ thiệp bật PUBLIC từng mốc có chủ đích.
- Thêm panel "Nội dung sẽ xuất hiện trên thiệp chung" trong editor: liệt kê section `audience=PUBLIC` + enabled, mốc PUBLIC trong TIMELINE, và cảnh báo riêng khi CEREMONY được bật PUBLIC (nghi lễ riêng thường không nên public). Panel chỉ đọc từ draft hiện có, không gọi API mới.
- Khi preview context = `public`, đánh dấu trực quan các khối bị ẩn vì PRIVATE để chủ thiệp hiểu vì sao thiếu.
- Giữ nguyên server filtering; thêm test contract: default mới là PRIVATE; `publicCalendar` loại PRIVATE; panel liệt kê đúng; CEREMONY PUBLIC sinh cảnh báo.
- Không migration, không backfill đổi audience dữ liệu cũ (dữ liệu đã lưu giữ nguyên lựa chọn của chủ thiệp).

Done khi: fixture có mốc "Lễ gia tiên" PRIVATE + mốc "Đón khách" PUBLIC → grep payload `/api/v1/public/weddings/<slug>` chỉ còn "Đón khách"; ảnh editor hiện panel và cảnh báo; test FE pass.

### R-B. Nền thị giác, type scale và chiều sâu (P02)

- Thêm khối token mới trong `design.css` (hoặc file token riêng được import kế bên `color-tokens.css`, không sửa file compat): type scale, spacing scale, radius, shadow, motion tokens theo mục 4.
- Tờ giấy nội dung: mỗi section đặt trên bề mặt có nền hơi sáng hơn nền trang + shadow mềm + padding theo scale; khoảng cách giữa các section nhịp nhàng (48–64 desktop, 32–40 mobile).
- Heading section: eyebrow + h2 + ornament theo theme; khoảng cách eyebrow→h2→nội dung cố định theo token.
- Nền trang theo theme: ELEGANT giấy kem có vân sáng nhẹ; TRADITIONAL nền đỏ trầm rất nhạt kèm khung; MODERN nền sáng tương phản mạnh với khối chữ lớn. Tất cả bằng CSS thuần.
- Chạy lại `scripts/contrast-audit.mjs` + `contrast-pixels.mjs` sau khi đổi màu nền; mọi cặp chữ/nền đạt ngưỡng mục 1.

Done khi: ảnh 3 theme × 3 breakpoint cho thấy phân lớp rõ, không tràn ngang, contrast pass, test cũ liên quan token/class vẫn pass (sửa test contract nếu class đổi tên — phải ghi rõ trong Task Log).

### R-C. Sửa lệch dấu tiếng Việt (P03)

- Bước 1 xác minh: build hiện tại, chụp cover với tên NFC và tên NFD (fixture dev có nhãn); so sánh.
- Bước 2: grep toàn bộ `frontend/src` các chỗ render chuỗi người nhập KHÔNG qua `oneLine/text/paragraphs/coupleNames` (kể cả `alt`, `title`, metadata OG, admin preview); sửa về helper chung.
- Bước 3: thêm test `tests/text-vietnamese.test.mjs` fixture NFD → chuỗi render NFC; thêm check trong QA script chụp cover và so pixel vùng tên nếu khả thi.
- Nếu bước 1 cho thấy lỗi không còn: ghi "KHÔNG CÒN" kèm ảnh, vẫn làm bước 2–3 như biện pháp phòng ngừa.

### R-D. Lịch tháng (P04)

- Giữ cấu trúc bảng/semantic hiện có cho screen reader; thay lớp nhìn: ô ngày là nút vuông mềm có trạng thái (trống / có mốc / hôm nay viền nhẫn / ngày sự kiện chính nền accent chữ sáng / đang chọn viền đậm), chip mốc thay bằng chấm tròn + nhãn ngắn khi đủ rộng.
- Header tháng: tiêu đề tháng/năm kiểu display nhỏ, nút tháng trước/sau dạng icon tròn có hover/focus rõ; thêm nút "Về ngày sự kiện" dạng text-button.
- Chuyển tháng: fade + translateX 8px theo hướng bấm (motion token); khối chi tiết ngày chọn đặt trong "tờ giấy" nối với lưới bằng khoảng cách nhịp nhàng, hiện danh sách mốc kèm giờ, địa điểm, nút thêm vào lịch.
- Mobile: ô ≥ 40px chạm được, tên thứ 2 ký tự, không cuộn ngang; nhiều mốc cùng ngày hiện "+n" và danh sách chi tiết, không chồng chữ.
- Empty state: tháng không có mốc vẫn render lưới kèm ghi chú nhẹ, không lỗi.

Done khi: ảnh trước/sau 390 + 1440; keyboard đi được hết ô ngày và nút tháng; reduced-motion tắt chuyển tháng; test `wedding-calendar.test.mjs` và test contract lịch pass.

### R-E. Hệ hiệu ứng (P05)

- Triển khai motion tokens và danh sách chuyển động đóng ở mục 4; viết helper class dùng chung (`.motion-rise`, `.motion-fade`, stagger qua `--i`) thay vì keyframes rải rác.
- Cover: phong bì mở có chuyển động nắp + nội dung rise theo tầng hiện có — tinh chỉnh timing/easing cho mượt, giữ reduced-motion.
- Disclosure (RSVP/lời chúc): mở/đóng bằng opacity+translateY trên phần tử con, không animate `height` bằng JS; icon dấu xoay 45°.
- Feed lời chúc: mục mới thêm vào trượt mờ vào; nút "Tải thêm" có trạng thái busy rõ.
- Nút/link: hover nâng 1px + shadow, active nén nhẹ, focus-visible viền accent; không hiệu ứng trên phần tử disabled.
- Không thêm animation cho ô nhập liệu đang focus, không stagger quá 8 khối/màn hình.

Done khi: quay/chụp trước-sau (ảnh + mô tả timing), reduced-motion check bằng emulate, không layout shift (so sánh ảnh trước/sau cùng thời điểm), test motion hiện có pass.

### R-F. Section nội dung (P02, P06 một phần)

Mỗi kind một bố cục riêng, dùng chung token:
- INTRO: hai cột chân dung typography trên desktop (tên lớn, vai trò caption, ghi chú body), xếp dọc mobile; ornament ngăn cách hai tên.
- FAMILY: khối nhóm đối xứng hai bên khi có 2 nhóm, nhãn nhóm dạng caption uppercase; thành viên là danh sách tên + ghi chú nhỏ, không khung hộp nặng.
- CEREMONY: danh sách nghi lễ dạng dòng thời gian dọc ngắn (giờ | tên | địa điểm), icon khóa nhỏ khi preview ngữ cảnh riêng tư.
- TIMELINE: nhóm theo ngày hiện có nhưng nâng cấp: ngày dạng h3, giờ nổi bật cột trái, đường nối mảnh, mốc PRIVATE ẩn kèm ghi chú đếm số mốc ẩn ở preview guest (không lộ nội dung).
- DRESS_CODE: palette swatch tròn kèm tên màu và hex caption; khối "Nên tránh" nền nhấn nhẹ kèm icon, không chỉ chữ đỏ.
- Mọi section rỗng dữ liệu tiếp tục return null (giữ hành vi), không render khung trống.

Done khi: ảnh từng section với dữ liệu DEMO đầy đủ và dữ liệu thiếu (1 người / 1 nhóm / 1 mốc) ở 390 + 1440; không khung trống; test sections contract pass.

### R-G. Cover, album, lightbox, nhạc (P02)

- Cover: xử lý trường hợp không có heroUrl bằng ornament lớn + nền theme (không khối tròn placeholder); có heroUrl thì ảnh phủ lớp gradient nhẹ để chữ đọc được, kiểm contrast chữ trên ảnh bằng `contrast-pixels.mjs`.
- Đếm ngược: số lớn dạng display, nhãn caption; ẩn khi đã qua (giữ hành vi).
- Album: lưới ảnh tỉ lệ cố định, hover zoom nhẹ (transform), lightbox giữ phím tắt hiện có + thêm transition mở/đóng mờ.
- Music control: giữ vị trí/hành vi; thêm trạng thái playing bằng icon chuyển động rất nhẹ, tôn trọng reduced-motion.

### R-H. RSVP, lời chúc, hộp quà (P06)

- RSVP: đầu disclosure có icon + trạng thái phản hồi dạng chip (Chưa phản hồi / Sẽ tham dự n người / Không tham dự); form giữ nguyên logic idempotency/retry; lỗi hiện khối lỗi có icon và hướng dẫn, success hiện khối cảm ơn nhẹ.
- Wish book: form gọn trong disclosure; feed lời chúc dạng "sổ lưu bút": mỗi lời chúc là tờ giấy nhỏ lệch nhẹ xen kẽ (rotate ≤ 0.6deg, tắt khi reduced-motion), tên + thời gian caption, lời chúc ghim có nhãn Ghim rõ.
- Gift box: giữ hiệu ứng mở hiện có; dialog QR nâng cấp bố cục: tiêu đề, mô tả ngắn, mã QR trên nền trắng đủ quiet zone, nút tải/copy dạng button chuẩn, ghi chú "kiểm tra tên người nhận" nhỏ; không thêm tuyên bố thanh toán.

Done khi: ảnh các trạng thái (đóng/mở/lỗi/thành công/rỗng) ở mobile + desktop; luồng submit lỗi 503 bằng fixture vẫn giữ dữ liệu người dùng; test gift/wish/response pass.

### R-I. Editor quản trị (P07 + panel R-A)

- Nhóm form theo card con có tiêu đề: Nội dung & thứ tự / Quyền hiển thị / Xem trước; sticky thanh hành động Lưu + trạng thái chưa lưu.
- Chuyển ngữ cảnh xem trước thành segmented control rõ nhãn (Khách được mời / Thiệp chung / Link hỏng) kèm mô tả một dòng mỗi ngữ cảnh.
- Panel "Nội dung sẽ công khai" từ R-A đặt trong nhóm Quyền hiển thị.
- Giữ `useUnsavedChanges`, không đổi API; tách component con trong cùng thư mục nếu file vượt ~700 dòng (chỉ tách khi cần đọc hiểu).

### R-J. QA thật, dọn dẹp và bàn giao (P08, P09, P10)

- Chạy ma trận mục 7; lưu toàn bộ bằng chứng vào `.qa-artifacts/rework/`.
- Một lượt browser→DB E2E trên PostgreSQL disposable theo mẫu `scripts/features-persistence-qa.ps1`: tạo thiệp DEMO → public/guest/admin → RSVP + wish → duyệt wish → kiểm payload public; đóng các NOT VERIFIED cũ liên quan.
- Dọn log: chuyển `*.log` ở gốc repo vào `.qa-artifacts/logs/<đợt>/` hoặc xóa các file log trung gian trùng lặp; KHÔNG xóa bằng chứng mà plan cũ trích dẫn (giữ danh sách tên file trong Task Log R12). Xóa Chrome profile trong `.qa-artifacts/*browser*` nếu không còn script nào tham chiếu đường dẫn đó (kiểm tra trước).
- Cập nhật README-IMPLEMENTATION mục trạng thái; ghi chú hai plan cũ là lịch sử.

## 6. Task Ledger — thứ tự triển khai

| ID | Task | Phụ thuộc | Trạng thái |
|---|---|---|---|
| R01 | Khảo sát, baseline ảnh + log, xác nhận/khép Problem Register | — | DONE |
| R02 | Quyền riêng tư mốc lịch trình: default PRIVATE + panel công khai + test | R01 | DONE |
| R03 | Token thị giác, type scale, nền giấy, heading system | R01 | DONE |
| R04 | Audit + sửa lệch dấu tiếng Việt, fixture NFD | R01 | DONE |
| R05 | Cover/hero/đếm ngược/album/lightbox/nhạc | R03 | DONE |
| R06 | Redesign 5 section nội dung | R03 | DONE |
| R07 | Redesign lịch tháng | R03 | TODO |
| R08 | Hệ hiệu ứng toàn thiệp | R05, R06, R07 | TODO |
| R09 | RSVP / lời chúc / hộp quà polish | R03, R08 | TODO |
| R10 | Editor quản trị: nhóm form, segmented preview, panel công khai | R02, R03 | TODO |
| R11 | QA tổng: ma trận ảnh, contrast, keyboard, reduced-motion, E2E browser→DB | R02–R10 | TODO |
| R12 | Dọn log/artifacts, cập nhật docs, handoff cuối | R11 | TODO |

### R01 — Khảo sát và baseline

- Việc: chạy test/typecheck/build FE; chụp baseline public/guest/editor 390/768/1440 vào `.qa-artifacts/rework/R01/`; đối chiếu từng P01–P10 với code; ghi sai khác vào Snapshot.
- Done khi: log + ảnh baseline tồn tại đúng đường dẫn; register có cột kết luận xác minh.

### R02 — Quyền riêng tư mốc lịch trình

- File dự kiến: `features/admin/section-editor.tsx`, `shared/wedding-calendar.ts` (nếu cần), test mới `frontend/tests/section-public-exposure.test.mjs`, cập nhật test hiện có liên quan default.
- Done khi: criteria mục R-A đạt; không đổi schema; backend test không cần chạy nếu không đụng Java (ghi rõ).

### R03 — Nền thị giác và typography

- File dự kiến: `design.css` (+ file token mới nếu tách), không đụng `color-tokens.css` compat.
- Done khi: criteria R-B đạt; test contract CSS class pass hoặc được cập nhật có giải thích.

### R04 — Lệch dấu tiếng Việt

- File dự kiến: `shared/text.ts`, component render tên, `tests/text-vietnamese.test.mjs`.
- Done khi: criteria R-C đạt.

### R05 — Cover/album/lightbox/nhạc

- File dự kiến: `design.tsx`, `album.tsx`, `music-control.tsx`, `design.css`.
- Done khi: criteria R-G đạt; contrast chữ trên ảnh hero pass hoặc hero fallback dùng ornament.

### R06 — Section nội dung

- File dự kiến: `sections.tsx`, `design.css`.
- Done khi: criteria R-F đạt với dữ liệu đầy đủ và thiếu.

### R07 — Lịch tháng

- File dự kiến: `wedding-month-calendar.tsx`, `design.css`, `tests/wedding-calendar.test.mjs` cập nhật nếu đổi class.
- Done khi: criteria R-D đạt.

### R08 — Hệ hiệu ứng

- File dự kiến: `motion.ts`, `design.css`, các component có disclosure/feed.
- Done khi: criteria R-E đạt; không animation mới ngoài danh sách đóng.

### R09 — RSVP/lời chúc/hộp quà

- File dự kiến: `guest-disclosure.tsx`, `wish-book.tsx`, `wish-feed.tsx`, `gift-box.tsx`, `design.css`.
- Giữ nguyên: logic idempotency RSVP, retry, server filtering wishes, guard quà.
- Done khi: criteria R-H đạt.

### R10 — Editor

- File dự kiến: `section-editor.tsx`, `admin.css`, có thể tách component con mới trong `features/admin/`.
- Done khi: criteria R-I đạt; luồng lưu/hủy/unsaved-changes giữ nguyên hành vi.

### R11 — QA tổng và E2E

- Chạy: `npm test`, `npm run typecheck`, `npm run build`; `mvn -q test` nếu có đụng Java; script browser QA; `contrast-audit.mjs`; E2E disposable DB.
- Done khi: bảng kết quả mục 7 điền đủ, ảnh ma trận lưu đủ, danh sách NOT VERIFIED còn lại ghi rõ trong Blockers.

### R12 — Dọn dẹp và bàn giao

- Việc mục R-J; cập nhật README-IMPLEMENTATION và checkpoint cuối của file này.
- Done khi: gốc repo không còn log rác của phiên rework; handoff cuối ghi rõ cách vận hành.

## 7. Ma trận kiểm thử bắt buộc

### Lệnh chuẩn

| Nhóm | Lệnh | Khi nào |
|---|---|---|
| FE unit/contract | `npm test` trong `frontend/` | Mọi task có sửa FE |
| Typecheck | `npm run typecheck` trong `frontend/` | Mọi task có sửa FE |
| Build | `npm run build` trong `frontend/` | Cuối mỗi task UI và trước handoff |
| Backend | `mvn -q test` trong `backend/` | Chỉ khi đụng Java/schema |
| Contrast | `node scripts/contrast-audit.mjs` (+ `contrast-pixels.mjs` cho nền ảnh/alpha) | R03, R05, R11 |
| Browser QA | `node scripts/invitation-review-qa.mjs` hoặc script mới trong `scripts/` nếu cần ảnh ma trận | R01, R05–R11 |

### Ma trận ảnh chụp (lưu `.qa-artifacts/rework/<task>/`)

- Trang: `/w/<slug DEMO>`, `/invitation/<id DEMO>` (guest đã mở), `/admin/wedding` (editor).
- Breakpoint: 390, 768, 1440. Theme: đủ 3 theme cho trang public ở R11; các task lẻ chỉ cần theme đang sửa + 1 theme đối chứng.
- Trạng thái đặc biệt: lịch tháng có/không mốc; RSVP đóng/mở/lỗi/thành công; wish feed rỗng/có trang 2; gift bật 1 QR/2 QR/tắt; link hỏng; offline (chặn mạng fixture) cho map và feed.
- Đặt tên file: `<trang>-<breakpoint>-<trạng thái>.png`; kèm file `notes.md` mô tả từng ảnh 1 dòng.

### Kiểm tra quyền riêng tư (bắt buộc ở R02 và R11)

```text
# Với slug DEMO có mốc PRIVATE "Lễ gia tiên DEMO" và mốc PUBLIC "Đón khách DEMO":
curl -s "<base>/api/v1/public/weddings/<slug>" | findstr /i "gia tiên"   → phải KHÔNG tìm thấy
curl -s "<base>/api/v1/public/weddings/<slug>" | findstr /i "Đón khách"  → phải tìm thấy
```

Ghi nguyên văn output vào Task Log. Không dùng dữ liệu thật cho kiểm tra này.

### Ngưỡng nghiệm thu

- FE test/typecheck/build exit 0; số test pass ghi rõ (ví dụ 159/159).
- Không tràn ngang: kiểm tra bằng browser QA (so `scrollWidth` và `clientWidth`) hoặc ảnh 360px.
- Contrast đạt ngưỡng mục 1 cho mọi cặp chữ/nền mới.
- Reduced-motion: emulate và chụp 1 màn có animation để chứng minh tĩnh.
- Mọi NOT VERIFIED còn lại liệt kê trung thực ở mục 11.

## 8. Checkpoint nhiều phiên và nguyên tắc phục hồi

### Trạng thái hợp lệ

`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `SKIPPED` (kèm lý do). Chỉ một task IN_PROGRESS mỗi phiên.

### Sau mỗi task phải ghi

1. Đổi trạng thái trong bảng Ledger.
2. Thêm mục Task Log (mẫu dưới) vào nhật ký trong mục 8 này.
3. Cập nhật Handoff mục 13: task tiếp theo là gì, file đang mở, lệnh đang chạy dở, điều cấm lặp lại.
4. Lưu bằng chứng vào `.qa-artifacts/rework/<task>/`.

### Khi bị ngắt bất ngờ

- Phiên mới đọc Handoff trước, rồi `git status`/`git diff` để xác định điểm dừng thật.
- Task IN_PROGRESS được khôi phục bằng cách chạy lại test liên quan; nếu test đỏ, sửa cho xanh trước khi thêm tính năng.
- Không chạy lại seed/migration/đột biến dữ liệu; không xóa thay đổi chưa commit của người dùng.
- Nếu phát hiện trạng thái ghi trong file sai với code: sửa lại file (ghi rõ "đính chính") rồi mới tiếp tục.

### Mẫu Task Log — thêm sau từng task

```text
### <ID> — <TRẠNG THÁI> — <thời điểm + múi giờ>
- Đã làm: file sửa/tạo, quyết định thiết kế đáng chú ý.
- Đã chạy: lệnh + kết quả thật (số test, exit code); đường dẫn log/ảnh bằng chứng.
- Chưa kiểm chứng: liệt kê trung thực.
- Tiếp theo: task kế tiếp và lưu ý cho phiên sau.
```

### Task Log — nhật ký thực thi (mới nhất trên cùng)

### R06 — DONE — 2026-10-21 16:05 +07:00
- Đã làm: ornament ❧ giữa hai tên INTRO (desktop, ẩn trong `@container ≤600px`); `.dress-avoid` thành panel nền giấy + viền champagne-soft + icon ✕ tròn qua `strong::before`; mở rộng `rework-theme-shots-qa.mjs` chế độ `REWORK_PAGE=sections` + `REWORK_SPARSE=1` (slice dữ liệu ở Node) + retry 3 lần cho ảnh section; `notes.md` ghi bối cảnh 5 bố cục có sẵn từ T05–T09.
- Đã chạy: `npm test` exit 0 (166/166); typecheck exit 0; build exit 0; `invitation-review-qa.mjs` exit 0; sections shots before/after (full + sparse) exit 0 sau retry — đủ 4 bộ × 10 ảnh trong `.qa-artifacts/rework/R06/`; xác nhận trực quan `after-r06-section-intro-1440.png` (ornament) và `dress-1440.png` (panel Nên tránh).
- Chưa kiểm chứng: Safari/Zalo thật (chung); ảnh 390 của intro/family full vs sparse trùng pixel do viewport chỉ bắt phần đầu section (đã ghi RD17).
- Tiếp theo: R07 — redesign lịch tháng; giữ lock `wedding-calendar.test.mjs` (monthCells Monday-first, lọc PRIVATE, không ICS cho milestone) và keyboard/focus hiện có; ảnh trước/sau 390+1440 kèm chọn ngày + đổi tháng.

### R05 — DONE — 2026-10-21 15:20 +07:00
- Đã làm: đếm ngược → thẻ giấy token + số serif tabular-nums + vạch chia; cover không ảnh → nền giấy theo theme + ornament lớn (3 biến thể theme); album ảnh phủ kín ô + hover zoom có guard; lightbox fade (`lightboxIn`); nhạc pulse khi playing; thêm retry click album/nút nhạc trong script do HMR remount; thêm `REWORK_THEMES` để chạy ngắn theo theme.
- Đã chạy: `npm test` exit 0 (166/166, ART-001/TYPO/TOK-002/ALBUM-001 xanh); typecheck exit 0; build exit 0; `rework-theme-shots-qa.mjs` các lượt before-r05b/before-r05b-none/dbg-guest/after-r05/after-r05t/after-r05m/after-r05g exit 0 (retry); `invitation-review-qa.mjs` exit 0. Ảnh + `notes.md` trong `.qa-artifacts/rework/R05/`.
- Chưa kiểm chứng: ảnh photo-mode TRADITIONAL/MODERN + lightbox t/m + music 1440 không đáng tin (trùng hash/blank) — chụp lại ở R11 (RD15); Safari/Zalo thật vẫn NOT VERIFIED.
- Ghi chú index: người dùng đã stage toàn bộ thay đổi trong phiên (kể cả `frontend/next-env.d.ts` đang ở dạng build `.next/types`, khác bản commit `.next/dev/types`) — KHÔNG tự ý đổi index; nếu muốn về dạng commit, xử lý khi có đồng ý.
- Tiếp theo: R06 — redesign ruột 5 section (INTRO/FAMILY/CEREMONY/TIMELINE/DRESS_CODE); giữ lock sections contract (`.content-section{letter-spacing:normal;font-kerning:normal}`, timeline nhóm theo ngày, palette có tên màu, không card chung một khuôn).

### R04 — DONE — 2026-10-21 14:00 +07:00
- Đã làm: probe CDP đo code point DOM (NFC), khe layout (≈0), ink canvas và A/B `text-rendering` → cô lập nguyên nhân P03 là `optimizeLegibility` (globals h1–h3) trên Times New Roman cỡ display; thêm rule `.wedding-canvas h1,h2,h3{text-rendering:auto}` + comment RD13 trong `design.css`; thêm test contract RD13; audit đường render không thấy bypass helper NFC; ghi `notes.md`.
- Đã chạy: probe trước/sau fix exit 0 (`probe.json`, `view-clip-intro-base.png` 13:53 còn lỗi vs `view-clip-intro-auto.png` đúng; bản 13:59 sau fix đúng); `npm test` exit 0 (166/166); typecheck exit 0; build exit 0; `rework-theme-shots-qa.mjs after-r04` exit 0 (9 ảnh, đã dời từ thư mục R03 sang R04). Bằng chứng trước/sau: `R01/before-vietnamese-mobile.png` → `R04/view-clip-intro-base.png` + `after-r04-elegant-390.png`.
- Chưa kiểm chứng: clip CDP dưới fold blank (dùng ảnh viewport thay); heading admin vẫn optimizeLegibility (ghi trong notes); Safari/Zalo thật thuộc R11/bàn giao.
- Tiếp theo: R05 (cover/hero/đếm ngược/album/lightbox/nhạc) — đọc mục 5 R-G; giữ lock ART-001 về gradient cover; ảnh trước/sau 390+1440.

### R03 — DONE — 2026-10-21 13:20 +07:00
- Đã làm: token thị giác mới trên `.wedding-canvas` (type scale, spacing, radius, shadow, paper, wash); `.content-section` thành tờ giấy (nền sáng, viền, bóng, nhịp margin token); heading system ornament tròn + h2 token + rule hairline; nền/wash theo 3 theme; MODERN phẳng gạch trái. Chỉ sửa `design.css`, không đụng `color-tokens.css`.
- Đã chạy: `npm test` lượt 1 exit 1 (TOK-002 bắt màu hardcode) → token hoá màu (RD11) → lượt 2 exit 0 (165/165); typecheck exit 0; build exit 0; `rework-theme-shots-qa.mjs before` và `after` exit 0 (9+9 ảnh 3 theme × 390/768/1440, không tràn ngang); `invitation-review-qa.mjs` exit 0 (regression contrast + overflow). Bằng chứng `.qa-artifacts/rework/R03/` gồm `notes.md`.
- Chưa kiểm chứng: contrast pixel cho wash gradient mới chưa đo riêng (invitation-review đã đo các cặp chữ/nền chính); ruột section/lịch/cover chưa redesign (R05–R07); P03 vẫn còn (R04).
- Ghi chú: `next build` tự sinh đổi 2 dòng import trong `frontend/next-env.d.ts`; đã khôi phục đúng bản commit theo quy ước F01 (không phải thay đổi nội dung).
- Tiếp theo: R04 — probe lệch dấu serif cỡ lớn trong browser (computed font, glyph fallback, kerning) theo bước ghi ở mục 2; giữ fixture NFD phòng ngừa.

### R02 — DONE — 2026-10-21 12:55 +07:00
- Đã làm: đổi default mốc TIMELINE mới sang PRIVATE ở `add()` và nút "Thêm mốc" (`section-editor.tsx`); giữ mốc gốc hàng cũ PUBLIC kèm comment (RD09); thêm `PublicExposurePanel` (liệt kê mục PUBLIC + mốc PUBLIC, cảnh báo CEREMONY PUBLIC, danh sách mục riêng tư) và hint "Đang ẩn khỏi thiệp chung…" ở preview ngữ cảnh public; style panel trong `admin.css`; test mới `section-public-exposure.test.mjs` (4 test); script QA mới `scripts/rework-editor-panel-qa.mjs`.
- Đã chạy: FE test exit 0 (165/165 — `R02-fe-test.log`); typecheck exit 0; build exit 0; `mvn -q -Dtest=SectionPrivacyTest test` exit 0 (`be-section-privacy.log`, gồm case lọc mốc PRIVATE ở server); `rework-editor-panel-qa.mjs` exit 0 (assert panel không lộ mốc PRIVATE, cảnh báo CEREMONY, hint ẩn; ảnh `after-editor-panel-390/1440.png` không tràn ngang); `editor-review-qa.mjs` exit 0 (regression, `after-editor-loaded.png`). Chi tiết `.qa-artifacts/rework/R02/notes.md`.
- Chưa kiểm chứng: grep payload public trên stack thật + E2E browser→DB (RD10, thuộc R11); chưa chạy toàn bộ `mvn test` (chỉ class liên quan).
- Tiếp theo: R03 (token thị giác, type scale, nền giấy, heading system) — đọc mục 4 của plan trước khi code; không đụng `color-tokens.css`.

### R01 — DONE — 2026-10-21 12:10 +07:00
- Đã làm: khảo sát môi trường (Node v24.15.0, Chrome CDP, Docker 29.8.0, Java 25); chạy baseline FE; bật dev server local:3000; chạy `invitation-review-qa.mjs` và `editor-review-qa.mjs`; copy 13 ảnh `before-*.png`; ghi `notes.md`; đính chính P01/P03/P05 trong register; tắt dev server.
- Đã chạy: `npm test --prefix frontend` exit 0 (161/161 pass, 0 fail — `fe-test.log`); `npm run typecheck` exit 0; `npm run build` exit 0; `node scripts/invitation-review-qa.mjs` exit 0 (PASS 21 case + sections + contrast); `node scripts/editor-review-qa.mjs` exit 0. Bằng chứng ảnh trong `.qa-artifacts/rework/R01/`.
- Chưa kiểm chứng: backend test chưa chạy (không đụng Java ở R01); E2E browser→DB chưa chạy (của R11); nguyên nhân gốc P03 chưa cô lập (của R04).
- Tiếp theo: R02 — đổi default mốc TIMELINE sang PRIVATE ở `section-editor.tsx` dòng 39, 117, 248 + panel "Nội dung sẽ công khai" + test mới; kiểm tra test cũ có khẳng định default PUBLIC không trước khi sửa.

## 9. Decision Log

| ID | Quyết định | Cơ sở / giới hạn | Task |
|---|---|---|---|
| RD01 | Mốc TIMELINE mới mặc định `PRIVATE`; chủ thiệp bật PUBLIC từng mốc | An toàn riêng tư theo docs/08; không đổi schema; dữ liệu cũ giữ nguyên lựa chọn đã lưu | R02 |
| RD02 | Panel "nội dung sẽ công khai" làm thuần frontend từ draft, không thêm API | Draft đã có đủ dữ liệu; tránh mở rộng backend; server vẫn là ranh giới quyền thật | R02, R10 |
| RD03 | Không thêm dependency UI/animation; motion bằng CSS token + class helper | Bundle nhỏ, stack hiện tại đủ; giảm rủi ro version | R03, R08 |
| RD04 | Không tải font mới; dùng font hệ thống + type scale token | Asset nặng và cần đồng ý; font hệ thống hỗ trợ tiếng Việt đủ | R03 |
| RD05 | Giữ `color-tokens.css` compat nguyên vẹn; token ngữ nghĩa mới đặt riêng | File compat có ghi chú cấm đổi nghĩa; tránh recolor bề mặt legacy | R03 |
| RD06 | Bằng chứng ảnh chụp là điều kiện DONE bắt buộc cho task UI | Khắc phục P08: DONE cảm tính không còn được chấp nhận | Tất cả |
| RD07 | Log phiên chuyển vào `.qa-artifacts/logs/`, gốc repo chỉ giữ plan + docs + code | Khắc phục P09; giữ bằng chứng mà plan cũ trích dẫn | R12 |
| RD08 | Hai plan cũ chuyển thành tài liệu lịch sử, không xóa | Còn giá trị tham chiếu quyết định cũ (DF/DFxx); tránh mất bối cảnh | R12 |
| RD09 | Mốc gốc hàng cũ (`timelineForEditor`) GIỮ default PUBLIC, chỉ đổi default ở `add()` và nút "Thêm mốc" | Server vẫn trả `starts_at` của hàng legacy trên bản public và `isLegacyMilestone` dựa vào `audience!=='PRIVATE'`; đổi sẽ lệch preview/server và phá luồng lưu hàng cũ (T18/T19). Đính chính ghi chú "sửa 3 chỗ" của Handoff R01 | R02 |
| RD10 | Bằng chứng quyền riêng tư R02 = test FE + browser fixture + `SectionPrivacyTest` (backend); lệnh grep payload public trên stack thật chuyển sang R11 | R02 không đổi code server; projection public đã có test đơn chuyên biệt; E2E browser→DB + grep curl thuộc phạm vi R11. Ảnh "trước" cho panel mới lấy từ baseline R01 vì phần tử chưa tồn tại | R02, R11 |
| RD11 | Mọi màu/gradient mới của R03 nằm trong custom property `--inv-*`, không khai báo màu hardcode ở rule thường | Test TOK-002 (`color-token-migration.test.mjs`) cấm hex/rgba/white/black/transparent ngoài custom property; lượt test đầu của R03 fail đúng luật này và đã sửa bằng token hoá | R03 |
| RD12 | Heading section dùng ornament + rule, KHÔNG thêm eyebrow dạng chữ | Tránh bịa copy nội dung cho từng kind (quy tắc không tạo nội dung giả); câu chữ mục 4 của plan hiểu "eyebrow" là nhãn nhỏ hiện có ở cover/story, không áp vào heading section | R03 |
| RD13 | Buộc `text-rendering:auto` cho `h1,h2,h3` trong `.wedding-canvas`; giữ nguyên rule optimizeLegibility toàn cục của `globals.css` | A/B probe R04 chứng minh optimizeLegibility là nguyên nhân lệch dấu tổ hợp kép ở cỡ display trên Times New Roman; phạm vi sửa giới hạn ở thiệp để không đổi hành vi admin; khóa bằng test contract trong `text-vietnamese.test.mjs` | R04 |
| RD14 | Cover không ảnh dùng nền giấy theo theme + ornament lớn (thay khối tối); album hover zoom + lightbox fade + nhạc pulse là 3 chuyển động mới, đều có guard reduced-motion; đếm ngược chuyển sang thẻ giấy token với số serif tabular-nums | Giữ mọi lock ART-001; mọi màu qua token (TOK-002); motion nhỏ, không layout shift; chưa mở rộng sang trang admin | R05 |
| RD15 | Ghi giới hạn tooling cho R11: không dùng full-page screenshot (`captureBeyondViewport`) với đơn vị vh; clip dưới fold không đáng tin; `REWORK_SHOTS_DIR` phải đặt trong cùng lệnh chạy; ảnh photo-mode TRADITIONAL/MODERN của R05 không đáng tin (trùng hash) — chụp lại ở R11 | Tránh lặp lại lỗi đã gặp; R05 chỉ tin ảnh no-photo 3 theme + elegant photo + guest 390 + album/lightbox elegant | R05, R11 |
| RD16 | R06 chỉ lấp phần thiếu (ornament INTRO giữa hai tên, panel "Nên tránh" + icon ✕), KHÔNG viết lại 5 bố cục; CEREMONY giữ dạng card thay vì "timeline dọc" như câu chữ mục 5 R-F | 5 bố cục đã tồn tại từ T05–T09 và bị test khóa chuỗi (`sections-payload.test.mjs` dòng 15, 40 — kể cả swatch tròn 44px); viết lại sẽ phá lock và vượt phạm vi | R06 |
| RD17 | Bằng chứng section dùng chế độ `REWORK_PAGE=sections` + `REWORK_SPARSE=1` (slice dữ liệu trong Node) và retry 3 lần cho từng ảnh | `Page.captureScreenshot` timeout CDP lặp lại ở dress-1440; retry giải quyết; 390 intro/family full vs sparse có thể trùng pixel vì viewport chỉ bắt phần đầu section | R06, R11 |

## 10. Blockers và điều cần xác nhận

- **Cần chủ thiệp/người dùng xác nhận (không chặn code):** RD01 đổi default mốc mới sang PRIVATE là thay đổi hành vi editor; nếu muốn giữ default PUBLIC, ghi lại quyết định ngược vào Decision Log trước khi làm R02.
- **Font self-host:** chỉ thực hiện nếu người dùng đồng ý rõ ràng (ảnh hưởng bundle và bản quyền font); mặc định KHÔNG.
- **QR thật / thiết bị thật / Zalo-Safari thật:** không thể kiểm chứng trong môi trường này; giữ NOT VERIFIED và nêu trong bàn giao.
- **Dữ liệu thật:** không dùng thiệp thật của người dùng cho ảnh QA; chỉ fixture DEMO.

## 11. Handoff — cập nhật trước khi dừng mỗi phiên (mới nhất trên cùng)

### Handoff R06 — DONE — 2026-10-21 16:05 +07:00

- R06 DONE: ornament ❧ giữa hai tên (INTRO, desktop) + panel "Nên tránh" có icon (DRESS_CODE) trong `design.css`; 5 bố cục còn lại giữ nguyên vì đã có từ T05–T09 và bị test khóa chuỗi (RD16). FE 166/166, typecheck/build exit 0, invitation-review regression exit 0.
- Bằng chứng `.qa-artifacts/rework/R06/` (xem `notes.md`): 4 bộ ảnh 10 tấm — `before-r06-section-*`, `before-r06-sparse-section-*`, `after-r06-section-*`, `after-r06-sparse-section-*` (5 section × 390/1440, đủ + thiếu dữ liệu).
- RD16/RD17: không viết lại layout bị khóa; ceremony giữ card; dùng `REWORK_PAGE=sections` + `REWORK_SPARSE=1` + retry ảnh; `Page.captureScreenshot` timeout CDP đã xử lý bằng retry.
- Dev server đã tắt; không commit/push/deploy/migration. Index người dùng vẫn staged — không tự ý sửa (kể cả `frontend/next-env.d.ts` dạng build trong index).
- Task tiếp theo: **R07** (redesign lịch tháng). Locks cần giữ: `wedding-calendar.test.mjs` (monthCells Monday-first, 28/29/30/31 ngày, `publicCalendar` chỉ mốc PUBLIC không ICS, guest chỉ PUBLISHED/CANCELLED); `invitation-review-qa.mjs` bắt buộc giữ keyboard/focus ô ngày + không tràn ngang; ảnh before/after 390+1440 gồm trạng thái chọn ngày + đổi tháng + chi tiết ngày chọn.
- Kiểm tra nhanh điểm dừng: `npm test --prefix frontend` (166/166).

### Handoff R05 — DONE — 2026-10-21 15:20 +07:00

- R05 DONE: cover không ảnh (3 theme, nền giấy + ornament lớn), đếm ngược thẻ giấy token, album hover zoom, lightbox fade, nhạc pulse — tất cả trong `design.css`, màu qua token, có guard reduced-motion; FE 166/166, typecheck/build exit 0; invitation-review regression exit 0.
- Bằng chứng trong `.qa-artifacts/rework/R05/` (chi tiết + hạn chế ở `notes.md`): ảnh BEFORE `before-r05b*`, `dbg-guest*`; AFTER `after-r05*` (no-photo đủ 3 theme × 3 cỡ; elegant photo + album + lightbox; guest countdown 390/1440 + music 390).
- RD15: các ảnh không đáng tin (photo-mode t/m, lightbox t/m, music 1440) đã ghi nhận — chụp lại ở R11; không dùng full-page screenshot cho trang có đơn vị vh.
- Dev server đã tắt, port 3000 free; KHÔNG commit/push/deploy/migration. Working tree + index: các thay đổi R02–R05 đang được người dùng stage; `frontend/next-env.d.ts` trong index ở dạng build (`.next/types`) — giữ nguyên index, không tự ý sửa.
- Task tiếp theo: **R06** (redesign ruột 5 section). Locks cần giữ: `.content-section{letter-spacing:normal;font-kerning:normal}`; `.section-intro h2,.wedding-story h2,.wedding-album h2{font-family:var(--inv-serif...)}`; timeline nhóm theo ngày; palette kèm tên màu; `.family-group`/`.ceremony-card` giữ bố cục riêng (không dùng chung một card); ảnh before/after 390+1440 với dữ liệu DEMO đầy đủ và thiếu.
- Kiểm tra nhanh điểm dừng: `npm test --prefix frontend` (166/166).

### Handoff R04 — DONE — 2026-10-21 14:00 +07:00

- R04 DONE: P03 đã sửa tận gốc — `text-rendering:auto` cho heading trong `.wedding-canvas` (RD13); bằng chứng A/B clip + ảnh before/after 390/1440 trong `.qa-artifacts/rework/R04/`; FE 166/166, typecheck/build exit 0.
- Register: P03 chuyển trạng thái ĐÃ SỬA (giữ nguyên dòng để truy vết); nguyên nhân không phải NFD.
- Dev server đã tắt, port 3000 free; `next-env.d.ts` khôi phục bản commit; không commit/deploy/migration.
- Working tree: `design.css`, `section-editor.tsx`, `admin.css`, `text-vietnamese.test.mjs` sửa + 3 script QA mới + 1 test mới + plan.
- Task tiếp theo: **R05** (cover/hero/đếm ngược/album/lightbox/nhạc). Lưu ý: lock ART-001 cấm đổi gradient `.theme-elegant .cover-photo::after` và rule `:not(:has(.cover-photo))`; hero không có ảnh phải dùng ornament + nền theme (không khối tròn placeholder); contrast chữ trên ảnh đo bằng `contrast-pixels.mjs`.
- Kiểm tra nhanh điểm dừng: `npm test --prefix frontend` (166/166).

### Handoff R03 — DONE — 2026-10-21 13:20 +07:00

- R03 DONE: token + nền giấy + heading system trong `design.css`; ảnh before/after 3 theme × 390/768/1440 trong `.qa-artifacts/rework/R03/`; FE 165/165, typecheck/build exit 0; invitation-review regression exit 0.
- RD11: màu/gradient mới phải nằm trong custom property (TOK-002) — lượt test đầu fail và đã sửa; đừng lặp lại lỗi này ở R05–R09 khi thêm màu.
- RD12: heading không thêm eyebrow chữ (tránh bịa copy).
- Dev server đã tắt, port 3000 free; không commit/deploy/migration. Working tree: `design.css`, `section-editor.tsx`, `admin.css` sửa + test/script mới + plan.
- Task tiếp theo: **R04** (lệch dấu serif cỡ lớn). Bước probe ghi ở mục 2 (P03 chi tiết): code point DOM, computed fontFamily, canvas measure glyph U+1EA7 theo cỡ, thử tắt kerning/đổi stack; ảnh trước/sau 390+1440 vùng tên; thêm fixture NFD vào test.
- Kiểm tra nhanh điểm dừng: `npm test --prefix frontend` (165/165).

### Handoff R02 — DONE — 2026-10-21 12:55 +07:00

- R02 DONE: default mốc mới PRIVATE (2 chỗ), panel "Sẽ xuất hiện trên thiệp chung" + cảnh báo CEREMONY PUBLIC + hint ẩn riêng tư trong preview public; 4 test contract mới; FE 165/165, typecheck/build exit 0; backend `SectionPrivacyTest` exit 0; ảnh panel 390/1440 trong `.qa-artifacts/rework/R02/`.
- RD09: KHÔNG đổi mốc gốc hàng cũ (`timelineForEditor`) — giữ PUBLIC có lý do (server legacy + isLegacyMilestone); đính chính ghi chú "sửa 3 chỗ" của Handoff R01.
- RD10: grep payload public trên stack thật chuyển sang R11; bằng chứng server của R02 là `SectionPrivacyTest`.
- Dev server đã tắt, port 3000 giải phóng; không commit/deploy/migration; working tree gồm: `section-editor.tsx`, `admin.css` sửa + 2 file mới (test, script QA) + plan.
- Task tiếp theo: **R03** (token thị giác/type scale/nền giấy/heading). Lưu ý: tạo token mới riêng, không sửa `color-tokens.css`; chạy `contrast-audit.mjs` sau khi đổi nền; ảnh trước/sau 390+1440 cho cover và 1 section đại diện.
- Kiểm tra nhanh điểm dừng: `npm test --prefix frontend` (165/165).

### Handoff R01 — DONE — 2026-10-21 12:10 +07:00

- R01 DONE: baseline log + 13 ảnh `before-*.png` + `notes.md` trong `.qa-artifacts/rework/R01/`; FE 161/161 pass, typecheck/build exit 0; invitation-review và editor-review QA exit 0.
- Đính chính register: P01 có thêm dòng 248 (nút "Thêm mốc") mặc định PUBLIC — R02 phải sửa cả 3 chỗ (39, 117, 248). P03 KHÔNG phải lỗi NFD: fixture NFC vẫn lệch ở serif cỡ lớn — R04 probe render trong browser. P05 có 5 @keyframes chứ không phải 3.
- Dev server đã tắt, port 3000 giải phóng; không commit/deploy/migration.
- Task tiếp theo: **R02** (quyền riêng tư mốc lịch trình). Lưu ý khi làm R02: giữ server filtering nguyên vẹn; thêm test `frontend/tests/section-public-exposure.test.mjs`; cập nhật test cũ nếu chúng khẳng định default PUBLIC (grep `audience:'PUBLIC'` trong tests trước khi sửa).
- Chạy lại nhanh để xác nhận điểm dừng: `npm test --prefix frontend` (161/161).

### Handoff khởi tạo — NOT_STARTED

- Chưa có code nào thay đổi bởi chuỗi rework; working tree tại HEAD `07e73c3` sạch tại thời điểm lập kế hoạch.
- Phiên đầu tiên: chạy R01 theo mục 3 và 6; tạo thư mục `.qa-artifacts/rework/R01/` trước khi chụp ảnh.
- Lưu ý kế thừa: backend và frontend chạy local theo docs hiện có; không deploy; không migration.
- Đọc thêm nếu cần bối cảnh quyết định cũ: `PLAN_TASK_FEATURES.md` mục Decision Log và `docs/08-security-and-privacy.md`, `docs/17-invitation-features-operations.md`.

## 12. Phụ lục — ánh xạ việc cũ sang rework (chống làm trùng / bỏ sót)

| Việc cũ (file cũ) | Kết quả cũ | Quan hệ với rework |
|---|---|---|
| T01–T13 (PLAN_TASK.md): section payloads, layout, contrast, editor preview | DONE | Giữ nguyên hành vi; R06 chỉ nâng lớp nhìn, không đổi contract payload |
| T14, T20: contrast audit pixel | DONE | R11 chạy lại sau khi đổi nền; không làm lại tool |
| T15–T19: editor sắp xếp, preview link hỏng, timeline legacy | DONE | R10 giữ hành vi; chỉ regroup UI |
| T21: sửa lệch dấu tiếng Việt | DONE (ghi nhận) | R04 xác minh lại bằng build hiện tại + fixture NFD; nếu không còn lỗi thì khép P03 |
| T22: xóa nhạc admin | DONE | Không đụng |
| F01–F03: map/lịch/RSVP dữ liệu + quyền server | DONE | Giữ server filtering; R02 chỉ sửa default editor + panel |
| F04–F06: UI foundations, map, calendar | DONE | R07 redesign lịch trên nền component hiện có, giữ a11y pattern |
| F07: thu gọn RSVP/wish + idempotency | DONE | R09 giữ logic, nâng nhìn |
| F08: feed + moderation | DONE | R09/R10 giữ cursor và quyền |
| F09–F10: QR/gift | DONE | R09 giữ guard và hiệu ứng mở |
| F11–F13: tích hợp, QA, docs vận hành | DONE kèm NOT VERIFIED | R11 đóng các NOT VERIFIED khả thi trong môi trường |

> Kết thúc phụ lục. Mọi thay đổi ngoài phạm vi register phải được thêm vào mục 2 và Ledger trước khi code.

