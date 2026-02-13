-- Rollback migration 013: Drop oracle_share_links table

DROP INDEX IF EXISTS idx_share_links_reading_id;
DROP INDEX IF EXISTS idx_share_links_token;
DROP TABLE IF EXISTS oracle_share_links;
