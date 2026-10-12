-- Postgres unique constraints don't treat two NULLs as equal, so the plain
-- (date, key, organization_id) constraint from 0018 never actually catches
-- duplicate platform-wide rows (organization_id IS NULL) on a rerun — a
-- partial unique index is the standard fix for "unique, including NULL".
CREATE UNIQUE INDEX IF NOT EXISTS daily_metrics_date_key_global_unique
  ON daily_metrics (date, key)
  WHERE organization_id IS NULL;
