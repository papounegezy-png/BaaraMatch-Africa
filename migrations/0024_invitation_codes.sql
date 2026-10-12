ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS partner_trial_ends_at timestamp;
ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS rccm_number text;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS rccm_number text;

CREATE TABLE IF NOT EXISTS invitation_codes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  target_plan text NOT NULL,
  trial_days integer NOT NULL DEFAULT 90,
  is_used boolean DEFAULT false,
  organization_id varchar UNIQUE REFERENCES users(id),
  created_by_admin_id varchar NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now()
);
