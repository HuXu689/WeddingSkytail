# Wedding website — bản lõi 0.1.0

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
- Chỉ nhận JPEG/PNG ở bản hiện tại, tối đa 10 MB và 12.000 điểm ảnh mỗi chiều; ImageIO giải mã rồi tái mã hóa JPEG, bỏ dữ liệu EXIF/gốc. Tên lưu UUID, không dùng tên người dùng làm đường dẫn. Caddy giới hạn request ảnh 10 MB.
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

## Session/grants và bootstrap Owner — cập nhật

- Spring là nguồn sự thật duy nhất. Spring Session JDBC lưu grant theo invitation và open marker phía server. Không NextAuth, không JWT/localStorage hoặc cookie danh sách invitationId cấp quyền.
- Cookie `SESSION` do Spring phát hành: host-only (không Domain), Path=/, HttpOnly, SameSite=Lax. Secure theo `COOKIE_SECURE`; bắt buộc true trên HTTPS production.
- Reload gọi `GET /api/v1/guest/invitations/{id}/state` (chỉ trả `opened` sau kiểm grant/gate), sau đó lấy private DTO nếu đã mở. Không tự POST open và không ghi thêm lượt mở khi reload.
- Redeem kiểm token hash lại dưới khóa transaction; state/open/view/RSVP đều kiểm gate hiện tại. Public wedding và API admin không dùng guest gate vì có phạm vi public/Owner riêng.
- Private API và entry/page có no-store; frontend fetch no-store. Dữ liệu đã tải/chụp ở máy khách không thể thu hồi từ xa.
- V1/V2 không thay đổi. V3 chỉ tạo bảng Owner; bootstrap chạy transaction có table lock, chỉ insert khi bảng rỗng và không reset password/hash khi restart. Các biến ADMIN_* có thể bỏ sau bootstrap; smoke script vẫn cần credentials đăng nhập đúng trong `.env`.
- Với DB từ bản cũ chưa có Owner persistent, lần chạy đầu V3 dùng credentials bootstrap hiện tại. Sao lưu DB trước nâng cấp; giữ TOKEN_KEY cũ.
- Đã chạy `./deploy/smoke.ps1 -RestartBackend`: xác nhận cookie host-only, backend state/reload, no-store, giữ nguyên Owner và session/grants qua restart, gate chặn tất cả API khách khi đóng global. Unit test kiểm bootstrap bỏ qua env thay đổi/thiếu khi Owner tồn tại. Chưa có browser automation cho thao tác reload UI.