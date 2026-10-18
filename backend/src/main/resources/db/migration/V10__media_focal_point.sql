ALTER TABLE wedding_media_selection
    ADD COLUMN focal_x integer NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
    ADD COLUMN focal_y integer NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100);