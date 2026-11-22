# Wedding Invitation — Bộ kế hoạch xây dựng website thiệp cưới

> **Đã có bản code lõi 0.1.0** (Spring Boot + Next.js + PostgreSQL + Docker). Xem [README-IMPLEMENTATION.md](README-IMPLEMENTATION.md) để chạy, kiểm thử và biết các giới hạn. Hướng dẫn chạy local và deploy qua SSH: [docs/15-local-and-ssh-deploy.md](docs/15-local-and-ssh-deploy.md). Nội dung bên dưới là bộ đặc tả gốc, không phải danh sách chức năng đã hoàn tất.

**Phiên bản:** 1.1 · **Ngày lập:** 2026-10-14 · **Ngôn ngữ sản phẩm:** tiếng Việt.
**Trạng thái:** đặc tả và kế hoạch, chưa phải phần mềm đã lập trình/chạy/kiểm thử.

## 1. Kết luận thiết kế

Một website cho một đám cưới, quản lý nhiều buổi tiệc. Mỗi lời mời đại diện một cá nhân, cặp đôi hoặc gia đình; được gán vào một hoặc nhiều buổi. Mỗi lời mời có link bền vững và QR riêng. Chủ tiệc gửi link/ảnh QR online hoặc xuất PDF A4 để cắt dán lên thiệp giấy. Khách không cần tài khoản, xác nhận riêng từng buổi. Chủ tiệc xem phản hồi và tổng số người từng buổi trong khu quản trị riêng.

**Stack đề xuất:** Java 21 LTS + Spring Boot bản stable còn hỗ trợ tại thời điểm khởi công; React + TypeScript + Vite; PostgreSQL 17; Docker Compose; Caddy cho HTTPS/reverse proxy. Backend modular monolith, không microservices. Phiên bản patch/image digest sẽ khóa khi khởi công và kiểm tra lại tình trạng hỗ trợ. Đây là lựa chọn thiết kế, không phải tuyên bố tất cả dependency đã được thử tương thích.

**Phạm vi bản đầu:** một chủ tiệc, hai sự kiện nhưng mô hình dữ liệu hỗ trợ nhiều hơn; một theme chất lượng; khách/gia đình, nhập danh sách, lời mời cá nhân, RSVP, link/QR, PDF in, xuất danh sách, đóng/mở link ngay hoặc theo lịch, trạng thái mở thiệp có giới hạn rõ ràng, backup và bảo mật cơ bản. Không SaaS, không tự động gửi Zalo/SMS, không thanh toán, không check-in tại cửa trong bản đầu.

## 2. Các quyết định quan trọng

1. Gán buổi được mời là quyền theo từng lời mời, không suy ra từ nhãn “đơn vị/gia đình”.
2. RSVP là trạng thái mới nhất trên từng cặp lời mời–sự kiện. Cập nhật không tạo thêm người trong thống kê.
3. QR chứa URL với token ngẫu nhiên; không chứa tên, điện thoại hoặc lịch tiệc cố định.
4. Token đường dẫn là bearer capability: ai có link có thể xem/sửa RSVP của lời mời. Không quảng cáo là xác thực danh tính.
5. Không tự hết hạn/rotate link trước ngày cưới; sửa sự kiện không đổi token. Thu hồi hoặc rotate có cảnh báo QR giấy sẽ mất hiệu lực.
6. Nhận diện khách dùng session; không lưu token đăng nhập ở localStorage. Có thể mở nhiều lời mời trong một trình duyệt mà không ghi nhầm.
7. Phản hồi, số điện thoại, danh sách khách không công khai. Metadata chia sẻ dùng nội dung chung, không có tên khách.
8. Bản PDF là tài liệu nhạy cảm vì chứa link; phải tải có xác thực, hết hạn tải, không nằm trong media public.
9. PostgreSQL là nguồn dữ liệu chính; QR có thể tái tạo. Muốn tái xuất token cũ cần bản token mã hóa, không chỉ hash.
10. Cần kiểm thử bản in vật lý và Zalo/Messenger thật, không chỉ test trình duyệt máy tính.

## 3. Minh họa bằng dữ liệu giả

- Đám cưới: “An & Bình”, slug `an-binh`.
- E1: “Tiệc gia đình & bạn bè”, Nhà hàng A.
- E2: “Tiệc chung vui cùng đơn vị”, Nhà hàng B.
- I1: “Anh Minh & gia đình”, chỉ E2, tối đa 3 người.
- I2: “Gia đình cô Hoa”, E1 và E2, tối đa 4 người/buổi.
  Tất cả tên, nhà hàng, sức chứa trong tài liệu là ví dụ giả; không phải dữ liệu thật.

## 4. Bổ sung v1.1 — quản lý link và trạng thái mở thiệp

- Chặn trước giờ phát hành; đóng/mở toàn bộ, theo nhóm được chọn hoặc từng lời mời, giữ nguyên QR.
- Lịch mở/đóng theo timezone; kiểm tra thời gian ở backend mỗi request, không cần cron để chuyển trạng thái chính xác.
- Tách đóng link (không xem nội dung riêng) và đóng RSVP (vẫn xem thiệp).
- Có thể thêm PIN riêng (P1) cho lời mời cần bảo vệ hơn; không in PIN cùng QR nếu muốn thêm lớp bảo mật.
- Ghi nhận khi khách chủ động bấm “Mở thiệp”, không coi GET/OG/copy link là đã xem; dashboard hiện chưa ghi nhận/đã ghi nhận mở, lần đầu/gần nhất.
- Không khẳng định đúng người nhận đã đọc; không gọi số phiên/lượt mở là số khách duy nhất. Người giữ link có thể forward hoặc tự gửi request.
- Bulk actions có preview/dry-run, audit, version; đóng link chặn cả session cũ, mở lại không rotate.
- Duy trì một trung tâm quản lý link thay vì thêm nhiều trang riêng; chi tiết mới ở docs/13–14.
  Bản v1.1 có 15 file Markdown gồm README và 14 tài liệu. Các bổ sung là kế hoạch, chưa được code/test trên sản phẩm.
