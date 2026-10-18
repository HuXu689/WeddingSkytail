# 08 — Bảo mật và quyền riêng tư

## 1. Threat model
Assets: admin account, danh sách guest/phone/notes, RSVP, link tokens, PDF/CSV chứa QR, private images, encryption keys, backup.
Adversaries: bot đoán link, người giữ link sửa RSVP, khách thử đổi ID, attacker XSS/upload, admin credential leak, máy chủ/storage public misconfiguration.

Mục tiêu không phải biến thiệp cưới thành banking system, nhưng không được xem token/PII là dữ liệu public chỉ vì dự án nhỏ.

## 2. Authorization
- Admin endpoints Owner role+authenticated session. UI chỉ là tiện ích, backend enforce.
- Guest từng request cần grant invitationId, credential active và authRevision khớp; check event assigned/active/published.
- DTO allowlist: không entity serialization khiến phone/internalNote/tokenCiphertext lọt xuống guest.
- Media public chỉ derivatives được chọn công khai; exports/imports/backup không cùng public directory.
- IDOR tests đổi invitationId/eventId/exportJobId phải bị chặn.
- Chỉ một Owner trong MVP; nếu thêm Editor phải có matrix permission cụ thể trước release.

## 3. Admin/session/CSRF
Password adaptive hash (BCrypt với work factor đo trên host, hoặc Argon2id theo framework support). Không plaintext/default credential. Login failure generic, rate limit, session ID rotate after login, session timeout cấu hình (admin idle30 phút, guest idle24h là đề xuất, không cam kết).

Cookie Secure, HttpOnly, SameSite=Lax; same-origin no wildcard CORS; CSRF token cho POST/PUT/DELETE/login/redeem/export. SameSite là defense-in-depth, không thay CSRF; OWASP cũng khuyến cáo không lưu auth tokens/session IDs trong localStorage/sessionStorage.[^https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html]

Cookie host-only, Path=/, prefix __Host- khi phù hợp; HTTPS. Session expiry guest hướng dẫn mở lại QR. Backend kiểm grants khi mỗi request, không tin state frontend sau rotate. Logout/password change vô hiệu session theo policy.

## 4. Token link
32 random bytes; hash lookup; ciphertext AES-GCM cho re-export; secret key mount private/read-only và versioned. Không gọi link là xác thực đúng người. Chia sẻ link với nền tảng tin nhắn đồng nghĩa bên đó nhận URL; không đưa vào public social post nếu cần riêng tư.

Rate limit token redeem/IP với burst hợp lý, không attacker guessing lock hết khách một IP. Không token/body trong exception/logs; redaction cả reverse proxy lẫn backend/monitoring. Không analytics bên thứ ba ghi full URL. No-referrer cho link map; maps allowlist HTTPS domains, không javascript/data URLs.

## 5. XSS, injection, uploads
- Render user text như text; không dangerouslySetInnerHTML với guest notes/editor input.
- CSP tự-host script/style/font và nonce/hash khi cần; frame-ancestors none; không broad unsafe-inline theo thói quen. Test Vite production behavior với CSP.
- SQL parameterized, JPA/query bind; sort/field whitelist.
- Upload kiểm extension+MIME sniff+decode thực, size/dimensions limits chống decompression bomb; random storage key, path traversal guard; reject SVG/macro/archive trong media MVP.
- Re-encode ảnh, xóa EXIF GPS, tạo WebP/JPEG derivatives; cleanup originals theo policy.
- CSV export prefix/escape cells bắt đầu =,+,-,@ và control chars theo chính sách, quote CSV đúng. Tên và ghi chú xem như untrusted, không chỉ phone.
- Không HTTP fetch arbitrary map/image URL → tránh SSRF. Upload ảnh trực tiếp thay remote import trong MVP.

## 6. Dữ liệu tối thiểu và retention
Không bắt điện thoại/email nếu không cần. Guest được thông báo: dữ liệu RSVP dành tổ chức tiệc, Owner xem, không hiển thị công khai. Ghi chú ăn uống có thể nhạy cảm, chỉ optional.

Đề xuất: export artifacts24h; import staging24h; operational logs14–30 ngày; RSVP/guest data xóa hoặc anonymize khoảng90 ngày sau buổi cuối (Owner chốt); backups có retention tương ứng và tránh khôi phục dữ liệu đã yêu cầu xóa một cách vô tình. Đây là policy đề xuất, không tư vấn pháp lý hoặc tuyên bố tuân thủ quy định cụ thể.

## 7. Backup và key
DB encrypted backup hoặc lưu trên storage encrypted; media và encryption keys có bản backup riêng quyền hạn chế. Không gửi backup thật lên chat/repo; không commit .env. DB backup không kèm khóa token thì chưa đủ để tái xuất link cũ. Test restore trọn bộ, keys có keyId, old keys giữ tới khi re-encrypt thành công.

## 8. File in/xuất
PDF/CSV token là credential bundle. Downloads require admin, no-store, TTL, private disk directory; không static server serving `/exports`. Audit ai tạo/tải file nhưng không raw token. Nếu revoked/rotate, server chặn download artifact liên quan; file đã tải không thể thu hồi vật lý, Owner in lại và hủy bản cũ.

## 9. Checklist trước release
[ ] HTTPS/cookies/CSRF hoạt động sau proxy.
[ ] Guest không lấy lời mời khác/phone/notes.
[ ] Revocation chặn cả session cũ.
[ ] Redact token tại mọi tầng log và error trace.
[ ] PDFs, DB, Actuator không public.
[ ] Upload, CSV, SSRF/XSS tests pass.
[ ] Không default admin/password trong image.
[ ] Dependency vulnerability review, image scan và patch versions khóa.
[ ] Restore tested + secret recovery documented.
[ ] Privacy notice và retention đã Owner chốt.

## 10. Incident runbook
Leak link cá nhân → revoke/rotate riêng invitation, cảnh báo QR cũ, gửi lại link mới.
Leak PDF batch → xác định batch IDs, rotate các credential ảnh hưởng nếu cần, in/gửi lại; không rotate toàn bộ thiếu cân nhắc.
Leak admin → disable sessions/reset credentials, kiểm audit/mutations/export jobs, rotate keys nếu bị lộ, phối hợp thông báo người ảnh hưởng.
Mất DB → phục hồi backup theo docs09; reconcile RSVP sau thời điểm backup bằng nguồn có thẩm quyền, không tự chế phản hồi khách.

## 11. Access gate/PIN/tracking v1.1
Global close luôn thắng invitation manual open; revoked/archived/publication disabled luôn thắng time gate. Kiểm server every private read/write, cả session cũ. Frontend timers/hidden sections không phải access control; CDN personalized cache không được bypass.

PIN tùy chọn P1 random6 digits hoặc passphrase, adaptive hash, rate limit IP/session/challenge, reset revisions. Six-digit PIN không chống brute-force offline mạnh nếu hash DB bị lấy; cần bảo vệ DB và có thể chọn passphrase entropy cao cho trường hợp nhạy cảm. Không in/gửi cùng QR khi muốn thêm lớp bảo vệ; không coi PIN dùng chung nhóm là xác minh đúng người. OTP P2 nếu xác minh danh tính bắt buộc, cần provider/consent/cost separate review.

Open tracking data minimization: invitationId/time/session-scoped pseudonym, no raw IP/full UA/fingerprint. Logs bảo mật rate limit là kênh riêng với TTL hạn chế. Trạng thái “chưa ghi nhận” không bằng “chưa mở”, “đã ghi nhận” không xác minh người. Tracking notice trước click, policy retention tương ứng và có setting tắt; khi tắt không giả lập lịch sử/counter.

Nếu người dùng yêu cầu xóa lịch sử mở: Owner xử lý explicit audited; summary và raw events cùng xóa/anonymize theo policy, backups có retention. No contact-data sharing/marketing integration. Không dùng third-party tracking pixels trong thiệp.
