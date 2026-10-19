# 16 — Vai trò trợ lý nội dung (T25): threat model và ma trận quyền

## 1. Mục tiêu
Cho phép một người thứ hai giúp việc (dâu/rể, người thân) mà **không** mở thêm bất kỳ đường tắt nào vào bí mật hay quyền truy cập. Tài liệu này là điều kiện tiên quyết đã hứa trong `docs/15` trước khi code: ma trận quyền và threat model phải được viết trước, và mọi hành vi dưới đây đều có kiểm thử tự động.

## 2. Vai trò
- **OWNER (chủ tiệc):** toàn quyền. Luôn tồn tại ít nhất một OWNER đang hoạt động.
- **EDITOR (trợ lý nội dung):** làm nội dung, khách, RSVP, lời chúc, nhắc nhở, thư viện ảnh/nhạc. **Không** nắm bí mật (link, mã PIN), không xem báo cáo/nhật ký, không đổi quyền truy cập, không tạo/xóa người dùng.
- Không có đăng ký tự phục vụ, không có vai trò ẩn: vai trò nằm trong `admin_users.role` và được nhúng vào authorities khi đăng nhập.

## 3. Ma trận quyền (được thực thi bởi `AdminPermissions` + `EditorAccessFilter`)
| Khu vực | OWNER | EDITOR | Ghi chú |
|---|---|---|---|
| Tổng quan, khách & lời mời (đọc/sửa/ghi chú/gán buổi/lưu trữ/`sent`) | ✔ | ✔ | Editor thêm được khách nhưng **không** lấy được link |
| Sổ lời chúc (duyệt/từ chối/sửa/xóa) | ✔ | ✔ | Nội dung do khách tạo, có duyệt thủ công |
| Nhắc RSVP chưa phản hồi | ✔ | ✔ | Chỉ ghi nhận thủ công, không tự gửi |
| Phản hồi RSVP (xem/sửa) | ✔ | ✔ | |
| Buổi tiệc (tạo, sửa nháp, revise) | ✔ | ✔ | Phát hành/hủy buổi tiệc: OWNER |
| Thiết kế: lưu bản nháp, thư viện ảnh/nhạc | ✔ | ✔ | **Phát hành/ngừng phát hành: OWNER** |
| Cài đặt ghi nhận lượt mở (`tracking`) | ✔ | ✘ | Đây là quyết định privacy |
| Chính sách truy cập (chung và theo lời mời) | ✔ | ✘ | |
| Thao tác truy cập hàng loạt (bulk policy) | ✔ | ✘ | |
| Mã PIN (xem trạng thái/bật/tắt/đổi) | ✔ | ✘ | |
| Link riêng (`link-reveal`), thu hồi (`revoke`), tạo link mới (`rotate`) | ✔ | ✘ | Bí mật và hành động phá huỷ |
| Nhập danh sách: xem trước | ✔ | ✔ | **Ghi dữ liệu (`imports/commit`): OWNER** |
| Xuất QR, tạo/tải/thu hồi báo cáo, CSV khách & RSVP | ✔ | ✘ | Chứa PII khách |
| Nhật ký (`audit`) | ✔ | ✘ | |
| Quản trị người dùng (`/admin/users`) | ✔ | ✘ | Kể cả tự nâng quyền của chính mình |
| Đổi mật khẩu của chính mình (`/auth/password`) | ✔ | ✔ | Nằm ngoài `/admin/users` có chủ đích |

## 4. Threat model
| Mối đe dọa | Biện pháp | Kiểm thử |
|---|---|---|
| Trợ lý tự nâng quyền hoặc sửa tài khoản khác | `/admin/users` bị chặn ở tầng filter; đổi vai trò chỉ OWNER | `verify-editor.ps1`: PUT role/self → 403 |
| Trợ lý lấy link/QR để gửi sai người | `link-reveal`, `rotate`, `revoke` OWNER-only | 403 ở cả ba đường |
| Trợ lý tắt mã PIN để mở thiệp dễ hơn | toàn bộ khu vực `pin**` OWNER-only | 403 với `GET .../pin` |
| Trợ lý đọc dữ liệu khách qua báo cáo | exports/reports OWNER-only | 403 khi tạo và khi tải |
| Trợ lý mở lại thiệp đã đóng cho cả nhóm | access-policy + bulk-policy OWNER-only | 403 |
| Leo thang qua đường khác (method khác, path khác) | Ma trận là **allow-list theo path** cho EDITOR, vai trò lạ ⇒ từ chối; request chưa đăng nhập vẫn 401 | `AdminPermissionsTest` (đường cho phép/cấm, vai trò lạ, path ngoài admin) |
| Người đã bị khóa vẫn dùng phiên cũ | Khóa/đặt lại mật khẩu/xóa ⇒ xóa phiên trong `spring_session` ngay | `verify-editor.ps1`: phiên cũ → 401, đăng nhập lại → 401 |
| Tự khóa/tự xóa dẫn tới mất quyền quản trị | Chặn khóa/xóa chính mình; luôn giữ ≥1 OWNER đang hoạt động (kiểm tra trong transaction, có khóa dòng) | 422 cho cả ba thao tác |
| Mật khẩu yếu hoặc lộ | ≥12 ký tự, ≤72 byte UTF-8, BCrypt cost 12, chỉ lưu băm, không bao giờ trả về/log | 400 khi ngắn; `verify-editor.ps1` khẳng định API không trả `password_hash` |
| Đổi mật khẩu bằng phiên bị chiếm | Bắt buộc nhập đúng mật khẩu hiện tại; mật khẩu mới phải khác | 422 khi sai mật khẩu hiện tại |
| Truy vết trách nhiệm | `audit.actor` ghi tài khoản đã thực hiện hành động | Audit có `USER_*`, `USER_SESSIONS_CLEARED` |
| Sửa đồng thời của hai người | Optimistic version (đã có từ trước) áp dụng nguyên cho cả hai vai trò | 409 khi phiên bản cũ |

## 5. Quy tắc vận hành
1. Chủ tiệc tạo tài khoản trợ lý và gửi mật khẩu qua kênh riêng; trợ lý đổi mật khẩu ở “Tài khoản của tôi”.
2. Giao thiệp cho trợ lý: dùng đúng vai trò EDITOR — người gửi link/QR vẫn là chủ tiệc.
3. Khi trợ lý xong việc: **khóa tài khoản** (hủy phiên ngay), không cần xóa.
4. Nếu nghi ngờ lộ mật khẩu: **đặt lại mật khẩu** (hủy phiên) hoặc chuyển vai trò về trợ lý.

## 6. Giới hạn đã biết (giữ đúng phạm vi)
- **Không có MFA/OTP:** OTP vẫn thuộc P2 (`docs/15`) vì cần provider/chi phí/đồng thuận.
- Trợ lý **thấy** tên khách, phản hồi, lời chúc và bộ đếm lượt mở (cần cho công việc) nhưng không thấy link/QR của khách và không tải được báo cáo.
- Đổi mật khẩu tự phục vụ **không** hủy phiên đang mở của chính người đó (họ vừa chứng minh mật khẩu hiện tại); đường hủy phiên là “đặt lại mật khẩu” do chủ tiệc thực hiện.
- Không có phân quyền theo từng buổi tiệc hay theo nhóm khách: chỉ hai vai trò toàn cục, đủ cho một hộ gia đình.

## 7. Bằng chứng
- `AdminPermissionsTest` (4 ca) — backend **33/33**.
- `deploy/verify-editor.ps1` — **33 khẳng định pass** trên stack thật: tạo tài khoản, editor làm được việc nội dung/khách, bị chặn 15 đường OWNER-only, tự nâng quyền bị chặn, đổi mật khẩu tự phục vụ, chốt chặn chủ tiệc cuối cùng, khóa tài khoản hủy phiên ngay.
- Migration `V16__editor_role.sql`: `admin_users` bỏ ràng buộc một dòng, thêm `role`/`display_name`/`created_by`, `audit.actor`.
- Hồi quy: `smoke.ps1`, `verify-dot3.ps1` (35), `verify-dot4-pin.ps1` (27), `verify-dot4b.ps1` (48), `verify-wishes.ps1` đều pass sau khi thêm T25.