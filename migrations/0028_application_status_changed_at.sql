ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_changed_at timestamp DEFAULT now();
UPDATE applications SET status_changed_at = COALESCE(updated_at, created_at, now()) WHERE status_changed_at IS NULL;
