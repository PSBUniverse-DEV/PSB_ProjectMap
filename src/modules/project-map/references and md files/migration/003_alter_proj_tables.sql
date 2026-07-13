-- ====================================================
-- Migration 003: Alter Project Map Tables
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 003: Alter Project Map Tables';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/4: Drop existing tables
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/4] Dropping existing tables...';

    DROP TABLE IF EXISTS public.proj_t_projects CASCADE;
    RAISE NOTICE '✔ Table "proj_t_projects" dropped.';

    DROP TABLE IF EXISTS public.proj_s_project_status CASCADE;
    RAISE NOTICE '✔ Table "proj_s_project_status" dropped.';

END $$;

-- ====================================================
-- STEP 2/4: Recreate project status setup table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 2/4] Creating table "proj_s_project_status"...';

    CREATE TABLE IF NOT EXISTS public.proj_s_project_status (
        status_id           SERIAL      PRIMARY KEY,
        status_name         TEXT        NOT NULL UNIQUE,
        status_description  TEXT,
        is_active           BOOLEAN     NOT NULL DEFAULT true,
        date_created        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_s_project_status" created.';
END $$;

-- ====================================================
-- STEP 3/4: Recreate projects transactional table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 3/4] Creating table "proj_t_projects"...';

    CREATE TABLE IF NOT EXISTS public.proj_t_projects (
        id                      SERIAL          PRIMARY KEY,
        client_name             TEXT            NOT NULL,
        formatted_address       TEXT,
        address_line_1          TEXT,
        city                    TEXT,
        state                   TEXT,
        state_code              TEXT,
        postal_code             TEXT,
        country                 TEXT,
        address_latitude        NUMERIC(10,7),
        address_longitude       NUMERIC(10,7),
        site_latitude           NUMERIC(10,7),
        site_longitude          NUMERIC(10,7),
        location_source         TEXT,
        location_confirmed      BOOLEAN         NOT NULL DEFAULT false,
        status_id               INTEGER         REFERENCES public.proj_s_project_status(status_id),
        dealer                  TEXT,
        order_received_date     DATE,
        scheduled_project_date  DATE,
        install_date            DATE,
        created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
        created_by              UUID,
        updated_by              UUID
    );

    RAISE NOTICE '✔ Table "proj_t_projects" created.';
END $$;

-- ====================================================
-- STEP 4/4: Create indexes
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 4/4] Creating indexes...';

    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_status_id
        ON public.proj_t_projects (status_id);

    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_client_name
        ON public.proj_t_projects (client_name);

    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_state_code
        ON public.proj_t_projects (state_code);

    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_dealer
        ON public.proj_t_projects (dealer);

    RAISE NOTICE '✔ Indexes created.';
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '003' AS migration,
    'Alter Project Map Tables' AS name,
    2 AS tables_created,
    0 AS tables_updated,
    1 AS columns_added,
    0 AS columns_skipped,
    4 AS indexes_created,
    0 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;