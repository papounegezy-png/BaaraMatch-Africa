-- Opt-in : l'employeur accepte d'apparaître sur l'accueil
-- (« Entreprises qui recrutent en ce moment »). Faux par défaut.
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS visible_accueil boolean NOT NULL DEFAULT false;
ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS visible_accueil boolean NOT NULL DEFAULT false;
