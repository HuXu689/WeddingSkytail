-- Pinning is presentation metadata, never an approval or a change of audience.
ALTER TABLE wishes ADD COLUMN pinned boolean NOT NULL DEFAULT false;
ALTER TABLE wishes ADD CONSTRAINT wishes_pin_approved CHECK (NOT pinned OR state='APPROVED');
CREATE INDEX wishes_feed_idx ON wishes(pinned DESC,created_at DESC,id DESC) WHERE state='APPROVED';