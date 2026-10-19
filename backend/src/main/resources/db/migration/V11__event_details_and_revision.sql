-- Event details required by docs/02 §4 and §10, plus a revision counter for edits after publishing.
ALTER TABLE events
    ADD COLUMN maps_url varchar(500),
    ADD COLUMN dress_code varchar(200),
    ADD COLUMN parking varchar(500),
    ADD COLUMN note varchar(500) NOT NULL DEFAULT '',
    ADD COLUMN change_notice varchar(500),
    ADD COLUMN cancel_reason varchar(500),
    ADD COLUMN revision bigint NOT NULL DEFAULT 0,
    ADD CONSTRAINT events_maps_url_https CHECK (maps_url IS NULL OR maps_url LIKE 'https://%');