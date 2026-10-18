CREATE TABLE wedding (
 id integer PRIMARY KEY CHECK (id=1), slug varchar(80) NOT NULL DEFAULT 'our-wedding',
 draft_names varchar(200) NOT NULL DEFAULT 'Tên hai bạn', draft_message varchar(2000) NOT NULL DEFAULT '',
 names varchar(200) NOT NULL DEFAULT '', message varchar(2000) NOT NULL DEFAULT '',
 published boolean NOT NULL DEFAULT false, version bigint NOT NULL DEFAULT 0,
 mode varchar(20) NOT NULL DEFAULT 'MANUAL_CLOSED', open_at timestamptz, close_at timestamptz,
 tracking boolean NOT NULL DEFAULT true,
 CHECK(mode IN ('MANUAL_OPEN','MANUAL_CLOSED','SCHEDULED')),
 CHECK(mode <> 'SCHEDULED' OR (open_at IS NOT NULL AND (close_at IS NULL OR close_at > open_at)))
);
INSERT INTO wedding(id) VALUES(1);
CREATE TABLE events (
 id uuid PRIMARY KEY, title varchar(200) NOT NULL, start_at timestamptz NOT NULL,
 deadline timestamptz NOT NULL, venue varchar(200) NOT NULL, address varchar(500) NOT NULL,
 timezone varchar(80) NOT NULL, capacity integer NOT NULL CHECK(capacity>0),
 state varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','PUBLISHED','CANCELLED')),
 version bigint NOT NULL DEFAULT 0, CHECK(deadline<=start_at)
);
CREATE TABLE invitations (
 id uuid PRIMARY KEY, display_name varchar(200) NOT NULL, group_name varchar(100) NOT NULL DEFAULT '',
 salutation varchar(80) NOT NULL DEFAULT 'Kính mời', token_hash varchar(64) NOT NULL UNIQUE,
 token_cipher text NOT NULL, active boolean NOT NULL DEFAULT true, auth_revision bigint NOT NULL DEFAULT 0,
 mode varchar(20) NOT NULL DEFAULT 'INHERIT', open_at timestamptz, close_at timestamptz,
 sent boolean NOT NULL DEFAULT false, version bigint NOT NULL DEFAULT 0,
 CHECK(mode IN ('INHERIT','MANUAL_OPEN','MANUAL_CLOSED','SCHEDULED')),
 CHECK(mode <> 'SCHEDULED' OR (open_at IS NOT NULL AND (close_at IS NULL OR close_at > open_at)))
);
CREATE TABLE assignments (
 invitation_id uuid REFERENCES invitations(id), event_id uuid REFERENCES events(id),
 max_people integer NOT NULL CHECK(max_people BETWEEN 1 AND 20),
 PRIMARY KEY(invitation_id,event_id)
);
CREATE TABLE responses (
 invitation_id uuid, event_id uuid, status varchar(20) NOT NULL, total_people integer NOT NULL,
 note varchar(500) NOT NULL DEFAULT '', version bigint NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(invitation_id,event_id), FOREIGN KEY(invitation_id,event_id) REFERENCES assignments,
 CHECK((status='ATTENDING' AND total_people>=1) OR (status='DECLINED' AND total_people=0))
);
CREATE TABLE rsvp_history (
 id bigserial PRIMARY KEY, invitation_id uuid NOT NULL, event_id uuid NOT NULL,
 status varchar(20) NOT NULL, total_people integer NOT NULL, note varchar(500) NOT NULL,
 version bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE idempotency (
 invitation_id uuid, event_id uuid, request_key uuid, payload_hash varchar(64) NOT NULL,
 status varchar(20) NOT NULL, total_people integer NOT NULL, note varchar(500) NOT NULL, version bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(invitation_id,event_id,request_key)
);
CREATE TABLE open_events (
 invitation_id uuid REFERENCES invitations(id), pseudonym varchar(64), bucket bigint,
 opened_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(invitation_id,pseudonym,bucket)
);
CREATE TABLE audit (
 id bigserial PRIMARY KEY, action varchar(80) NOT NULL, target varchar(80) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assignments_event_idx ON assignments(event_id);
CREATE INDEX open_events_time_idx ON open_events(invitation_id,opened_at);