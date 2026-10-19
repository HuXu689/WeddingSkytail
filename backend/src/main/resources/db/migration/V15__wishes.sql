-- T24: guest wish book with moderation. Default state is PENDING, so nothing a guest writes
-- is visible to anyone until the owner approves it (docs/14 §Sổ lời chúc có duyệt).
CREATE TABLE wishes (
    id uuid PRIMARY KEY,
    invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    event_id uuid REFERENCES events(id) ON DELETE SET NULL,
    display_name varchar(200) NOT NULL,
    message varchar(600) NOT NULL CHECK (char_length(btrim(message)) BETWEEN 2 AND 600),
    state varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','APPROVED','REJECTED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    moderated_at timestamptz,
    moderated_by varchar(100),
    revision bigint NOT NULL DEFAULT 0,
    CHECK ((state = 'PENDING') = (moderated_at IS NULL))
);
CREATE INDEX wishes_queue_idx ON wishes(state,created_at DESC);
CREATE INDEX wishes_invitation_idx ON wishes(invitation_id,created_at DESC);