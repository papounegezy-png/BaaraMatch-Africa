-- Align management_type values with the GestionOffre enum vocabulary
-- (AUTONOME / GEREE_PAR_BAARAMATCH) exactly, same as the earlier
-- admin_level -> gestionnaire_comptes rename.

update job_postings set management_type = 'autonome' where management_type = 'self';
update job_postings set management_type = 'geree_par_baaramatch' where management_type = 'admin_managed';

alter table job_postings alter column management_type set default 'autonome';
