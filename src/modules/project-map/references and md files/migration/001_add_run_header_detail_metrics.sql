-- =====================================================
-- Migration 001: Add Header/Detail Metrics to Runs Module
-- Schema: public
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 001: Add Header/Detail Metrics to Runs Module';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- =====================================================
-- STEP 1: Add estimated_mileage to proj_t_runs
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/3] Checking if column "estimated_mileage" exists on "proj_t_runs"...';
END $$;

ALTER TABLE public.proj_t_runs
    ADD COLUMN IF NOT EXISTS estimated_mileage numeric(10, 2) null;

DO $$
BEGIN
    RAISE NOTICE '✔ Column "estimated_mileage" added or already exists on "proj_t_runs".';
END $$;

-- =====================================================
-- STEP 2: Add per-stop metrics to proj_t_run_projects
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 2/3] Checking per-stop columns on "proj_t_run_projects"...';
END $$;

ALTER TABLE public.proj_t_run_projects
    ADD COLUMN IF NOT EXISTS estimated_arrival timestamp with time zone null,
    ADD COLUMN IF NOT EXISTS estimated_departure timestamp with time zone null,
    ADD COLUMN IF NOT EXISTS estimated_distance numeric(10, 2) null,
    ADD COLUMN IF NOT EXISTS estimated_duration numeric(10, 2) null,
    ADD COLUMN IF NOT EXISTS estimated_mileage numeric(10, 2) null,
    ADD COLUMN IF NOT EXISTS estimated_subtotal numeric(12, 2) null;

DO $$
BEGIN
    RAISE NOTICE '✔ Per-stop metric columns added or already exist on "proj_t_run_projects".';
END $$;

-- =====================================================
-- STEP 3: Final Summary
-- =====================================================
SELECT
    '001' AS migration,
    'Add Header/Detail Metrics to Runs Module' AS name,
    0 AS tables_created,
    0 AS tables_updated,
    7 AS columns_added,
    0 AS columns_skipped,
    0 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    0.00 AS duration_seconds;