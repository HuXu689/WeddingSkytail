# 02 — Sitemap và đặc tả từng trang

## 1. Sitemap
### Khách
- `/w/{slug}`: thiệp chung, không danh sách người nhận/không RSVP cá nhân.
- `/i/{token}`: entrypoint link/QR, HTML shell có OG chung, redeem link rồi chuyển URL sạch.
- `/invitation/{invitationId}`: thiệp cá nhân khi session có grant tương ứng.
- `/invitation/{invitationId}/rsvp`: form riêng có thể là section/modal trên trang chính.
- `/invitation/{invitationId}/confirmation`: xác nhận, chỉ đọc lại dữ liệu của invitation được cấp.
- Màn link không hợp lệ/thu hồi; chưa publish; đã kết thúc; lỗi mạng. Không cần mỗi màn một route.

### Quản trị
`/admin/login`, `/admin`, `/admin/wedding`, `/admin/events`, `/admin/events/new`, `/admin/events/{id}`, `/admin/guests`, `/admin/guests/new`, `/admin/guests/{id}`, `/admin/import`, `/admin/invitations`, `/admin/invitations/{id}`, `/admin/print`, `/admin/responses`, `/admin/media`, `/admin/settings`, `/admin/audit`.

Có thể dùng drawer cho edit guest và invitation; sitemap mô tả tác vụ, không bắt làm 18 layout độc lập. Preview là route admin bảo vệ hoặc overlay, không dùng link token thật để test draft.

## 2. Trang thiệp chung — `/w/{slug}`
**Mục tiêu:** xem hình ảnh/câu chuyện, landing dự phòng; không thay thế lời mời cá nhân.
**Bố cục:** hero tên hai bạn; lời mở; album; story; thông tin được Owner đánh dấu công khai; footer.
**Hành động:** xem ảnh, liên hệ Owner nếu mất thiệp. Không có dropdown tên khách hoặc danh sách mọi người.
**Trạng thái:** wedding draft → màn chưa công bố không lộ nội dung; archived → lời cảm ơn; thiếu ảnh → placeholder đẹp.
**Nghiệm thu:** visitor không suy ra khách được mời, RSVP hay địa điểm event không công khai.

## 3. Trang link entry — `/i/{token}`
**Mục tiêu:** mở nhanh đúng lời mời; không phải trang nhập token.
**Luồng UI v1.1:** shell chung → React lấy CSRF → redeem POST và kiểm access gate → PIN challenge nếu bật (P1) → grant tối thiểu/URL sạch → màn chào chung có nút “Mở thiệp” và notice thống kê → POST open-intent → lấy DTO thiệp theo grant. Không tải nội dung cá nhân trước bước mở; GET/redeem không đánh dấu đã mở.
**Bảo vệ:** initial HTML, OG, SSR shell chỉ nội dung chung; không tên, điện thoại, RSVP. Response không cache riêng. Không tạo RSVP hoặc đánh dấu “đã đọc” khi GET.
**Lỗi:** token sai/thu hồi trả lời chung “Thiệp này hiện không khả dụng. Vui lòng liên hệ người gửi”; không cho biết tên khách. Mạng lỗi có Retry; không loop liên tục.
**Nghiệm thu:** crawler không gây RSVP/metric giả; URL sạch reload được khi session còn; nhiều tab nhiều lời mời không dùng một biến “currentGuest”.

## 4. Thiệp cá nhân — `/invitation/{id}`
**Mục tiêu:** khách biết đúng lời mời và trả lời.
**Above the fold:** “Kính mời…”; tên cặp đôi; nhãn buổi; thời gian/địa điểm; nút “Xác nhận tham dự”, “Xem đường đi”. Không giấu ngày/giờ sau hiệu ứng mở phong bì.
**Một event:** hiển thị ngay thẻ thông tin chính.
**Nhiều event:** các thẻ độc lập, mỗi thẻ tên/địa điểm/thời gian/trạng thái RSVP rõ ràng. Không mặc định chọn cả hai. CTA trên hero cuộn tới danh sách.
**Các section:** lời mời → event cards/lịch trình → story 3–4 mốc → album 6–10 ảnh → RSVP → cảm ơn.
**Event card:** title, local date, timezone đã xử lý server, reception/ceremony time nếu có, address, map button, optional parking, dress code; badge cancelled/changed; RSVP deadline.
**Trạng thái:** session hết → hướng dẫn mở lại QR/link gốc, không yêu cầu guest đăng nhập; event cancelled → thông báo rõ, không nút xác nhận; quá hạn → phản hồi cũ và liên hệ.
**Tùy chọn:** giảm chuyển động, bật/tắt nhạc P1, lịch ICS P1. Map là link do admin duyệt, không iframe trackers mặc định.
**Nghiệm thu:** không thấy event chưa cấp, không thấy ghi chú admin/số điện thoại, số người phản ánh đúng invitation-event.

## 5. Form RSVP
**Mỗi event có một form:** tên buổi ở đầu, lựa chọn “Sẽ tham dự”/“Không thể tham dự”; khi đồng ý có tổng số người, từ 1..maxPeople. Hướng dẫn “Tính cả bạn và người đi cùng”. Ghi chú tùy chọn.
**Hành động:** Lưu xác nhận; sửa phản hồi. Không yêu cầu điền lại tên từ đầu; không cho đổi tên người được mời.
**Trạng thái:** pristine/loading/validation error/submitting/success/network failure/conflict/closed. Disable nút trong request nhưng backend vẫn phải chống double-submit.
**Lưu:** một form/event, tránh batch nhiều event có partial success khó hiểu. Có thể hiện progress “Đã phản hồi 1/2 buổi”.
**Conflict 409:** hiển thị phản hồi hiện tại từ server, cho khách xem và lưu lại rõ ràng; không âm thầm overwrite.
**Nghiệm thu:** DECLINED=0; server không tin giới hạn từ client; giữ dữ liệu nhập khi mạng lỗi; thông báo thành công theo server response.

## 6. Trang xác nhận
Tên buổi, trạng thái, tổng người, thời gian cập nhật; các event còn chưa phản hồi; nút sửa trong hạn, xem bản đồ, quay lại thiệp. Không đưa dữ liệu vào query string.

## 7. Admin login
Username/password, thông báo lỗi chung, rate limit; không public signup/reset account tùy tiện. MVP recovery bằng quy trình server có audit. Có thể thêm MFA P1. Session expiry chuyển về login, giữ navigation nhưng không để PII trong URL.

## 8. Dashboard — `/admin`
**Cards theo event:** số invitation đang được cấp; số chưa phản hồi/đồng ý/từ chối; tổng người xác nhận; capacity và cảnh báo; lời mời chưa gửi (Owner tự đánh dấu).
**Bảng:** phản hồi mới nhất, event sắp tới, print/export jobs gần đây.
**Hành động:** thêm khách, import, tạo bản in, xem phản hồi theo event.
**Định nghĩa:** số invitation và số người là hai đơn vị khác nhau; guest mở link không được coi là người sẽ dự; dashboard refresh/poll nhẹ, không cần WebSocket.
**Empty:** checklist tạo wedding/event/guest. Lỗi số liệu hiển thị “Không tải được”, không tự thành 0.

## 9. Wedding editor — `/admin/wedding`
Các tab: thông tin hai bạn; lời mời/biến xưng hô; story; theme; album; preview/publish.
**Fields:** names, slug chỉ chỉnh trước phát hành, hero, shared OG image, story items, footer, contact optional. Một theme kem/olive, chỉnh màu trong whitelist; không nhập HTML tùy ý.
**Hành động:** save draft, mobile/desktop preview, publish có checklist, unpublish có cảnh báo.
**Validation:** tên bắt buộc; ảnh/slug hợp lệ; không nhúng script; warning thiếu event/ảnh.
**Nghiệm thu:** save draft không đổi nội dung published nếu áp dụng draft snapshot; MVP có thể khóa preview draft riêng và publish theo revision (xem architecture).

## 10. Event list/editor
List: title, eventCode, local date/time, venue, status, invitation count, RSVP count. Sort thời gian.
Editor: title/code; timezone; ngày giờ; deadline; venue/address; maps link; parking/dress code; capacity; event-specific invitation text; change notice; publish/cancel.
**Hành động:** tạo/sửa, xem preview, cancel với lý do; không hard delete event đã có lời mời/phản hồi.
**Lỗi:** deadline sau start, timezone sai, maps URL scheme không https, sửa draft/publish revision xung đột.
**Nghiệm thu:** sửa địa chỉ không đổi QR; thay đổi lớn nhắc Owner liên hệ khách lại.

## 11. Guest list/editor
List: checkbox, displayName, tags, event assignments, RSVP summary, delivery status (self-reported). Tìm theo tên/reference, lọc tag/event, phân trang 50.
Editor: displayName/salutation, party type, optional phone/internal note, group; event checkboxes; maxPeople từng event; trạng thái active.
**Hành động:** save, mở invitation drawer, copy link, mark sent; bulk gán event có preview.
**Validation:** tên không rỗng, maxPeople 1..20 mặc định có thể cấu hình; event tồn tại/cùng wedding. Tên trùng cảnh báo, không tự merge.
**Remove assignment:** cảnh báo RSVP bị loại khỏi tổng hiện tại; lưu history.
**Privacy:** phone và admin note không xuống guest DTO. Delete guest dùng archive và retention policy.

## 12. Import wizard
1. Chọn file và format, giới hạn 5MB/2.000 dòng mặc định.
2. Map cột/preview, chọn reject-duplicate hoặc update theo externalRef.
3. Danh sách lỗi từng dòng, eventCode lạ, trùng tên, phone cần normalize.
4. Xác nhận commit; trả imported/skipped/failed; tải báo cáo lỗi.
**Atomic policy MVP:** nếu có error blocking thì không commit; warning cần xác nhận. File/batch staging có TTL.
**Concurrency:** importId, checksum, version và idempotency tránh commit hai lần; edit file phải tạo preview mới.
**Nghiệm thu:** mismatch cột không tạo guest/link rác; failed transaction không partial records.

## 13. Invitation list/detail
List: tên người nhận, buổi được cấp, active/revoked, link/QR actions, sentAt self-reported; không show raw token thành cột mặc định.
Detail: guest summary, event grants, maxPeople, response, preview, QR, copy link, download QR PNG, mark sent; revoke/rotate với confirmation.
**Cảnh báo:** rotate khiến QR cũ vô hiệu; backup/restore khóa ảnh hưởng tái xuất link.
**Nghiệm thu:** copy/re-export dùng token cũ, không cấp token mới mỗi lượt tải.

## 14. Print center — `/admin/print`
Bước 1 chọn khách bằng bộ lọc hoặc danh sách ID cụ thể. Bước 2 template: QR-only hoặc tên+QR+hướng dẫn; A4 portrait, size, gap, margins. Bước 3 preview tổng nhãn/trang, cảnh báo tên dài. Bước 4 tạo job → progress → download PDF.
**Controls:** sort tên hoặc thứ tự danh sách, start cell offset cho tờ dùng dở (P1), show cut lines, label event, font size bounded, test sheet.
**Nghiệm thu:** không cắt tên âm thầm; QR đủ quiet zone; file không truy cập nếu chưa auth; snapshot khớp tên-ID-token; nút “đã in” do Owner chọn chứ hệ thống không biết máy in thực sự in.

## 15. Response list — `/admin/responses`
Bắt buộc lọc event hoặc hiển thị cột event rõ. Bảng guest, status, totalPeople, note, updateAt, source (guest/admin). Các bộ lọc status/tag, totals của tập lọc có nhãn riêng với totals toàn event.
**Hành động:** export, sửa thủ công kèm reason, xem history. Ghi chú không công khai, không đưa vào OG.

## 16. Media library
Upload, preview, reorder, chọn hero/OG, alt text, crop variants, xóa khi không còn referenced. Show upload progress/error. Validate ảnh phía server, bỏ EXIF, reject SVG trong MVP. Không dùng ảnh gốc lớn làm hero.

## 17. Settings/audit
Settings: site origin/domain (khóa sau in hoặc yêu cầu migration plan), timezone default, retention, RSVP limits, owner password, backup status chỉ đọc. Không sửa secret token qua frontend.
Audit: actor/action/entity/time/reason, lọc; redact token/password/PII dư thừa; không sửa audit từ UI.

## 18. Visual direction và component
Theme “Một lời mời, một câu chuyện”: nền #FAF7F0, text #253329, accent olive #52664C (kiểm tra contrast thực tế); serif cho tên, sans-serif cho thông tin. Khổ mobile một cột; desktop max-width khoảng 1040px; admin dashboard riêng thiết kế thực dụng.
Components: InvitationHero, RecipientGreeting, EventCard, ChangeNotice, RSVPForm, PhotoGallery, StoryTimeline, MapButton, StatusBadge, AdminDataTable, ImportPreview, QRLabelPreview, JobStatus, ConfirmDangerDialog, Empty/ErrorState.
Không cần mockup hình ảnh trong bộ tài liệu này; wireframe textual: hero → event(s) → story → gallery → RSVP → footer. Thứ tự có thể giảm story để thông tin và RSVP gần đầu.

## 19. Cập nhật trang quản lý link v1.1
Mở rộng `/admin/invitations` thành trung tâm **Link & lượt mở**; route giữ nguyên.
- Cột: người nhận, events, effective access OPEN/CLOSED/NOT_YET_OPEN/EXPIRED/REVOKED, policy reason admin-only, thời điểm mở/đóng, PIN enabled, trạng thái gửi, trạng thái mở, firstOpenedAt/lastOpenedAt, RSVP theo event.
- Filter: buổi, group, effective state, chưa ghi nhận mở, đã mở nhưng chưa phản hồi, lịch sắp mở/đóng. Không “đã đọc chắc chắn”.
- Actions: mở ngay, đóng ngay, chuyển scheduled, đặt cửa sổ, preview as guest (không tăng lượt mở), xem history, copy link/QR, revoke riêng.
- Bulk drawer: chọn IDs cố định, review ảnh hưởng/session, confirm apply; group là selection tiện ích không policy suy ra động.
- Detail thêm tab Truy cập với policy timeline, lịch sử mở tối thiểu, admin overrides; tab Security có PIN (P1) và revoke/rotate warning.

## 20. Màn chưa mở/đóng và PIN
Link chưa mở/đóng/invalid hiển thị thông báo chung “Thiệp chưa mở hoặc hiện không khả dụng. Bạn vui lòng thử lại sau hoặc liên hệ người gửi.” Không tên người nhận, lịch private, địa điểm private. Exact access reason chỉ admin.
Không countdown/hiển thị ngày mở của link riêng khi chưa được phép theo default privacy; có thể một thông báo chung Owner công khai.
PIN (P1): challenge form digits/password masked, không hint phone/date birth; lỗi chung, Retry-After; không hiển thị tên trước verify. Không yêu cầu người dùng nhập secret vào chat hoặc log.

## 21. Màn “Mở thiệp” và notice
Trước private content, hiển thị tên hai bạn nếu đã công khai, nút “Mở thiệp”, câu ngắn: “Website ghi nhận thời điểm mở thiệp để người gửi theo dõi lời mời; không công khai lịch sử của bạn.” Không ép guest consent bằng một checkbox giả nếu chưa có policy pháp lý.
Sau click thành công: mở DTO và chuyển section như v1.0. Nếu tracking event không được ghi nhận do lựa chọn riêng tư/lỗi không-critical, thiệp vẫn có thể mở sau khi quyền truy cập được server xác lập; UI/admin không bịa timestamp.

## 22. Dashboard bổ sung
Cards: lời mời đang mở/đang đóng; chưa ghi nhận mở/đã ghi nhận mở; sắp mở theo lịch; đã mở nhưng chưa phản hồi event được chọn. Không cộng “opened sessions” thành số người.
Tooltip trạng thái mở ghi rõ giới hạn: link có thể được chuyển tiếp; prefetch không tính; thiếu bản ghi không chứng minh chưa xem. Manual Owner xác nhận đã nhận thiệp hiển thị trạng thái riêng, không ghi đè system firstOpenedAt.
