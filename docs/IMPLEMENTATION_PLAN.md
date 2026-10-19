# IMPLEMENTATION_PLAN.md — Hoàn thiện website thiệp cưới

> **Đây là nguồn sự thật duy nhất về kế hoạch và tiến độ triển khai.** Cập nhật ngay tại checkpoint nhỏ trong lúc làm, không đợi cuối phiên. Không tạo tài liệu kế hoạch cạnh tranh.
> Các tài liệu `docs/01`–`docs/16` vẫn là đặc tả nghiệp vụ gốc; tài liệu này chỉ ghi **việc đang làm, đã làm, còn lại** trên code thật.

**Ngày lập:** 2026-10-19 · **Phiên gần nhất:** S2 · **Người thực hiện:** agent (Cline) + Owner review.

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
| **2** | Art direction hoàn thiện **một** mẫu chuẩn; intro/mở thiệp, hero, typography, layout section; album/lightbox; motion system; editor cho các cấu hình đã triển khai | **IN_PROGRESS** — TYPO-001 DONE (S2); ART-001 READY_FOR_REVIEW (thiếu ảnh chụp); còn INTRO-001, HERO-001, ALBUM-001, MOTION-001, EDITOR-001… |
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
| INTRO-001 | P0 | Màn mở thiệp/phong bì có phản hồi niêm phong; open-intent idempotent; retry mạng; reduced-motion vào ngay | ART-001 | Double-click/StrictMode không tăng lượt mở; không render nội dung riêng trước khi được cấp quyền |
| HERO-001 | P0 | Hero ảnh–chữ tách vùng khi ảnh không có khoảng trống; crop theo focal; mobile bố cục riêng | ART-001 | Chữ không đè mặt; không phủ overlay làm mất sức sống ảnh |
| TYPO-001 | P0 | **DONE (S2)** — Hai họ font qua token (`--inv-serif` cho tên/tiêu đề, `--inv-sans` cho nội dung/form); bỏ `letter-spacing` khỏi câu tiếng Việt; nội dung chính ≥16px ở khung hẹp | TOK-001 | ✅ contract test khoá serif/sans, `letter-spacing:normal`, cỡ chữ tối thiểu; không font viết tay |
| ALBUM-001 | P0 | Ảnh chủ đạo + nhóm phụ, lightbox có chỉ số/Esc/focus trap, mobile ảnh đủ lớn | UI-004 | Không đồng thời grid+carousel+coverflow+autoplay |
| MOTION-001 | P0 | Ba lớp motion (chuyển cảnh chính, scroll reveal, micro-interaction), 400–700ms, 16–24px, stagger nhẹ | ART-001 | Không animate layout form khi đang thao tác; không scroll hijacking |
| EDITOR-001 | P0 | Nhóm chỉnh sửa 1–13, preview ngay, "quay về mặc định" không xoá dữ liệu thật | UI-003 | Owner không thể vô tình làm mất đường tới thông tin buổi tiệc/RSVP |
| EDITOR-002 | P1 | Mobile editor: chuyển "Chỉnh sửa / Xem trước"; mở preview riêng ở tab | EDITOR-001 | Không ép editor hai cột trên mobile |
| EDITOR-003 | P1 | Bật/tắt + đổi thứ tự section trong giới hạn; `templateVersion`/`contentSchemaVersion`; backend validate cấu hình | EDITOR-001 | Không cho nhập JS/CSS/HTML tuỳ ý; backend từ chối cấu hình sai |
| MOTION-002 | P1 | Chế độ trang trí sinh động chỉ ở intro; dừng khi tab ẩn; tắt theo reduced-motion | MOTION-001 | Không che chữ, không chặn click, không hàng trăm phần tử |

### Đợt 3 — danh sách task (chưa triển khai)

| ID | P | Task | Dependencies | Điều kiện hoàn thành |
|---|---|---|---|---|
| SEC-001 | P1 | Giới thiệu hai bạn / gia đình (public/private rõ, không bịa tên bố mẹ) | EDITOR-003, `V17+` | Owner chủ động nhập mới hiển thị; quyền rõ ràng |
| SEC-002 | P1 | Nghi lễ riêng (chỉ khi dữ liệu thật sự khác buổi tiệc; không nhân đôi sự kiện) | `V17+` | Không tự tạo sự kiện thứ hai từ một sự kiện |
| SEC-003 | P1 | Lịch trình có cấu trúc (thời điểm/tiêu đề/mô tả), timeline desktop + mobile | `V17+` | Không lấy lịch trình từ mẫu tham khảo; giờ không trùng nhau vô lý |
| SEC-004 | P2 | Dress code: mẫu màu + **tên màu bằng chữ** + hướng dẫn ngắn | `V17+` | Không ép khách hiểu chỉ bằng màu |
| SEC-005 | P2 | Mini calendar/URL map embed: chỉ tải khi cần, kiểm soát nguồn, không SSRF | ART-001 | Không tạo arbitrary URL fetch/proxy; không API key bí mật ở frontend |
| WISH-001 | P1 | Sổ lời chúc hoàn thiện: form gọn, trạng thái theo quyền, danh sách công khai chỉ đã duyệt | Đợt 2 | Không danh sách dài cuộn lồng khó dùng trên mobile |
| GIFT-001 | P2 | **BLOCKED — chờ Owner quyết định scope.** Hộp quà mừng: modal copy/lưu QR, preview + xác nhận trước publish, không vào OG | Owner chốt | QR mừng cưới ≠ QR lời mời; Owner tự kiểm tra người thụ hưởng; mặc định tắt |

### Đợt 4 — danh sách task (chưa triển khai)

| ID | P | Task | Dependencies | Điều kiện hoàn thành |
|---|---|---|---|---|
| THEME-001 | P1 | Hoàn thiện biến thể theme còn lại (burgundy/ivory/champagne presets) | ART-001 | Không tự đổi mẫu đang phát hành của Owner |
| TOK-002 | P2 | Di trú toàn bộ CSS cũ sang tokens; xoá giá trị rải rác | Đợt 3 | Không đổi màu đang phát hành |
| QA-001 | P0 | Ma trận regression: 360/390/tablet/1440, tên dài, ít/nhiều ảnh, 1/2 buổi, hero sáng/tối, keyboard, reduced-motion | Đợt 2–3 | Không cuộn ngang; contrast đạt; focus rõ |
| PERF-001 | P1 | Đo performance ở cấu hình ghi rõ (số ảnh, KB font, motion level) | Đợt 2 | Chỉ hero ưu tiên tải; lazy phần dưới; không tải ảnh gốc độ phân giải cao |
| A11Y-001 | P1 | Focus trap modal/lightbox, trả focus về nút mở, safe-area, sticky CTA không che form | Đợt 2 | Esc đóng; tab không thoát ra ngoài |
| OPS-001 | P0 | Production build + Docker compose kiểm tra; smoke script chạy qua | Đợt 3 | Không secrets trong image; chỉ 80/443 |

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

## G. NEXT SESSION HANDOFF

> **Luôn cập nhật mục này trước khi kết thúc / ngắt phiên.**

- **Task đang làm:** Đợt 2 — `TYPO-001` **DONE (S2)**; `ART-001` **READY_FOR_REVIEW (S2)** (chờ ảnh chụp). Task kế tiếp đang mở: `INTRO-001`.
- **Trạng thái code hiện tại:** working tree **chưa commit**, gồm (a) thay đổi T24/T25 có từ trước S1 (wishes, vai trò editor, V15, V16), (b) Đợt 1 của S1, (c) `ART-001`/`TYPO-001` của S2. Frontend build được, backend test pass. Chưa push.
- **Việc đã xong trong task hiện tại:** TYPO-001 DONE (serif/sans qua token, `letter-spacing:normal` cho câu tiếng Việt, cỡ chữ ≥16px — tất cả đều kiểm được bằng test). ART-001 READY_FOR_REVIEW: lớp `.theme-elegant` + token `--inv-*` + 10 contract test, **nhưng chưa chụp ảnh nên chưa đạt acceptance**.
- **Việc còn lại:** ảnh chụp desktop 1440 + mobile 390 cho ART-001; `INTRO-001`, `HERO-001`, `ALBUM-001`, `MOTION-001`, `EDITOR-001/002/003`, `MOTION-002`.
- **File cần đọc đầu tiên ở phiên sau:** `docs/IMPLEMENTATION_PLAN.md` (file này) → mục G → mục D (Đợt 2); rồi `frontend/src/features/invitation/design.tsx` + `design.css`.
- **Lệnh cần chạy tiếp:**
  - `cd frontend; npm test`
  - `cd frontend; npx tsc --noEmit`
  - `cd frontend; npm run build`
  - `cd backend; mvn -o test`
  - Kiểm tra DB thật: `docker compose --env-file .env -f deploy/compose.yml exec -T db psql -U wedding -d wedding -c "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"`
- **Migration mới chưa áp dụng:** không. Cả Đợt 1 và Đợt 2 (`ART-001`/`TYPO-001`) đều **không cần migration**.
- **1–3 bước tiếp theo cụ thể:**
  1. Chụp ảnh xác nhận ART-001 trên dữ liệu demo (`scripts/seed-demo.ps1`) ở 1440px và 390px — cả trường hợp hero có ảnh và không ảnh; đối chiếu Q9 (tracking ở MODERN).
  2. Làm `INTRO-001`: màn mở thiệp/phong bì cho luồng lời mời riêng — open-intent idempotent (double-click/StrictMode không tăng lượt mở), retry khi mạng lỗi, reduced-motion vào thẳng, không render nội dung riêng trước khi được cấp quyền.
  3. Làm `HERO-001`: tách vùng ảnh–chữ khi ảnh không có khoảng trống, dùng crop theo focal đã có (`heroPosition`), bố cục mobile riêng.
- **Blocker:**
  - ⚠️ **Chưa có browser automation** ⇒ acceptance kiểu "ảnh chụp"/"mắt thường" (ART-001, QA-001) phải do Owner chụp; agent không tự tạo screenshot được. Đây là blocker thật đang treo cho ART-001.
  - `GIFT-001` (hộp quà) **BLOCKED — chờ Owner quyết định scope**.
- **Lưu ý migration/dữ liệu/compatibility:**
  - S2 **không** sửa schema/API/backend ⇒ dữ liệu demo cũ vẫn dùng được.
  - `V17` là số migration tiếp theo hợp lệ (Đợt 3: tên riêng + section tùy chọn).
  - Payload khách có `event_note`; `note` luôn là lời nhắn riêng ⇒ client cũ cần tải lại payload.
  - Không đổi token/QR khi sửa tên, ảnh, theme, địa điểm (đã giữ trong S2).