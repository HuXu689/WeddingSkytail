# 07 — Thiết kế link, QR, PDF in và chia sẻ

## 1. Link bền vững
`https://<domain-cua-ban>/i/<opaque-token>` là URL canonical để encode vào QR. Domain placeholder, chưa đăng ký. URL ngắn vừa đủ, không shortener bên thứ ba có nguy cơ hết hạn/tracking.
Token dùng 32 byte CSPRNG, base64url không padding; không tên/phone/event date. Cùng token được dùng cho copy link và QR re-export. Sửa wedding/event/guest không rotate token.

Website giữ domain lâu dài ít nhất qua ngày cưới và thời gian phản hồi; nếu đổi domain cần giữ cũ redirect sang domain kiểm soát cùng chủ. Do token là capability, không redirect token tới domain không được Owner duyệt.

## 2. Credential lưu trữ và tái xuất
DB lưu hash để lookup, ciphertext AES-GCM để Owner tái xuất chính xác link cũ; key ngoài DB, key versioned, backup an toàn. Plain token chỉ ở memory lúc mint/decrypt/generate; không logs/audit/metrics. Mất key thì không dựng lại token từ hash.
Rotation là hành động riêng, thu hồi bản cũ, cảnh báo giấy đã in; guest session grants cũ mất quyền. Encryption key rotation re-encrypt ciphertext không cần đổi token public; credential rotation thì đổi token public. Không nhầm hai loại.

## 3. Hai cách phát thiệp
### Online
- Copy link cá nhân; tải QR PNG để gửi ảnh.
- Người mở từ máy đang nhận ảnh có thể khó quét chính màn hình → khi gửi QR nên gửi kèm link clickable.
- PNG online gồm tên và lời hướng dẫn nếu chọn card; QR-only cũng có tùy chọn.
- Mark sent là thủ công. Không đo “đã đọc” bằng crawler hit.

### Thiệp giấy
Xuất PDF A4 grid nhãn; tên rõ để dán đúng người; event label tùy chọn; mã đối chiếu ngắn không dùng làm secret. Có thể xuất manifest admin riêng: thứ tự nhãn → tên → invitationId → event; manifest chứa PII, lưu private.

## 4. Default layout đã tính kích thước
A4 portrait 210×297mm. Lề bốn phía 10mm. Gap giữa nhãn 4mm.
- 3 cột, 5 hàng: **15 nhãn/trang**.
- Label width `(210-20-2*4)/3 = 60.67mm`.
- Label height `(297-20-4*4)/5 = 52.20mm`.
- QR symbol (không gồm quiet zone) mặc định 30×30mm; quiet zone ít nhất 4 modules mỗi cạnh. Bộ render tính tổng QR footprint theo số modules thực, không ép quiet zone bị cắt.
- Padding nhãn khoảng 2mm; tên tối đa 2 dòng; hướng dẫn 1–2 dòng 8–9pt, tên 10–11pt; nhúng font tiếng Việt.
- Nếu QR version/module count làm footprint vượt vùng cho phép, tăng QR region/reduce layout density hoặc dùng domain ngắn hơn; không silently shrink QR dưới ngưỡng test.

Các số này là cấu hình khởi đầu phải test vật lý, không phải cam kết mọi máy in/giấy đều quét. PDF dùng vector/modules hình vuông sắc nét, không screenshot canvas để in. Convert mm→PDF points: `pt=mm*72/25.4`.

Một URL khoảng 70–100 ký tự có thể tăng QR density; renderer tính module pitch và cảnh báo `<0.4mm/module` như ngưỡng đề xuất để thử lại, không coi đây là tiêu chuẩn phổ quát. QR error correction M mặc định; không đặt logo vào QR. Tăng lên Q chỉ khi test và kích thước cho phép vì Q tăng mật độ.

## 5. Nội dung nhãn
```
KÍNH MỜI ANH MINH & GIA ĐÌNH
[QR có quiet zone rõ]
Quét để xem thiệp & xác nhận tham dự
Tiệc cùng đơn vị · Mã đối chiếu 0012
```
Mã 0012 chỉ đối chiếu print batch, không URL/token. Nếu mời cả hai: “Hai buổi tiệc”; không để nhãn mơ hồ “đơn vị” nếu grant thực khác.
Tên dài phải wrap/shrink trong min font đã đặt; nếu vẫn không đủ thì preview cảnh báo và Owner sửa display label. Không cắt âm thầm thành tên người khác.

## 6. Xuất file
- QR PNG từng invitation: tối thiểu độ phân giải phù hợp tải gửi, nền trắng, no compression blur.
- QR ZIP hàng loạt P1: filenames sequence + sanitized name + short ID, không raw token trong filename.
- PDF A4 P0: ordered labels, page numbers ngoài vùng cắt, empty cells trang cuối, embedded font.
- CSV links P0 nếu Owner cần: quyền download riêng, warning nhạy cảm; escape formula injection. Không auto đưa token vào export guest thông thường.
- Manifest không bắt buộc link; tên/invitationId/buổi để đối chiếu đủ.

Files private, download authenticated, Cache-Control no-store, expire đề xuất24h. File tải về máy người dùng không tự thu hồi được: Owner cần bảo quản và xóa bản dư.

## 7. Quy trình QA bản in
1. Owner xác nhận domain thật + HTTPS, guest names/grants đã đúng.
2. Export một trang mẫu đủ tên dài, một/two events, dấu tiếng Việt.
3. In Actual size 100%, tắt Fit to page; dùng đúng giấy và máy dự định.
4. Đo kích thước; kiểm tra lề máy in không cắt nội dung.
5. Quét bằng iOS/Android ở sáng bình thường và ánh sáng thấp vừa phải; mở bằng trình duyệt/in-app browser.
6. Đối chiếu từng mẫu với đúng tên và event; test QR dán lên thiệp thật không gấp/cắt symbol.
7. In toàn bộ, kiểm tra ngẫu nhiên mỗi trang, giữ manifest để cắt/dán đúng.
Không đưa dấu cắt hay nền trang trí vào quiet zone.

## 8. Open Graph và quyền riêng tư
OG cơ bản gồm og:title, og:type, og:image, og:url trong HTML head theo protocol.[^https://ogp.me/]
Spring trả HTML shell server-side cho `/i/*`, không trông chờ crawler chạy React. Metadata dùng tên hai bạn, ảnh đã được Owner đồng ý công khai; og:url dùng `/w/{slug}` chung không bearer token. Không recipient name/event private/RSVP trong HTML initial hoặc ảnh OG. Sharing preview có thể bị nền tảng cache, không thể đảm bảo update ngay; test thật Zalo và Messenger.

Crawler vẫn được gửi original URL chứa token bởi người chia sẻ: metadata generic không khiến link biến thành tuyệt đối bí mật. Giảm dữ liệu lộ và tracking, không hứa chống người có link/crawler truy cập như browser nếu họ chủ động thực thi. Không dùng nhận diện user-agent crawler làm ranh giới bảo mật.

## 9. Link entry hygiene
Initial route no-store, no-referrer; redact `/i/*` tại Caddy/app/access logs/APM; không load third-party scripts/trackers/fonts trước replaceState. Redeem POST body không logging. Sau grant, đổi URL sạch `/invitation/{id}`; ID đơn thuần không cấp quyền, API kiểm session grant. replaceState không xóa lịch sử ở ứng dụng nhắn tin hoặc mọi cơ chế mạng; bản link gốc vẫn nhạy cảm.

## 10. Chặn lỗi sản phẩm
- Copy QR nhiều lần không tạo nhiều tokens.
- Filter tags không nhân đôi cùng invitation.
- Export giữ snapshot order để QR không ghép nhầm displayName do map index.
- Thu hồi trong khi render →job invalidated/recheck, không file “success” với token revoked.
- Sửa tên sau export → file chứa nhãn tên cũ; UI show revision warning regenerate.
- Domain chưa final → không cho đánh dấu Ready to print production.

## 11. Đóng/mở không làm hỏng QR (v1.1)
QR/link còn nguyên khi close/open/schedule/PIN reset. Một QR quét sớm sẽ thấy màn chung không riêng tư; khi đến giờ, cùng QR mở được. Không đưa ngày mở/PIN/recipient vào QR. Đóng link không bảo vệ dữ liệu public đã được công khai hoặc nội dung người xem đã tải/chụp.

Print/export center thêm effective policy warning: “Link đang đóng; mã vẫn hợp lệ và sẽ dùng khi mở.” Không coi CLOSED là REVOKED để tự sinh token mới. Admin preview/QR generation/download không tăng open counters. Owner copy/open personal link trong browser riêng vẫn có thể tạo open event; UI nên hướng dẫn dùng preview admin để test.
