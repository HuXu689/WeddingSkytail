/**
 * Câu chữ dùng chung cho trạng thái không mở được lời mời (link sai, đã thu hồi, phiên hết hạn).
 * Một nguồn duy nhất để trang thiệp thật (`invitation-entry.tsx`) và phần xem trước trong editor
 * (`admin/section-editor.tsx`) không lệch nhau.
 *
 * Câu chữ trung tính: không xác nhận lời mời có tồn tại hay không và không nói khách "không được mời",
 * vì cả hai đều tiết lộ thông tin ngoài phạm vi cần thiết.
 */
export const INVITATION_UNAVAILABLE='Thiệp hiện không khả dụng hoặc phiên đã hết hạn. Hãy mở lại link/QR gốc hoặc liên hệ người gửi.';