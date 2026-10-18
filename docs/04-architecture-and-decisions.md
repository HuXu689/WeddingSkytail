# 04 — Kiến trúc và quyết định kỹ thuật

## 1. Kiến trúc đề xuất
```
Browser guest/admin
    |
HTTPS public domain
    |
Caddy (TLS, reverse proxy, request redaction)
    |-- /assets/* và app route -> React build/static server
    |-- /i/*, /w/*             -> Spring HTML shell + generic Open Graph
    |-- /api/*                -> Spring Boot REST
                                   |-- PostgreSQL (DB/session/jobs/audit)
                                   |-- media volume (public derivatives)
                                   |-- private volume (PDF/export TTL)
                                   |-- encrypted token ciphertext + secret keys
```
MVP một backend process, modular monolith. Export jobs dùng DB queue và bounded worker trong cùng process; restart có cơ chế reclaim. Không thêm Kafka/Redis/Kubernetes chỉ để in vài trăm QR.

## 2. Lựa chọn stack
| Thành phần | Chọn | Lý do/đánh đổi |
|---|---|---|
| Backend | Java 21 LTS, Spring Boot stable supported | Hợp sở thích Java, transaction, validation, security, test tốt |
| Web | React, TypeScript, Vite | Admin nhiều form/table, build tĩnh nhẹ; typing tránh sai DTO |
| DB | PostgreSQL 17, patch còn hỗ trợ | Nhiều quan hệ, unique/FK/transaction, aggregate RSVP; JSONB chỉ cho snapshot/layout |
| ORM/migration | Spring Data JPA + Flyway | Schema kiểm soát; ddl-auto=validate production |
| Auth | Spring Security, server sessions | Cookie HttpOnly, revocation dễ, không JWT/localStorage không cần thiết |
| Session | Spring Session JDBC | Có thể restart/redeploy mà quản lý session rõ; TTL/configurable |
| API validation | Bean Validation, DTO, ProblemDetail | Không expose Entity trực tiếp |
| QR | ZXing | Tạo QR bitmap/vector theo URL |
| PDF | Apache PDFBox + font Unicode nhúng | PDF dimension theo mm, tránh browser print scaling khó kiểm soát |
| Media | Local Docker volume trước | Ít vận hành; tăng lên S3-compatible khi có nhu cầu thật |
| Edge | Caddy | TLS và reverse proxy gọn; Nginx thay được nếu đội quen |
| Tests | JUnit, Testcontainers PostgreSQL, React Testing Library, Playwright | Unit/integration/E2E thực trên postgres |
| Build | Maven Wrapper; npm lockfile; multi-stage Docker | Build tái lập được, khóa dependency |

Theo tài liệu Spring tại thời điểm đọc, dòng stable được trang requirements ghi là 4.1.1 và Java tối thiểu 17. Không khóa mãi version này trong tài liệu: khởi công kiểm tra supported stable và tương thích thư viện, chọn exact patch; Java 21 nằm trong khoảng tài liệu hiện nêu.[^https://docs.spring.io/spring-boot/system-requirements.html]

Không chọn MongoDB: nghiệp vụ nhiều quan hệ + aggregate + ràng buộc cần DB quan hệ. MySQL vẫn làm được nhưng PostgreSQL phù hợp lựa chọn này. Không dùng SQLite production cho lưu trữ ghi đồng thời và vận hành dự kiến. React không bắt buộc SSR cả ứng dụng: Spring trả shell HTML có OG sẵn, React quản lý view tương tác.

## 3. Module backend
`identity` (admin/session/CSRF), `wedding` (content/publish), `events`, `guests`, `invitations` (grants/credentials), `rsvp`, `media`, `imports`, `exports` (QR/PDF), `audit`.
Mỗi module controller → application service → domain/repository. Transaction đặt ở service, authorization trong service và security boundary; không chỉ annotation controller. Public DTO allowlist riêng với admin DTO.

Package ví dụ `vn.wedding.invitation`; thư mục feature-based, không một service khổng lồ. Đối tượng Event tránh đặt tên đụng framework bằng `WeddingEvent`.

## 4. Frontend
```
frontend/src/
  app/        router/providers/error-boundary
  features/   invitation,rsvp,admin-events,guests,imports,print,media
  shared/     ui,http,format,validation
```
React Router; TanStack Query cho server state và invalidation; React Hook Form + schema validation cho form. Server vẫn validate độc lập. Không lưu dữ liệu thật vào demo source. Admin table server-side pagination, không tải cả guest list để lọc browser.

## 5. Publish/content revision
MVP editor wedding có draftContent và publishedContent JSONB theo schema version, save draft riêng; publish copy validated draft → published snapshot transaction. Event cũng có draft payload và published fields/revision; editor save không làm live thay đổi cho tới publish. RSVP/assignment không nằm trong content snapshot.
- Một event field thời gian chỉ có hiệu lực guest khi publish.
- Public DTO và dashboard lịch đã công bố đọc published state.
- Owner preview dùng draft nhưng không dùng guest bearer link.
- Change notice thuộc revision công bố; cancel là hành động explicit cập nhật state và audit.
Chiến lược này tránh hứa save draft nhưng thực tế chỉnh trực tiếp nội dung live.

## 6. RSVP transaction
1. Xác thực grant và credential vẫn active.
2. Lock/read invitation-event trong transaction (và event nếu cần serialization với deadline/cancel).
3. Check event state/deadline/maxPeople; expectedVersion.
4. Upsert một response theo unique invitation-event; append history; store idempotency result.
5. Commit rồi trả response mới/version. Aggregate tính từ trạng thái hiện tại, không tăng counter bằng mỗi HTTP request.

Changes maxPeople/deadline/cancel cũng dùng lock cùng phạm vi để không bypass validation trong race. Khi giảm maxPeople dưới RSVP hiện tại, chặn hoặc Owner sửa RSVP rõ, không silently truncate.

## 7. Export jobs
- POST job với selected invitation IDs và layout; max batch mặc định 2.000.
- Snapshot tên/event label/credentialVersion/order và layout; dữ liệu nhạy cảm private.
- DB job status và lease; worker concurrency 1–2, bounded RAM; artifact ghi temp rồi atomic rename.
- Retry thất bại dùng job semantics không làm rotate token. Check credentials trước/during completion, invalidates khi changed.
- PDFs private TTL 24h đề xuất; download authenticated stream; cleanup scheduler. Không S3 public URL dài hạn.
- Dev sync nhỏ được phép, production vẫn job để không timeout khi nhiều nhãn.

## 8. Quan sát và hiệu năng
Health/readiness nội bộ; Actuator public chỉ expose endpoint cần thiết qua allowlist. Structured logs correlationId, route template không raw token. Metrics count/latency/error/queue depth không guest name. Index đúng truy vấn, tránh N+1. Ảnh public derivatives versioned immutable; personalized HTML/API no-store.

## 9. Không làm ngay
Microservices, GraphQL, realtime socket, Redis, auto scaling, OCR danh sách khách, SSO khách, machine learning, tích hợp ngân hàng. Thêm sau dựa workload đo được.

## 10. Repository dự kiến
```
wedding-site/
  backend/ (Maven wrapper, src, migrations, Dockerfile)
  frontend/ (package-lock, src, Dockerfile)
  deploy/ (compose.dev.yml, compose.prod.yml, Caddyfile, backup docs)
  docs/ (bộ tài liệu này)
  .github/workflows/ (nếu dùng GitHub CI)
  .env.example (không secrets thật)
```
Bộ hiện tại chỉ là docs, không phải scaffold repository đã build.

## 11. Bổ sung access/tracking v1.1
Module `access-policy`: evaluate global+invitation schedule/manual state+credential+publication+PIN revisions. Mọi guest read/write đi qua service chung; không rải logic giờ mở ở React/controller. Event deadlines là lớp RSVP riêng. Policy dùng backend time, không cron làm nguồn sự thật.

Module `engagement`: POST open-intent sau click, tối thiểu thời gian/invitation/session-derived dedup key. Authorization/open marker là flow thiết yếu; telemetry là best effort và không được cấp quyền chỉ vì một row tracking tồn tại. GuestDTO yêu cầu server marker xác lập sau thao tác mở, pin verified nếu enabled, và gate vẫn OPEN tại thời điểm đọc. Marker permission và tracking event có ranh giới rõ: telemetry lỗi/opt-out không đồng nghĩa mất quyền đã xác thực.

Tracking outbox nếu cần (P1) để tránh mất sự kiện; không bắt buộc một broker. Dedup và idempotency DB, không in-memory đơn thuần qua restart. Redis vẫn chưa cần. Bulk policy dùng transaction bounded cùng wedding và expected versions; preview ID checksum chống filter thay đổi trước apply.

Cache private no-store, gate checks authoritative DB trong MVP. Mở rộng cache policy sau phải có invalidation/bounded freshness và ghi rõ thời gian close có hiệu lực; không cache OPEN5 phút rồi hứa đóng tức thì.
