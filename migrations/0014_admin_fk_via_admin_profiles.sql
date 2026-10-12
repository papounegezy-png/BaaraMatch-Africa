-- Route "which admin" FKs through admin_profiles.id instead of users.id
-- directly, matching Organisation.creeParAdmin / Offre.creeParAdmin ->
-- AdminProfil (references: [id] on AdminProfil) in the original design.
-- This also gives a real DB-level guarantee that only an actual admin
-- account (one with an admin_profiles row) can be recorded as a
-- creator/validator, not just any user id.
--
-- admin_profiles.created_by_admin_id (which super_admin created this admin
-- account) is deliberately left pointing at users.id — the source design's
-- AdminProfil.creePar has no @relation at all, unlike these two fields.

alter table users drop constraint if exists users_created_by_admin_id_fkey;
alter table job_postings drop constraint if exists job_postings_created_by_admin_id_fkey;
alter table job_postings drop constraint if exists job_postings_validated_by_admin_id_fkey;

update users set created_by_admin_id = (
  select ap.id from admin_profiles ap where ap.user_id = users.created_by_admin_id
)
where created_by_admin_id is not null;

update job_postings set created_by_admin_id = (
  select ap.id from admin_profiles ap where ap.user_id = job_postings.created_by_admin_id
)
where created_by_admin_id is not null;

update job_postings set validated_by_admin_id = (
  select ap.id from admin_profiles ap where ap.user_id = job_postings.validated_by_admin_id
)
where validated_by_admin_id is not null;

alter table users
  add constraint users_created_by_admin_id_admin_profiles_id_fkey
  foreign key (created_by_admin_id) references admin_profiles(id);

alter table job_postings
  add constraint job_postings_created_by_admin_id_admin_profiles_id_fkey
  foreign key (created_by_admin_id) references admin_profiles(id);

alter table job_postings
  add constraint job_postings_validated_by_admin_id_admin_profiles_id_fkey
  foreign key (validated_by_admin_id) references admin_profiles(id);
