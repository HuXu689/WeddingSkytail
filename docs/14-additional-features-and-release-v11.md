# 14 — Chức năng bổ sung, ưu tiên và cập nhật v1.1

## 1. Nguyên tắc chọn
Thêm chức năng giải quyết việc thật: không mời nhầm buổi, không truy cập sớm, không in nhầm QR, không quên nhắc người chưa phản hồi. Không xây analytics phức tạp hoặc SaaS chỉ để “đủ tính năng”. Bảng dưới là đề xuất có mức ưu tiên, không phải tất cả đã nằm MVP.

## 2. Đề xuất phân tích thêm
| Feature | P | Lợi ích | UX/logic cần làm | Giới hạn |
|---|---|---|---|---|
| Link center và cửa sổ truy cập | P0 v1.1 | Chủ động ngày phát hành/nhóm | Global/per link/schedule/bulk dry-run | Pause không revoke, global close wins |
| Open status tối thiểu | P0 v1.1 | Biết lời mời có ghi nhận mở | Explicit button+notice, first/last/count | Không proof of reader |
| PIN riêng | P1 | QR bị forward chưa đủ truy cập | Challenge/reset/hash/throttle | Out-of-band, thêm friction |
| Worklist nhắc RSVP | P1 | Dễ nhắc đúng buổi | Filter event/open/response, copy message, mark contacted | Không autosend/không shame guest |
| Owner xác nhận đã nhận thiệp | P1 | Ghi chú khi gọi/trao giấy | Manual receipt fact/reason, separate tracking | Không giả lập system open |
| Nhật ký thay đổi lời mời | P1 | Sửa lịch rõ ràng | Notice revision trên event, admin action list | Không push notice nếu chưa integration |
| Lịch mở/đóng event riêng | P1 | Cùng link phát hành hai buổi khác lúc | Event publication scheduler/gate riêng | Thêm schema/tests, chưa được invitation gate làm sẵn |
| Mẫu lời mời theo nhóm | P1 | Xưng hô phù hợp | Template variables allowlist + preview generated text | Group không cấp event permissions |
| Guest tìm lại thiệp | P2 | Mất link | Owner assisted resend; nếu self-service cần verification | Không public search tên/phone |
| Sổ lời chúc có duyệt | P1 | Tăng cảm xúc | Queue approve/reject, sanitize, default private | Tránh spam/lộ notes RSVP |
| File lịch ICS | P1 | Khách nhớ lịch | Theo event/grant/gate, timezone đúng | Link lịch private không bypass close |
| Checklist phát thiệp | P1 | Tránh sót | Nội dung approved, printed/self-reported sent/contacted | Không nhận định máy in đã in thật |
| Seating/check-in | P2 | Hữu ích tiệc lớn | Allocation/check-in identity/race riêng | Không cần để phát thiệp online |
| Export backup Owner | P1 | Dễ giữ hồ sơ | Private export approved fields/no secrets default | Không thay DB/media/key backup |

## 3. Những chức năng không nên thêm mặc định
- Khóa link sau một lần mở: prefetch/session reset dễ tiêu hao, gia đình nhiều người.
- Buộc một IP hoặc thiết bị: Wi-Fi đơn vị/shared family/mobile network đổi IP.
- Đếm số máy thành số khách: misleading, ảnh hưởng chuẩn bị tiệc.
- Geo tracking, fingerprints/read duration: không cần thiết và tăng dữ liệu nhạy cảm.
- Public guest directory/phone suffix lookup: cho người lạ dò lời mời.
- OTP cho tất cả ngay: cost/support, người lớn tuổi khó dùng; chỉ chốt khi privacy needs.
- Tự gửi Zalo/SMS bằng automation không qua review provider/consent: không scope hiện tại.

## 4. Đề xuất scope có thể triển khai
### MVP v1.1 nên giữ
Tất cả lõi v1.0 + global/per-link open/close/scheduled + bulk preview/apply + first/last recorded open + dashboard/filter + notice/tracking setting + regression security.
### Đợt kế tiếp
PIN, worklist reminders, manual receipt, message templates/ICS/change notice enhancement. Từng feature có acceptance và schema/API tests trước code.
### Sau khi sử dụng thật
Review feedback/performance, mới quyết seating/check-in/OTP/multi-admin/multi-wedding.

## 5. Giả định UX quan trọng
- Mặc định global closed trong giai đoạn chuẩn bị; trước khi gửi chuyển scheduled/open.
- Invitation inherits global, trừ những người cần mở muộn.
- No auto closeAt theo default; RSVP deadline là cơ chế đóng phản hồi. Đóng cả link sau tiệc là Owner option riêng.
- “Mở thiệp” button đã có lợi về trải nghiệm thiệp và là điểm record; không extra signup/permissions.
- Admin labels luôn “Đã ghi nhận mở/Chưa ghi nhận mở”, tooltip giới hạn.
- Nhạc/wishes không khiến người nhận phải chờ để biết ngày/địa điểm.

## 6. Changelog v1.1
- FR15–FR21; mở rộng scope P0 FR15–18/20, P1 PIN/reminders.
- 2 docs mới (13–14), cập nhật README và docs01–12 để luồng/API/schema/UX nhất quán.
- Thay auto-fetch personalized content sau redeem bằng explicit open marker.
- Thêm access policies, minimal engagement model, API/bulk/security/test specs.
- Thêm T26–T34; QA41–QA60, estimate tăng4–7 ngày công cho P0.
- Credential hashes/ciphertext/QR canonical vẫn cùng thiết kế, không rewrite để pause.
- Không có application source/production deployments/test results mới; chỉ document QA.

## 7. Quyết định cần Owner chốt trước implement
1. Một lịch mở chung hay người thân/đơn vị mở khác ngày?
2. Chỉ đóng RSVP hay đóng cả việc xem thiệp sau ngày cưới?
3. Có nhóm nào cần PIN không, có thể gửi PIN khác kênh không?
4. Có bật minimal open history không, giữ đến khi nào?
5. Những nội dung nào được phép xuất hiện ở thiệp chung/ảnh xem trước khi link đóng?
Thiết kế hỗ trợ các lựa chọn này nhưng không tự thay mặt Owner quyết định dữ liệu/thời gian thật.
