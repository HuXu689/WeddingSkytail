-- V16 may run before the first owner exists on a fresh database. Explicit bootstrap id=1
-- then left the sequence at 1, so the next account collided with the owner.
SELECT setval(pg_get_serial_sequence('admin_users','id'),
              greatest(coalesce((SELECT max(id) FROM admin_users),0),1),
              EXISTS(SELECT 1 FROM admin_users));