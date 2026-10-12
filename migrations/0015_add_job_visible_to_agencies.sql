ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS visible_to_agencies boolean DEFAULT true;
