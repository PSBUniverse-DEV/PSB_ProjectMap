-- ====================================================
-- Migration 007: Create States Setup Table
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 007: Create States Setup Table';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/2: Create states setup table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/2] Creating table "proj_s_states"...';

    CREATE TABLE IF NOT EXISTS public.proj_s_states (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        state_name      TEXT        NOT NULL UNIQUE,
        state_code      TEXT        NOT NULL UNIQUE,
        display_color   TEXT        NOT NULL,
        display_order   INTEGER     NOT NULL DEFAULT 0,
        is_active       BOOLEAN     NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_s_states" created or already exists.';

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'proj_s_states'
    ) THEN
        RAISE NOTICE '✔ Table "proj_s_states" confirmed.';
    ELSE
        RAISE NOTICE '⚠ Table "proj_s_states" was not found after creation.';
    END IF;
END $$;

-- ====================================================
-- STEP 2/2: Seed initial states
-- ====================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '[STEP 2/2] Seeding initial states...';

    -- Alabama
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Alabama', 'AL', '#E53935', 10)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Alabama (AL): INSERTED or UPDATED';

    -- Alaska
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Alaska', 'AK', '#D43F8D', 20)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Alaska (AK): INSERTED or UPDATED';

    -- Arizona
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Arizona', 'AZ', '#FDD835', 30)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Arizona (AZ): INSERTED or UPDATED';

    -- Arkansas
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Arkansas', 'AR', '#7CB342', 40)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Arkansas (AR): INSERTED or UPDATED';

    -- California
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('California', 'CA', '#1E88E5', 50)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• California (CA): INSERTED or UPDATED';

    -- Colorado
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Colorado', 'CO', '#8E24AA', 60)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Colorado (CO): INSERTED or UPDATED';

    -- Connecticut
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Connecticut', 'CT', '#00ACC1', 70)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Connecticut (CT): INSERTED or UPDATED';

    -- Delaware
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Delaware', 'DE', '#3949AB', 80)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Delaware (DE): INSERTED or UPDATED';

    -- Florida
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Florida', 'FL', '#F44336', 90)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Florida (FL): INSERTED or UPDATED';

    -- Georgia
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Georgia', 'GA', '#FF7043', 100)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Georgia (GA): INSERTED or UPDATED';

    -- Hawaii
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Hawaii', 'HI', '#AB47BC', 110)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Hawaii (HI): INSERTED or UPDATED';

    -- Idaho
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Idaho', 'ID', '#66BB6A', 120)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Idaho (ID): INSERTED or UPDATED';

    -- Illinois
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Illinois', 'IL', '#42A5F5', 130)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Illinois (IL): INSERTED or UPDATED';

    -- Indiana
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Indiana', 'IN', '#EF5350', 140)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Indiana (IN): INSERTED or UPDATED';

    -- Iowa
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Iowa', 'IA', '#26A69A', 150)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Iowa (IA): INSERTED or UPDATED';

    -- Kansas
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Kansas', 'KS', '#FFA726', 160)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Kansas (KS): INSERTED or UPDATED';

    -- Kentucky
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Kentucky', 'KY', '#8D6E63', 170)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Kentucky (KY): INSERTED or UPDATED';

    -- Louisiana
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Louisiana', 'LA', '#5C6BC0', 180)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Louisiana (LA): INSERTED or UPDATED';

    -- Maine
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Maine', 'ME', '#2E7D32', 190)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Maine (ME): INSERTED or UPDATED';

    -- Maryland
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Maryland', 'MD', '#E040FB', 200)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Maryland (MD): INSERTED or UPDATED';

    -- Massachusetts
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Massachusetts', 'MA', '#D32F2F', 210)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Massachusetts (MA): INSERTED or UPDATED';

    -- Michigan
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Michigan', 'MI', '#1565C0', 220)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Michigan (MI): INSERTED or UPDATED';

    -- Minnesota
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Minnesota', 'MN', '#00BCD4', 230)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Minnesota (MN): INSERTED or UPDATED';

    -- Mississippi
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Mississippi', 'MS', '#C62828', 240)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Mississippi (MS): INSERTED or UPDATED';

    -- Missouri
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Missouri', 'MO', '#FF8F00', 250)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Missouri (MO): INSERTED or UPDATED';

    -- Montana
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Montana', 'MT', '#43A047', 260)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Montana (MT): INSERTED or UPDATED';

    -- Nebraska
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Nebraska', 'NE', '#7B1FA2', 270)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Nebraska (NE): INSERTED or UPDATED';

    -- Nevada
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Nevada', 'NV', '#F57C00', 280)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Nevada (NV): INSERTED or UPDATED';

    -- New Hampshire
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New Hampshire', 'NH', '#00897B', 290)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• New Hampshire (NH): INSERTED or UPDATED';

    -- New Jersey
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New Jersey', 'NJ', '#283593', 300)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• New Jersey (NJ): INSERTED or UPDATED';

    -- New Mexico
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New Mexico', 'NM', '#E65100', 310)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• New Mexico (NM): INSERTED or UPDATED';

    -- New York
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New York', 'NY', '#1B5E20', 320)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• New York (NY): INSERTED or UPDATED';

    -- North Carolina
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('North Carolina', 'NC', '#0D47A1', 330)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• North Carolina (NC): INSERTED or UPDATED';

    -- North Dakota
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('North Dakota', 'ND', '#00695C', 340)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• North Dakota (ND): INSERTED or UPDATED';

    -- Ohio
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Ohio', 'OH', '#FF6F00', 350)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Ohio (OH): INSERTED or UPDATED';

    -- Oklahoma
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Oklahoma', 'OK', '#827717', 360)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Oklahoma (OK): INSERTED or UPDATED';

    -- Oregon
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Oregon', 'OR', '#2E7D32', 370)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Oregon (OR): INSERTED or UPDATED';

    -- Pennsylvania
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Pennsylvania', 'PA', '#4A148C', 380)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Pennsylvania (PA): INSERTED or UPDATED';

    -- Rhode Island
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Rhode Island', 'RI', '#C51162', 390)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Rhode Island (RI): INSERTED or UPDATED';

    -- South Carolina
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('South Carolina', 'SC', '#B71C1C', 400)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• South Carolina (SC): INSERTED or UPDATED';

    -- South Dakota
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('South Dakota', 'SD', '#33691E', 410)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• South Dakota (SD): INSERTED or UPDATED';

    -- Tennessee
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Tennessee', 'TN', '#BF360C', 420)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Tennessee (TN): INSERTED or UPDATED';

    -- Texas
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Texas', 'TX', '#F44336', 430)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Texas (TX): INSERTED or UPDATED';

    -- Utah
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Utah', 'UT', '#004D40', 440)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Utah (UT): INSERTED or UPDATED';

    -- Vermont
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Vermont', 'VT', '#1A237E', 450)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Vermont (VT): INSERTED or UPDATED';

    -- Virginia
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Virginia', 'VA', '#4E342E', 460)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Virginia (VA): INSERTED or UPDATED';

    -- Washington
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Washington', 'WA', '#00695C', 470)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Washington (WA): INSERTED or UPDATED';

    -- West Virginia
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('West Virginia', 'WV', '#3E2723', 480)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• West Virginia (WV): INSERTED or UPDATED';

    -- Wisconsin
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Wisconsin', 'WI', '#0D47A1', 490)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Wisconsin (WI): INSERTED or UPDATED';

    -- Wyoming
    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Wyoming', 'WY', '#5D4037', 500)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;
    RAISE NOTICE '• Wyoming (WY): INSERTED or UPDATED';

    RAISE NOTICE '✔ Initial states seeded successfully.';

END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '007' AS migration,
    'Create States Setup Table' AS name,
    1 AS tables_created,
    0 AS tables_updated,
    0 AS columns_added,
    0 AS columns_skipped,
    0 AS indexes_created,
    50 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;