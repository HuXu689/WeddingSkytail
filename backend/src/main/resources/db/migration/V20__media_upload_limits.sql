-- Keep existing assets; raise the stored-byte ceiling by media kind.
ALTER TABLE media_assets DROP CONSTRAINT media_assets_bytes_check;
ALTER TABLE media_assets ADD CONSTRAINT media_assets_bytes_check
    CHECK (bytes > 0 AND (
        (kind = 'IMAGE' AND bytes <= 104857600) OR
        (kind = 'AUDIO' AND bytes <= 20971520)
    ));