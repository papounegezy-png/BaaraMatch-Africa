-- Adds the specific record a moderation item is about (e.g. a job_postings.id),
-- distinct from target_user_id (who posted it). Needed so approving/rejecting
-- a queue item can act on the real record, not just the queue row itself.
ALTER TABLE moderation_items ADD COLUMN IF NOT EXISTS target_entity_id varchar;
