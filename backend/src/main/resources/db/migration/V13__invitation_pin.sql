-- PIN per invitation (FR19): a second factor for printed QR codes that could be photographed.
CREATE TABLE invitation_pin_protection (
    invitation_id uuid PRIMARY KEY REFERENCES invitations(id) ON DELETE CASCADE,
    enabled boolean NOT NULL DEFAULT false,
    pin_hash varchar(100),
    security_revision bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by varchar(100),
    CHECK (NOT enabled OR pin_hash IS NOT NULL)
);