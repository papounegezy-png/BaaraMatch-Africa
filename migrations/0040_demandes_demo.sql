-- Demandes de démo de la page /services : e-mail OU téléphone, et type de
-- demandeur (entreprise / agence). Le message devient facultatif.
ALTER TABLE demo_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE demo_requests ALTER COLUMN message DROP NOT NULL;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS profile_type text;
