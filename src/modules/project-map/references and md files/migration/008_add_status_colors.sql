-- ====================================================
-- Migration 008: Add Display Color and Order to Statuses
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 008: Add Display Color and Order to Statuses';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/2: Add display_color column
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/2] Adding column "display_color" to "proj_s_project_status"...';

    ALTER TABLE public.proj_s_project_status
        ADD COLUMN IF NOT EXISTS display_color TEXT;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'proj_s_project_status'
          AND column_name  = 'display_color'
    ) THEN
        RAISE NOTICE '✔ Column "display_color" added or already exists.';
    ELSE
        RAISE NOTICE '⚠ Column "display_color" was not found after attempt.';
    END IF;
END $$;

-- ====================================================
-- STEP 2/2: Add display_order column
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 2/2] Adding column "display_order" to "proj_s_project_status"...';

    ALTER TABLE public.proj_s_project_status
        ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'proj_s_project_status'
          AND column_name  = 'display_order'
    ) THEN
        RAISE NOTICE '✔ Column "display_order" added or already exists.';
    ELSE
        RAISE NOTICE '⚠ Column "display_order" was not found after attempt.';
    END IF;
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '008' AS migration,
    'Add Display Color and Order to Statuses' AS name,
    0 AS tables_created,
    1 AS tables_updated,
    2 AS columns_added,
    0 AS columns_skipped,
    0 AS indexes_created,
    0 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;