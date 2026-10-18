# 05 — Thiết kế dữ liệu PostgreSQL

## 1. ERD dạng văn bản
```
weddings 1--N wedding_events
weddings 1--N guest_parties
weddings 1--N guest_groups
party N--N group (guest_party_groups)
party 1--1 invitation (MVP)
invitation 1--N invitation_credentials
invitation N--N event (invitation_events)
invitation_event 1--0..1 rsvp_responses
rsvp_response 1--N rsvp_history
wedding 1--N media_assets/import_batches/export_jobs/audit_logs
```
Một party là một đơn vị được mời, không phải một dòng mỗi người. Một invitation có nhiều buổi, mỗi buổi maxPeople/RSVP độc lập.

## 2. Quy ước
UUID do ứng dụng tạo; timestamp `timestamptz`, UTC; timezone tên IANA trên event; FK/UNIQUE/NOT NULL/CHECK tại DB; optimistic version BIGINT. Trường status dùng varchar + CHECK/migration thay vì enum khó đổi. Số điện thoại text không number. Payload JSONB có schema version, không nhét toàn bộ quan hệ vào JSON.

Ràng buộc cùng wedding: composite FK `(wedding_id,entity_id)` hoặc service validate + DB composite FK nơi cần; chỉ UUID riêng chưa ngăn event của wedding khác. Mặc dù MVP một wedding, không thiết kế API có lỗ hổng cross-parent.

## 3. Bảng nghiệp vụ
### weddings
`id`, `slug` unique, `status` DRAFT/PUBLISHED/ARCHIVED, `default_timezone`, `draft_content` JSONB, `published_content` JSONB nullable, `content_schema_version`, `published_revision`, `version`, `published_at`, created/updated.
Content theo allowlist gồm couple names, greeting defaults, story, hero/media IDs, theme settings, footer; không password/token/PII guest.
Slug/domain không đổi sau phát hành nếu không có kế hoạch redirect.

### wedding_events
`id`, `wedding_id`, `event_code`, `state`, `draft_payload` JSONB, published `title`, `start_at`, `reception_at` nullable, `ceremony_at` nullable, `timezone`, `rsvp_deadline_at`, `venue_name`, `address`, `maps_url`, `capacity` nullable, `invitation_text`, `change_notice`, `published_revision`, `version`, timestamps.
UNIQUE `(wedding_id,event_code)`; UNIQUE `(wedding_id,id)` cho composite FK. Published state requires published start/title/address theo application validation. Deadline ≤start_at (CHECK khi cả hai có). capacity null hoặc ≥1. draft không lộ qua guest DTO. Time order reception/ceremony có validation theo lịch thực, không assume mọi tiệc có lễ.

### guest_parties
`id`, `wedding_id`, `external_ref` nullable, `display_name`, `salutation`, `party_type` PERSON/COUPLE/FAMILY, `phone_ciphertext` nullable, `internal_note` nullable, `status` ACTIVE/ARCHIVED, `version`, timestamps.
Partial unique `(wedding_id,external_ref)` WHERE external_ref IS NOT NULL. Tên không unique. Có thể không lưu phone; nếu lưu dùng encryption field với keyId theo policy. internalNote chỉ admin.

### guest_groups / guest_party_groups
Group `id,wedding_id,name`; unique wedding+name. Join `wedding_id,party_id,group_id`, PK party+group, composite FK kiểm cùng wedding. Tags không cấp quyền event.

### invitations
`id`, `wedding_id`, `guest_party_id`, `state` ACTIVE/ARCHIVED, `auth_revision`, `delivery_status` NOT_SENT/MARKED_SENT, `marked_sent_at`, `marked_printed_at`, `version`, timestamps.
UNIQUE guest_party_id trong MVP. “sent/printed” là Owner tự đánh dấu, không chứng minh gửi/in thực. auth_revision tăng khi thu hồi credential hoặc permissions cần invalidate grant.

### invitation_credentials
`id`, `invitation_id`, `credential_version`, `token_hash` unique (SHA-256 trên token ngẫu nhiên entropy cao), `token_ciphertext`, `token_nonce`, `encryption_key_id`, `state` ACTIVE/REVOKED, `created_at`, `revoked_at`.
Partial unique invitation_id WHERE state=ACTIVE. Token 32 random bytes, URL-safe base64 không padding (~43 chars). Không dùng UUID/tên/phone làm secret. Lookup bằng hash; decrypt chỉ khi admin copy/export hoặc tạo artifact.
Hash đơn thuần không tái xuất QR cũ được; ciphertext AES-GCM với AAD chứa invitationId+credentialVersion, nonce unique theo key. Key ngoài DB; backup có kế hoạch. Token hash không cần password-style slow KDF vì token có entropy ngẫu nhiên cao; admin password dùng adaptive hash.

### invitation_events
`id`, `wedding_id`, `invitation_id`, `event_id`, `max_people`, `state` ACTIVE/REMOVED, `version`, `assigned_at`, `removed_at` nullable.
UNIQUE `(invitation_id,event_id)`. Check max_people≥1 và giới hạn policy tại service. FK composite cùng wedding. Khi removed, giữ rsvp/history, aggregate loại. Cấp lại cần review trạng thái cũ; có thể đặt response reset bằng admin action có history.

### rsvp_responses
`id`, `invitation_event_id` unique, `status` ATTENDING/DECLINED, `total_people`, `guest_note`, `source` GUEST/ADMIN, `version`, `created_at`, `updated_at`.
CHECK `(status='ATTENDING' AND total_people>=1) OR (status='DECLINED' AND total_people=0)`; guest_note length ≤500. MaxPeople liên bảng được validate trong transaction với khóa invitation-event; CHECK thông thường không tham chiếu bảng khác.
Không record nghĩa UNANSWERED, không viết response giả 0 người.

### rsvp_history
`id`, `rsvp_response_id`, `invitation_event_id`, previous/new snapshot JSONB allowlist, `actor_type`, `admin_user_id` nullable, `reason` nullable, `request_id`, created_at.
Ghi transaction cùng response. Không chứa raw credential. Idempotent retry không thêm history khi không change. Record lịch sử chứa ghi chú khách vẫn là PII, policy retention áp dụng.

## 4. Bảng vận hành
- `admin_users`: id, username unique, password_hash, enabled, password_changed_at, version, timestamps; không public guest account.
- Spring Session JDBC tables: dùng migration chính thức khớp dependency, không tự đoán serialization/schema.
- `guest_session_grants`: session_id, invitation_id, credential_id, auth_revision, granted_at, expires_at; composite unique; DB grant gắn session. Server kiểm active mỗi request. Cần purge khi session expires.
- `media_assets`: id,wedding_id,storage_key(unique),mime,width,height,bytes,sha256,kind,processing_status,alt_text,created_at. Derivative keys riêng; không raw original URL trong guest DTO.
- `import_batches`: id,wedding_id,status,file_private_key,checksum,column_mapping,preview_json,expires_at,committed_at,actor_id,version. Preview JSON không trả guest. Staging cleanup.
- `export_jobs`: id,wedding_id,kind QR_PDF/QR_ZIP/GUEST_CSV/RESPONSE_CSV,status,selection_snapshot,layout_json,requested_by,artifact_key,bytes,error_code,lease_until,attempts,created/finished/expires_at. Snapshot có token references không raw plaintext nếu không cần.
- `idempotency_records`: scope,key_hash,request_hash,result_status,result_reference,expires_at; unique(scope,key_hash), không storing huge file. Scope gồm actor/session+operation; same key khác payload →409.
- `audit_logs`: id,wedding_id,actor_id,action,target_type,target_id,details_allowlist,reason,correlation_id,created_at. Redact secrets. DB append-only ở application permission.

## 5. Index theo truy vấn
- event `(wedding_id,state,start_at)`; party `(wedding_id,status,display_name)`; external_ref unique.
- invitation `(wedding_id,state)`; credentials `token_hash` unique và active partial unique.
- invitation_events `(event_id,state)` INCLUDE invitation_id,max_people nếu benchmark có ích; `(invitation_id,state)`.
- rsvp `invitation_event_id` unique; updated_at desc cho recent feed.
- jobs `(status,lease_until,created_at)`; artifact TTL cleanup `(expires_at)`.
- audit `(wedding_id,created_at DESC)`; history `(invitation_event_id,created_at)`.
Không tạo index cho mọi cột. Search tên tiếng Việt nhỏ có thể ILIKE; nếu lớn đo rồi thêm pg_trgm và normalize/unaccent qua migration phù hợp.

## 6. Thống kê đúng
Base set là invitation_events ACTIVE của invitation ACTIVE, party ACTIVE, event đang phục vụ. LEFT JOIN response (một dòng). `invitedParties = COUNT(base)`; unanswered = response null; attending/declined count theo status; confirmedPeople = SUM(total_people WHERE attending).
Không JOIN trực tiếp nhiều tags trước aggregate gây nhân đôi; filter group dùng EXISTS. Không cộng maxPeople làm số đã xác nhận. Nếu hiện “tối đa được mời” = SUM(maxPeople) phải đặt tên riêng.

## 7. Transaction/concurrency
- Tạo invitation+credential+assignments atomic.
- RSVP lock assignment, check event/version, write response/history/idempotency.
- Owner giảm maxPeople hoặc cancel phối hợp lock để không race guest submit.
- Rotate credential transaction revoke+new active+auth_revision++ +invalidate jobs.
- Import commit atomic cho batch giới hạn; tránh giữ transaction trong lúc upload/parse/render PDF.
- File I/O ngoài transaction dài; orphan cleanup và job reference consistency.

## 8. Migration và seed
V1 core tables/constraints; V2 sessions/grants; V3 import/export/audit; V4 indexes/seed config. Seed dev chỉ tên giả. Production bootstrap Owner qua lệnh riêng, không seed credentials trong migration. Flyway migrations đã release không chỉnh sửa, thêm migration mới. Test migration trên PostgreSQL đúng major bằng Testcontainers.

Đây là thiết kế logic; chưa có DDL executable được kiểm thử. Dev phải chuyển thành migration có review, không copy bảng mô tả thành production schema tự động.

## 9. Schema bổ sung v1.1 — access và mở thiệp
### wedding_access_policies
`wedding_id` PK/FK, `mode` MANUAL_OPEN/MANUAL_CLOSED/SCHEDULED, `open_at` nullable, `close_at` nullable, `schedule_timezone`, `allow_tracking` default true, `public_closed_message` plain text nullable, `revision`, `updated_by`, timestamps.
### invitation_access_policies
`invitation_id` PK/FK, `mode` INHERIT/MANUAL_OPEN/MANUAL_CLOSED/SCHEDULED, `open_at`, `close_at`, `schedule_timezone`, `revision`, `updated_by`, timestamps.
INHERIT means no invitation-level time restriction; never overrides global closed. Scheduled requires open_at; close_at null or >open_at. All times timestamptz. CHECKs mode/null rules; DB does not store effective status because it varies with time.

### invitation_pin_protection (P1)
`invitation_id` PK/FK, `enabled`, `pin_hash` nullable, `security_revision`, `updated_at`, `updated_by`; PIN hash adaptive, never ciphertext/plaintext/reveal. Reset not rotate link; old verified grants invalid. Không lấy phone suffix/date làm default PIN.

### guest_session_grants extension
Add `verified_security_revision` nullable, `opened_marker_at` nullable, `opened_policy_revision_global`, `opened_policy_revision_invitation`, `open_sequence` if needed. Grant still credential/auth revision checked per request. No permission granted from engagement rows.

### invitation_open_events
`id`, `wedding_id`, `invitation_id`, `opened_at`, `source` EXPLICIT_OPEN, `session_pseudonym` opaque/HMAC invitation-scoped, `dedup_bucket`, `request_id`, `tracking_schema_version`.
UNIQUE `(invitation_id,session_pseudonym,dedup_bucket)` using defined10-minute UTC bucket; idempotency by actor/session separately. No raw token, IP, full user agent, fingerprint or referrer. Pseudonym is still potentially personal data and purged by policy; not advertised as anonymized. Events never public.

### invitation_engagement_summary
`invitation_id` PK/FK, `first_opened_at`, `last_opened_at`, `recorded_open_count`, `updated_at`. Derivable cache; aggregate transaction/upsert with min/max and increment only for inserted unique event. Summary optional: compute from events initially, add only if measured. Summary retention/reset obeys same privacy policy.

Manual Owner confirmation of receipt in separate fields `receipt_confirmed_by_owner_at`, `receipt_note`; does not set system first_opened_at. “Đã gửi”, “đã nhận theo Owner”, “đã mở hệ thống” remain distinguishable.

Indexes: open_events `(invitation_id,opened_at DESC)`, `(wedding_id,opened_at)`; policies FK/PK already enough, `(open_at)` optional for admin upcoming schedules. Rate limit transient IP counters expire, not use open_events as security log.

Migration V5 access policies default MANUAL_OPEN/INHERIT preserves existing behavior; production owner can close first. V6 open tracking grants/events, backfill older invitations as unknown/no event, never invent historical opened_at. V7 PIN if included. Existing printed QR unchanged through migrations.

### Locking/migration implementation note
Tạo policy row global khi tạo wedding và policy row INHERIT khi tạo invitation, tránh lock vào row chưa tồn tại. Trong RSVP transaction, lấy policy/assignment locks theo thứ tự cố định (wedding policy → invitation policy → credential/security → invitation-event → response); policy update/close dùng cùng thứ tự khi liên quan. Chính sách close commit sau các writes đang giữ lock; writes mới sau close phải deny. Chi tiết lock mode/isolation cần integration concurrency tests trên PostgreSQL, không chỉ unit mock.
