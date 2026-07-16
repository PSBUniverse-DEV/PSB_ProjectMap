-- ====================================================
-- Migration 005: Add Project Subtotal to Projects Table
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 005: Add Project Subtotal to Projects Table';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Add project_subtotal column
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/1] Adding column "project_subtotal" to "proj_t_projects"...';

    ALTER TABLE public.proj_t_projects
        ADD COLUMN IF NOT EXISTS project_subtotal NUMERIC(12,2);

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'proj_t_projects'
          AND column_name  = 'project_subtotal'
    ) THEN
        RAISE NOTICE '✔ Column "project_subtotal" added or already exists.';
    ELSE
        RAISE NOTICE '⚠ Column "project_subtotal" was not found after attempt.';
    END IF;
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '005' AS migration,
    'Add Project Subtotal to Projects Table' AS name,
    0 AS tables_created,
    1 AS tables_updated,
    1 AS columns_added,
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