-- Agencies can contract with and invoice clients that are NOT registered on
-- BaaraMatch: the agency's CRM fiche (agency_clients) becomes the client of
-- record for placements and invoices; the registered company account is
-- optional.

ALTER TABLE agency_placements ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS agency_client_id varchar REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS invoices_agency_client_idx ON invoices (agency_client_id);

-- Backfill: every (agency, registered company) pair already used by a
-- placement or an invoice gets a fiche…
INSERT INTO agency_clients (agency_id, company_user_id, name, sector, city, country, status)
SELECT DISTINCT ON (pairs.agency_id, pairs.company_id)
  pairs.agency_id, pairs.company_id, COALESCE(cp.company_name, u.full_name), cp.industry, u.city, u.country, 'active'
FROM (
  SELECT agency_id, company_id FROM agency_placements WHERE company_id IS NOT NULL AND agency_client_id IS NULL
  UNION
  SELECT agency_id, client_id FROM invoices WHERE client_id IS NOT NULL AND agency_client_id IS NULL
) AS pairs
JOIN users u ON u.id = pairs.company_id
LEFT JOIN company_profiles cp ON cp.user_id = u.id
ON CONFLICT (agency_id, company_user_id) DO NOTHING;

-- …and existing rows are pinned to it.
UPDATE agency_placements p SET agency_client_id = c.id
FROM agency_clients c
WHERE p.agency_client_id IS NULL AND c.agency_id = p.agency_id AND c.company_user_id = p.company_id;

UPDATE invoices i SET agency_client_id = c.id
FROM agency_clients c
WHERE i.agency_client_id IS NULL AND c.agency_id = i.agency_id AND c.company_user_id = i.client_id;

-- Every placement / invoice must name a client one way or the other.
ALTER TABLE agency_placements DROP CONSTRAINT IF EXISTS agency_placements_client_required;
ALTER TABLE agency_placements ADD CONSTRAINT agency_placements_client_required
  CHECK (company_id IS NOT NULL OR agency_client_id IS NOT NULL);
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_required;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_required
  CHECK (client_id IS NOT NULL OR agency_client_id IS NOT NULL);
