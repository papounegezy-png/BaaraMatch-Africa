-- Adds a generic target reference to activity_logs so an audit entry can
-- record "which record was accessed", not just who did what. Used first by
-- the admin candidate-profile-view audit trail (GET /api/admin/candidates/:id).
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS target_id varchar;

CREATE INDEX IF NOT EXISTS activity_logs_target_idx ON activity_logs (target_type, target_id);
