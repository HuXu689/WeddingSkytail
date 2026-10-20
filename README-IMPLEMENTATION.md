# Wedding website — bản lõi 0.1.0

## Cập nhật đợt 7 — nội dung 5 phần tùy chọn có cấu trúc (T03–T10)

- Migration `V22__section_payload.sql`: `wedding_sections` thêm cột `payload` jsonb và `wedding.content_schema_version` cho phép giá trị 1 hoặc 2. Migration `V23__timeline_payload_source.sql` thay CHECK cũ (`TIMELINE` bắt buộc `starts_at`) bằng điều kiện linh hoạt hơn: `starts_at` **hoặc** `payload.timeline`. Cột phẳng cũ vẫn là đường tương thích cho hàng đã phát hành nên không cần backfill.
- `SectionService` nhận `payload` dạng `Map<String,Object>` (Spring Boot 4 dùng Jackson 3 `tools.jackson`; Jackson 2 không có trên classpath): `validatePayload()` whitelist từng loại, giới hạn số lượng/độ dài, buộc mã màu `#RRGGBB`; `normalized()` chỉ ghi trường đã biết và chuẩn hoá NFC; `list()` lọc mốc TIMELINE `audience=PRIVATE`, bỏ `starts_at` khi payload đã có danh sách mốc và bỏ hẳn mục nếu không còn mốc công khai — tức quyền được quyết định ở server, không phải bằng CSS hay ẩn phía client.
- `AdminService.publishWedding` copy thêm cột `payload` khi phát hành (SQL liệt kê cột tường minh nên đây là điểm dễ quên).
- Giao diện thiệp: mỗi loại có bố cục riêng trong `frontend/src/features/invitation/sections.tsx` + `design.css` — INTRO (chân dung bằng chữ, hai cột lệch nhịp), FAMILY (hai khối đối ứng), CEREMONY (thiệp giấy viền đôi), TIMELINE (sắp theo thời gian, nhóm theo ngày, nhãn “Dự kiến”), DRESS_CODE (palette có tên màu + swatch). Phần rỗng không render khối trống; hàng cũ (body `'Hi'`, `starts_at`, `color`) vẫn hiển thị như trước.
- Trình chỉnh sửa `/admin/wedding`: mỗi loại có bộ trường riêng (người/nhóm gia đình/nghi lễ/mốc/palette), kiểm tra gần trường, và **xem trước theo hai ngữ cảnh** (“lời mời riêng” và “thiệp chung”), kèm ghi chú rằng máy chủ mới là nơi quyết định quyền thật. Editor gửi `contentSchemaVersion: 2`.
- Kiểm thử: backend `mvn -B verify` **70/70** (thêm `SectionValidationTest` 10 ca, `SectionPrivacyTest` 7 ca, gồm lọc mốc riêng và whitelist payload); frontend `npm test` **122/122** (thêm `tests/sections-payload.test.mjs`), `npm run typecheck` và `npm run build` pass.
- Kiểm chứng trên stack thật (Docker local, edge `http://localhost:8088`): lưu nháp có cấu trúc → phát hành → API công khai chỉ trả mục PUBLIC và mốc PUBLIC (`public_private_milestone_leaked=False`), mục `CEREMONY` audience PRIVATE không xuất hiện, section chỉ có mốc riêng biến mất hoàn toàn, payload sai bị chặn 422/400; sau kiểm thử dữ liệu 5 phần đã được **khôi phục nguyên trạng** (body `'Hi'`, `starts_at`, màu `#ff5c5c`, `payload=null`).
- **Chưa làm:** đo contrast và ảnh chụp browser cho 5 bố cục mới; browser QA cho phiên khách/PIN; phần Giới thiệu hiện dùng typography, chưa có ảnh chân dung từng người. Nội dung thật của 5 phần vẫn cần người dùng nhập qua editor — trang không tự bịa thông tin.

## Cập nhật đợt 6 — vai trò trợ lý nội dung (T25)

- Migration `V16__editor_role.sql`: `admin_users` bỏ ràng buộc một dòng (`id` chuyển sang identity, giữ nguyên chủ tiệc hiện có), thêm `role` (OWNER/EDITOR), `display_name`, `created_by`; `audit` thêm `actor` để ghi **ai** đã thực hiện.
- **Threat model + ma trận quyền** (`docs/16-editor-role-and-permission-matrix.md`) được viết **trước** khi code, đúng 5 nguyên tắc đã cam kết ở `docs/15`.
- `AdminPermissions` (hàm thuần, có unit test) + `EditorAccessFilter` thực thi ma trận: trợ lý giữ được nội dung/khách/RSVP/lời chúc/nhắc nhở/thư viện/nháp thiết kế nhưng **bị chặn 403** ở quản trị người dùng, nhật ký, PIN, link-reveal/revoke/rotate, chính sách truy cập (chung và theo lời mời), bulk policy, phát hành/ngừng phát hành thiết kế, ghi nhận lượt mở, xuất/báo cáo/CSV, ghi dữ liệu nhập hàng loạt và phát hành/hủy buổi tiệc. Vai trò lạ ⇒ từ chối; chưa đăng nhập vẫn 401.
- Tài khoản: chủ tiệc tạo, đổi vai trò, khóa, xóa, đặt lại mật khẩu; trợ lý tự đổi mật khẩu ở `/admin/account`. Mật khẩu ≥12 ký tự (≤72 byte UTF-8), băm BCrypt cost 12, chỉ lưu băm và không bao giờ trả về API.
- An toàn vận hành: luôn giữ **ít nhất một chủ tiệc đang hoạt động**; không tự khóa/tự xóa chính mình; **khóa, xóa hoặc đặt lại mật khẩu sẽ hủy phiên đang mở ngay lập tức** (xóa bản ghi trong `spring_session`).
- Giao diện: sidebar hiện nhãn vai trò và **ẩn** các mục chỉ dành cho chủ tiệc; thêm trang “Quản trị người dùng” (chủ tiệc) và “Tài khoản của tôi” (cả hai vai trò).
- Kiểm thử: `AdminPermissionsTest` (4 ca) — backend **33/33**; frontend **20/20** + typecheck + build; `deploy/verify-editor.ps1` **33 khẳng định pass** trên stack thật. Hồi quy `smoke.ps1`, `verify-dot3.ps1` (35), `verify-dot4-pin.ps1` (27), `verify-dot4b.ps1` (48) và `verify-wishes.ps1` vẫn pass.
- **Kết luận:** mọi ticket P0/P1 trong phạm vi v1.1 đã hoàn tất và có bằng chứng chạy thật; các hạng mục P2 giữ nguyên quyết định tại `docs/15` (OTP/MFA vẫn là P2, không có trong bản này).

## Cập nhật đợt 5 — sổ lời chúc có duyệt (T24) và đóng P2

- Migration `V15__wishes.sql`: bảng `wishes` với `state` mặc định **PENDING** (ràng buộc `(state='PENDING') = (moderated_at IS NULL)`), nội dung 2–600 ký tự, index theo hàng chờ và theo lời mời.
- `WishService`: khách gửi lời chúc **sau khi đã mở thiệp** (đi đúng access gate: grant + dấu đã mở + cửa sổ mở/đóng + PIN), tối đa 3 lời chúc cho mỗi lời mời, làm sạch nội dung (bỏ ký tự điều khiển, giữ dấu xuống dòng, chuẩn hoá khoảng trắng), để trống tên thì dùng tên trên thiệp; `RequestLimits` thêm ngưỡng 20 lần/phút cho endpoint này và lời chúc quá ngắn/dài trả 422 kèm thông báo cụ thể.
- Duyệt thủ công: `GET /admin/wishes` (hàng chờ + bộ đếm + lọc trạng thái/từ khoá), `PUT /admin/wishes/{id}` (sửa nội dung, version-guarded), `POST /admin/wishes/{id}` (duyệt/từ chối), `DELETE /admin/wishes/{id}`; audit `WISH_SUBMIT/WISH_APPROVE/WISH_REJECT/WISH_UPDATE/WISH_DELETE`.
- **Chỉ lời chúc đã duyệt** mới xuất hiện trên thiệp khách và thiệp chung; chính khách gửi vẫn thấy trạng thái chờ/đã duyệt/không hiển thị qua “Xem lời chúc của bạn”. Sổ lời chúc **tách hoàn toàn** khỏi ghi chú RSVP và khỏi dữ liệu lượt mở.
- Giao diện: khối “Sổ lời chúc” trên thiệp khách (gửi + xem lại) và trang `/admin/wishes` (hàng chờ duyệt, sửa trước khi duyệt, duyệt/từ chối/xoá có xác nhận), thêm mục “Sổ lời chúc” vào sidebar.
- Kiểm thử: `WishCleanTest` — backend **29/29**; frontend **19/19** + typecheck + build; `deploy/verify-wishes.ps1` **23/23 khẳng định pass** trên stack thật. `smoke.ps1`, `verify-dot3.ps1`, `verify-dot4-pin.ps1` và `verify-dot4b.ps1` vẫn pass sau khi thêm T24.
- **Đóng P2:** `docs/15-p2-out-of-scope-decisions.md` ghi quyết định cho 12 hạng mục P2 (SaaS nhiều đám cưới, thanh toán/bán theme, check-in/phân bàn, chấm “đã đọc”, SMS/Zalo tự động, đồng bộ danh bạ, guest tự tìm lại thiệp, OTP, phân loại thiết bị thô, scroll/GPS, QR ZIP/XLSX, editor đa người) kèm lý do, điều kiện mở lại và guardrail đã có sẵn. Không hạng mục nào được thêm chỉ vì “có thể làm”.
- **Kết luận phạm vi v1.1:** P0/P1 trong phạm vi đã hoàn tất và có bằng chứng chạy thật ở cả 5 script xác minh (`smoke`, `dot3`, `dot4-pin`, `dot4b`, `wishes`).

## Cập nhật đợt 4B — worklist nhắc RSVP, tệp lịch, nhạc nền và đếm ngược

- Migration `V14__reminders_music_countdown.sql`: bảng `invitation_reminders(invitation_id,event_id,contacted_at,contacted_by,note)`; `wedding` thêm `draft_music_id/music_id/draft_show_countdown/show_countdown`; `media_assets` thêm `kind` (IMAGE/AUDIO) và nới CHECK mime cho `audio/mpeg`, `audio/mp4`, `audio/ogg` — ảnh vẫn chỉ `image/jpeg` và bắt buộc kích thước điểm ảnh, nhạc để NULL.
- **Worklist nhắc RSVP (FR21):** `GET /admin/reminders?eventId=&filter=UNANSWERED|NO_OPEN|OPENED_NO_RESPONSE` trả danh sách khách chưa phản hồi kèm **nội dung nhắc soạn sẵn theo buổi** (giờ/địa điểm theo múi giờ của buổi) và bộ đếm; `POST /admin/reminders/{invitationId}/{eventId}` đánh dấu đã nhắc kèm ghi chú, `DELETE` bỏ ghi nhận. Đánh dấu **không** tạo lượt mở và không lẫn với `open_events`: lời mời chỉ rời nhóm “chưa ghi nhận mở” khi khách thật sự mở thiệp. Audit `REMINDER_CONTACTED`/`REMINDER_CLEAR`.
- **Tệp lịch (ICS):** `GET /guest/invitations/{id}/events/{eventId}/calendar.ics` đi qua đúng cổng như thiệp (grant + dấu đã mở + lịch mở/đóng + PIN), trả `text/calendar` với `DTSTAMP/DTSTART/DTEND` UTC, `UID` ổn định, `LOCATION`, `URL` bản đồ, lưu ý thay đổi và `STATUS:CANCELLED`; mọi dòng gấp theo 75 octet và thoát `\ ; ,` theo RFC 5545. `CalendarFile` là lớp thuần nên có unit test riêng.
- **Nhạc nền:** tải tệp qua `POST /admin/media/audio` (≤20 MB, nhận diện bằng magic bytes ID3/MP3, `ftyp`/M4A, `OggS`, không dùng ImageIO); `PUT /admin/wedding/design` nhận `musicId` + `showCountdown` và publish copy sang cột công bố; URL nhạc bản nháp `/api/v1/admin/media/audio` (chỉ chủ tiệc), URL công khai ổn định `/api/v1/media/audio`; xóa tệp nhạc đang được chọn bị chặn.
- **Thiệp khách:** nhạc **không tự phát** — khách bấm “Bật nhạc nền” mới phát (không gọi `play()` khi tải trang, có `aria-pressed` và thông báo trạng thái); khối đếm ngược hiện khi bật và tự ẩn khi buổi gần nhất đã bắt đầu; nút “Thêm vào lịch” trên từng buổi đã phát hành.
- Kiểm thử: `CalendarFileTest` 5 ca (UTC, UID ổn định, thoát ký tự, gấp dòng ≤75 octet, thiếu dữ liệu tùy chọn) — backend **25/25**; frontend **18/18** + typecheck + build; `deploy/verify-dot4b.ps1` **48 khẳng định pass** trên stack thật (worklist, tách biệt lượt mở, ICS theo cổng truy cập, nhạc theo bản nháp/bản phát hành, chặn xóa tệp đang dùng). `smoke.ps1`, `verify-dot3.ps1` và `verify-dot4-pin.ps1` vẫn pass.
- Tương thích: `PUT /admin/wedding/design` dùng `Boolean showCountdown` nên client cũ thiếu trường không bị lỗi 400; `deploy/smoke.ps1` và `scripts/seed-demo.ps1` đã cập nhật để giữ nguyên trạng thái nhạc/đếm ngược khi lưu thiết kế.
- **P1 đã hoàn tất.** Phần còn lại chỉ là các hạng mục P2 trong `docs/10-roadmap-and-backlog.md`.

## Cập nhật đợt 4A — PIN bảo vệ lời mời (FR19)

- Migration `V13__invitation_pin.sql` tạo `invitation_pin_protection` (`enabled`, `pin_hash`, `security_revision`, `updated_at`, `updated_by`) với ràng buộc: bật thì bắt buộc có hash.
- API Owner: `GET/PUT/DELETE /admin/invitations/{id}/pin` và `POST …/pin/reset`. Máy chủ sinh mã 6 chữ số (không bắt đầu bằng 0, loại mã lặp và dãy dễ đoán) hoặc nhận mã do chủ tiệc tự đặt (4–12 chữ số). Mã chỉ được trả về **một lần** khi sinh hoặc đổi; `GET` chỉ trả `enabled`, `securityRevision`, `updatedAt` — không bao giờ trả bản băm hay mã.
- Bản băm BCrypt cost 12 giống mật khẩu chủ tiệc; mã không bị ghi log, không nằm trong QR và không xuất hiện trong script kiểm thử/backup.
- Phiên khách lưu `pin:<id>` gắn với `security_revision`, nên đổi mã hoặc tắt PIN sẽ hủy mọi phiên đã xác nhận trước đó.
- `AccessGate` chặn ở tầng gate cho mọi API riêng tư. Khi chưa xác nhận, `state`/`open` trả **428** để giao diện hiện bước nhập PIN (không lộ tên khách trước khi xác nhận); mã sai trả **403** với thông báo chung, không tiết lộ mã có tồn tại hay không.
- Chống dò mã hai lớp: `RequestLimits` giới hạn 10 lần/phút cho mỗi địa chỉ ở endpoint PIN (kèm `Retry-After`), và `PinService` chặn 20 lần sai trong 15 phút cho mỗi lời mời.
- Giao diện: trang Khách & lời mời có khung “Mã PIN bảo vệ lời mời” (bật, tạo mã mới, tự đặt mã, tắt PIN có xác nhận, mã hiện một lần kèm nút sao chép); thiệp khách có bước nhập PIN riêng trước khi mở thiệp, dùng ô mật khẩu và thông báo lỗi chung.
- Kiểm thử: `PinProtectionTest` (chuẩn hoá mã, sinh mã, băm BCrypt, bộ đếm sai) — backend 20/20; `deploy/verify-dot4-pin.ps1` **27/27 khẳng định pass** trên stack thật (428 khi chưa xác nhận, 403 mã sai, 429 khi dò liên tục, đổi mã hủy phiên, tắt PIN trả lại quyền truy cập, RSVP vẫn lưu được sau khi xác nhận). `smoke.ps1` và `verify-dot3.ps1` vẫn pass.
- **Còn lại của P1:** worklist nhắc RSVP, tệp ICS, nhạc nền và đếm ngược.

## Cập nhật đợt 3 — thao tác truy cập hàng loạt, buổi tiệc chi tiết hơn, trung tâm in và báo cáo

- `POST /api/v1/admin/invitations/bulk-policy` (FR18, docs/13 §5): xem trước rồi mới áp dụng; body `{ids,mode,openAt,closeAt,dryRun,expectedVersions}`. `dryRun=true` trả về số lời mời áp dụng được, số bị bỏ (không tồn tại/đã thu hồi/đã thay đổi), ảnh hưởng phiên đang mở, số lời mời sẽ được mở và `qrUnchanged=true`.
- Bulk chỉ đổi `mode/open_at/close_at` + `version`, **không rotate token** nên QR đã in vẫn dùng được; khóa `SELECT … FOR UPDATE` theo id đã sắp xếp, tối đa 300 lời mời, ghi audit `ACCESS_BULK_*`. Chế độ `INHERIT` bị chặn khi thao tác hàng loạt để tránh quyền ngầm theo nhóm.
- Giao diện: chọn nhiều lời mời bằng checkbox, “Chọn tất cả trên trang”, bảng xem trước trạng thái trước/sau và cảnh báo xung đột; nút áp dụng bị khóa cho tới khi có bản xem trước hợp lệ.
- Migration `V11__event_details_and_revision.sql` bổ sung cho `events`: `maps_url`, `dress_code`, `parking`, `note`, `change_notice`, `cancel_reason`, `revision`. Buổi tiệc đã phát hành sửa được qua `PUT /admin/events/{id}/revise`: bắt buộc kèm thông báo thay đổi khi đổi giờ hoặc địa điểm, tăng `revision`, giữ nguyên link/QR của khách. Hủy buổi tiệc **bắt buộc có lý do** (`cancel_reason`).
- Thiệp khách hiện tiến độ phản hồi, nút “Xem đường đi” khi có `maps_url`, trang phục, chỗ đỗ xe, ghi chú và dòng “Buổi tiệc vừa được cập nhật” kèm thông báo thay đổi khi `revision>0`.
- Trung tâm in `/admin/print` (docs/02 §14): chọn khách, chọn mẫu nhãn `QR_ONLY`/`NAME_QR`, xem trước lưới A4 3×5 = 15 nhãn/trang kèm cảnh báo tên dài, tạo bản in rồi tải PDF. Migration `V12__print_label_style.sql` thêm `export_jobs.label_style`; `ExportService.renderPdf(rows)` giữ nguyên bố cục cũ nên `ExportPdfTest` không đổi.
- Báo cáo CSV: `GET /admin/reports/guests.csv` và `/responses.csv` (lọc theo `eventId`), không chứa link/token; trang Xuất QR có khối chọn phạm vi, trang Buổi tiệc có link báo cáo cho từng buổi.
- Kiểm thử: backend `mvn -B clean verify` 16/16 (thêm `PrintLabelStyleTest`), frontend `npm test` 16/16 (thêm hợp đồng lớp CSS và copy đợt 3), `npm run typecheck`/`npm run build` pass, Docker rebuild áp dụng V11+V12 thành công, `deploy/smoke.ps1` pass và `deploy/verify-dot3.ps1` 32/32 khẳng định pass trên stack thật.
- **Còn lại của P1:** PIN theo lời mời, worklist nhắc RSVP, tệp ICS, nhạc nền và đếm ngược thuộc đợt 4; chưa có kiểm thử trình duyệt tự động.

## Cập nhật đợt 2B — lấp phần “backend đã có, giao diện còn thiếu”

- Lời mời có thêm bộ lọc buổi tiệc, trạng thái phản hồi, trạng thái truy cập và lượt mở thiệp; thẻ lời mời hiện buổi được mời, số buổi đồng ý/từ chối và số người đã xác nhận.
- `access_state` được tính **tại thời điểm gọi API** (`OPEN`, `NOT_YET_OPEN`, `CLOSED_SCHEDULE`, `CLOSED_MANUAL`, `CLOSED_GLOBAL`, `REVOKED`) từ cùng một biểu thức SQL và bản Java `stateOf()`; không thêm cột trạng thái và không dùng cron.
- Tổng quan có khối thống kê link (`GET /admin/dashboard/link-stats`) gồm đang mở/đang đóng, chưa ghi nhận mở/đã ghi nhận mở, sắp mở theo lịch và “đã mở nhưng chưa phản hồi” theo buổi; lượt mở không được cộng thành số người.
- Thiệp cưới có công tắc ghi nhận lượt mở (`PUT /admin/wedding/tracking`, có version) kèm lời nhắc rằng tắt ghi nhận không xóa dữ liệu đã có.
- Nhập danh sách: sau khi commit, bản xem trước được đặt lại và hiện số khách đã tạo kèm liên kết sang Khách & lời mời. Trang xuất QR kiểm tra trạng thái bản xuất trước khi tải và báo lỗi thân thiện khi snapshot hết hạn hoặc bị thu hồi.
- Đã xóa mã chết `invitations(page)` và `responses()`; giữ `PUT /admin/wedding/draft` vì `deploy/smoke.ps1` còn dùng.

## Cập nhật đợt 1B — sửa lỗi chặn và bù CSS thiếu

- Thêm `GET /admin/invitations/{id}/assignments` để form sửa khách nạp được danh sách buổi đã gán; nút Lưu bị khóa tới khi nạp xong và có nút thử lại — tránh lưu rỗng làm mất buổi đã gán.
- Hộp xác nhận thao tác lời mời có tiêu đề và nội dung riêng cho thu hồi, tạo link mới và lưu trữ; nhánh tạo link mới cảnh báo rõ QR đã in sẽ mất hiệu lực.
- Thư viện ảnh gọi đúng `setHero`, thêm nhãn “Ảnh bìa”/“Trong album” theo bản nháp và bản đã phát hành, kèm viền nhận biết ảnh bìa.
- Bổ sung CSS còn thiếu cho trình chỉnh sửa thiết kế, thẻ mẫu/màu, thanh lưu, khung xem trước điện thoại, thư viện ảnh, mốc lịch sử và các biến thể nhãn; sửa vị trí nút chuyển ảnh trong lightbox và ẩn chân trang trong khu quản trị.
- Thêm `frontend/tests/css-class-contract.test.mjs`: mọi lớp CSS dùng trong component phải có định nghĩa trong stylesheet, để lỗi thiếu style không tái phát.

## Cập nhật đợt 2A — mẫu thiệp và trình chỉnh sửa

- `/admin/wedding` có 3 mẫu bố cục: Thanh lịch, Truyền thống, Hiện đại; 3 bảng màu: olive, đỏ trầm, xanh đêm. Mẫu Hiện đại hiện là bố cục chữ, chưa hỗ trợ ảnh cưới.
- Chỉnh tên, lời mời, câu chuyện, lời cảm ơn; bật/tắt câu chuyện; gợi ý lời mời trang trọng/thân mật/gia đình. Preview khung điện thoại/rộng dùng chung `WeddingCanvas` với thiệp khách, không gọi open/RSVP. Người nhận và buổi tiệc trong preview là dữ liệu minh họa.
- Lưu nháp toàn bộ thiết kế bằng `PUT /api/v1/admin/wedding/design`; publish copy snapshot sang các cột công bố. Public/guest chỉ nhận allowlist published fields. Câu chuyện/lời cảm ơn được công khai trên thiệp chung sau publish; không nhập nội dung riêng vào đây.
- Migration mới `V4__wedding_design.sql`, giữ nguyên V1–V3. Enum mẫu/màu được validate backend và CHECK tại DB; không nhập HTML/CSS tùy ý.
- Phát hành bị khóa khi còn thay đổi chưa lưu; có xác nhận phát hành. Ngừng công bố/thay policy bị khóa khi thiết kế đang chưa lưu để tránh reload làm mất bản chỉnh. Có cảnh báo đóng/reload tab khi chưa lưu; chưa có chặn điều hướng nội bộ bằng Next Link.
- Mã mẫu: `frontend/src/features/invitation/design.tsx`, CSS ở `design.css`; trình chỉnh sửa: `features/admin/design-editor.tsx`. Nội dung vẫn render dưới dạng text, không dangerouslySetInnerHTML.
- Đã build Next/Java qua Docker, chạy smoke test thêm draft isolation, published design và stable invitation link; regression session/restart/CSRF/IDOR/RSVP pass. Chưa có kiểm thử trực quan browser automation.
- **Chưa hoàn thành toàn bộ đợt 2:** upload/resize ảnh, album, focal point ảnh, lịch sử/khôi phục phiên bản, sắp xếp khối nội dung sẽ làm tiếp. Không có nút upload giả. Vẫn dùng version chung của wedding nên thay nội dung có thể yêu cầu guest bấm mở lại; tách revision riêng là việc còn lại.

## Cập nhật thư viện ảnh

- Migration `V5__media_library.sql` tạo thư viện ảnh, lựa chọn ảnh bìa/album cho bản nháp và bản đã phát hành; V1–V4 không thay đổi.
- API Owner: `GET/POST/DELETE /api/v1/admin/media`, chọn ảnh bìa tại `/hero/{surface}`, album tại `/album/{surface}`. Ảnh nháp chỉ đọc qua API Owner; ảnh đã phát hành mới đọc được tại `/media/{id}.jpg`.
- Chỉ nhận JPEG/PNG ở bản hiện tại, tối đa 100 MB và 12.000 điểm ảnh mỗi chiều; ImageIO giải mã rồi tái mã hóa JPEG, bỏ dữ liệu EXIF/gốc. Tên lưu UUID, không dùng tên người dùng làm đường dẫn. Caddy cho phép request tối đa 105 MiB (gồm phần bao multipart).
- Volume `media-data` được cấp quyền cho user `wedding` trong entrypoint container; ứng dụng Java vẫn chạy non-root. Không phục vụ thư mục volume trực tiếp từ frontend.
- Xóa ảnh đang được chọn ở bản nháp hoặc đã phát hành bị chặn. Phát hành thiết kế copy lựa chọn album/bìa nháp sang bản đã phát hành. Link, session, grants và access gate không thay đổi.
- Giao diện mới: `/admin/media`, có tải ảnh, xem ảnh, đặt ảnh bìa, chọn album, chuyển giữa bản nháp/đã phát hành và xóa ảnh khi an toàn.

## Cập nhật đợt 1 — giao diện và nền dễ chỉnh sửa

- Quản trị có route riêng: `/admin`, `/admin/wedding`, `/admin/events`, `/admin/invitations`, `/admin/responses`, `/admin/audit`. Sidebar desktop và menu dạng lưới trên mobile; trạng thái đang tải, lỗi/thử lại, thông báo lưu và hộp xác nhận thao tác nguy hiểm.
- Bảng phản hồi/nhật ký dùng nhãn tiếng Việt, không render trực tiếp tên cột SQL hoặc enum. Màu kem/olive, typography và khoảng cách thống nhất; không tải font hoặc thư viện UI bên ngoài.
- Có chỉnh sửa buổi tiệc nháp qua giao diện. Sự kiện đã phát hành vẫn khóa sửa như bản lõi; revision sự kiện live thuộc đợt sau.
- Form policy điền lại giờ đã lưu; lưu thời gian chính xác tới giây và giữ cửa sổ khi đổi chế độ thủ công. Tất cả input lịch mới dùng giờ Việt Nam UTC+07, không dùng timezone máy khách. Đây là lựa chọn cố định của UI bản này, chưa phải trình chọn nhiều timezone.
- Tìm kiếm khách chỉ trong trang hiện tại (50 lời mời); bộ lọc phản hồi chỉ trong 200 phản hồi gần nhất. UI ghi rõ giới hạn, không coi là tìm toàn bộ database.
- `frontend/src/features/admin` chứa shell, hook tải dữ liệu, form sự kiện/khách/policy và thành phần UI; `frontend/src/shared/admin-types.ts`, `labels.ts`, `time.ts` chứa kiểu API, nhãn và chuyển đổi thời gian. CSS dùng biến chung trong `globals.css`, bố cục admin ở `app/admin/admin.css`.
- Test giờ: chạy `node --test tests/time.test.mjs` trong frontend (Node 24). Ba tests pass; TypeScript và Docker production build pass; HTTP smoke có restart backend pass.
- Chưa kiểm thử trực quan bằng trình duyệt tự động hoặc chụp màn hình mobile; cần duyệt giao diện thực tế trước nghiệm thu UX. Chưa có 3 mẫu thiệp/media/trình chỉnh sửa preview — thuộc đợt 2.
- Không thay API bảo mật, không thêm cookie grant/NextAuth, không sửa/thêm migration trong đợt này.

## Quy tắc ngôn ngữ giao diện

- Nội dung hiển thị cho chủ tiệc/khách phải là tiếng Việt có dấu, văn phong lịch sự và thống nhất.
- Mã kỹ thuật như `DRAFT`, `PUBLISHED`, `MANUAL_OPEN`, tên biến, tên bảng và đường dẫn API được giữ nguyên vì không phải nội dung người dùng nhìn thấy.
- Chạy `npm test` trong `frontend` để kiểm tra chuỗi tiếng Anh và dữ liệu giả không dấu phổ biến. Test này cố ý không quét tên biến/import mã kỹ thuật; khi thêm nhãn mới phải đặt trong câu tiếng Việt.
- Script `deploy/smoke.ps1` cũng xuất kết quả bằng tiếng Việt có dấu để log kiểm thử không tạo tiền lệ dùng nội dung không chuẩn.

Source triển khai từ bộ đặc tả trong `docs`. Đây là bản nền chạy end-to-end, **không phải toàn bộ MVP v1.1 và chưa nghiệm thu production**.

## Stack / cấu trúc

- `backend`: Java 21, Spring Boot 4.1.1, Spring Security, Spring Session JDBC, Spring JDBC, Flyway, ZXing 3.5.4. Maven.
- `frontend`: Next.js 16.4.2 App Router, React 19.3.1, TypeScript, CSS thuần; npm lockfile đã tạo. Không phụ thuộc font/analytics ngoài.
- `deploy`: PostgreSQL 17, Caddy, Docker Compose; backend/frontend non-root, DB không publish host port.
- Backend chia `identity`, `access`, `invitations`, `rsvp`, `admin`, `common`. Transaction đặt tại service; SQL bind parameters. Không JPA và không tự sinh schema.
- API `/api/v1`; DTO nhập camelCase; các trường đọc từ SQL đang là snake_case, frontend đã kết nối tương ứng. Đây là khác biệt có chủ đích của bản 0.1 với API draft trong docs.

## Chạy bằng Docker (PowerShell)

Tại thư mục gốc repository:

```powershell
Copy-Item .env.example .env
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Điền kết quả vào `TOKEN_KEY`; đặt `DB_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` riêng. Mật khẩu admin tối thiểu 12 ký tự. Không commit `.env`. Bản local trong phiên xây dựng đã có `.env` với mật khẩu/khóa ngẫu nhiên; **không copy đè nếu muốn giữ DB/QR hiện tại**.

```powershell
docker compose --env-file .env -f deploy/compose.yml up -d --build
docker compose --env-file .env -f deploy/compose.yml ps
```

- Website: http://localhost:8088
- Quản trị: http://localhost:8088/admin/login
- Đăng nhập bằng `ADMIN_USERNAME` / `ADMIN_PASSWORD` trong `.env` (không có mật khẩu cố định trong source).
- Dừng: `docker compose --env-file .env -f deploy/compose.yml down` (giữ dữ liệu).
- Không dùng `down -v` trừ khi chủ động xóa toàn bộ dữ liệu thử nghiệm.

## Luồng sử dụng

1. Quản trị → Thiệp cưới → lưu nháp tên/lời mời → phát hành.
2. Buổi tiệc → tạo sự kiện → phát hành; tạo được nhiều buổi độc lập.
3. Khách & lời mời → tên cá nhân/gia đình → chọn buổi + maxPeople từng buổi → tạo lời mời.
4. Thiệp cưới → mở chính sách toàn bộ (mặc định CLOSED). Có thể đóng/mở/lên lịch từng lời mời.
5. Lấy link hoặc QR PNG → gửi thủ công. Link chứa quyền truy cập: không đăng công khai.
6. Khách mở link → tiếp tục → bấm Mở thiệp → xem đúng buổi được gán → RSVP từng buổi.
7. Tổng quan hiển thị các sự kiện PUBLISHED, tổng người và số lời mời phản hồi; sự kiện hủy không tính nhu cầu phục vụ.

QR không đổi khi đóng/mở link. Rotate/thu hồi có cảnh báo và làm session cũ mất quyền. Sau cập nhật policy, khách cần bấm mở lại. Khách không có tài khoản; ID đơn thuần không cấp quyền. Cookie session HttpOnly, SameSite=Lax; unsafe requests có CSRF. GET/redeem không ghi lượt mở; open explicit dedup theo session + invitation + bucket 10 phút. Người giữ link có thể forward; lượt mở không xác minh danh tính.

## Build / kiểm thử

```powershell
mvn -f backend/pom.xml clean verify
Set-Location frontend
npm ci
npm run build
npm run typecheck
Set-Location ..
./deploy/smoke.ps1
```

Smoke script dùng credentials từ `.env`, chạy trên stack đang bật, **tạo dữ liệu giả và thay nội dung/policy wedding**, nên chỉ dùng DB dev/test. Kiểm: login, admin boundary, stable reveal, explicit-open boundary, IDOR, CSRF, 2 events, RSVP idempotency, stale version, thống kê, global close và revoke session. Lời mời test được thu hồi cuối script. Không chạy script trên dữ liệu thật.

Đã chạy: Maven 3 unit tests pass; Next production build/typecheck pass; Docker build cả backend/frontend và migrations trên Postgres 17; HTTP smoke qua Caddy pass. Chưa có browser automation, concurrency stress test, performance, in/quét QR vật lý, Zalo/Messenger hoặc restore drill.

## Phạm vi / khác biệt so với kế hoạch đầy đủ

**Có:** admin session; draft/publish wedding; tạo/sửa event draft qua API, publish/cancel; tạo lời mời + nhóm dạng nhãn + assignments; AES-GCM token có AAD theo invitation; reveal/QR/revoke/rotate/sent; global/per-link schedule; open tracking; RSVP version/idempotency/history; dashboard; audit.

**Giản lược và cần phát triển tiếp:**

- Owner lưu trong bảng `admin_users` (migration V3). Environment chỉ bootstrap lần đầu khi bảng rỗng; restart hoặc đổi/xóa biến bootstrap không đổi tài khoản đã lưu. Chưa có đổi mật khẩu UI/revoke-all sessions; không dùng biến môi trường làm cơ chế reset mật khẩu.
- GuestParty/credential đang gộp vào invitations; một nhãn nhóm/lời mời. Chưa UI sửa tên/gán lại buổi/archive và chưa guest CRUD đầy đủ.
- Event sau publish khóa sửa; chưa draft snapshot cho event đã phát hành/change notice. Không thay venue của event live trong bản này.
- Wedding slug cố định `our-wedding`; public/entry HTML dùng OG chung, không tên khách; chưa OG image tùy biến/SSR nội dung wedding.
- Chưa bulk policy preview/apply, admin guest preview, lịch sử mở chi tiết, UI bật/tắt tracking, lọc phản hồi/phân trang phản hồi đầy đủ.
- Audit giới hạn action/target/time (một owner); chưa reason/actor history đầy đủ.
- Toàn bộ guest transaction khóa wedding trước invitation, ưu tiên correctness nhưng serialize request; cần benchmark trước tăng tải.
- Rate limit transient một instance, theo direct peer. Qua proxy là ceiling dùng chung (login 30/phút, redeem 300/phút), chưa rate limit phân tán/trusted client-IP. Không bật access log chứa token.
- Chưa cleanup retention cho open events/history/idempotency; cần migration/job trước dùng thật dài hạn.
- Chưa Import CSV, PDF A4, Media, PIN, ICS, nhắc khách (đúng scope hoãn). Không có endpoint placeholder.
- Compose hiện là cấu hình chạy/staging, chưa hot reload riêng, chưa CI/OpenAPI client generation/Maven wrapper; image tag major chưa khóa digest.

## Phát triển local

Backend cần PostgreSQL và các biến như `application.yml`. Chạy `mvn -f backend/pom.xml spring-boot:run`. Frontend chạy `npm run dev` trong frontend; API rewrite mặc định tới localhost:8080. Cookie Secure phải false khi HTTP local. Trong Compose, Caddy route `/api/*` trực tiếp tới Spring nên không phụ thuộc Next rewrite.

Thêm tính năng: tạo package feature/service và input DTO validation; thêm migration V3 trở đi (không sửa migrations đã release); authorization ở service; frontend thêm component theo tính năng. Không serialize raw invitation/credential ra guest. Giữ lock order wedding → invitation → event/assignment khi thêm thao tác ảnh hưởng RSVP.

## Trước production

- Đặt domain thật: `APP_PUBLIC_ORIGIN=https://domain`, `SITE_ADDRESS=domain`, `HTTP_PORT=80`, `HTTPS_PORT=443`, `COOKIE_SECURE=true`. DNS trỏ đúng host, mở 80/443; Caddy cấp TLS. Không in QR với localhost.
- Chuyển secrets env sang secret mount/configtree, giới hạn quyền `.env` hiện tại; không chia sẻ file. Review dependency/image vulnerabilities và pin digest.
- Thêm CSP nonce tương thích Next, readiness/recovery monitoring, rate limit phù hợp; hoàn thiện security/concurrency tests và retention.
- Backup DB và TOKEN_KEY riêng, mã hóa, off-host. Mất key không tái xuất link; thay key trực tiếp làm credential cũ không decrypt được.

Backup DB không qua PowerShell binary redirection:

```powershell
docker compose --env-file .env -f deploy/compose.yml exec -T db pg_dump -U wedding -d wedding -Fc -f /tmp/wedding.dump
docker compose --env-file .env -f deploy/compose.yml cp db:/tmp/wedding.dump ./wedding.dump
```

File dump nhạy cảm, lưu ngoài repository. Restore trên stack cô lập mới, cùng key: copy dump vào db, `pg_restore -U wedding -d wedding --clean --if-exists /tmp/wedding.dump`; chỉ thực hiện trên DB đích được phép ghi đè. Xác minh link cũ/QR/RSVP sau restore. Quy trình này chưa chạy restore drill.

**Chưa phát thiệp thật trước khi review bảo mật, thử in/quét, nội dung và backup/restore được duyệt.**

## Cập nhật đợt 3A — nhập khách bằng CSV

- Migration mới `V6__guest_import.sql`, giữ nguyên V1–V5. Bổ sung `events.event_code`, `invitations.external_ref`, `import_batches` và `import_rows`.
- CSV UTF-8 gồm đúng các cột: `externalRef,displayName,salutation,groupName,eventCodes,maxPeople`. Nhiều buổi ngăn cách bằng `;`; `maxPeople` là một giá trị dùng cho tất cả hoặc danh sách khớp từng buổi.
- `POST /api/v1/admin/imports/preview` chỉ lưu bản xem trước vào database, chưa tạo invitation/credential. Tệp tối đa 2 MB/2.000 dòng; hỗ trợ dấu ngoặc kép, dấu phẩy trong tên và dấu tiếng Việt.
- `POST /api/v1/admin/imports/commit` dùng cùng `Idempotency-Key` của preview; chỉ ghi khi toàn bộ dòng hợp lệ. Transaction rollback toàn bộ nếu có lỗi.
- Formula-like values bắt đầu bằng `=`, `+`, `-`, `@` được xử lý như dữ liệu rỗng để không biến thành công thức khi tái sử dụng; không tự ghép khách theo tên.
- `externalRef` là khóa tham chiếu tùy chọn, không cho trùng trong database. Tên trùng vẫn được giữ vì có thể là các gia đình khác nhau.
- Giao diện `/admin/import`: tải tệp mẫu, xem lỗi từng dòng, chỉ bật xác nhận khi tất cả dòng hợp lệ. Mã idempotency được giữ từ preview tới commit/retry.
- Mã buổi tiệc hiện được sinh tự động dạng `E-XXXXXXXX` khi tạo sự kiện. CSV mẫu dùng mã minh họa; Owner phải thay bằng mã thực tế hiển thị trong quản trị ở bước hoàn thiện tiếp theo.
- Đã thêm 3 unit tests parser CSV. Chưa chạy browser automation; chưa có chế độ cập nhật theo `externalRef` — bản đầu chỉ tạo mới và từ chối mã đã tồn tại.
- Đã áp dụng migration V6 trên PostgreSQL 17. Backend có 8 unit tests pass (gồm 3 test parser CSV), frontend có 5 test pass, TypeScript/Next.js/Docker build pass. Preview CSV UTF-8 có dấu đã trả dòng hợp lệ và không tăng số invitation; smoke regression session/restart/CSRF/IDOR/RSVP vẫn pass.
- Các lần thử preview đã tạo một số bản ghi `import_batches`/`import_rows` ở trạng thái `PREVIEW` để kiểm chứng; không tạo invitation hoặc credential. Cần thêm cleanup TTL cho staging import trước production.

## Cập nhật đợt 3B — quản lý khách mời

- Migration mới `V7__guest_management.sql` thêm `invitations.archived` và `invitations.internal_note`; không xóa cứng khách đã có RSVP.
- Tách service `GuestManagementService`: danh sách khách có tìm kiếm server-side, lọc lưu trữ, lọc theo buổi/trạng thái RSVP và phân trang 50 dòng.
- Owner có thể sửa tên, xưng hô, nhóm, ghi chú nội bộ và assignment qua `PUT /api/v1/admin/invitations/{id}`. Token, `auth_revision` và RSVP không đổi.
- Hạ `max_people` dưới số người đã xác nhận chỉ trả cảnh báo; không giảm `responses.total_people`. Không cho bỏ assignment đã có RSVP để tránh làm mất liên kết dữ liệu.
- Lưu trữ/khôi phục là soft archive, ghi audit; khách lưu trữ bị AccessGate chặn và QR/link không còn lấy được trong UI.
- Giao diện `/admin/invitations` đã có tìm kiếm, hiện khách lưu trữ, chỉnh sửa nội dung/assignment/ghi chú và khôi phục khách.
- V7 đã migrate thành công trên PostgreSQL hiện tại. Cần bổ sung test tích hợp API với dữ liệu fixture cho update assignment/cảnh báo trước khi dùng production.

## Cập nhật đợt 3C — Owner quản lý RSVP

- Migration mới `V8__owner_rsvp_history.sql` bổ sung `changed_by` và `change_reason` cho `rsvp_history`; lịch sử cũ được mặc định là `GUEST`.
- `ResponseManagementService` tách khỏi `AdminService`: danh sách phản hồi hỗ trợ tìm kiếm server-side, lọc trạng thái/buổi tiệc và phân trang.
- Owner có thể sửa RSVP qua `PUT /api/v1/admin/responses/{invitationId}/{eventId}`. Lý do chỉnh sửa bắt buộc, kiểm tra optimistic locking và giới hạn số người theo assignment.
- Mỗi chỉnh sửa Owner tạo lịch sử mới với `changed_by=OWNER`, lý do, trạng thái, số người và phiên bản; token, quyền truy cập và assignment không bị thay đổi.
- Giao diện `/admin/responses` có lọc, sửa phản hồi và xem lịch sử. Trạng thái vẫn hiển thị bằng tiếng Việt.

## Cập nhật đợt 4A — snapshot export riêng tư

- Migration mới `V9__private_exports.sql` tạo `export_jobs` và `export_rows`; snapshot có TTL 30 phút, trạng thái `READY/EXPIRED/REVOKED`, tối đa 300 khách và mặc định 15 nhãn/trang.
- Route `/admin/exports` cho Owner chọn khách không lưu trữ, xem số khách/số trang và preview snapshot.
- CSV UTF-8 có BOM, tên khách, link QR ổn định và danh sách buổi được gán. Snapshot lưu `token_hash`; lúc tải đối chiếu token hiện tại, nên rotate/revoke sau khi tạo snapshot sẽ làm download bị từ chối để tránh in link cũ.
- API export đều nằm dưới `/api/v1/admin`, yêu cầu Spring Owner session/CSRF; khách archived/revoked hoặc không còn assignment hợp lệ bị loại. Tạo snapshot atomic, lỗi một dòng rollback toàn bộ.
- Có endpoint revoke snapshot và `Cache-Control: no-store`; file không public và không đưa vào media public.
- PDF A4 chưa phát hành ở đợt này vì repository chưa có renderer PDF và font TTF tiếng Việt. API từ chối format PDF rõ ràng thay vì tạo PDF sai dấu; cần chốt OpenPDF/renderer và đóng gói font trước đợt 4B.
- Backend 10 tests pass, frontend 5 tests pass, TypeScript/Next/Docker build pass, V9 migrate thành công và smoke regression sau restart pass. API export chưa đăng nhập trả 401.

## Cập nhật đợt 4B — PDF A4 15 nhãn/trang

- Đã tích hợp Apache PDFBox 3.0.6 và renderer `ExportService.renderPdf`.
- Đã đóng gói `backend/src/main/resources/fonts/NotoSans-Regular.ttf` cùng `fonts/OFL.txt`. Noto Sans dùng SIL Open Font License 1.1, cho phép nhúng/phân phối cùng ứng dụng khi giữ license và copyright notice.
- PDF dùng A4, bố cục 3 cột × 5 hàng, mỗi trang 15 nhãn. Mỗi nhãn lấy tên, danh sách buổi và QR từ cùng snapshot `export_rows`.
- Font được embed vào PDF để giữ dấu tiếng Việt; QR được tạo lại từ đúng URL snapshot, không đọc token mới trong lúc render.
- Download CSV/PDF đều kiểm tra TTL, trạng thái job và `token_hash`; rotate/revoke link sau khi tạo snapshot sẽ chặn tải và yêu cầu tạo bản mới.
- UI `/admin/exports` đã có nút `Tạo PDF A4`, preview số trang và nút tải PDF riêng tư.
- Thêm `ExportPdfTest`: 16 nhãn tạo đúng 2 trang và PDF có kích thước/nội dung hợp lệ. Backend hiện 11/11 test pass; frontend 5/5, TypeScript/Next/Docker build và smoke regression pass.

## Cập nhật đợt 4C — nghiệm thu PDF/QR tự động

- `ExportPdfTest` đã đọc ngược PDF bằng PDFBox, chuẩn hóa Unicode NFC và xác nhận text layer có tên tiếng Việt/chữ có dấu.
- Test duyệt các ảnh PNG nhúng trong PDF bằng ZXing; QR đầu snapshot (`token-1`) và cuối snapshot (`token-16`) đều giải mã đúng URL, xác nhận QR không bị lệch tên/link.
- Kiểm tra 16 nhãn tạo đúng 2 trang theo quy tắc 15 nhãn/trang. Backend tổng cộng 11/11 test pass sau bổ sung kiểm thử decode QR.
- Đã xác nhận V9 vẫn ở trạng thái up-to-date trên PostgreSQL, Docker startup không lỗi và smoke regression sau restart pass.
- Chưa thay thế kiểm thử tự động bằng nghiệm thu vật lý: trước production vẫn cần in A4 ở 100%, thử nhiều máy in/giấy và quét bằng iOS/Android trong điều kiện ánh sáng thực tế.

## Cập nhật đợt 5A — responsive và accessibility cơ bản

- Admin mobile dưới 760px dùng lưới menu 3 cột; dưới 380px chuyển 2 cột để các nhãn dài như `Khách & lời mời`, `Nhập danh sách`, `Xuất QR` không bị ép quá hẹp.
- Toolbar trên màn nhỏ chuyển label thành chiều rộng đầy đủ; bảng có cuộn ngang hỗ trợ cảm ứng và chỉ dẫn “Vuốt ngang để xem thêm”.
- Thêm `.sr-only` cho nhãn checkbox chọn khách; giữ focus-visible rõ ràng, nút/input tối thiểu khoảng 44px và `prefers-reduced-motion`.
- Frontend static accessibility/copy test tăng từ 5 lên 6 test pass; TypeScript/Next build, Docker build và smoke regression pass.
- Chưa có Playwright/Cypress trong repository và môi trường hiện tại chưa chạy nghiệm thu browser automation hoặc thiết bị iOS/Android thật. Cần thực hiện manual UAT ở 360px, tablet, desktop, Zalo/Messenger trước production.

## Cập nhật đợt 5B — retention và cleanup artifact riêng tư

- Bật Spring scheduling và thêm `RetentionCleanupService` chạy mặc định mỗi giờ, lần đầu sau 60 giây.
- Import preview: chỉ xóa `PREVIEW`/`FAILED` cũ hơn `IMPORT_PREVIEW_RETENTION_DAYS` (mặc định 7 ngày); batch `COMMITTED` không bị dọn.
- Export: đánh dấu job `READY` quá hạn thành `EXPIRED`; chỉ xóa `EXPIRED`/`REVOKED` quá `EXPORT_RETENTION_DAYS` (mặc định 2 ngày). `export_rows` tự xóa nhờ foreign key cascade.
- Cleanup không đụng invitation, token, assignment, RSVP, RSVP history, audit, media hoặc dữ liệu đã commit. Không có endpoint public để kích hoạt cleanup.
- Cấu hình an toàn trong `application.yml`: retention 1–30 ngày; giá trị ngoài khoảng bị từ chối khi khởi động. Có thể cấu hình `CLEANUP_INTERVAL_MS`, `CLEANUP_INITIAL_DELAY_MS`, `IMPORT_PREVIEW_RETENTION_DAYS`, `EXPORT_RETENTION_DAYS`.
- Thêm 2 retention unit tests; backend hiện 13/13 test pass. Frontend 6/6, TypeScript/Next/Docker build và smoke regression tiếp tục pass.

## Cập nhật đợt 5C — chuẩn hóa nhãn hiển thị quản trị

- Mở rộng bộ nhãn tập trung tại `frontend/src/shared/labels.ts` cho policy, trạng thái sự kiện, RSVP, import, export, link, media và các action audit V6–V9.
- `Badge` luôn hiển thị tiếng Việt; mã kỹ thuật chỉ còn trong thuộc tính `title` để hỗ trợ chẩn đoán, không xuất hiện như nội dung chính.
- Trang xuất QR/PDF dùng badge cho trạng thái link và định dạng snapshot, giữ nguyên logic chọn khách, snapshot, tải xuống và revoke.
- Fallback của nhãn không còn là “Thao tác hệ thống” mơ hồ mà là “Trạng thái chưa xác định”, giúp phát hiện enum mới chưa được Việt hóa.
- Không thay đổi API, quyền truy cập, session, access gate, migration hoặc token/QR.
- Frontend copy/accessibility test 6/6, TypeScript và Next build pass.
- Thêm `frontend/tests/labels-contract.test.mjs`: kiểm tra các mã policy, RSVP, import, export, media, link và audit bắt buộc đều có nhãn tiếng Việt có dấu; fallback không làm lộ mã kỹ thuật.

## Session/grants và bootstrap Owner — cập nhật

- Spring là nguồn sự thật duy nhất. Spring Session JDBC lưu grant theo invitation và open marker phía server. Không NextAuth, không JWT/localStorage hoặc cookie danh sách invitationId cấp quyền.
- Cookie `SESSION` do Spring phát hành: host-only (không Domain), Path=/, HttpOnly, SameSite=Lax. Secure theo `COOKIE_SECURE`; bắt buộc true trên HTTPS production.
- Reload gọi `GET /api/v1/guest/invitations/{id}/state` (chỉ trả `opened` sau kiểm grant/gate), sau đó lấy private DTO nếu đã mở. Không tự POST open và không ghi thêm lượt mở khi reload.
- Redeem kiểm token hash lại dưới khóa transaction; state/open/view/RSVP đều kiểm gate hiện tại. Public wedding và API admin không dùng guest gate vì có phạm vi public/Owner riêng.
- Private API và entry/page có no-store; frontend fetch no-store. Dữ liệu đã tải/chụp ở máy khách không thể thu hồi từ xa.
- V1/V2 không thay đổi. V3 chỉ tạo bảng Owner; bootstrap chạy transaction có table lock, chỉ insert khi bảng rỗng và không reset password/hash khi restart. Các biến ADMIN_* có thể bỏ sau bootstrap; smoke script vẫn cần credentials đăng nhập đúng trong `.env`.
- Với DB từ bản cũ chưa có Owner persistent, lần chạy đầu V3 dùng credentials bootstrap hiện tại. Sao lưu DB trước nâng cấp; giữ TOKEN_KEY cũ.
- Đã chạy `./deploy/smoke.ps1 -RestartBackend`: xác nhận cookie host-only, backend state/reload, no-store, giữ nguyên Owner và session/grants qua restart, gate chặn tất cả API khách khi đóng global. Unit test kiểm bootstrap bỏ qua env thay đổi/thiếu khi Owner tồn tại. Chưa có browser automation cho thao tác reload UI.