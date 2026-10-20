# Dữ liệu demo

## Kiểm tra nhạc thật và chính sách tự phát

`node scripts/music-real-qa.mjs` mặc định kiểm tra stack Docker tại
`http://localhost:8088/w/our-wedding`: dùng API và tệp nhạc đã phát hành thật,
không thay thế `play()` và không gắn `userGesture` vào lệnh đọc trạng thái.
Script dùng profile Chrome mới, kiểm tra mở/tải lại và thời gian phát thực sự tăng.
Không sửa dữ liệu, không tạo khách và không ghi lượt mở lời mời thật.

- Mặc định dùng chính sách `document-user-activation-required`: xác nhận tự phát bị
  chặn và âm thanh chạy sau thao tác chuột thật do Chrome DevTools gửi.
- Đặt `MUSIC_QA_EXPECT_PROMPT=1` để bắt buộc lời nhắc nghe nhạc xuất hiện khi bị chặn.
- Đặt `MUSIC_QA_POLICY=no-user-gesture-required` để kiểm tra nhánh trình duyệt cho
  phép tự phát (chỉ cờ của browser test, không phải cách vượt chính sách cho khách).
- Đặt `MUSIC_QA_PRIVATE=1` để kiểm tra trang thiệp riêng với envelope quyền truy cập
  giả lập nhưng thiết kế public/API/tệp âm thanh thật. Đây không phải kiểm thử
  end-to-end guest authentication/PIN.
- Có thể đặt `INVITATION_QA_ORIGIN`, `MUSIC_QA_URL`, `CHROME_PATH` cho môi trường khác.

Tự phát có âm thanh khi chưa tương tác không thể được website bảo đảm trên mọi
trình duyệt. Cần nghiệm thu thêm Safari iOS và trình duyệt trong Zalo trên thiết bị
thật. Test headless xác nhận giải mã/thời gian phát, không xác nhận loa vật lý.

## Giữ database phát triển gọn sau kiểm thử

Các script trong `deploy/verify-*.ps1` và `deploy/smoke.ps1` tạo dữ liệu mới mỗi lần chạy.
Nên chạy trên stack QA riêng (`deploy/compose.qa.yml`), không chạy trên database đang dùng thật.
Sau khi kiểm thử trên stack local mặc định, xem trước dữ liệu sẽ dọn:

```powershell
.\scripts\cleanup-test-data.ps1
```

Áp dụng (tự động sao lưu toàn bộ PostgreSQL trước khi xóa):

```powershell
.\scripts\cleanup-test-data.ps1 -Apply
```

- Chỉ nhận diện các nhóm fixture: `Khách kiểm thử`, `Khách PIN`, `Khách nhắc`, `Smoke`, `Khách lời chúc`, `Khách vai trò`; không dùng các nhóm này cho khách thật.
- Sự kiện được nhận diện theo cả mẫu tiêu đề và địa điểm của fixture; giữ lại nếu còn gán cho khách ngoài nhóm test.
- Dọn các dữ liệu phụ thuộc (RSVP, lịch sử RSVP test, lượt mở, PIN, nhắc, lời chúc test); xóa snapshot xuất có chứa link của khách bị dọn.
- Giữ nguyên bộ DEMO 6 lời mời / 2 sự kiện, khách ngoài nhóm test, thiết kế thiệp, media, tài khoản, phiên đăng nhập và nhật ký audit. Không truncate/reset database.
- Backup riêng tư ở `.qa-artifacts/db-backups/*.dump` (đã được gitignore). Không chia sẻ hoặc commit backup. Khôi phục bằng `pg_restore` vào database riêng trước khi cân nhắc thay database hiện hành.
- Chế độ mặc định chỉ xem trước và rollback; chạy lại sau khi dọn sẽ không xóa thêm dữ liệu ngoài phạm vi.

## Tạo dữ liệu mẫu

Khởi động stack trước, sau đó chạy từ thư mục gốc repository:

```powershell
.\scripts\seed-demo.ps1 -Username owner -Password '<mật khẩu trong .env>'
```

Nếu đã tạo ảnh vào `scripts/demo-media`, dùng:

```powershell
.\scripts\seed-demo.ps1 -Username owner -Password '<mật khẩu trong .env>' -MediaPath .\scripts\demo-media
```

Script tạo/cập nhật:

- Thiết kế demo `Minh & An`, câu chuyện, lời mời và lời cảm ơn.
- Hai buổi tiệc mẫu, đều được phát hành.
- Sáu lời mời demo thuộc nhóm `DEMO · ...`.
- RSVP mẫu: có người đồng ý, từ chối và chưa phản hồi.
- Link riêng cho khách trong `demo-links.txt` (file này không commit).
- Hero và album nếu truyền `-MediaPath`.

## Dùng cho đám cưới khác

Mở `scripts/seed-demo.ps1`, sửa block `$demo` ở đầu file: tên, lời mời, câu chuyện, ngày giờ, địa điểm, theme và accent. Không cần sửa component hoặc migration. Thay ảnh trong thư mục media rồi chạy lại script.

## Dọn dữ liệu demo

Lệnh dưới đây chỉ xóa lời mời có nhóm bắt đầu bằng `DEMO` và hai sự kiện có tiêu đề demo; không xóa khách thật, wedding design hay media:

```powershell
.\scripts\seed-demo.ps1 -Username owner -Password '<mật khẩu trong .env>' -ResetDemo
```

Sau khi reset, chạy seed lại để tạo bộ demo mới.

## Kiểm tra FE thiệp riêng, không dùng dữ liệu thật

Chạy frontend bằng `npm run dev` trong thư mục frontend, sau đó từ thư mục gốc chạy:

```powershell
node scripts/invitation-review-qa.mjs
```

Script dùng Chrome headless và mô phỏng toàn bộ yêu cầu `/api/v1` ngay trong trình duyệt; không tạo hay sửa khách mời thật. Mặc định frontend ở `http://127.0.0.1:3000`; có thể đặt biến môi trường `INVITATION_QA_ORIGIN` và `CHROME_PATH` để đổi địa chỉ hoặc đường dẫn Chrome.

Kiểm tra ba mẫu thiệp ở bảy chiều rộng, nội dung dài, form RSVP và xung đột phản hồi, PIN, popup album, bàn phím/focus và giảm chuyển động. Báo cáo JSON cùng ảnh chụp nằm trong `.qa-artifacts/invitation-review`. Đây là kiểm tra FE với dữ liệu mô phỏng, không thay thế kiểm thử API/backend hoặc Safari trên iPhone thật.