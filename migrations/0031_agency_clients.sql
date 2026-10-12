CREATE TABLE IF NOT EXISTS agency_clients (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  company_user_id varchar REFERENCES users(id),
  name text NOT NULL,
  sector text,
  city text,
  country text,
  address text,
  website text,
  registration_number text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT agency_clients_agency_company_unique UNIQUE (agency_id, company_user_id)
);
CREATE INDEX IF NOT EXISTS agency_clients_agency_idx ON agency_clients (agency_id);

CREATE TABLE IF NOT EXISTS agency_client_contacts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  client_id varchar NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  job_title text,
  email text,
  phone text,
  whatsapp text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  last_contact_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agency_client_contacts_agency_idx ON agency_client_contacts (agency_id);
CREATE INDEX IF NOT EXISTS agency_client_contacts_client_idx ON agency_client_contacts (client_id);

CREATE TABLE IF NOT EXISTS agency_client_needs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  client_id varchar NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  contact_id varchar REFERENCES agency_client_contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  positions integer NOT NULL DEFAULT 1,
  contract_type text,
  location text,
  desired_start_date timestamp,
  salary_min integer,
  salary_max integer,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'new',
  description text,
  job_id varchar REFERENCES job_postings(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agency_client_needs_agency_idx ON agency_client_needs (agency_id);
CREATE INDEX IF NOT EXISTS agency_client_needs_client_idx ON agency_client_needs (client_id);

CREATE TABLE IF NOT EXISTS agency_client_agreements (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id varchar NOT NULL REFERENCES users(id),
  client_id varchar NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  reference text,
  status text NOT NULL DEFAULT 'draft',
  start_date timestamp,
  end_date timestamp,
  commission_rate real,
  payment_terms_days integer,
  notes text,
  file_url text,
  file_name text,
  file_mime_type text,
  file_size_bytes integer,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agency_client_agreements_agency_idx ON agency_client_agreements (agency_id);
CREATE INDEX IF NOT EXISTS agency_client_agreements_client_idx ON agency_client_agreements (client_id);

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS agency_client_id varchar REFERENCES agency_clients(id) ON DELETE SET NULL;
