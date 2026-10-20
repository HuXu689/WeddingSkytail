-- Keep existing invitations silent by default; publish the setting with the design.
ALTER TABLE wedding
    ADD COLUMN draft_music_autoplay boolean NOT NULL DEFAULT false,
    ADD COLUMN music_autoplay boolean NOT NULL DEFAULT false;