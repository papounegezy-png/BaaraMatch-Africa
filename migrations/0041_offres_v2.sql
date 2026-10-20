-- Page Offres v2.
-- Période du salaire affiché (« 250 000 FCFA / mois ») ; null : non précisée.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_period text;
DO $$ BEGIN
  ALTER TABLE job_postings ADD CONSTRAINT job_postings_salary_period_check
    CHECK (salary_period IN ('mois', 'jour', 'mission'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vérification des employeurs par l'équipe BaaraMatch (action admin) :
-- date et auteur. null : non vérifié. Seule source du badge « vérifié ».
ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS verified_at timestamp;
ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS verified_by varchar;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS verified_at timestamp;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS verified_by varchar;
