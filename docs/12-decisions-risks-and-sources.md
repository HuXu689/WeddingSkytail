# 12 — Quyết định, giả định, rủi ro và nguồn

## 1. Những gì đã được yêu cầu
- Thiệp cưới online cho đám cưới riêng, không nền tảng thương mại.
- Hai buổi tiệc: người thân/bạn bè và đơn vị; gửi link/QR, in list QR cắt dán thiệp giấy.
- Ưu tiên Java Spring+ReactJS, Docker, database phù hợp.
- Phân tích kỹ trang/chức năng rồi tạo file kế hoạch/tài liệu; không yêu cầu code sản phẩm hoặc triển khai ở bước này.

## 2. Giả định thiết kế, chưa phải xác nhận từ Owner
Một wedding, một Owner; tiếng Việt; timezone Asia/Ho_Chi_Minh; khách không tài khoản; QR cá nhân/gia đình; max20 người/lời mời/buổi configurable; khoảng300–1.000 lời mời là planning envelope; CSV import là MVP, XLSX P1 nếu cần; local media storage; form RSVP không bắt phone; capacity warning-only; deadline đóng theo server clock.

Người dùng chưa cung cấp tên hai bạn, ngày, địa điểm, ảnh, kích thước chỗ dán, lượng khách, domain, hosting hoặc giới hạn đi cùng. Không điền dữ liệu thật thay họ.

## 3. Câu hỏi cần chốt
| Câu hỏi | Default đề xuất | Thời điểm bắt buộc |
|---|---|---|
| Hai buổi khác ngày hay cùng ngày? | Data model hỗ trợ cả hai | Trước publish |
| Link theo cá nhân hay gia đình? | Party-level, cả hai đều được | Trước import thật |
| Mỗi nhóm được đi cùng bao nhiêu? | maxPeople theo invitation-event | Trước gửi |
| RSVP deadline và có sửa sau hạn? | Guest đóng, Owner override with reason | Trước gửi |
| QR dán vùng kích thước nào? | Nhãn60.67×52.20mm,15/A4 | Trước chốt layout/in |
| Bao nhiêu guests? | Planning300–1.000, test300 giả | Trước sizing/load test |
| Domain chính? | Domain riêng do Owner kiểm soát | Trước in thật |
| Hosting tự quản hay managed? | VPS Compose, DB nội bộ | Trước deployment |
| Phone có cần lưu không? | Không bắt buộc | Trước import thật |
| Event details có công khai chung? | Chỉ những field được bật public | Trước publish |
| Cần xác thực người nhận hơn link? | Không OTP MVP, warning bearer-link | Trước gửi nếu thông tin nhạy cảm |
| Dữ liệu giữ bao lâu sau cưới? |90 ngày đề xuất, artifacts24h | Trước release |

## 4. ADR tóm tắt
ADR01 modular monolith: quy mô nhỏ, dễ transaction/ops; đổi khi workload/team cần.
ADR02 PostgreSQL: core relational, constraints mạnh, aggregate RSVP.
ADR03 React+Spring HTML shell: React cho tương tác/admin, metadata server cho share; tránh full SSR stack thứ hai.
ADR04 bearer token+session grants: guest không login, privacy có giới hạn; OTP chỉ khi thật cần.
ADR05 encrypted recoverable token+hash: lookup an toàn và tái xuất QR ổn định; key management là trách nhiệm vận hành.
ADR06 PDFBox vector labels: exact print geometry, font Vietnamese; phải physical test.
ADR07 server-side session JDBC: revocation/restart, không JWT complexity/Redis MVP.
ADR08 draft vs published snapshots: không vô tình lộ chỉnh sửa; tăng complexity nhỏ có kiểm soát.
ADR09 job queue DB+bounded worker: đủ batch in, không cần broker service.
ADR10 local storage first: đơn giản; off-host backup mandatory; S3-compatible khi storage/redundancy cần.

## 5. Risk register
| Risk | Impact | Mitigation |
|---|---|---|
| Link forward | Người khác sửa cùng RSVP | Warning, short scope, revoke/rotate, OTP P1 |
| Domain đổi/hết hạn | QR giấy hỏng | Final domain before print, auto renewal+owner account |
| Token/key loss | Không tái xuất links | Versioned encrypted backup+restore drill |
| QR nhỏ/mờ/dán nhầm | Guest không vào/nhầm thiệp | Quiet zone, size test, names+manifest |
| Group/assignment nhầm | Mời sai buổi | Explicit grants, preview import, UAT dataset |
| Concurrent RSVP | Double counts/lost update | UNIQUE+transaction+version+idempotency |
| Social preview leak/cache | Lộ tên/thông tin cũ | Generic OG, no private HTML, manual platform test |
| Private export served public | Leak whole guest capabilities | Private path/auth/TTL, security tests |
| VPS loss | Data loss/downtime | Off-host backups, keys/media restore |
| Feature creep | Chậm phát thiệp | P0/P1 split, defer SaaS/check-in/autosend |
| Spring major/library mismatch | Build failure/upgrade cost | Pin tested versions and dependency compatibility gate |
| Timezone/deadline error | RSVP đóng sớm/giờ sai | timestamptz+IANA, server clock, timezone tests |

## 6. Nguồn công khai đã kiểm chứng cho thiết kế
### S1 — Spring Boot requirements
https://docs.spring.io/spring-boot/system-requirements.html
Trang được đọc nêu Spring Boot4.1.1 cần Java17+, tương thích tới26 và Maven3.6.3+. Dùng làm căn cứ Java21 hợp dải hỗ trợ; không chứng minh toàn bộ thư viện dự án tương thích, không khóa release mãi.

### S2 — OWASP Session Management Cheat Sheet
https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
Căn cứ HttpOnly/Secure/SameSite, SameSite không thay CSRF, tránh lưu auth credentials trong localStorage/sessionStorage, rủi ro session handling. Áp dụng theo threat model riêng, không tuyên bố dự án đã đạt chứng nhận OWASP.

### S3 — Open Graph protocol
https://ogp.me/
Căn cứ metadata trong HTML head và og:title/type/image/url. Không chứng minh Zalo/Messenger luôn render/cập nhật như nhau; phải test platform thật.

### Giới hạn nghiên cứu
Không tìm thấy tài liệu nội bộ liên quan website thiệp cưới trong lần search workspace. Nguồn Docker secrets được thử tải trả404, tài liệu Facebook Sharing thử tải trả403; không dùng hai trang lỗi như bằng chứng. Hướng dẫn Docker trong docs09 là thiết kế đề xuất cần kiểm chứng bằng triển khai thực tế và docs phiên bản dùng.

Định lượng performance/layout/timing/retention/cost trong bộ này là mục tiêu/giả định kỹ thuật, không dữ liệu đo từ website đã có. Chưa có website, benchmark, test print thật hoặc deployment.

## 7. Checklist tài liệu implement tiếp theo
- OpenAPI3.1 typed schemas, generated client, exact error semantics.
- SQL migrations reviewed and integration tested.
- Dockerfiles, compose dev/prod, Caddyfile, secret loader and `.env.example`.
- README chạy local, admin bootstrap, backup/restore scripts và rollback notes.
- Physical print sample, test reports, UAT signoff, release notes.
Các mục này là đầu ra coding phase, không được giả định tồn tại/chạy được trong bộ kế hoạch.

## 8. Yêu cầu bổ sung và quyết định v1.1
User yêu cầu đóng/mở link tránh truy cập sớm, theo dõi người được mời đã mở, bảo vệ link tránh truy cập tùy tiện và phân tích thêm chức năng. Thiết kế đáp ứng ở mức “ghi nhận lượt mở lời mời”, không suy diễn xác minh đúng người.

ADR11 access modes global+invitation conjunction: global close không bị invitation override, scheduled evaluate server time.
ADR12 explicit open click instead GET: giảm crawler/prefetch false opens, không loại bỏ mọi bot/người nhận forward.
ADR13 privacy-preserving first/last/count: không fingerprints, IP tracking profile; tracking opt-out setting, notice trước thao tác.
ADR14 PIN optional/out-of-band: tăng protection nhưng tradeoff friction/support; OTP không MVP.

Cần Owner chốt: ngày giờ mở chung; có lịch từng nhóm không; có closeAt hay chỉ close RSVP; có muốn PIN cho nhóm nào; nội dung nào vẫn public khi close; bật/tắt open history/retention. Defaults: initial global CLOSED trước khi phát; invitation INHERIT; closeAt null; no PIN MVP; tracking notice+minimal metadata enabled; closure không xóa published generic OG/public fields tự động.

Rủi ro bổ sung: user tưởng “đã xem” là đúng người → label caveat; view tracked quá nhiều → click+dedup; rate limit gây DoS tại cơ quan → bounded IP/challenge limits không permanent invite lock; close bypass cached API → no-store+DB evaluator; gửi PIN cùng QR → warning/out-of-band; schedule sai → NTP+timezone+UAT.
Không cần nguồn công khai mới để mô tả các chức năng sản phẩm này; là đề xuất thiết kế dựa yêu cầu và threat model, chưa có đo lường/tích hợp thực tế.
