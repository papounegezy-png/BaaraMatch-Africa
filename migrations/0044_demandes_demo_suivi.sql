-- Console admin, demandes de démo : traitement d'une demande (date et
-- administrateur). null : à traiter.
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS treated_at timestamp;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS treated_by varchar;
