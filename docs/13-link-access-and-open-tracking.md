# 13 — Quản lý đóng/mở link, bảo vệ lời mời và trạng thái mở

## 1. Mục tiêu và giới hạn
Chủ tiệc muốn chuẩn bị website/QR trước nhưng khách không vào quá sớm; mở theo thời điểm/nhóm; biết lời mời nào đã có lượt mở để phối hợp nhắc khách; tránh người không có quyền xem riêng.

Đáp ứng bằng access gate và minimal engagement tracking. Không hứa link có thể xác minh danh tính, không ngăn người có quyền chụp ảnh/forward, không xóa nội dung đã tải ở máy người xem. Một QR dùng cho gia đình cũng không xác định thành viên nào đã mở.

## 2. Các lớp trạng thái — không trộn lẫn
| Lớp | Ví dụ | Ý nghĩa |
|---|---|---|
| Publication | DRAFT/PUBLISHED/ARCHIVED | Nội dung có thể phát hành không |
| Credential | ACTIVE/REVOKED | Link/token còn hợp lệ không |
| Global access | Open/closed/scheduled | Website có cho xem private invitations không |
| Invitation access | Inherit/open/closed/scheduled | Lời mời riêng được mở không |
| PIN protection P1 | Enabled/verified revision | Có thêm secret ngoài URL không |
| Event visibility | Assigned/published/cancelled | Xem những buổi nào |
| RSVP availability | Open/deadline/cancelled | Có được gửi/sửa response không |
| Delivery fact | Owner marked sent | Owner cho biết đã gửi |
| Recorded opening | No record/first/last/count | Telemetry có lượt mở, không proof of person |
| RSVP state | Unanswered/attending/declined | Response riêng từng event |

Đóng RSVP không đóng link. Đóng link không revoke token. Revoke link vô hiệu credential; reopen policy không cứu được revoked token. Đóng global private access không tự xóa nội dung chung/OG public; cấu hình public landing riêng phải được Owner duyệt.

## 3. Modes và precedence
### Global
- MANUAL_CLOSED: chặn private content, bất kể invitation policy.
- MANUAL_OPEN: cho qua global gate, vẫn kiểm invitation.
- SCHEDULED: cho qua nếu `now>=openAt` và `closeAt is null OR now<closeAt`.
### Invitation
- INHERIT: không thêm time restriction, theo global gate.
- MANUAL_CLOSED: chặn riêng lời mời.
- MANUAL_OPEN: mở riêng nhưng không vượt global closed.
- SCHEDULED: thêm cửa sổ riêng.

Đánh giá:
1. wedding/party/invitation active và publication hợp lệ?
2. credential active/auth revision hợp lệ?
3. global gate mở tại serverNow?
4. invitation gate mở tại serverNow?
5. PIN verify revision nếu bật?
6. marker đã qua thao tác “Mở thiệp” cho private DTO?
7. event được cấp/published và RSVP deadline nếu endpoint write?
Bất kỳ fail nào chặn guest private request. Admin preview dùng quyền Owner riêng, không đánh tráo grant guest.

Không cần row “effectiveStatus” cập nhật bằng cron; trạng thái tính tại request. DB lưu mode/window/revision; admin nhận computed result kèm serverNow. Schedule input local timezone→UTC; hiển thị timezone rõ. End exclusive để boundary test không mơ hồ.

## 4. Ví dụ hai buổi/nhóm
Website chuẩn bị xong, global scheduled mở ngày Owner định gửi thiệp. Người thân invitation INHERIT; đơn vị scheduled mở muộn hơn. Cùng website, khách đơn vị không xem sớm dù người thân xem được. Một party được mời cả hai có một access policy cho lời mời; event vẫn có published state/assignment riêng. Nếu muốn phát hành từng event riêng cho cùng party, dùng publish từng event đúng thời điểm; lịch tự động per-event là P1 cần thêm schema, không giả định invitation window đã làm điều đó.

Nhóm chỉ giúp chọn batch. Khi Owner “Mở nhóm Đơn vị”, backend chụp IDs hiện có, preview và apply từng invitation. Guest mới được tag sau không tự thay policy; UI báo khách mới chưa nằm batch. Dynamic group policies không MVP vì dễ quyền ngầm/trùng nhiều nhóm.

## 5. Các thao tác Owner
- **Đóng toàn bộ private invitations:** khẩn cấp hoặc chưa phát hành; warning không ảnh hưởng public OG đã đồng ý công khai.
- **Mở ngay:** manual override, banner lịch gốc không còn đang áp dụng; không secretly mở temporary rồi tự đóng thiếu UX.
- **Theo lịch:** restore/đặt openAt, optional closeAt; preview local/UTC.
- **Đóng từng link/batch:** valid tokens giữ, session cũ cũng deny.
- **Khôi phục theo lịch:** rõ ràng để tránh override còn quên.
- **Chỉ đóng RSVP:** riêng event; thiệp vẫn đọc.
- **Revoke/rotate:** thao tác nguy hiểm riêng, printed-impact confirmation; không dùng để pause.
- **PIN enable/reset/disable P1:** note QR unchanged, verified sessions invalidated theo security revision.

Bulk preview show số invitations, events, số có QR đã marked printed/sent, hiện đang mở/đóng, RSVP totals impacted read availability; không xóa RSVP. Bounded max2.000; versions checked transaction atomic. Failed/stale preview yêu cầu review, không partial apply yên lặng.

## 6. Định nghĩa “đã mở” trung thực
**Event được ghi khi session có quyền bấm nút Mở thiệp và server nhận open-intent hợp lệ.** Không bảo đảm người đã đọc hết nội dung, không chứng minh đúng người được mời. Browser/script khác cũng có thể chủ động gửi request; explicit intent là giảm false positives không phải chống mọi bot.

- firstOpenedAt: thời gian event hợp lệ đầu tiên.
- lastOpenedAt: event hợp lệ gần nhất.
- recordedOpenCount: số events sau dedup, không số người.
- no record: chưa ghi nhận; có thể chưa mở, tracking disabled, preview/admin test, mạng lỗi hoặc telemetry không lưu.
- per-invitation status: một gia đình/một người tùy mô hình, không per-member.
- nếu RSVP được ghi nhưng opening record thiếu, RSVP vẫn là bằng chứng response; không backfill lịch sử mở giả từ timestamp RSVP.

Không đo scroll depth/read time/device fingerprint/GPS. Không đếm IP là người duy nhất (Wi-Fi shared/VPN/nhiều thiết bị). Optional coarse device category chỉ P2 khi nhu cầu/privacy review rõ, không MVP.

## 7. Luồng guest v1.1
1. GET entry shell generic/no-store/no-referrer; không private content, không open write.
2. GET CSRF, POST redeem token; gate check server. Closed/invalid show generic message.
3. PIN challenge nếu enabled; verify cùng session, throttled; không private data trước verify.
4. Issue scoped grant, replace URL với invitationId không có bearer secret; full DTO chưa tải.
5. Generic welcome + notice thống kê + nút Mở thiệp.
6. POST open-intent checked grant/gate/PIN; xác lập open marker, record event nếu policy cho phép.
7. GET private DTO checked gate hiện tại/marker; show thiệp/events.
8. RSVP checked gate và event rules again, không dựa marker cũ để bypass close.

Reload clean URL: valid marker+gate→view không thêm event; nếu policy revised yêu cầu reopen theo UI decision, kiểm revisions. Session hết thì mở QR gốc. Nút mở lại chủ động có thể tạo event mới sau dedup; polling/loading không tự gửi open event.

## 8. Dedup và telemetry
- Idempotency-Key+request hash tránh request retry count lại.
- Dedup key invitationId + server session pseudonym + UTC10-minute bucket. Cửa sổ bucket sát biên có thể đếm hai events sát nhau, UI không quảng cáo exact reading count; nếu cần sliding window implement lock/time-delta thay bucket, ghi ADR/test trước.
- Pseudonym không raw session ID; HMAC scope invitation với key và TTL; vẫn là dữ liệu cần bảo vệ, không dùng để tracking cross-site.
- Authorization marker và telemetry tách: nếu tracking off không event, vẫn xem được. Telemetry failure không được fail-open authentication; đã authorized thì có thể tiếp tục content, admin counts eventually lower chứ không bịa timestamp.
- Summary min/max/count từ unique events; không increment theo GET/query. Optional outbox worker reliable tracking P1; MVP label “ghi nhận” chấp nhận telemetry gap được document.

Admin preview không record; known Owner test session không record mặc định. Owner mở actual link bằng browser khác chưa auth có thể record, không có cách đoán đó là Owner. Crawler thực thi button-like request vẫn có thể record, không tuyệt đối chống bot.

## 9. Bảo vệ link tránh truy cập linh tinh
### P0
Entropy32 bytes, no personal patterns; permission scope từng lời mời; rate-limit; CSRF; server gate; revoke/rotate; redact logs; no indexes/search/list guests; private artifacts; no-store/no-referrer; audit bulk changes; no admin public signup.
### P1 PIN
Một secret ngoài URL, random6 digits hoặc passphrase. Không phone suffix/ngày cưới; password hash adaptive; display once khi Owner tạo rồi không reveal stored; Owner copy bảo mật, reset nếu quên. Out-of-band nếu muốn chống ai có QR. Gửi kèm QR same message chỉ tăng thao tác, không tăng bí mật đáng kể.
Challenge bounded TTL/session, transient rate limits/IP/challenge; không vĩnh viễn lock invitation do attacker. PIN protection áp dụng tất cả private guest endpoints, không chỉ opening page. Reset/disable rõ security revision; no plaintext in logs/backups/scripts.
### P2 OTP
Chỉ nếu phải xác minh người: phone/email optional giờ thành required, cần provider permission/cost/delivery/retry/privacy. Không lấy đăng nhập Zalo/OTP như miễn phí có sẵn.

Không default giới hạn số lần mở/toàn đời hoặc khóa một thiết bị: khách gia đình nhiều máy, máy đổi, reload; dễ tự làm hỏng thiệp. Có thể Owner review suspicious activity trong admin nhưng không kết luận chỉ từ2 thiết bị.

## 10. Dashboard và reminders
Rows show effective access + first/last + RSVP từng buổi. Filter “đã mở nhưng chưa phản hồi E2” = open record invitation có + active assignment E2 + response E2 absent. Filter “chưa ghi nhận mở” không khẳng định chưa nhận.
Worklist P1: chọn guests→tạo nội dung nhắc phù hợp buổi→copy để gửi thủ công→Owner mark contacted. Không tự gửi tin/cam kết delivery. Không guilt/shame người nhận trong lời nhắc.

## 11. Notice và retention
Notice trước open: “Website ghi nhận thời điểm mở thiệp để người gửi theo dõi lời mời; không công khai lịch sử của bạn.” Footer privacy/contact Owner để hỏi/xóa. Setting tracking disabled; no fake unread/read flags. Đề xuất mở history cùng retention guest/RSVP90 ngày sau buổi cuối, phải Owner quyết định; logs transient ngắn hơn.

## 12. Các điều không bảo đảm
Không xác thực đúng người chỉ nhờ QR/link/PIN chia sẻ. Không biết khách đã đọc toàn bộ. Không xóa nội dung tải/chụp trước khi close. Không chặn bên nhắn tin nhận original URL. Không bảo đảm network/client telemetry đầy đủ. Không làm invalid old QR khi chỉ close/open. Không hard-delete history khi pause.

## 13. Điều kiện nghiệm thu
QA41–QA60 theo scope, đặc biệt close old session, boundary server time, crawler not counted, multiple invitations/session, revocation gate, bulk version, optional PIN. Owner approve wording/notice, schedule timezone, public versus private content trước phát thiệp.
