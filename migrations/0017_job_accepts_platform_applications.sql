-- Lets a poster hide "Postuler maintenant" on the job's detail page for
-- postings they don't want candidates applying to directly through the
-- platform (e.g. jobs where the poster screens applications elsewhere).
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS accepts_platform_applications boolean DEFAULT true;
