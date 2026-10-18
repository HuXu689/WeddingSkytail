# 10 — Roadmap và backlog thực thi

## 1. Phương pháp
Xây vertical slice trước (một lời mời→scan→RSVP→dashboard), rồi import/in hàng loạt, sau đó hardening. Không làm album/animation trước core permissions. Ước lượng dưới đây là dự kiến cho một dev quen Spring+React, không cam kết; nếu đang học, cần thêm thời gian và review.

## 2. Giai đoạn
| Phase | Deliverable/gate | Khoảng công dự kiến |
|---|---|---|
| 0 — Chốt thiết kế | Domain, event/grant rules, privacy, print size, stack exact versions | 1–2 ngày |
| 1 — Foundation | Repo, DB migrations, admin auth, docker dev, CI unit tests | 3–4 ngày |
| 2 — Vertical slice | 2 events, guest/invitation, guest link/redeem, RSVP, totals | 5–7 ngày |
| 3 — Batch operations | Import preview/commit, QR PNG, PDF job/print preview/export | 4–6 ngày |
| 4 — UX/content | Theme mobile, draft publish, media, OG, empty/error states | 3–5 ngày |
| 5 — Hardening/release | IDOR/CSRF/races, physical print, restore, docker prod, UAT | 4–6 ngày |
Baseline v1.0 khoảng20–30 ngày công, không phải20–30 ngày lịch và chưa gồm P1. Bản v1.1 mở rộng access/tracking/bulk cần thêm khoảng4–7 ngày công: tổng dự kiến24–37 ngày công, phải ước lượng lại sau khi chốt UX/PIN/privacy. Không cộng thêm một giai đoạn “code xong rồi mới nghĩ bảo mật”: auth và constraints có từ Phase1/2.

## 3. Tickets
| ID | P | Nội dung | Phụ thuộc | Acceptance |
|---|---|---|---|---|
| T01 | P0 | Chốt ADR/domain/print/RSVP policy | — | docs12 items bắt buộc đã đóng |
| T02 | P0 | Repo Spring/React/CI/version locks | T01 | clean build/test thành công |
| T03 | P0 | PostgreSQL+Flyway+schema constraints | T02 | migration fresh DB+integration pass |
| T04 | P0 | Admin auth/session/CSRF/bootstrap | T03 | unauth blocked, fixation/CSRF tests |
| T05 | P0 | Wedding draft/publish+event CRUD | T04 | draft private, publish revision đúng |
| T06 | P0 | Guest/group/assignments | T05 | group không cấp quyền; cùng wedding |
| T07 | P0 | Token mint/hash/encrypt/reveal/revoke | T06 | same token re-export, revoke old grants |
| T08 | P0 | Guest shell/redeem/clean URL | T07 | generic OG, multi-tab grant correctness |
| T09 | P0 | RSVP+version+idempotency+history | T08 | double-submit/race/no duplicate |
| T10 | P0 | Dashboard/responses filters | T09 | aggregate tags không nhân đôi |
| T11 | P0 | Import parse/preview/atomic commit | T06,T07 | error line report; retry same result |
| T12 | P0 | QR PNG/copy link | T07 | decode matches link stable |
| T13 | P0 | Export jobs/lease/private download | T12,T04 | restart recovery, ownership, TTL |
| T14 | P0 | PDF grid/font/layout preview | T13 | 15 labels/page, names mapping+scan |
| T15 | P0 | CSV exports/escaping | T10,T13 | totals consistent, formula safe |
| T16 | P0 | Media upload/process/EXIF strip | T04,T05 | mime/decode/path/bomb tests |
| T17 | P0 | Mobile invitation theme/RSVP states | T08,T09,T16 | 360px/accessibility/slow network |
| T18 | P0 | OG shell/share testing | T05,T08 | no guest PII, Zalo/Messenger checked |
| T19 | P0 | Docker prod/secrets/log redaction | T02,T07 | only80/443, no baked secrets |
| T20 | P0 | Backup/restore/operations | T19,T03,T16 | full restore+old QR regenerate |
| T21 | P0 | Security/perf/concurrency regression | T09,T13,T19 | docs11 release gates pass |
| T22 | P0 | UAT/physical print/release approval | T14,T17,T18,T20,T21 | Owner signoff, sample QR print |
| T23 | P1 | Calendar ICS/music/countdown | T22 | no autoplay; timezone correct |
| T24 | P1 | Wishes moderation | T22 | default hidden, sanitize/review |
| T25 | P1 | Editor role/OTP | T22 | threat model+permissions updated |

## 4. Dev handoff theo mỗi ticket
- Clarify acceptance trước code, DTO/API và schema migration đi cùng.
- PR không chứa dữ liệu thật/secrets, tests và screenshot UX nếu cần.
- Related docs update, error messages Vietnamese, authorization tests.
- Không “done” khi chỉ happy path; network/empty/conflict phải xử lý.
- QR/print code có deterministic layout tests và manual print evidence.

## 5. Definition of Done toàn dự án
Clean checkout chạy được theo README implementation; `docker compose` dev/prod hướng dẫn riêng; CI green; migration và rollback procedure; nội dung/permissions đúng hai buổi; link bền; private artifacts; import/export đúng; mobile UAT; restore drill; test in thật; secrets không repo; dependency/licenses review.

## 6. Thứ tự demo cho Owner
Demo1: thêm 2 events+1 gia đình được mời cả hai→scan→2 RSVP→totals.
Demo2: import20 guests→print2 pages→scan đúng tên→sửa venue vẫn đúng QR.
Demo3: revoke old QR/session→security negative cases→backup/restore→deploy staging.
Chỉ phát QR thật sau Demo3 pass và Owner duyệt thông tin.

## 7. Quản lý scope
Nếu cần rút ngắn: bỏ story dài/nhạc/wishes/ICS/QR ZIP và hỗ trợ XLSX; giữ CSV import, PDF in, auth, revocation, stable QR, backup. Không bỏ bảo mật/private files để đổi lấy animation đẹp.

## 8. Backlog bổ sung v1.1
| ID | P | Nội dung | Dependencies | Acceptance |
|---|---|---|---|---|
| T26 | P0 | Policy schema+evaluator global/invitation | T03,T05,T07 | Gate precedence/time boundaries đúng |
| T27 | P0 | Gắn gate vào toàn bộ guest APIs và transaction RSVP | T08,T09,T26 | Close chặn session cũ+race tests |
| T28 | P0 | Link center+bulk preview/apply | T06,T26,T04 | IDs freeze/version/impact/audit |
| T29 | P0 | Explicit open marker+tracking events/dedup | T08,T26,T27 | GET/OG/redeem không tính, no identity claim |
| T30 | P0 | Dashboard open filters/history/notice/privacy | T10,T29 | Per invitation count, multi-event context |
| T31 | P1 | PIN challenge/reset/grant revisions | T07,T26,T27 | Không plaintext, throttle/reset tests |
| T32 | P1 | Reminder worklist/message copy | T30 | No autosend; state distinctions |
| T33 | P1 | Owner receipt confirmation/change notices | T28,T30 | Manual fact separate from tracked opening |
| T34 | P0 | Access+tracking E2E/security/clock/regression | T27,T28,T29,T30 | QA41–QA56/QA58–QA60 pass |

T22 release/UAT phải đợi T34 cho scope v1.1; baseline T22 dependencies vẫn giữ nhưng chưa đủ. Nếu include PIN, T22 cũng đợi T31 và QA57. Không đưa P1 vào scope mà không cập nhật thời gian.

Demo4 v1.1: close global → QR scan không lộ recipient → schedule open → click open recorded → close same session blocked → reopen same QR usable → admin filter opened/no response. Preview test không tạo event.
