-- Migration 016: Daily readings cache table
-- Session 16 — daily reading lookup/cache layer

BEGIN;

CREATE TABLE IF NOT EXISTS oracle_daily_readings (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES oracle_users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    reading_id BIGINT NOT NULL REFERENCES oracle_readings(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_user_date UNIQUE (user_id, reading_date)
);

COMMENT ON TABLE oracle_daily_readings IS 'Cache/lookup: maps (user_id, date) → oracle_readings.id for daily readings';
COMMENT ON COLUMN oracle_daily_readings.reading_date IS 'Calendar date (no time) — one reading per user per day';
COMMENT ON CONSTRAINT uq_daily_user_date ON oracle_daily_readings IS 'Ensures at most one daily reading per user per day';

CREATE INDEX IF NOT EXISTS idx_daily_readings_user_date ON oracle_daily_readings(user_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_readings_reading_id ON oracle_daily_readings(reading_id);

INSERT INTO schema_migrations (version, name) VALUES ('016', 'daily_readings_cache')
ON CONFLICT DO NOTHING;

COMMIT;
