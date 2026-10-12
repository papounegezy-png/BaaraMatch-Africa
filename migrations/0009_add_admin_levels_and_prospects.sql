-- Admin permission levels + prospect organizations (accounts an admin
-- creates on behalf of a third party) + job-posting traceability.

alter table users add column if not exists admin_level text;
alter table users add column if not exists is_prospect boolean default false;
alter table users add column if not exists claim_token text;
alter table users add column if not exists claimed_at timestamp;
alter table users add column if not exists created_by_admin_id varchar references users(id);

alter table job_postings add column if not exists management_type text default 'self';
alter table job_postings add column if not exists created_by_admin_id varchar references users(id);

-- Bootstrap: existing admin accounts predate the level system — promote
-- them to super_admin rather than leaving them locked out of admin-only
-- screens (account management, prospect organizations).
update users set admin_level = 'super_admin' where user_type = 'admin' and admin_level is null;
