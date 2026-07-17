-- ====================================================
-- Migration 011: Create Run Projects Table
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 011: Create Run Projects Table';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Create run projects junction table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/1] Creating table "proj_t_run_projects"...';

    CREATE TABLE IF NOT EXISTS public.proj_t_run_projects (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id          UUID        NOT NULL REFERENCES public.proj_t_runs(id) ON DELETE CASCADE,
        project_id      INTEGER     NOT NULL REFERENCES public.proj_t_projects(id),
        stop_sequence   INTEGER     NOT NULL DEFAULT 0,
        notes           TEXT,
        CONSTRAINT proj_t_run_projects_run_project_unique UNIQUE (run_id, project_id)
    );

    RAISE NOTICE '✔ Table "proj_t_run_projects" created or already exists.';

    CREATE INDEX IF NOT EXISTS idx_proj_t_run_projects_run_id
        ON public.proj_t_run_projects (run_id);

    CREATE INDEX IF NOT EXISTS idx_proj_t_run_projects_project_id
        ON public.proj_t_run_projects (project_id);

    RAISE NOTICE '✔ Indexes created or already exist.';
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '011' AS migration,
    'Create Run Projects Table' AS name,
    1 AS tables_created,
    0 AS tables_updated,
    0 AS columns_added,
    0 AS columns_skipped,
    2 AS indexes_created,
    0 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;