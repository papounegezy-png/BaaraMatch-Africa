-- Extract admin-specific fields off the generic `users` table into a
-- dedicated admin_profiles table, matching the existing convention already
-- used for candidate/agency/company (candidate_profiles, agency_profiles,
-- company_profiles keep role-specific fields off `users` the same way).

create table if not exists admin_profiles (
  id varchar primary key default gen_random_uuid(),
  user_id varchar not null unique references users(id),
  admin_level text not null default 'moderateur',
  is_active boolean default true,
  created_by_admin_id varchar references users(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

insert into admin_profiles (user_id, admin_level, is_active, created_by_admin_id)
select id, coalesce(admin_level, 'moderateur'), coalesce(is_admin_active, true), created_by_admin_id
from users
where user_type = 'admin'
on conflict (user_id) do nothing;

-- created_by_admin_id on users now means "which admin created this prospect
-- organization" only — clear the admin-account-creation meaning it used to
-- also carry, now tracked on admin_profiles instead.
update users set created_by_admin_id = null where user_type = 'admin';

alter table users drop column if exists admin_level;
alter table users drop column if exists is_admin_active;
