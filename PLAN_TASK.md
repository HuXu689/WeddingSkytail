# PLAN_TASK — Hoàn thiện thiệp cưới công khai và thiệp mời riêng tư

> Trạng thái ban đầu: CHƯA KHẢO SÁT CODE. Đây là đặc tả và kế hoạch thực thi, không phải báo cáo đã kiểm tra dự án.
> Đặt file này ở thư mục gốc của dự án. AI triển khai phải cập nhật trực tiếp file này sau từng task và trước khi kết thúc phiên.
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
| Framework / runtime / package manager | CHƯA XÁC MINH |
| Lệnh dev / lint / typecheck / test / build | CHƯA XÁC MINH |
| Route thiệp công khai | CHƯA XÁC MINH |
| Route thiệp riêng tư / cách cấp quyền | CHƯA XÁC MINH |
| Route editor/admin / cơ chế lưu | CHƯA XÁC MINH |
| Component của 5 phần hiện tại | CHƯA XÁC MINH |
| Schema / API / storage / cache | CHƯA XÁC MINH |
| Design tokens / font / ảnh hiện có | CHƯA XÁC MINH |
| Tình trạng working tree trước sửa | CHƯA XÁC MINH |
| Các lỗi có sẵn trước thay đổi | CHƯA XÁC MINH |

### Đầu ra khảo sát bắt buộc

- Liệt kê file thực tế và điểm vào của từng luồng, không dùng đường dẫn phỏng đoán.
- Mô tả 5–10 vấn đề có bằng chứng; phân loại UX/UI, dữ liệu, riêng tư, vận hành.
- Lập sơ đồ ngắn: nguồn dữ liệu → kiểm tra quyền → payload → component → editor.
- Nêu chức năng cần giữ và vùng không được sửa ngoài phạm vi.
- Kiểm tra "Hi" đến từ dữ liệu lưu, default value, seed hay fallback trong component; sửa đúng nguồn.

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

### Ma trận visibility cần xác minh và điền theo hệ thống

| Dữ liệu | Công khai | Khách có quyền | Editor có quyền |
|---|---|---|---|
| Giới thiệu đã xuất bản | Có nếu bật | Có nếu bật | Xem/sửa đúng quyền |
| Gia đình đã cho phép công khai | Có nếu bật | Có nếu bật | Xem/sửa đúng quyền |
| Địa chỉ/liên hệ gia đình không công khai | Không | Chỉ nếu được cấp riêng | Theo quyền |
| Nghi lễ riêng | Không | Chỉ nghi lễ được mời | Theo quyền |
| Mốc lịch trình riêng | Không | Chỉ mốc được cấp | Theo quyền |
| Dress code công khai | Có nếu bật | Có nếu bật | Theo quyền |
| Tên khách/lời nhắn cá nhân | Không | Chỉ lời mời tương ứng | Theo quyền |
| Danh sách khách/token/ghi chú quản trị | Không | Không | Chỉ quyền cần thiết |

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
| T01 | Khảo sát code và baseline | — | TODO |
| T02 | Chốt hướng thiết kế, dữ liệu và visibility | T01 | TODO |
| T03 | Hoàn thiện data contract và resolver quyền | T02 | TODO |
| T04 | Tokens, typography, layout và lát cắt thiết kế | T02 | TODO |
| T05 | Giới thiệu hai bạn: renderer + editor | T03, T04 | TODO |
| T06 | Gia đình: renderer + editor | T03, T04 | TODO |
| T07 | Nghi lễ riêng: renderer + editor + access states | T03, T04 | TODO |
| T08 | Mốc lịch trình: renderer + editor + timezone | T03, T04, T07 | TODO |
| T09 | Trang phục: renderer + editor | T03, T04 | TODO |
| T10 | Kết nối preview/lưu/xuất bản public/private | T05–T09 | TODO |
| T11 | Responsive, accessibility, motion, ảnh và font | T10 | TODO |
| T12 | Security, hồi quy, sửa lỗi và nghiệm thu | T10, T11 | TODO |
| T13 | Dọn code và bàn giao có thể tiếp tục | T12 | TODO |

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

Chưa có task được thực thi.

## 12. Decision Log

| ID | Quyết định | Cơ sở / giới hạn | Task liên quan |
|---|---|---|---|
| D01 | Giữ stack và luồng có sẵn, cải thiện theo từng phần | Chưa có repository để khảo sát | T01–T04 |
| D02 | Không coi client-side hiding là bảo vệ dữ liệu riêng | Yêu cầu nền tảng của thiệp riêng tư | T03, T07, T12 |
| D03 | Chưa dùng ngày giờ xuất hiện trong yêu cầu làm lịch thật | Cần người dùng xác nhận ý nghĩa | T02, T07, T08 |

## 13. Blockers / câu hỏi cần xác nhận

> Chỉ hỏi ngay nếu thực sự chặn task; những mục còn lại có thể chờ người dùng nhập qua editor.

- Chưa có repository, ảnh chụp hoặc URL nên mọi tên file, stack và hiện trạng vẫn cần khảo sát bởi AI triển khai.
- Cơ chế thiệp riêng tư hiện tại là link cá nhân, đăng nhập, mã mời hay cách khác? Khảo sát code trước, chỉ hỏi nếu code chưa thể xác định.
- Thông tin thật của hai người, gia đình, nghi lễ, địa điểm, lịch trình và dress code: không suy đoán.
- Ngày giờ xuất hiện trong yêu cầu có phải lịch thật hay chỉ một mục đã nhập thử?
- Chỉ cần hỏi quyết định về quyền, lưu dữ liệu hoặc thay đổi phá vỡ tương thích nếu không có cơ sở trong dự án.

## 14. Handoff — bắt buộc cập nhật trước khi dừng phiên

- **Trạng thái hiện tại:** chỉ mới tạo kế hoạch; chưa khảo sát hoặc sửa source code.
- **Task gần nhất đã xác minh hoàn tất:** chưa có.
- **Task đang làm:** chưa có.
- **Task tiếp theo:** T01 — khảo sát repository và ghi baseline.
- **File đã thay đổi:** PLAN_TASK.md (kế hoạch).
- **Lệnh kiểm tra đã chạy cho website:** chưa chạy; chưa có repository website trong ngữ cảnh.
- **Blocker:** AI coding cần được mở trong repository website để tiếp tục.
- **Việc cần làm ngay ở phiên tiếp theo:** đọc file này → git status/diff → xác định stack/routes/schema/scripts → điền Project Snapshot → thực hiện T01.
- **Điều tuyệt đối không làm khi resume:** đoán đã test, tự công bố giờ cưới, xóa code người dùng, dùng dữ liệu riêng trong public payload, tự deploy hoặc migrate production.
