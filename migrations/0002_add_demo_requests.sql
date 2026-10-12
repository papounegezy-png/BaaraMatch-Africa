CREATE TABLE IF NOT EXISTS demo_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  message text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_requests_email_idx ON demo_requests (email);
CREATE INDEX IF NOT EXISTS demo_requests_created_at_idx ON demo_requests (created_at);