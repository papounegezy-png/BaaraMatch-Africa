-- Generic metric journal: one row per (day, free-form key, organization),
-- so a new metric only ever means changing the aggregation job, never a
-- migration. organization_id is null for platform-wide totals.
CREATE TABLE IF NOT EXISTS daily_metrics (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamp NOT NULL,
  key text NOT NULL,
  value real NOT NULL,
  organization_id varchar REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  CONSTRAINT daily_metrics_date_key_org_unique UNIQUE (date, key, organization_id)
);
CREATE INDEX IF NOT EXISTS daily_metrics_key_date_idx ON daily_metrics (key, date);

-- Async-shaped from day one: the frontend polls status/downloads once
-- termine, even though generation currently runs in-process via setImmediate
-- rather than a real queue. Swapping in a real queue later changes nothing
-- on the frontend side.
CREATE TABLE IF NOT EXISTS report_exports (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  parameters jsonb NOT NULL,
  status text NOT NULL DEFAULT 'en_attente',
  requested_by_admin_id varchar NOT NULL REFERENCES admin_profiles(id),
  file_url text,
  error text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_exports_requested_by_status_idx ON report_exports (requested_by_admin_id, status);
