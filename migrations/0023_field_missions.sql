CREATE TABLE IF NOT EXISTS field_missions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  candidate_id varchar NOT NULL REFERENCES users(id),
  client_name text NOT NULL,
  job_title text NOT NULL,
  location text NOT NULL,
  start_date timestamp NOT NULL,
  planned_end_date timestamp NOT NULL,
  actual_end_date timestamp,
  daily_rate_fcfa integer NOT NULL,
  status text DEFAULT 'planned',
  dispute_reason text,
  client_rating integer,
  client_feedback text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS field_missions_agency_idx ON field_missions(agency_id);
CREATE INDEX IF NOT EXISTS field_missions_candidate_idx ON field_missions(candidate_id);
CREATE INDEX IF NOT EXISTS field_missions_status_idx ON field_missions(status);
