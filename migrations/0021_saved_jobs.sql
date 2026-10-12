-- Backs the "Heart" save button on job-detail.tsx / jobs.tsx — was
-- previously decorative (no onClick at all).
CREATE TABLE IF NOT EXISTS saved_jobs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id varchar NOT NULL REFERENCES users(id),
  job_id varchar NOT NULL REFERENCES job_postings(id),
  created_at timestamp DEFAULT now(),
  CONSTRAINT saved_jobs_candidate_job_unique UNIQUE (candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS saved_jobs_candidate_idx ON saved_jobs (candidate_id);
