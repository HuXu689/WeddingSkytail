BEGIN;
-- Chỉ xóa dữ liệu có nhãn DEMO do seed-demo.ps1 tạo.
DELETE FROM wishes WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM invitation_reminders WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM idempotency WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM open_events WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM rsvp_history WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM responses WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM assignments WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM invitations WHERE group_name LIKE 'DEMO%';
DELETE FROM events WHERE title IN (
  'Lễ gia tiên & tiệc thân mật',
  'Tiệc mừng cùng bạn bè',
  'Lễ Ăn Hỏi & Tiệc Thân Mật Hai Gia Đình',
  'Lễ Ăn Hỏi & Cơm Thân Mật Hai Gia Đình',
  'Lễ Thành Hôn & Tiệc Cưới Chính Thức',
  'Tiệc Tối Thân Mật Cùng Hội Bạn Thân'
) AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.event_id = events.id);
UPDATE wedding SET heart_count = 0 WHERE id = 1;
COMMIT;
