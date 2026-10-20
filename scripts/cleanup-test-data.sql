\set ON_ERROR_STOP on
BEGIN;
-- Only the explicit fixture groups used by deploy verification scripts.
CREATE TEMP TABLE cleanup_invitations ON COMMIT DROP AS
SELECT id FROM invitations WHERE group_name IN
('Khách kiểm thử','Khách PIN','Khách nhắc','Smoke','Khách lời chúc','Khách vai trò');

CREATE TEMP TABLE cleanup_events ON COMMIT DROP AS
SELECT e.id FROM events e
WHERE (
 (e.venue = 'Nhà hàng kiểm thử' AND
  btrim(e.title) ~ '^(Buổi tiệc (bạn bè — kiểm thử|gia đình — kiểm thử|gỡ lỗi( [0-9]+| CallApi [0-9]+)?|kiểm thử (PIN|đợt [0-9]+)( [0-9]+)?)|Tiệc kiểm thử (nhắc|lời chúc) [0-9]+)$')
 OR (e.title ~ '^Smoke E[12]$' AND e.venue = 'Test venue' AND e.address = 'Test address')
 OR (e.title ~ '^Buổi khác [0-9]+$' AND e.venue = 'Nơi khác' AND e.address = 'Địa chỉ khác')
)
-- Never remove an event assigned to a non-test invitation.
AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.event_id=e.id
 AND a.invitation_id NOT IN (SELECT id FROM cleanup_invitations));

SELECT 'test_invitations' AS entity, count(*) FROM cleanup_invitations
UNION ALL SELECT 'test_events', count(*) FROM cleanup_events;
SELECT i.display_name, i.group_name FROM invitations i JOIN cleanup_invitations c USING(id) ORDER BY 2,1;
SELECT e.title FROM events e JOIN cleanup_events c USING(id) ORDER BY 1;

\if :apply
-- Snapshot exports containing removed guests must not keep their private links.
DELETE FROM export_jobs WHERE id IN
 (SELECT job_id FROM export_rows WHERE invitation_id IN (SELECT id FROM cleanup_invitations));
DELETE FROM idempotency WHERE invitation_id IN (SELECT id FROM cleanup_invitations) OR event_id IN (SELECT id FROM cleanup_events);
DELETE FROM rsvp_history WHERE invitation_id IN (SELECT id FROM cleanup_invitations) OR event_id IN (SELECT id FROM cleanup_events);
DELETE FROM open_events WHERE invitation_id IN (SELECT id FROM cleanup_invitations);
DELETE FROM responses WHERE invitation_id IN (SELECT id FROM cleanup_invitations);
DELETE FROM assignments WHERE invitation_id IN (SELECT id FROM cleanup_invitations);
DELETE FROM invitations WHERE id IN (SELECT id FROM cleanup_invitations);
DELETE FROM events WHERE id IN (SELECT id FROM cleanup_events);
COMMIT;
\else
ROLLBACK;
\endif