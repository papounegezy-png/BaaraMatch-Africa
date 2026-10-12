-- Candidate-choice interview scheduling: recruiter proposes several time
-- slots for one application, the candidate picks one (first click wins,
-- enforced by a conditional UPDATE, not just app-layer checks).
CREATE TABLE IF NOT EXISTS interview_slots (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id varchar NOT NULL REFERENCES applications(id),
  start_time timestamp NOT NULL,
  is_selected boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_slots_application_idx ON interview_slots (application_id);
