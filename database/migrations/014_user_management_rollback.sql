-- Rollback Migration 014: User Management

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '014') THEN
        RAISE NOTICE 'Migration 014 not applied, nothing to rollback.';
        RETURN;
    END IF;

    -- Drop ownership index
    DROP INDEX IF EXISTS idx_oracle_users_created_by;

    -- Remove created_by column
    ALTER TABLE oracle_users DROP COLUMN IF EXISTS created_by;

    -- Remove moderator seed user (only if it was our seed)
    DELETE FROM users WHERE username = 'moderator' AND role = 'moderator';

    -- Remove migration record
    DELETE FROM schema_migrations WHERE version = '014';

    RAISE NOTICE 'Migration 014 rolled back successfully.';
END $$;
