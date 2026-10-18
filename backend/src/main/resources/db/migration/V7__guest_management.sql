ALTER TABLE invitations ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE invitations ADD COLUMN internal_note varchar(1000) NOT NULL DEFAULT '';
CREATE INDEX invitations_management_idx ON invitations(archived,display_name);