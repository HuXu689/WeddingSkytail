# KẾ HOẠCH PHÁT TRIỂN MỞ RỘNG WEBSITE THIỆP CƯỚI CAO CẤP (`DEVELOPMENT_PLAN.md`)

> **Vai trò thực hiện:** Product Owner · Creative UI/UX Designer · Senior Full-stack Architect  
> ** Kiến trúc nền tảng:** Spring Boot 4.1.1 (Java 21, JDBC, Flyway V1–V26, PostgreSQL 17) + Next.js 16.4.2 (App Router, React 19.3.1, TypeScript 5.9).  
> **Nguyên tắc cốt lõi:** Giữ vững 100% tính năng, hợp đồng bảo mật (`AccessGate`, phân tách `PUBLIC`/`PRIVATE`, CSRF, Idempotency RSVP, kiểm duyệt lời chúc, Hộp quà QR bảo vệ quyền) và toàn bộ bộ test hiện có (185 FE tests + 142 BE tests), đồng thời nâng tầm sản phẩm thành trải nghiệm thiệp cưới số cao cấp, giàu cảm xúc và thực dụng nhất cho khách mời Việt Nam.

---

## PHẦN I — PHÂN TÍCH CHUYÊN SÂU HIỆN TRẠNG & ĐỀ XUẤT MỞ RỘNG (GIAI ĐOẠN 1)

### 1. Thông tin & Cốt truyện (Storytelling & Content)
* **Hiện trạng:** Hệ thống đã có lời mời mở đầu, đoạn văn câu chuyện (`story`), lời cảm ơn (`footer`), các buổi tiệc riêng (`events`) và 5 loại nội dung tùy chọn (`INTRO`, `FAMILY`, `CEREMONY`, `TIMELINE`, `DRESS_CODE`) lưu trong cột `payload` JSONB.
* **Điểm thiếu sót & Cơ hội nâng tầm:**
  1. **Thiếu chiều sâu câu chuyện & chân dung nhân vật:** Mục `INTRO` mới chỉ có chữ thuần (`name`, `role`, `note`), chưa có **ảnh chân dung riêng của Cô dâu – Chú rể**, **câu trích dẫn tâm đắc**, và đặc biệt thiếu **Cột mốc kỷ niệm tình yêu (Love Story Milestones)** theo dòng thời gian (lần đầu gặp gỡ, hẹn hò, cầu hôn, về chung một nhà).
  2. **Thiếu phân tách rõ lịch trình Nhà Trai / Nhà Gái & Tiện ích hành động tại chỗ:** Trong văn hóa cưới Việt Nam, khách mời rất cần phân biệt nhanh **Lễ Nhà Trai**, **Lễ Nhà Gái** và **Lễ Thành Hôn / Tiệc Chung**, kèm nút **Mở bản đồ chỉ đường**, **Sao chép địa chỉ**, và **Lưu lịch điện thoại (`.ics` / Google Calendar)** ngay trên từng thẻ nghi lễ (`CEREMONY`) và lịch trình (`TIMELINE`).
  3. **Thiếu Cẩm nang dự tiệc tinh tế cho khách mời:** Mục `DRESS_CODE` mới dừng ở bảng màu và lưu ý tránh mặc, chưa có các **Lưu ý chu đáo (Guest Guide / Tips)** như hướng dẫn gửi xe, giờ chụp ảnh Photobooth đón khách, ghế trẻ em hay thực đơn chay.
  4. **Album ảnh chưa có chế độ thưởng thức tự động:** Cần bổ sung **Trình chiếu Kỷ niệm Tự động (Slideshow)** êm ái và khả năng phóng đại xem chi tiết ảnh cưới nghệ thuật trong Lightbox.

### 2. Thẩm mỹ & Bố cục (Aesthetics, Vietnamese Typography & Mobile-First Layout)
* **Hiện trạng:** Đã có 3 phong cách (`ELEGANT`, `TRADITIONAL`, `MODERN`), 3 màu nhấn (`OLIVE`, `BURGUNDY`, `NAVY`), bộ nhãn dán SVG và hệ thống CSS tokens kiểm soát contrast chặt chẽ. Tuy nhiên bộ font đang phụ thuộc hoàn toàn vào `'Times New Roman'` và `'Arial'` mặc định của thiết bị.
* **Điểm thiếu sót & Cơ hội nâng tầm:**
  1. **Typography cưới cao cấp chuẩn tiếng Việt:** Tích hợp bộ font chữ cưới sang trọng tự lưu trữ nội bộ (`Self-hosted WOFF2` — không phụ thuộc mạng ngoài khi build/chạy, hiển thị trọn vẹn 100% dấu thanh tiếng Việt phức tạp như *ấ, ầ, ẩ, ẫ, ậ, ắ, ằ, ể, ễ, ệ, ố, ồ, ợ, ữ, ự*): **Cormorant Garamond** cho tiêu đề & tên cặp đôi kết hợp **Be Vietnam Pro** cho nội dung & giao diện tương tác, giữ `text-rendering: auto` và `letter-spacing: normal` để không bao giờ lệch dấu.
  2. **Nhịp điệu khoảng trắng & Bố cục ưu tiên di động (`360px–430px`):** Tinh chỉnh các khung vòm nghệ thuật (arch frames), đường kẻ mảnh ánh vàng champagne, chữ hoa đầu đoạn (editorial drop-cap) trong câu chuyện tình yêu, và đảm bảo mọi nút chạm trên màn hình điện thoại đạt tối thiểu `44px`, không chồng chéo giữa thanh điều hướng nhanh, nút nhạc nền và thanh chúc phúc.

### 3. Hiệu ứng & Trải nghiệm cảm xúc (Animations & Emotional UX)
* **Hiện trạng:** Trang lời mời riêng (`/invitation/[id]` và `/i/[token]`) có phong bì cơ bản; trang thiệp chung (`/w/[slug]`) mở thẳng vào nội dung nên thiếu khoảnh khắc xúc cảm mở thiệp ban đầu. Trình phát nhạc nền chưa có giai điệu dự phòng khi chưa tải tệp MP3 hoặc khi tệp lỗi.
* **Điểm thiếu sót & Cơ hội nâng tầm:**
  1. **Nghi thức Mở Phong Bì Sáp Niêm Phong 3D (`EnvelopeCeremonyOverlay`):** Thiết kế hiệu ứng mở phong thư sang trọng với con dấu sáp Song Hỷ ánh kim, nắp phong bì mở 3D bằng GPU, thiệp trượt lên mượt mà kèm mưa cánh hoa nhẹ và tự động kích hoạt nhạc nền hợp lệ ngay từ cử chỉ chạm mở thiệp của khách.
  2. **Thanh tiến trình đọc ánh kim & Đếm ngược số đôi (`00`):** Bổ sung thanh chỉ báo cuộn trang siêu mảnh phía trên cùng, nâng cấp đồng hồ đếm ngược thời gian thực hiển thị số đôi chuẩn xác kèm thông điệp hân hoan khi chạm ngày cưới.
  3. **Trình phát nhạc nền đĩa than / sóng âm kèm Giai điệu cưới dự phòng tích hợp sẵn:** Tích hợp tệp âm thanh hòa tấu cưới lãng mạn nội bộ (`/fallback/wedding-melody.wav`) làm nguồn dự phòng thông minh và làm mẫu thử nhanh, kèm hiệu ứng sóng nhạc tinh tế.
  4. **Tương tác chúc mừng tức thì & Hiệu năng 60fps trên di động:** Hiệu ứng tung hoa / thả tim / pháo hoa khi khách gửi lời chúc hoặc xác nhận tham dự; tự động giảm số lượng hạt trên màn hình di động, khóa `devicePixelRatio` hợp lý và ngủ đông hoàn toàn khi không có chuyển động hoặc khi bật `prefers-reduced-motion`.

### 4. Chức năng & Hệ thống (Smart Features & Full-stack Capabilities)
* **Hiện trạng:** Hệ thống đã có RSVP có khóa phiên bản + Idempotency, sổ lời chúc có kiểm duyệt + phân trang cursor, hộp quà QR bảo mật, lịch `.ics` cho buổi tiệc riêng và khu quản trị đa vai trò (`OWNER` / `EDITOR`).
* **Điểm thiếu sót & Cơ hội nâng tầm:**
  1. **Cá nhân hóa tên khách mời trên thiệp chung (`/w/[slug]?guest=...&salutation=...`) & Công cụ tạo link mời nhanh:** Cho phép cô dâu chú rể gửi nhanh link thiệp chung có gắn lời chào và tên riêng của bạn bè/đồng nghiệp qua Zalo/Messenger mà vẫn giữ tách biệt tuyệt đối với quyền riêng tư của link `/i/[token]`.
  2. **RSVP thông minh kèm Thẻ Xác Nhận Tham Dự (Wedding E-Pass):** Bổ sung chip chọn nhanh nhu cầu thực tế (*Thực đơn chay*, *Có trẻ nhỏ*, *Đi xe gia đình*, *Đăng ký xe đưa đón*) tự điền thông minh vào lời nhắn gửi chủ tiệc, đồng thời hiển thị **Thẻ Hẹn Ngày Chung Vui** tóm tắt lịch tiệc sau khi khách xác nhận.
  3. **Sổ lưu bút thời gian thực (Live Guestbook):** Tự động làm mới thông minh theo trạng thái hiển thị tab (Visibility-aware Live Polling) để lời chúc vừa được duyệt xuất hiện thời gian thực, kèm bộ lọc (*Tất cả / Được ghim*), tìm kiếm nhanh lời chúc và gợi ý biểu tượng cảm xúc.
  4. **Lưu lịch sự kiện đa nền tảng ở mọi nơi:** Bổ sung tải tệp `.ics` chuẩn RFC 5545 và Google Calendar cho cả các nghi lễ công khai trên thiệp chung lẫn buổi tiệc riêng.
  5. **Nâng cấp Quản trị thực chiến:** Cập nhật `SectionEditor` cho toàn bộ cấu trúc dữ liệu mới (kèm nút nạp nhanh mẫu nội dung gợi ý), thêm **Trình tạo Link Cá nhân hóa Nhanh** ở trang Khách mời, và thêm **Bảng tổng hợp nhu cầu đặc biệt (Ăn chay / Trẻ nhỏ / Xe đưa đón)** ở trang Phản hồi (`/admin/responses`) & Tổng quan (`/admin`).

---

## PHẦN II — DANH SÁCH HẠNG MỤC TRIỂN KHAI THEO THỨ TỰ ƯU TIÊN

### Khối 1: Kiến trúc Dữ liệu & Mở rộng Backend API
- [x] **1.1. Mở rộng lược đồ `SectionPayload` tại Backend (`SectionService.java`):** Bổ sung validate, chuẩn hóa Unicode NFC, làm sạch URL HTTPS và lọc quyền hiển thị cho các trường mới của `INTRO` (`avatarUrl`, `quote`, `milestones`), `FAMILY` (`side`, `location`, `welcomeNote`), `CEREMONY` (`side`, `mapsUrl`, `dressNote`), `TIMELINE` (`side`, `mapsUrl`) và `DRESS_CODE` (`tips`), đảm bảo tương thích ngược 100% với cơ sở dữ liệu hiện hữu.
- [x] **1.2. Kiểm thử đơn vị Backend mở rộng (`SectionValidationTest.java` & `SectionPrivacyTest.java`):** Viết test xác minh đầy đủ các trường mới, chặn khóa lạ (whitelist), kiểm tra giới hạn độ dài, chuẩn hóa URL và bảo mật lọc dữ liệu `PUBLIC`/`PRIVATE`.

### Khối 2: Tài nguyên Đa phương tiện, Bộ Font Tiếng Việt & Dự phòng (Fallbacks)
- [x] **2.1. Cài đặt thư viện icon `lucide-react`:** Tích hợp bộ biểu tượng vector sắc nét, nhẹ và tương thích hoàn toàn với React 19 + Next.js 16.
- [x] **2.2. Tích hợp bộ Font chữ cưới cao cấp chuẩn tiếng Việt (`Self-hosted WOFF2`):** Đóng gói nội bộ bộ font **Cormorant Garamond** (Regular, Italic, SemiBold) và **Be Vietnam Pro** (Regular, Medium, SemiBold) trong `@fontsource` + `luxury-typography.css`, hiển thị hoàn hảo dấu tiếng Việt và có fallback hệ thống tức thì.
- [x] **2.3. Tích hợp tài nguyên âm thanh & hình ảnh nghệ thuật dự phòng:** Tạo giai điệu hòa tấu cưới lãng mạn dự phòng `/fallback/wedding-melody.wav` cùng bộ ảnh chân dung & kỷ niệm dự phòng chất lượng cao trong `frontend/public/fallback/`, mở rộng `media-fallback.ts` kèm trình tạo tệp lịch `.ics` chuẩn RFC 5545.

### Khối 3: Cốt truyện Tình yêu, Lịch trình Nhà Trai/Nhà Gái, Bản đồ & Lưu lịch
- [x] **3.1. Thiết kế Chân dung Cô dâu – Chú rể (`INTRO`) & Dòng thời gian Cột mốc Tình yêu (`LoveMilestones`) + Câu chuyện biên tập (`STORY`):** Hiển thị khung vòm chân dung có ảnh (kèm fallback an toàn), câu nói yêu thích, chữ cái đầu đoạn nghệ thuật (drop-cap) và chuỗi cột mốc kỷ niệm tình yêu đầy cảm xúc.
- [x] **3.2. Nâng cấp Gia đình hai bên (`FAMILY`) & Nghi lễ (`CEREMONY`) kèm Bản đồ và Lưu lịch `.ics` / Google Calendar:** Hiển thị huy hiệu *Nhà Trai / Nhà Gái / Lễ Chung*, thông tin tư gia, lời đón tiếp, và thanh tiện ích tương tác (Chỉ đường bản đồ, Sao chép địa chỉ, Thêm vào Lịch Google, Tải tệp `.ics` vào điện thoại) ngay trên từng nghi lễ.
- [x] **3.3. Nâng cấp Chương trình lễ cưới (`TIMELINE`) & Quy định trang phục – Cẩm nang khách mời (`DRESS_CODE`):** Thêm bộ lọc nhanh theo *Tất cả / Nhà Trai / Nhà Gái*, bảng màu trang phục tương tác (chạm sao chép mã màu & xem gợi ý) và khối **Lưu ý tinh tế dành cho khách quý** (`tips`).
- [x] **3.4. Nâng cấp Album ảnh nghệ thuật (`WeddingAlbum` & `AlbumLightbox`):** Bổ sung trình chiếu tự động (Slideshow Play/Pause có thanh nhịp thời gian, tự dừng khi mở hộp thoại hoặc ẩn tab) và chế độ thu phóng chi tiết trong Lightbox.

### Khối 4: Hiệu ứng Cảm xúc, Phong bì Sáp Niêm phong, Đếm ngược & Nhạc nền
- [x] **4.1. Nghi thức Mở Phong Bì Sáp Niêm Phong 3D (`EnvelopeCeremonyOverlay`):** Triển khai trải nghiệm mở phong thư đầu trang giàu cảm xúc cho khách được cá nhân hóa trên thiệp chung hoặc khi bấm mở lại phong thư, kết hợp nâng cấp hiệu ứng phong bì ở cổng lời mời riêng, kích hoạt cánh hoa rơi & nhạc nền mượt mà.
- [x] **4.2. Thanh tiến trình cuộn trang, Đếm ngược thời gian thực & Trình phát nhạc nền đĩa than/sóng âm:** Thêm thanh tiến trình đọc ánh vàng champagne trên đỉnh trang, nâng cấp `Countdown` hiển thị số đôi kèm cột mốc ngày cưới, và nâng cấp `MusicControl` với hiệu ứng sóng âm + cơ chế tự chuyển sang nhạc hòa tấu dự phòng khi nguồn chính gặp sự cố.
- [x] **4.3. Tinh chỉnh bố cục Mobile-First & Tối ưu hiệu năng 60fps trên di động:** Đảm bảo các lớp canvas hiệu ứng hạt giới hạn mật độ thông minh trên màn hình nhỏ, không gây giật lag, không che khuất nút bấm trên điện thoại và tuân thủ `prefers-reduced-motion`.

### Khối 5: Chức năng Thông minh, Cá nhân hóa, Sổ Lưu Bút Thời Gian Thực & Quản trị
- [x] **5.1. Cá nhân hóa tên khách mời trên thiệp chung (`/w/[slug]?guest=...&salutation=...`):** Đọc và làm sạch tham số lời chào khách mời trên URL, hiển thị trang trọng trên phong bì mở đầu và trang bìa mà vẫn giữ nguyên ranh giới bảo mật của máy chủ.
- [x] **5.2. RSVP thông minh & Thẻ Xác Nhận Tham Dự (`WeddingPass`):** Bổ sung chip chọn nhanh nhu cầu thực tế (*Thực đơn chay*, *Có trẻ nhỏ*, *Đi xe gia đình*, *Xe đưa đón*), hiển thị thẻ xác nhận tham dự trang trọng kèm nút lưu lịch nhanh sau khi gửi phản hồi.
- [x] **5.3. Sổ lưu bút thời gian thực (`WishFeed` & `WishBook`):** Tích hợp cơ chế tự động cập nhật lời chúc mới theo thời gian thực (Visibility-aware Live Polling 25s + BroadcastChannel giữa các tab + thông báo có lời chúc mới), tìm kiếm & lọc nhanh lời chúc (*Tất cả / Được ghim*), thả tim lời chúc cùng bộ biểu tượng chúc phúc nhanh.
- [x] **5.4. Nâng cấp Khu Quản trị (`SectionEditor`, `Invitations`, `Responses`, `Dashboard`):**
  - Mở rộng `SectionEditor` để chủ tiệc nhập đầy đủ chân dung, cột mốc tình yêu, phân nhánh Nhà Trai/Nhà Gái, link bản đồ, cẩm nang khách mời và nút *Điền bộ mẫu 5 mục gợi ý*.
  - Thêm **Công cụ Tạo Link Thiệp Chung Cá Nhân Hóa Nhanh** tại `/admin/invitations`.
  - Thêm **Thống kê Nhu cầu Đặc biệt của Khách mời** (ăn chay, trẻ nhỏ, xe đưa đón) tại `/admin/responses`.
- [x] **5.5. Dữ liệu mẫu chân thực & Sinh động (`scripts/seed-demo.ps1` + mẫu khởi tạo):** Cập nhật dữ liệu mẫu tiếng Việt chuẩn mực, giàu cảm xúc cho đầy đủ các mục mới (cột mốc tình yêu 2022–2026, nghi lễ Nhà Trai/Nhà Gái, bảng màu, cẩm nang khách mời, nhạc nền).

### Khối 6: Kiểm thử Toàn diện & Đánh bóng Sản phẩm (Giai đoạn 4)
- [x] **6.1. Kiểm thử tự động Backend & Frontend (`mvn test`, `npm test`, `npm run typecheck`, `npm run build`):** Bổ sung bộ test mới (`luxury-full-upgrade.test.mjs`, `SectionValidationTest`, `SectionPrivacyTest`) và đảm bảo 100% test toàn hệ thống vượt qua không lỗi (Backend 145/145 PASS, Frontend 190/190 PASS, `tsc --noEmit` exit 0, `next build` exit 0).
- [x] **6.2. Rà soát độ tương phản, Responsive Mobile & Đánh bóng hoàn thiện:** Đã vượt qua toàn bộ kiểm tra tương phản pixel WCAG (`invitation-review-qa.mjs`, `luxury-upgrade-qa.mjs`, `editor-review-qa.mjs`), kiểm chứng hiển thị từ `320px` đến `1920px`, dọn dẹp 100% không còn TODO/placeholder và sẵn sàng bàn giao.
