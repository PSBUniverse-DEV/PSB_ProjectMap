-- ====================================================
-- Migration 002: Seed Project Statuses
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 002: Seed Project Statuses';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Upsert project statuses
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/1] Upserting project statuses...';

    -- Pre-Processing
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('New Dealer Order', 'Pre-Processing', 10)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• New Dealer Order: INSERTED or UPDATED';

    -- Processing
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Welcome Email / Call', 'Processing', 20)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Welcome Email / Call: INSERTED or UPDATED';

    -- Waiting
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Pending Permits', 'Waiting', 30)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Pending Permits: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Pending Site Readiness', 'Waiting', 40)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Pending Site Readiness: INSERTED or UPDATED';

    -- Scheduled
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Ready for Install', 'Scheduled', 50)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Ready for Install: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Confirmed Install Date', 'Scheduled', 60)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Confirmed Install Date: INSERTED or UPDATED';

    -- Active
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Currently Being Installed', 'Active', 70)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Currently Being Installed: INSERTED or UPDATED';

    -- Financial
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Pending Payment', 'Financial', 80)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Pending Payment: INSERTED or UPDATED';

    -- Installed
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Fully Installed', 'Installed', 90)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Fully Installed: INSERTED or UPDATED';

    -- Issue
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Repairs', 'Issue', 100)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Repairs: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Collections', 'Issue', 110)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Collections: INSERTED or UPDATED';

    -- Completed
    INSERT INTO public.proj_s_project_status (status_name, status_group, display_order)
    VALUES ('Completed', 'Completed', 120)
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_group   = EXCLUDED.status_group,
        display_order  = EXCLUDED.display_order,
        is_active      = true;
    RAISE NOTICE '• Completed: INSERTED or UPDATED';

    RAISE NOTICE '✔ Project statuses synchronized.';

END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '002' AS migration,
    'Seed Project Statuses' AS name,
    0 AS tables_created,
    0 AS tables_updated,
    0 AS columns_added,
    0 AS columns_skipped,
    0 AS indexes_created,
    12 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;