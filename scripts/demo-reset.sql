BEGIN;
-- Chỉ xóa dữ liệu có nhãn DEMO do seed-demo.ps1 tạo.
DELETE FROM idempotency WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM open_events WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM rsvp_history WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM responses WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM assignments WHERE invitation_id IN (SELECT id FROM invitations WHERE group_name LIKE 'DEMO%');
DELETE FROM invitations WHERE group_name LIKE 'DEMO%';
DELETE FROM events WHERE title IN ('Lễ gia tiên & tiệc thân mật','Tiệc mừng cùng bạn bè');
COMMIT;