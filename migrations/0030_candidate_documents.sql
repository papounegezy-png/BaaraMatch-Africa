CREATE TABLE IF NOT EXISTS candidate_documents (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  candidate_id varchar NOT NULL REFERENCES users(id),
  type text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  expires_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_documents_agency_idx ON candidate_documents (agency_id);
CREATE INDEX IF NOT EXISTS candidate_documents_candidate_idx ON candidate_documents (candidate_id);
