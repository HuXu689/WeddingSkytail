# PLAN_TASK_FEATURES — Bản đồ, lịch cưới, RSVP, lời chúc và hộp quà QR

> CHECKPOINT 2026-10-21 00:06 +07:00: F01–F04 DONE trong phạm vi đã ghi. F04 GuestDisclosure đã dùng cho form lời chúc, keyboard/mobile/desktop/reduced-motion browser PASS; FE 135/135. F05–F13 TODO; RSVP/CTA chưa đổi, API map/feed/gift chưa nối UI. Không migrate/deploy stack wedding đang dùng.
> Đặt file này ở thư mục gốc website. Đây là kế hoạch thực thi và nơi lưu tiến độ cho nhiều phiên AI coding.
> File liên quan nếu đã có: `PLAN_TASK.md` — kế hoạch thiết kế và cá nhân hóa các section thiệp cưới. Không tự đánh dấu task trong file đó là hoàn tất.

## 0. Cách chạy

1. Sao lưu trạng thái hiện tại bằng quy trình dự án đang dùng; mở AI coding tại repository.
2. Đặt file này ở gốc dự án, gửi **Prompt bắt đầu** bên dưới.
3. AI phải khảo sát hiện trạng, bổ sung đường dẫn thật và triển khai từng task nhỏ.
4. Cuối mỗi task và trước khi dừng phiên, AI cập nhật trạng thái, bằng chứng test và Handoff trong file này.
5. Khi phiên bị ngắt, mở phiên mới, gửi **Prompt tiếp tục**. Không cần nhớ cuộc chat cũ.
6. File kế hoạch giúp phục hồi công việc, không bảo đảm tiến trình vẫn chạy khi công cụ hoặc máy dừng. Code trên đĩa, cơ chế lưu dữ liệu và checkpoint mới là cơ sở tiếp tục.

### Prompt bắt đầu

```text
Bạn là Senior Product Designer + Full-stack Engineer + QA có tư duy bảo mật và bảo vệ dữ liệu cá nhân. Hãy đọc PLAN_TASK_FEATURES.md tại gốc repository. Nếu có PLAN_TASK.md, đọc thêm để giữ đồng bộ theme, schema, quyền public/private và những thay đổi đang dở.

Hãy hoàn thiện website thiệp cưới hiện tại theo các yêu cầu:
1. Hiển thị bản đồ trực quan ngay trên thiệp, không chỉ một liên kết địa chỉ.
2. Hiển thị lịch tháng giống tấm lịch bình thường, đánh dấu ngày cưới/sự kiện và xem chi tiết ngay trên web.
3. Thu gọn form xác nhận tham dự và gửi lời chúc; chỉ mở khi khách chủ động thao tác. Chọn accordion hoặc dialog/bottom sheet theo hiện trạng, accessibility và trải nghiệm mobile.
4. Khách có thể xem toàn bộ lời chúc đã được duyệt; chủ thiệp có thể quản lý lời chúc nào được hiển thị.
5. Có hộp quà mừng với hiệu ứng mở tinh tế; mở ra thấy một mã QR chung hoặc hai mã riêng cho cô dâu/chú rể, tùy cấu hình.
6. Mọi phần có giao diện nhất quán, đẹp, chuyển động sinh động nhưng nhẹ, và có thể triển khai nhiều phiên nhờ checkpoint rõ ràng.

Trước khi sửa, khảo sát stack, routes public/private/admin, schema, API, persistence, permission, map/calendar/form hiện có, thư viện UI và test. Dẫn chứng đường dẫn file thật; không giả vờ đã đọc code hay chạy kiểm thử. Không in secret, token mời, thông tin tài khoản ngân hàng hay dữ liệu khách thật vào log hoặc tài liệu.

Giữ framework và luồng sản phẩm đang hoạt động. Không rewrite toàn website, không thêm thư viện nặng hoặc dịch vụ trả phí khi chưa cần. Nếu yêu cầu phụ thuộc billing/API key, triển khai phần không bị chặn, ghi BLOCKED chính xác, không tự tạo tài khoản hoặc kích hoạt thanh toán. Dữ liệu riêng phải được lọc tại server/API hoặc cơ chế bảo vệ thật của nền tảng, không gửi toàn bộ rồi ẩn bằng frontend.

Đầu ra không phải chỉ là một bản đề xuất: cập nhật kế hoạch bằng kết quả khảo sát, rồi triển khai code theo task đủ dependency, chạy kiểm tra và ghi checkpoint sau từng task. Không tự commit, push, deploy, chạy migration production, xóa dữ liệu hoặc thay đổi thông tin nhận tiền nếu chưa được yêu cầu.

Không tự điền ngày cưới, tọa độ, địa chỉ, lời chúc giả, số tài khoản hay mã QR thật. Mock chỉ dùng ở fixture/dev có nhãn rõ và không xuất bản như dữ liệu thật. Không tuyên bố đã nhận tiền từ việc khách mở hoặc tải QR. Không tự xây cổng thanh toán.

Nếu thiếu thông tin không chặn tiến độ, làm phần khung/config rỗng an toàn và ghi giả định. Nếu thiếu quyết định về quyền, dữ liệu nhạy cảm hoặc thao tác không thể hoàn tác, ghi BLOCKED và hỏi đúng vấn đề; tiếp tục task độc lập khác.

Khi sắp hết phiên, không bắt đầu refactor lớn. Lưu thay đổi an toàn, cập nhật Task Ledger, Test Log và Handoff. Bắt đầu bằng khảo sát, điền Project Snapshot và triển khai F01.
```

### Prompt tiếp tục / khôi phục phiên

```text
Tiếp tục công việc theo PLAN_TASK_FEATURES.md. Đọc Project Snapshot, Task Ledger, Decision Log, Test Log và Handoff; đọc PLAN_TASK.md nếu có phần liên quan. Kiểm tra git status, git diff và file đang sửa trước khi thay đổi.

Đối chiếu trạng thái đã ghi với code thật. Không tin task DONE nếu không có bằng chứng phù hợp; không làm lại task DONE đã xác minh. Nếu phiên trước dừng bất ngờ, phục hồi task IN_PROGRESS từ diff và trạng thái database/dev thực tế; không chạy lại migration/seed/mutation một cách mù quáng.

Tóm tắt ngắn trạng thái rồi tiếp tục task đang dở hoặc task TODO đã đủ dependency. Không ghi đè thay đổi người dùng, không triển khai song song hai kế hoạch cùng đụng schema/component nếu chưa điều phối. Sau mỗi task cập nhật file này. Không tự commit/push/deploy hoặc thao tác dữ liệu production.
```

## 1. Phạm vi, ưu tiên và không mở rộng tùy tiện

### Phải có

- Map hiển thị được ở trang thiệp, có marker/địa chỉ và mở chỉ đường.
- Lịch tháng nội tuyến, đánh dấu ngày sự kiện, có danh sách/chi tiết tương ứng.
- RSVP và lời chúc gọn ở trạng thái mặc định, dễ mở và dễ đóng.
- Danh sách lời chúc đã duyệt có phân trang hoặc tải thêm để xem hết.
- Admin quản lý duyệt, ẩn, ghim lời chúc; trạng thái có bằng chứng lưu thực tế.
- Hộp quà có thể bật/tắt; cấu hình một QR chung hoặc hai QR riêng.
- Hoạt ảnh tôn trọng reduced motion, responsive và keyboard.
- Giữ quyền công khai/riêng tư cho địa điểm, lịch, lời chúc và quà mừng.

### Ngoài phạm vi mặc định

- Không tích hợp thu tiền, đối soát, ngân hàng trực tiếp hoặc xác nhận chuyển khoản.
- Không tạo tài khoản Google Cloud, bật billing hoặc tạo API key hộ người dùng.
- Không thêm social login, SMS, email gửi hàng loạt, analytics theo dõi khách.
- Không xây hệ quản lý sự kiện hoặc calendar booking đầy đủ.
- Không bắt khách tạo tài khoản nếu website đang dùng lời mời/link cá nhân phù hợp.
- Không thêm bình luận lồng nhau, chat realtime hay reaction chỉ vì có danh sách lời chúc.

### Thứ tự ưu tiên

1. Quyền và dữ liệu đúng, không lộ thông tin, lưu được.
2. Luồng sử dụng hoàn chỉnh, dễ thao tác trên điện thoại.
3. Hướng thiết kế thống nhất, typography và spacing tinh tế.
4. Animation, tối ưu hiệu năng, polish.

## 2. Project Snapshot — điền bằng kết quả khảo sát

> Bảng dưới giữ baseline F01. Cập nhật F03 2026-10-20 23:58: source đã có V24 coordinates và V25 gift_settings/gift_assets cùng API/types; AdminPermissions có owner-only gift guard. Upgrade/persistence/full HTTP đã PASS trên PostgreSQL 17 disposable bằng `scripts/features-persistence-qa.ps1`, không phải stack wedding đang chạy. UI vẫn theo baseline, chưa nối tính năng mới. Xem checkpoint F03 DONE.

| Hạng mục | Kết quả / đường dẫn thực tế |
|---|---|
| Framework, runtime, package manager | `frontend/package.json`: Next 16.4.2 App Router, React 19.3.1, TS ~5.9.3, npm, không có UI SDK. `backend/pom.xml`: Spring Boot 4.1.1, Java target 21, JDBC/Flyway/PostgreSQL. Máy chạy Node 24.15.0/npm 11.12.1/Maven 3.9.9/JDK 25.0.1 (khác Java target, cần CI Java 21). |
| Lệnh dev/lint/typecheck/test/build | Trong frontend: npm run dev/test/typecheck/build; không có script lint. Trong backend: mvn -B -o verify (offline, không khởi động app/migration). `frontend/next.config.ts`: rewrite /api tới backend. |
| Route public / private / admin | `frontend/src/app/w/[slug]/page.tsx`, `i/[token]/page.tsx`, `invitation/[id]/page.tsx`; admin/events, wedding, wishes, media. `GuestController.java`: GET /public/weddings/{slug}, redeem/open/state/PIN, guest invitation, RSVP, calendar. Backend nằm dưới `backend/src/main/java/vn/wedding/invitation/`. |
| Access resolver, cache, session/token | `access/AccessGate.java`: session grant + auth_revision + open marker + PIN + active/archive + thời gian truy cập. `identity/SecurityConfig.java`: session JDBC, CSRF, OWNER/EDITOR, private/no-store, no-referrer. `identity/AdminPermissions.java` + `EditorAccessFilter.java`: giới hạn EDITOR; chưa có vùng quyền gift. `frontend/src/shared/api.ts`: credentials + no-store. |
| Schema và persistence hiện có | `backend/src/main/resources/db/migration/V1__core.sql`: wedding singleton id=1, events, assignments, responses, idempotency, audit. V15 wishes, V17 sections, V19 layout, V22 payload jsonb, V23 timeline. Không phải hệ multi-tenant; không nhận wedding ID tùy ý. Chưa có gift settings/QR storage/coordinates trong schema đã khảo sát. |
| Map / tọa độ / calendar hiện có | `frontend/src/features/invitation/event-tools.tsx`: details opt-in, tờ ngày đơn + Google search link; không iframe, marker hoặc lịch lưới. `features/admin/event-form.tsx`: address/mapsUrl, chưa tọa độ; `admin/AdminService.java:83` chỉ kiểm https://, không allowlist provider. `invitations/CalendarFile.java` + GuestService.calendar: ICS có gate/assignment. |
| Form RSVP / lời chúc / chống spam | `frontend/src/app/invitation/[id]/page.tsx`: RSVP mở sẵn; version conflict + retry idempotency key + khóa double submit. `rsvp/RsvpService.java`: gate, assignment, deadline, max people, version, transaction/idempotency lưu DB. `features/invitation/wish-book.tsx`: form mở sẵn. `wishes/WishService.java`: gate, plain text 2–600 ký tự, tối đa 3 lời chúc/invitation, event assignment; chưa idempotency cho submit wish. Không suy diễn quota thành rate limiter đầy đủ. |
| Danh sách lời chúc và moderation | WishService.approved(id): chỉ lời chúc của invitation đó, LIMIT 20. approvedPublic(): toàn bộ APPROVED nhưng LIMIT 30. Hai renderer `approved-wishes.tsx`/`wish-book.tsx` chỉ slice dữ liệu đã tải → không xem hết. `app/admin/wishes/page.tsx`: duyệt/không hiển thị/sửa/xóa; API queue có page 50 nhưng UI không điều hướng; chưa pin hoặc HIDDEN riêng. V15 mặc định PENDING, revision và moderator/audit có sẵn. |
| Upload ảnh / QR / storage policy | `media/MediaService.java`, `MediaController.java`: local filesystem + media_assets, ảnh decode ImageIO → bounded JPEG; ảnh PUBLISHED đọc qua /media/{id}.jpg không có guest gate. Không tái dùng URL công khai này cho QR riêng. QR nên đường upload riêng, PNG lossless + giới hạn decode, đọc theo quyền và owner-only mutation; chưa triển khai. |
| UI primitives: accordion/dialog/tabs | EventTools dùng details/summary native; `features/admin/ui.tsx` Confirm dùng dialog.showModal, không phải primitive guest đầy đủ. Có preview riêng nhưng chưa shared tabs/calendar. Ưu tiên details cho form để giữ draft và native keyboard; dialog riêng cho gift cần kiểm focus/close/reduced motion. Đây là hướng đề xuất, chưa DONE F02. |
| Theme, font, assets, motion | `frontend/src/features/invitation/design.css`, `design.tsx`, `sections.tsx`, `motion.ts`; globals.css/color-tokens.css: paper/ink/champagne, serif/sans hệ thống, ba theme, container queries, safe-area, reduced motion, reveal fail-open. Giữ renderer chung và schema version 2. |
| Baseline test và lỗi đã tồn tại | Chạy mới: FE 130/130; typecheck và build exit 0; BE verify 74/74 exit 0. Chưa browser QA/API DB/physical QR trong phiên. Không phát hiện failing baseline; không đồng nghĩa đã kiểm đủ quyền runtime. Chi tiết log ở mục 15. |
| Working tree và task của kế hoạch trước đang dở | Trước sửa có 12 file staged (nhạc/media deletion/CSS/tests/scripts/PLAN_TASK.md), PLAN_TASK_FEATURES.md untracked. Giữ nguyên index, không reset/commit. PLAN_TASK.md ghi T01–T20 DONE và thêm checkpoint nhạc/media; Snapshot cũ không phải source hiện tại. Phiên này chỉ thêm test boundary F01 và cập nhật plan features. |

### File map, luồng và rủi ro F01 (2026-10-20)

- Địa điểm: admin/events → EventForm → AdminService create/update/revise (version; sửa địa điểm đã publish cần change notice) → events → assignments JOIN theo invitation → GuestService.view → invitation page/EventTools. Public hiện **không nhận events**; không mở quyền event chỉ để vẽ map/lịch.
- Nội dung: admin/wedding → section-editor.tsx → SectionService.validate/save → DRAFT jsonb → AdminService.publishWedding → PUBLISHED → SectionService.list → WeddingCanvas/sections.tsx. Public lọc PRIVATE và private milestones tại server. Private sections hiện có phạm vi **mọi khách hợp lệ**, không lọc theo assignment từng khách; không dùng nghi lễ PRIVATE chung làm event riêng A/B khi chưa có contract scope.
- Lời chúc: WishBook → WishController.submit → gate + validation → wishes(PENDING) → admin queue/moderate + revision/audit → approved projection. Public DTO chỉ tên/nội dung/thời điểm, không invitation ID, moderator hay pending. Phải phân trang server ổn định theo created_at + id; bổ sung feed riêng thay vì mở rộng payload ban đầu vô hạn.
- Quà mừng: chưa có luồng lưu/đọc. Không nhầm QR thiệp/invitation hoặc thư viện ZXing cho PDF với QR nhận tiền. Cần cấu hình mặc định disabled, single/two, dữ liệu rỗng, xác nhận chủ thiệp, endpoint asset được bảo vệ; chưa tạo migration hay nhập dữ liệu.
- Giao điểm PLAN_TASK.md: giữ schemaVersion 2, thứ tự layout và timeline hiện tại; các mốc trong section và event có thể chưa có cùng ID. F02 phải xác định nguồn lịch thống nhất, không tự ghép bằng tiêu đề/ngày. Test `frontend/tests/sections-contract.test.mjs` hiện cấm iframe trong EventTools: cần thay bằng test allowlist/consent thực chất khi F05 triển khai, không bỏ kiểm tra an toàn.
- Phương án F02 để triển khai tiếp: map iframe provider cố định sau khách đồng ý tải, không arbitrary embed hay SDK/key/billing; địa chỉ search không bảo đảm marker chính xác nên cần tọa độ do chủ thiệp xác nhận. Lịch lấy tập event đã được cấp quyền; public timeline chỉ từ projection public. Form dùng details native để không mất draft, CTA summary RSVP phải mở details trước khi focus. Gift dùng modal native độc lập, asset không public hóa bằng CSS.
- Không đọc .env, không query DB, không redeem link hoặc ghi lịch sử mở thật; không chạy seed, deploy hay migration. `rg` không có trên máy; đã dùng Get-ChildItem/Select-String thay thế.

### Kết quả khảo sát bắt buộc

- Map luồng: editor → validation → lưu → projection theo quyền → trang khách.
- Liệt kê component/routes/schema/API thật cho 5 nhóm tính năng.
- Ghi tính năng đang hoạt động cần giữ; phân biệt có thật với chưa có.
- Kiểm tra điểm giao với PLAN_TASK.md: lịch nghi lễ, quyền khách, theme, editor và schema.
- Lập baseline trước sửa; thiếu môi trường thì ghi NOT VERIFIED, không ghi PASS.

## 3. Hướng giao diện thống nhất

- Kế thừa theme hiện có nếu hợp lý. Nếu chưa có: editorial wedding, nền ivory, chữ nâu mực, burgundy/sage tiết chế, serif tiêu đề có tiếng Việt và sans cho nội dung.
- Mỗi nhóm có chất riêng: map như một địa điểm trên thiệp; calendar như trang lịch giấy; form như lời hồi đáp; wishes như sổ lưu bút; gift như hộp quà nhỏ.
- Dùng chung token spacing, radius, màu, border, shadow và easing, không biến mọi thứ thành card giống nhau.
- Layout gợi ý: lịch trình → lịch tháng/địa điểm → lời hồi đáp → sổ lời chúc → hộp quà. Điều chỉnh dựa trên trang thực tế.
- Tránh đặt iframe, calendar, toàn bộ form và danh sách dài cùng lúc trong một viewport.
- CTA phân cấp rõ: Xác nhận tham dự là chính; Gửi lời chúc và Xem lời chúc là phụ; quà mừng không che lấp thông tin lễ cưới.
- Không tự phát nhạc; không tạo confetti lặp vô hạn, cursor effect hoặc animation toàn màn hình gây lag.
- Motion nhỏ khoảng 150–350ms; hộp quà có thể dài hơn một chút nhưng không trì hoãn mở nội dung. Không yêu cầu người dùng chờ hoạt ảnh mới thấy QR.
- `prefers-reduced-motion`: bỏ rung/lắc/zoom/parallax, giữ tương tác và trạng thái rõ ràng.
- Skeleton giữ kích thước cho map/calendar; font/ảnh/animation lỗi không làm mất nội dung.

## 4. Bản đồ trực quan trên thiệp

### Trải nghiệm mong muốn

- Hiển thị map thật ngay trong phần địa điểm, có marker đúng vị trí, tên địa điểm, địa chỉ và nút “Mở chỉ đường”. Không thay yêu cầu bằng một link text đơn thuần.
- Desktop map đủ rộng, thông tin ở cạnh hoặc phía dưới; mobile khoảng cao 240–320px là gợi ý, không quy định cứng nếu gây khó dùng.
- Với nhiều địa điểm: chọn sự kiện/địa điểm bằng control ngắn gọn; map và địa chỉ luôn khớp. Không mặc định mọi nghi lễ ở cùng một nơi.
- Tên và địa chỉ luôn đọc được ngoài iframe; trường hợp map bị chặn mạng vẫn có thông tin hữu ích.
- Nút chỉ đường mở đích hợp lệ, không kèm token/guest ID từ URL hiện tại.

### Chọn cách tích hợp sau khảo sát

- Nếu dự án đã có map provider hợp lệ, ưu tiên tái sử dụng.
- Nếu cần Google Maps thực: chọn embed/API chính thức phù hợp, tuân thủ điều khoản và attribution; không tự bắt chước nhãn hiệu hoặc dùng screenshot trái phép.
- Phân biệt embed cấu hình thủ công với API cần key/billing theo giải pháp thực tế; không hứa mọi phương án Google đều miễn phí hoặc không cần key.
- Nếu chỉ cần diện mạo bản đồ tương tự và chưa có Google setup, có thể đề xuất provider khác; nêu khác biệt và xin xác nhận nếu đây là thay đổi quan trọng. Không gọi provider khác là Google Maps.
- Không scrape Google Maps, không để URL iframe tùy ý từ input người dùng. Parse/allowlist provider và dựng embed từ dữ liệu an toàn.
- Không đưa server secret key ra client. Browser key nếu giải pháp cần phải giới hạn API/domain; không thể coi browser key là bí mật giấu được.
- Không gọi geolocation hoặc xin vị trí khách tự động. Nút chỉ đường có thể để ứng dụng bản đồ tự xử lý vị trí xuất phát.

### Trường quản trị

- Bật/tắt map; provider theo lựa chọn được hỗ trợ.
- Tên địa điểm, địa chỉ, lat/lng hoặc place ID nếu có, sự kiện liên quan, mức hiển thị.
- Link chỉ đường sinh từ nguồn tin cậy; zoom nếu cần và có giới hạn.
- Cho xem trước marker/địa chỉ; không tự geocode và lưu tọa độ khi kết quả chưa xác nhận.

### Loading, riêng tư và fallback

- Lazy load map ngoài màn hình; nếu chính sách yêu cầu consent, dùng placeholder có nút tải map và giải thích ngắn về bên thứ ba.
- Iframe có title mô tả, loading phù hợp, không giữ keyboard vô lý; CSP/referrer policy tùy provider và kiến trúc.
- Public không nhận tọa độ/địa chỉ của nghi lễ riêng; kiểm tra cả HTML, payload và link chỉ đường.
- Mất mạng/provider lỗi: vẫn hiện địa chỉ, nút mở map nếu dùng được và nút thử lại khi phù hợp; không spinner vô hạn.
- Không bỏ attribution, không tự cache tiles trái điều khoản.

### Done khi

Map hiển thị thật trên mobile/desktop với vị trí đã xác nhận; có fallback; event selector hoạt động; response công khai không chứa địa điểm riêng; không có lỗi key/referrer không được ghi nhận.

## 5. Lịch ngày giống tấm lịch thông thường

### UI và tương tác

- Hiển thị lịch tháng gồm tiêu đề tháng/năm, hàng thứ, lưới 7 cột; không chỉ là countdown hoặc danh sách timeline.
- Mặc định mở tháng có sự kiện gần nhất phù hợp trong thiệp, không mặc định ngày hôm nay nếu đám cưới ở tháng khác.
- Quy tắc mặc định: chọn sự kiện sắp tới gần nhất trong tập được quyền xem; nếu tất cả đã qua, chọn sự kiện gần nhất theo thời điểm hiện tại. Nếu không có sự kiện hợp lệ, ẩn lịch ở thiệp xuất bản và nhắc cấu hình trong editor.
- Tuần bắt đầu thứ Hai nếu giao diện tiếng Việt đang dùng quy ước này; thống nhất với locale hiện có, không đổi âm thầm.
- Ngày có sự kiện có dấu/chip/viền và nhãn rõ, không chỉ đổi màu. “Hôm nay” và “Ngày cưới” là hai trạng thái khác nhau.
- Chọn ngày có sự kiện → chi tiết bên dưới: tên, giờ, địa điểm được cấp quyền; ngày không có sự kiện không gây lỗi hoặc hiện form đặt lịch.
- Có nút tháng trước/sau nếu thực sự cần xem nhiều tháng, và nút “Về ngày cưới” khi hữu ích.
- Nhiều sự kiện cùng ngày: không chồng chữ trong ô; dùng dấu/chỉ báo số lượng và danh sách chi tiết.
- Mobile ô ngày dễ chạm, tên thứ viết gọn, không cuộn ngang toàn trang.

### Dữ liệu và ngày giờ

- Calendar, timeline, map và lời mời dùng chung nguồn sự kiện; không nhập ngày cưới thêm một lần riêng cho calendar.
- Date-only phải giữ nghĩa ngày địa phương, không parse qua UTC làm lùi một ngày.
- Sự kiện có giờ dùng múi giờ cấu hình của sự kiện; dự án cần một quy tắc nhất quán cho Asia/Ho_Chi_Minh hoặc alias được runtime hỗ trợ.
- Không tự dùng ngày giờ xuất hiện trong cuộc chat hoặc đồng hồ hệ thống làm ngày cưới thật.
- Test tháng 28/29/30/31 ngày, tháng bắt đầu Chủ nhật/thứ Hai, chuyển năm và sự kiện qua nửa đêm.
- Không thêm âm lịch nếu chưa được yêu cầu và chưa có nguồn/quy tắc chuyển đổi đáng tin cậy.
- “Thêm vào lịch” là tiện ích phụ nếu dự án đã hỗ trợ hoặc triển khai nhẹ; không thay thế lịch tháng nội tuyến. Export phải giữ quyền và timezone.

### Accessibility

- Nếu dùng date-grid tương tác, thực hiện keyboard/focus theo pattern phù hợp của thư viện đã có; không gắn `role=grid` khi chưa có hành vi tương ứng.
- Ưu tiên nút semantic và danh sách sự kiện đọc được bằng screen reader.
- Nhãn ngày đầy đủ, ngày được chọn rõ; thông báo đổi tháng/chi tiết không quá ồn.

### Done khi

Khách xem được cả tháng và chọn ngày sự kiện ngay trên web; calendar/timeline/map khớp; dữ liệu riêng không lọt vào ngày công khai hoặc export; không lệch ngày.

## 6. Thu gọn RSVP và gửi lời chúc

### Quyết định thiết kế phải ghi lại

- Phương án A — accordion inline: phù hợp form ngắn, giữ ngữ cảnh trang, triển khai ít phức tạp.
- Phương án B — CTA mở dialog trên desktop, bottom sheet/dialog phù hợp mobile: phù hợp trang nhiều nội dung, form dài hơn hoặc cần một điểm tập trung.
- Chọn một pattern chính theo UI có sẵn; không triển khai cả hai đầy đủ chỉ để tăng tùy chọn.
- Khuyến nghị mặc định nếu primitives có sẵn: nút “Xác nhận tham dự” mở dialog/sheet; “Gửi lời chúc” mở một form ngắn riêng hoặc tab có nhãn trong cùng dialog. Không hiểu “tab con” là mở tab trình duyệt mới.
- Nếu dùng tab, hai form phải độc lập về validation/submit; không bắt viết lời chúc để RSVP hoặc RSVP để gửi lời chúc trừ quy tắc sản phẩm đã có.

### Trạng thái thu gọn

- Heading ngắn, một câu mời phản hồi, CTA chính rõ. Không để toàn bộ input chiếm trang khi chưa mở.
- Sau RSVP thành công, hiển thị tóm tắt phù hợp và “Chỉnh sửa xác nhận” nếu hệ thống cho phép; không tiết lộ dữ liệu khách khác.
- Không tự mở modal sau vài giây hoặc mỗi lần scroll.

### Form và hành vi

- Giữ trường RSVP cần thiết theo luồng hiện có: tham dự/không tham dự, tên hiển thị phù hợp, số người nếu cho phép, ghi chú tùy chọn.
- Số người bị giới hạn theo lời mời nếu có; server validate, không chỉ input max.
- Form lời chúc có tên hiển thị và nội dung; thông tin liên hệ chỉ thu nếu thực sự cần, không hiển thị công khai.
- Lưu form đang gõ trong state khi đóng/mở cùng phiên tương tác nếu hợp lý. Không mặc định lưu tên/ghi chú riêng vào localStorage trên máy dùng chung.
- Khi đóng có dữ liệu chưa gửi, cân nhắc cảnh báo hoặc giữ draft trong bộ nhớ; không xóa âm thầm.
- Dialog: focus vào vị trí hợp lý, trap focus, Escape đóng khi không tạo mất dữ liệu bất ngờ, trả focus về nút mở, scroll lock đúng, nội dung vẫn cuộn khi keyboard mobile bật.
- Accordion: nút semantic, `aria-expanded`, quan hệ điều khiển rõ; không nhảy trang bất ngờ.
- Validate inline có label, text lỗi, loading và disabled chống bấm lặp. Chống gửi trùng ở server/persistence khi cần; không dựa chỉ vào disable button.
- Lỗi mạng không làm mất nội dung; retry không tạo nhiều RSVP/lời chúc trùng.
- Thành công lời chúc chờ duyệt phải nói “Đã gửi, lời chúc sẽ hiển thị sau khi được duyệt”, không tự thêm vào danh sách public như đã duyệt.

### Done khi

Trang ban đầu gọn; mở/đóng bằng touch và keyboard tốt; submit thực sự lưu; refresh đúng trạng thái; không bị keyboard che nút gửi trên mobile; RSVP và lời chúc không vô tình gắn bắt buộc với nhau.

## 7. Hiển thị và quản lý lời chúc

### Nghĩa của “hiển thị tất cả”

- Khách có thể xem hết **lời chúc đã duyệt và được phép công khai**, không phải xem toàn bộ dữ liệu thô, chờ duyệt, bị ẩn hoặc lời nhắn riêng.
- Dùng phân trang/cursor hoặc “Xem thêm”, không tải vô hạn toàn bộ database một lần.
- Preview ngắn trên trang có thể có “Xem tất cả lời chúc”; khi mở vẫn truy cập được đầy đủ các trang.
- Lời chúc mẫu chỉ ở dev fixture; trạng thái rỗng thật dùng lời mời gửi lời chúc đầu tiên, không tạo social proof giả.

### Giao diện sổ lưu bút

- Tên hiển thị, nội dung, thời gian nếu phù hợp; hạn chế avatar ngẫu nhiên gây hiểu nhầm.
- Card có nhịp nhẹ hoặc danh sách editorial, không auto-scroll marquee khiến khó đọc.
- Giữ nguyên xuống dòng có kiểm soát; nội dung dài có mở rộng; không ép cắt nội dung mà không xem được tiếp.
- Lời chúc ghim có dấu tinh tế; sort ổn định: pinned trước, rồi ngày theo quy tắc đã chọn, thêm ID làm tie-breaker nếu cần.
- Loading/error/empty rõ; tải thêm giữ vị trí cuộn, chống duplicate giữa các trang.
- Không hiện email, số điện thoại, guest ID, trạng thái RSVP hoặc IP trong public payload.

### Moderation tối thiểu

- Các trạng thái logic: `pending`, `approved`, `hidden`, `rejected` hoặc mapping tương đương hiện có.
- Mặc định lời chúc mới ở `pending`, trừ khi dự án đã có lựa chọn publish ngay được chủ thiệp xác nhận rõ.
- Admin xem theo trạng thái; tìm kiếm tên/nội dung nếu phù hợp quy mô.
- Hành động: duyệt, ẩn sau khi duyệt, từ chối, ghim/bỏ ghim. `pinned` không vượt qua quyền hoặc trạng thái duyệt.
- Nếu cần xóa, có xác nhận; ưu tiên cơ chế có thể phục hồi khi stack hỗ trợ. Không tự thêm nút xóa hàng loạt mặc định.
- Thao tác bulk chỉ thêm khi hữu ích, có quyền và phản hồi số mục thành công/thất bại; không bắt buộc.
- Admin không tự sửa lời chúc rồi trình bày như nguyên văn khách viết. Nếu sản phẩm hỗ trợ biên tập, cần quyết định rõ và lưu dấu vết phù hợp.
- Ghi người/thời điểm duyệt nếu đã có audit framework hoặc triển khai nhẹ phù hợp; không xây hệ audit đồ sộ.
- Đổi trạng thái duyệt phải invalidate cache/feed đúng; lời chúc bị ẩn không tiếp tục xuất hiện ở trang public do cache cũ.

### An toàn và chống spam

- Server validate độ dài và kiểu dữ liệu; render text an toàn, sanitize rich text nếu thực sự hỗ trợ.
- Rate limit theo khả năng nền tảng; honeypot và kiểm tra thời gian gửi có thể bổ sung. Không triển khai rate limit chỉ trong bộ nhớ nếu môi trường serverless khiến nó vô hiệu mà không nêu giới hạn.
- CAPTCHA chỉ khi có nhu cầu và phương án truy cập phù hợp; không thêm dịch vụ bên thứ ba mặc định.
- Public submit không cho client chỉ định `approved`, `pinned`, wedding ID của người khác hoặc tác giả giả mạo từ guest ID tùy ý.
- Nếu có lời chúc riêng theo khách/sự kiện, áp dụng scope tương tự lời mời. Không tự công khai nội dung cũ khi thêm bảng lời chúc mới.

### Done khi

Có đường đi gửi → pending → admin duyệt → public hiển thị → admin ẩn → public biến mất; xem hết bằng pagination; payload chỉ chứa trường cho phép; chống XSS, vượt quyền và gửi trùng đã được kiểm tra.

## 8. Hộp quà mừng và QR

### Trải nghiệm

- Có biểu tượng/hình hộp quà đẹp, CTA “Gửi quà mừng” hoặc “Mở hộp quà”; mở dialog/panel bằng click, không cần hover.
- Hiệu ứng mở nắp/ribbon/ánh sáng nhẹ là tùy chọn; nội dung QR xuất hiện ngay, không đợi animation dài.
- Một QR chung: một panel cân đối. Hai QR: hai tab có label rõ hoặc hai panel desktop; mobile ưu tiên từng panel để QR đủ lớn.
- Nhãn người nhận chỉnh được, không suy đoán giới tính từ vị trí tab; hỗ trợ “Cô dâu”, “Chú rể” hoặc tên riêng do chủ thiệp đặt.
- Lời nhắn lịch sự, không gây áp lực gửi tiền. Không hiển thị số tiền đã nhận hoặc danh sách người tặng giả.

### Quản trị

- Bật/tắt tính năng; mode `single` hoặc `couple`/hai người nhận theo tên schema thực tế.
- Với mỗi người nhận: nhãn, ảnh QR tải lên, mô tả tùy chọn; tên ngân hàng, tên người nhận, số tài khoản chỉ nếu chủ thiệp chủ động nhập và muốn hiển thị.
- Cho phép sắp xếp/thứ tự và xem trước mobile. Chuyển 2 mã → 1 mã không xóa mã còn lại âm thầm.
- Nếu chỉ một QR trong chế độ hai QR, admin thấy cảnh báo; public không render một panel hỏng. Quy tắc publish phải rõ: chặn cấu hình chưa hợp lệ hoặc tự hiển thị một mã theo quyết định đã ghi.
- Trường nhạy cảm chỉ người có quyền sửa; không đưa vào log, test snapshot công khai hoặc placeholder.
- Chủ thiệp tự xác minh QR bằng ứng dụng tin cậy và xác nhận trước xuất bản; AI không được khẳng định người nhận đúng chỉ bằng tên file hoặc ảnh nhìn giống QR.

### Chất lượng mã QR

- Ưu tiên upload ảnh QR thật do chủ thiệp cung cấp. Không tạo số tài khoản/QR thanh toán ngẫu nhiên.
- Không xây QR ngân hàng động nếu chưa có đặc tả chuẩn, dữ liệu hợp lệ và yêu cầu riêng.
- Không đổi màu, cắt mép, bo góc lên vùng mã, đè logo hoặc đưa ornament vào quiet zone.
- Nền và contrast bảo toàn khả năng quét; mã đủ nét, không nén méo; vùng đệm theo chuẩn của mã/nguồn QR, thường tối thiểu 4 module cho QR tiêu chuẩn.
- Kích thước màn hình gợi ý 220–280px khi không gian cho phép; khả năng quét còn phụ thuộc chất lượng ảnh và độ phức tạp mã, phải thử thực tế.
- Không lazy load QR theo cách khiến panel đang mở vẫn trắng lâu; prefetch khi hợp lý và không vi phạm riêng tư.
- Nhấn mạnh kiểm tra tên người nhận trong app ngân hàng trước khi chuyển. Không biến việc quét/tải mã thành một thao tác chuyển tiền tự động.

### Tiện ích và fallback

- Nút tải QR nếu storage/CORS cho phép; fallback mở ảnh rõ ràng thay vì hứa tải nhưng không hoạt động.
- Copy số tài khoản chỉ khi có dữ liệu hợp lệ; thông báo copy thành công/thất bại; không tự copy khi vừa mở hộp.
- Trên một điện thoại, tải ảnh giúp khách chọn ảnh trong ứng dụng hỗ trợ; không hứa mọi ứng dụng đều đọc ảnh QR từ thư viện.
- Không có QR: editor có hướng dẫn; public ẩn CTA hoặc hiển thị thông điệp đã cấu hình, không để icon quà mở ra lỗi.
- Upload giới hạn MIME/size, xác minh phía server theo khả năng storage; tránh SVG/HTML tùy ý. Kiểm tra quyền đọc asset nếu quà chỉ dành cho khách riêng.

### Done khi

Bật/tắt, một/hai mã, đổi mode, mở/đóng, tải ảnh/copy nếu có đều hoạt động; QR thật được chủ thiệp xác nhận có thể quét; không có dữ liệu nhận tiền giả và không có tuyên bố xác nhận thanh toán.

## 9. Dữ liệu và quyền dùng chung

### Mô hình logic tham khảo — không ép đổi schema

```text
Event: id, title, start/end/dateOnly, timezone, locationRef, visibility/accessScope
Venue: id, label, address, coordinates/placeId, provider, eventRef
RSVP: invitationRef, response, permittedGuestCount, note, updatedAt
Wish: id, weddingRef, guestRef(optional), displayName, message,
      moderationStatus, pinned, createdAt, moderatedAt, visibility
GiftSettings: enabled, mode, recipients[], visibility
GiftRecipient: label, qrAssetRef, optional bank details, verifiedByOwner
```

- Calendar, timeline và map dùng chung event IDs; chỉ projection đã cấp quyền mới đi vào trang khách.
- Public DTO không chứa RSVP cá nhân, token, contact, pending wishes, ghi chú admin hoặc QR riêng.
- Admin API và upload phải kiểm quyền chủ thiệp; người quản lý thiệp A không sửa thiệp B.
- Khách A không được gửi/chỉnh RSVP của khách B bằng đổi ID. Có policy rõ nếu public RSVP không gắn danh tính.
- Quyền cho phép đọc QR không đồng nghĩa quyền sửa người nhận; mutation phải bảo vệ riêng.
- Cache public và guest tách đúng; link riêng không vào sitemap/OG metadata; noindex không thay access control.
- Không đưa token vào map/calendar URL bên thứ ba hoặc link tải được công khai ngoài ý muốn.
- Nếu static-only chưa có nơi lưu/moderation/quyền: ghi giới hạn và phương án backend tối thiểu; không trình bày mock localStorage như hệ quản trị production.
- Migration giữ tương thích dữ liệu cũ, có backfill/rollback phù hợp; không tự đưa lời chúc cũ sang approved khi chưa xác định chính sách.

## 10. Kiến trúc và hiệu năng

- Tái sử dụng primitives dialog/accordion/tabs/calendar và form validation hiện có nếu đạt chất lượng.
- Tách component theo trách nhiệm; không tạo một component khổng lồ chứa map, form, moderation và QR.
- Tham khảo trách nhiệm: VenueMap, WeddingMonthCalendar, ResponseTrigger/Dialog, WishForm, WishFeed, WishModeration, GiftBox, GiftDialog; AI phải điền tên/file thật.
- Không nhân đôi public/private renderer làm lệch theme và logic. Dùng data projection đúng quyền ở tầng tin cậy.
- Map load theo nhu cầu, wish feed có pagination, ảnh QR có kích thước dự phòng; không tải thư viện bản đồ nặng chỉ cho một iframe.
- Form submit có idempotency/dedup theo nghiệp vụ khi cần; cập nhật lạc quan chỉ khi phản ánh đúng trạng thái duyệt.
- Lỗi map không làm form hỏng; lỗi wish feed không che calendar; lỗi QR không treo toàn trang.
- Hạn chế animation gây layout/reflow; dùng transform/opacity phù hợp và giữ focus/semantics.
- Mọi URL đầu vào cần validate scheme/provider; không render arbitrary iframe hoặc dangerouslySetInnerHTML từ input thô.

## 11. Task Ledger — thực hiện theo dependency

Trạng thái hợp lệ: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `SKIPPED`.
Chỉ một task triển khai chính IN_PROGRESS mỗi phiên; có thể tiếp tục task độc lập nếu task khác BLOCKED.

| ID | Task | Phụ thuộc | Trạng thái |
|---|---|---|---|
| F01 | Khảo sát, baseline và giao điểm với kế hoạch cũ | — | DONE |
| F02 | Chốt UX, provider map, schema và quyền | F01 | DONE |
| F03 | Contract dữ liệu, persistence, quyền và cache nền | F02 | DONE |
| F04 | Primitives UI, tokens và chuyển động | F02 | DONE |
| F05 | Map: quản trị, hiển thị, chỉ đường và fallback | F03, F04 | TODO |
| F06 | Lịch tháng nội tuyến và liên kết sự kiện | F03, F04 | TODO |
| F07 | Thu gọn RSVP/lời chúc và luồng submit | F03, F04 | TODO |
| F08 | Feed lời chúc và moderation admin | F03, F04, F07 | TODO |
| F09 | Cấu hình QR một/hai người nhận và upload | F03 | TODO |
| F10 | Hộp quà, dialog QR, tải/copy và animation | F04, F09 | TODO |
| F11 | Tích hợp public/private/editor, responsive và a11y | F05–F10 | TODO |
| F12 | Test bảo mật, hồi quy, hiệu năng và sửa lỗi | F11 | TODO |
| F13 | Dọn diff, hướng dẫn vận hành và bàn giao | F12 | TODO |

### F01 — Khảo sát có bằng chứng

- Điền Project Snapshot và các file entry thật; đọc thay đổi đang dở trước khi sửa.
- Chạy kiểm tra baseline khả dụng; ghi lỗi cũ và giới hạn môi trường.
- Kiểm tra tính năng có sẵn để không xây trùng; xác định dữ liệu riêng.
- **Done:** xác định được điểm sửa và baseline cho mọi nhóm tính năng.

### F02 — Quyết định UX và contract

- Chọn accordion hoặc dialog/sheet, pattern lời chúc, vị trí calendar/map/gift.
- Chọn phương án map khả thi, ghi dependency key/billing/consent nếu có.
- Chốt default moderation, visibility và quy tắc QR một/hai mã; không đoán dữ liệu thật.
- **Done:** Decision Log có quyết định, schema mapping và file plan cụ thể.

### F03 — Dữ liệu, lưu và quyền

- Bổ sung types/validation/API/persistence tối thiểu, giữ tương thích.
- Bảo vệ RSVP, wish mutations, moderation, gift editing và asset riêng.
- Chốt cache/invalidation và quy tắc lọc payload; test tenant/guest scope.
- **Done:** có bằng chứng dữ liệu lưu thật và request trái quyền bị từ chối; phần chưa xác minh ghi rõ, không đánh dấu xong toàn bộ.

### F04 — UI foundations

- Tái sử dụng/tinh chỉnh dialog, sheet, tabs, trigger, focus, spacing, reduced motion.
- Kiểm tra một lát cắt trên mobile/desktop trước khi nhân rộng.
- **Done:** có UI render thực tế và keyboard/reduced-motion check; không chỉ CSS chưa dùng.

### F05 — Map

- Nối editor địa điểm với provider/embed hợp lệ, marker và link chỉ đường.
- Thêm lazy load, title, fallback và event selector khi cần.
- **Done:** đạt mục 4, vị trí giả lập/đã xác nhận khớp; dữ liệu thật chưa xác nhận phải được ghi rõ và không publish tự động.

### F06 — Calendar

- Render lưới tháng, selected date, indicator, điều hướng và chi tiết sự kiện.
- Dùng event source chung; xử lý date-only/timezone và tập được cấp quyền.
- **Done:** đạt mục 5, các case tháng/ngày không lệch, không lộ sự kiện riêng.

### F07 — RSVP và gửi lời chúc

- Thay form dài mặc định bằng trigger/pattern đã chốt, bảo toàn fields và persistence.
- Kiểm tra pending/success/error, retry, double-submit, dirty draft và bàn phím mobile.
- **Done:** đạt mục 6; lời chúc chờ duyệt có thông báo đúng và không tự vào feed public.

### F08 — Feed và quản trị lời chúc

- Feed approved-only, pagination stable, empty/error/loading.
- Admin duyệt/ẩn/từ chối/ghim, validate quyền server, cập nhật cache đúng.
- **Done:** luồng pending → approve → visible → hide → invisible chạy được, không lọt dữ liệu riêng.

### F09 — Quản lý QR

- Mode một/hai mã, upload an toàn, preview và quyền chỉnh sửa.
- Xử lý mode đổi qua lại không mất dữ liệu âm thầm; cấu hình thiếu có cảnh báo.
- **Done:** setting lưu/reload đúng; không có QR giả trên public; chủ thiệp có bước xác nhận mã thật.

### F10 — Hộp quà

- Trigger đẹp, animation có reduced motion, QR panel/tabs, tải/copy nếu khả thi.
- Kiểm tra độ nét/quiet zone, một/hai mã, keyboard và lỗi ảnh.
- **Done:** đạt mục 8; quét thật nếu có dữ liệu/chủ thiệp hỗ trợ, nếu không ghi NOT VERIFIED và không khẳng định đã quét.

### F11 — Tích hợp trải nghiệm

- Kiểm tra public, từng khách private và admin qua cả payload lẫn UI.
- Đảm bảo map/lịch đúng cùng sự kiện, CTA không lấn nhau, form/wishes/gift không kéo trang quá dài.
- **Done:** luồng editor → save → reload → public/private khớp, responsive/a11y theo ma trận.

### F12 — QA và sửa lỗi

- Chạy ma trận mục 12 và các scripts thật của repository; kiểm tra diff cuối.
- Sửa lỗi mới, phân biệt lỗi cũ; không che failing test bằng xóa test hoặc ép type bất hợp lý.
- **Done:** không còn lỗi nghiêm trọng trong phạm vi; phần BLOCKED/NOT VERIFIED được báo rõ. Chưa xác minh bảo mật thì không tuyên bố sẵn sàng production.

### F13 — Bàn giao

- Dọn phần thử nghiệm do đợt này tạo; không xóa thay đổi ngoài phạm vi.
- Ghi cấu hình cần thiết bằng tên biến, không ghi secret; hướng dẫn quản lý wish/QR và chạy lại.
- Cập nhật Task Log, Test Log, Decision Log, Handoff; đồng bộ tham chiếu kế hoạch cũ khi cần, không tự nhận task cũ đã hoàn tất.
- **Done:** phiên mới có thể tiếp tục từ repository và file này mà không cần cuộc chat.

## 12. Ma trận kiểm thử bắt buộc

### Fixture an toàn

- Một sự kiện public, một sự kiện riêng A, một sự kiện riêng B; khách A/B khác quyền.
- Hai địa điểm, một địa điểm thiếu tọa độ, một provider lỗi tải.
- Tháng 2 năm nhuận, tháng 30/31 ngày, chuyển tháng/năm, giờ gần nửa đêm.
- RSVP chưa gửi/đã gửi/sửa, count hợp lệ/vượt giới hạn, mạng chậm và retry.
- Wishes pending/approved/hidden/rejected, pinned, tên/nội dung dài, tiếng Việt và input XSS.
- Feed nhiều hơn một trang; thời gian tạo trùng nhau để test sort ổn định.
- Gift off/single/two, thiếu một mã, ảnh lỗi, đổi mode; QR test không mang thông tin tài khoản thật.
- Keyboard-only, reduced motion, thiết bị nhỏ và độ phóng đại trình duyệt.

| Nhóm | Case chính | Bằng chứng yêu cầu |
|---|---|---|
| Map | Marker/địa chỉ/chỉ đường đúng, lỗi mạng và đổi địa điểm | Render + kiểm tra URL/payload |
| Calendar | Lưới tháng, chọn ngày, nhiều sự kiện, tháng nhuận, timezone | Test logic + kiểm tra UI |
| Forms | Mở/đóng/focus, submit/retry, validation, keyboard mobile | Test phù hợp + thao tác thủ công |
| Wishes | Moderation đầy đủ, xem hết, pin/sort, cache sau hide | API/integration + UI |
| QR | Một/hai mã, upload/mode, tải/copy, ảnh lỗi | Test + kiểm tra ảnh/quét khi có |
| Quyền | Public/guest A/guest B/admin A/admin B | Response và mutation access tests |
| An toàn | XSS, arbitrary embed, IDOR, token leak, file upload | Test và rà soát code/payload |
| Responsive | 360, 390, 768, 1024, 1440px; 320px nếu dự án hỗ trợ | Screenshot dữ liệu giả hoặc ghi chú thật |
| A11y | Label, keyboard, focus, dialog, contrast, reduced motion | Công cụ + kiểm tra thủ công |
| Hồi quy | Section cũ, timeline, ảnh, private link và editor | Test liên quan |
| Build | Scripts lint/typecheck/test/build thật | Lệnh + exit code + lỗi còn lại |
| Hiệu năng | Map/libraries/font/images, layout shift, feed dài | Đo cùng điều kiện baseline |

### Ngưỡng nghiệm thu

- Không tràn ngang/cắt giờ/ngày/tên/QR tại viewport đã kiểm tra.
- Không có focus bị mất hoặc bị kẹt trong dialog; background không tương tác khi modal mở.
- Contrast mục tiêu WCAG AA; trạng thái không chỉ dùng màu; vùng chạm chính khoảng 44×44px khi phù hợp.
- Không đưa mọi lời chúc và ảnh QR vào initial response nếu không cần.
- Không thêm SDK bản đồ lớn khi iframe đáp ứng được yêu cầu; không đặt mục tiêu hiệu năng bằng điểm Lighthouse đơn lẻ.
- Chỉ ghi PASS cho kiểm tra đã chạy. Chưa chạy/chưa có key/chưa quét QR phải ghi NOT VERIFIED hoặc BLOCKED.
- Không tuyên bố đã đạt bảo mật tuyệt đối, đúng người nhận tiền hoặc sẵn sàng production nếu chưa có bằng chứng tương ứng.

## 13. Checkpoint nhiều phiên và nguyên tắc phục hồi

### Sau mỗi task

1. Ghi ID/trạng thái, file thật đã thay đổi, bước đã hoàn tất.
2. Ghi lệnh đã chạy/kết quả, manual test, lỗi còn lại.
3. Ghi schema/config/dependency mới và cách chạy nếu có.
4. Ghi bước tiếp theo cụ thể đến file/chức năng, không chỉ “tiếp tục làm đẹp”.
5. Chỉ đánh DONE khi đủ tiêu chí; nếu thiếu key/QR thật/môi trường, tách rõ phần code xong và phần kiểm chứng bị chặn.

### Khi bị ngắt bất ngờ

- Phiên mới kiểm tra diff, task đang dở, tiến trình dev và trạng thái migration trước.
- Không chạy lại seed/migration/upload/moderation bulk nếu chưa biết đã hoàn tất đến đâu.
- Không reset/checkout/xóa file để “về trạng thái sạch” khi chưa được người dùng cho phép.
- Mọi phần không chắc phải đối chiếu code/test, không suy đoán từ lời hứa phiên trước.
- Nếu hai file kế hoạch mâu thuẫn, ghi Decision Log và giải quyết theo yêu cầu mới nhất nhưng bảo toàn thay đổi chưa liên quan.
- Không cần auto-commit để resume; chỉ commit khi người dùng yêu cầu. Nếu có commit, ghi hash thật.

### Mẫu Task Log — thêm sau từng task

```text
Task ID / trạng thái:
Cập nhật lúc thực tế:
Mục tiêu đã hoàn thành:
File đã đọc / sửa:
Schema / cấu hình / dependency thay đổi:
Lệnh kiểm tra + kết quả:
Kiểm tra thủ công + bằng chứng:
Chưa kiểm chứng / blocker:
Điểm dừng nếu đang dở:
Bước tiếp theo cụ thể:
```

### F01 — DONE — 2026-10-20 23:19 +07:00

- Hoàn thành: khảo sát routes/schema/API/UI/persistence/quyền; điền Snapshot và file map cho cả 5 nhóm, xác định dependency và rủi ro; baseline thực tế không ghi DB.
- Đã sửa: PLAN_TASK_FEATURES.md; thêm `backend/src/test/java/vn/wedding/invitation/GuestFeatureBoundaryTest.java` (3 unit tests mock: denied view/calendar/unpublished public không đọc downstream).
- Không đổi production code/schema/dependency/config/nhận tiền; không chạy migration. Không sửa PLAN_TASK.md hoặc 12 file staged có trước.
- Build tự sinh thay đổi import trong frontend/next-env.d.ts; đã đối chiếu diff và khôi phục đúng hai dòng trước phiên, không để lại thay đổi ngoài phạm vi.
- Kiểm tra: FE 130/130, typecheck/build exit 0; BE baseline 74/74, sau thêm test 77/77, verify exit 0; xem Test Log.
- Chưa kiểm chứng: browser mới, database persistence thực tế, endpoint qua filter HTTP thật, Safari/Zalo, marker map, quét QR. Test mock chỉ kiểm sequencing gate, không thay thế E2E quyền.
- Điểm dừng an toàn: F01 hoàn thành; F02–F13 vẫn TODO, chưa có feature mới được công bố.
- Tiếp theo: F02 chốt contract nguồn sự kiện public/private + consent map và gift owner-only; sau đó F03/F04 theo dependency. Không bắt đầu schema lớn khi chưa đủ thời gian kiểm chứng.

## 14. Decision Log

| ID | Quyết định | Cơ sở / giới hạn | Task |
|---|---|---|---|
| DF01 | “Tất cả lời chúc” = tất cả lời chúc được duyệt và có quyền xem | Không công khai pending hoặc dữ liệu riêng | F03, F08 |
| DF02 | Không chọn provider map trước khi khảo sát | Chưa biết tích hợp hiện tại, key và yêu cầu dịch vụ | F01, F02 |
| DF03 | Chọn một pattern form chính, không mặc định xây cả accordion và modal | Giữ trải nghiệm và code gọn | F02, F07 |
| DF04 | QR là phương tiện hiển thị thông tin, không phải hệ xác nhận thanh toán | Ngoài phạm vi cổng thanh toán/đối soát | F09, F10 |
| DF05 | Mỗi task có checkpoint, không phụ thuộc trí nhớ phiên | Khôi phục sau ngắt phiên | Tất cả |
| DF06 | Bảo toàn index có sẵn; không thay schema/runtime trong F01 | Đã có 12 file staged từ công việc trước; F01 chỉ thêm baseline test và plan | F01 |
| DF07 | Không tự đưa event private lên public hay tái dùng media public cho QR riêng | GuestService dùng assignment; MediaController published ảnh không gate; SectionService PRIVATE là scope chung cho khách hợp lệ | F02, F03, F09 |
| DF08 | Form dùng details/summary native, đóng mặc định, draft không unmount; CTA RSVP mở trước khi focus | Không thêm modal cho form dài; giữ idempotency/version hiện có. File: invitation/[id]/page.tsx, wish-book.tsx; F04 tạo guest disclosure và test bàn phím trước F07 | F02, F04, F07 |
| DF09 | Map dùng OpenStreetMap embed từ tọa độ đã xác nhận, không geocode tự động, không key/billing; chỉ tải sau consent | Hiển thị provider attribution và thông báo gửi IP tới OSM; thiếu tọa độ giữ địa chỉ + link an toàn. Không chuyển mapsUrl thành iframe tùy ý. F03 thêm cặp lat/lng nullable (range validation); F05 nối EventForm/AdminService/GuestService/EventTools, giữ change notice khi sửa vị trí | F02, F03, F05 |
| DF10 | Lịch tháng Monday-first; event theo timezone của event, không parse date-only bằng UTC | Thiệp riêng lấy events đã gate/assignment, public chỉ lấy milestone PUBLIC từ SectionService, không suy đoán liên kết giữa hai nguồn. Dùng discriminator event/milestone và ID riêng; chọn ngày mở chi tiết inline, ICS chỉ cho event được mời; không tự publish events | F02, F06 |
| DF11 | Wish feed cursor, 12 mục/lần + lookahead, order created_at DESC/id DESC; whitelist DTO id/display_name/message/created_at | Public chỉ APPROVED và event_id IS NULL; guest thêm event_id thuộc assignment, chỉ PUBLISHED/CANCELLED. Giữ endpoint mine riêng và moderation hiện có; không đổi state dữ liệu cũ. Khi F08 tích hợp, thay cả feed giới hạn cũ, không cộng dồn payload cũ. Frontend dedupe id, reset khi scope đổi, retry cursor, no-store | F02, F03, F08 |
| DF12 | Quà disabled mặc định, single/dual, PRIVATE mặc định; chỉ OWNER chỉnh/xem config, EDITOR không chạm gift endpoints | F03 dự kiến gift_settings singleton revision + gift_assets riêng (không media_assets), draft/published tách biệt, owner xác nhận trước publish. QR PNG lossless, private asset qua gate; public chỉ khi owner chọn PUBLIC rõ ràng. Không tạo QR/nhập tài khoản thật; modal native showModal, Esc/backdrop/close/focus restore, mở có chủ đích và reduced motion | F02, F03, F09, F10 |
| DF13 | Gift PNG lưu bytea riêng trong PostgreSQL, giữ nguyên bytes, tối đa 5 MB và 220–4096px mỗi chiều | Tránh lệch transaction giữa filesystem và DB; không tái dùng JPEG/public media, không thêm dependency. Không tự giải mã/khẳng định người nhận; OWNER xác nhận mỗi lần publish khi enabled. Cần tính dung lượng backup, chưa có cleanup/delete asset trong đợt này | F03, F09 |
| DF14 | Publish gift độc lập với publish nội dung cưới; kiểm cả revision draft và published | Draft thiếu vẫn lưu được nhưng chặn publish enabled nếu thiếu nhãn/QR đang dùng. SINGLE vẫn lưu vị trí thứ hai nhưng không đưa vị trí đó vào DTO/asset guest; tắt gift có thể publish không cần xác nhận QR. Không tự bật PUBLIC | F03, F09 |
| DF15 | Persistence QA opt-in chỉ dùng database trống `feature_qa` trên random localhost port, container PG17 mới/tmpfs | Không dùng compose QA cũ, không đọc .env, không mount volume, không pull image. Script tự stop đúng container random do nó tạo trong finally; test mặc định skip khi không bật env. Kiểm V23→V25 có dữ liệu event synthetic trước upgrade | F03, F12 |

### Checkpoint F02 — DONE — 2026-10-20

- Đối chiếu F01 bằng code GuestService/WishService/GuestFeatureBoundaryTest và report Surefire 3/3; không chạy lại task khảo sát.
- Chốt UX/provider/visibility/schema mapping tại DF08–DF12; vị trí map ở event detail, lịch trước danh sách event riêng hoặc từ timeline public, gift sau nội dung chính trong WeddingCanvas, lời chúc trong cùng canvas để kế thừa theme.
- File triển khai F03: wishes/WishFeedService.java + WishFeedController.java, shared/invitation-features.ts; tiếp theo migration additive cho map/gift và AdminPermissions (không sửa migration cũ). F04 tách guest primitives mới, không sửa Confirm admin đang staged.
- Không cần key/billing. Tọa độ/QR thật chưa được xác nhận chỉ chặn publish nội dung tương ứng, không chặn xây khung an toàn. Không tự chọn PUBLIC cho quà.
- F03 bắt đầu bằng API wish feed độc lập trên schema V15 đang có; chưa ghi DB, không chạy migration. F03 chỉ DONE khi đủ persistence/quyền cho map/gift và có kiểm chứng phù hợp.

### Checkpoint F03 — IN_PROGRESS — 2026-10-20 23:27 +07:00

- Thêm `backend/src/main/java/vn/wedding/invitation/wishes/WishFeedService.java` và `WishFeedController.java`: GET public/weddings/{slug}/wishes và guest/invitations/{id}/approved-wishes; whitelist record DTO, cursor URL-safe giới hạn độ dài/range, 12 + 1 lookahead, tie-break UUID, private/no-store. Guest gate chạy trước parse cursor hoặc query; public yêu cầu wedding published. Không dùng cursor như quyền truy cập.
- Lọc tại SQL: chỉ APPROVED; public chỉ event_id NULL; guest thêm lời chúc của event được assignment và event PUBLISHED/CANCELLED. Không trả invitation ID, event ID, moderator, pending/rejected hoặc RSVP note. Không nhận weddingId do client đưa vào (singleton hiện tại).
- Sửa `WishService.approvedPublic()` để payload public cũ cũng không trả lời chúc gắn event; không đổi state hay schema/dữ liệu cũ. Endpoint guest cũ vẫn chỉ trả lời chúc chính khách và bị giới hạn; F08 sẽ thay bằng feed mới. **Chưa nối feed mới vào UI**, nên chưa giải quyết hoàn chỉnh yêu cầu xem hết lời chúc.
- Thêm `frontend/src/shared/invitation-features.ts`: wire types và hàm tạo đường dẫn encode scope/cursor, cùng `frontend/tests/invitation-features.test.mjs`.
- Test mới `wishes/WishFeedTest.java` (8): SQL scope/whitelist, denied gate, malformed/out-of-range cursor, tuple/tied timestamp, lookahead/exact-page. `WishFeedHttpTest.java` (5): MockMvc standalone 403/422, response no-store/empty DTO và public legacy filter. Mock JDBC, **không** kiểm full SecurityFilterChain/SQL PostgreSQL thực tế.
- Kết quả: BE verify 90/90 PASS BUILD SUCCESS; FE 131/131 + types/build exit 0. Build sinh next-env.d.ts đã khôi phục đúng hai dòng cũ, không để diff ngoài phạm vi.
- Không migration/seed/deploy hoặc mutation DB; chưa xác minh persistence trên database QA. F03 vẫn IN_PROGRESS vì còn map coordinate schema/API validation, gift settings/assets/owner-only và test quyền/persistence thật; F04 chưa bắt đầu.
- Điểm resume: giữ API này, không viết feed thứ hai; tiếp tục phần map/gift F03 trên migration mới sau V23 (kiểm tra lại migration mới nhất trước khi đánh số). Cần environment QA riêng trước test ghi DB, không sử dụng stack có thể chứa dữ liệu thật.

### Checkpoint F03 tiếp — 2026-10-20 23:36 +07:00 — IN_PROGRESS

- Đối chiếu diff trước sửa: đúng 12 file staged cũ + phần wish feed phiên trước; không có migration sau V23, không task IN_PROGRESS khác. PLAN_TASK.md giữ nguyên, không triển khai song song kế hoạch cũ.
- Thêm `backend/src/main/resources/db/migration/V24__event_map_coordinates.sql`: cặp latitude/longitude numeric nullable/range CHECK, không default địa điểm. Trigger xóa marker khi venue/address thay đổi để API cũ không giữ marker sai. **Chưa chạy migration**, chưa đọc/ghi database. Không sửa V1–V23.
- Thêm `wedding/EventLocationService.java`, `EventLocationController.java`: PUT /api/v1/admin/events/{id}/location. Giữ nguyên EventInput cũ; tọa độ yêu cầu đủ cặp/finite/range/confirmed; round 7 số thập phân một lần; clear cả cặp được phép; lock wedding trước event; expectedVersion, no-op không bump, không sửa CANCELLED; đổi/clear marker của event PUBLISHED phải có changeNotice và tăng revision. Audit chỉ ID/actor, không tọa độ/địa chỉ.
- `GuestService.view` chỉ bổ sung lat/lng trong query assignment đã gate; publicWedding không thêm events/tọa độ. shared/invitation-features.ts và admin-types.ts bổ sung types nullable tương thích fixture cũ. Chưa có trường editor/render marker; F05 sẽ nối API riêng này và reload version sau lưu.
- `identity/AdminPermissions.java`: chặn EDITOR toàn bộ /api/v1/admin/gifts trước khi xây gift endpoints. Test role matrix + `GiftPermissionFilterTest` chạy filter thật (EDITOR 403, OWNER qua, event location vẫn là công việc nội dung của EDITOR). Đây không phải test toàn bộ auth/CSRF filter chain.
- Test mới: EventLocationTest 11, EventLocationHttpTest 3, role matrix thêm 1, GiftPermissionFilterTest 3. Backend cuối 108/108 PASS; FE 131/131, types/build exit 0. Lượt đầu test 409 trả 400 do fixture thiếu primitive confirmed trong JSON; đã sửa fixture đủ contract, chạy lại toàn bộ PASS, không nới lỏng validation.
- Build sinh next-env.d.ts đã khôi phục đúng hai import trước phiên; diff không thay file generated. Không commit/stage/deploy/seed.
- **Rủi ro triển khai:** source backend mới query cột V24 nên chỉ được khởi động trong môi trường đã áp dụng V24 theo quy trình được duyệt; không deploy JAR mới vào DB V23. Migration trigger/constraint mới chỉ có kiểm tra source contract, chưa PostgreSQL/Flyway integration. Có docker CLI; psql không có trên PATH; chưa kiểm tra Docker daemon hoặc khởi động stack QA, không coi đó là blocker đã xác minh.
- **Còn lại F03:** gift settings/assets draft/published, upload lossless/gate, persistence thật trên QA biệt lập, full HTTP auth/CSRF; không đánh DONE. Task tiếp theo là gift nền dữ liệu/quyền hoặc chuẩn bị kiểm thử QA cách ly; không làm lại wish feed/map API đã có.

### Checkpoint F03 gift nền — 2026-10-20 23:49 +07:00 — IN_PROGRESS

- Resume đã đọc Snapshot/Ledger/Decision/Test/Handoff, README và phần diff/handoff liên quan PLAN_TASK.md; đối chiếu source map/feed/tests. F01/F02 giữ DONE; không làm lại task cũ hoặc triển khai F04/F09 song song.
- Git thay đổi trong lúc khảo sát: lần status đầu có staged/unstaged/untracked; lần đối chiếu tiếp theo toàn bộ 32 file có trước đã nằm trong index (bao gồm plan/features). Agent không stage/unstage, không hoàn tác index hay chỉnh 12 file nhạc/media cũ. Phần thêm phiên này để ngoài index.
- Runtime: `docker ps` thấy stack wedding frontend/backend/edge/db hiện có (edge 8088/8443), có listener local 5433. Chưa đọc DB/schema history/config secret, chưa xác nhận nội dung môi trường đó; không suy diễn V24 đã áp dụng hay dùng stack này để ghi QA. Không khởi động source mới, seed, migration hoặc mutation database.
- Thêm `backend/src/main/resources/db/migration/V25__gift_settings_and_assets.sql`: gift_assets riêng lưu PNG bytes và metadata kích thước; gift_settings DRAFT/PUBLISHED, disabled + PRIVATE mặc định, mode SINGLE/DUAL, hai recipient, revision, FK và CHECK publish completeness. Không đụng V1–V24 hay dữ liệu cũ. **V25 mới chỉ trên đĩa, CHƯA ÁP DỤNG.**
- Thêm `backend/src/main/java/vn/wedding/invitation/gifts/GiftService.java` và `GiftController.java`: owner-only GET/PUT `/api/v1/admin/gifts`, POST publish/assets, GET asset preview; thêm public/guest gifts và scope-specific asset routes. Service kiểm OWNER trước DB độc lập với filter; guest gate trước đọc settings/bytes; public kiểm wedding published + visibility PUBLIC; chỉ asset của panel đang hiển thị được đọc, không lộ asset draft/second bị giữ ở SINGLE. Gift off/private public DTO không có recipient. PNG responses no-store/private + nosniff/no-referrer.
- Save/publish lock wedding trước settings, kiểm revision, audit chỉ action/target chung/actor. Publish enabled bắt chủ thiệp xác nhận, kiểm đủ panel và asset; không nhận xác nhận là bằng chứng quét hay chuyển khoản. Upload kiểm MIME/signature/decoded PNG/dimensions trước insert, giữ bytes lossless, không crop/recompress và không lưu tên file. Types bổ sung trong `frontend/src/shared/invitation-features.ts`; chưa có UI sử dụng.
- Test mới `backend/src/test/java/vn/wedding/invitation/gifts/GiftServiceTest.java` 18 ca + `GiftHttpTest.java` 4 ca. Toàn BE 130/130, verify exit 0; FE 131/131, typecheck/build exit 0. Lượt chạy đầu terminal wrapper báo đóng/exit 1 dù Maven log BUILD SUCCESS; đã chạy lại verify để lấy exit 0 thật, xem Test Log. Build sinh next-env.d.ts đã trả đúng hai import ban đầu, không để thay đổi generated ngoài phạm vi.
- **Chưa DONE F03:** SQL/Flyway V24/V25 và JDBC bytea binding chưa kiểm PostgreSQL thật; auth/session/CSRF full chain chưa chạy; không browser/scan QR. Cần QA database biệt lập trước nghiệm thu persistence. Chưa nối quản trị QR/gift/map/feed vào UI; không có nội dung nhận tiền thật.

### Checkpoint F03 — DONE nền API — 2026-10-20 23:58 +07:00

- Resume đọc Snapshot/Ledger/Decision/Test/Handoff và phần PLAN_TASK.md liên quan; Git/index giữ nguyên như checkpoint, không có thay đổi runtime nào được tự phục hồi. Không làm lại F01/F02 hoặc chạy song song task schema/UI.
- Thêm `backend/src/test/java/vn/wedding/invitation/FeaturePersistenceIntegrationTest.java`: opt-in JUnit dùng dependencies đã có, Flyway/JdbcTemplate thật và HttpClient tới Spring Boot/Tomcat thật (không mock filter/security/session). Từ chối database có table public; guard URL chỉ `jdbc:postgresql://127.0.0.1:<port>/feature_qa`. PNG sinh bằng ImageIO không phải QR/người nhận thật.
- Thêm `scripts/features-persistence-qa.ps1`: PostgreSQL 17 image đã cached, random container + port loopback, tmpfs, không volume/.env/pull; fixture credentials không phải secret thật. Tạo đúng môi trường QA mới mỗi lần, finally stop --rm container của lần gọi; kiểm sau chạy không còn container label wedding.feature-qa=disposable. Không đụng các stack wedding/wedding-qa có sẵn hoặc listener 5433.
- PASS: Flyway V1–V23 → thêm fixture event → app upgrade V24/V25; old event vẫn null coordinates, constraint cặp/range, trigger clear khi đổi địa chỉ, map API notice/version/revision; gift disabled/private defaults, FK/completeness; upload bytea giữ bytes PNG; draft không đổi live; stale revision bị từ chối; xác nhận publish; SINGLE giữ second trong draft nhưng guest/public không đọc asset đó; public PRIVATE không lộ dữ liệu; restart app xác nhận config/PNG giữ nguyên và Flyway no migration necessary.
- PASS HTTP thật: anonymous admin 401, EDITOR config/asset/publish 403, OWNER publish thiếu CSRF 403 và DB không thay đổi; guest chưa redeem/open 403; asset không được chọn 403; PIN yêu cầu 428 rồi verify 200; lịch mở tương lai/archive/revoke chặn; unpublished chặn public; feed SQL thực 12+3 public và 12+4 guest với thời gian trùng, không trùng ID và không lộ event khác/pending; wish thiếu CSRF và trái assignment bị từ chối không thêm dữ liệu.
- Lượt chạy đầu lỗi fixture thiếu `event_code` V6, đã sửa fixture (không sửa schema). Lượt mở rộng có assertion mong 403 nhưng WishService chủ ý dùng validation 422; đã đối chiếu service và chuyển kiểm trước feed fixtures để xác minh đúng assignment thay vì vướng quota. Final script exit 0/PASS (1 integration scenario), không hạ bảo vệ hay sửa production code để test qua.
- Backend regression `mvn -B -o verify`: 131 discovered, 130 chạy PASS, 1 integration opt-in skip đúng thiết kế; exit 0. FE source không đổi phiên này, giữ bằng chứng 131/131 + typecheck/build exit 0 phiên gift, không tuyên bố đã chạy lại FE.
- **Kết luận:** F03 DONE chỉ phần contract/API/persistence nền đã có bằng chứng. Không nhận toàn feature DONE: UI F04–F13 chưa làm; browser/thiết bị/quét QR và perf/concurrency sâu là F11/F12. RSVP/moderation hiện có giữ nguyên, baseline tests không thay nghiệm thu lại toàn bộ product. Database wedding đang dùng chưa migrate hay được kiểm nội dung trong phiên.
- Tiếp theo F04 (UI foundations) theo DF08 và DF12; đọc component/CSS/browser harness rồi triển khai một lát cắt và kiểm keyboard/reduced-motion. F09 UI quản trị quà còn TODO dù backend đã hoàn thành.

### Checkpoint F04 — DONE — 2026-10-21 00:06 +07:00

- Đọc Snapshot/Ledger/Decision/Test/Handoff, PLAN_TASK.md T21/T22 và diff cached/uncached; F01–F03 có source/log đúng checkpoint, không chạy lại migration hay integration. Giữ index và tất cả thay đổi có trước.
- Thêm `frontend/src/features/invitation/guest-disclosure.tsx`: details/summary native đóng mặc định, children luôn mounted, không custom role/aria-expanded/state gây lệch semantic; title/hint và dấu trang trí aria-hidden. Dùng font/màu/hairline hiện có, min-height 56px, focus-visible và motion 160ms trên transform của dấu mở; reduced motion transition none. CSS thêm cuối design.css, không ghi đè thay đổi staged cũ.
- Áp dụng lát cắt thật trong `wish-book.tsx`: form + trạng thái/mine trong disclosure; approved feed ở ngoài luôn hiển thị; không đổi API/submission/moderation. RSVP/CTA chưa thay (F07); dialog mới hoãn F10 khi gift UI có ngữ cảnh thật, không tạo primitive không dùng hay rewrite lightbox đang hoạt động. F04 hoàn tất lát cắt native theo DF08, không tuyên bố mọi primitive tương lai đã hoàn tất.
- Thêm `frontend/tests/guest-disclosure.test.mjs` (3 test SSR/contract/CSS); mở rộng `scripts/invitation-review-qa.mjs`: keyboard Enter/Space bằng CDP, Tab vào tên, đóng không Tab vào form, draft giữ nguyên, 320/768/1440 không overflow, reduced motion, screenshot disclosure-*.png.
- Browser phát hiện audit lấy rect của descendant trong details đóng dù không được paint: sửa `scripts/contrast-audit.mjs` dùng checkVisibility(), thêm regression trong `frontend/tests/contrast-audit.test.mjs`. Không tắt ngưỡng contrast hay bỏ case đang hiển thị. Lượt đầu keyboard CDP thiếu text Enter và visibility assertion dựa rect không đúng đã sửa harness, không sửa native semantics để né test.
- Kiểm tra cuối FE 135/135, typecheck exit 0; build exit 0 trước thay đổi test/audit cuối (production UI không đổi sau build). Browser toàn script PASS exit 0, gồm disclosure + hồi quy RSVP/lightbox/sections/contrast. Đã xem screenshot disclosure-320.png và disclosure-1440.png, focus outline rõ, form đầy đủ. Ảnh và report tại `.qa-artifacts/invitation-review/`, log `features-f04-*.log`.
- Chạy Next production build local port 3000 bằng PID 25748, backend API được browser fixture intercept, không đăng nhập/ghi dữ liệu thật; không dùng stack 8088. Khôi phục đúng 2 import next-env.d.ts do build sinh. Không thêm dependency, sửa schema/backend, stage/commit/push/deploy. Chưa Safari/Zalo/screen reader thật; browser evidence không là WCAG certification.
- Tiếp theo F05 map theo F03/F04; F07 cần tái dùng GuestDisclosure cho RSVP và mở trước focus CTA, giữ idempotency/draft. Không làm lại F04 đã xác minh.

## 15. Test Log

| Task | Lệnh / thao tác thật | Kết quả | Giới hạn / lỗi |
|---|---|---|---|
| F01 baseline FE | Trong frontend: `npm test` | PASS 130/130, exit 0 | `.qa-artifacts/features-f01-frontend-test.log`; đa số test source contracts, không thay browser QA |
| F01 types | Trong frontend: `npm run typecheck` | PASS exit 0 | `.qa-artifacts/features-f01-typecheck.log` |
| F01 build | Trong frontend: `npm run build` | PASS exit 0 | `.qa-artifacts/features-f01-build.log`; không deploy |
| F01 baseline BE | Trong backend: `mvn -B -o verify` | PASS 74/74, exit 0 | `.qa-artifacts/features-f01-backend-verify.log`; JDK 25 target 21, chưa chạy Java 21 trong phiên |
| F01 mới | Trong backend: `mvn -B -o verify` sau thêm GuestFeatureBoundaryTest | PASS 77/77, exit 0 | `.qa-artifacts/features-f01-backend-final.log`; mock JDBC/gate, không DB hoặc HTTP thật |
| F01 công cụ | Lượt đầu chạy có `exit $result` | Tool báo terminal closed/code 1 dù log runner có kết quả thành công | Đã chạy lại bằng cmd /c và in exit code, kết quả thật ở các dòng trên; không lấy lần lỗi wrapper làm PASS |
| F01 UI/API thực tế | Chưa chạy browser hoặc ghi DB | NOT VERIFIED | Không mở link khách thật; không seed/migrate/publish |
| F02 | Đối chiếu code/routes + quyết định DF08–DF12 | DONE | Task quyết định; không coi là UI/persistence đã triển khai |
| F03 BE | backend: `mvn -B -o verify` | PASS 90/90, BUILD SUCCESS | `.qa-artifacts/features-f03-backend-final.log`; WishFeedHttpTest 5/5 + WishFeedTest 8/8, standalone MockMvc/mock DB, chưa full security chain hoặc PostgreSQL |
| F03 FE | frontend: `npm test`, `npm run typecheck` | PASS 131/131, types exit 0 | `.qa-artifacts/features-f03-frontend.log`, `features-f03-types.log` |
| F03 build | frontend: `npm run build` | PASS exit 0 | `.qa-artifacts/features-f03-build.log`; chưa browser, không deploy |
| F03 map lần đầu | backend: `mvn -B -o verify` | FAIL 1/105 | `.qa-artifacts/features-f03-map-backend.log`; JSON fixture thiếu confirmed gây 400 trước 409, đã sửa fixture |
| F03 map cuối | backend: `mvn -B -o verify` | PASS 108/108, exit 0 | `.qa-artifacts/features-f03-map-verified.log`; có service, MockMvc binding và permission filter tests; chưa PostgreSQL/full security chain |
| F03 map FE | frontend: `npm test`, `npm run typecheck`, `npm run build` | PASS 131/131, types/build exit 0 | `.qa-artifacts/features-f03-map-frontend.log`, `features-f03-map-types-final.log`, `features-f03-map-build.log` |
| F03 V24 | Chưa chạy SQL/Flyway hoặc database QA | NOT VERIFIED | Không áp dụng vào database nào; source contract test không chứng minh trigger thực thi |
| F03 gift backend cuối | backend: `mvn -B -o verify` | PASS 130/130, VERIFY_EXIT=0, BUILD SUCCESS | `.qa-artifacts/features-f03-gift-verified.log`; 18 service + 4 MockMvc tests mới, JDBC mock, không full security/SQL |
| F03 gift frontend | frontend: `npm test` | PASS 131/131, fail 0 | `.qa-artifacts/features-f03-gift-frontend.log`; lần wrapper đầu bị đóng sau output, dựa vào summary test, không gán exit 0 cho wrapper |
| F03 gift types/build | frontend: `npm run typecheck`, `npm run build` | TYPECHECK_EXIT=0, BUILD_EXIT=0 | `.qa-artifacts/features-f03-gift-types.log`, `features-f03-gift-build.log`; không browser/deploy |
| F03 gift SQL/HTTP security | V24/V25 PostgreSQL/Flyway + full auth/CSRF chưa chạy | NOT VERIFIED | Không dùng database đang chạy để thử migration/mutation; unit/standalone HTTP không thay thế persistence/integration |
| F03 persistence/security final | `./scripts/features-persistence-qa.ps1` | PASS, exit 0; 1 integration scenario, 0 failure/error/skip | `.qa-artifacts/features-f03-persistence-final.log`, Flyway upgrade V23→25 + real JDBC/HTTP/auth/CSRF/session + restart; thay thế NOT VERIFIED ở trên cho phạm vi cases đã liệt kê |
| F03 regression resume | backend `mvn -B -o verify` | PASS exit 0; 131 discovered, 130 passed, 1 opt-in skipped | `.qa-artifacts/features-f03-resume-verify.log`; integration chạy riêng, không gọi 131/131 PASS khi có skip |
| F04 FE cuối | frontend `npm test`, `npm run typecheck` | PASS 135/135, TEST_EXIT=0, TYPECHECK_EXIT=0 | `.qa-artifacts/features-f04-test-final.log`, `features-f04-types-final.log` |
| F04 build | frontend `npm run build` | BUILD_EXIT=0 | `.qa-artifacts/features-f04-build.log`; UI source dùng cho browser, sau build chỉ đổi test/audit harness |
| F04 browser | `node scripts/invitation-review-qa.mjs` | BROWSER_EXIT=0, PASS | `.qa-artifacts/features-f04-browser.log`; report.json có disclosure keyboard/Tab/draft/reducedMotion; screenshots 320/768/1440, hồi quy nhiều theme/viewport + contrast |

## 16. Blockers và điều cần xác nhận

- Repository đã khảo sát ở F01; không có BLOCKED môi trường cho unit/typecheck/build hiện tại.
- Map chưa có embed/provider config; F02 quyết định provider cố định/consent, không billing hoặc API key mặc định. Chưa xác minh marker/địa điểm thật; tuyệt đối không suy ra tọa độ để publish.
- Cần dữ liệu ngày/giờ/địa điểm thật và chính sách hiển thị; không lấy dữ liệu thử làm thông tin chính thức.
- Cần chủ thiệp cung cấp và xác nhận QR/người nhận thật; không yêu cầu gửi secret hoặc thông tin ngân hàng qua log công khai.
- Lời chúc cũ: giữ nguyên state hiện có; không duyệt/chuyển visibility hàng loạt. Feed mới phải giữ quy tắc không lộ pending/private event; chốt contract F02 trước F03.
- Nếu không có backend/storage/phân quyền, ghi rõ phần bị chặn và đề xuất bổ sung nhỏ nhất; không mô phỏng bằng frontend rồi gọi là hoàn chỉnh.

## 17. Handoff — cập nhật trước khi dừng mỗi phiên

- **Trạng thái:** F01–F04 DONE; checkpoint 2026-10-21 00:06 +07:00. V24/V25 chỉ kiểm trên PG17 disposable (đã dọn), không migrate stack wedding. UI mới: form wish thu gọn qua GuestDisclosure; map/feed/gift chưa nối UI.
- **Task đã xác minh hoàn tất:** F01 bằng test/report/code; F02 quyết định UX/provider/schema/quyền DF08–DF12.
- **Task đang làm:** không; điểm dừng an toàn sau F04. F05–F13 TODO, chỉ chọn một task triển khai chính.
- **Task tiếp theo:** F05 map: nối EventForm/location API/Guest EventTools bằng tọa độ đã xác nhận, OSM embed consent + fallback. F07 sau đó tái dùng GuestDisclosure cho RSVP và mở trước focus CTA. F09/F10 vẫn TODO; không tự tạo gift dialog không dùng ở F04.
- **File phiên này:** V24__event_map_coordinates.sql, EventLocationService/Controller.java, GuestService.java, AdminPermissions.java, EventLocationTest/HttpTest.java, AdminPermissionsTest.java, GiftPermissionFilterTest.java, shared/invitation-features.ts, shared/admin-types.ts và plan này. Giữ nguyên wish feed, test F01 và 12 file staged ban đầu. Không stage/commit.
- **File thêm phiên gift:** `backend/src/main/java/vn/wedding/invitation/gifts/GiftService.java`, `GiftController.java`, `backend/src/main/resources/db/migration/V25__gift_settings_and_assets.sql`, `backend/src/test/java/vn/wedding/invitation/gifts/GiftServiceTest.java`, `GiftHttpTest.java`; sửa thêm shared/invitation-features.ts và plan này. Không stage/commit, không sửa PLAN_TASK.md.
- **File thêm phiên persistence:** `backend/src/test/java/vn/wedding/invitation/FeaturePersistenceIntegrationTest.java`, `scripts/features-persistence-qa.ps1`; cập nhật plan này và hướng dẫn scripts. Không sửa production code/schema, không stage/commit, không sửa PLAN_TASK.md.
- **Đã chạy/test:** integration PostgreSQL/HTTP/restart PASS exit 0 (`.qa-artifacts/features-f03-persistence-final.log`); backend verify exit 0 130 pass + 1 opt-in skip. FE 131/131 + typecheck/build exit 0 là bằng chứng phiên trước, không chạy lại phiên này. Browser/QR/device/perf/concurrency sâu vẫn NOT VERIFIED.
- **Dữ liệu thật còn thiếu:** chưa kiểm tra DB/nội dung thật trong phiên; map coordinates/provider và QR cần chủ thiệp xác nhận, không yêu cầu gửi thông tin ngân hàng vào chat/log. Không giả định nội dung demo là thật.
- **File phiên F04:** guest-disclosure.tsx mới, wish-book.tsx, design.css (append), tests/guest-disclosure.test.mjs mới, tests/contrast-audit.test.mjs, scripts/contrast-audit.mjs, scripts/invitation-review-qa.mjs (giữ staged changes cũ), plan này. FE 135/135 + typecheck/build, browser PASS; không chạy lại BE vì không đổi backend.
- **Bước đầu phiên sau:** đọc hai plan → git status/diff cả cached/uncached → giữ index có trước → đối chiếu F04 DONE source/log → chọn F05. Không khởi động source mới trỏ DB wedding cũ; QA persistence dùng script DB riêng. Source/build local có wish disclosure nhưng không deploy 8088; API map/feed/gift vẫn chưa nối UI.
- **Không được làm khi resume:** overwrite code người dùng, tự publish/deploy/migrate production, public dữ liệu riêng, duyệt hàng loạt lời chúc cũ, giả lập dữ liệu nhận tiền hoặc tự nhận đã quét/xác minh QR.
