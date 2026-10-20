# Vận hành bản đồ, lịch, lời chúc và quà mừng

Áp dụng cho source theo `PLAN_TASK_FEATURES.md`, checkpoint 2026-10-21. Đây không phải lệnh triển khai hay xác nhận stack wedding8088 đã cập nhật. Các phiên AI không commit/push/deploy hoặc migrate database wedding.

## 1. Trước khi sử dụng với dữ liệu thật

- Kiểm tra phiên bản source/schema với người phụ trách triển khai. Source cần V24, V25 và V26, không chỉ V23. Flyway có thể tự chạy khi khởi động backend: **không khởi động backend mới vào database dùng chung chỉ để thử UI**.
- Backup và thử restore trên môi trường biệt lập trước khi nâng cấp. Chỉ người vận hành được phép mới chạy migration/deploy theo quy trình dự án; tài liệu này không yêu cầu chạy ngay.
- Không đưa `.env`, secret, token lời mời, PIN, ảnh QR hoặc thông tin người nhận thật vào Git, log, screenshot QA hay dịch vụ kiểm thử bên ngoài.
- Không thay invitation QR chứa link khách bằng gift QR nhận quà. Đây là hai loại mã khác nhau; không có cổng thanh toán hoặc đối soát tiền.

## 2. Bản đồ và lịch

### Địa điểm

Ở `/admin/events`, mở phần vị trí của buổi tiệc. Nhập đủ vĩ độ/kinh độ và xác nhận đã kiểm tra vị trí; bỏ trống cả hai để không nhúng marker. Với buổi đã phát hành, ghi thông báo thay đổi theo yêu cầu form. Vĩ độ −90…90, kinh độ −180…180; giá trị 0 là hợp lệ, không phải dữ liệu mặc định để xuất bản.

Khách chủ động tải bản đồ OpenStreetMap; trước đó không gửi yêu cầu iframe tới provider. Khi tải, provider có thể nhận IP và tọa độ truy vấn, nhưng ứng dụng không đưa token lời mời hoặc tên khách vào URL bản đồ. Có địa chỉ/liên kết bên ngoài để fallback. Việc đổi địa chỉ có thể làm tọa độ cũ bị xóa để tránh marker sai; cần kiểm tra lại vị trí. Không dùng trạng thái iframe load làm bằng chứng địa điểm đúng.

### Lịch tháng

Thiệp riêng dùng sự kiện được server gán cho lời mời; ngày tính theo timezone sự kiện. Thiệp chung dùng mốc TIMELINE công khai đã được server lọc, không suy ra quyền sự kiện từ client. Chọn ngày để xem chi tiết, đổi tháng bằng nút điều hướng; sự kiện hủy có trạng thái riêng. ICS chỉ cho buổi còn được phép qua endpoint guest có kiểm grant/assignment. Thiệp chung không tự sinh ICS riêng.

## 3. RSVP và sổ lời chúc

- Form đóng mặc định bằng native disclosure. Đóng/mở không xóa draft. CTA RSVP mở đúng form rồi focus; phản hồi vẫn có optimistic version và retry idempotency, không tăng số người bởi gửi lặp.
- Lời chúc mới mặc định PENDING; gửi thành công không có nghĩa đã hiển thị. Người gửi xem trạng thái riêng trong “Xem lời chúc của bạn”. Không đưa ghi chú RSVP vào feed.
- `/admin/wishes` cho OWNER/EDITOR theo quyền moderation hiện có: lọc, tìm, phân trang, sửa, duyệt, không hiển thị, ghim/bỏ ghim và xóa có xác nhận. Chỉ APPROVED được ghim; ẩn tự bỏ ghim; sửa/duyệt/ghim có revision và audit.
- Feed public chỉ APPROVED không gắn sự kiện. Feed guest thêm lời chúc thuộc sự kiện được assignment và đang PUBLISHED/CANCELLED. Nội dung pending/rejected, invitation ID, moderator và ghi chú riêng không nằm trong DTO feed.
- “Xem thêm” tải trang tiếp12 mục, có dedupe ID; “Làm mới lời chúc” lấy lại trang đầu. Không có realtime/polling: trang đã mở có thể còn nội dung cũ tới khi refresh. Ghim/duyệt đổi giữa các request có thể đổi vị trí; cursor không phải snapshot xuyên nhiều request.

API relative dưới `/api/v1`:

- Public feed: `GET /public/weddings/{slug}/wishes?cursor=…`.
- Guest feed: `GET /guest/invitations/{id}/approved-wishes?cursor=…`.
- Mine giữ riêng: `GET /guest/invitations/{id}/wishes`.
- Client cũ đọc trường `wishes` từ payload thiệp cần cập nhật: source mới đã bỏ payload giới hạn cũ.

## 4. Cấu hình quà mừng — chỉ OWNER

1. Mở `/admin/gifts`. EDITOR không có quyền API kể cả truy cập URL trực tiếp.
2. Chọn một mã chung hoặc hai người nhận, nhập nhãn/mô tả do chủ thiệp cung cấp. Không suy giới tính từ vị trí thứ nhất/thứ hai.
3. Upload PNG tối đa5 MiB, mỗi chiều220–4096 pixel, không quá16.777.216 pixel. Server kiểm MIME/signature/decode; ảnh lưu nguyên bytes, không đổi thành JPEG, không tô màu/cắt mã hay thêm logo. Tệp nhìn giống QR không chứng minh người nhận đúng.
4. Chọn PRIVATE (khách có lời mời hợp lệ) hoặc PUBLIC (người xem thiệp chung cũng có thể xem/tải). Bản nháp được phép thiếu, bản phát hành đang bật phải đủ nhãn và ảnh cho các vị trí đang dùng.
5. Lưu nháp; bản live chưa thay đổi. Chuyển hai mã về một vẫn giữ người nhận thứ hai nhưng không gửi tới khách. “Gỡ ảnh” chỉ bỏ tham chiếu khỏi nháp, không xóa asset hoặc bản đã phát hành.
6. Chủ thiệp **tự quét từng mã** bằng ứng dụng tin cậy, kiểm đúng người nhận và phạm vi hiển thị. Chỉ sau đó đánh dấu xác nhận và phát hành cấu hình quà mừng. Sửa/lưu/tải lại sẽ reset xác nhận.
7. Tắt quà: bỏ bật → lưu nháp → phát hành cấu hình tắt. Không cần xác nhận QR để tắt. Phát hành quà độc lập với nút phát hành thiết kế thiệp.

Nếu409 conflict: draft đang sửa được giữ, save/publish khóa; dùng tải lại có xác nhận để lấy bản server. Chỉ tải lại khi chấp nhận thay các sửa chưa lưu. Có beforeunload cho reload/đóng tab nhưng **chưa chặn điều hướng nội bộ SPA**: nên lưu trước khi đổi trang.

Khách mở hộp quà mới tải QR; dialog kiểm lại cấu hình mỗi lần mở. Hai người nhận có nhóm nút và một ảnh mỗi lần. Có Escape/đóng/backdrop, reduced motion, tải PNG hoặc mở ảnh gốc khi tải không được. Không lazy-load ảnh đang cần xem. Mở/tải không phải chuyển tiền, không ghi số tiền nhận được. Không có trường số tài khoản riêng nên chưa có copy tài khoản; mô tả không bị parse thành dữ liệu nhận tiền.

Quyền ảnh do server kiểm mỗi request: admin owner endpoint; public phải được phát hành PUBLIC và asset được chọn; guest cần grant/open/PIN/access window cùng asset hợp lệ. Không dùng URL `/media` để chia sẻ QR riêng. `no-store` không thể thu hồi file đã tải hoặc ảnh đã gửi cho người khác.

## 5. Backup và storage

- `gift_assets.png` là PostgreSQL `bytea`, không phải file trong thư viện media. Backup DB cần bao gồm `gift_assets`, `gift_settings`, wishes, Flyway history và các dữ liệu liên quan; backup thư mục media **không đủ** cho gift QR.
- Các PNG immutable có thể làm DB tăng kích thước. Chưa có xóa/garbage collection asset orphan. Không tự DELETE bằng SQL; lập chính sách riêng có backup và kiểm tham chiếu DRAFT/PUBLISHED trước nếu cần.
- Quyền thao tác quà OWNER-only khác với moderation wishes OWNER/EDITOR. Không giải quyết403 bằng cách nới role hoặc biến URL QR thành public media.

## 6. Chạy lại QA an toàn

Tại thư mục `frontend`: `npm test`, `npm run build`, `npm run typecheck`. Tại `backend`: `mvn -B -o verify` (không khởi động backend/migrate; integration opt-in mặc định skip). Không tự cài/nâng dependency khi thiếu cache.

Frontend local3000 đang chạy: xem [scripts/README.md](../scripts/README.md) cho các script `invitation-review-qa`, `editor-review-qa`, `media-review-qa`, `gift-review-qa`, `gift-dialog-review-qa`, `feature-integration-qa`. Mặc định các script này dùng API fixture/PNG synthetic, không QR thật. Chrome cần có sẵn; không chạy nhiều script cùng dùng port/profile tương ứng.

Chỉ khi cần kiểm SQL/permission/persistence mới, dùng `./scripts/features-persistence-qa.ps1` ở repository root. Script dùng PG17 cached image, database fresh tmpfs/random localhost port, từ chối schema không trống, tự dọn container. Không sửa biến trỏ database thật, không chạy các script smoke/verify có mutation trên stack wedding chỉ để “kiểm tra nhanh”.

## 7. Bằng chứng và phần còn lại

Checkpoint F12: FE159/159, build/types PASS; BE136 pass+1 skip trong verify và integration riêng1/1 PASS (HTTP/session/CSRF/SQL/restart disposable). Sáu browser scripts PASS; dialog contrast9 tổ hợp8 mẫu/tổ hợp worst6,19:1 và XSS escaped. Đây là kiểm thử lấy mẫu, không chứng nhận WCAG hay production-ready.

**NOT VERIFIED:** một lượt browser→backend→DB hoàn chỉnh; benchmark hiệu năng cùng baseline/CLS/LCP/bundle delta; Safari/Zalo/screen reader/touch thật; quét QR/quiet zone/người nhận; marker địa điểm cưới thật. Trước sử dụng thật cần người phụ trách kiểm các mục phù hợp, backup/restore và phê duyệt triển khai. Không tự đưa dữ liệu minh họa hoặc ảnh synthetic vào bản phát hành.