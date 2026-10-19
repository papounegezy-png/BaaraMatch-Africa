-- Taux de commission réglés par client (règle : shared/commissions.ts).
-- agency_client_id nul = tous les clients ; contract_type nul = tous les contrats.
ALTER TABLE commission_rate_settings
  ADD COLUMN IF NOT EXISTS agency_client_id varchar REFERENCES agency_clients(id) ON DELETE CASCADE;
ALTER TABLE commission_rate_settings ALTER COLUMN contract_type DROP NOT NULL;
CREATE INDEX IF NOT EXISTS commission_rate_settings_client_idx ON commission_rate_settings (agency_client_id);
