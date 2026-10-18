# 01 — Đặc tả sản phẩm và nghiệp vụ

## 1. Bài toán
Khách nhận thiệp giấy hoặc link online, cần biết đúng buổi tiệc được mời và phản hồi nhanh trên điện thoại. Chủ tiệc có hai nhóm khách và hai địa điểm/thời điểm khác nhau, cần tránh nhầm thiệp, biết tổng người từng buổi, và in hàng loạt QR để cắt dán.

**Đích đến:** một trang thiệp đẹp nhưng ưu tiên tính rõ ràng, tốc độ, dễ sử dụng và vận hành an toàn hơn số lượng hiệu ứng.

## 2. Vai trò
| Vai trò | Quyền |
|---|---|
| Owner | Quản trị website, sự kiện, lời mời, media, phản hồi, in/xuất dữ liệu |
| Guest có link | Xem lời mời của mình, xem buổi được gán, RSVP và cập nhật trong hạn |
| Visitor link chung | Xem nội dung được công khai; không duyệt danh sách khách, không chọn tên người khác |
| Editor hỗ trợ | P1, quyền giới hạn nếu cần; không bật trong MVP |

MVP chỉ Owner và Guest/Visitor. Tài khoản Owner bootstrap riêng, không đăng ký công khai. Không cần tài khoản cho khách. Phân quyền backend là bắt buộc, không dựa việc ẩn nút React.

## 3. Phạm vi
### P0 — cần để dùng thật
- Một wedding, N event, giao diện tối ưu cho hai buổi ban đầu.
- Nội dung chung: tên hai bạn, ảnh bìa, lời mời, album, câu chuyện ngắn, thông tin liên hệ tùy chọn.
- Thông tin event: tên, địa chỉ, bản đồ, giờ đón khách/khai tiệc, timezone, deadline, trạng thái.
- Guest party (đơn vị được mời): cá nhân/cặp đôi/gia đình; nhãn nhóm; tên hiển thị lịch sự.
- Invitation và quyền event riêng; giới hạn số người từng event.
- Nhập danh sách có bước preview/validation trước commit; thêm/sửa thủ công.
- Link/QR riêng, copy link, tải PNG QR, PDF A4 nhiều nhãn, export danh sách có quyền.
- RSVP riêng từng event, có/không, tổng người, ghi chú tùy chọn; được sửa trong hạn.
- Dashboard: chưa phản hồi/đồng ý/từ chối, số người đã xác nhận, sức chứa từng event.
- Preview trước publish, publish/unpublish, thông báo thay đổi/cancel cho lần mở sau.
- Admin session, bảo vệ dữ liệu, audit hành động quan trọng, backup/restore.

### P1 — sau khi luồng lõi ổn định
Nhạc nền chủ động bật; countdown; file lịch ICS; QR song ngữ; lời chúc có duyệt; quản trị editor; hỗ trợ nhiều kích thước nhãn; sửa hàng loạt; lưu cấu hình mẫu in; OTP nếu thực sự cần xác minh người nhận.

### P2 / ngoài phạm vi
SaaS nhiều đám cưới, bán theme, thanh toán, check-in, phân bàn, chấm khách “đã đọc”, gửi SMS/Zalo tự động, đồng bộ danh bạ. Không thêm các chức năng này chỉ vì “có thể làm”.

## 4. Yêu cầu có mã
| ID | Yêu cầu | Tiêu chí chính |
|---|---|---|
| FR01 | Quản lý nhiều event | Một lời mời được gán một hoặc nhiều event độc lập |
| FR02 | Cá nhân hóa | Đúng tên hiển thị, xưng hô và nội dung event |
| FR03 | Link bền vững | Sửa thời gian/địa điểm không đổi link đã in |
| FR04 | RSVP | Mỗi invitation-event có một trạng thái mới nhất, xử lý gửi lại |
| FR05 | Giới hạn người | ATTENDING có tổng người từ 1 tới maxPeople; DECLINED bằng 0 |
| FR06 | Import có kiểm soát | Preview lỗi theo dòng, chưa ghi DB trước xác nhận |
| FR07 | QR hàng loạt | Chọn nhóm/khách, không ghép nhầm tên và QR |
| FR08 | PDF in | A4, kích thước thật, lề, đường cắt, số trang đúng |
| FR09 | Xuất dữ liệu | Theo buổi, chống CSV formula injection, file có xác thực |
| FR10 | Draft/publish | Chưa publish không lộ nội dung riêng qua guest endpoint |
| FR11 | Thu hồi link | Owner có cảnh báo ảnh hưởng thiệp giấy; ghi audit |
| FR12 | Privacy | Không truy cập lời mời khác bằng cách đổi invitationId/eventId |
| FR13 | Chia sẻ | OG chung, không tên khách; test Zalo/Messenger thật |
| FR14 | Vận hành | Restore DB + media + khóa mã hóa thành công trên môi trường mới |

## 5. Quy tắc nghiệp vụ
### 5.1 Đơn vị lời mời và nhóm
- GuestParty là đối tượng được mời: “Anh Minh & gia đình”. Không bắt nhập từng thành viên.
- Group/tag là nhãn tổ chức như “Đơn vị”, “Bạn đại học”. Không tự cấp quyền xem event.
- Một party chỉ có một invitation đang quản lý trong MVP; sửa tên không tạo link mới.
- Một invitation có N invitation-event. Người được mời cả hai nhận một link và hai thẻ event.
- Không có guest tự chọn tên từ dropdown công khai. Link chung không được RSVP vào lời mời thật.

### 5.2 RSVP
- Mặc định chưa phản hồi; không dùng số người 0 để suy ra từ chối.
- ATTENDING: `totalPeople` là tổng người gồm người được mời, không phải riêng người đi cùng.
- DECLINED: totalPeople=0; server chuẩn hóa/xác nhận input, không để số cũ còn được tính.
- Ghi chú ≤500 ký tự, dữ liệu plain text. Không hỏi điện thoại bắt buộc.
- Có thể gửi từng buổi riêng. UI giữ phản hồi event khác khi sửa một event.
- Quá deadline/event bắt đầu: view vẫn được; RSVP đóng. Owner có thể điều chỉnh thủ công, phải ghi lý do và audit.
- Event CANCELLED không nhận RSVP và không tính nhu cầu phục vụ trong dashboard active.
- Event capacity chỉ cảnh báo, không tự biến thiệp cưới thành hệ thống đặt chỗ first-come. Owner quyết định.
- Chưa phản hồi không đồng nghĩa không đi; tổng xác nhận không phải tổng được mời.

### 5.3 Publish, chỉnh sửa, thu hồi
Wedding DRAFT/PUBLISHED/ARCHIVED. Event DRAFT/PUBLISHED/CANCELLED/ARCHIVED. Guest chỉ thấy published/cancelled đã được cấp, thông tin draft không lộ. Khi wedding archived, hiển thị màn kết thúc tối giản; dữ liệu giữ trong admin theo chính sách.

Sửa event sau khi gửi: tăng revision, lưu change notice do Owner viết; không giả định khách nhận được push. Nếu đổi trọng yếu, Owner liên hệ lại ngoài hệ thống. Bỏ gán event đã có RSVP phải có màn xác nhận tác động; lưu lịch sử, không tính trong tập lời mời đang hoạt động.

### 5.4 Import
- Format nhập MVP: UTF-8 CSV hoặc XLSX (chọn triển khai một format trước, CSV đủ MVP).
- Cột: externalRef tùy chọn, displayName bắt buộc, salutation tùy chọn, group, eventCodes, maxPeople theo event, phone tùy chọn.
- Trùng externalRef: reject hoặc update theo chế độ được xác nhận; không silently upsert theo tên.
- Trùng tên có thể hợp lệ; cảnh báo chứ không tự merge. Số điện thoại không phải khóa duy nhất.
- Không xuất/hiển thị token QR trong preview công khai. Dữ liệu import chỉ admin.

## 6. Mục tiêu chất lượng — phải đo, không phải đã đạt
- Mobile 360px trở lên; nút tối thiểu khoảng 44px, font nội dung từ 16px, tương phản WCAG AA.
- Phần thông tin chính dùng được không nhạc/không animation; tôn trọng reduced-motion.
- Mục tiêu LCP ≤2.5 giây ở cấu hình test mobile thống nhất; ảnh hero nén, lazy load album.
- API view/RSVP p95 <500ms tại tải thử định nghĩa trong test plan, không gồm mạng ngoài.
- Upload mặc định ≤10MB/ảnh; trang đầu budget khoảng ≤1.5MB, thử trên mạng chậm.
- Dữ liệu lưu UTC (timestamptz), hiển thị theo Asia/Ho_Chi_Minh; không dựa timezone máy khách.
- Không mất phản hồi đã commit khi refresh; UI không báo thành công trước commit server.

## 7. Definition of MVP
Hai event dùng được; nhập ít nhất 300 lời mời giả; QR và PDF quét được; một khách có hai event không ghi nhầm; RSVP concurrent không nhân đôi; admin không lộ dữ liệu; restore có bằng chứng; Owner duyệt nội dung và in thử trước phát thiệp.

## 8. Yêu cầu bổ sung v1.1
| ID | P | Yêu cầu | Acceptance |
|---|---|---|---|
| FR15 | P0 | Đóng/mở link | Global và per invitation; CLOSED chặn guest APIs/session cũ, reopen giữ QR |
| FR16 | P0 | Mở/đóng theo lịch | start inclusive/end exclusive, server clock+timezone; manual override explicit |
| FR17 | P0 | Ghi nhận mở thiệp | Explicit open event, không GET/OG/redeem; trạng thái có caveat không xác minh người |
| FR18 | P0 | Link center/bulk policy | Preview IDs/số ảnh hưởng, version, atomic bounded apply, audit |
| FR19 | P1 | PIN ngoài link | Adaptive hash, no plaintext/reveal, rate limit, out-of-band, reset invalidates verified grants |
| FR20 | P0 | Bảo vệ hiện hữu nhất quán | Token entropy+CSRF+IDOR+revocation+redaction; gate check mọi guest request |
| FR21 | P1 | Nhắc khách chưa phản hồi | Danh sách/soạn nội dung/copy thủ công; không tự gửi/không coi chưa mở là chưa nhận |

P0 phiên bản mới mở rộng MVP v1.0 bằng FR15–18/20. PIN và nhắc khách chưa phản hồi là P1, không tự biến thành yêu cầu bắt buộc. Chi tiết policy/tracking ở docs13 có ưu tiên khi luồng mở tự động trong v1.0 khác với luồng bấm mở ở v1.1.

### Phân biệt trạng thái
“Đã đánh dấu gửi” là Owner ghi; “đã ghi nhận mở” là sự kiện hệ thống; “đã phản hồi” là RSVP. Ba trạng thái độc lập, không tự suy ra nhau. Lời mời cả hai buổi có một trạng thái mở chung nhưng hai trạng thái RSVP. Filter “đã mở nhưng chưa phản hồi” phải có ngữ cảnh event.
