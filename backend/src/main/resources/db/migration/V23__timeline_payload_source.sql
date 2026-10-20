-- T08: mốc lịch trình có thể nằm trong `payload.timeline` (content schema 2) nên `starts_at`
-- không còn bắt buộc. Hàng TIMELINE vẫn phải có ít nhất một nguồn mốc: `starts_at` của hàng cũ
-- hoặc khoá `timeline` trong payload, để không lưu được mục lịch trình rỗng nghĩa.
-- Dùng `payload->'timeline' IS NOT NULL` thay cho toán tử `?` để tránh nhầm với placeholder JDBC.
ALTER TABLE wedding_sections DROP CONSTRAINT wedding_sections_check;
ALTER TABLE wedding_sections ADD CONSTRAINT wedding_sections_timeline_source_check
 CHECK (kind <> 'TIMELINE' OR starts_at IS NOT NULL OR payload->'timeline' IS NOT NULL);