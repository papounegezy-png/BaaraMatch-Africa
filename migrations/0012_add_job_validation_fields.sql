-- An admin-managed job needs no separate review — the admin who creates it
-- is the validator. Record that explicitly rather than only implying it via
-- managementType/createdByAdminId.

alter table job_postings add column if not exists validated_by_admin_id varchar references users(id);
alter table job_postings add column if not exists validated_at timestamp;

-- Backfill: existing admin-managed jobs were, in effect, validated by their
-- creator at creation time.
update job_postings
set validated_by_admin_id = created_by_admin_id, validated_at = created_at
where management_type = 'admin_managed' and validated_by_admin_id is null;
