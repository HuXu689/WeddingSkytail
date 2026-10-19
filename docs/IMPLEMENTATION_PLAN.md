# IMPLEMENTATION_PLAN.md — Hoàn thiện website thiệp cưới

> **Đây là nguồn sự thật duy nhất về kế hoạch và tiến độ triển khai.** Cập nhật ngay tại checkpoint nhỏ trong lúc làm, không đợi cuối phiên. Không tạo tài liệu kế hoạch cạnh tranh.
> Các tài liệu `docs/01`–`docs/16` vẫn là đặc tả nghiệp vụ gốc; tài liệu này chỉ ghi **việc đang làm, đã làm, còn lại** trên code thật.

**Ngày lập:** 2026-10-19 · **Phiên gần nhất:** S12 (unsaved navigation guard + countdown independence) · **Người thực hiện:** agent (Cline) + Owner review.

---

## A. Tổng quan

### A1. Mục tiêu sản phẩm

Một website thiệp cưới cho **một** đám cưới, quản lý **nhiều buổi tiệc**, có:

1. Giao diện khách đẹp, có cảm xúc, chỉn chu — cảm giác "bộ thiệp in cao cấp", không phải chuỗi card ghép lại.
2. Owner thay ảnh / nội dung / màu / mẫu / phần hiển thị **không cần sửa code**.
3. Mobile tốt thật (bố cục riêng, không chỉ thu nhỏ desktop).
4. Giữ đúng nghiệp vụ: session, quyền truy cập, lời mời, QR, RSVP, lời chúc, draft/publish.
5. Hoàn thiện **trên repository hiện tại**, không viết lại dự án.

### A2. Phạm vi đã thống nhất — 4 đợt

| Đợt | Nội dung | Trạng thái tổng |
|---|---|---|
| **1** | Sửa lỗi tên/Unicode, sidebar, responsive, preview editor; kiểm tra mapping RSVP; design tokens nền tảng; giữ baseline nghiệp vụ | **DONE (S1)** |
| **2** | Art direction hoàn thiện **một** mẫu chuẩn; intro/mở thiệp, hero, typography, layout section; album/lightbox; motion system; editor cho các cấu hình đã triển khai | **IN_PROGRESS** — TYPO-001 DONE (S2); ART-001 READY_FOR_REVIEW (thiếu ảnh chụp); INTRO-001 READY_FOR_REVIEW (S3); HERO/ALBUM/MOTION-001 READY_FOR_REVIEW; S7 triển khai editor/sections + HTTP/browser QA, chưa nghiệm thu toàn bộ |
| **3** | Section tùy chọn thật sự cần: gia đình/nghi lễ, lịch trình, dress code, calendar/map; hoàn thiện sổ lời chúc; hộp quà mừng **nếu Owner đưa vào scope** | TODO |
| **4** | Biến thể theme còn lại; regression, performance, accessibility, mobile thật; production build & Docker | TODO |

### A3. Cố ý để ngoài phạm vi (đến khi Owner chốt)

- Hộp quà mừng (T13/F13): mặc định **tắt**; chỉ làm khi Owner chọn đưa vào scope và tự kiểm tra thông tin người thụ hưởng + nội dung QR.
- Payment gateway / webhook / theo dõi ai đã chuyển tiền: **không làm**.
- OTP cho vai trò trợ lý nội dung (giữ ở P2 theo `docs/15-p2-out-of-scope-decisions.md`).
- Coverflow album, third-party smooth-scroll toàn trang, particle toàn trang: **không làm**.
- Viết lại template engine / thay framework / thêm NextAuth: **không làm**.

### A4. Nguyên tắc không được phá vỡ

1. **Spring là nguồn sự thật** về session / grants / authorization. Frontend không tự quyết quyền.
2. **Access gate** kiểm ở backend cho mọi private endpoint (grant + open marker + cửa sổ mở/đóng + PIN).
3. **QR/link bền vững**: sửa tên/ảnh/theme/địa điểm **không** đổi token. Close/revoke chặn session cũ theo thiết kế.
4. **Draft/publish**: lưu nháp không đổi bản khách đang xem; publish mới đổi. Version/conflict không ghi đè im lặng.
5. **Privacy**: phản hồi, ghi chú riêng của khách, số điện thoại, danh sách khách **không công khai**; OG chỉ dùng nội dung chung đã cho phép.
6. **Migration** chỉ thêm mới (`V17+`), không sửa migration đã áp dụng; dữ liệu cũ phải có fallback tương thích.
7. **Preview không phải cơ chế cấp quyền**: xem trước không tạo lượt mở, không gửi RSVP, không public.
8. **Không bịa dữ liệu**: không tự thêm tên bố mẹ, lời chúc, lịch trình, tài khoản ngân hàng.
---

## B. Hiện trạng đã xác minh

> Mục này chỉ ghi thứ **đã đọc code / đã chạy lệnh**. Nhận định chỉ từ ảnh nằm ở B4.

### B1. Stack và cấu trúc repository (đã kiểm chứng)

- **Backend**: Java 21 (`pom.xml`), Spring Boot **4.1.1**, `spring-boot-starter-{webmvc,security,validation,jdbc,flyway}`, `spring-session-jdbc`, PostgreSQL, Flyway, ZXing 3.5.4 (QR), PDFBox 3.0.6 (PDF). Không có Maven Wrapper → dùng `mvn` hệ thống.
- **Frontend**: Next.js **16.4.2** (App Router), React **19.3.1**, TypeScript ~5.9.3. **Không có thư viện UI, không có thư viện motion** (không framer-motion, không tailwind, không shadcn). Toàn bộ CSS viết tay (`globals.css`, `features/invitation/design.css`, `app/admin/admin.css`). Test frontend chạy bằng `node --test tests/*.test.mjs` (không Playwright/Jest).
- **Routes khách**: `/w/[slug]` (thiệp chung), `/i/[token]` (redeem), `/invitation/[id]` (lời mời cá nhân), `/` (welcome).
- **Routes quản trị**: `/admin` + `wedding, media, events, invitations, import, exports, print, responses, reminders, wishes, audit, users, account, login`.
- **Package backend**: `access, admin, common, identity, imports, invitations, media, rsvp, wishes, wedding`.
- **Quy ước code hiện có**: file TSX/CSS viết **dòng rất dài, gần như minified** (ví dụ `admin.css` 185 dòng cho ~19,6 KB). Task mới **giữ nguyên quy ước này** để diff nhỏ và không tạo hai phong cách trong cùng file; riêng file mới được phép xuống dòng rõ ràng.

### B2. Chức năng đã tồn tại (đọc code, KHÔNG phải "chưa có")

| Nhóm | Bằng chứng |
|---|---|
| Hero ảnh lớn + crop focal | `design.tsx` `cover-photo`, `heroPosition`, `MediaService.selected()` (`focal_x/focal_y` → `"x% y%"`) |
| Thiệp chung & lời mời cá nhân | `app/w/[slug]`, `app/invitation/[id]`, `GuestService.view/publicWedding` |
| Thông tin buổi tiệc, bản đồ, lịch | `GuestService.view` (maps_url, dress_code, parking, note), `/guest/invitations/{id}/events/{eventId}/calendar.ics`, `CalendarFile` |
| RSVP + version + idempotency | `RsvpService.Input` (`expectedVersion`), header `Idempotency-Key`, `RsvpService.save` trả payload cũ khi trùng key |
| Lời chúc có duyệt | `wish-book.tsx`, `WishService` (PENDING/APPROVED/REJECTED), `V15__wishes.sql` |
| Câu chuyện, album + lightbox | `design.tsx` `wedding-story`, `album-editorial`, `lightbox` (Esc, ←/→, trả focus) |
| Countdown, nhạc nền bật tay, `calendar.ics` | `Countdown`, `music-control` với `preload="none"`, không `autoPlay` |
| Editor chọn mẫu/màu/nội dung/nhạc/countdown | `design-editor.tsx`, `DesignController`, `V4__wedding_design.sql`, `V14__reminders_music_countdown.sql` |
| Draft/preview/publish | `AdminService.publishWedding`, `DesignController.save` chỉ ghi `draft_*`, `media.publishSelection()` |
| Quản lý truy cập + tracking | `AccessGate`, `PolicyInput` (INHERIT/MANUAL_OPEN/MANUAL_CLOSED/SCHEDULED), `open_events`, `/admin/invitations/bulk-policy` |
| PIN | `PinService`, `V13__invitation_pin.sql`, bước PIN trong `app/invitation/[id]` |
| Vai trò OWNER/EDITOR | `identity/*`, `V16__editor_role.sql`, `features/admin/shell.tsx` |
| Worklist nhắc RSVP | `admin/reminders`, `ReminderService` |

### B3. Lỗi đã kiểm chứng bằng code (không phải phỏng đoán)

| # | Lỗi | Bằng chứng chính xác | Đánh giá |
|---|---|---|---|
| L1 | Số `0` đứng đầu mỗi card buổi tiệc | `app/invitation/[id]/page.tsx` dòng 28: `<div className="event-number">{event.state==='CANCELLED'?'×':'0'}</div>` — **ký tự `'0'` hard-code**, không phải index | **Xác nhận 100%**, đúng như mô tả "index bị đưa ra UI" (thực tế còn tệ hơn: là hằng số) |
| L2 | Ghi chú sự kiện lẫn vào ô lời nhắn RSVP | `GuestService.view` dòng 45 SELECT **hai cột cùng nhãn `note`**: `e.note` (ghi chú của chủ tiệc) và `r.note` (lời nhắn riêng của khách). `JdbcTemplate` trả `Map` theo *column label*, nhãn trùng sẽ ghi đè nhau ⇒ frontend nhận **một** trường `note` dùng cho **hai** mục đích: hiển thị công khai trong card (`event-note`) **và** prefill textarea RSVP | **Xác nhận 100%** — vừa là lỗi hiển thị vừa là **rủi ro riêng tư** (hoặc lộ ghi chú nội bộ, hoặc lộ lời nhắn riêng của khách ra card công khai) |
| L3 | Layout nhiều cột giữ nguyên trong khung hẹp | `design.css` có `@container (max-width:760px)` nhưng chỉ override `.public-wedding-page .album-editorial`; `.album-editorial` **trần** (`grid-template-columns:2fr 1fr 1fr`) không được override. Trong **preview điện thoại của editor** (div 390px trên desktop 1440px) media query `@media(max-width:700px)` **không** áp dụng ⇒ album vẫn 3 cột | **Xác nhận 100%** |
| L4 | Preview điện thoại cao gần hết trang | `.preview-stage { overflow:hidden }` và **không giới hạn chiều cao**; `.preview-stage.phone` chỉ đặt `width:390px` + border 10px. Cây thiệp render full height ⇒ preview cao bằng cả thiệp | **Xác nhận 100%** |
| L5 | Ghi chú/xử lý `\n` literal | `design.tsx` dòng 12 có `text()` xử lý `\\r\\n`/`\\n` **nhưng chỉ áp cho** `message`/`footer`/`story`. `names`, `event.note`, `dress_code`, `parking`, `change_notice`, `displayName`, `salutation`, lời chúc đều **không** đi qua hàm này | **Xác nhận một phần**: lỗi literal `\n` còn tồn tại ở các trường ngoài `message`/`footer`/`story` |
| L6 | Tên cặp đôi xuống dòng thiếu kiểm soát + nghi tách ký tự | `design.names` là **một chuỗi** render trần trong `<h1>`; không có cơ chế ngắt dòng theo tên/người. `globals.css` đặt `h1,h2,h3 { overflow-wrap:anywhere }` (cho phép ngắt giữa từ tuỳ ý), `.wedding-cover h1` thêm `letter-spacing:-.045em`, `.eyebrow/.cover-caption` thêm `letter-spacing:2px` + `text-transform:uppercase` | **Xác nhận 100%** phần "xuống dòng thiếu kiểm soát"; phần "tách ký tự" xem B4 |
| L7 | Sidebar quản trị "lặp mục" | `features/admin/shell.tsx` dòng 6: mảng `navigation` có **14 href duy nhất, không trùng**. Không tìm thấy chỗ render trùng menu trong `admin.css` hay `admin/layout.tsx` | **Chưa xác nhận trong code** — xem B4 |

### B4. Nhận định **chưa** kiểm chứng (chỉ từ ảnh / cần xác minh thêm)

- **"Tên `Trần` bị tách ký tự bất thường"**: đã quét toàn bộ source (`*.tsx,ts,css,java,sql,ps1,md,json`) tìm combining marks (U+0300–U+036F) → **0 file**. Repo **không** chứa dữ liệu NFD. Cũng **không có** bước chuẩn hoá NFC nào ở backend khi ghi `names`/`display_name` (grep `Normalizer|NFC` → chỉ có trong test PDF). ⇒ Hai nguyên nhân khả dĩ, **chưa** xác minh được bằng ảnh trong phiên này: (a) dữ liệu NFD do Owner dán từ nguồn khác; (b) `overflow-wrap:anywhere` + `letter-spacing` cho phép ngắt/lệch dấu. Cách xử lý đã chọn: **chuẩn hoá NFC ở cả hai biên (ghi ở backend, render ở frontend) + bỏ ngắt tuỳ ý trong tên**. Cần Owner xác nhận bằng ảnh chụp màn hình thật sau khi sửa.
- **"Sidebar quản trị lặp các mục"**: nhiều khả năng là **artefact của công cụ chụp ảnh cuộn** — `.sidebar { position:sticky; height:100vh }` nên ảnh full-page dạng stitch sẽ lặp sidebar ở mỗi "trang" ghép. Theo yêu cầu, **không sửa code dựa trên giả định này**; chỉ siết bằng test chống trùng href (UI-002) và cải thiện active state.
- **"Preview điện thoại"**: đã xác nhận là lỗi thật (L4), không phải artefact ảnh.
- Chưa có browser automation ⇒ mọi kết luận về **hình ảnh hiển thị thực tế** phải được Owner xác nhận.

### B5. Migration và DB thực tế

- Migration đã có: `V1__core` → `V16__editor_role` (16 file, liên tục, không thiếu số).
- **Migration tiếp theo phải là `V17__…`.** Không sửa `V1`–`V16`.
- **Chưa kiểm tra được DB thật trong phiên này**: chưa thấy stack `docker compose` đang chạy, chưa truy vấn `flyway_schema_history`. Cách kiểm tra khi có stack:
  `docker compose --env-file .env -f deploy/compose.yml exec -T db psql -U wedding -d wedding -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"`
- **Đợt 1 không cần migration mới**: L1/L2/L3/L4/L5/L6 đều sửa ở SQL alias / JSX / CSS.

### B6. Lệnh build/test đã chạy thật (baseline S1)

| Lệnh | Kết quả |
|---|---|
| `cd frontend; npm test` | **pass 20 / fail 0** (315 ms) |
| `cd frontend; npx tsc --noEmit` | **exit 0** (clean) |
| `cd backend; mvn -o test` | **Tests run: 33, Failures: 0, Errors: 0** · **BUILD SUCCESS** |
| `cd frontend; npm run build` | chạy sau khi sửa — xem mục F |
| Môi trường | `node_modules` có sẵn; Java 25 (chạy target 21 OK); Maven 3 có; Docker 29 có. `docker compose up` **chưa** chạy trong phiên này. |

---

## C. Các giai đoạn triển khai

### Đợt 1 — Sửa lỗi, ổn định, tokens nền tảng

- **Mục tiêu**: khách nhìn thấy thiệp đúng (tên không lệch/tách, số không vô nghĩa, không layout vỡ ở khung hẹp); editor không còn preview cao bằng cả trang; ghi chú riêng của khách không lẫn với ghi chú sự kiện.
- **Đầu vào**: repo `main` @ `e71ad6f` + working tree hiện có (T24/T25).
- **Đầu ra**: L1–L6 đóng; tokens nền tảng có trong `globals.css`; test mới cho NFC/ngắt tên/nav/preview; baseline nghiệp vụ không đổi.
- **Phụ thuộc**: không.
- **Điều kiện hoàn thành**: `npm test`, `tsc --noEmit`, `npm run build`, `mvn -o test` đều xanh; RSVP vẫn lưu được với `expectedVersion`+`Idempotency-Key`; access gate không bị nới; ảnh chụp desktop/mobile + preview editor có (hoặc ghi rõ nếu chưa chụp được).
- **Cố ý để sau**: đổi mẫu đang phát hành; art direction đầy đủ; section mới.

### Đợt 2 — Art direction một mẫu chuẩn + motion + editor

- **Mục tiêu**: **một** template (`ELEGANT`) đạt chuẩn "thiệp editorial cao cấp"; màn mở thiệp/phong bì; typography hai họ font; album/lightbox; ba lớp motion.
- **Phụ thuộc**: Đợt 1 (tokens + text helpers).
- **Điều kiện hoàn thành**: `TRADITIONAL`/`MODERN` **không** bị phá; giữ `templateId/templateVersion`; editor chỉnh được các cấu hình đã có; reduced-motion hiển thị ngay; không thêm dependency mới khi chưa có lý do.
- **Cố ý để sau**: biến thể theme 2 và 3, coverflow.

### Đợt 3 — Section tùy chọn thật sự cần

- **Mục tiêu**: giới thiệu hai bạn/gia đình (public/private rõ), phân biệt nghi lễ vs tiệc, lịch trình có cấu trúc, dress code, calendar/map tải khi cần; hoàn thiện sổ lời chúc; hộp quà **chỉ khi Owner chốt**.
- **Phụ thuộc**: Đợt 2 (layout/tokens), `V17+` (schema mới).
- **Điều kiện hoàn thành**: mỗi section bật/tắt được theo dữ liệu + quyền; không bịa dữ liệu gia đình/lịch trình; không thêm payment/webhook.
- **Cố ý để sau**: hộp quà nếu Owner không chốt.

### Đợt 4 — Biến thể theme + regression/performance/a11y/OPS

- **Mục tiêu**: hoàn thiện theme còn lại; đo performance ở cấu hình ghi rõ; ma trận responsive 360/390/tablet/1440; keyboard + reduced-motion; production build & Docker.
- **Phụ thuộc**: Đợt 1–3.
- **Điều kiện hoàn thành**: không cuộn ngang ở mọi breakpoint; touch target ≥44px; focus trap cho modal/lightbox; ảnh có kích thước dự trữ + focal; chỉ hero ưu tiên tải.

---

## D. Danh sách task chi tiết

Trạng thái dùng đúng bộ: `TODO` · `IN_PROGRESS` · `BLOCKED` · `READY_FOR_REVIEW` · `DONE`.

### Đợt 1

#### UI-001 — Tên cặp đôi: chuẩn hoá NFC và ngắt dòng có kiểm soát

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | `design.names` không còn bị ngắt tuỳ ý giữa từ và không còn phụ thuộc dấu tổ hợp; ngắt dòng chỉ xảy ra giữa hai tên hoặc tại khoảng trắng hợp lệ |
| **Phạm vi** | `frontend/src/features/invitation/design.tsx` (render `<h1>` theo từng tên), `frontend/src/features/invitation/design.css` (`overflow-wrap`, `.couple-name`, `.couple-join`), `frontend/src/shared/text.ts` (mới) |
| **Không làm** | Không tách từng code point để animate (làm hỏng dấu); không thêm UI `displayName` trong phiên này; không đổi mẫu đang phát hành |
| **Dependencies** | — |
| **Schema/API** | Không đổi API. `names` vẫn `varchar(200)`; tương thích ngược |
| **Acceptance** | (1) `Trần Thị Thu Hà & Nguyễn Văn An` → 2 `.couple-name` + 1 `.couple-join`; (2) tên không còn `overflow-wrap:anywhere`; (3) chuỗi NFD được chuẩn hoá NFC trước khi render; (4) 302/360px không cuộn ngang |
| **Test** | `frontend/tests/text-vietnamese.test.mjs` (mới); `npm run typecheck`; `npm run build` |
| **Bằng chứng** | mục F |
| **Blocker/cần Owner chốt** | Owner xác nhận bằng ảnh chụp thật chữ "Trần" sau khi sửa (xem B4) |

#### UI-002 — Sidebar quản trị: chống trùng mục và active state đúng

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | Mỗi menu xuất hiện **đúng một lần**; active state đúng cho cả route con; có test chặn hồi quy |
| **Phạm vi** | `frontend/src/features/admin/shell.tsx`, test mới `frontend/tests/admin-shell.test.mjs` |
| **Không làm** | Không thêm menu mới; không đổi phân quyền OWNER/EDITOR |
| **Dependencies** | — |
| **Acceptance** | (1) href duy nhất; (2) nhãn không trùng; (3) `active` đúng khi ở route con `/admin/.../x`; (4) menu `OWNER` vẫn ẩn với EDITOR |
| **Test** | test mới parse mảng `navigation`, assert duy nhất + rule active |
| **Bằng chứng** | mục F |

#### UI-003 — Preview editor: giới hạn chiều cao và cuộn riêng

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | Khung preview cao tối đa ~72vh và **cuộn bên trong**, không kéo dài theo cả thiệp |
| **Phạm vi** | `frontend/src/app/admin/admin.css` (`.preview-stage`, `.preview-stage.phone`, `.design-preview`) |
| **Không làm** | Không thu nhỏ trang bằng `transform:scale` để vừa khung; không đổi dữ liệu preview |
| **Dependencies** | — |
| **Acceptance** | (1) preview không cao quá `min(72vh,760px)`; (2) thanh cuộn riêng + `overscroll-behavior:contain`; (3) preview vẫn **không** tạo lượt mở/RSVP |
| **Test** | contract test CSS + build |
| **Bằng chứng** | mục F |

#### UI-004 — Layout hẹp: container query cho album/story/card buổi tiệc

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | Trong khung hẹp (kể cả preview 390px trên desktop) album/câu chuyện/card buổi tiệc chuyển một cột |
| **Phạm vi** | `frontend/src/features/invitation/design.css` (`@container` cho `.album-editorial` trần, `.event-card`, `.section-intro`), `frontend/src/app/admin/admin.css` (`.stats-grid`) |
| **Không làm** | Không đổi `.public-wedding-page` desktop 3 cột |
| **Dependencies** | — |
| **Acceptance** | (1) `@container (max-width:760px)` override `.album-editorial` **trần**; (2) card buổi tiệc 1 cột ở container ≤480px; (3) `.stats-grid` 1 cột ≤700px |
| **Test** | mở rộng `frontend/tests/public-layout.test.mjs` |
| **Bằng chứng** | mục F |

#### UI-005 — Card buổi tiệc: bỏ số `0` hard-code

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | Không hiển thị ký tự vô nghĩa; dùng số thứ tự 1-based **thật** của các buổi được mời, `×` cho buổi đã hủy |
| **Phạm vi** | `frontend/src/app/invitation/[id]/page.tsx` |
| **Không làm** | Không thêm dữ liệu mới từ backend |
| **Dependencies** | — |
| **Acceptance** | (1) không còn literal `'0'` trong JSX; (2) buổi thứ n hiện số `n`; (3) buổi `CANCELLED` hiện `×`; (4) số là trang trí ⇒ `aria-hidden` + nhãn ẩn |
| **Test** | mở rộng `frontend/tests/vietnamese-copy.test.mjs` |
| **Bằng chứng** | mục F |

#### UI-006 — Chuẩn hoá text dùng chung: NFC + literal `\n` cho mọi trường

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | Mọi chuỗi do người dùng nhập, khi ghi vào DB và khi render, đều NFC và literal `\r\n`/`\r`/`\n` được hiển thị thành xuống dòng thật (hoặc khoảng trắng với trường một dòng) |
| **Phạm vi** | `frontend/src/shared/text.ts` (mới, dùng cho `design.tsx`, `app/invitation/[id]/page.tsx`, `wish-book.tsx`); `backend/.../common/Texts.java` (mới, dùng ở `DesignController`, `AdminService`, `RsvpService`, `WishService`) |
| **Không làm** | Không đổi giới hạn độ dài cột; không thêm escaping HTML (React vẫn escape; không `dangerouslySetInnerHTML`) |
| **Dependencies** | — |
| **Schema/API** | Không có migration. Chuẩn hoá là thuần văn bản, không đổi kiểu cột |
| **Acceptance** | (1) `a\\nb` hiển thị 2 dòng ở `story`/`message`/`footer`/ghi chú; (2) tên/địa chỉ hiển thị 1 dòng (không nháy `\n`); (3) viết hoa/thường của dấu tiếng Việt không đổi sau chuẩn hoá; (4) test đơn vị cho cả JS và Java |
| **Test** | `frontend/tests/text-vietnamese.test.mjs`; `backend/src/test/java/vn/wedding/invitation/TextsTest.java` (mới) |
| **Bằng chứng** | mục F |
| **Ghi chú** | Hàm `text()` cũ trong `design.tsx` được **chuyển vào shared** và giữ nguyên hành vi cũ (tương thích ngược), chỉ mở rộng thêm `\r` và thêm NFC |

#### RSVP-001 — Tách `event_note` (chủ tiệc) khỏi lời nhắn riêng của khách

| | |
|---|---|
| **Ưu tiên** | P0 |
| **Trạng thái** | DONE (S1) |
| **Mục tiêu** | Không còn hai cột cùng nhãn `note` trong payload khách; ghi chú sự kiện chỉ hiện trong card, lời nhắn riêng chỉ nằm trong form RSVP của chính khách đó |
| **Phạm vi** | `backend/.../invitations/GuestService.java` (alias tường minh), `frontend/src/app/invitation/[id]/page.tsx` (`Event` type + hiển thị) |
| **Không làm** | Không đổi `RsvpService.save` (version/idempotency/validation giữ nguyên); không đưa lời nhắn riêng vào sổ lời chúc; không thêm lời nhắn riêng vào OG |
| **Dependencies** | — |
| **Schema/API** | Không migration. **Đổi hợp đồng payload khách**: thêm `event_note`, giữ `note` = lời nhắn của khách (tương thích ngược cho form) |
| **Acceptance** | (1) SQL alias **không** có hai nhãn trùng; (2) card buổi tiệc hiện `event_note`; (3) textarea RSVP prefill bằng `note` của chính khách, không bao giờ bằng ghi chú sự kiện; (4) lời nhắn riêng **không** xuất hiện trong `wishes`/OG |
| **Test** | `backend/src/test/java/vn/wedding/invitation/GuestPayloadTest.java` (mới — test SQL có alias tường minh, không cần DB); `npm run build` |
| **Bằng chứng** | mục F |

#### TOK-001 — Design tokens nền tảng

| | |
|---|---|
| **Ưu tiên** | P1 |
| **Trạng thái** | DONE (S1, phạm vi hẹp — di trú toàn bộ ở Đợt 4) |
| **Mục tiêu** | Có một nơi khai báo: background/surface/text/muted, primary/accent, border, radius, shadow, font heading/body, spacing, content width, motion duration/easing; **tách màu thương hiệu khỏi màu trạng thái** |
| **Phạm vi** | `frontend/src/app/globals.css` (khối `:root` token + `--status-*`), dùng token cho phần CSS đã sửa trong Đợt 1 |
| **Không làm** | Không viết lại toàn bộ `design.css`/`admin.css` (rủi ro hồi quy cao); **không** đổi màu mặc định đang phát hành |
| **Dependencies** | — |
| **Acceptance** | (1) `:root` có nhóm token `--bg-*`, `--text-*`, `--brand-*`, `--status-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--motion-*`, `--content-*`; (2) cờ thể hiện trạng thái **không** dùng `--brand-primary`; (3) test contract đảm bảo token tồn tại |
| **Test** | `frontend/tests/design-tokens.test.mjs` (mới) |
| **Bằng chứng** | mục F |

### Đợt 2 — danh sách task (IN_PROGRESS từ S2)

| ID | P | Task | Dependencies | Điều kiện hoàn thành |
|---|---|---|---|---|
| ART-001 | P0 | **READY_FOR_REVIEW (S2)** — Art direction **một** mẫu chuẩn (`ELEGANT`): giấy ngà ivory, champagne tiết chế, hero bớt tối, hoạ tiết không chặn click. `--wedding-accent` **vẫn là màu Owner chọn** | UI-001, TOK-001, UI-004 | ✅ rules `.theme-elegant` + token `--inv-*` trên `.wedding-canvas`; TRADITIONAL/MODERN giữ nguyên; contract test `frontend/tests/invitation-art-direction.test.mjs` (10 test). ⚠️ **Chưa đạt tiêu chí "ảnh chụp desktop 1440 + mobile 390"** ⇒ chưa DONE, xem blocker G |
| INTRO-001 | P0 | **READY_FOR_REVIEW (S3)** — phong bì + single-flight intent + retry qua state; PIN→open→payload; backend gate trước khi bỏ qua marker đã mở | ART-001 (code đã có; ảnh chụp vẫn chờ review) | Double-click/StrictMode không tăng lượt mở; không render nội dung riêng trước khi được cấp quyền; frontend 56/56 + backend 42/42 + typecheck/build pass; chưa browser UAT |
| HERO-001 | P0 | **READY_FOR_REVIEW (S4)** — ELEGANT có ảnh dùng split hero: hai cột rộng, ảnh trên–chữ dưới khi container ≤760px; giữ focal, không scrim trên ảnh | ART-001 (code đã có, ảnh chụp chờ review) | 5 contract test mới; frontend 61/61, typecheck/build pass; backend 42/42. Chưa browser UAT/ảnh chụp nên chưa DONE |
| TYPO-001 | P0 | **DONE (S2)** — Hai họ font qua token (`--inv-serif` cho tên/tiêu đề, `--inv-sans` cho nội dung/form); bỏ `letter-spacing` khỏi câu tiếng Việt; nội dung chính ≥16px ở khung hẹp | TOK-001 | ✅ contract test khoá serif/sans, `letter-spacing:normal`, cỡ chữ tối thiểu; không font viết tay |
| ALBUM-001 | P0 | **READY_FOR_REVIEW (S5)** — tách WeddingAlbum; ảnh chính + tối đa 4 ảnh phụ không trùng; native modal dialog/portal, focus restore, chỉ số và bàn phím | UI-004 | Frontend 66/66, typecheck/build pass; backend 42/42; chưa browser UAT; không carousel/dots/autoplay thứ hai |
| MOTION-001 | P0 | **READY_FOR_REVIEW (S6)** — 650ms chuyển cảnh/reveal, 20px, stagger 40/80ms, micro-interaction 400ms; observer bỏ qua form/focus, nghe reduced-motion | ART-001 (code có, visual review treo) | Frontend 71/71, typecheck/build pass, backend 42/42; chưa browser UAT; không scroll hijacking, nội dung mặc định hiển thị |
| EDITOR-001 | P0 | **IN_PROGRESS (S7)** — nhóm cấu hình hiện có, reset mẫu/màu an toàn, đường tới media/events; còn nhóm 1–13 đầy đủ và chặn điều hướng nội bộ tổng quát | UI-003 | Owner không thể vô tình làm mất đường tới thông tin buổi tiệc/RSVP |
| EDITOR-002 | P1 | **READY_FOR_REVIEW (S7)** — mobile edit/preview không unmount state; cửa sổ riêng live draft, fallback popup bị chặn; browser mobile panel pass, popup chưa E2E | EDITOR-001 | Không ép editor hai cột trên mobile |
| EDITOR-003 | P1 | **READY_FOR_REVIEW (S8)** — V17/V19 optional và core layout reorder/toggle, version/snapshot, live preview; events/RSVP cố định | EDITOR-001 | Không cho nhập JS/CSS/HTML tuỳ ý; backend từ chối cấu hình sai |
| MOTION-002 | P1 | **READY_FOR_REVIEW (S7)** — intro opt-in 3 phần tử, pause tab hidden, reduced-motion ẩn; contract pass, chưa browser visibility E2E | MOTION-001 | Không che chữ, không chặn click, không hàng trăm phần tử |

### Đợt 3 — danh sách task (chưa triển khai)

| ID | P | Task | Dependencies | Điều kiện hoàn thành |
|---|---|---|---|---|
| SEC-001 | P1 | **READY_FOR_REVIEW (S7)** — INTRO/FAMILY nhập chủ động, default PRIVATE/tắt; HTTP public/private isolation pass | EDITOR-003, `V17+` | Owner chủ động nhập mới hiển thị; quyền rõ ràng |
| SEC-002 | P1 | **READY_FOR_REVIEW (S7)** — CEREMONY riêng không tạo event/assignment; mặc định tắt, văn bản Owner nhập | `V17+` | Không tự tạo sự kiện thứ hai từ một sự kiện |
| SEC-003 | P1 | **READY_FOR_REVIEW (S7)** — TIMELINE thời điểm/tiêu đề/mô tả, validation thời điểm + chống trùng đang bật; thứ tự Owner điều chỉnh | `V17+` | Không lấy lịch trình từ mẫu tham khảo; giờ không trùng nhau vô lý |
| SEC-004 | P2 | **READY_FOR_REVIEW (S7)** — DRESS_CODE swatch + nội dung tên màu, validation hex và nội dung | `V17+` | Không ép khách hiểu chỉ bằng màu |
| SEC-005 | P2 | **READY_FOR_REVIEW (S7)** — mini calendar + Google Maps link theo địa chỉ, chỉ mount khi mở details; không iframe/fetch/proxy | ART-001 | Không tạo arbitrary URL fetch/proxy; không API key bí mật ở frontend |
| WISH-001 | P1 | **READY_FOR_REVIEW (S7)** — danh sách 6 mục/xem thêm, lỗi tải mine rõ ràng; thiệp chung render chỉ wishes backend đã duyệt | Đợt 2 | Không danh sách dài cuộn lồng khó dùng trên mobile |
| GIFT-001 | P2 | **BLOCKED — chờ Owner quyết định scope.** Hộp quà mừng: modal copy/lưu QR, preview + xác nhận trước publish, không vào OG | Owner chốt | QR mừng cưới ≠ QR lời mời; Owner tự kiểm tra người thụ hưởng; mặc định tắt |

### Đợt 4 — danh sách task (chưa triển khai)

| ID | P | Task | Dependencies | Điều kiện hoàn thành |
|---|---|---|---|---|
| THEME-001 | P1 | **IN_PROGRESS (S7)** — ba theme/12 viewport Chrome pass overflow; sửa tên dài, không tự đổi thiết kế Owner; palette art direction còn cần review | ART-001 | Không tự đổi mẫu đang phát hành của Owner |
| TOK-002 | P2 | **IN_PROGRESS (S10)** — 138 màu hex cũ ở 3 stylesheet chuyển về compatibility palette, giữ nguyên giá trị alpha/màu; không alias màu trạng thái sang brand | Đợt 3 | Test migration + resolved art contracts pass; đang build/browser regression. Font/spacing/radius cũ chưa di trú toàn bộ |
| QA-001 | P0 | **IN_PROGRESS (S7)** — Chrome headless 3 theme × 360/390/768/1440, album 0–5, focus/modal/reduced-motion/mobile panel; thiếu private browser E2E/PIN và contrast | Đợt 2–3 | Không cuộn ngang; contrast đạt; focus rõ |
| PERF-001 | P1 | **IN_PROGRESS (S7)** — report local Chrome resource timing/bytes, 5 bitmap QA, system fonts; upload mới bound 2400px; ảnh cũ chưa resize, chưa mạng mobile/LCP/CLS chuẩn | Đợt 2 | Chỉ hero ưu tiên tải; lazy phần dưới; không tải ảnh gốc độ phân giải cao |
| A11Y-001 | P1 | **IN_PROGRESS (S7)** — browser Tab/Esc/modal restore pass sau explicit trap; safe-area; chưa screen reader/iOS/contrast matrix | Đợt 2 | Esc đóng; tab không thoát ra ngoài |
| OPS-001 | P0 | **IN_PROGRESS (S7)** — build/QA Compose + V17/V18 + smoke và 6 HTTP suites pass; production Owner chưa deploy, chỉ QA loopback 8099 | Đợt 3 | Không secrets trong image; chỉ 80/443 |

---

## E. Quyết định và thay đổi phạm vi

### E1. Quyết định đã chọn (S1)

| # | Quyết định | Lý do | Phương án không chọn & trade-off |
|---|---|---|---|
| Q1 | Xử lý L2 bằng **alias SQL tường minh** (`e.note AS event_note`, `r.note AS note`) thay vì đổi tên cột trong DB | Không cần migration, không phá dữ liệu/QR, sửa đúng chỗ gây nhãn trùng | Đổi tên cột `responses.note` ⇒ cần migration + cập nhật mọi truy vấn, rủi ro cao cho lợi ích bằng 0 |
| Q2 | Chuẩn hoá NFC ở **cả hai biên** (backend khi ghi, frontend khi render) | Backend ngăn dữ liệu xấu vào DB; frontend cứu dữ liệu cũ đã lưu NFD từ trước | Chỉ sửa frontend ⇒ dữ liệu cũ vẫn xấu khi xuất PDF/QR in (PDF đã dùng NFC trong test); chỉ sửa backend ⇒ dữ liệu cũ trước đó vẫn hiển thị sai |
| Q3 | Tách tên cặp đôi bằng cách **split trên separator `&`/`và`** và render mỗi tên là một `<span>` nguyên vẹn | Không phá hợp đồng `names varchar(200)`; không cần migration; không tách code point nên không hỏng dấu tiếng Việt | Tách trường `partner1`/`partner2` ⇒ đúng hướng dài hạn nhưng cần `V17` + editor mới; ghi nhận là việc của Đợt 3 khi mở rộng schema |
| Q4 | Giữ quy ước "dòng dài" khi sửa file cũ, file mới được viết rõ ràng | Diff nhỏ, dễ review, không tạo hai phong cách trong một file | Format lại toàn bộ ⇒ diff khổng lồ, dễ đè thay đổi của người khác |
| Q5 | Không sửa gì cho L7 (sidebar) ngoài test chống trùng + active state | Nav đã duy nhất (B3/L7); nghi là artefact ảnh cuộn | Thêm menu nhóm/đổi nav ⇒ không giải quyết gì và có nguy cơ phá role filter đã test |
| Q6 | Token layer thêm vào **không** di trú toàn bộ CSS ngay | Tránh hồi quy diện rộng trước khi có QA matrix | Di trú ngay ⇒ rủi ro đổi màu đang phát hành, vi phạm "không tự đổi mẫu đang phát hành" |
| Q7 | Preview giới hạn bằng `max-height + overflow:auto`, **không** dùng `transform:scale` | Scale làm chữ nhỏ li ti, sai yêu cầu "không thu nhỏ toàn bộ trang" | Scale/iframe srcDoc ⇒ nhanh nhưng méo typography và chặn container query |
| Q8 (S2) | Token art direction của thiệp (`--inv-*`) khai báo **trên `.wedding-canvas`**, trỏ về token toàn cục (`--font-serif`, `--font-body`) thay vì đưa vào `:root` của `globals.css` | Preview trong editor render **cùng** `WeddingCanvas` nên có ngay token; `globals.css` giữ đúng vai trò token toàn cục; sau này tách palette preset (`EDITOR-003`) chỉ cần đổi khối `.wedding-canvas` | Đưa hết vào `:root` ⇒ admin vô tình "thấy" token của thiệp, khó tách preset và dễ trùng tên khi thêm mẫu mới |
| Q9 (S2) | Bỏ `letter-spacing` **âm** ở tên cặp đôi (`h1` và rule riêng của `MODERN`): `-.045em`/`-.03em` → `normal` | TYPO-001 yêu cầu không để `letter-spacing` làm hỏng dấu tiếng Việt; ở cỡ chữ hiển thị lớn, dấu xếp chồng (ầ, ế, ộ) dễ va vào ký tự kế bên | Giữ tracking âm ⇒ đẹp hơn cho tiếng Anh nhưng rủi ro đúng với lỗi "tên bị tách ký tự" mà Owner đã báo |

### E2. Yêu cầu mới được thêm vào

- Không có yêu cầu Owner mới nào trong S1. Các mục "cần Owner chốt" nằm ở từng task.

### E3. Tác động tới thứ tự triển khai

- Q3 làm chậm "hai trường tên riêng đầy đủ" về Đợt 3 (cần schema `V17`), không chặn Đợt 1/2.

---

## F. Nhật ký phiên làm việc

> **Quy tắc:** cập nhật ngay sau mỗi task/checkpoint, không đợi cuối phiên. Không lưu secrets, token thật, tài khoản ngân hàng thật, danh sách khách thật.

### S1 — 2026-10-19

**Việc đã làm (theo thứ tự):**

1. Khảo sát repo: đọc `README.md`, `docs/10`, cấu trúc `frontend/src`, `backend/src`, toàn bộ migration `V1`–`V16`, `GuestService`, `AdminService`, `DesignController`, `MediaService`, `WishService`, `RsvpService`, các test frontend.
2. Chạy baseline (xem B6).
3. Lập `docs/IMPLEMENTATION_PLAN.md` (file này).
4. Triển khai Đợt 1: UI-001 → UI-006, RSVP-001, TOK-001 (chi tiết kết quả xem "Kết quả" bên dưới — cập nhật khi hoàn thành từng task).

**Kết quả build/test (đã chạy thật, cuối S2):**

| Lệnh | Kết quả |
|---|---|
| `cd frontend; npm test` | ✅ **tests 51 / suites 0 / pass 51 / fail 0** (S1: 41 test; S2 thêm 10 test `invitation-art-direction.test.mjs`) |
| `cd frontend; npx tsc --noEmit` | ✅ exit 0, không lỗi |
| `cd frontend; npm run build` | ✅ `Compiled successfully`, exit 0 |
| `cd backend; mvn -o test` | ✅ `Tests run: 39, Failures: 0, Errors: 0, Skipped: 0` — BUILD SUCCESS |

**Ghi chú kiểm chứng S2:** đã kiểm tra CSS **đã phát hành** trong `frontend/.next/static/chunks/3m4eqz_acnceg.css` (24 626 bytes) có `theme-elegant`, `--inv-serif`, `--inv-champagne`, `@container (max-width:760px)`, `@container (max-width:520px)` và 5 khối `@media (prefers-reduced-motion:reduce)` (minifier đổi thành `@media (…)` có khoảng trắng — không mất rule). **Chưa đo được ảnh chụp / mắt thường.**

---

### S2 — 2026-10-19 (phiên này)

**Task đã làm:** `TYPO-001` **DONE**; `ART-001` **READY_FOR_REVIEW** (code + test xong, **thiếu ảnh chụp** nên chưa đạt acceptance). Phần còn lại của Đợt 2 vẫn `TODO`.
S2 cũng **xác minh lại Đợt 1** bằng cách chạy thật (test / typecheck / build / backend test) và ghi kết quả vào mục F.

**File đã thay đổi trong S2:**

| File | Thay đổi |
|---|---|
| `frontend/src/features/invitation/design.css` | Token `--inv-*` trên `.wedding-canvas`; serif cho `.wedding-cover h1` + tiêu đề section + `.event-content h2`; sans cho `.wedding-message`, `.story-copy`, `.cover-caption`, `.eyebrow`, `.recipient-name`; `letter-spacing:normal` cho mọi khối câu tiếng Việt (kể cả tên cặp đôi); nội dung chính `clamp(16px…)`, `.event-place span` 14→15px, `.event-note` 13→15px, `.countdown-note` 12→13px, `.wish-item p` 15→16px; `pointer-events:none` cho `.wedding-ornament`/`.wedding-rule`; **lớp art direction mới cho `.theme-elegant`** (giấy ngà ivory, champagne tiết chế, hero bớt tối, hairline ấm) |
| `frontend/tests/invitation-art-direction.test.mjs` | **Mới** — 10 test khoá ART-001 + TYPO-001 |

**Không sửa:** backend, migration, editor, `globals.css` (token toàn cục giữ nguyên), `admin.css`.

**Test/build đã chạy:** bảng ở mục F (frontend **51/51 pass**, `tsc` exit 0, build OK, backend **39/39 pass**).

**Chưa kiểm chứng:** chưa có ảnh chụp desktop 1440 / mobile 390 ⇒ acceptance "ảnh chụp" của ART-001 còn treo; chưa đo contrast bằng công cụ; chưa chạy trong Docker.

**Rủi ro mới phát hiện:** `.theme-modern .wedding-cover h1.couple-names` bỏ `letter-spacing:-.03em` để không tách dấu tiếng Việt (xem Q9) ⇒ MODERN mất chút "siết chữ" ở tên; cần Owner xác nhận khi chụp ảnh.

---

### S3 — 2026-10-19 — INTRO-001

**Checkpoint triển khai:** giữ nguyên staged/unstaged S1/S2, không reset/stage/commit. Baseline frontend 51/51 pass. Đã đọc README, README-IMPLEMENTATION, handoff và luồng guest/access/PIN thật trước khi sửa.

- Tách `InvitationEntry` khỏi page: phong bì chỉ có copy chung, không nhận recipient/design/event. Chỉ mount `WeddingCanvas` sau payload được backend cho phép. Route đổi id remount state riêng.
- `open-intent.ts`: single-flight theo id, kiểm `/state` trước `/open`, không cache private payload sau request; retry lỗi POST/payload kiểm state lại. StrictMode restore chỉ GET, không tự ghi lượt mở.
- Sửa lỗi PIN cũ: xác minh PIN → state/open → payload (trước đây xác minh xong gọi payload thẳng khi chưa có open marker).
- `GuestService.open`: vẫn gate mỗi lần; cùng session/open marker không insert tracking lại kể cả qua bucket 10 phút. Marker đổi vẫn cần một intent mới; không thay token/QR/schema. Đây là idempotency theo marker/session hiện có, không tuyên bố exactly-once phân tán giữa nhiều session.
- Phản hồi busy/live status, khóa đồng bộ bằng ref, bỏ qua response sau unmount/đổi id; reduced-motion bỏ transition, không delay nhân tạo, vẫn cần bấm Mở thiệp (không tự tạo consent/tracking).
- Thêm 5 test frontend (4 test chạy logic async thật, 1 contract), 3 test backend; cập nhật test PIN theo component mới. Lượt kiểm đầu phát hiện 2 assertion cần cập nhật theo refactor/comment; typecheck đã pass. Kết quả cuối: frontend **56/56 pass**, `npm run typecheck` exit 0, `npm run build` exit 0; backend **42/42 pass**, BUILD SUCCESS; `git diff --check` sạch. Log local: `s3-frontend-test.log`, `s3-frontend-build.log`, `s3-backend-test.log` (không commit).
- **DB thật đã kiểm tra:** Docker stack đang chạy; truy vấn Flyway xác nhận V12–V16 success=true, V16 mới nhất. Không cần migration mới, số tiếp theo vẫn V17. Container hiện dùng image cũ, chưa rebuild/deploy S3.

### S4 — 2026-10-19 — HERO-001

- Đã đọc handoff, code hero/CSS cascade/editor và kiểm tra working tree: HEAD `b7c8cd1`; thay đổi S3 còn nguyên, không stage/reset/commit. Baseline frontend **56/56 pass**.
- Chỉ ELEGANT có ảnh nhận class `hero-split`. Khung rộng dùng hai vùng ảnh–chữ độc lập, container ≤760px xếp ảnh trên–chữ dưới (áp dụng cả preview điện thoại trong desktop). Không đoán khuôn mặt hay khoảng trống của ảnh.
- Ảnh giữ `heroPosition`, `object-fit:cover`, `fetchPriority="high"`; dự trữ khung bằng aspect-ratio/min-height. Bỏ scrim, filter và zoom riêng ở split hero. Chữ đặt trên giấy ngà, không text-shadow; eyebrow dùng màu Owner chọn thay champagne nhạt trên nền sáng.
- Không đổi API/schema/draft-publish; không sửa backend S3. TRADITIONAL/MODERN và hero không ảnh giữ bố cục cũ. Thêm 5 contract test HERO-001; vẫn cần browser UAT để xác nhận crop/focal, tên dài, viewport thực và contrast.
- Kết quả kiểm tra cuối phiên: frontend **61/61 pass**, `npm run typecheck` sạch, production build hoàn tất (18 trang static + route dynamic); backend **42/42 pass**, BUILD SUCCESS; `git diff --check` sạch. Log local `s4-frontend-test.log`, `s4-typecheck.log`, `s4-frontend-build.log`, `s4-backend-test.log` (không commit). Không deploy/rebuild Docker và không seed dữ liệu.

### S5 — 2026-10-19 — ALBUM-001

- Working tree đầu phiên: S3/S4 đã được stage bên ngoài agent, HEAD vẫn `b7c8cd1`; giữ nguyên index, không reset/stage/commit. Đọc code/CSS/editor/handoff trước sửa.
- Tách `WeddingAlbum` và helper thuần `album-window.ts`: một ảnh chính, tối đa 4 ảnh phụ không lặp ảnh chính; bỏ dot carousel, giữ nút đổi ảnh chính và chỉ số. Mobile không giấu ảnh phụ; khung ảnh chính ≥280px, ảnh phụ 160px.
- Lightbox dùng `<dialog>.showModal()` để browser giữ focus và làm nền inert. Portal lên body tránh container/transform/overflow của preview cắt lightbox. Esc, nút đóng và click nền dùng cùng luồng đóng; cleanup khôi phục focus opener + overflow. Mũi tên trái/phải, chỉ số live, nút ≥44px; một ảnh không có nút chuyển thừa.
- Không dependency mới/API/migration; helper có test chạy logic thật cho wrap-around và album 0–30 ảnh. Focus trap/native inert vẫn cần browser UAT, không tuyên bố contract test là E2E.
- Kiểm thử cuối phiên: frontend **66/66 pass**, typecheck exit 0, production build exit 0; backend **42/42 pass**, BUILD SUCCESS; `git diff --check` sạch. Lượt đầu phát hiện test HERO quét nhầm cả CSS mới phía sau (regex `order:` khớp `border:`), đã giới hạn đúng phạm vi HERO; không đổi acceptance HERO. Log local `s5-frontend-test.log`, `s5-typecheck.log`, `s5-frontend-build.log`, `s5-backend-test.log`.

### S6 — 2026-10-19 — MOTION-001

- Đầu phiên HEAD `ddb7965`, S5 đang staged từ ngoài agent; giữ nguyên index, không stage/reset/commit. Đã đọc handoff/code/CSS và chạy regression sau checkpoint đầu: 66/66 pass (không gọi đây là baseline trước sửa).
- Tách `observeInvitation`: chỉ reveal vùng không chứa/nằm trong form; không animate vùng đang focus. Một lần mỗi phần tử; disconnect/unsubscribe khi cleanup, hỗ trợ đổi reduced-motion ngay trong phiên. Thiếu matchMedia/IntersectionObserver hoặc observer lỗi: bỏ hiệu ứng, không giấu nội dung.
- Chuyển cảnh/reveal dùng 650ms, 20px; hero cũ 1.4s giảm về 650ms; stagger nhẹ 40/80ms ở chữ cover. Micro-interaction màu/shadow 400ms, không translate form/nút. CSS chặn animation vùng focus/form; reduced-motion bỏ zoom hover album.
- Thêm 5 test motion, 4 test chạy helper observer bằng fake environment (không phải browser E2E); chưa nghiệm thu motion bằng mắt/browser.
- Kết quả cuối: frontend **71/71 pass**, typecheck exit 0, production build exit 0; backend **42/42 pass**, BUILD SUCCESS; `git diff --check` sạch. Log local `s6-frontend-test.log`, `s6-typecheck.log`, `s6-frontend-build.log`, `s6-backend-test.log`. Không rebuild/deploy Docker, không seed DB.

### S7 — checkpoint triển khai nhiều task

- Owner yêu cầu tiếp tục tất cả task đủ điều kiện, không dừng ở từng task. Giữ nguyên staged/unstaged S5/S6, không stage/reset/commit.
- EDITOR-001/002: reset chỉ mẫu/màu (giữ nội dung/media), mobile edit/preview không unmount state, cửa sổ preview riêng dùng portal không lưu storage/token, chỉ dẫn ảnh/buổi/RSVP. **Chưa đạt toàn bộ nhóm 1–13**: các nhóm chưa có spec/config vẫn không tạo nút giả.
- EDITOR-003 + SEC-001/002/003/004: migration mới **V17** bảng section DRAFT/PUBLISHED, schema/template version 1; list allowlist kiểu/audience, 20 mục, timestamp timeline không trùng khi bật, color hex. Section mới PRIVATE/tắt; reorder/bật/tắt không xóa dữ liệu; cấm che events/RSVP. Publish sao chép snapshot trong transaction; public query chỉ PUBLIC+enabled, private vẫn qua gate.
- SEC-005: lịch ngày tiệc + link Google Maps user-initiated, không iframe/proxy/arbitrary fetch. WISH-001: xem thêm từng 6 lời chúc, lỗi tải “của bạn” không bị giả thành danh sách rỗng.
- MOTION-002: trang trí intro opt-in 3 phần tử, pause khi tab ẩn, reduced-motion ẩn. A11Y: safe-area lightbox; portal modal dùng đúng ownerDocument khi ở cửa sổ preview.
- PERF bước nền: ảnh upload mới resize chiều dài lớn nhất 2400px, không upscale, flatten PNG alpha nền trắng trước JPEG. **Ảnh cũ chưa tự di trú, chưa benchmark browser/perf**.
- Checkpoint đầu: frontend 73/73, build/typecheck pass; backend 46/46. Docker build backend/frontend thành công; **chưa restart stack Owner**, chưa áp V17 vào DB đang chạy. Tiếp theo kiểm thử stack QA riêng, không chạy smoke có ghi dữ liệu trên stack Owner.

### S8 — checkpoint bố cục lõi và browser flows

- Giữ nguyên index/diff S5–S7, HEAD đầu phiên `ddb7965`. Thêm **V19** `wedding_layout`: sáu phần MUSIC/COUNTDOWN/STORY/CONTENT/ALBUM/THANKS, order + enabled, snapshot DRAFT/PUBLISHED; allowlist + complete unique set, version 1 và conflict. Không có EVENTS/RSVP trong cấu hình; bìa/events cố định.
- `LayoutEditor` load/save/reorder/toggle/reset không xóa nội dung/media; khóa chéo 3 editor khi dirty để tránh reload mất form. `WeddingCanvas` dùng layout với fallback payload cũ. Lưu nháp/publish tách biệt.
- Frontend **79/79**, backend **56/56**, typecheck/build/Docker build pass. QA V19 migrate thành công; `verify-layout.ps1` pass nháp isolation, 409, publish order/hide, validation chặn EVENTS. Lượt đầu script restore serialize PS object sai, đã đổi sang hashtable và chạy lại pass; không phải lỗi endpoint.
- Chrome CDP pass 12 viewport/theme, gallery 0–5, Tab/Shift+Tab/Esc/1 ảnh, mobile editor, private open, **gửi RSVP thật và PIN sai/đúng**; private canvas không render trước PIN.
- Tiếp tục kiểm performance/contrast và nhóm điều khiển; không đánh dấu toàn bộ backlog DONE.

### S9 — checkpoint preview và contrast

- Working tree S5–S8 còn nguyên, HEAD đầu phiên `ddb7965`; không stage/reset/commit. Không migration mới/API/schema/backend change.
- EDITOR-002: `window.open` chuyển khỏi effect vào click handler để giữ user activation; popup lifecycle theo Window prop, phát hiện đóng bên ngoài, cleanup timer/style host, hoãn close/cancel close để StrictMode không đóng popup giả. Lỗi popup bị chặn hiện rõ ở editor.
- Browser CDP mới: popup thật mở/render canvas, đóng từ ngoài trả lại nút mở, giả lập blocked popup có thông báo. Phần screenshot cần bringToFront khi target nền sau popup; đã sửa harness.
- Contrast audit conservative chỉ đo opaque solid background; bỏ qua ảnh/gradient/transparency/opacity, không tuyên bố WCAG đầy đủ. Phát hiện tagline footer 3.65–3.79:1 và số ảnh TRADITIONAL 4.43:1; đổi sang token text-secondary, tagline 13px. Audit sẽ fail script nếu có lỗi trong phạm vi đo.
- Test checkpoint: frontend83/83, typecheck/build Docker pass; backend56/56. Regression cuối pass: frontend **83/83**, typecheck/build exit0, backend **56/56**; Docker frontend build/QA recreate pass; browser cuối exit0. Contrast sampled: ELEGANT16/TRADITIONAL11/MODERN11, **0 failures**, bỏ qua lần lượt1/6/6 mẫu (ảnh/gradient/opacity). Không chứng nhận WCAG đầy đủ.

### S10 — checkpoint TOK-002

- Đọc backlog/handoff/code trước sửa, HEAD `ddb7965`, giữ nguyên staged/unstaged trước đó. Không stage/reset/commit.
- `color-tokens.css` gom 138 giá trị hex compatibility; ba stylesheet globals/admin/invitation thay literal trong declaration bằng var, giữ nguyên custom-property declaration và giá trị màu/alpha. Không đổi màu published hay alias legacy status vào brand. Palette load trước globals; popup copy stylesheet nhận palette tự động.
- Thêm script migration chạy một lần (từ chối overwrite khi đã migrate), test cấm hex trong declaration component và kiểm resolved token; art contract cũ kiểm resolved value thay spelling token.
- TOK-002 chưa toàn bộ DONE: font/spacing/radius cũ và màu rgba/named vẫn còn. Không biến 138 màu thành một palette mới làm đổi giao diện Owner.
- Kết quả cuối frontend **86/86**, typecheck/build pass; backend **56/56**; Docker frontend rebuild/QA recreate pass. Browser regression S9 pass; thêm 9 theme×accent trên390px: không overflow, 12 contrast cases/152 mẫu nền đặc/0 lỗi. Ảnh và báo cáo trong `.qa-artifacts/`, không sửa mẫu đang phát hành trên stack Owner.

### S11 — checkpoint token và editor safety

- Working tree/HEAD `ddb7965` giữ nguyên staged/unstaged; không stage/reset/commit. Không backend/migration mới.
- Migrate 19 giá trị rgb/rgba/named (white/black/transparent) vào compatibility paint tokens, giữ nguyên giá trị; không ghi đè palette hex S10. Script mở rộng idempotent, helper resolved-color và test chống literal được cập nhật.
- Editor trước đây biến lỗi GET media thành thư viện rỗng; nay báo lỗi riêng, giữ musicId đã chọn, khóa danh sách khi chưa load, có nút retry. Không tự bỏ nhạc hoặc giả trạng thái “chưa có tệp”.
- TOK-002 vẫn chưa toàn bộ DONE: spacing/typography/radius legacy còn chưa di trú. Regression cuối frontend **87/87**, typecheck/build pass, backend **56/56**, Docker frontend rebuild/QA recreate và Chrome QA pass. Browser thêm fake media-network failure→alert/selector locked→retry→selector restored; contrast12 cases/152 samples/0 failures.

### S12 — bảo vệ bản nháp khi điều hướng

- Giữ nguyên staged/unstaged của Owner, HEAD `ddb7965`; không stage/reset/commit/push, không schema/backend/migration mới.
- Ba editor dùng chung `useUnsavedChanges`: capture link click, native beforeunload, cancelable Navigation API traversal cho Back/Forward. Không sửa Next history state, không thêm sentinel/history loop; giữ modified-click/new-tab/download và anchor cùng trang.
- Browser QA fixture dùng điều hướng nội bộ Next từ dashboard sang editor: nhập tên chưa lưu → Back/hủy giữ đúng tên và route; Back/đồng ý quay dashboard; quay lại editor xác nhận tên chưa lưu không bị ghi máy chủ. Chrome test pass. Browser thiếu Navigation API vẫn có click/unload guard, **chưa bảo đảm chặn same-document Back trên browser cũ**.
- Countdown tách khỏi nhánh tải audio: lỗi media không khóa công tắc countdown. Fake media failure/retry browser test kiểm luôn checkbox countdown khả dụng.
- Harness thêm timeout30s mỗi CDP request và xử lý beforeunload dialog; lượt đầu bị treo do native unload và fixture cross-document, đã đóng riêng Chrome QA qua DevTools, sửa fixture sang Next internal navigation và chạy lại pass. Không đóng browser Owner.
- Kết quả cuối: frontend **89/89**, typecheck/build exit0; backend **56/56**, BUILD SUCCESS; diff check sạch. Docker frontend build/QA recreate trong S12 pass; `s12-browser-resume.log` xác nhận browser regression pass (gồm Back cancel/accept, media retry/countdown, popup, modal, PIN/RSVP, presets/contrast). Không deploy stack Owner.

## G. NEXT SESSION HANDOFF

> **S12 mới nhất**: unsaved navigation guard + countdown independence; chưa tất cả task DONE. Giữ nguyên staged/unstaged hiện có, không stage/reset/commit/push.

- **S12 tiếp nối sau ngắt phiên:** `use-unsaved-changes.ts` dùng chung ba editor, 2 contract tests mới; browser Chrome cancel/accept Back qua Next internal navigation và xác nhận nháp không persisted pass. Countdown chỉnh được khi media load lỗi. `scripts/browser-qa.mjs` timeout CDP + native beforeunload handling, fixture điều hướng nội bộ; kết quả cuối frontend89/89/typecheck/build, backend56/56, browser pass ở `s12-browser-resume.log`. Không schema/migration mới, QA V19, DB Owner giữ nguyên.
- **File đọc đầu phiên sau:** tài liệu này → `use-unsaved-changes.ts`, ba editor và `scripts/browser-qa.mjs`. Back guard Chrome đã E2E; còn browser không Navigation API, dev StrictMode popup, nhóm1–13, spacing/font/radius token, ảnh thật/thiết bị thật và production. Không lặp lại đánh giá Back là chưa kiểm ở Chrome.

- **S11 mới nhất:** HEAD đầu phiên `ddb7965`, index/working tree cũ giữ nguyên, không stage/reset/commit/push. Thêm `scripts/tokenize-css-colors.mjs` mở rộng palette19 rgb/rgba/named colors (không overwrite138 hex cũ), helper/test token cập nhật. Script idempotent. Không schema/API/migration mới.
- **Editor S11:** lỗi GET media không còn thành audio=[] giả, musicId giữ nguyên, selector chưa tải bị khóa + alert/retry. Browser harness fake fetch rejection, xác nhận alert/không selector rỗng và retry khôi phục selector. Khối countdown vẫn nằm trong nhánh audio đã load (còn có thể tách để chỉnh countdown độc lập khi lỗi media).
- **Kiểm chứng cuối S11:** frontend87/87, typecheck/build exit0; backend56/56 BUILD SUCCESS; Docker frontend/QA recreate; browser QA gồm9 theme/accent,12 viewport/theme, popup, modal, PIN/RSVP/media-retry pass. Contrast152 samples0 failures; ảnh/gradient/state phức tạp chưa chứng nhận. Log `s11-*`, artifacts gitignored. Không nâng DB Owner, QA vẫnV19.
- **S10 mới nhất:** HEAD đầu phiên `ddb7965`, staged/unstaged cũ giữ nguyên; không stage/reset/commit/push. Thêm `color-tokens.css`, import đầu root layout; chuyển 138 màu hex ở globals/admin/design CSS sang compatibility vars giữ nguyên giá trị. Không alias status sang brand. Script `scripts/tokenize-css.mjs` chỉ chạy một lần, không chạy lại để ghi đè palette. Art tests resolve token qua helper; thêm 3 migration tests.
- **Kết quả S10:** frontend86/86, typecheck/build pass; backend56/56; Docker frontend rebuild+QA recreate; Chrome regression S9 pass. Thêm matrix9 theme×accent390px + contrast12 cases/152 samples nền đặc/0 failures. Chữ trên ảnh/gradient/transparency vẫn skipped, không chứng nhận WCAG. Script tiếp tục sửa/phát hành chỉ QA8099, không Owner8088.
- **TOK-002 vẫn IN_PROGRESS:** xong hex declarations; rgb/named colors đã chuyển S11; typography/spacing/radius cũ chưa toàn bộ chuyển token. Giữ compatibility palette để không thay màu đang phát hành; không hợp nhất bừa các màu gần nhau. Theme presets có ảnh screenshot tại `.qa-artifacts/preset-*.png`, cần Owner review ảnh thật, không tự đổi design Owner.
- **S9 mới nhất:** HEAD vẫn `ddb7965`, giữ nguyên staged/unstaged cũ. Thay đổi `preview.tsx`, `design-editor.tsx`, `design.css`, QA harness; thêm `preview-window.test.mjs`, `contrast-audit.test.mjs`, `scripts/contrast-audit.mjs`. Không backend/schema/migration mới. Agent không stage/reset/commit/push.
- **Kết quả S9:** frontend83/83, typecheck/build pass; backend56/56; Docker frontend rebuild + QA recreate; browser QA pass gồm popup mở/render/đóng ngoài/blocked fallback và toàn bộ regression S8. Contrast solid opaque samples38:0 failures,13 skipped (ảnh/gradient/opacity); fix tagline footer + số ảnh TRADITIONAL sang text-secondary. Artifacts `.qa-artifacts/contrast.json`, `s9-browser.log`, các log `s9-*`.
- **Harness S9:** chờ cả frontend/backend ready; bringToFront trước screenshot sau popup để tránh viewport0. Popup mở trực tiếp trong click (không effect), close poll/timer cleanup và StrictMode close cancellation. Chưa E2E popup trong dev StrictMode/in-app browser.
- HEAD đầu S8 `ddb7965`; code mới: V19/layout service/controller/editor/helper/tests, canvas render theo layout, browser QA PIN/RSVP/performance và fix loading CLS.
- V19 thêm sáu phần MUSIC/COUNTDOWN/STORY/CONTENT/ALBUM/THANKS có thứ tự và enabled, snapshot DRAFT/PUBLISHED. Backend bắt đủ/duy nhất/allowlist/version; không cho cấu hình EVENTS/RSVP. Payload cũ fallback default. Layout editor preview cùng WeddingCanvas, reset không xóa nội dung/media; khóa chéo ba editor khi dirty.
- Migration V17/V18/V19 chỉ áp QA, không nâng DB Owner. Số tiếp theo V20. Không deploy production hay restart stack Owner.
- Kiểm thử: frontend **79/79**, typecheck/build pass; backend **56/56** BUILD SUCCESS; Docker build pass; QA V19 success. `verify-layout.ps1` pass draft isolation/409/publish order/hide/chặn EVENTS/restore. Chrome QA pass 12 theme/viewport, album0–5, Tab/Shift+Tab/Esc/1 ảnh, mobile editor, private open, **gửi RSVP persist, PIN sai/đúng**.
- Performance lab 390x844 CPU4x latency150ms down1.6Mbps up750Kbps cache off, 5 bitmap fixtures, reduced motion, system fonts: trước fix LCP2008ms/CLS0.1197; sau min-height trang công khai: LCP2012ms/**CLS0**, transfer245151B, font ngoài0. Một lab run không thay field Web Vitals/ảnh cưới thật. Artifacts `.qa-artifacts/` gitignored.
- Đọc đầu: tài liệu này, `LayoutService.java`, V19, `layout-editor.tsx`, `layout.ts`, `design.tsx`, `deploy/verify-layout.ps1`, `scripts/browser-qa.mjs`.
- QA loopback8099 dùng DB/media tmpfs riêng. Browser script sửa ảnh/phát hành chỉ QA, không đổi origin sang8088. Rebuild image trước QA. Lệnh: frontend npm test/typecheck/build; backend mvn -o test; compose build backend frontend; QA compose up; verify-layout.ps1; node scripts/browser-qa.mjs.
- Còn thật: EDITOR-001 nhóm1–13 chưa có model đầy đủ; Back guard/dev StrictMode popup; TOK-002 CSS tokens toàn bộ; theme polish; contrast trên ảnh/gradient và toàn bộ trạng thái, iOS/Zalo/Messenger/screen reader; perf ảnh cũ/ảnh thật; production backup/deploy/80–443. GIFT vẫn BLOCKED Owner scope, không tự thêm ngân hàng. Không tự đánh dấu tất cả DONE.
- Không phá: session/access/PIN/CSRF/RSVP/QR/token; preview không grant/open/RSVP/storage token; events luôn trước optional blocks; version guards và publish transaction.

### Checkpoint cuối S7

- Frontend **77/77**, typecheck exit 0, production build exit 0; backend **52/52**, BUILD SUCCESS; Docker build cuối exit 0; browser CDP cuối exit 0; diff check sạch.
- Browser cuối kiểm cả Tab/Shift+Tab, modal 1 ảnh, Esc restore; mobile editor panel; private sealed→open→RSVP không overflow. Đã chụp artifacts, chưa browser submit RSVP/PIN UI sâu. Chrome local QA không thay thế iOS/Zalo/Messenger và Owner review ảnh thật.
- Navigation guard click link ở capture + beforeunload, không prompt hai lần trên media/events. Khi một editor đang dirty, editor kia bị khóa để tránh save/reload ghi mất form. Popup riêng chưa có E2E, browser có thể chặn và UI báo lỗi.
- **Không phải tất cả task DONE**: nhóm 1–13 đầy đủ, section lõi reorder, token migration, theme polish, perf mobile và production vẫn còn; GIFT blocked. Không deploy production hoặc tự sửa media cũ chỉ để đóng task.

### Checkpoint cuối S8

Frontend79/79/typecheck/build, backend56/56; HTTP layout và browser PIN/RSVP/performance pass. Layout preview trực tiếp đã build/test; Docker frontend cuối đã rebuild, QA recreate và `s8-browser-final.log` xác nhận PASS. Lần lab cuối LCP2004ms/CLS0/245148B (biến động nhỏ giữa lần chạy). Không nâng DB Owner. Không tuyên bố toàn bộ backlog hoàn tất.

### Checkpoint cuối S10

- Frontend86/86, typecheck/build, backend56/56, Docker và Chrome QA đều pass. Palette tokens được popup stylesheet copy đúng, popup regression vẫn pass.
- Regression browser: 12 theme/viewport +9 theme/accent, focus/Esc, popup lifecycle/blocked, private open/RSVP/PIN. Solid-background contrast152 mẫu0 lỗi, còn ảnh/gradient/state chưa đo hết.
- Không schema/migration mới; QA vẫnV19, DB Owner giữ nguyên. Còn editor nhóm1–13/Back navigation, token non-hex + typography/spacing, thiết bị thật, production và gift scope; không tuyên bố tất cả DONE.

### Checkpoint cuối S11

Frontend87/87, typecheck/build, backend56/56, Docker/Chrome QA pass; diff check sạch. Color-token migration bao phủ hex+rgb/rgba/named trong component declarations, giữ nguyên màu cũ. Font/spacing/radius, editor nhóm1–13/Back guard, thiết bị thật và production vẫn còn; GIFT blocked. Không tuyên bố mọi task DONE.
