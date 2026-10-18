# Dữ liệu demo

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