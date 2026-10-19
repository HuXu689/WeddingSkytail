# 11 — Kiểm thử và tiêu chí nghiệm thu

## 1. Chiến lược
Unit: rules/token/layout. Integration: Postgres migrations/constraints/transactions/security. Component: React forms/states. E2E: guest+admin với fake dataset. Manual: iOS/Android/in-app browser/physical print/restore. Bộ này là kế hoạch test, chưa có kết quả tests đã chạy trên sản phẩm.

## 2. Dataset giả
300 parties; E1/E2; 200 E1-only, 70 E2-only, 30 both (330 invitation-events); labels có dấu, tên dài, tên trùng hợp lệ; tags overlap; maxPeople1/2/3/4; 1 revoked; 1 archived; draft/cancelled event; expired deadline; RSVP attend/decline/unanswered; malicious-looking plain-text names; bad import rows. Không dùng dữ liệu khách thật.

## 3. Test matrix
| ID | Scenario | Expected |
|---|---|---|
| QA01 | Link I1 chỉ E2 | View/DTO chỉ E2 |
| QA02 | I2 cả hai buổi | RSVP độc lập, E1=2/E2=0 đúng totals |
| QA03 | Tamper invitationId/eventId | Không xem/sửa grant khác |
| QA04 | Draft wedding/event | Guest không lấy draft/private fields |
| QA05 | Sửa venue/name sau in | Token unchanged, live info updated, old label warning |
| QA06 | Reload clean URL/session valid | View đúng invitation, không cần token stored local |
| QA07 | Session expired/revoked | Link unavailable/reopen original; old grant blocked |
| QA08 | 2 tabs 2 invitations | Response ghi đúng invitation/event |
| QA09 | Duplicate same RSVP request | Một response, totals/history không nhân đôi |
| QA10 | Concurrent stale version | Một success, stale409, no silent overwrite |
| QA11 | Submit decline after attend | total0, totals giảm đúng, history giữ |
| QA12 | >maxPeople/negative/fraction |422, không commit |
| QA13 | Past deadline/cancel during submit | Transaction policy nhất quán, guest write chặn |
| QA14 | Owner lower max below current RSVP | Chặn hoặc explicit override có reason |
| QA15 | Tags overlap filter | Count/print row không duplicate |
| QA16 | Public generic link | Không guest search/list, không RSVP thật |
| QA17 | Import unknown eventCode/bad file | Preview errors, zero inserts |
| QA18 | Import commit retry | Cùng result, không tạo invitations mới |
| QA19 | Import duplicate names/externalRef | Tên cảnh báo, externalRef xử lý đúng mode |
| QA20 | QR PNG encode/decode | Exact stable canonical URL |
| QA21 | Export same invitation twice | Token/link identical |
| QA22 | PDF 31 labels default |3 trang,15+15+1; blank cells an toàn |
| QA23 | PDF names Vietnamese/long | Fonts embedded, no garbling/truncation silent |
| QA24 | Physical cut/dán/scan | Quiet zone nguyên, mở đúng tên/event |
| QA25 | Revoke during job rendering | Job invalidated/rechecked, no valid download old token |
| QA26 | PDF download anonymous/expired |401/410, no static private path |
| QA27 | QR sheet file forwarded | Documented risk, not promise identity verification |
| QA28 | Crawlers fetching entry | Generic OG, no RSVP/read metrics writes |
| QA29 | Share Zalo/Messenger | Preview acceptable, no recipient PII; cache behavior documented |
| QA30 | XSS-like names/notes | Render plain text, CSP, no script execution |
| QA31 | CSRF/login/session fixation | Unsafe calls rejected without correct CSRF, login rotates ID |
| QA32 | Upload SVG/path traversal/bomb | Reject safely, bounded resources |
| QA33 | CSV =HYPERLINK/+/@ payload | Escaped to avoid formula execution |
| QA34 | Logs/access/APM on /i/token | No raw token/body/cookie anywhere |
| QA35 | DB outage during RSVP |503, no false success; retry/recheck safe |
| QA36 | Worker crash/restart | Lease recovered, no corrupted artifact success |
| QA37 | Restore DB+media+keys | Original link redeem and QR re-export match |
| QA38 | Timezone client different | Display event timezone consistent, deadline server-side |
| QA39 | Admin password change | Old sessions invalidated per policy |
| QA40 | Privacy retention cleanup | Target records/files deleted/anonymized as policy |

## 4. Performance plan (target, not observed result)
Tải giả định: 300–1.000 invitations, 2 events, 50 concurrent guest viewers, 10 RSVP writes/sec burst60s, 1 export job500 labels. Chạy trên host staging ghi CPU/RAM/disk/network/version; không gọi đây là kích thước khách production đã biết.

Metrics: p50/p95 latency, error rate, DB query time, pool saturation, LCP hero, bytes initial, PDF render time/max RSS. Mục tiêu API p95<500ms dưới tải trên, errors<1% loại intentional validation; PDF500 labels hoàn tất trong mục tiêu ban đầu60s nếu host đủ, cần đo/chỉnh; initial page LCP≤2.5s trong mobile lab config chuẩn.

Export không làm RSVP starve; bounded worker và connection pool. Không “tăng heap vô hạn” để giải quyết lỗi file lớn. Cố định dataset/config trước so sánh kết quả.

## 5. Accessibility/mobile
360/390/768/1280px; keyboard focus, screen-reader labels/errors, large tap targets, contrast, reduced-motion; no autoplay audio. iOS Safari/Android Chrome và Zalo/Messenger browser; test cookies/redeem mở từ camera. Album lazy load không đẩy layout event card (CLS kiểm).

## 6. Release gates
G1: FR01–FR14 trace to QA, P0 tickets done.
G2: IDOR/revocation/CSRF/PII-log negative tests pass, no blocker/high unresolved vulnerability without explicit risk acceptance.
G3: A4 print sample và scan vật lý đã duyệt đúng tên/event.
G4: Full restore drill DB/media/keys pass, backup schedule active.
G5: Owner UAT date/time/address/wording/guest list/private settings, domain final+TLS.
G6: Deployment smoke from clean build, release notes và rollback procedure.

Không gửi thiệp thật khi G3/G5 chưa đạt; không production khi G2/G4 chưa đạt.

## 7. UAT Owner checklist
[ ] Hai buổi đúng tên, ngày, giờ, địa điểm.
[ ] Khách đơn vị không thấy nhầm tiệc nhà; khách cả hai có2 RSVP.
[ ] Lời mời lịch sự, tên khách/gia đình đúng.
[ ] Scan trên thiệp giấy thật đúng người.
[ ] Tổng người hiểu là gồm người được mời.
[ ] Sửa venue không đổi QR, cancel có notice.
[ ] Dashboard chưa phản hồi/đồng ý/từ chối đúng dataset đối chiếu.
[ ] File in/CSV không public; Owner hiểu forward-link risk.
[ ] Biết cách backup, restore, thu hồi, sửa thủ công.

## 8. Hồ sơ bằng chứng cần lưu lúc implementation
CI reports, migration tests, redacted security test log, print photos không chứa guest thật, QR decode test results, performance config/report, restore manifest/time, UAT signoff. Không tạo bằng chứng giả trong bộ kế hoạch này.

## 9. Traceability yêu cầu → kiểm thử
| Yêu cầu | Test chính |
|---|---|
| FR01 nhiều sự kiện | QA01, QA02, QA08 |
| FR02 cá nhân hóa | QA01, QA08, QA23, QA24 |
| FR03 link bền vững | QA05, QA20, QA21, QA37 |
| FR04 RSVP chính xác | QA02, QA09, QA10, QA11, QA35 |
| FR05 giới hạn người | QA12, QA13, QA14 |
| FR06 import | QA17, QA18, QA19 |
| FR07 QR hàng loạt | QA15, QA20, QA21, QA25 |
| FR08 PDF in | QA22, QA23, QA24 |
| FR09 export riêng tư | QA26, QA33 |
| FR10 draft/publish | QA04, QA05 |
| FR11 thu hồi | QA07, QA25 |
| FR12 privacy | QA03, QA16, QA26, QA28, QA30, QA31, QA34 |
| FR13 preview chia sẻ | QA28, QA29 |
| FR14 vận hành/restore | QA35, QA36, QA37, QA40 |

## 10. Test bổ sung v1.1
| ID | Case | Expected |
|---|---|---|
| QA41 | Global close/invitation open | Global wins, no private content |
| QA42 | Invitation closed/global open | That invitation denied, others usable |
| QA43 | Scheduled openAt/closeAt boundary | now==openAt allowed, now==closeAt denied; closeAt null no auto expiry |
| QA44 | Client clock/timezone spoof | Cannot open early, server authority |
| QA45 | Close active old session | All protected read/RSVP/ICS denied; already-downloaded data not remotely erased |
| QA46 | Reopen same credential | Same QR, no unintended rotation |
| QA47 | GET shell/OG/redeem only | No open event/count |
| QA48 | Explicit open click+DTO | Marker established, one recorded event if tracking on |
| QA49 | Reload/double-click/retry | Dedup no false increment; marker required for direct DTO |
| QA50 | Link forward/two devices | Session events may differ, no claim unique people/identity |
| QA51 | Owner preview/test | Preview doesn't count; personal link outside owner session caveat |
| QA52 | Tracking disabled or telemetry failure | Rights/open marker intact if authorized; no invented history |
| QA53 | Bulk selection changes after preview | Version/ID checksum conflict, no partial accidental apply |
| QA54 | Close races RSVP transaction | Serializable gate outcome according to commit order |
| QA55 | Schedule/rotation/archive combinations | Credential/publication/status overrides correctly |
| QA56 | Open-history/download auth | Not guest/public; no tokens/IP/full UA/PII unnecessary |
| QA57 | PIN verify/reset/guess P1 | Rate-limit, generic errors, old verified grants invalid, same QR |
| QA58 | Mixed tag/events dashboard | One invitation open status, separate RSVP; no duplicate counts |
| QA59 | Migration existing invitations | No fabricated previous opens, printed QR unchanged |
| QA60 | Data cleanup/reset | Raw events+summary handled consistently, audit, no restore false history |

Traceability: FR15→QA41,42,45,46,55; FR16→QA43,44,54; FR17→QA47–52,56,58–60; FR18→QA53; FR19→QA57; FR20→QA03,07,31,34,41,45,54,55; FR21 P1 worklist UAT via QA58 plus manual message copy checks.

New release gates: T34 completed; scheduled access server clock+timezone UAT; close old-session test; tracking wording/notice reviewed. If PIN included, QA57 pass. Existing release gates still mandatory.

## Bao phủ tự động bổ sung (đợt sửa lỗi 1–3)

| Lệnh | Nội dung | Kết quả |
|---|---|---|
| `cd backend; mvn -B clean verify` | Quy tắc lõi, PDF 15 nhãn/trang, mẫu nhãn `QR_ONLY`/`NAME_QR`, CSV import, bootstrap Owner, retention | 16/16 pass |
| `cd frontend; npm test` | Copy tiếng Việt, hợp đồng nhãn, hợp đồng lớp CSS, thời gian VN, luồng khách | 16/16 pass |
| `cd frontend; npm run typecheck && npm run build` | Kiểu dữ liệu và build production (có route `/admin/print`) | pass |
| `./deploy/smoke.ps1` | Regression session/CSRF/gate/RSVP/restart, thiết kế published, link ổn định | pass |
| `./deploy/verify-dot3.ps1` | Trường buổi tiệc mới, revision + thông báo thay đổi, lý do hủy bắt buộc, bulk policy, báo cáo CSV, mẫu nhãn in + PDF, thiệp khách | 35/35 khẳng định pass |
| `./deploy/verify-dot4-pin.ps1` | PIN: 428 khi chưa xác nhận, 403 mã sai, 429 khi dò liên tục, đổi mã hủy phiên, tắt PIN trả lại quyền, RSVP sau khi xác nhận | 27/27 khẳng định pass |
| `./deploy/verify-dot4b.ps1` | Worklist nhắc RSVP (tách biệt lượt mở), ICS theo cổng truy cập + giờ UTC, nhạc nền theo bản nháp/bản phát hành, chặn xóa tệp đang dùng, đếm ngược | 48/48 khẳng định pass |

- QA53 (bulk selection changes after preview): `verify-dot3.ps1` kiểm tra preview trả `versions`, áp dụng đúng các version đó, xác nhận link trước/sau không đổi, và `INHERIT` bị từ chối ở chế độ hàng loạt.
- QA41–QA46 (open status/tracking): bộ lọc `accessState`/`openFilter` và khối thống kê link được kiểm tra qua API trong cùng script; phần “không cộng lượt mở thành số người” là yêu cầu hiển thị, cần UAT thị giác.
- Mã trạng thái API quản trị khi viết script kiểm thử: vi phạm quy tắc nghiệp vụ → `422` (`ApiErrors.require`), sai `expectedVersion` → `409`, body thiếu/sai trường bắt buộc → `400`. Mọi request tạo hoặc sửa buổi tiệc phải gửi `expectedVersion` trong JSON, kể cả khi tạo mới.
- QA57 (PIN): đã phủ tự động bằng `PinProtectionTest` (chuẩn hoá mã, sinh mã 6 chữ số, băm BCrypt, bộ đếm sai) và `verify-dot4-pin.ps1` (428 khi chưa xác nhận, 403 mã sai với thông báo chung, 429 khi dò liên tục, đổi mã/tắt PIN hủy phiên đã xác nhận, QR không đổi).
- QA58 (nhắc RSVP, FR21): `verify-dot4b.ps1` khẳng định đánh dấu “đã nhắc” không tạo lượt mở, lời mời chỉ rời nhóm “chưa ghi nhận mở” khi khách mở thiệp, và nội dung nhắc soạn sẵn bám đúng buổi tiệc.
- QA59 (tệp lịch): `CalendarFileTest` (UTC, UID, thoát ký tự, gấp dòng ≤75 octet) + `verify-dot4b.ps1` (403 khi chưa mở thiệp, 403 với buổi không được gán, `text/calendar`, DTSTART khớp giờ UTC).
- QA60 (nhạc nền & đếm ngược): `verify-dot4b.ps1` khẳng định tệp không phải nhạc bị từ chối, nhận diện bằng magic bytes, ảnh không dùng được làm nhạc, tệp đang chọn không xóa được, `musicUrl` bản nháp khác bản công khai và chỉ hiện cho khách sau khi phát hành.
- **P1 đã hoàn tất** (PIN, worklist nhắc, ICS, nhạc, đếm ngược). Việc còn lại thuộc P2 trong `docs/10-roadmap-and-backlog.md`.
