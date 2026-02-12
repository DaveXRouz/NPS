-- Migration 018: User settings (preferences persistence for auth users)
-- Key-value store per user for flexible settings storage

CREATE TABLE IF NOT EXISTS user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_settings_user_key UNIQUE (user_id, setting_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION user_settings_update_timestamp() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_settings_updated
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION user_settings_update_timestamp();

COMMENT ON TABLE user_settings IS 'Per-user key-value settings storage for auth users';
COMMENT ON COLUMN user_settings.setting_key IS 'Setting name: locale, theme, default_reading_type, timezone, numerology_system, auto_daily';
