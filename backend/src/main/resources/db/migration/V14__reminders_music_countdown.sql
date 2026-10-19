-- P1: RSVP reminder worklist (FR21), calendar files and background music / countdown.
-- Reminders are a manual, owner-side record only: they never touch open tracking (docs/13 §10).
CREATE TABLE invitation_reminders (
    invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contacted_at timestamptz NOT NULL DEFAULT now(),
    contacted_by varchar(100) NOT NULL,
    note varchar(500) NOT NULL DEFAULT '',
    PRIMARY KEY(invitation_id,event_id)
);
CREATE INDEX invitation_reminders_event_idx ON invitation_reminders(event_id,contacted_at DESC);

-- Background music is stored on the wedding row: draft choice is published like every other design field.
ALTER TABLE wedding
    ADD COLUMN draft_music_id uuid REFERENCES media_assets(id),
    ADD COLUMN music_id uuid REFERENCES media_assets(id),
    ADD COLUMN draft_show_countdown boolean NOT NULL DEFAULT false,
    ADD COLUMN show_countdown boolean NOT NULL DEFAULT false;

-- Media library grows a second kind of asset: audio has no pixel dimensions.
ALTER TABLE media_assets ADD COLUMN kind varchar(10) NOT NULL DEFAULT 'IMAGE';
ALTER TABLE media_assets DROP CONSTRAINT media_assets_mime_type_check;
ALTER TABLE media_assets DROP CONSTRAINT media_assets_width_check;
ALTER TABLE media_assets DROP CONSTRAINT media_assets_height_check;
ALTER TABLE media_assets ALTER COLUMN width DROP NOT NULL;
ALTER TABLE media_assets ALTER COLUMN height DROP NOT NULL;
ALTER TABLE media_assets
    ADD CONSTRAINT media_assets_kind_check CHECK (kind IN ('IMAGE','AUDIO')),
    ADD CONSTRAINT media_assets_mime_type_check CHECK (mime_type IN ('image/jpeg','audio/mpeg','audio/mp4','audio/ogg')),
    ADD CONSTRAINT media_assets_kind_mime_check CHECK ((kind='IMAGE' AND mime_type='image/jpeg') OR (kind='AUDIO' AND mime_type IN ('audio/mpeg','audio/mp4','audio/ogg'))),
    ADD CONSTRAINT media_assets_dimensions_check CHECK ((kind='IMAGE' AND width BETWEEN 1 AND 12000 AND height BETWEEN 1 AND 12000) OR (kind='AUDIO' AND width IS NULL AND height IS NULL));