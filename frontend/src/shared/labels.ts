const labels: Record<string,string> = {
 WEDDING_DESIGN:'Lưu bản nháp thiết kế',
 DRAFT:'Bản nháp', PUBLISHED:'Đã phát hành', CANCELLED:'Đã hủy', INHERIT:'Theo chính sách chung', MANUAL_OPEN:'Mở thủ công', MANUAL_CLOSED:'Đóng thủ công', SCHEDULED:'Theo lịch', ATTENDING:'Sẽ tham dự', DECLINED:'Không thể tham dự',
 WEDDING_DRAFT:'Lưu bản nháp thiệp', WEDDING_PUBLISH:'Phát hành thiệp', WEDDING_UNPUBLISH:'Ngừng công bố thiệp', EVENT_SAVE:'Lưu buổi tiệc', EVENT_PUBLISHED:'Phát hành buổi tiệc', EVENT_CANCELLED:'Hủy buổi tiệc', INVITATION_CREATE:'Tạo lời mời', INVITATION_SENT:'Đánh dấu đã gửi', INVITATION_REVOKE:'Thu hồi link', INVITATION_ROTATE:'Tạo lại link', LINK_REVEAL:'Lấy link hoặc QR', OWNER_BOOTSTRAP:'Khởi tạo chủ tiệc', ACCESS_INHERIT:'Áp dụng chính sách chung', ACCESS_MANUAL_OPEN:'Mở truy cập', ACCESS_MANUAL_CLOSED:'Đóng truy cập', ACCESS_SCHEDULED:'Đặt lịch truy cập'
};
export function label(value:string) { return labels[value] || 'Thao tác hệ thống'; }