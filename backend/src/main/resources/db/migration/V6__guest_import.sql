ALTER TABLE events ADD COLUMN event_code varchar(40);
UPDATE events SET event_code='E-'||upper(substr(replace(id::text,'-',''),1,8)) WHERE event_code IS NULL;
ALTER TABLE events ALTER COLUMN event_code SET NOT NULL;
ALTER TABLE events ADD CONSTRAINT events_event_code_unique UNIQUE(event_code);
ALTER TABLE invitations ADD COLUMN external_ref varchar(120);
CREATE UNIQUE INDEX invitations_external_ref_unique ON invitations(external_ref) WHERE external_ref IS NOT NULL;

CREATE TABLE import_batches (
    id uuid PRIMARY KEY,
    idempotency_key uuid NOT NULL UNIQUE,
    payload_hash varchar(64) NOT NULL,
    status varchar(20) NOT NULL CHECK(status IN ('PREVIEW','COMMITTED','FAILED')),
    total_rows integer NOT NULL CHECK(total_rows BETWEEN 0 AND 2000),
    valid_rows integer NOT NULL CHECK(valid_rows BETWEEN 0 AND 2000),
    created_at timestamptz NOT NULL DEFAULT now(),
    committed_at timestamptz
);
CREATE TABLE import_rows (
    batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    line_number integer NOT NULL CHECK(line_number >= 2),
    external_ref varchar(120),
    display_name varchar(200) NOT NULL,
    salutation varchar(80) NOT NULL,
    group_name varchar(100) NOT NULL,
    event_codes varchar(500) NOT NULL,
    max_people_text varchar(120) NOT NULL,
    valid boolean NOT NULL,
    message varchar(1000) NOT NULL DEFAULT '',
    PRIMARY KEY(batch_id,line_number)
);