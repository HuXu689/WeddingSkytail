-- T03: nội dung có cấu trúc cho 5 phần tùy chọn (INTRO/FAMILY/CEREMONY/TIMELINE/DRESS_CODE).
--
-- `payload` là cột bổ sung, KHÔNG thay thế cột cũ: hàng cũ (payload NULL) vẫn render từ
-- title/body/starts_at/color như trước, nên migration này không cần backfill và không phá
-- tương thích dữ liệu đang phát hành. Server whitelist và chuẩn hoá nội dung payload.
--
-- content_schema_version: 1 = chỉ cột phẳng (legacy), 2 = cho phép payload có cấu trúc.
-- template_version giữ nguyên = 1.
ALTER TABLE wedding_sections ADD COLUMN payload jsonb;

ALTER TABLE wedding DROP CONSTRAINT wedding_content_schema_version_check;
ALTER TABLE wedding ADD CONSTRAINT wedding_content_schema_version_check CHECK (content_schema_version IN (1,2));