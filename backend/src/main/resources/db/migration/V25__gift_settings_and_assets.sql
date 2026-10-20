-- Separate from public media: no existing image or recipient is selected automatically.
CREATE TABLE gift_assets (
    id uuid PRIMARY KEY,
    png bytea NOT NULL CHECK (octet_length(png) BETWEEN 1 AND 5242880),
    width integer NOT NULL CHECK (width BETWEEN 220 AND 4096),
    height integer NOT NULL CHECK (height BETWEEN 220 AND 4096),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (width::bigint * height <= 16777216)
);

CREATE TABLE gift_settings (
    surface varchar(9) PRIMARY KEY CHECK (surface IN ('DRAFT','PUBLISHED')),
    enabled boolean NOT NULL DEFAULT false,
    mode varchar(6) NOT NULL DEFAULT 'SINGLE' CHECK (mode IN ('SINGLE','DUAL')),
    visibility varchar(7) NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE','PUBLIC')),
    first_label varchar(80) NOT NULL DEFAULT '',
    first_description varchar(240) NOT NULL DEFAULT '',
    first_asset_id uuid REFERENCES gift_assets(id),
    second_label varchar(80) NOT NULL DEFAULT '',
    second_description varchar(240) NOT NULL DEFAULT '',
    second_asset_id uuid REFERENCES gift_assets(id),
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    CHECK (surface <> 'PUBLISHED' OR NOT enabled OR
        (length(trim(first_label)) > 0 AND first_asset_id IS NOT NULL AND
         (mode = 'SINGLE' OR (length(trim(second_label)) > 0 AND second_asset_id IS NOT NULL))))
);
INSERT INTO gift_settings(surface) VALUES ('DRAFT'),('PUBLISHED');