# Wedding website — bản lõi 0.1.0

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

## Session/grants và bootstrap Owner — cập nhật

- Spring là nguồn sự thật duy nhất. Spring Session JDBC lưu grant theo invitation và open marker phía server. Không NextAuth, không JWT/localStorage hoặc cookie danh sách invitationId cấp quyền.
- Cookie `SESSION` do Spring phát hành: host-only (không Domain), Path=/, HttpOnly, SameSite=Lax. Secure theo `COOKIE_SECURE`; bắt buộc true trên HTTPS production.
- Reload gọi `GET /api/v1/guest/invitations/{id}/state` (chỉ trả `opened` sau kiểm grant/gate), sau đó lấy private DTO nếu đã mở. Không tự POST open và không ghi thêm lượt mở khi reload.
- Redeem kiểm token hash lại dưới khóa transaction; state/open/view/RSVP đều kiểm gate hiện tại. Public wedding và API admin không dùng guest gate vì có phạm vi public/Owner riêng.
- Private API và entry/page có no-store; frontend fetch no-store. Dữ liệu đã tải/chụp ở máy khách không thể thu hồi từ xa.
- V1/V2 không thay đổi. V3 chỉ tạo bảng Owner; bootstrap chạy transaction có table lock, chỉ insert khi bảng rỗng và không reset password/hash khi restart. Các biến ADMIN_* có thể bỏ sau bootstrap; smoke script vẫn cần credentials đăng nhập đúng trong `.env`.
- Với DB từ bản cũ chưa có Owner persistent, lần chạy đầu V3 dùng credentials bootstrap hiện tại. Sao lưu DB trước nâng cấp; giữ TOKEN_KEY cũ.
- Đã chạy `./deploy/smoke.ps1 -RestartBackend`: xác nhận cookie host-only, backend state/reload, no-store, giữ nguyên Owner và session/grants qua restart, gate chặn tất cả API khách khi đóng global. Unit test kiểm bootstrap bỏ qua env thay đổi/thiếu khi Owner tồn tại. Chưa có browser automation cho thao tác reload UI.