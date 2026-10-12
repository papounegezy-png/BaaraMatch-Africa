ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS resume_file_name text,
  ADD COLUMN IF NOT EXISTS resume_mime_type text,
  ADD COLUMN IF NOT EXISTS education_entries jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experiences jsonb DEFAULT '[]'::jsonb;
