-- Rollback migration 015: feedback_learning
DROP TRIGGER IF EXISTS oracle_learning_updated_at ON oracle_learning_data;
DROP TRIGGER IF EXISTS oracle_feedback_updated_at ON oracle_reading_feedback;
DROP TABLE IF EXISTS oracle_learning_data;
DROP TABLE IF EXISTS oracle_reading_feedback;
DELETE FROM schema_migrations WHERE version = '015';
