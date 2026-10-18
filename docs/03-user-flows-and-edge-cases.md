# 03 — Luồng sử dụng và tình huống biên

## A. Owner chuẩn bị website
1. Bootstrap account bằng lệnh quản trị trên host, thay mật khẩu; không seed mật khẩu mặc định production.
2. Điền wedding, upload ảnh và tạo E1/E2 với timezone, địa chỉ, deadline.
3. Xem preview mobile/desktop; chưa publish không guest nào xem nội dung riêng.
4. Tạo/import guest parties; gán từng invitation-event/maxPeople.
5. Publish wedding và events đã sẵn sàng. Checklist nội dung, privacy, HTTPS, backup, QR test.
6. Xuất sheet test, quét và xác minh tên/event trước khi in hàng loạt.

## B. Nhập khách
Upload → parse bounded → normalize → preview validation → Owner sửa hoặc xác nhận warnings → commit atomic → tạo invitation/token → ghi job result. Cấp token sau khi dữ liệu hợp lệ trong cùng transaction hoặc service đảm bảo rollback đầy đủ. Retry commit cùng idempotency key trả cùng kết quả.

Không tự merge “Nguyễn Văn An”; có thể là hai người. EventCode của file được map rõ, group không thay quyền event.

## C. Gửi online
Chọn guest → copy link hoặc PNG QR → Owner gửi bằng Zalo/Messenger → tự mark sent. Ứng dụng không tuyên bố gửi thành công/đọc thành công nếu không có tích hợp gửi thực.

Preview mạng xã hội chỉ ảnh/lời mời chung. Crawler truy cập không tạo RSVP hoặc dữ liệu “khách đã xem”. Ai nhận ảnh QR/link forward có quyền như người giữ link; nếu cần xác minh danh tính, bật cơ chế khác sau.

## D. In/cắt/dán
Filter guest → freeze danh sách invitation IDs → layout preview → generate job → download authenticated → in Actual size 100% → quét mẫu mỗi trang và vài mã ngẫu nhiên → cắt → đối chiếu tên → dán → tự mark printed/sent.

Job snapshot cố định thứ tự/tên/revision nhưng trạng thái thu hồi phải kiểm tra lại trước khi hoàn tất file. Nếu link bị rotate sau khi file đã tạo, file cũ không còn an toàn để dùng; cảnh báo/invalidate artifacts liên quan, không chỉ đổi nút download.

## E. Khách một buổi
Scan `/i/token` → shell generic → redeem POST với CSRF+access gate → PIN nếu bật → grant tối thiểu → URL sạch → khách bấm “Mở thiệp” → POST open-intent → event card → RSVP event A → server transaction → confirmation. Total tính cả người nhận, không nhầm total+plusOnes.

## F. Khách hai buổi
Một invitation, hai grants event. Mỗi card một RSVP. Chọn đi E1=2 người, từ chối E2=0 → dashboard E1 cộng 2, E2 declined count cộng 1, không cộng người.

## G. Sửa RSVP/đồng thời
Khách mở hai tab, revision=3. Tab A PUT version 3 → success version 4. Tab B version 3 → 409 và response mới, UI yêu cầu review trước retry. UNIQUE invitation-event ngăn hai dòng RSVP; request idempotency key ngăn retry tạo audit sai. History append chỉ khi trạng thái có thay đổi thực.

## H. Mất mạng khi lưu
Không biết request đã commit chưa → retry cùng idempotency key hoặc GET trạng thái hiện tại; không blindly tăng counter. Form giữ draft, không dùng localStorage lưu token/PII; có thể lưu state trong memory cho tới reload. Không báo thành công chỉ vì click.

## I. Sửa địa điểm sau in
Owner cập nhật published event/revision/change notice; token không thay đổi. Khách quét lại thấy địa chỉ mới. Cache personalized no-store, public caches invalidated. Website không tự thông báo ngoài hệ thống; Owner gửi nhắc riêng.

## J. Thu hồi/rotate
Owner xác nhận đã biết thiệp giấy sẽ hỏng; revoke credential và tăng auth revision. Các grants session cũ phải kiểm tra credential/auth revision mỗi API → hết quyền ngay. Rotation tạo token mới, QR mới; job/file cũ flagged invalid. Không vô tình rotate khi sửa tên khách/địa điểm.

## K. Tình huống và quyết định
| Tình huống | Hành vi |
|---|---|
| Người giữ link chuyển tiếp | Người nhận mới có thể xem/sửa cùng invitation; warning rõ |
| Tên người nhận sai | Owner sửa guest; URL giữ nguyên; regenerate PDF để tên nhãn đúng |
| Khách muốn thêm quá maxPeople | Không tự tăng, hiện lời nhắc liên hệ Owner |
| Người không có lời mời mở link chung | Chỉ nội dung public; không tự tạo invitation |
| Event không được cấp | DTO không chứa event; endpoint RSVP 404/403 thống nhất không lộ thông tin |
| Event cancelled | Hiện notice; RSVP đóng; giữ history, dashboard không phục vụ tính active |
| Quá deadline | Read-only phản hồi, Owner có thể sửa kèm reason |
| Session hết hạn | Mở lại link/QR gốc; không đăng nhập guest |
| Hai invitation cùng browser | Grants keyed invitationId; request luôn ghi event dưới invitation cụ thể |
| Admin xóa event có dữ liệu | Chặn hard delete; cancel/archive |
| Một guest có nhiều nhóm | Tags độc lập; filter không nhân đôi print rows |
| Mobile in-app browser chặn cookie | Báo mở bằng browser ngoài/copy link; test thực tế |
| QR in nhỏ/mờ | Không nghiệm thu; thay size/contrast hoặc in lại |
| PDF chứa link revoked | Đánh dấu job invalid, không phát tiếp; tải cũ vẫn tồn tại ngoài hệ thống |
| Khóa mã hóa token mất | Hash còn cho redeem nhưng không tái xuất link; phục hồi khóa từ backup |
| Domain đổi | Phải giữ domain cũ/redirect an toàn lâu dài; không chữa được bằng đổi PDF đã phát |
| File import formula | Parse như text, export escape; không thực thi macro/formula |
| 0 confirmed trên dashboard | Phải phân biệt chưa có phản hồi với API load failure |

## L. State machines
- Invitation credential: ACTIVE → REVOKED; rotation = revoke old + create new. Không reuse old token.
- Invitation-event: ACTIVE → REMOVED (retains history); cấp lại là hành động rõ và không tự khôi phục RSVP cũ thành xác nhận hiện tại nếu chưa review.
- RSVP: UNANSWERED (không có record) → ATTENDING/DECLINED → ATTENDING/DECLINED; transition closed chỉ chặn guest write.
- Export job: QUEUED → RUNNING → SUCCEEDED/FAILED/INVALIDATED; SUCCEEDED → EXPIRED. Job download chỉ khi SUCCEEDED còn hạn; FAILED có reason không token.
- Wedding: DRAFT → PUBLISHED → ARCHIVED; unpublish explicit, warning links hiện chưa công bố.

## M. Luồng access control v1.1
- Trước phát: wedding publish xong nhưng global access MANUAL_CLOSED, test bằng admin preview → lịch global mở đúng giờ → khách redeem/open được.
- Mở từng nhóm: global mở, invitation của nhóm A manual open, nhóm B closed hoặc scheduled; bulk chọn group freeze IDs. Nhóm mới thêm không tự được mở bởi batch cũ.
- Close tức thì: Owner đóng global hoặc invitation; API backend kiểm lại kể cả session grant/open marker cũ → private DTO/RSVP/ICS protected bị chặn; dữ liệu đã tải trên máy khách không thể xóa từ xa.
- Reopen: cùng credential, link/QR giấy giữ nguyên; grants hợp lệ có thể dùng lại nhưng phải qua open gate/open marker theo revision policy.
- Scheduled: server now>=openAt và now<closeAt; không đợi cron. CloseAt null=không hết hạn tự động. Admin manual override có banner và nút restore schedule.
- Open tracking: redeem không tăng; click POST open-intent xác lập marker và phát event tối thiểu; idempotency+dedup cùng session/invitation trong10 phút. Reload không tự gửi lượt mới.
- PIN reset: tăng pin/security revision, session đã verify version cũ phải verify lại; không đổi QR.

## N. Edge cases mới
Link giữ từ trước giờ mở vẫn phải kiểm gate ở request hiện tại. Client clock lệch không mở được sớm. Background job/ICS/cache không bypass gate. Admin close lúc guest đang submit: recheck gate trong transaction, định nghĩa thứ tự commit; response đã commit trước close được giữ. Pending write chưa qua gate sau close bị từ chối.

Open records không bị xóa khi close/reopen. Nếu muốn chạy thử tracking, dùng environment dữ liệu giả hoặc Owner preview; xóa/reset thống kê production phải explicit audited, không chỉnh bằng nút “mark unread”. Mở cùng invitation trên hai máy là hai phiên, không kết luận hai người.
