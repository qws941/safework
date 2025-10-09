-- Migration 001: Add submission_date column to surveys table
-- This migration ensures the submission_date column exists

-- Check if column already exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'surveys'
        AND column_name = 'submission_date'
    ) THEN
        ALTER TABLE surveys ADD COLUMN submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added submission_date column to surveys table';
    ELSE
        RAISE NOTICE 'submission_date column already exists in surveys table';
    END IF;
END $$;

-- Update existing records without submission_date
UPDATE surveys
SET submission_date = created_at
WHERE submission_date IS NULL;

-- Log migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('001_add_submission_date', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;