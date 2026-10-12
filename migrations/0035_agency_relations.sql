CREATE TABLE IF NOT EXISTS agency_interactions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  client_id varchar NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  contact_id varchar REFERENCES agency_client_contacts(id) ON DELETE SET NULL,
  type text NOT NULL,
  direction text,
  subject text NOT NULL,
  body text,
  outcome text,
  duration_minutes integer,
  occurred_at timestamp NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  email_to text,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agency_interactions_agency_idx ON agency_interactions (agency_id);
CREATE INDEX IF NOT EXISTS agency_interactions_client_idx ON agency_interactions (client_id);
CREATE INDEX IF NOT EXISTS agency_interactions_occurred_idx ON agency_interactions (occurred_at);

CREATE TABLE IF NOT EXISTS agency_reminders (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  client_id varchar REFERENCES agency_clients(id) ON DELETE CASCADE,
  contact_id varchar REFERENCES agency_client_contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  channel text,
  due_at timestamp NOT NULL,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'manual',
  rule_key text,
  related_url text,
  completed_at timestamp,
  created_at timestamp DEFAULT now(),
  CONSTRAINT agency_reminders_rule_unique UNIQUE (agency_id, rule_key)
);
CREATE INDEX IF NOT EXISTS agency_reminders_agency_idx ON agency_reminders (agency_id);

CREATE TABLE IF NOT EXISTS agency_crm_settings (
  agency_id varchar PRIMARY KEY REFERENCES users(id),
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agency_satisfaction_surveys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  client_id varchar NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  contact_id varchar REFERENCES agency_client_contacts(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  sent_to text NOT NULL,
  sent_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  responded_at timestamp,
  score integer,
  comment text
);
CREATE INDEX IF NOT EXISTS agency_satisfaction_agency_idx ON agency_satisfaction_surveys (agency_id);
