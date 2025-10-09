-- Migration 002: Ensure complete model compatibility
-- This migration ensures all columns in the model exist in the database

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all survey model columns exist
DO $$
BEGIN
    -- Check and add responses column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys' AND column_name = 'responses'
    ) THEN
        ALTER TABLE surveys ADD COLUMN responses JSONB;
        RAISE NOTICE 'Added responses column to surveys table';
    END IF;

    -- Check and add data column if missing (though it should be commented out in model)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys' AND column_name = 'data'
    ) THEN
        ALTER TABLE surveys ADD COLUMN data JSONB;
        RAISE NOTICE 'Added data column to surveys table';
    END IF;

    -- Check and add symptoms_data column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys' AND column_name = 'symptoms_data'
    ) THEN
        ALTER TABLE surveys ADD COLUMN symptoms_data JSONB;
        RAISE NOTICE 'Added symptoms_data column to surveys table';
    END IF;

    -- Check and add company_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE surveys ADD COLUMN company_id INTEGER;
        RAISE NOTICE 'Added company_id column to surveys table';
    END IF;

    -- Check and add process_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys' AND column_name = 'process_id'
    ) THEN
        ALTER TABLE surveys ADD COLUMN process_id INTEGER;
        RAISE NOTICE 'Added process_id column to surveys table';
    END IF;

    -- Check and add role_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE surveys ADD COLUMN role_id INTEGER;
        RAISE NOTICE 'Added role_id column to surveys table';
    END IF;
END $$;

-- Log migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('002_ensure_model_compatibility', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;