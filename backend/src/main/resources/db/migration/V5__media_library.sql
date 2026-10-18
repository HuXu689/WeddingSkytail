CREATE TABLE media_assets (
    id uuid PRIMARY KEY,
    storage_name varchar(80) NOT NULL UNIQUE,
    original_name varchar(255) NOT NULL,
    mime_type varchar(40) NOT NULL CHECK (mime_type = 'image/jpeg'),
    width integer NOT NULL CHECK (width BETWEEN 1 AND 12000),
    height integer NOT NULL CHECK (height BETWEEN 1 AND 12000),
    bytes bigint NOT NULL CHECK (bytes > 0 AND bytes <= 10485760),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wedding_media_selection (
    media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    surface varchar(20) NOT NULL CHECK (surface IN ('DRAFT','PUBLISHED')),
    slot varchar(20) NOT NULL CHECK (slot IN ('HERO','ALBUM')),
    sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY(media_id,surface,slot)
);
CREATE UNIQUE INDEX wedding_media_one_hero ON wedding_media_selection(surface,slot) WHERE slot='HERO';
CREATE INDEX wedding_media_album_order ON wedding_media_selection(surface,slot,sort_order);