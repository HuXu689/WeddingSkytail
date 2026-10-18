# 09 — Docker, build và vận hành

## 1. Triển khai MVP
Một VPS/host Linux, Docker Engine+Compose, domain thật. Cấu hình thử ban đầu 2vCPU/4GB RAM/SSD khoảng40GB, phải benchmark; không cam kết với mọi workload. Chi phí phụ thuộc nhà cung cấp/domain/backup/storage, chưa mua dịch vụ.

Production services: `edge` Caddy, `frontend` static web, `backend` Spring, `db` PostgreSQL17. Network edge↔app; DB chỉ backend/internal. Publish host 80/443; không publish 5432/8080 ra Internet. Nếu cần SSH, hạn chế IP/key auth.

Volumes: pgdata, media-data, private-export-data, caddy-data/config. DB backups sang vị trí khác host. Media public path chỉ derivatives approved; private artifacts mount không vào static server.

## 2. Build strategy
- Backend multi-stage: builder JDK21+Maven Wrapper → test/package → runtime JRE21 image non-root; chỉ jar, không source/secrets. Có thể Spring layered jar sau.
- Frontend multi-stage: Node LTS được Vite version đã khóa hỗ trợ → npm ci → typecheck/test/build → static server minimal image non-root nếu hỗ trợ.
- Pin versions và image digests, không `latest`. Lock Maven dependency management, package-lock, font assets/license và Java version.
- Docker build không dùng secret runtime làm ARG/ENV bake vào image. React VITE_* là public build config, tuyệt đối không đặt DB password/encryption key vào đó.
- CI builds immutable tag `<git-sha>`, registry credentials riêng. Đây là quy trình đề xuất, chưa có image build/test.

## 3. Environment và secrets
Non-secret config: APP_PUBLIC_ORIGIN, DEFAULT_TIMEZONE, SPRING_PROFILES_ACTIVE, DB_HOST/PORT/NAME, export TTL, upload limits.
Secrets: DB_PASSWORD, admin bootstrap password temporary, TOKEN_ENCRYPTION_KEYS/keyId, optional PHONE_ENCRYPTION_KEY.
Secret files mount read-only bằng Compose secrets hoặc host secure mount; verify spring configtree/custom loader. Không giả định Compose secrets tự mã hóa file ở host: nguồn file phải quyền600, nằm ngoài repo/backup công khai. .env.example chỉ placeholder.

Production `ddl-auto=validate`, Flyway migrate có controlled procedure, session JDBC schema đúng dependency; logging mức không dump SQL parameters/token. Trust proxy forwarding chỉ từ edge, không tin client X-Forwarded-* tùy ý.

## 4. Route responsibilities
- `/api/*` → backend; `/i/*`,`/w/*` → backend HTML shell OG; `/media/*` → approved derivatives; admin/app deep links → frontend index fallback.
- `/invitation/*` → frontend app shell nhưng private APIs no-store.
- Personalized entry no-store, no-referrer; edge logs path template `/i/[REDACTED]`, không full original token. Đặc biệt Caddy access log defaults phải review.
- health nội bộ; error pages không leak upstream addresses.

## 5. Health và readiness
DB pg_isready; backend liveness không phụ thuộc DB nhưng readiness có DB/migration readiness; frontend HTTP200; edge TLS test. depends_on chỉ thứ tự/health startup, không thay retry/recovery runtime.
Memory limits và JVM MaxRAMPercentage hợp container; worker PDF bounded; disk alert trước khi full. Restart policy hợp lý; release lỗi không restart-loop vĩnh viễn không cảnh báo.

## 6. Dev và production khác nhau
Dev compose có hot reload, mock assets, fake seed, host ports chỉ localhost; prod immutable images, no dev server, no default account, no DB public port, no debug/stacktrace. Test/staging dùng domain riêng không index, không dữ liệu thật.

## 7. CI/CD dự kiến
1. Lint/typecheck/unit tests.
2. PostgreSQL Testcontainers integration: Flyway+constraints+RSVP concurrency.
3. Frontend E2E với backend thật và fake seed.
4. Dependency/image scan, fail theo severity policy có documented exceptions.
5. Build/push tagged images, snapshot deployment manifest và commit.
6. Backup trước migration → deploy staging → smoke.
7. Owner release approval → prod migrate/deploy → smoke HTTPS/QR/RSVP/admin/download.
8. Nếu fail rollback image với schema backward-compatible hoặc restore theo kế hoạch; không assume Flyway undo tự có.

## 8. Backup
Đề xuất daily PostgreSQL pg_dump compressed, media snapshot, encrypted off-host backup; 7 daily+4 weekly khởi đầu, chốt theo retention privacy. Keys lưu secure backup riêng, index keyId rõ. Mục tiêu RPO≤24h/RTO≤4h là đề xuất phải chứng minh; trước/ngày cưới cần tăng tần suất nếu không chấp nhận mất24h RSVP.

Không copy live postgres data directory làm logical backup tùy tiện. Backup export PDFs không cần lâu dài vì tái tạo được; DB/media/keys là thiết yếu. Snapshot file/DB phải có consistency procedure và manifest versions.

### Restore drill
- Dựng host isolated mới, đúng DB major/images, không gửi link thật ra ngoài.
- Restore DB, media và keys bằng quyền riêng.
- Kiểm invitation token cũ hash+decrypt đúng; redeem token cũ; RSVP totals, media và admin login.
- Regenerate PDF test từ credentials cũ; kiểm timezone/deadline.
- Ghi thời gian, backup ID, checksums, kết quả. Purge test data environment sau.

## 9. Release/runbook
Preflight domain đã final, DNS/TLS, secrets, backup restore, content approved, print test. Deploy cần maintenance ngắn hoặc blue/green nếu thật cần; MVP không promise zero downtime.

Sự cố: DB unavailable → API503, UI không báo success; disk full → disable upload/export, giữ RSVP nếu DB vẫn an toàn; PDF worker stuck → timeout/lease+retry; TLS hết hạn → alert/caddy check; domain mất → liên hệ registrar, không giải quyết bằng đổi token.

## 10. Logging/monitoring
Structured JSON có correlationId, operation, route template, status, latency, jobId; không raw body/cookie/token/name. Alert5xx, DB errors, backup age, disk usage, job failures, cert expiry. Dashboard thống kê khách chỉ admin, metrics ngoài chỉ tổng vô danh.

## 11. Chưa cung cấp
Không có compose.prod.yml/Dockerfile production chạy được trong bộ này. Lý do: cần khởi tạo app, dependency/ports/health/configtree paths thực tế rồi mới viết và kiểm chứng. Ticket trong roadmap yêu cầu tạo đủ file và chạy clean build trước nghiệm thu.

## 12. Vận hành access/tracking v1.1
Host clock/NTP healthy; application timezone UTC, schedule timezone IANA chỉ cho UI input/display. Gate được tính mỗi request bằng DB policy/serverNow, không chạy cron mới mở link. Cron chỉ reminders/cleanup optional.

Staging fake invites có cửa sổ boundary tests; không bật open-tracking analytics bên thứ ba. Close/open emergency bằng admin authenticated; nếu UI lỗi có runbook admin CLI/service command audited, không hướng dẫn UPDATE DB tùy tiện bỏ audit. Gate policies/track history/grant revisions nằm trong DB backup. Redis/queue service vẫn không bắt buộc.

Deploy migrations V5/V6 default preserve access for existing links; Owner nên chủ động close trước khi phát thiệp lần đầu. Secret PIN trong masked request must be redacted cùng token. Scheduled access windows restored đúng khi restore backup; clock checks trước reopen production.
