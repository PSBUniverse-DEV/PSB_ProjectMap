-- ====================================================
-- Migration 006: Create Origin Addresses Setup Table
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 006: Create Origin Addresses Setup Table';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/1: Create origin addresses setup table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/1] Creating table "proj_s_origin_addresses"...';

    CREATE TABLE IF NOT EXISTS public.proj_s_origin_addresses (
        id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        origin_name         TEXT            NOT NULL UNIQUE,
        origin_code         TEXT,
        formatted_address   TEXT,
        address_line_1      TEXT,
        city                TEXT,
        state               TEXT,
        state_code          TEXT,
        postal_code         TEXT,
        country             TEXT,
        latitude            NUMERIC(10,7),
        longitude           NUMERIC(10,7),
        is_default          BOOLEAN         NOT NULL DEFAULT false,
        is_active           BOOLEAN         NOT NULL DEFAULT true,
        created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_s_origin_addresses" created or already exists.';

    -- Verify the table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'proj_s_origin_addresses'
    ) THEN
        RAISE NOTICE '✔ Table "proj_s_origin_addresses" confirmed.';
    ELSE
        RAISE NOTICE '⚠ Table "proj_s_origin_addresses" was not found after creation.';
    END IF;
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '006' AS migration,
    'Create Origin Addresses Setup Table' AS name,
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