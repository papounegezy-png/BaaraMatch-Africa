ALTER TABLE agency_placements ADD COLUMN IF NOT EXISTS agency_client_id varchar REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS agency_placements_agency_client_idx ON agency_placements (agency_client_id);
