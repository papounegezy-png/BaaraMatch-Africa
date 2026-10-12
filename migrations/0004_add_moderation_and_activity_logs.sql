CREATE TABLE IF NOT EXISTS moderation_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_user_id varchar REFERENCES users(id),
  target_label text NOT NULL,
  target_user_type text,
  reason text NOT NULL,
  reported_by text NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  resolved_by varchar REFERENCES users(id),
  resolved_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_items_status_idx ON moderation_items (status);
CREATE INDEX IF NOT EXISTS moderation_items_priority_idx ON moderation_items (priority);

CREATE TABLE IF NOT EXISTS activity_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id varchar REFERENCES users(id),
  user_label text NOT NULL,
  ip_address text,
  status text DEFAULT 'success',
  details text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs (created_at);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs (action);
