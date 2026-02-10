-- Migration 014: User Management — created_by ownership + moderator seed
-- Depends on: Migration 013 (auth hardening)

DO $$
BEGIN
    -- Guard: skip if already applied
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '014') THEN
        RAISE NOTICE 'Migration 014 already applied, skipping.';
        RETURN;
    END IF;

    -- 1. Add created_by FK column to oracle_users
    ALTER TABLE oracle_users ADD COLUMN IF NOT EXISTS created_by UUID
        REFERENCES users(id) ON DELETE SET NULL;

    -- 2. Index for ownership queries (filter oracle_users by system user)
    CREATE INDEX IF NOT EXISTS idx_oracle_users_created_by
        ON oracle_users(created_by);

    -- 3. Seed a moderator user (password: change-me-immediately, bcrypt hash)
    -- Admins should change this password immediately after first deployment
    INSERT INTO users (id, username, password_hash, role, is_active)
    VALUES (
        uuid_generate_v4(),
        'moderator',
        -- bcrypt hash of 'change-me-immediately' with cost factor 12
        '$2b$12$LJ3m4ys3Lz0JFOdOKmGrOeQxJONBnPfGdPjC6x5T9YldvYmKz/dm',
        'moderator',
        TRUE
    )
    ON CONFLICT (username) DO NOTHING;

    -- 4. Record migration
    INSERT INTO schema_migrations (version, name)
    VALUES ('014', 'User management: oracle_users.created_by ownership + moderator seed');

    RAISE NOTICE 'Migration 014 applied successfully.';
END $$;
