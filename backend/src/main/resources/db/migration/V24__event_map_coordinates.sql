-- Optional, explicitly confirmed map location. Existing events remain unconfigured.
ALTER TABLE events
    ADD COLUMN latitude numeric(10,7),
    ADD COLUMN longitude numeric(10,7),
    ADD CONSTRAINT events_map_coordinates_pair CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL
         AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    );

-- Existing event APIs do not carry coordinates. Never retain a stale marker after a venue edit.
CREATE FUNCTION clear_changed_event_location() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.venue IS DISTINCT FROM OLD.venue OR NEW.address IS DISTINCT FROM OLD.address THEN
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER events_clear_changed_location
    BEFORE UPDATE OF venue, address ON events
    FOR EACH ROW EXECUTE FUNCTION clear_changed_event_location();