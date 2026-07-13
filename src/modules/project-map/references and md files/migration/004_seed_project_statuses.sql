-- ====================================================
-- Migration 004: Seed Project Statuses (Revised)
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 004: Seed Project Statuses (Revised)';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Upsert project statuses
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/1] Upserting project statuses...';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('New Dealer Order', 'Order received from dealer, awaiting processing')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• New Dealer Order: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Welcome Email / Call', 'Initial outreach to customer completed')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Welcome Email / Call: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Pending Permits', 'Awaiting permit approvals')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Pending Permits: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Pending Site Readiness', 'Site preparation not yet complete')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Pending Site Readiness: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Ready for Install', 'Project is ready for installation scheduling')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Ready for Install: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Confirmed Install Date', 'Installation date has been scheduled and confirmed')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Confirmed Install Date: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Currently Being Installed', 'Installation crew is actively working on site')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Currently Being Installed: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Pending Payment', 'Awaiting payment from customer')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Pending Payment: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Fully Installed', 'Installation completed in full')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Fully Installed: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Repairs', 'Project requires repair work')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Repairs: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Collections', 'Account turned over for collections')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Collections: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description)
    VALUES ('Completed', 'Project is fully completed and closed')
    ON CONFLICT (status_name)
    DO UPDATE SET
        status_description = EXCLUDED.status_description,
        is_active          = true;
    RAISE NOTICE '• Completed: INSERTED or UPDATED';

    RAISE NOTICE '✔ Project statuses synchronized.';

END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '004' AS migration,
    'Seed Project Statuses (Revised)' AS name,
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