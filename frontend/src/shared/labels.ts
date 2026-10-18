const labels: Record<string,string> = {
 WEDDING_DESIGN:'Lưu bản nháp thiết kế', WEDDING_DRAFT:'Lưu bản nháp thiệp', WEDDING_PUBLISH:'Phát hành thiệp', WEDDING_UNPUBLISH:'Ngừng công bố thiệp',
 DRAFT:'Bản nháp', PUBLISHED:'Đã phát hành', CANCELLED:'Đã hủy', INHERIT:'Theo chính sách chung', MANUAL_OPEN:'Mở thủ công', MANUAL_CLOSED:'Đóng thủ công', SCHEDULED:'Theo lịch',
 ATTENDING:'Sẽ tham dự', DECLINED:'Không thể tham dự', READY:'Sẵn sàng tải', EXPIRED:'Đã hết hạn', REVOKED:'Đã thu hồi', CSV:'Tệp CSV', PDF:'Tệp PDF',
 PREVIEW:'Bản xem trước', COMMITTED:'Đã ghi dữ liệu', FAILED:'Xử lý thất bại', VALID:'Hợp lệ', INVALID:'Có lỗi', ACTIVE:'Link còn hiệu lực', INACTIVE:'Đã thu hồi', ARCHIVED:'Đã lưu trữ', SENT:'Đã đánh dấu gửi', NOT_SENT:'Chưa đánh dấu gửi',
 WEDDING_SAVE:'Lưu bản nháp thiệp', EVENT_SAVE:'Lưu buổi tiệc', EVENT_PUBLISHED:'Phát hành buổi tiệc', EVENT_CANCELLED:'Hủy buổi tiệc',
 INVITATION_CREATE:'Tạo lời mời', INVITATION_UPDATE:'Cập nhật lời mời', INVITATION_SENT:'Đánh dấu đã gửi', INVITATION_REVOKE:'Thu hồi link', INVITATION_ROTATE:'Tạo lại link', INVITATION_ARCHIVE:'Lưu trữ lời mời', INVITATION_RESTORE:'Khôi phục lời mời',
 LINK_REVEAL:'Lấy link hoặc QR', OWNER_BOOTSTRAP:'Khởi tạo chủ tiệc', ACCESS_INHERIT:'Áp dụng chính sách chung', ACCESS_MANUAL_OPEN:'Mở truy cập', ACCESS_MANUAL_CLOSED:'Đóng truy cập', ACCESS_SCHEDULED:'Đặt lịch truy cập',
 IMPORT_PREVIEW:'Kiểm tra tệp nhập', IMPORT_COMMIT:'Ghi danh sách khách', GUEST_IMPORT:'Nhập danh sách khách', RSVP_UPDATE:'Cập nhật phản hồi', RSVP_OWNER_UPDATE:'Chủ tiệc sửa phản hồi', RSVP_HISTORY:'Xem lịch sử phản hồi',
 MEDIA_UPLOAD:'Tải ảnh lên', MEDIA_DELETE:'Xóa ảnh', MEDIA_SELECT:'Chọn ảnh thiệp', MEDIA_PUBLISH:'Phát hành ảnh', EXPORT_CREATE:'Tạo bản xuất', EXPORT_REVOKE:'Thu hồi bản xuất'
};
export function label(value:string) { return labels[value] || 'Trạng thái chưa xác định'; }
export function booleanLabel(value:boolean, positive:string, negative:string) { return value ? positive : negative; }