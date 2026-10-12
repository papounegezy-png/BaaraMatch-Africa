ALTER TABLE agency_profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS subscription_updated_at timestamp;
