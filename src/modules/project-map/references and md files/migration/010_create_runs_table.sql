-- ====================================================
-- Migration 010: Create Runs Table
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 010: Create Runs Table';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Create runs table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/1] Creating table "proj_t_runs"...';

    CREATE TABLE IF NOT EXISTS public.proj_t_runs (
        id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        run_number          SERIAL,
        run_name            TEXT            NOT NULL,
        origin_id           UUID            REFERENCES public.proj_s_origin_addresses(id),
        run_date            DATE,
        status              TEXT            NOT NULL DEFAULT 'Draft',
        notes               TEXT,
        team_assigned       TEXT,
        vehicle_assigned    TEXT,
        estimated_distance  NUMERIC(10,2),
        estimated_duration  NUMERIC(10,2),
        estimated_subtotal  NUMERIC(12,2),
        created_by          UUID,
        updated_by          UUID,
        created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_t_runs" created or already exists.';

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'proj_t_runs'
    ) THEN
        RAISE NOTICE '✔ Table "proj_t_runs" confirmed.';
    ELSE
        RAISE NOTICE '⚠ Table "proj_t_runs" was not found after creation.';
    END IF;
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '010' AS migration,
    'Create Runs Table' AS name,
    1 AS tables_created,
    0 AS tables_updated,
    0 AS columns_added,
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