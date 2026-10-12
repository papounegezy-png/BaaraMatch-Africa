-- Rename the "admin" level to "gestionnaire_comptes" to match the actual
-- intended semantics (manages third-party organizations/jobs), add an
-- active/inactive toggle for admin accounts, and capture prospect contact
-- info gathered before the account exists.

update users set admin_level = 'gestionnaire_comptes' where admin_level = 'admin';

alter table users add column if not exists is_admin_active boolean default true;
alter table users add column if not exists prospect_contact_name text;
alter table users add column if not exists prospect_contact_phone text;
