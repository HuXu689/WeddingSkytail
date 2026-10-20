# PLAN_TASK — Hoàn thiện thiệp cưới công khai và thiệp mời riêng tư

> Trạng thái: ĐÃ KHẢO SÁT CODE (phiên 2026-10-20, giờ máy cục bộ). Project Snapshot, file map và hiện trạng bên dưới là kết quả xác minh trực tiếp từ repository; phần đặc tả giữ nguyên vai trò kế hoạch thực thi.
> AI triển khai phải cập nhật trực tiếp file này sau từng task và trước khi kết thúc phiên.
> Không tự điền tên cô dâu/chú rể, thông tin gia đình, địa chỉ, ngày cưới hoặc nghi thức khi chưa có dữ liệu xác thực.

## 0. Cách sử dụng nhanh

1. Đặt file này vào repository của website thiệp cưới; commit trạng thái hiện tại hoặc tạo nhánh làm việc riêng.
2. Mở AI coding trong repository và gửi **Prompt bắt đầu** bên dưới.
3. Cho AI khảo sát code, cập nhật đường dẫn thực tế và triển khai từng task nhỏ. Nếu cần duyệt hướng thiết kế, yêu cầu dừng ở mốc duyệt; mặc định không dừng chỉ để xin phép từng thay đổi nhỏ.
4. Khi phiên dừng, mở phiên mới và dùng **Prompt tiếp tục**. File này cùng code, git diff và kết quả kiểm thử là nguồn sự thật; không phụ thuộc trí nhớ cuộc chat.
5. Không đánh dấu hoàn tất nếu chỉ có mô tả mà chưa có thay đổi hoặc kiểm tra tương ứng.

### Prompt bắt đầu — sao chép nguyên khối

```text
Bạn đóng vai Senior Product Designer + Frontend Engineer + Full-stack Engineer có tư duy bảo mật và QA. Hãy đọc PLAN_TASK.md ở gốc repository và coi đây là kế hoạch thực thi có lưu trạng thái, không chỉ là tài liệu tham khảo.

Mục tiêu: hoàn thiện website thiệp cưới hiện có, gồm thiệp mời công khai và thiệp mời riêng tư, đẹp hơn và cá nhân hóa sâu từng phần: Giới thiệu hai bạn, Gia đình, Nghi lễ riêng, Mốc lịch trình, Trang phục. Các nội dung "Hi" hiện có là placeholder cần xử lý, không phải nội dung cuối cùng.

Đầu tiên khảo sát repository: framework, routes, component, data/schema, API, editor/admin, authentication, phân quyền, storage, design system, font, assets và test. Dẫn chứng bằng đường dẫn file và mô tả hành vi thực tế. Chỉ đọc cấu hình cần thiết; không in hoặc sao chép secret hay dữ liệu khách mời thật vào báo cáo.

Sau đó cập nhật PLAN_TASK.md: hiện trạng, vấn đề, hướng thiết kế, bảng visibility công khai/riêng tư, task cụ thể, dependency, file sẽ sửa, tiêu chí nghiệm thu và cách test. Không bịa rằng đã xem file hoặc chạy kiểm thử. Phân biệt rõ điều đã xác minh với giả định.

Giữ stack, quy ước và tính năng đang hoạt động; không rewrite hoặc thêm dependency nặng chỉ vì sở thích. Không tạo một landing page cưới generic bằng các card giống nhau. Năm phần phải có bố cục và ngôn ngữ thị giác riêng nhưng thống nhất trong một hệ thiết kế.

Ưu tiên: (1) dữ liệu và riêng tư đúng, (2) đủ luồng sửa/lưu/hiển thị, (3) UI responsive tinh tế, (4) hiệu năng, accessibility và kiểm thử. Thiệp riêng tư không được bảo vệ chỉ bằng CSS, route khó đoán hay noindex. Thực thi kiểm tra quyền ở server/API hoặc cơ chế được nền tảng bảo đảm; không đưa dữ liệu riêng tư vào response công khai rồi mới ẩn bằng frontend.

Triển khai từng task nhỏ theo mục 10. Sau mỗi task: chạy kiểm tra phù hợp, cập nhật trạng thái, file thay đổi, kết quả và việc tiếp theo trong PLAN_TASK.md. Không tự commit, push, deploy, chạy migration production hoặc xóa dữ liệu nếu chưa được yêu cầu. Không đưa dữ liệu cá nhân thật vào fixture, screenshot công khai hoặc log.

Nếu thiếu thông tin không chặn công việc, dùng cấu trúc dữ liệu rỗng/placeholder được đánh dấu trong chế độ chỉnh sửa và ghi giả định; không publish nội dung giả như thông tin thật. Nếu thiếu quyết định liên quan quyền truy cập, schema phá vỡ tương thích hoặc thao tác không thể hoàn tác, ghi BLOCKED và hỏi ngắn gọn đúng vấn đề. Tiếp tục các task độc lập khác.

Bắt đầu bằng khảo sát và cập nhật kế hoạch, sau đó triển khai theo dependency. Nếu không đủ thời gian/ngữ cảnh, hoàn thành task đang làm ở trạng thái an toàn, cập nhật mục Handoff cuối file, không bắt đầu một đợt refactor lớn mới.
```

### Prompt tiếp tục khi đổi phiên

```text
Tiếp tục dự án theo PLAN_TASK.md. Đọc toàn bộ file, đặc biệt Project Snapshot, Task Ledger, Decision Log và Handoff cuối file. Kiểm tra git status, git diff và các file liên quan trước khi sửa. Không tin trạng thái DONE nếu code hoặc bằng chứng không khớp; nếu có chênh lệch, ghi rõ và kiểm tra lại.

Tóm tắt ngắn task đã xong, task đang dở, blocker và task tiếp theo. Tiếp tục task IN_PROGRESS an toàn hoặc task TODO đầu tiên đã đủ dependency. Không làm lại task DONE đã xác minh, không ghi đè thay đổi ngoài phạm vi. Cập nhật PLAN_TASK.md sau mỗi task. Không tự commit/push/deploy hoặc thao tác dữ liệu production.
```

## 1. Phạm vi và nguyên tắc

### Trong phạm vi

- Khảo sát và cải thiện cả trang mời công khai lẫn trải nghiệm thiệp riêng tư.
- Thiết kế riêng từng phần thay vì chỉ đổi tiêu đề trên cùng một mẫu card.
- Luồng cá nhân hóa: chỉnh sửa → xem trước theo đối tượng → lưu → hiển thị đúng dữ liệu.
- Tái sử dụng luồng xuất bản đang có; không tự tạo một hệ CMS mới nếu dự án chưa cần.
- Đầy đủ trạng thái rỗng, lỗi, tải, nội dung dài, thiếu ảnh và không có quyền.
- Responsive, accessibility, hiệu năng, bảo vệ dữ liệu và hồi quy chức năng.

### Chỉ làm khi đã có hoặc thực sự cần

- RSVP, quản lý khách mời, QR, nhạc nền, đếm ngược, bản đồ, thư viện ảnh và đa ngôn ngữ: bảo toàn nếu có; không tự mở rộng thành sản phẩm mới.
- Không thêm analytics theo dõi khách, thanh toán, quà mừng hoặc upload giấy tờ.
- Không viết lại xác thực, backend hay database nếu điều chỉnh nhỏ phù hợp hơn.

### Định nghĩa hoàn thành

Website không chỉ đẹp ở ảnh chụp màn hình: nội dung sửa được, lưu được, tải lại không mất; công khai/riêng tư đúng; mobile dùng tốt; test và giới hạn còn lại được ghi rõ.

## 2. Project Snapshot — AI điền sau khảo sát

| Hạng mục | Kết quả xác minh |
|---|---|
| Framework / runtime / package manager | FE: Next.js 16.4.2 App Router + React 19.3.1 + TS ~5.9.3, CSS thuần, npm (`frontend/package.json`). BE: Spring Boot 4.1.1, Java 21, JdbcTemplate + Flyway, spring-session-jdbc (`backend/pom.xml`). PostgreSQL 17 qua Docker Compose (`deploy/compose.yml`). |
| Lệnh dev / lint / typecheck / test / build | FE: `npm test` (node --test, 116 test), `npm run typecheck`, `npm run build`, `npm run dev` (trong `frontend/`). BE: `mvn -B verify` (60 test). Stack local: `docker compose --env-file .env -f deploy/compose.yml up -d --build`. |
| Route thiệp công khai | `/w/[slug]` (`frontend/src/app/w/[slug]/page.tsx`) → `GET /api/v1/public/weddings/{slug}` → `GuestService.publicWedding`: chỉ trả section PUBLISHED + enabled + audience PUBLIC. |
| Route thiệp riêng tư / cách cấp quyền | `/i/[token]` redeem token (`POST /guest-links/redeem` → session grant) → redirect `/invitation/[id]` (`frontend/src/app/invitation/[id]/page.tsx`) → `GET /guest/invitations/{id}` qua `AccessGate.check` (grant + open marker + PIN + cửa sổ truy cập). Không dùng client-side hiding. |
| Route editor/admin / cơ chế lưu | `/admin/wedding` (`frontend/src/app/admin/wedding/page.tsx`) gộp DesignEditor + LayoutEditor + SectionEditor. Lưu nháp: `PUT /admin/wedding/design\|layout\|sections`; phát hành: `POST /admin/wedding/publish` (`AdminService.publishWedding` copy DRAFT→PUBLISHED). Auth: session Spring, CSRF (`frontend/src/shared/api.ts`), role OWNER/EDITOR qua `EditorAccessFilter`. |
| Component của 5 phần hiện tại | Renderer duy nhất `frontend/src/features/invitation/sections.tsx` (10 dòng): mọi kind render giống nhau (h2 + p + time/swatch). Editor: `frontend/src/features/admin/section-editor.tsx` (form phẳng: title/body/audience/datetime/color). Vị trí trên thiệp: slot CONTENT của `WeddingCanvas` (`frontend/src/features/invitation/design.tsx`). |
| Schema / API / storage / cache | `wedding_sections` (V17): surface, position, kind INTRO/FAMILY/CEREMONY/TIMELINE/DRESS_CODE, audience PUBLIC/PRIVATE, enabled, title, body, starts_at, color. `wedding_layout` (V19) 6 slot. Media file-system `./data/media` + `media_assets`/`wedding_media_selection`. Không cache HTTP riêng; fetch FE luôn `cache:'no-store'`. |
| Design tokens / font / ảnh hiện có | Tokens ở `frontend/src/app/globals.css` (--space, --radius, --content-*, màu trạng thái) và palette thiệp trong `design.css` (--inv-paper/ink/muted/champagne/hairline, --wedding-accent, 3 theme, 3 accent). Font hệ thống (Georgia serif/Arial); NotoSans chỉ dùng cho PDF. Ảnh demo `scripts/demo-media/`. Container query + `prefers-reduced-motion` + safe-area đã dùng. |
| Tình trạng working tree trước sửa | Sạch tại commit `c547309` "feat(invitation): add music control and autoplay features" (đợt nhạc nền đã commit kèm PLAN_TASK.md). |
| Các lỗi có sẵn trước thay đổi | Baseline sạch: FE 116/116 test + typecheck pass; BE 60/60 test BUILD SUCCESS. Stack Docker local đang chạy (db/backend/frontend/edge). Lỗi nghiệp vụ: 5 section công khai đang phát hành với body='Hi' (dữ liệu placeholder trong DB, không phải code). |

### Đầu ra khảo sát bắt buộc

- Liệt kê file thực tế và điểm vào của từng luồng, không dùng đường dẫn phỏng đoán.
- Mô tả 5–10 vấn đề có bằng chứng; phân loại UX/UI, dữ liệu, riêng tư, vận hành.
- Lập sơ đồ ngắn: nguồn dữ liệu → kiểm tra quyền → payload → component → editor.
- Nêu chức năng cần giữ và vùng không được sửa ngoài phạm vi.
- Kiểm tra "Hi" đến từ dữ liệu lưu, default value, seed hay fallback trong component; sửa đúng nguồn.

#### Kết quả khảo sát (T01 — xác minh 2026-10-20)

**Luồng dữ liệu → quyền → payload → component → editor:**

- `wedding` (id=1) + `wedding_sections` DRAFT/PUBLISHED + `wedding_layout` + `wedding_media_selection` → `SectionService.list(db,draft,privateView)` (SQL lọc enabled/audience) / `LayoutService.list` / `MediaService.published` → `GuestService.publicWedding(slug)` (chỉ PUBLIC) hoặc `GuestService.view(id,session)` (qua `AccessGate.check`) → `WeddingCanvas` → slot CONTENT render `ContentSections` ← cấu hình tại `/admin/wedding` (`SectionEditor` → `SectionController`).
- Phát hành: `AdminService.publishWedding` copy từng cột `wedding_sections` DRAFT→PUBLISHED bằng SQL liệt kê cột tường minh (rủi ro khi thêm cột).
- Kiểm chứng riêng tư hiện có: `backend/src/test/java/vn/wedding/invitation/SectionPrivacyTest.java` xác minh SQL public không chứa audience PRIVATE hoặc mục disabled.

**Vấn đề có bằng chứng:**

1. [UX/UI] 5 kind render bằng một khối card giống nhau (`sections.tsx:4-10`) — không có bố cục riêng cho chân dung/gia đình/nghi lễ/timeline/palette, trái mục 4.
2. [Dữ liệu] Mô hình flat: 1 body + tối đa 1 `starts_at` + 1 `color` mỗi dòng — không lưu được 2 người của INTRO, nhóm gia đình, nhiều mốc TIMELINE, palette nhiều màu; phải tạo nhiều section cùng kind để bù.
3. [Dữ liệu/placeholder] DB local đang phát hành 5 section PUBLIC enabled với body='Hi' (cả DRAFT lẫn PUBLISHED; TIMELINE `starts_at` 2026-12-24 01:23+00; DRESS color #ff5c5c). "Hi" do người dùng nhập qua editor, không có trong source code — phải thay bằng dữ liệu thật do người dùng nhập, không tự bịa.
4. [UX] TIMELINE sắp theo `position` (thứ tự nhập), không theo thời gian, không nhóm theo ngày; luật "trùng thời điểm" chỉ áp giữa các section đang bật.
5. [UX/Quyền] Không có mức hiển thị theo từng mốc — ma trận yêu cầu mốc riêng chỉ hiện cho người được cấp; hiện chỉ có mức section.
6. [Quyền/UX] Section enabled với body trắng (INTRO/FAMILY/CEREMONY) vẫn render khối rỗng trên thiệp — trái "không render khối trống".
7. [Editor] SectionEditor chỉ có preview một ngữ cảnh (gồm mục riêng tư); mục 5 yêu cầu preview theo ngữ cảnh công khai / khách hợp lệ.
8. [Vận hành] SQL publish liệt kê cột tường minh — thêm cột payload mà quên sửa `AdminService.publishWedding` sẽ mất dữ liệu khi phát hành.
9. [UX] DRESS_CODE chỉ có 1 swatch tròn + body text; không có tên màu bắt buộc kèm swatch (mục 4.5).

**Chức năng cần giữ nguyên:** redeem/open/PIN/RSVP/ics flow, quyền OWNER/EDITOR, media library, layout editor, wish book, admin CRUD khác, theme/accent hiện có, seed/cleanup scripts.

## 3. Hướng thiết kế tổng thể

### Art direction mặc định: editorial wedding, ấm và tinh tế

- Cảm giác: riêng tư, trang trọng vừa đủ, giàu cảm xúc, không phô trương.
- Nền ivory ấm; chữ nâu mực; nhấn burgundy trầm; sage dùng tiết chế cho chi tiết phụ. Đây là đề xuất, ưu tiên hòa hợp ảnh và nhận diện hiện có.
- Token màu tham khảo: background `#FAF7F2`, surface `#FFFCF8`, text `#302825`, muted `#75675E`, accent `#763E49`, line `#DED2C6`. Phải đo contrast trước khi áp dụng, không dùng mọi màu cho chữ nhỏ.
- Heading serif hỗ trợ tiếng Việt; body sans dễ đọc. Ưu tiên font đang dùng hoặc self-host đúng giấy phép, tránh tải nhiều họ/weight.
- Script font nếu có chỉ dùng trang trí ngắn, không dùng cho địa điểm, thời gian hay đoạn văn.
- Dùng khoảng trắng, ảnh và typography tạo độ sang; tránh lạm dụng glassmorphism, bóng nặng, gradient bóng bẩy và icon không cùng phong cách.
- Mỗi section có một điểm nhấn; ornament nhỏ, ít, không che ảnh hoặc cạnh tranh với nội dung.
- Không ép cả 5 section thành các khung bo tròn giống nhau.

### Nhịp đọc và bố cục

- Giữ hero hiện có nếu tốt; tiếp nối bằng Giới thiệu → Gia đình → Nghi lễ phù hợp quyền xem → Lịch trình → Trang phục. Điều chỉnh nếu lịch trình cần ưu tiên cho khách.
- Desktop: nội dung tối đa khoảng 1120–1200px; đoạn đọc dài khoảng 60–70 ký tự một dòng; mobile có padding ít nhất 20px khi phù hợp.
- Thang spacing gợi ý: 4/8/12/16/24/32/48/64/96. Không rải giá trị tùy tiện khắp component.
- Heading responsive bằng token hoặc clamp; nội dung chính tối thiểu khoảng 16px; hạn chế chữ phụ quá nhỏ.
- Chuyển động 150–350ms cho tương tác nhỏ; animation xuất hiện chỉ nhẹ, không scroll hijacking và không che nội dung nếu JS/animation lỗi.
- Tôn trọng `prefers-reduced-motion`; không bật nhạc tự động.
- Mobile ưu tiên đọc một cột, thông tin quan trọng xuất hiện trước; tránh chiều cao cố định gây cắt tên hoặc chữ tiếng Việt.

### Bước duyệt thiết kế trong code

Trước khi nhân rộng, triển khai một lát cắt nhỏ gồm heading, body, ảnh và một section đại diện. Kiểm tra mobile/desktop và contrast; cập nhật Decision Log rồi mới mở rộng. Không cần xin duyệt nếu người dùng chưa yêu cầu một mốc duyệt bắt buộc.

## 4. Đặc tả cá nhân hóa cho từng phần

### 4.1. Giới thiệu hai bạn — chân dung và câu chuyện

**Mục tiêu:** cho khách cảm nhận về hai người, không phải một ô thông tin hành chính.

**Thiết kế:** desktop hai chân dung có nhịp lệch nhẹ, tên lớn và lời giới thiệu ngắn; câu chuyện chung ở vùng đọc riêng. Mobile xếp dọc, tránh chữ đè lên mặt. Không bắt buộc thứ tự giới tính hay cách xưng hô.

**Trường chỉnh sửa:**
- Tiêu đề phần, lời dẫn ngắn, tùy chọn ẩn/hiện.
- Mỗi người: tên hiển thị, cách gọi/vai trò tùy chọn, ảnh, mô tả ngắn, alt ảnh, tiêu điểm crop.
- Câu chuyện chung: tiêu đề nhỏ, nội dung nhiều đoạn, ảnh chung tùy chọn.
- Tùy chọn hiển thị đối xứng/bất đối xứng có kiểm soát nếu phù hợp kiến trúc hiện có.

**Hành vi:** thiếu ảnh thì dùng bố cục typography có chủ ý; không dùng ảnh người lạ làm ảnh thật. Thiếu mô tả thì không để khoảng trống vô nghĩa. Tên dài xuống dòng tự nhiên, không ép dấu ba chấm.

**Nghiệm thu:** sửa hai người độc lập; không ghi đè lẫn nhau; tiếng Việt đầy đủ; không còn "Hi" hoặc lorem ipsum trên thiệp xuất bản; không tự gán danh xưng.

### 4.2. Gia đình — cân đối, trang trọng, linh hoạt

**Thiết kế:** hai khối gia đình đối ứng, nhãn bên gia đình nhỏ, tên người thân rõ ràng, separator tinh tế. Mobile đọc từng gia đình trọn vẹn trước khi chuyển sang bên còn lại.

**Trường chỉnh sửa:**
- Tiêu đề/lời mở đầu.
- Danh sách nhóm gia đình, nhãn tự đặt, tên đại diện hoặc thành viên, quan hệ/danh xưng tùy chọn.
- Địa phương hiển thị ngắn nếu muốn; không bắt buộc địa chỉ nhà.
- Lời chúc hoặc lời trân trọng tùy chọn; mức công khai của thông tin.

**Hành vi:** hỗ trợ chỉ một nhóm, người giám hộ/đại diện, số thành viên khác nhau. Không mặc định bắt buộc đủ cha và mẹ; không tự suy đoán quan hệ hoặc tình trạng gia đình. Ẩn trường thiếu, không hiển thị nhãn rỗng.

**Nghiệm thu:** bố cục vẫn đẹp khi một bên có 1 người và bên kia có nhiều người; họ tên dài không tràn; thông tin nhạy cảm được lọc ở nguồn trả dữ liệu.

### 4.3. Nghi lễ riêng — nội dung được mời đúng đối tượng

**Thiết kế:** một khối invitation note có chất liệu giấy nhẹ, nhãn lời mời và thông tin nghi lễ rõ ràng; nổi bật nhưng không biến thành cảnh báo hệ thống. Các nghi lễ có thể dùng danh sách hoặc accordion truy cập được khi nhiều nội dung.

**Trường chỉnh sửa theo từng nghi lễ:**
- Tên nghi lễ, lời dẫn/lời mời riêng.
- Ngày, giờ bắt đầu/kết thúc nếu có, múi giờ, địa điểm, địa chỉ, hướng dẫn di chuyển tùy chọn.
- Đối tượng được mời / chính sách truy cập; thứ tự và trạng thái xuất bản nếu hệ thống có.
- Chỉ dẫn dành cho người tham dự; liên hệ hỗ trợ chỉ khi được phép công bố.

**Quy tắc:**
- Trang công khai mặc định không hiển thị nghi lễ riêng, không trả giờ/địa điểm/khách mời riêng trong payload.
- Khách hợp lệ chỉ thấy nghi lễ mình có quyền xem, không phải mọi nghi lễ riêng.
- Link sai/hết hạn/thu hồi phải có màn hình lịch sự; không xác nhận chi tiết nhạy cảm hay việc một người có trong danh sách hay không.
- Không hiển thị "Bạn không được mời" gây khó xử; dùng thông điệp trung tính như "Không thể mở lời mời này. Vui lòng liên hệ người gửi."

**Lưu ý dữ liệu:** mốc ngày 24/12/2026 lúc 08:23, Asia/Saigon xuất hiện trong yêu cầu chỉ là dữ liệu cần xác nhận; không mặc định đó là giờ cưới hoặc lịch nghi lễ thật. Không đưa mốc này lên thiệp xuất bản khi chưa xác nhận.

**Nghiệm thu:** không lộ qua HTML, JSON, hydration/RSC payload, API, metadata, sitemap, log hay cache; thao tác thêm lịch cũng phải áp dụng cùng quyền xem.

### 4.4. Mốc lịch trình — đọc nhanh, đúng giờ, không lẫn quyền xem

**Thiết kế:** timeline dọc trên mobile; desktop có thể dùng hai cột giờ/nội dung. Giờ nổi bật, tên hoạt động rõ, mô tả phụ ngắn; icon tối giản cùng hệ.

**Trường chỉnh sửa theo mốc:**
- Tiêu đề, mô tả, ngày/giờ, múi giờ, địa điểm tùy chọn.
- Thứ tự hoặc quy tắc sắp xếp; mức hiển thị và liên kết đến nghi lễ nếu cần.
- Tùy chọn nhãn "Dự kiến" khi giờ chưa chốt.

**Hành vi:**
- Nhóm theo ngày khi có nhiều ngày; thể hiện rõ ngày nếu qua nửa đêm.
- Không dùng Date parse mơ hồ; lưu và hiển thị theo quy ước thời gian nhất quán của stack.
- Mốc chỉ có giờ nhưng thiếu ngày phải được đánh dấu cần hoàn thiện trong editor; không tự chọn ngày hôm nay.
- Lịch công khai chỉ chứa mốc công khai; lịch của khách hợp lệ là tập được cấp quyền, không tự suy ra mọi mốc đều được xem.
- Nếu có thao tác thêm lịch, xử lý timezone và dữ liệu riêng tư đúng; không đưa tên khách/token vào link bên thứ ba không cần thiết.

**Nghiệm thu:** không lệch ngày do UTC; không sắp xếp bằng chuỗi giờ kiểu "9:00" và "10:00"; timeline không đè chữ trên màn hình hẹp; phân biệt rõ giờ dự kiến và giờ xác nhận.

### 4.5. Trang phục — palette đẹp và hướng dẫn dễ làm theo

**Thiết kế:** vùng nhẹ nhàng riêng biệt với swatch màu, tên màu và đoạn hướng dẫn ngắn. Có thể có illustration nhỏ nếu đã có asset phù hợp; không cần ảnh stock nặng.

**Trường chỉnh sửa:**
- Tiêu đề, phong cách gợi ý, lời nhắn tự do.
- Danh sách màu: tên dễ hiểu + mã màu hợp lệ, có giới hạn số lượng hợp lý.
- Gợi ý kiểu trang phục, điều nên tránh nếu người dùng nhập, ghi chú thời tiết/địa hình tùy chọn.

**Hành vi:** tên màu luôn có cùng swatch; không truyền ý nghĩa chỉ qua màu; swatch trắng có đường viền. Không tự đặt quy định cấm mặc màu nào hoặc ép khách mua đồ.

**Nghiệm thu:** màu được validate; nội dung dài xuống dòng; không có palette thì dùng typography chứ không để hàng chấm màu rỗng; ẩn phần nếu không có nội dung.

## 5. Nội dung và editor: sửa thật, không chỉ preview đẹp

- Tôn trọng cấu trúc editor hiện có; nhóm setting theo từng section, label tiếng Việt rõ, helper ngắn và có trạng thái lưu.
- Mỗi section có: bật/tắt, nội dung riêng, thứ tự nếu sản phẩm hỗ trợ, quyền hiển thị phù hợp, xem trước.
- Preview theo tối thiểu 3 ngữ cảnh: công khai, khách hợp lệ được chọn, link không hợp lệ. Không chỉ một nút "private" chung chung.
- Tên người, gia đình, timeline, palette đều sửa độc lập; không dùng một state chung làm ghi đè các phần.
- Nhắc thay đổi chưa lưu khi rời trang nếu có rủi ro mất nội dung. Autosave chỉ dùng khi phù hợp và có xử lý lỗi/race.
- Validate gần trường: chuỗi trắng, URL ảnh, màu, ngày giờ, thứ tự và quyền. Giới hạn độ dài là guardrail, không làm mất nội dung cũ âm thầm.
- Rich text phải sanitize bằng cơ chế phù hợp; không render HTML tùy ý từ người dùng. URL chỉ chấp nhận scheme an toàn.
- Nội dung rỗng: editor giải thích cần nhập gì; thiệp xuất bản không render khối trống/placeholder.
- Không coi chuỗi "Hi" ở mọi nơi là rác: chỉ thay placeholder đã xác minh trong các phần này; không tìm-thay toàn repository.
- Nếu có draft/publish, giữ nguyên semantics; không biến Save thành Publish ngoài ý muốn.
- Nếu thiếu backend lưu dữ liệu, không giả vờ đã hoàn thiện bằng local state. Ghi rõ khoảng trống và triển khai persistence phù hợp hoặc BLOCKED.

## 6. Mô hình dữ liệu và quyền truy cập

### Mô hình logic tham khảo, không ép đổi tên/schema

```text
WeddingInvitation
  appearance: shared design tokens/theme
  couple: people[] + sharedStory
  families: groups[]
  ceremonies: events[] + accessPolicy
  schedule: items[] + visibility/event reference
  dressCode: palette[] + instructions
  sectionSettings: enabled/order/allowed visibility

AccessContext — tạo từ dữ liệu đã được server xác minh
  mode: public | authorizedGuest | editor
  permittedEventIds / guestScope: theo cơ chế thực tế
```

### Ma trận visibility — trạng thái xác minh và đích cần đạt

| Dữ liệu | Công khai | Khách có quyền | Editor có quyền | Hiện trạng (đã xác minh) |
|---|---|---|---|---|
| Giới thiệu đã xuất bản | Có nếu bật | Có nếu bật | Xem/sửa đúng quyền | Đúng: SQL lọc PUBLISHED+enabled+PUBLIC (`SectionService.list`) |
| Gia đình đã cho phép công khai | Có nếu bật | Có nếu bật | Xem/sửa đúng quyền | Đúng ở mức section; chưa có cấu trúc nhóm/thành viên |
| Địa chỉ/liên hệ gia đình không công khai | Không | Chỉ nếu được cấp riêng | Theo quyền | Chưa có trường địa chỉ gia đình; không thêm nếu không cần |
| Nghi lễ riêng | Không | Chỉ nghi lễ được mời | Theo quyền | Đúng: sự kiện lọc qua `assignments` + `AccessGate`; section CEREMONY theo audience |
| Mốc lịch trình riêng | Không | Chỉ mốc được cấp | Theo quyền | **Đã có (T08)**: mỗi mốc có `audience`; `SectionService.list` lọc mốc PRIVATE, bỏ `starts_at` cũ và bỏ cả mục nếu không còn mốc công khai — kiểm chứng bằng API thật |
| Dress code công khai | Có nếu bật | Có nếu bật | Theo quyền | Đúng ở mức section; chưa có palette nhiều màu |
| Tên khách/lời nhắn cá nhân | Không | Chỉ lời mời tương ứng | Theo quyền | Đúng: `GuestService.view` qua grant + open + PIN |
| Danh sách khách/token/ghi chú quản trị | Không | Không | Chỉ quyền cần thiết | Đúng: admin filter + OWNER/EDITOR |

> Quy tắc giữ nguyên: quyết định quyền nằm ở server; payload public không chứa dữ liệu riêng; preview phía client chỉ là mô phỏng hiển thị, không phải lớp bảo vệ.

### Yêu cầu bảo mật bắt buộc

- Server trả DTO/payload tối thiểu theo quyền; không gửi toàn bộ rồi filter ở client.
- API đọc, ghi, ảnh/asset riêng và export phải kiểm quyền tương ứng; không tin `guestId`, event ID hoặc cờ `isPrivate` do client gửi.
- Nếu dùng link token: token ngẫu nhiên đủ mạnh, scoped theo lời mời, có thu hồi; xác định vòng đời/hết hạn phù hợp. Link dạng bearer có thể bị chuyển tiếp, không được mô tả như xác minh danh tính người nhận.
- Không đổi cơ chế đăng nhập/token hiện có nếu chưa đánh giá; không tự bắt mọi khách tạo tài khoản mới.
- Nếu nền tảng static không thể bảo vệ dữ liệu, không gọi client-side hiding là riêng tư: ghi BLOCKED và nêu phương án server/edge hoặc nền tảng có access control.
- Không cache response cá nhân như nội dung công khai; kiểm tra cache framework/CDN/SSR thực tế, tránh nội dung khách A xuất hiện ở khách B.
- Private route cần noindex và kiểm soát preview metadata, nhưng noindex/robots không phải lớp bảo mật.
- Hạn chế token xuất hiện ở log, analytics và Referer; cân nhắc trao đổi token sang session và URL sạch nếu stack hỗ trợ. Không đưa URL riêng vào sitemap.
- Khi đi ra dịch vụ bản đồ/lịch bên ngoài, không đính kèm token hoặc dữ liệu cá nhân không cần thiết.
- Payload/editor riêng chỉ cho người có quyền chỉnh sửa; bảo vệ mutation khỏi IDOR và CSRF khi cơ chế session yêu cầu.
- Không dùng dữ liệu khách thật cho test. Secret giữ trong cơ chế env/secrets hiện có, không lưu vào PLAN_TASK.md.

## 7. Kiến trúc triển khai và kiểm soát thay đổi

- Tách component theo trách nhiệm khi có lợi: section shell/layout, từng section, editor fields, validation, resolver quyền và mapping dữ liệu.
- Không over-engineer thành một page builder tổng quát. Chỉ thêm abstraction khi nhiều phần thực sự dùng chung.
- Dùng một nguồn dữ liệu và một bộ resolver quyền cho public/private; khác nhau ở projection và nội dung, không copy hai website rồi để lệch nhau.
- Public vẫn được truy cập không cần đăng nhập. Private không được downgrade thành public khi xác thực lỗi.
- Schema cũ phải tiếp tục đọc được; default mới an toàn. Migration cần reversible/backfill rõ, thử với dữ liệu mẫu; không chạy production tự động.
- Nếu đổi schema/API phải cập nhật type, validation, editor, renderer, test và mapping dữ liệu cũ cùng nhau.
- Asset ảnh: kích thước responsive, giữ tỉ lệ để tránh layout shift, lazy load ngoài màn hình; ưu tiên ảnh hero đúng cách, không lazy mọi ảnh bất kể vị trí.
- Đảm bảo lỗi ảnh/font không làm mất nội dung chính. Không chặn toàn trang để chờ animation.

## 8. Kế hoạch kiểm thử và tiêu chí nghiệm thu

### Bộ dữ liệu giả lập tối thiểu

1. Đủ dữ liệu, 2 người, 2 gia đình, nhiều sự kiện và palette.
2. Không ảnh, không câu chuyện, không dress code; các phần rỗng được ẩn gọn.
3. Tên rất dài, nhiều dấu tiếng Việt, địa chỉ và mô tả nhiều dòng.
4. Một nhóm gia đình; số thành viên hai nhóm khác nhau.
5. Public + khách A chỉ có sự kiện A + khách B chỉ có sự kiện B.
6. Token sai/hết hạn/thu hồi, người dùng không có quyền editor.
7. Lịch nhiều ngày/qua nửa đêm; giờ địa phương và dữ liệu có timezone.
8. Nội dung nhập có HTML/script/URL scheme nguy hiểm để kiểm tra sanitize/validation.

### Ma trận kiểm tra

| Nhóm | Kiểm tra | Bằng chứng cần lưu |
|---|---|---|
| Chức năng | Chỉnh sửa từng phần → lưu → reload → hiển thị khớp | Test tự động hoặc bước kiểm tra cụ thể |
| Quyền | Public không nhận dữ liệu riêng; A không đọc/sửa dữ liệu B | Kiểm tra response/API và integration test |
| Cache | Đổi khách/đăng xuất/mở phiên mới không lẫn dữ liệu | Các request và ngữ cảnh đã kiểm tra |
| Responsive | 360, 390, 768, 1024, 1440px; thêm 320px nếu sản phẩm hỗ trợ | Ảnh chụp bằng dữ liệu giả hoặc ghi chú thực tế |
| Nội dung | Không còn placeholder ở 5 phần; rỗng/thiếu ảnh có chủ ý | Fixture và kết quả render |
| Accessibility | Keyboard, focus, heading, label, alt, contrast, reduced motion | Công cụ và kiểm tra thủ công |
| Thời gian | Không lệch ngày/giờ; thứ tự và nhiều ngày đúng | Test timezone và fixture |
| Hồi quy | RSVP/link/map/editor sẵn có không hỏng | Test liên quan theo dự án |
| Chất lượng | Lint/typecheck/test/build theo scripts thật | Lệnh + exit code + lỗi còn lại |
| Hiệu năng | Không tăng ảnh/JS/font bất hợp lý, không layout shift rõ rệt | Baseline và đo lại cùng điều kiện |

### Bằng chứng kiểm thử đã chạy (phiên 2026-10-20)

| Lệnh / kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm test` (frontend) | 122/122 pass | Gồm 6 test mới `tests/sections-payload.test.mjs` (bố cục riêng, rỗng không render, lịch trình sắp/nhóm, palette có nhãn, editor gửi schema 2) |
| `npm run typecheck` | pass (không có lỗi TS) | |
| `npm run build` | Compiled successfully | |
| `mvn -B verify` (backend) | 70/70 pass, BUILD SUCCESS | Bao gồm `SectionValidationTest` (10 test) và `SectionPrivacyTest` (7 test) |
| `docker compose --env-file .env -f deploy/compose.yml up -d --build` | exit 0 | Build trong container cũng chạy lại test backend |
| Flyway V22 + V23 | `success = t`, `wedding_content_schema_version_check` cho phép 1 hoặc 2, CHECK TIMELINE mới đã áp dụng | Kiểm bằng `psql` |
| API E2E qua edge `http://localhost:8088` | Xem Nhật ký T10 | Chỉ trả mục PUBLIC; mốc PRIVATE bị lọc; section chỉ có mốc riêng biến mất; validate 422/400 đúng; dữ liệu đã khôi phục |
| `curl` `/w/our-wedding`, `/invitation/{id}` | 200 | Chỉ xác nhận route/SSR không lỗi, không phải bằng chứng bố cục |
| Đo contrast, ảnh chụp browser cho 5 bố cục mới | **PASS** (phiên 2) | `node scripts/invitation-review-qa.mjs`: 33 mẫu đo, thấp nhất **4.78** (ngưỡng 4.5), 0 fail; ảnh `sections-desktop.png`, `sections-mobile.png` |
| Contrast trên nền gradient (thẻ nghi lễ) | **PASS** (phiên 3, T14) | 41 mẫu đo (từ 33), **8 mẫu trên nền gradient**, 52 bỏ qua (ảnh/alpha — không kết luận), thấp nhất **4.78**, 0 fail |
| Browser QA editor (`node scripts/editor-review-qa.mjs`) | **PASS** (phiên 5, T16) | 7 khối; cảnh báo rỗng hiện/mất đúng, không báo nhầm hàng cũ `startsAt`; đổi thứ tự đổi cả UI và payload lưu; xem trước "thiệp chung" ẩn mốc PRIVATE; gửi `contentSchemaVersion=2`; ảnh trong `.qa-artifacts/editor-review` |
| Xem trước đủ 3 ngữ cảnh (`guest`/`public`/`invalid`) | **PASS** (phiên 6, T17) | `report.json`: `previewContextOptions=[guest,public,invalid]`; ngữ cảnh lời mời riêng render 7 `.content-section` (đối chứng), ngữ cảnh link sai render **0** và hiện khối `preview-denied` dùng chung câu chữ với trang thiệp |
| Hàng TIMELINE cũ (chỉ `starts_at`) lưu được mà không phải đặt tên mốc | **PASS** (phiên 7, T18) | `report.json`: `legacyMilestone={note:true,required:false,deleteButtons:0}`; `savedLegacyTimeline={timelineLength:0,startsAt:'2027-12-21T04:00:00Z'}`; `legacyTimelineRendered=true`; không có `.error` sau khi lưu |
| Bỏ ngày giờ cũ của mục TIMELINE | **PASS** (phiên 8, T19) | `report.json`: `legacyClear={disabled:true}` khi chưa có mốc; thêm mốc → `legacyClearReady={disabled:false,rows:2}`; bấm bỏ → `legacyCleared={rows:1,hasButton:false,legacyNote:false}`; payload lưu `{startsAt:null,titles:['Mốc mới']}` |
| Contrast bằng pixel thật cho nền ảnh/alpha/opacity | **PASS** (phiên 9, T20) | `report.json`: cover có ảnh `measured 41 + pixelSamples 57`, `skipped 1` (nút disabled), `worst 4.78`, `failures []`; cover không ảnh `contrastNoPhoto {measured 71, pixelSamples 65, failures []}`; đối chứng PNG 2×1 (worst 1:1) và `#767676` (4.54:1 với trắng) |
| QA browser 5 phần (thứ tự, lịch trình, palette) | **PASS** (phiên 2) | `report.json`: order INTRO→FAMILY→CEREMONY→TIMELINE→DRESS_CODE; timeline `2027-12-20T01:23Z` trước `09:00Z`; 1 nhãn “Dự kiến”; palette `Trắng ngà\|#FFFDF9`, `Đỏ trầm\|#823B42`; không tràn ngang ở 390px |

### Ngưỡng chất lượng

- Không horizontal overflow ở viewport đã kiểm tra; không cắt tên, giờ hoặc CTA.
- Body contrast mục tiêu WCAG AA (4.5:1; chữ lớn 3:1); focus thấy rõ. Trường hợp không đo được phải ghi NOT VERIFIED.
- Vùng chạm chính mục tiêu khoảng 44×44 CSS px khi phù hợp; label không phụ thuộc placeholder.
- Không dùng điểm Lighthouse làm bằng chứng duy nhất. Mục tiêu thực địa nếu đo được: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms; không tuyên bố đạt Core Web Vitals từ một lần chạy lab.
- Không bắt buộc thêm E2E framework nếu dự án chưa có; chọn cách test phù hợp và ghi rõ phần kiểm tra thủ công/chưa xác minh.
- Không đánh dấu PASS cho lệnh chưa chạy hoặc lệnh bị môi trường chặn.

## 9. Quy tắc lưu tiến độ để chạy nhiều phiên

### Trạng thái hợp lệ

- `TODO`: chưa làm.
- `IN_PROGRESS`: đang làm; tối đa một task triển khai chính tại một thời điểm.
- `BLOCKED`: cần quyết định/quyền/môi trường; ghi chính xác điều cần để gỡ.
- `DONE`: code hoặc đầu ra đã có và tiêu chí task đã kiểm tra.
- `SKIPPED`: không áp dụng, có lý do.

### Sau mỗi task phải ghi

- Trạng thái và thời điểm cập nhật thực tế, không tự bịa thời gian.
- File thật đã đọc/sửa; thay đổi chính và phụ thuộc mới nếu có.
- Lệnh đã chạy, kết quả, kiểm tra thủ công; tách lỗi cũ và lỗi mới.
- Việc còn lại, rủi ro và task tiếp theo cụ thể.
- Nếu chưa xong: ghi điểm dừng ngay tại bước đang dở, không đánh dấu DONE.

### Khi sắp hết phiên

- Dừng ở ranh giới task; tránh để schema và renderer lệch nhau không được ghi chú.
- Cập nhật Task Ledger, Decision Log và Handoff.
- Ghi tiến trình/server đang chạy nếu có, cách chạy lại, không ghi token hoặc URL mời thật.
- Không tự tạo commit để "lưu tiến độ" nếu chưa được yêu cầu; code trên đĩa và git diff đủ để tiếp tục. Nếu người dùng cho phép commit, ghi hash thực tế.

## 10. Task Ledger — thứ tự triển khai

> AI có thể tách task thành task con khi cần, nhưng phải giữ ID cũ để truy vết. Thêm đường dẫn file thực tế sau khảo sát. Không điền "dự kiến đã sửa".

| ID | Task | Phụ thuộc | Trạng thái |
|---|---|---|---|
| T01 | Khảo sát code và baseline | — | DONE (2026-10-20) |
| T02 | Chốt hướng thiết kế, dữ liệu và visibility | T01 | DONE (2026-10-20) |
| T03 | Hoàn thiện data contract và resolver quyền | T02 | DONE (2026-10-20) |
| T04 | Tokens, typography, layout và lát cắt thiết kế | T02 | DONE (2026-10-20) |
| T05 | Giới thiệu hai bạn: renderer + editor | T03, T04 | DONE (2026-10-20) |
| T06 | Gia đình: renderer + editor | T03, T04 | DONE (2026-10-20) |
| T07 | Nghi lễ riêng: renderer + editor + access states | T03, T04 | DONE (2026-10-20) |
| T08 | Mốc lịch trình: renderer + editor + timezone | T03, T04, T07 | DONE (2026-10-20) |
| T09 | Trang phục: renderer + editor | T03, T04 | DONE (2026-10-20) |
| T10 | Kết nối preview/lưu/xuất bản public/private | T05–T09 | DONE (2026-10-20) |
| T11 | Responsive, accessibility, motion, ảnh và font | T10 | DONE (2026-10-20, phiên 2) — browser QA 33 case có đủ 5 phần; contrast 33 mẫu, thấp nhất 4.78, 0 fail; không tràn ngang 320–1920; ảnh chụp trong `.qa-artifacts/invitation-review` |
| T12 | Security, hồi quy, sửa lỗi và nghiệm thu | T10, T11 | DONE (2026-10-20, phiên 2) — ma trận test + API payload + browser QA (sealed/PIN + 5 phần); rà diff 16 file đúng phạm vi, không secret/PII/debug log. Giới hạn còn lại ghi ở Handoff |
| T13 | Dọn code và bàn giao có thể tiếp tục | T12 | DONE (2026-10-20, phiên 2) — README, PLAN và Handoff cập nhật; log tạm dọn |
| T14 | Contrast audit cho nền gradient (đóng giới hạn T11) | T11 | DONE (2026-10-20, phiên 3) — measured 41 (từ 33), gradientSamples 8, skipped 52 (từ 54), worst 4.78, 0 fail; mặc định origin của QA đổi sang `localhost` vì Next 16 chặn `127.0.0.1` |
| T15 | Editor: sắp xếp người/nhóm và cảnh báo mục bật nhưng rỗng | T05, T06 | DONE (2026-10-20, phiên 4) — nút ↑/↓ cho người/nhóm/thành viên (có `aria-label`); cảnh báo khi mục bật nhưng rỗng, không báo nhầm hàng cũ có `startsAt`/`color`; `npm test` 123/123, typecheck + build pass |
| T16 | Browser QA cho editor (mock `/api/v1/admin/*`) | T15 | DONE (2026-10-20, phiên 5) — PASS: 7 khối, cảnh báo rỗng hiện/mất đúng, không báo nhầm hàng cũ `startsAt`, đổi thứ tự đổi cả UI + payload lưu, xem trước ẩn mốc PRIVATE, `contentSchemaVersion=2`; 3 ảnh chụp |
| T17 | Xem trước ngữ cảnh thứ ba: link sai/đã thu hồi/hết hạn | T15, T16 | DONE (2026-10-20, phiên 6) — đủ 3 ngữ cảnh theo mục 5; ngữ cảnh link sai không render phần nào, dùng chung câu chữ với trang thiệp (`access-copy.ts`); `npm test` 124/124; browser QA PASS kèm đối chứng 7 phần ở ngữ cảnh hợp lệ |
| T18 | Hàng TIMELINE cũ chỉ có `starts_at` phải lưu được (không bắt đặt tên mốc) | T08, T15 | DONE (2026-10-20, phiên 7) — `defaultPayload` không còn sinh mốc rỗng; mốc gốc chỉ hiển thị, bị bỏ khỏi payload khi lưu nên `starts_at` giữ nguyên; `npm test` 125/125; `mvn -B verify` 71/71; browser QA PASS (`legacyMilestone.required=false`, `savedLegacyTimeline.timelineLength=0`, `legacyTimelineRendered=true`) |
| T19 | Bỏ ngày giờ cũ (`starts_at`) của mục TIMELINE khi đã có mốc chi tiết | T18 | DONE (2026-10-20, phiên 8) — nút chỉ bật khi có mốc có tên; lưu `startsAt=null` và giữ mốc; `npm test` 126/126; `mvn -B verify` 72/72; browser QA PASS (`legacyClear.disabled=true` → `legacyClearReady.disabled=false` → `legacyCleared.rows=1` → `legacyClearedSaved={startsAt:null,titles:['Mốc mới']}`) |
| T20 | Contrast bằng pixel thật cho nền ảnh/alpha (đóng giới hạn T11) | T11, T14 | DONE (2026-10-20, phiên 9) — 41 mẫu computed-style + 57 mẫu pixel (trước: 52 bỏ qua), skipped 1 (nút disabled, miễn trừ WCAG 1.4.3), worst 4.78, 0 fail; cover không ảnh 71+65 mẫu, 0 fail; sửa `.countdown-note` và scrim hero; đối chứng PNG 1:1 và 4.54:1; `npm test` 127/127 |

### T01 — Khảo sát và baseline

- Điền Project Snapshot, file map và vấn đề có bằng chứng.
- Xác định scripts từ package/config thực tế. Chạy kiểm tra baseline khả dụng trước sửa.
- Kiểm tra dữ liệu placeholder và các route hiện có; không mở rộng sang dữ liệu production không cần thiết.
- **Done khi:** đã xác định điểm sửa cho cả 5 section, luồng lưu, cơ chế quyền và giới hạn môi trường.

### T02 — Thiết kế và quyết định dữ liệu

- Chọn một hướng thị giác nhất quán dựa trên UI/assets đang có; ghi lý do ngắn.
- Lập mapping trường cũ → trường cần thiết, visibility matrix cuối và hành vi rỗng.
- Ghi quyết định chưa xác nhận: thông tin cặp đôi, gia đình, nghi lễ, giờ thật, màu/ảnh yêu thích.
- **Done khi:** có kế hoạch cụ thể theo file, không còn mâu thuẫn public/private; việc cần hỏi được tách khỏi việc có thể triển khai.

### T03 — Data contract và quyền

- Bổ sung schema/type/validation ở mức tối thiểu; giữ tương thích dữ liệu cũ.
- Tạo hoặc chỉnh projection public/guest/editor ở tầng tin cậy; kiểm tra scope sự kiện.
- Kiểm soát cache, token/link riêng và mutation theo kiến trúc thực tế.
- **Done khi:** có test hoặc kiểm tra response chứng minh public không chứa dữ liệu riêng và guest A không đọc dữ liệu guest B. Nếu môi trường chưa cho kiểm chứng, ghi chưa xác minh, không đánh dấu toàn task DONE.

### T04 — Nền thiết kế

- Tạo/chỉnh token, font, container, heading, spacing và motion dùng chung.
- Làm một section mẫu ở mobile/desktop; kiểm tra chữ tiếng Việt, contrast, thiếu ảnh.
- **Done khi:** hướng thiết kế có kết quả render kiểm tra được, không chỉ lời mô tả hoặc CSS chưa sử dụng.

### T05 — Giới thiệu hai bạn

- Triển khai bố cục chân dung/câu chuyện cùng trường editor riêng cho từng người.
- Kiểm tra tên dài, thiếu ảnh, thiếu mô tả, reload giữ dữ liệu.
- **Done khi:** đạt mục 4.1 và không còn placeholder đã xác minh trong section.

### T06 — Gia đình

- Triển khai nhóm gia đình linh hoạt, không hardcode cấu trúc cha/mẹ.
- Kiểm tra một nhóm, hai nhóm lệch nội dung và quyền của địa chỉ/liên hệ.
- **Done khi:** đạt mục 4.2, dữ liệu sửa/lưu đúng và không tràn trên mobile.

### T07 — Nghi lễ riêng

- Triển khai UI lời mời, cấu hình sự kiện và quyền theo khách.
- Hoàn thiện loading, empty, invalid, expired/revoked theo khả năng hệ thống thực tế.
- Kiểm tra metadata/payload/API/cache và liên kết asset/export liên quan.
- **Done khi:** đạt mục 4.3 và các test truy cập trái quyền; không dùng noindex làm bằng chứng bảo mật.

### T08 — Lịch trình

- Triển khai timeline, trường thời gian chuẩn, nhóm theo ngày và nội dung theo quyền.
- Kiểm tra thứ tự, timezone, nhiều ngày, dữ liệu chưa xác nhận và thay đổi sự kiện liên quan.
- **Done khi:** đạt mục 4.4; thêm lịch nếu có không làm lộ nội dung riêng.

### T09 — Trang phục

- Triển khai palette có nhãn, nội dung gợi ý, editor màu và trạng thái không có palette.
- Kiểm tra màu sáng/tối, mã sai, nhiều chữ và nội dung rỗng.
- **Done khi:** đạt mục 4.5; không thêm quy định ăn mặc ngoài dữ liệu người dùng.

### T10 — Tích hợp end-to-end

- Nối dữ liệu đã lưu vào cả public/private; đảm bảo shared theme không làm shared dữ liệu riêng.
- Kiểm tra preview theo khách, dirty state, save lỗi/thành công, reload và publish semantics đang có.
- **Done khi:** có đường đi kiểm tra thực tế từ editor đến hai loại thiệp, không chỉ mock local state.

### T11 — Polish có kiểm chứng

- Kiểm tra viewport theo mục 8; sửa overflow, spacing, alignment, focus và đọc bàn phím.
- Giảm motion, tối ưu font/ảnh và trạng thái lỗi tải.
- **Done khi:** có bằng chứng trước/sau hoặc kết quả kiểm tra cụ thể; ảnh chụp chỉ dùng dữ liệu giả.

### T12 — QA và bảo mật

- Chạy ma trận test; xác minh public/private trên payload thay vì chỉ screenshot.
- Chạy scripts thật; ghi mọi fail, blocker hoặc test chưa thực hiện.
- Rà soát git diff để tìm thay đổi ngoài phạm vi, secret, dữ liệu cá nhân, debug log và dependency không cần.
- **Done khi:** không còn lỗi nghiêm trọng trong phạm vi; giới hạn còn lại minh bạch. Nếu còn blocker bảo mật, không xác nhận sẵn sàng public.

### T13 — Bàn giao

- Dọn code chết/phần thử nghiệm do đợt này tạo; không xóa thay đổi người dùng không liên quan.
- Cập nhật hướng dẫn chạy, cấu hình cần thiết bằng tên biến không có giá trị secret, test và dữ liệu còn cần nhập.
- Điền Handoff cuối; báo cáo việc đã làm, chưa làm và cách chạy tiếp.
- **Done khi:** phiên mới có thể hiểu trạng thái chỉ từ file này và repository.

### T14 — Contrast audit cho nền gradient/ảnh

- Mở rộng `scripts/contrast-audit.mjs`: khi lớp nền gần nhất là `linear/radial/conic-gradient` với các stop **đặc**, đo theo **stop xấu nhất** (bảo thủ) thay vì bỏ qua; chỉ bỏ qua khi có `url(...)` (ảnh), stop có alpha, hoặc hàm không nhận dạng.
- Thêm `className` và cờ `gradient` vào mẫu để assertion nhắm đúng phần tử (thẻ nghi lễ dùng nền gradient giấy).
- Cập nhật `scripts/invitation-review-qa.mjs`: bắt buộc có mẫu đo từ nền gradient và vẫn 0 mẫu fail; ghi số mẫu/skip/worst vào `report.json`.
- **Done khi:** QA PASS với số mẫu đo tăng so với baseline 33 (skip giảm so với 54), có ít nhất một mẫu từ `.ceremony-card`, 0 fail; nếu phát hiện cặp màu không đạt thì sửa CSS và ghi lại.

### T15 — Editor: sắp xếp trong phần và cảnh báo mục rỗng

- Thêm nút ↑/↓ (có `aria-label`) để đổi thứ tự **người trong INTRO**, **nhóm trong FAMILY** và **thành viên trong một nhóm** — renderer giữ nguyên thứ tự mảng nên đây chính là thứ tự hiển thị (INTRO: người đầu tiên đứng trước; FAMILY: nhóm đầu tiên ở cột trái).
- Thêm cảnh báo **không chặn lưu** khi mục đang bật nhưng không có nội dung hiển thị, phản chiếu đúng quy tắc rỗng của renderer, kể cả fallback của hàng cũ (`startsAt` cho TIMELINE, `color` cho DRESS_CODE) để không báo nhầm.
- Test tĩnh theo quy ước hiện có (`frontend/tests/*.test.mjs`) + `npm run typecheck` + `npm run build`.
- **Done khi:** có nút sắp xếp ở cả 3 cấp, cảnh báo đúng điều kiện và không báo nhầm cho hàng cũ, test + typecheck + build pass.

### T16 — Browser QA cho editor

- Thêm `scripts/editor-review-qa.mjs`: Chrome headless + CDP, mô phỏng toàn bộ `/api/v1/admin/*` **trong trang** (không đăng nhập backend thật, không ghi dữ liệu) rồi điều khiển `/admin/wedding`.
- Kiểm tra: nạp cấu hình + bộ trường riêng của 5 loại; **cảnh báo mục bật nhưng rỗng** xuất hiện và mất đi khi nhập nội dung; **không báo nhầm** cho hàng cũ chỉ có `startsAt`; **đổi thứ tự** người/nhóm thật sự đổi thứ tự trường và thứ tự trong payload gửi lên; nút ở biên bị `disabled`; xem trước theo ngữ cảnh ẩn mốc `PRIVATE` ở thiệp chung; `contentSchemaVersion` gửi là 2.
- **Done khi:** script PASS (exit 0) với các khẳng định trên, có ảnh chụp trong `.qa-artifacts/editor-review`, không có exception trong browser.

### T17 — Xem trước ngữ cảnh link không hợp lệ

- Mục 5 yêu cầu preview tối thiểu **3 ngữ cảnh**; T16 mới có 2 (`guest`/`public`). Thêm ngữ cảnh thứ ba: link sai/đã thu hồi/phiên hết hạn.
- Một nguồn câu chữ duy nhất: rút thông báo "Thiệp hiện không khả dụng…" từ `invitation-entry.tsx` sang `features/invitation/access-copy.ts` để trang thiệp thật và phần xem trước không lệch nhau (không sao chép chuỗi).
- Ngữ cảnh link sai trả về **danh sách phần rỗng** và hiện khối giải thích: khách không thấy phần nào, kể cả mục công khai; ghi rõ đây chỉ là mô phỏng câu chữ, không phải lớp bảo vệ.
- **Done khi:** xem trước có đủ 3 lựa chọn; ngữ cảnh link sai render 0 phần nội dung và hiện đúng câu chữ dùng chung; có test tĩnh và browser QA (kèm đối chứng để phép đếm 0 không rỗng nghĩa).

### T18 — Hàng TIMELINE cũ phải lưu được

- Lỗi phát hiện khi đọc code + đối chiếu DB local: hàng TIMELINE cũ chỉ có `starts_at` bị editor nâng cấp thành mốc `{at, title:''}`; `firstProblem()` chặn lưu và server cũng từ chối mốc thiếu tên → **không lưu được bất kỳ thay đổi nào** trên trang.
- `defaultPayload('TIMELINE')` không sinh mốc rỗng; mốc gốc chỉ để hiển thị (`timelineForEditor`), bị loại khỏi payload khi lưu (`forSave`) nên `starts_at` giữ nguyên và renderer dùng lại nhánh legacy.
- Kiểm tra gần trường bỏ qua mốc gốc nhưng vẫn bắt mốc người dùng thêm; điều kiện "cần ít nhất một mốc" khớp server (không phụ thuộc `enabled`).
- **Done khi:** lưu được khi chưa đặt tên mốc cũ, `starts_at` không đổi, thiệp vẫn hiển thị ngày giờ cũ, và có test backend + test tĩnh + browser QA chứng minh.

### T19 — Bỏ "ngày giờ cũ" của mục TIMELINE

- T18 giữ `starts_at` cũ để không mất dữ liệu nhưng chưa có cách bỏ; ngày test vẫn nằm trong DB và vẫn được trả cho lời mời riêng.
- Chỉ bật nút khi đã có **mốc chi tiết có tên**: server luôn cần ít nhất một nguồn mốc (`firstMilestone`), nên không phải nới lỏng validation và không thể lưu mục lịch trình rỗng nghĩa.
- Bấm nút → `startsAt=null` + bỏ mốc gốc khỏi payload; mốc chi tiết giữ nguyên; CHECK V23 vẫn thoả vì `payload->'timeline'` còn.
- **Done khi:** nút tắt khi chưa có mốc và bật khi có; lưu được với `startsAt=null`; payload chỉ còn mốc chi tiết; có test tĩnh, test backend và browser QA.

### T20 — Contrast bằng pixel thật cho nền ảnh/alpha/opacity

- Đóng giới hạn của T11/T14: mẫu có nền `url(...)`, nền alpha hoặc chữ opacity < 1 không còn bị bỏ qua; `inspectContrast` trả chúng trong `pending` kèm hộp chữ (kẹp trong rect phần tử) và opacity tích luỹ.
- `scripts/invitation-review-qa.mjs` ẩn chữ tạm (`data-contrast-probe`), chụp đúng vùng chữ qua CDP, giải mã PNG bằng `scripts/contrast-pixels.mjs` (chỉ `node:zlib`, không thêm dependency) và lấy contrast theo pixel nền XẤU NHẤT; opacity < 1 được composite lại theo từng pixel.
- Miễn trừ WCAG 1.4.3: nút disabled/`aria-disabled` không bị đo (mờ đi là chủ ý). Hộp chữ kẹp trong rect phần tử để không chụp nhầm viền/đốm trang trí sát bên (artifact từng làm `.timeline-day` ra 1.0).
- Đối chứng cố định trong script: PNG 2×1 đen/trắng (worst phải = 1:1) và 1×1 `#767676` (4.54:1 với trắng); `CONTRAST_QA_DUMP=1` lưu từng vùng đã đo vào `.qa-artifacts/invitation-review/probes`.
- Hai lỗi thật được sửa: `.countdown-note` dùng `--compat-color-596354` (trước đo 3.82:1); scrim hero `.cover-photo+.cover-content::before` nâng 62%→76% kèm plateau 52% (eyebrow trước 4.15:1) và chỉ áp dụng cho cover CÓ ảnh; cover không ảnh được audit riêng (chữ accent trên nền sáng) và đạt.
- **Done khi:** `npm test` + typecheck + build pass; `node scripts/invitation-review-qa.mjs` PASS với `pixelSamples ≥ 5`, có mẫu pixel trên hero, `contrastNoPhoto.failures = []`; editor QA và public payload QA vẫn PASS.

## 11. Nhật ký task — thêm một mục sau mỗi task

```text
Task ID:
Trạng thái:
Cập nhật lúc:
Mục tiêu đã đạt:
File đã đọc/sửa:
Thay đổi chính:
Lệnh đã chạy và kết quả:
Kiểm tra thủ công / bằng chứng:
Chưa kiểm chứng / lỗi còn lại:
Bước tiếp theo:
```

### Nhật ký thực thi (phiên 2026-10-20)

```text
Task ID: T01 — Khảo sát code và baseline
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (giờ máy cục bộ)
Mục tiêu đã đạt: điền Project Snapshot, bản đồ file, danh sách vấn đề có bằng chứng, xác định nguồn dữ liệu "Hi".
File đã đọc: frontend/package.json, backend/pom.xml, frontend/src/app/** (route), frontend/src/features/invitation/{design.tsx,design.css,sections.tsx,layout.ts,invitation-entry.tsx,event-tools.tsx}, frontend/src/features/admin/{section-editor.tsx,design-editor.tsx,layout-editor.tsx}, frontend/src/shared/*, backend/src/main/java/vn/wedding/invitation/** (GuestService, SectionService, SectionController, DesignController, AccessGate, AdminService, LayoutService, Texts, ApiErrors), backend/src/main/resources/db/migration/V1,V4,V17,V19, backend/src/test/**, frontend/tests/**, deploy/compose.yml, scripts/README.md.
Thay đổi chính: chỉ cập nhật PLAN_TASK.md (khảo sát), chưa sửa source.
Lệnh đã chạy và kết quả: `npm test` (frontend) 116/116 pass; `npm run typecheck` pass; `mvn -B verify` (backend) 60/60 BUILD SUCCESS; `docker ps` cho thấy stack local đang chạy (db/backend/frontend/edge, edge 8088); `psql` xác minh wedding_sections có 5 mục body='Hi' ở cả DRAFT và PUBLISHED.
Chưa kiểm chứng / lỗi còn lại: chưa chạy browser automation, chưa đo contrast, chưa kiểm thử trên thiết bị thật.
Bước tiếp theo: T02 → T03.
```

```text
Task ID: T03 — Data contract và resolver quyền
Trạng thái: DONE
Cập nhật lúc: 2026-10-20
Mục tiêu đã đạt: thêm cột `payload` jsonb + content schema 2; validate whitelist theo loại; lọc payload riêng tư ở server; publish copy cả payload.
File đã sửa: backend/src/main/resources/db/migration/V22__section_payload.sql, V23__timeline_payload_source.sql, backend/src/main/java/vn/wedding/invitation/wedding/SectionService.java, wedding/LayoutService.java, invitations/GuestService.java, admin/AdminService.java, backend/src/test/java/vn/wedding/invitation/{SectionValidationTest,SectionPrivacyTest}.java
Thay đổi chính: `SectionService.Section` có `Map<String,Object> payload`; `normalized()` chỉ giữ trường đã biết và chuẩn hoá NFC; `validatePayload()` giới hạn số lượng/độ dài/mã màu; `list()` lọc mốc TIMELINE `PRIVATE` khỏi bản công khai và đặt `startsAt=null` khi payload đã có danh sách mốc; V23 nới CHECK để TIMELINE được lấy mốc từ payload.
Lệnh đã chạy và kết quả: `mvn -B verify` 70/70 pass; sau khi rebuild Docker: flyway V22+V23 success=t.
Chưa kiểm chứng / lỗi còn lại: khi thêm payload lần đầu, ràng buộc CHECK của V17 làm save trả 503 — unit test (mock JdbcTemplate) không phát hiện được, chỉ lộ ra khi gọi API thật; đã xử lý bằng V23. Bài học: thay đổi ràng buộc DB phải kiểm chứng bằng stack thật.
Bước tiếp theo: T04–T09 (renderer + editor), T10 (nối luồng).
```

```text
Task ID: T04–T09 — Năm phần có bố cục và editor riêng
Trạng thái: DONE
Cập nhật lúc: 2026-10-20
Mục tiêu đã đạt: mỗi loại nội dung có renderer và bộ trường riêng; không dùng một card chung; giữ tương thích hàng cũ.
File đã sửa: frontend/src/features/invitation/sections.tsx, design.css, frontend/src/features/admin/section-editor.tsx, frontend/src/app/admin/wedding/page.tsx, frontend/src/app/admin/admin.css, frontend/tests/sections-payload.test.mjs (mới)
Thay đổi chính:
- INTRO: bố cục chân dung bằng chữ, hai cột lệch nhịp trên desktop; danh sách người (tên/cách gọi/mô tả) sửa độc lập.
- FAMILY: hai khối gia đình đối ứng, nhãn nhóm tự đặt, thành viên + quan hệ; hỗ trợ chỉ một nhóm.
- CEREMONY: khối thiệp giấy (viền đôi), mỗi nghi lễ có tên/lời dẫn/thời gian/địa điểm/hướng dẫn.
- TIMELINE: mốc sắp theo thời gian, nhóm theo ngày, nhãn "Dự kiến", mỗi mốc có mức hiển thị PUBLIC/PRIVATE.
- DRESS_CODE: palette có tên màu + mã hex đi kèm swatch, mục "Nên tránh".
- Phần rỗng không render khối trống; hàng cũ (body 'Hi' + starts_at + color) vẫn hiển thị như trước.
Lệnh đã chạy và kết quả: `npm test` 122/122 pass (thêm 6 test mới), `npm run typecheck` pass, `npm run build` Compiled successfully.
Chưa kiểm chứng / lỗi còn lại: chưa có ảnh chụp/so sánh trực quan cho 5 bố cục mới; INTRO chưa hỗ trợ ảnh chân dung (chỉ typography) — xem Decision Log D07.
Bước tiếp theo: T10/T11/T12.
```

```text
Task ID: T10 — Tích hợp lưu/phát hành (kiểm chứng bằng API thật)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20
Mục tiêu đã đạt: nội dung có cấu trúc đi hết luồng sửa → lưu nháp → phát hành → hiển thị, và quyền công khai/riêng tư đúng ở payload.
File đã sửa: frontend/src/app/admin/wedding/page.tsx (gửi contentSchemaVersion 2), backend AdminService (publish copy `payload`), SectionEditor (xem trước theo hai ngữ cảnh).
Lệnh đã chạy và kết quả: kịch bản PowerShell trong %TEMP% gọi API thật qua edge localhost:8088 (đăng nhập owner, lưu nháp có cấu trúc, phát hành, đọc lại API công khai, rồi khôi phục dữ liệu gốc). Kết quả:
  saved=draft-structured
  reject_bad_colour=422 | reject_schema_version=422 | reject_duplicate_milestone=422 | reject_non_object_payload=400
  public_kinds=INTRO,FAMILY,TIMELINE,DRESS_CODE (mục CEREMONY audience=PRIVATE không xuất hiện)
  public_timeline_items=1 | public_timeline_startsAt_is_null=True | public_ceremony_present=False | public_private_milestone_leaked=False
  draft_count=5 | draft_timeline_items=2 | draft_ceremony_present=True | draft_private_milestone_present=True
  public_sections_when_only_private_milestones=0
  Khôi phục: restored_kinds=INTRO,FAMILY,CEREMONY,TIMELINE,DRESS_CODE; restored_intro_body=Hi; restored_timeline_startsAt có giá trị; restored_dress_colour=#ff5c5c; payload=null; DB còn 5+5 hàng, 0 hàng có payload.
Chưa kiểm chứng / lỗi còn lại: kịch bản chạy trên stack Docker local và chưa được thêm vào repo (vì nó ghi/phát hành nội dung thiệp); chưa kiểm thử phiên khách qua PIN trong browser.
Bước tiếp theo: T11 (đo contrast, ảnh chụp), T12 (browser QA), T13.
```

```text
Task ID: T11 + T12 — Polish và QA có kiểm chứng (phiên 2)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 2)
Mục tiêu đã đạt: mở rộng QA browser để thực sự chạy 5 phần mới (trước đây fixture thiếu `sections`), đo contrast trong browser thật, kiểm tra tràn ngang, rà diff.
File đã sửa: scripts/invitation-review-qa.mjs (thêm fixture `sectionsLong`/`sectionsShort`, khối assertion 5 phần, nhúng `inspectContrast` từ scripts/contrast-audit.mjs, ảnh chụp `sections-desktop/mobile`), scripts/public-payload-qa.mjs (mới, chỉ đọc), PLAN_TASK.md, README-IMPLEMENTATION.md, scripts/README.md.
Thay đổi chính:
- Fixture thiệp khách giờ có đủ 5 loại: INTRO 2 người (kèm 1 chuỗi không khoảng trắng dài để thử ngắt dòng), FAMILY 2 nhóm/5 thành viên ở bộ dài và 2 nhóm/3 thành viên ở bộ ngắn, CEREMONY audience PRIVATE (2 nghi lễ), TIMELINE 3 mốc spanning 2 ngày có 1 mốc PRIVATE + tentative, DRESS_CODE palette 3 màu + avoid.
- Assertion mới: thứ tự 5 phần, tiêu đề, số người/nhóm/nghi lễ, nhãn `Thời gian/Địa điểm/Địa chỉ`, thứ tự mốc theo thời gian, nhãn “Dự kiến”, tên màu đi kèm mã hex, swatch, khối “Nên tránh”, và việc mốc/mục riêng vẫn hiển thị cho khách hợp lệ (quyền do máy chủ quyết định).
- Nhúng `inspectContrast` vào trang và bắt buộc ≥10 mẫu đo với 0 mẫu fail.
Lệnh đã chạy và kết quả:
- `node scripts/invitation-review-qa.mjs` → PASS (exit 0). Đo contrast: measured=33, skipped=54, worst=4.78, failures=[] (ngưỡng 4.5). Sections: order đủ 5, introRoles=[Cô dâu, Chú rể], familyGroups=2/familyMembers=3, ceremonyCards=1, ceremonyMetaLabels=[Thời gian, Địa điểm, Địa chỉ], timelineTimes=[2027-12-20T01:23:00Z, 2027-12-20T09:00:00Z] (đã sắp), timelineDays=["Thứ Hai, 20 tháng 12"], timelineTentative=1, palette=[Trắng ngà|#FFFDF9, Đỏ trầm|#823B42], swatches=2, avoid=true.
- 21 case theme×viewport (320–1440) với nội dung dài: không tràn ngang, không clip; 6 case short-copy 320–1920 + zoom 125–200% vẫn pass; ảnh chụp `sections-desktop.png` (80 KB) và `sections-mobile.png` (37 KB).
- `npm test` (frontend) 122/122 pass; `mvn -B verify` 70/70 BUILD SUCCESS (chạy lại phiên này).
- Rà diff: changeset `e42341e` gồm đúng 16 file trong phạm vi (backend sections/migrations/2 test, frontend sections/design.css/editor/2 test, 2 tài liệu); không có `.env`, secret, PII, dependency mới, hay log debug (chỉ script QA có console.log chủ ý).
- Thêm `scripts/public-payload-qa.mjs` (chỉ đọc, không đăng nhập/không ghi): kiểm tra payload `/api/v1/public/weddings/{slug}` không chứa mục `PRIVATE`/disabled, không có mốc TIMELINE `PRIVATE`, `startsAt` phải null khi payload có danh sách mốc, và không có khoá chỉ dành cho lời mời riêng. Kết quả: PASS trên stack local (`5 mục, 0 mục không phải PUBLIC`, exit 0); slug sai → FAIL HTTP 403, exit 1; **positive control** với server giả cố tình rò dữ liệu → bắt đủ 5 vấn đề, exit 1 (chứng minh bộ kiểm tra không rỗng).
Chưa kiểm chứng / lỗi còn lại: audit contrast là mẫu (54 phần tử bị bỏ qua vì nền gradient/alpha, ví dụ thẻ nghi lễ); chưa thử Safari iOS/Zalo trên thiết bị thật; chưa in thử PDF/QR; INTRO chưa có ảnh chân dung.
Bước tiếp theo: T13.
```

```text
Task ID: T13 — Bàn giao (phiên 2)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 2)
Mục tiêu đã đạt: tài liệu và Handoff phản ánh đúng trạng thái sau khi QA; log tạm dọn.
File đã sửa: PLAN_TASK.md, README-IMPLEMENTATION.md (mục “Cập nhật đợt 7” bổ sung bằng chứng QA + giới hạn), scripts/invitation-review-qa.mjs.
Thay đổi chính: Task Ledger T11/T12/T13 → DONE kèm giới hạn; bảng bằng chứng §8 cập nhật; Handoff viết lại.
Lệnh đã chạy và kết quả: `node --check scripts/invitation-review-qa.mjs` OK; dừng dev server (port 3000 không còn listener); xoá log tạm `fe-dev-s14.log`, `fe-dev-s14.err.log`; giữ `s14-invitation-qa.log` và `s14-sections-e2e.log` làm bằng chứng (đã gitignore theo `*.log`).
Chưa kiểm chứng / lỗi còn lại: như mục T11/T12 ở trên.
Bước tiếp theo: đợi người dùng nhập nội dung thật và quyết định về ảnh chân dung INTRO; phiên sau có thể mở rộng contrast audit sang các phần tử có nền gradient.
```

```text
Task ID: T14 — Contrast audit cho nền gradient (phiên 3)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 3)
Mục tiêu đã đạt: đo được contrast cho chữ nằm trên nền gradient (thẻ nghi lễ) thay vì bỏ qua, giữ nguyên nguyên tắc "không kết luận khi không đo được".
File đã sửa: scripts/contrast-audit.mjs, scripts/invitation-review-qa.mjs, PLAN_TASK.md, README-IMPLEMENTATION.md, scripts/README.md.
Thay đổi chính:
- contrast-audit.mjs: tách helper `parseColor`/`luminance`/`contrast`; thêm `gradientStops()` đọc các stop ĐẶC của `linear/radial/conic-gradient`; chọn stop cho contrast XẤU NHẤT (`worstStop`) thay vì trung bình; chỉ bỏ qua khi có `url(...)`, stop có alpha, hoặc hàm màu lạ. Mẫu có thêm `className` và cờ `gradient`; bổ sung `dt/dd/li` vào danh sách phần tử đo.
- invitation-review-qa.mjs: nhúng source bằng cách bỏ toàn bộ tiền tố `export ` (trước đây chỉ thay lần đầu, sẽ vỡ nếu file có nhiều export); bắt buộc có mẫu gradient và mẫu thuộc class `ceremony`; ghi `gradientSamples` vào `report.json`.
- Mặc định origin đổi từ `http://127.0.0.1:3000` sang `http://localhost:3000`: Next.js 16 dev chặn origin `127.0.0.1` (allowedDevOrigins) khiến trang không hydrate và QA timeout ngay bước điều hướng đầu.
Lệnh đã chạy và kết quả:
- `node scripts/invitation-review-qa.mjs` → PASS (exit 0) với mặc định mới: contrast `{measured:41, skipped:52, gradientSamples:8, worst:4.78, failures:[]}` (trước T14: measured 33, skipped 54). Chữ trên thẻ nghi lễ (nền gradient giấy) nay được đo và đạt ngưỡng.
- `node --check` cả hai script OK; `npm test` 122/122; `mvn -B verify` 70/70 (chạy lại đầu phiên).
Chưa kiểm chứng / lỗi còn lại: 52 phần tử vẫn bỏ qua vì nền là ảnh hoặc có alpha (hero có ảnh, lightbox, lớp phủ) — cố ý không kết luận; chưa kiểm thử thiết bị thật.
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: ảnh chân dung INTRO (D07), hoặc lấy mẫu pixel thật cho nền ảnh (ngoài phạm vi hiện tại).
```

```text
Task ID: T15 — Editor: sắp xếp trong phần và cảnh báo mục rỗng (phiên 4)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 4)
Mục tiêu đã đạt: bổ sung hai khoảng trống thật của editor phát hiện khi đọc code — (1) không thể đổi thứ tự người/nhóm dù renderer hiển thị đúng theo thứ tự mảng, (2) mục đang bật nhưng rỗng biến mất khỏi thiệp mà không có cảnh báo.
File đã sửa: frontend/src/features/admin/section-editor.tsx, frontend/src/app/admin/admin.css, frontend/tests/sections-payload.test.mjs, PLAN_TASK.md, README-IMPLEMENTATION.md.
Thay đổi chính:
- `moveItem<T>()` (helper thuần, không đột biến state) + nút ↑/↓ có `aria-label` ở ba cấp: người trong INTRO, nhóm trong FAMILY, thành viên trong một nhóm; nút ở biên bị `disabled`; tất cả `type="button"` nên không submit form và nằm trong `<fieldset disabled={busy}>`.
- `hasVisibleContent()` phản chiếu **đúng** quy tắc rỗng của renderer `sections.tsx`, kể cả fallback hàng cũ (`startsAt` cho TIMELINE, `color` cho DRESS_CODE) nên không báo nhầm; cảnh báo chỉ hiện khi `row.enabled && !hasVisibleContent(row)`, không chặn lưu (người dùng vẫn có thể lưu nháp dở).
- CSS `.section-empty-warning` dùng token trạng thái có sẵn (`--status-warning-*`), không hardcode màu.
- Test tĩnh mới trong `tests/sections-payload.test.mjs` kiểm tra helper, aria-label ba cấp, điều kiện cảnh báo, hai fallback hàng cũ và sự tồn tại của CSS.
Lệnh đã chạy và kết quả: `npm test` **123/123** (từ 122, +1 test T15); `npm run typecheck` không lỗi TS; `npm run build` Compiled successfully; `npm test` + `mvn -B verify` (70/70) xác nhận ở đầu phiên.
Chưa kiểm chứng / lỗi còn lại: chưa click-through editor trong browser (QA hiện chỉ phủ trang thiệp khách; editor cần phiên admin — ngoài phạm vi phiên này); cảnh báo là gợi ý, không thay đổi validation server.
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: browser QA cho editor (mock `/api/v1/admin/*`), hoặc ảnh chân dung INTRO (D07).
```

```text
Task ID: T16 — Browser QA cho editor (phiên 5)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 5)
Mục tiêu đã đạt: đóng khoảng trống "T15 chỉ được xác minh bằng test tĩnh" — điều khiển thật `/admin/wedding` trong Chrome headless với toàn bộ `/api/v1/admin/*` được mô phỏng trong trang (không đăng nhập backend, không ghi dữ liệu).
File đã sửa: scripts/editor-review-qa.mjs (mới), scripts/README.md, PLAN_TASK.md, README-IMPLEMENTATION.md.
Thay đổi chính:
- Fixture 7 mục: đủ 5 loại + 1 mục bật nhưng rỗng + 1 hàng TIMELINE cũ chỉ có `startsAt` (payload null).
- Mock trong trang: `/csrf`, `/auth/me`, `/admin/media`, `/admin/wedding`, `/admin/wedding/layout`, GET+PUT `/admin/wedding/sections`; PUT được ghi vào `window.__saved` rồi trả lại danh sách đã lưu để form sạch dirty.
- Khẳng định: nạp đủ 7 khối và đúng bộ trường từng loại; cảnh báo mục rỗng hiện đúng và mất khi nhập nội dung; hàng cũ có `startsAt` KHÔNG bị cảnh báo; đổi thứ tự người/nhóm đổi cả thứ tự trường lẫn payload lưu; nút ở biên bị `disabled`; xem trước "thiệp chung" ẩn mốc PRIVATE còn "lời mời riêng" thì hiện; gửi `contentSchemaVersion=2`.
Lệnh đã chạy và kết quả: `node scripts/editor-review-qa.mjs` → **PASS (exit 0)**. `report.json`: structure `{blocks:7, people:2, groups:2, ceremonyItems:1, timelineRows:2, paletteColors:1}`; peopleBounds `{up:true, down:true}`; guestPreviewHasPrivate `true`; publicPreviewHasPrivate `false`; savedMeta `{templateVersion:1, contentSchemaVersion:2, sections:7}`; savedOrder `{people:[Người B, Người A], groups:[Nhóm Hai, Nhóm Một]}`. 3 ảnh: `editor-loaded.png`, `editor-after-reorder.png`, `editor-preview-public.png`.
Lỗi gặp và đã sửa trong quá trình làm: (1) heading khối hiển thị **loại** nên không định vị được theo tiêu đề → chuyển sang định vị theo chỉ số; (2) selector `aria-label^="Đưa người 2"` khớp nhầm nút "lên" → dùng nhãn đầy đủ; (3) thiếu mock `/admin/wedding/layout` làm LayoutEditor nhận object thay vì mảng.
Chưa kiểm chứng / lỗi còn lại: QA dùng fixture, không phải backend thật; chỉ kiểm tra nút ↑/↓ (không có kéo-thả); chưa phủ các trang admin khác.
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: ảnh chân dung INTRO (D07), hoặc mở rộng QA cho trang admin khác.
```

```text
Task ID: T17 — Xem trước ngữ cảnh link không hợp lệ (phiên 6)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 6)
Mục tiêu đã đạt: đủ 3 ngữ cảnh xem trước theo mục 5; ngữ cảnh link sai/đã thu hồi/hết hạn không render phần nội dung nào và dùng đúng câu chữ của trang thiệp thật.
File đã sửa: frontend/src/features/invitation/access-copy.ts (mới), frontend/src/features/invitation/invitation-entry.tsx, frontend/src/features/admin/section-editor.tsx, frontend/src/app/admin/admin.css, frontend/tests/sections-payload.test.mjs, scripts/editor-review-qa.mjs, scripts/README.md, PLAN_TASK.md, README-IMPLEMENTATION.md.
Thay đổi chính:
- `access-copy.ts` xuất `INVITATION_UNAVAILABLE` — một nguồn câu chữ duy nhất; `invitation-entry.tsx` import lại thay vì giữ chuỗi riêng (hành vi không đổi).
- `section-editor.tsx`: `PreviewContext='guest'|'public'|'invalid'`; ngữ cảnh `invalid` trả `[]` cho `previewSections` và hiện khối `.preview-denied` (`role="note"`) giải thích khách không thấy phần nào, kèm câu chữ dùng chung và ghi chú "không phải lớp bảo vệ".
- `admin.css`: `.preview-denied` dùng token `--status-error-*` + `--radius-sm`, không hardcode màu.
- Test tĩnh mới (T17) + browser QA: 3 lựa chọn ngữ cảnh; link sai render 0 `.content-section`; **đối chứng** ngữ cảnh lời mời riêng render 7 phần để phép đếm 0 không rỗng nghĩa.
Lệnh đã chạy và kết quả: `npm test` **124/124** (từ 123, +1 test T17); `npm run typecheck` exit 0; `npm run build` exit 0; `node scripts/editor-review-qa.mjs` → **PASS (exit 0)** với `report.json`: `previewContextOptions:[guest,public,invalid]`, `guestPreviewSections:7`, `invalidPreview:{panel:true,sections:0,sharesEntryCopy:true}`; ảnh mới `editor-preview-invalid.png`; `node scripts/invitation-review-qa.mjs` → PASS (exit 0) sau khi đổi import của `invitation-entry.tsx`; `node scripts/public-payload-qa.mjs` → PASS (exit 0).
Chưa kiểm chứng / lỗi còn lại: đây là mô phỏng câu chữ, không phải kiểm thử quyền thật (quyền vẫn do `AccessGate`/`SectionService` quyết định và đã có bằng chứng riêng); ngữ cảnh "khách hợp lệ" vẫn là chung, chưa chọn được từng khách cụ thể trong editor.
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: chọn khách cụ thể cho preview (cần API danh sách khách + projection theo khách), ảnh chân dung INTRO (D07), hoặc mở rộng QA cho trang admin khác.
```

```text
Task ID: T18 — Hàng TIMELINE cũ không còn chặn lưu (phiên 7)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 7)
Mục tiêu đã đạt: sửa lỗi hồi quy khiến mọi thay đổi trong `/admin/wedding` không lưu được nếu DB còn hàng TIMELINE cũ (chỉ có `starts_at`, `payload = NULL`) — đúng trạng thái 5 mục đang có trong DB local.
Nguyên nhân (xác minh bằng code + DB): `defaultPayload('TIMELINE')` sinh mốc `{at: startsAt, title:''}` trong bộ nhớ; `firstProblem()` bắt "mỗi mốc cần ngày giờ và tên" nên chặn **mọi** lần lưu; nếu bỏ qua client thì `SectionService.validatePayload` cũng từ chối (`requiredText(title)`), tức không thể lưu bằng đường nào. T16 trước đó lách bằng cách gõ tên mốc trong fixture.
File đã sửa: frontend/src/features/admin/section-editor.tsx, frontend/src/app/admin/admin.css, frontend/tests/sections-payload.test.mjs, backend/src/test/java/vn/wedding/invitation/SectionValidationTest.java, scripts/editor-review-qa.mjs, scripts/README.md, PLAN_TASK.md, README-IMPLEMENTATION.md.
Thay đổi chính:
- `defaultPayload('TIMELINE')` trả `{timeline:[]}`; thêm `isLegacyMilestone()` + `timelineForEditor()` + `forSave()`.
- `upgrade()` vẫn hiện **một mốc gốc** (ngày giờ lấy từ `starts_at`) để người dùng thấy dữ liệu cũ, kể cả sau khi payload đã là `{timeline:[]}` (reload vẫn thấy).
- `forSave()` bỏ mốc gốc chưa đặt tên khỏi payload trước khi gửi: server nhận `timeline: []` + `starts_at` cũ → hợp lệ với `validatePayload`/`firstMilestone` và CHECK của V23; renderer rơi về nhánh legacy nên ngày giờ vẫn hiển thị.
- `firstProblem()` bỏ qua mốc gốc nhưng vẫn bắt mốc do người dùng thêm; điều kiện "cần ít nhất một mốc" bỏ `enabled` để **khớp server** (server luôn yêu cầu nguồn mốc), tránh lỗi 422 khó hiểu khi thêm mục TIMELINE để trống.
- `add('TIMELINE')` tạo sẵn một mốc trống để người dùng thấy ngay ô cần nhập; mốc gốc không có nút xóa (xóa cũng không bỏ được `starts_at`, sẽ là nút vô nghĩa) và có ghi chú giải thích.
- CSS `.section-legacy-note` dùng token sẵn có (`--line`, `--bg-subtle`, `--text-secondary`).
Lệnh đã chạy và kết quả: `npm test` **125/125** (từ 124, +1 test T18); `npm run typecheck` exit 0; `npm run build` exit 0; `mvn -B verify` **71/71 BUILD SUCCESS** (từ 70, +1 test `legacyTimelineWithStartsAtIsSavableWithoutNamedMilestone`, trong đó có ca chứng minh payload cũ `title:''` bị server từ chối); `node scripts/editor-review-qa.mjs` → **PASS (exit 0)**, `report.json`: `legacyMilestone={note:true,required:false,deleteButtons:0}`, `savedLegacyTimeline={timelineLength:0,startsAt:'2027-12-21T04:00:00Z'}`, `legacyTimelineRendered=true`, không có `.error`; các khẳng định T16/T17 vẫn giữ (`previewContextOptions`, `guestPreviewSections=7`, `invalidPreview.sections=0`).
Chưa kiểm chứng / lỗi còn lại: chưa bấm lưu trên backend thật với DB local (QA dùng mock PUT); `starts_at` vẫn không có UI sửa/xóa (giới hạn có từ trước, không thuộc phạm vi T18) nên muốn bỏ hẳn ngày cũ phải thay bằng mốc chi tiết; chưa kiểm thử thiết bị thật.
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: chọn khách cụ thể cho preview, ảnh chân dung INTRO (D07), hoặc thêm UI sửa/xóa ngày giờ cũ của mục TIMELINE.
```

```text
Task ID: T19 — Bỏ "ngày giờ cũ" của mục TIMELINE (phiên 8)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 8)
Mục tiêu đã đạt: đóng giới hạn còn lại của T18 — người dùng bỏ được `starts_at` cũ (ví dụ ngày test 2026-12-24) mà không phải tạo mốc giả, và không nới lỏng validation của server.
File đã sửa: frontend/src/features/admin/section-editor.tsx, frontend/src/app/admin/admin.css, frontend/tests/sections-payload.test.mjs, backend/src/test/java/vn/wedding/invitation/SectionValidationTest.java, scripts/editor-review-qa.mjs, scripts/README.md, PLAN_TASK.md, README-IMPLEMENTATION.md.
Thay đổi chính:
- `FieldProps` có thêm `updateRow` (startsAt nằm ngoài payload); `KindFields` nhận `updateRow={update}` từ `SectionEditor`.
- `TimelineFields` hiện nút "Bỏ ngày giờ cũ" khi mục còn `startsAt`, **chỉ bật khi có ít nhất một mốc có ngày giờ và tên**; kèm giải thích vì sao đang tắt.
- Bấm nút → `updateRow(index,{startsAt:null})` + loại mốc gốc khỏi payload; các mốc chi tiết giữ nguyên. Server vẫn nhận vì `firstMilestone` lấy từ `payload.timeline` và CHECK V23 chỉ cần một trong hai nguồn.
- CSS `.section-legacy-actions` cho hàng nút + ghi chú, dùng token sẵn có.
Lệnh đã chạy và kết quả: `npm test` **126/126** (từ 125, +1 test T19); `npm run typecheck` exit 0; `npm run build` exit 0; `mvn -B verify` **72/72 BUILD SUCCESS** (từ 71, +1 test `timelineWithMilestonesOnlyIsSavable`); `node scripts/editor-review-qa.mjs` → **PASS (exit 0)**: `legacyClear={disabled:true}` (chưa có mốc) → thêm mốc chi tiết `legacyClearReady={disabled:false,rows:2}` → bấm bỏ `legacyCleared={rows:1,hasButton:false,legacyNote:false}` → lưu `legacyClearedSaved={startsAt:null,titles:['Mốc mới']}`, không có `.error`; các khẳng định T16–T18 vẫn giữ.
Lỗi gặp và đã sửa trong quá trình làm: assertion đầu tiên chọn nhầm mục TIMELINE khác cũng có `startsAt=null` (block 3 của fixture) nên đọc 2 mốc; đã định vị theo tiêu đề hàng cũ. Đây là lỗi của test, không phải của sản phẩm — đã ghi lại để tránh lặp.
Chưa kiểm chứng / lỗi còn lại: chưa bấm trên backend thật với DB local (QA dùng mock PUT); chưa kiểm thử thiết bị thật; các giới hạn cũ (preview theo từng khách, ảnh chân dung INTRO, Safari/Zalo, in PDF/QR) vẫn nguyên.
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: chọn khách cụ thể cho preview, ảnh chân dung INTRO (D07), hoặc mở rộng QA cho trang admin khác.
```
```text
Task ID: T20 — Contrast bằng pixel thật cho nền ảnh/alpha/opacity (phiên 9)
Trạng thái: DONE
Cập nhật lúc: 2026-10-20 (phiên 9, giờ máy cục bộ)
Mục tiêu đã đạt: đóng giới hạn "52 phần tử bỏ qua vì nền ảnh/alpha" của T11/T14 bằng phép đo pixel thật; phát hiện và sửa 2 cặp màu không đạt; loại trừ nút disabled theo miễn trừ WCAG.
File đã sửa: scripts/contrast-pixels.mjs (mới), scripts/contrast-audit.mjs, scripts/invitation-review-qa.mjs, frontend/tests/contrast-audit.test.mjs, frontend/src/features/invitation/design.css, scripts/README.md, README-IMPLEMENTATION.md, PLAN_TASK.md.
Thay đổi chính:
- `contrast-audit.mjs`: mẫu không kết luận được nền chuyển vào `pending` (hộp chữ kẹp trong rect phần tử, opacity tích luỹ); bỏ qua nút disabled/`aria-disabled`; gắn `window.__contrastPending` + `window.__contrastHelpers` cho bước đo pixel.
- `contrast-pixels.mjs`: giải mã PNG 8-bit (color type 0/2/4/6) chỉ bằng `node:zlib`; `worstPixelContrast` lấy pixel nền xấu nhất và composite opacity theo từng pixel; hai PNG đối chứng nhúng sẵn.
- `invitation-review-qa.mjs`: `measurePixels` ẩn chữ → chụp clip qua CDP → đo; đối chứng 1:1 và 4.54:1 chạy trước mỗi lần đo; audit mở rộng sang `.wedding-inner` (thêm hero) và thêm lượt audit riêng cho cover **không ảnh**; `CONTRAST_QA_DUMP=1` lưu từng vùng đo.
- `design.css`: `.countdown-note` sang `--compat-color-596354` (trước đo 3.82:1); scrim `.cover-photo+.cover-content::before` nâng 62%→76% kèm plateau 52% (eyebrow trước 4.15:1) và chỉ áp dụng cho cover **có ảnh**.
Lệnh đã chạy và kết quả: `npm test` **127/127**; `npm run typecheck` exit 0; `npm run build` exit 0; `node scripts/invitation-review-qa.mjs` **PASS** (`contrast {measured:41,pixelSamples:57,skipped:1,gradientSamples:8,worst:4.78,failures:[]}`; `contrastNoPhoto {measured:71,pixelSamples:65,skipped:1,failures:[]}`); `node scripts/editor-review-qa.mjs` **PASS**; `node scripts/public-payload-qa.mjs` **PASS** (5 mục); `node --check` cho 3 script OK. Backend không đổi trong phiên 9 nên giữ bằng chứng `mvn -B verify` 72/72 của phiên 8.
Kiểm tra thủ công / bằng chứng: soi các ảnh probe trong `.qa-artifacts/invitation-review/probes/` để xác nhận artifact (viền accent lọt vào hộp chữ `.timeline-day` → ratio 1.0) và nền scrim yếu của hero eyebrow (4.15) trước khi sửa; sau khi sửa, `skipped` chỉ còn 1 mẫu (nút disabled).
Chưa kiểm chứng / lỗi còn lại: phép đo vẫn chạy trên fixture (ảnh SVG đơn sắc) nên chưa đại diện ảnh cưới thật nhiều chi tiết; chưa audit các trang admin khác; giới hạn cũ giữ nguyên (Safari/Zalo thiết bị thật, in PDF/QR vật lý, ảnh chân dung INTRO D07).
Bước tiếp theo: chờ nội dung thật của người dùng; tuỳ chọn: chọn khách cụ thể cho preview, ảnh chân dung INTRO (D07), mở rộng QA cho trang admin khác.
```

### Phụ lục — chạy lại kiểm chứng bằng API thật

- Script dùng trong phiên: `%TEMP%\sections-e2e.ps1` (và `%TEMP%\sections-restore.ps1` để khôi phục). Hai script **không nằm trong repo** để tránh bị chạy nhầm trên production; chúng ghi và phát hành nội dung thiệp.
- Cách làm: đọc `.env` để đăng nhập chủ tiệc (không in mật khẩu), lấy CSRF mới trước **mỗi** request ghi (token đổi sau khi đăng nhập), lưu nháp có cấu trúc → phát hành → đọc `GET /api/v1/public/weddings/{slug}` để kiểm tra `public_*`, rồi khôi phục 5 mục gốc và phát hành lại.
- Log bằng chứng: `s14-sections-e2e.log` trong repo (đã gitignore theo `*.log`).
- Lưu ý khi viết script tương tự: dùng `Invoke-RestMethod -InFile` với UTF-8 không BOM cho phần thân JSON (gửi mảng byte kèm charset từng trả 400), và không round-trip JSON qua `psql to_char` khi cần khôi phục dữ liệu.

## 12. Decision Log

| ID | Quyết định | Cơ sở / giới hạn | Task liên quan |
|---|---|---|---|
| D01 | Giữ stack và luồng có sẵn, cải thiện theo từng phần | Đã khảo sát: Next.js 16 + Spring Boot 4 + PostgreSQL 17 chạy ổn, 60 test BE | T01–T04 |
| D02 | Không coi client-side hiding là bảo vệ dữ liệu riêng | Quyết định quyền nằm ở `SectionService.list` và `AccessGate`; xem trước trong editor chỉ mô phỏng | T03, T07, T12 |
| D03 | Không dùng ngày giờ xuất hiện trong yêu cầu làm lịch thật | 2026-12-24 01:23Z trong DB là dữ liệu test; chưa xác nhận là lịch cưới | T02, T07, T08 |
| D04 | Thêm cột `payload` jsonb + `content_schema_version=2`, giữ nguyên cột phẳng cũ | Giữ tương thích hàng đã phát hành (body/starts_at/color vẫn render); không cần backfill | T03–T09 |
| D05 | Payload là `Map<String,Object>` với whitelist + chuẩn hoá NFC, không dùng JsonNode | Spring Boot 4 dùng Jackson 3 (`tools.jackson`), Jackson 2 không có trên classpath; Map bind trực tiếp và dễ kiểm chứng | T03, T10 |
| D06 | Mốc TIMELINE có mức hiển thị theo từng mốc; server lọc và bỏ `starts_at` khi payload có danh sách | Ma trận visibility yêu cầu "mốc riêng chỉ người được cấp xem"; V23 nới CHECK hợp lệ hoá TIMELINE lấy mốc từ payload | T08, T12 |
| D07 | INTRO dùng bố cục typography, chưa có ảnh chân dung từng người | Chưa có slot media cho ảnh người; không dùng ảnh người lạ và không thêm bảng media mới trong phạm vi này | T05, T11 |
| D08 | Thời gian lịch trình dùng quy ước giờ Việt Nam như ô nhập của editor | `toVietnamInput/fromVietnamInput` đang là quy ước của stack; không tự suy ra múi giờ khác cho từng mốc | T08 |
| D09 | Kiểm thử E2E thực hiện qua API thật trên stack local rồi khôi phục dữ liệu | Unit test mock JdbcTemplate không bắt được ràng buộc CHECK của DB (đã xảy ra với V17) | T03, T10, T12 |
| D10 | Hàng TIMELINE cũ chỉ có `starts_at` **không** được sinh thành mốc payload; editor hiện "mốc gốc" chỉ-đọc và bỏ nó khỏi payload khi lưu | Server bắt mỗi mốc phải có tên (`validatePayload`) nên mốc rỗng làm hỏng **mọi** lần lưu; `starts_at` vẫn là nguồn hiển thị (renderer fallback) nên không mất ngày giờ, và V23 vẫn thoả vì còn `starts_at` | T18 |
| D11 | Nền ảnh/alpha/opacity được đo contrast bằng **pixel thật** (ẩn chữ, chụp đúng vùng chữ, lấy pixel nền xấu nhất); nút disabled/`aria-disabled` miễn trừ theo WCAG 1.4.3 | Computed style không kết luận được nền ảnh; đo pixel giữ nguyên nguyên tắc bảo thủ "không kết luận khi không đo được", kèm đối chứng cố định (PNG 2×1 đen/trắng = 1:1, `#767676` = 4.54:1) để một PASS không rỗng nghĩa | T20 |

## 13. Blockers / câu hỏi cần xác nhận

> Chỉ hỏi ngay nếu thực sự chặn task; những mục còn lại có thể chờ người dùng nhập qua editor.

- Đã khảo sát repository: stack, route, schema, quyền và test đều xác minh được (xem Project Snapshot). Không còn blocker kỹ thuật cho 5 phần.
- Cơ chế thiệp riêng tư đã rõ: link token → redeem → session grant → open marker → PIN tuỳ chọn, kiểm ở `AccessGate` (không phải câu hỏi mở nữa).
- **Cần người dùng nhập qua editor (không suy đoán):** nội dung thật của Giới thiệu/Gia đình/Nghi lễ/Mốc lịch trình/Trang phục; hiện DB vẫn là body `'Hi'` do người dùng nhập trước đó, và editor sẽ hiển thị nguyên trạng cho tới khi thay.
- Ngày giờ `2026-12-24 01:23Z` (08:23 giờ Việt Nam) trong DB là dữ liệu test — cần xác nhận nếu muốn dùng làm lịch thật (D03).
- **Quyết định cần xác nhận nếu muốn làm tiếp (không chặn phần đã xong):** có cần ảnh chân dung cho từng người ở phần Giới thiệu (cần thêm slot media + bảng lưu ảnh) hay giữ bố cục typography như hiện tại (D07)?
- Chỉ hỏi thêm nếu có quyết định về quyền, lưu dữ liệu hoặc thay đổi phá vỡ tương thích mà dự án chưa có cơ sở.

## 14. Handoff — bắt buộc cập nhật trước khi dừng phiên

- **Trạng thái hiện tại:** T01–T20 đã DONE. Code 5 phần (T03–T10) ở `e42341e` và đợt QA/contrast (T14–T19) ở `91eb35c` đều do **người dùng commit** — AI không commit. Thay đổi của phiên 9 (chưa commit, working tree): `scripts/contrast-pixels.mjs` (mới), `scripts/contrast-audit.mjs`, `scripts/invitation-review-qa.mjs`, `frontend/tests/contrast-audit.test.mjs`, `frontend/src/features/invitation/design.css`, `scripts/README.md`, `README-IMPLEMENTATION.md`, `PLAN_TASK.md`.
- **Task gần nhất đã xác minh hoàn tất:** T20 — `node scripts/invitation-review-qa.mjs` PASS (exit 0): cover có ảnh `measured 41 + pixelSamples 57`, `skipped 1` (nút disabled), `worst 4.78`, `failures []`; cover không ảnh `contrastNoPhoto {measured 71, pixelSamples 65, failures []}`; đối chứng PNG 2×1 (worst 1:1) và `#767676` (4.54:1) chạy trong script; `npm test` 127/127, typecheck + build pass.
- **Task đang làm:** không — dừng an toàn sau T20.
- **Task tiếp theo (không chặn):** (a) người dùng nhập nội dung thật cho 5 phần; (b) tuỳ chọn: chọn một khách cụ thể cho preview (cần API danh sách khách + projection theo khách); (c) tuỳ chọn ảnh chân dung INTRO (D07); (d) thử Safari iOS/Zalo trên thiết bị thật và in thử PDF/QR; (e) tuỳ chọn: mở rộng browser QA cho các trang admin khác và đo pixel trên ảnh cưới thật nhiều chi tiết (fixture hiện dùng ảnh SVG đơn sắc).
- **File đã thay đổi trong phiên 9 (chưa commit):** `scripts/contrast-pixels.mjs` (mới), `scripts/contrast-audit.mjs`, `scripts/invitation-review-qa.mjs`, `frontend/tests/contrast-audit.test.mjs`, `frontend/src/features/invitation/design.css`, `scripts/README.md`, `README-IMPLEMENTATION.md`, `PLAN_TASK.md`. Các phiên 2–8 đã nằm trong commit `91eb35c` (13 file) — Handoff cũ ghi "chưa commit" là **sai lệch so với git**, phiên 9 đã đối chiếu lại bằng `git status` + `git show --stat 91eb35c`.
- **Đã commit bởi người dùng (không phải AI):** `e42341e` — 16 file: 2 migration (V22, V23), `SectionService`, `LayoutService`, `GuestService`, `AdminService`, 2 test backend, `sections.tsx`, `design.css`, `section-editor.tsx`, `admin.css`, trang admin wedding, `tests/sections-payload.test.mjs`, PLAN, README; và `91eb35c` — 13 file của đợt T14–T19 (QA script, `access-copy.ts`, test, PLAN, README).
- **Lệnh kiểm tra đã chạy (phiên 9):** `npm test` **127/127**; `npm run typecheck` exit 0; `npm run build` exit 0; `node scripts/invitation-review-qa.mjs` **PASS** (report gồm `contrast {measured:41,pixelSamples:57,skipped:1,gradientSamples:8,worst:4.78,failures:[]}` và `contrastNoPhoto {measured:71,pixelSamples:65,skipped:1,failures:[]}`); `node scripts/editor-review-qa.mjs` **PASS**; `node scripts/public-payload-qa.mjs` **PASS** (5 mục, exit 0); `node --check` cho `contrast-pixels.mjs`, `contrast-audit.mjs`, `invitation-review-qa.mjs` OK. Backend không đổi trong phiên 9 nên giữ bằng chứng `mvn -B verify` **72/72** của phiên 8; Flyway V22/V23 `success=t` (phiên 1); API E2E thật (phiên 1, có khôi phục dữ liệu).
- **Dữ liệu local:** DB giữ nguyên trạng thái trước kiểm thử — 5 mục body `'Hi'` ở cả DRAFT và PUBLISHED, `payload=null`, TIMELINE `starts_at` 2026-12-24 01:23Z, màu `#ff5c5c`; `wedding.content_schema_version=2` (chỉ là dấu khả năng). Phiên 8 **không ghi** dữ liệu vào DB (QA editor dùng mock PUT).
- **Việc cần người dùng nhập (không được tự bịa):** nội dung thật của Giới thiệu/Gia đình/Nghi lễ/Mốc lịch trình/Trang phục; tên, địa điểm, lịch, màu thật.
- **Giới hạn còn lại (minh bạch):** contrast đo pixel chạy trên fixture (ảnh SVG đơn sắc) nên chưa đại diện ảnh cưới thật nhiều chi tiết, và vẫn là lấy mẫu chứ không thay audit WCAG thủ công toàn diện; chưa kiểm thử trên Safari iOS/Zalo thiết bị thật; chưa in thử PDF/QR vật lý; INTRO chưa có ảnh chân dung (D07); preview “link không hợp lệ” chỉ mô phỏng câu chữ — quyền thật vẫn do `AccessGate`/`SectionService` quyết định; preview “lời mời riêng” chưa chọn được từng khách cụ thể; script kiểm tra **chỉ đọc** payload công khai đã ở repo (`scripts/public-payload-qa.mjs`), còn kịch bản E2E có ghi/phát hành thử thì chỉ chạy từ `%TEMP%` và không đưa vào repo.
- **Việc cần làm ngay ở phiên tiếp theo:** rà `git diff` rồi commit nếu đồng ý (AI không tự commit); sau đó chờ nội dung thật của người dùng để kiểm tra hiển thị cuối.
- **Điều tuyệt đối không làm khi resume:** đoán đã test, tự công bố giờ cưới, xóa code người dùng, dùng dữ liệu riêng trong public payload, tự deploy hoặc migrate production, hoặc ghi nội dung giả như thông tin thật.
