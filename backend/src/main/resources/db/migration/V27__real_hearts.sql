-- Real heart reactions for the wedding card and approved guest wishes.
ALTER TABLE wedding
  ADD COLUMN IF NOT EXISTS heart_count bigint NOT NULL DEFAULT 0 CHECK (heart_count >= 0);

ALTER TABLE wishes
  ADD COLUMN IF NOT EXISTS heart_count bigint NOT NULL DEFAULT 0 CHECK (heart_count >= 0);
