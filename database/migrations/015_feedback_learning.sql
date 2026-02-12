-- Migration 015: Oracle reading feedback + learning data tables
-- Session 18 — AI Learning & Feedback Loop

-- oracle_reading_feedback: stores user feedback on readings
CREATE TABLE IF NOT EXISTS oracle_reading_feedback (
    id BIGSERIAL PRIMARY KEY,
    reading_id BIGINT NOT NULL REFERENCES oracle_readings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES oracle_users(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    section_feedback JSONB DEFAULT '{}',
    -- section_feedback schema: {"simple": "helpful"|"not_helpful", "advice": "helpful"|"not_helpful", ...}
    text_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oracle_feedback_unique UNIQUE (reading_id, user_id),
    CONSTRAINT oracle_feedback_text_length CHECK (LENGTH(text_feedback) <= 1000)
);

-- oracle_learning_data: aggregated learning metrics for oracle feedback
CREATE TABLE IF NOT EXISTS oracle_learning_data (
    id BIGSERIAL PRIMARY KEY,
    metric_key VARCHAR(100) NOT NULL UNIQUE,
    -- metric_key examples: "avg_rating:time", "avg_rating:name", "section_score:advice", "emphasis:moon_phase"
    metric_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    sample_count INTEGER NOT NULL DEFAULT 0,
    details JSONB DEFAULT '{}',
    prompt_emphasis TEXT,
    -- prompt_emphasis: text to prepend to AI prompt based on learning (NULL = no adjustment)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oracle_feedback_reading ON oracle_reading_feedback(reading_id);
CREATE INDEX IF NOT EXISTS idx_oracle_feedback_user ON oracle_reading_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_oracle_feedback_rating ON oracle_reading_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_oracle_feedback_created ON oracle_reading_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_learning_key ON oracle_learning_data(metric_key);

-- Comments
COMMENT ON TABLE oracle_reading_feedback IS 'User feedback on oracle readings: star rating, section-level thumbs, and text';
COMMENT ON TABLE oracle_learning_data IS 'Aggregated learning metrics for prompt optimization based on feedback';
COMMENT ON COLUMN oracle_reading_feedback.section_feedback IS 'JSONB: {section_name: "helpful"|"not_helpful"} for each interpretation section';
COMMENT ON COLUMN oracle_learning_data.prompt_emphasis IS 'Text prepended to AI system prompt based on learned preferences';

-- Trigger for updated_at
CREATE TRIGGER oracle_feedback_updated_at
    BEFORE UPDATE ON oracle_reading_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER oracle_learning_updated_at
    BEFORE UPDATE ON oracle_learning_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Track migration
INSERT INTO schema_migrations (version, name) VALUES ('015', 'feedback_learning');
