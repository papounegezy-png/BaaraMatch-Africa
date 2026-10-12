ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at timestamp;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_to text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_at timestamp;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

-- A salary is paid once per placement and period: duplicates double-count
-- payroll in "États de paiement" and the accounting export.
CREATE UNIQUE INDEX IF NOT EXISTS salary_payments_placement_period_unique ON salary_payments (placement_id, period);
