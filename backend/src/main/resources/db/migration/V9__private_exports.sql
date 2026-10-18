CREATE TABLE export_jobs (
    id uuid PRIMARY KEY,
    format varchar(12) NOT NULL CHECK(format IN ('CSV','PDF')),
    status varchar(20) NOT NULL CHECK(status IN ('READY','EXPIRED','REVOKED')),
    row_count integer NOT NULL CHECK(row_count BETWEEN 1 AND 300),
    page_count integer NOT NULL CHECK(page_count >= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
);
CREATE TABLE export_rows (
    job_id uuid NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
    row_number integer NOT NULL CHECK(row_number >= 1),
    invitation_id uuid NOT NULL,
    display_name varchar(200) NOT NULL,
    qr_url varchar(1000) NOT NULL,
    token_hash varchar(64) NOT NULL,
    event_summary varchar(1000) NOT NULL,
    PRIMARY KEY(job_id,row_number)
);
CREATE INDEX export_jobs_expiry_idx ON export_jobs(status,expires_at);