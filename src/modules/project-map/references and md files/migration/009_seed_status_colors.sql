-- ====================================================
-- Migration 009: Seed Status Colors
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 009: Seed Status Colors';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Upsert colors for each status
-- ====================================================
DO $$
DECLARE
    v_old_color TEXT;
    v_new_color TEXT;
BEGIN
    RAISE NOTICE '[STEP 1/1] Upserting display colors for existing statuses...';

    -- Pre-Processing group
    v_new_color := '#6b7280';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'New Dealer Order';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'New Dealer Order';
    IF FOUND THEN
        RAISE NOTICE '• New Dealer Order: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• New Dealer Order: not found, skipping.';
    END IF;

    -- Processing group
    v_new_color := '#3b82f6';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Welcome Email / Call';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Welcome Email / Call';
    IF FOUND THEN
        RAISE NOTICE '• Welcome Email / Call: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Welcome Email / Call: not found, skipping.';
    END IF;

    -- Waiting group
    v_new_color := '#eab308';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Pending Permits';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Pending Permits';
    IF FOUND THEN
        RAISE NOTICE '• Pending Permits: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Pending Permits: not found, skipping.';
    END IF;

    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Pending Site Readiness';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Pending Site Readiness';
    IF FOUND THEN
        RAISE NOTICE '• Pending Site Readiness: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Pending Site Readiness: not found, skipping.';
    END IF;

    -- Scheduled group
    v_new_color := '#a855f7';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Ready for Install';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Ready for Install';
    IF FOUND THEN
        RAISE NOTICE '• Ready for Install: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Ready for Install: not found, skipping.';
    END IF;

    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Confirmed Install Date';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Confirmed Install Date';
    IF FOUND THEN
        RAISE NOTICE '• Confirmed Install Date: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Confirmed Install Date: not found, skipping.';
    END IF;

    -- Active group
    v_new_color := '#f97316';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Currently Being Installed';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Currently Being Installed';
    IF FOUND THEN
        RAISE NOTICE '• Currently Being Installed: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Currently Being Installed: not found, skipping.';
    END IF;

    -- Financial group
    v_new_color := '#f59e0b';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Pending Payment';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Pending Payment';
    IF FOUND THEN
        RAISE NOTICE '• Pending Payment: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Pending Payment: not found, skipping.';
    END IF;

    -- Installed group
    v_new_color := '#22c55e';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Fully Installed';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Fully Installed';
    IF FOUND THEN
        RAISE NOTICE '• Fully Installed: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Fully Installed: not found, skipping.';
    END IF;

    -- Issue group
    v_new_color := '#ef4444';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Repairs';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Repairs';
    IF FOUND THEN
        RAISE NOTICE '• Repairs: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Repairs: not found, skipping.';
    END IF;

    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Collections';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Collections';
    IF FOUND THEN
        RAISE NOTICE '• Collections: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Collections: not found, skipping.';
    END IF;

    -- Completed group
    v_new_color := '#15803d';
    SELECT display_color INTO v_old_color FROM public.proj_s_project_status WHERE status_name = 'Completed';
    UPDATE public.proj_s_project_status SET display_color = v_new_color WHERE status_name = 'Completed';
    IF FOUND THEN
        RAISE NOTICE '• Completed: display_color UPDATED (old: %, new: %)', v_old_color, v_new_color;
    ELSE
        RAISE NOTICE '• Completed: not found, skipping.';
    END IF;

    RAISE NOTICE '✔ Status colors synchronized.';
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '009' AS migration,
    'Seed Status Colors' AS name,
    0 AS tables_created,
    1 AS tables_updated,
    0 AS columns_added,
    0 AS columns_skipped,
    0 AS indexes_created,
    0 AS rows_inserted,
    12 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;