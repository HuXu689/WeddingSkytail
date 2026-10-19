# 15 — Bản ghi quyết định P2 (ngoài phạm vi phát hành)

## 1. Mục đích
`docs/01` §“P2 / ngoài phạm vi” nói rõ: **không thêm các chức năng P2 chỉ vì “có thể làm”**. Tài liệu này là bản ghi quyết định cho từng hạng mục P2 để:
- không phải tranh luận lại mỗi lần có yêu cầu mới;
- chỉ rõ điều kiện tiên quyết (privacy, chi phí, nhà cung cấp, threat model) trước khi mở lại;
- liệt kê những điểm móc nối kỹ thuật **đã có sẵn** để hôm nay không phải xây trước.

Bản ghi này thuộc phạm vi phát hành v1.1: các hạng mục trong bảng **không** có QA tương ứng và **không** nằm trong Definition of Done.

## 2. Bảng quyết định

| Hạng mục P2 | Nguồn | Quyết định | Lý do | Điều kiện tiên quyết nếu mở lại | Guardrail đã có sẵn |
|---|---|---|---|---|---|
| SaaS nhiều đám cưới | docs/01 | Không làm | Toàn bộ schema giả định một đám cưới (`wedding` id=1, `admin_users` một chủ tiệc, policy/gate đơn) | Thiết kế lại tenant isolation + phân quyền + migration dữ liệu | Gate/policy và audit đã tách theo invitation |
| Bán theme / thanh toán | docs/01 | Không làm | Cần pháp lý, hoá đơn, đối soát; không liên quan mục tiêu thiệp | Nhà cung cấp thanh toán + pháp lý | Theme/accent đã là enum allowlist |
| Check-in / phân bàn | docs/01, docs/14 | Không làm | Cần định danh người và tranh chấp tại cửa; không cần để phát thiệp online | Mô hình allocation + race + thiết bị quét riêng | Token/gate + `open_events` đã có, nhưng **không** dùng làm định danh |
| Chấm khách “đã đọc” | docs/01, docs/13 | Không làm | Lượt mở không xác minh người; mọi nhãn kiểu “đã đọc” sẽ là claim sai | Định danh mạnh (OTP) + privacy review | UI đã ghi rõ “chưa ghi nhận mở ≠ chưa mở” |
| Gửi SMS/Zalo tự động | docs/01 | Không làm | Cần provider, chi phí, đồng thuận và rate limit riêng | Provider + consent + cost review | Worklist nhắc RSVP soạn sẵn nội dung để Owner tự gửi |
| Đồng bộ danh bạ | docs/01 | Không làm | Rủi ro privacy cao, không cần cho luồng mời | Consent rõ ràng + đánh giá pháp lý | CSV import đã là đường vào có kiểm soát |
| Guest tự tìm lại thiệp | docs/14 | Không làm | Self-service cần xác minh danh tính; tìm công khai theo tên/SĐT là rủi ro | Xác minh out-of-band + không public search | Owner có thể gửi lại link/QR bất cứ lúc nào (link bền) |
| OTP xác minh người nhận | docs/08, docs/13 | Không làm | Cần provider/consent/chi phí; PIN 6 số đã đủ cho mục tiêu “chống ảnh chụp QR” | Provider + threat model + luồng khôi phục | PIN per-invitation (hash BCrypt, throttle, reset hủy phiên) |
| Phân loại thiết bị thô | docs/13 | Không làm | Đo thêm dữ liệu nhận dạng mà chưa có nhu cầu | Privacy review + nhu cầu cụ thể | Pseudonym theo session, không lưu IP/UA/fingerprint |
| Scroll depth / read time / GPS | docs/13 | Không làm | Không phục vụ mục tiêu lời mời, rủi ro privacy cao | Privacy review | Tracking hiện chỉ ghi “có mở”, có công tắc tắt |
| QR ZIP / XLSX import | docs/10 §7 | Không làm | Không cần cho luồng phát thiệp; CSV + PDF đã đủ | Yêu cầu vận hành cụ thể | CSV import + PDF 15 nhãn/trang đã hoạt động |
| Quản trị editor đa người | docs/14 | **Đã làm một phần: vai trò trợ lý nội dung (T25 — `V16`, `docs/16`)**; vẫn không có nhiều người quản trị độc lập hay phân quyền theo buổi | Cần multi-tenant/quyền theo buổi tiệc | Threat model + ma trận quyền **đã có và đã kiểm thử** (`AdminPermissionsTest`, `verify-editor.ps1`) |

## 3. Nguyên tắc khi mở lại một hạng mục P2
1. Có **yêu cầu thực tế** kèm người chịu trách nhiệm, không mở chỉ vì “tiện tay”.
2. Trả lời được: dữ liệu mới là gì, lưu bao lâu, ai đọc được, tắt được không, xoá được không.
3. Mọi bề mặt mới phải đi qua **cùng một access gate** (grant + dấu đã mở + cửa sổ mở/đóng + PIN), không mở đường tắt.
4. Cập nhật `docs/02`, `docs/08`, `docs/11` (QA mới) và `docs/12` trước khi code.
5. Có migration riêng, rollback, và test âm (không chỉ happy path).

## 4. Điểm móc nối sẵn có (để không phải xây trước)
- `AccessGate` + policy global/invitation: dùng lại cho bất kỳ endpoint private nào.
- Grant theo `auth_revision`, dấu mở theo `version`, PIN theo `security_revision`: ba tầng hủy phiên độc lập.
- `open_events` ghi theo pseudonym/bucket: không chứa IP/UA, dễ bỏ hoặc giữ.
- Export job có TTL/revoke; CSV chống formula injection; media chỉ phục vụ bản đã phát hành.
- Sổ lời chúc (T24) là mẫu tham chiếu cho “nội dung do khách tạo + duyệt thủ công”.
- Audit theo hành động (`WISH_*`, `REMINDER_*`, `PIN_*`, `ACCESS_*`) đã sẵn để mở rộng.

## 5. Trạng thái
- 12/12 hạng mục P2 ở trên: **đóng có ghi lý do** (bản ghi này), riêng “quản trị editor” đã mở lại một phần đúng theo 5 nguyên tắc ở §3: threat model + ma trận quyền viết trước (`docs/16`), vai trò giới hạn, có migration riêng và test âm — phần đa người quản trị độc lập vẫn ngoài phạm vi.
- Không có QA cho P2 vì không nằm trong phạm vi phát hành; khi mở lại phải thêm QA tương ứng vào `docs/11`.
- Hạng mục P1 cuối cùng trong phạm vi (T24 — sổ lời chúc có duyệt) đã hoàn tất và có kiểm thử tự động.