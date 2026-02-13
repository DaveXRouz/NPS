-- Migration 013: Create oracle_share_links table for reading sharing
-- Session 32 — Export & Share

CREATE TABLE IF NOT EXISTS oracle_share_links (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(32) UNIQUE NOT NULL,
    reading_id BIGINT NOT NULL REFERENCES oracle_readings(id) ON DELETE CASCADE,
    created_by_user_id VARCHAR(255),
    expires_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON oracle_share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_reading_id ON oracle_share_links(reading_id);
