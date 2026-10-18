# 06 — Hợp đồng API dự thảo v1

## 1. Quy ước
Prefix `/api/v1`; JSON camelCase, UUID, ISO8601 instant. Dates response gồm UTC timestamp+timezone, UI format locale vi-VN. Cookie session same-origin. Không API token ở URL query. Idempotency-Key cho redeem/import commit/export create/RSVP. Optimistic version trong payload, 409 khi conflict.

Errors kiểu application/problem+json: `type,title,status,detail,code,fieldErrors,correlationId`. Không stacktrace/token/raw SQL. HTTP 400 malformed, 401 admin chưa login, 403/404 quyền không đủ theo anti-enumeration policy, 409 conflict, 422 business validation, 429 rate-limit, 503 temporary unavailable.

List: page=0,size=50,max=100,sort allowlist; `items,totalElements,page,size`. Filter values bound/query validated. Endpoint trả file dùng Content-Disposition an toàn, no-store, không expose storage path.

## 2. Session và link redeem
| Method/path | Auth | Nội dung |
|---|---|---|
| GET `/session/csrf` | Anonymous | Tạo/đọc session, CSRF token cho request unsafe |
| POST `/auth/login` | Anonymous + CSRF | username/password, rotate session ID; không trả bearer JWT |
| POST `/auth/logout` | Session+CSRF | Invalidate session/grants |
| GET `/auth/me` | Admin | Safe admin identity/role |
| POST `/guest-links/redeem` | Anonymous+CSRF | body token, gate check; trả invitationId+grant tối thiểu hoặc PIN challenge (P1); không đánh dấu mở |
| GET `/guest/invitations/{id}` | Grant+open marker+gate OPEN | Private invitation DTO allowlist |
| GET `/public/weddings/{slug}` | Anonymous | Published public fields only |

Redeem `{ "token": "<opaque-token>" }`. Input exact base64url length/pattern bounded. Token invalid/revoked/not usable đều lỗi generic. Redeem không tạo RSVP hoặc đánh dấu sent/read. Rate limit cả IP và hash token, không log body. Request token chỉ trong memory; frontend replace URL sau redeem. Xử lý session fixation theo framework, khi login rotate ID; session grants tồn tại nhiều invitation nhưng bounded max 20 mặc định.

Guest DTO ví dụ:
```json
{
  "invitationId": "uuid",
  "recipient": {"displayName": "Anh Minh & gia đình", "salutation": "Kính mời"},
  "wedding": {"coupleNames": ["An", "Bình"], "revision": 2},
  "events": [{
    "id": "event-uuid", "title": "Tiệc cùng đơn vị",
    "startAt": "2027-01-10T11:00:00Z", "timezone": "Asia/Ho_Chi_Minh",
    "venueName": "Nhà hàng B", "address": "Địa chỉ minh họa",
    "mapsUrl": "https://maps.google.com/", "maxPeople": 3,
    "rsvpOpen": true, "rsvp": null, "responseVersion": 0
  }]
}
```
UUID strings trong ví dụ là placeholder, phải là UUID hợp lệ khi triển khai. Không trả phone/internalNote/tokenCiphertext/credentialHash/guest list.

## 3. RSVP
| Method/path | Auth | Mô tả |
|---|---|---|
| GET `/guest/invitations/{id}/events/{eventId}/rsvp` | Grant | Response hiện tại hoặc null/version0 |
| PUT `/guest/invitations/{id}/events/{eventId}/rsvp` | Grant+CSRF | Upsert latest response |

Request:
```json
{"status":"ATTENDING","totalPeople":2,"note":"Cảm ơn hai bạn!","expectedVersion":0}
```
Response 200 gồm status,totalPeople,note,version,updatedAt; first create có thể 201 theo contract khóa khi implementation. Chọn nhất quán 200 upsert trong MVP. DECLINED bắt totalPeople=0. Gửi cùng idempotency key/payload → cùng committed result; khác payload →409. Grant invitationId và event assignment phải kiểm cả hai, không chỉ event tồn tại.

Business errors: RSVP_CLOSED, EVENT_CANCELLED, PEOPLE_LIMIT_EXCEEDED, RESPONSE_VERSION_CONFLICT, INVITATION_UNAVAILABLE. Request không được nhận `guestPartyId`, `source=ADMIN`, `maxPeople` từ client.

## 4. Wedding/event quản trị
| Method/path | Ý nghĩa |
|---|---|
| GET `/admin/wedding` | Draft+published summary |
| PUT `/admin/wedding/draft` | Lưu draft content, expectedVersion |
| POST `/admin/wedding/publish` | Validate/copy snapshot, expectedVersion |
| POST `/admin/wedding/unpublish` | Confirm+reason, warning guest links |
| GET/POST `/admin/events` | List/create draft event |
| GET `/admin/events/{id}` | Detail draft/published |
| PUT `/admin/events/{id}/draft` | Update draft/version |
| POST `/admin/events/{id}/publish` | Publish revision/changeNotice |
| POST `/admin/events/{id}/cancel` | Cancel with reason |
| POST `/admin/events/{id}/archive` | Archive, no hard delete referenced rows |
| GET `/admin/preview` | Safe preview DTO from draft, admin only |

All admin writes require CSRF and owner role; event start/deadline/timezone validation; publish returns latest version. Slug/site origin changes after launch require explicit procedure, not casual update.

## 5. Guest, group, invitation
| Method/path | Ý nghĩa |
|---|---|
| GET/POST `/admin/guests` | Filter/paginated list or create party+invitation |
| GET/PUT `/admin/guests/{id}` | Detail/update, optimistic version |
| POST `/admin/guests/{id}/archive` | Archive, invalidate guest access |
| GET/POST `/admin/groups` | List/create labels |
| PUT `/admin/guests/{id}/assignments` | Replace event grants after impact preview/confirm |
| GET `/admin/invitations` | List safe summaries |
| GET `/admin/invitations/{id}` | Detail grants and response, no raw token default |
| POST `/admin/invitations/{id}/link-reveal` | Authorized decrypt, no-store; intentional link copy |
| GET `/admin/invitations/{id}/qr.png` | Stream QR, auth/no-store |
| POST `/admin/invitations/{id}/revoke` | reason+expectedVersion+confirmPrintedImpact |
| POST `/admin/invitations/{id}/rotate` | Explicit new token, revoke old, invalidate jobs |
| POST `/admin/invitations/{id}/delivery-status` | Owner mark sent/printed |

Assignment request `[{eventId,maxPeople}]` plus version/confirmImpact. Backend reports impacted RSVPs before accepting remove or maxPeople decrease. MVP maxPeople default upper limit 20, config Owner-server-side; guests cannot change.

## 6. Import
POST `/admin/imports/preview` multipart file+mapping/options → importId,warnings,errors,normalized row preview (bounded/paginated).
GET `/admin/imports/{id}` → preview/status owner only.
POST `/admin/imports/{id}/commit` with previewVersion/confirmWarnings + idempotency → batch summary.
GET `/admin/imports/{id}/errors.csv` authenticated report. Stale/expired preview →409/410, reupload. Commit atomic, blocking errors reject entire batch.

## 7. QR/export jobs
POST `/admin/export-jobs` body `kind,invitationIds,layout` + idempotency →202 jobId/statusUrl. For CSV response export use explicit eventId/filter snapshot; fields allowlist.
GET `/admin/export-jobs/{id}` → progress/status/totalLabels/pageCount/expiry, not secret storage path.
GET `/admin/export-jobs/{id}/download` → authenticated file; not ready 409, expired 410, invalidated 409.
POST `/admin/export-jobs/{id}/cancel` → best effort cancellation.

Selection is a frozen set of IDs, not arbitrary SQL/filter string. UI filters can be converted server-side to IDs then confirmed. Snapshot sort/layout. Validate invitation IDs belong wedding, active credentials; missing/revoked reject with clear admin error. Limits to cap RAM/CPU/file sizes.

## 8. Dashboard/responses
GET `/admin/dashboard?eventId=...` → per-event counts, confirmedPeople, capacity, asOf.
GET `/admin/responses?eventId=...&status=...&groupId=...` → rows+filteredTotals, globalTotals separate.
PUT `/admin/invitations/{id}/events/{eventId}/rsvp` → Owner override with reason/expectedVersion; source assigned ADMIN by server.
GET `/admin/invitations/{id}/events/{eventId}/rsvp/history` → admin history only.

## 9. Media/settings/audit
POST `/admin/media` bounded multipart; GET `/admin/media`; PUT `/admin/media/{id}` alt/reorder; DELETE unreferenced media only. Public derivatives `/media/{versioned-key}` allowlisted mime, never private exports.
GET/PUT `/admin/settings` safe settings only; POST `/admin/auth/change-password` old/new password+CSRF, revoke old sessions.
GET `/admin/audit` paginated/filtered. GET `/internal/health` reachable internal only or minimized public readiness.

## 10. Headers/security contract
TLS; personalized `Cache-Control: private, no-store`; `Referrer-Policy: no-referrer`; no wildcard CORS with credentials; X-Content-Type-Options nosniff; frame-ancestors none via CSP; cookie Secure/HttpOnly/SameSite=Lax chosen for link navigation UX with CSRF tokens on all unsafe methods.
Rate limits/config values must be measured; return Retry-After on429; never rate-limit entire venue shared Wi-Fi so harshly that all guests are locked out. Do not implement arbitrary URL fetch/proxy endpoint for map/OG.

## 11. Deliverable tiếp theo
Dev chuyển file này thành OpenAPI 3.1 đầy đủ schemas/examples, generate TS client và contract tests. Tài liệu này là contract draft chưa được kiểm chứng bằng server; không tuyên bố có OpenAPI executable.

## 12. Endpoints bổ sung v1.1
| Method/path | Auth | Nội dung |
|---|---|---|
| GET `/admin/access-policy` | Owner | Global policy + computed effective state + serverNow |
| PUT `/admin/access-policy` | Owner+CSRF | Mode/windows/revision, confirmImpact/reason |
| GET/PUT `/admin/invitations/{id}/access-policy` | Owner; CSRF write | Per invitation INHERIT/open/close/scheduled |
| POST `/admin/invitations/access-policy/preview` | Owner+CSRF | Freeze IDs, versions, impact summary, short-lived previewId |
| POST `/admin/invitations/access-policy/apply` | Owner+CSRF | previewId/version+confirm; bounded atomic apply; idempotency |
| POST `/guest-links/verify-pin` | Session+CSRF | P1 challengeId+pin; throttled; establish verified grant |
| POST `/guest/invitations/{id}/open` | Grant+CSRF+gate | Explicit intent, set marker, record minimal event if enabled |
| GET `/admin/invitations/{id}/open-history` | Owner | Paginated minimal open events+limits caveat |
| GET `/admin/link-overview` | Owner | Effective access/filter state and engagement aggregates |
| PUT `/admin/invitations/{id}/pin` | Owner+CSRF | P1 enable/reset/disable with expectedVersion, never returns stored PIN |
| POST `/admin/invitations/{id}/receipt-confirmation` | Owner+CSRF | Separate manual receipt fact, does not mark system viewed |

Policy body example:
```json
{"mode":"SCHEDULED","openAt":"2027-01-01T01:00:00Z","closeAt":null,
 "scheduleTimezone":"Asia/Ho_Chi_Minh","expectedVersion":2,"reason":"Mở cùng ngày gửi thiệp"}
```
Example date/time is fictional. Invitation policy may INHERIT; global may not. Response includes policy/revision, computed status+serverNow, not stale DB enum. Admin preview receives detailed reason, guest receives generic INVITATION_UNAVAILABLE without recipient info.

PIN challenge TTL5 phút, one session-bound challenge, no name/private content; invalid token behaves generically; no credential activated from guessed IDs. PIN checks wrong show generic failure and Retry-After, no permanent per-invitation lock exploitable by bot. Reset updates securityRevision; previous verified grants reverify.

Open endpoint requires no full token; invitationId plus authorized grant, idempotency key and gate. Response `{opened:true,trackingRecorded:true/false,invitationId}` reflects whether server recorded, not proof identity/content read. On tracking disabled, establish marker but do not insert open event. UI next GET private DTO; direct GET without marker denied. Already-open reload checks gate but does not insert event. Idempotency records bounded TTL, request payload cannot supply openedAt/count/actor/name.

Every guest endpoint including RSVP/map detail/ICS (if added), redeem/open/private content checks gate and security revisions. Guest unavailable error generic; serverNow/schedule timezone details only where Owner deliberately exposes public messaging. Policy apply races RSVP resolved by locked policy rows in transaction (or equivalent tested isolation); successful close prevents subsequent new commits that have not passed serialization boundary.
