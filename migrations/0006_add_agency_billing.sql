CREATE TABLE IF NOT EXISTS invoices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  invoice_number text NOT NULL,
  client_id varchar NOT NULL REFERENCES users(id),
  client_type text NOT NULL,
  issue_date timestamp NOT NULL,
  due_date timestamp NOT NULL,
  subtotal integer NOT NULL,
  tax_rate real NOT NULL DEFAULT 18,
  tax_amount integer NOT NULL,
  total_amount integer NOT NULL,
  currency text DEFAULT 'XOF',
  status text NOT NULL DEFAULT 'draft',
  payment_method text,
  paid_date timestamp,
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_agency_idx ON invoices (agency_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id varchar NOT NULL REFERENCES invoices(id),
  placement_id varchar REFERENCES agency_placements(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  total integer NOT NULL
);
CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_idx ON invoice_line_items (invoice_id);

CREATE TABLE IF NOT EXISTS commission_rate_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  contract_type text NOT NULL,
  rate real NOT NULL,
  min_amount integer,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commission_rate_settings_agency_idx ON commission_rate_settings (agency_id);

CREATE TABLE IF NOT EXISTS payment_method_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  name text NOT NULL,
  type text NOT NULL,
  account_info text NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_method_settings_agency_idx ON payment_method_settings (agency_id);

CREATE TABLE IF NOT EXISTS agency_financial_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL UNIQUE REFERENCES users(id),
  currency text DEFAULT 'XOF',
  invoice_prefix text DEFAULT 'FAC',
  invoice_next_number integer DEFAULT 1,
  default_payment_terms integer DEFAULT 30,
  vat_rate real DEFAULT 18,
  auto_invoice boolean DEFAULT false,
  reminder_enabled boolean DEFAULT true,
  reminder_days integer DEFAULT 7,
  bank_name text,
  account_name text,
  iban text,
  bic text,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  placement_id varchar NOT NULL REFERENCES agency_placements(id),
  period text NOT NULL,
  base_salary integer NOT NULL,
  bonus integer DEFAULT 0,
  deductions integer DEFAULT 0,
  net_salary integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_date timestamp,
  payment_method text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS salary_payments_agency_idx ON salary_payments (agency_id);
CREATE INDEX IF NOT EXISTS salary_payments_placement_idx ON salary_payments (placement_id);
