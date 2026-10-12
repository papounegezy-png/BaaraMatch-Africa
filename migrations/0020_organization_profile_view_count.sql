-- Feeds the admin "Top organisations visitées" statistic — incremented by
-- POST /api/companies/:id/view and POST /api/agencies/:id/view, fired from
-- the public profile pages on mount (excluding the owner's own views).
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS profile_view_count integer DEFAULT 0;
ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS profile_view_count integer DEFAULT 0;
