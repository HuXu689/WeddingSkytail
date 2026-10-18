ALTER TABLE rsvp_history ADD COLUMN changed_by varchar(40) NOT NULL DEFAULT 'GUEST';
ALTER TABLE rsvp_history ADD COLUMN change_reason varchar(500) NOT NULL DEFAULT '';
CREATE INDEX rsvp_history_lookup_idx ON rsvp_history(invitation_id,event_id,created_at DESC);