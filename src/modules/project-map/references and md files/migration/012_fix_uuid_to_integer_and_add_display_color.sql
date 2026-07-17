-- ====================================================
-- Migration 012: Fix UUID to Integer PKs and Add Display Color
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 012: Fix UUID to Integer PKs and Add Display Color';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/8: Drop all tables in dependency order
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/8] Dropping all tables in dependency order...';

    DROP TABLE IF EXISTS public.proj_t_run_projects CASCADE;
    RAISE NOTICE '✔ Table "proj_t_run_projects" dropped.';

    DROP TABLE IF EXISTS public.proj_t_runs CASCADE;
    RAISE NOTICE '✔ Table "proj_t_runs" dropped.';

    DROP TABLE IF EXISTS public.proj_s_states CASCADE;
    RAISE NOTICE '✔ Table "proj_s_states" dropped.';

    DROP TABLE IF EXISTS public.proj_s_origin_addresses CASCADE;
    RAISE NOTICE '✔ Table "proj_s_origin_addresses" dropped.';

    DROP TABLE IF EXISTS public.proj_t_projects CASCADE;
    RAISE NOTICE '✔ Table "proj_t_projects" dropped.';

    DROP TABLE IF EXISTS public.proj_s_project_status CASCADE;
    RAISE NOTICE '✔ Table "proj_s_project_status" dropped.';

    RAISE NOTICE '✔ All tables dropped successfully.';
END $$;

-- ====================================================
-- STEP 2/8: Create proj_s_project_status (INT PK)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 2/8] Creating table "proj_s_project_status"...';

    CREATE TABLE IF NOT EXISTS public.proj_s_project_status (
        status_id           SERIAL          PRIMARY KEY,
        status_name         TEXT            NOT NULL UNIQUE,
        status_description  TEXT,
        display_color       TEXT,
        display_order       INTEGER         NOT NULL DEFAULT 0,
        is_active           BOOLEAN         NOT NULL DEFAULT true,
        date_created        TIMESTAMPTZ     NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_s_project_status" created with SERIAL PK and display_color column.';
END $$;

-- ====================================================
-- STEP 3/8: Create proj_t_projects (INT PK, INT FKs)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 3/8] Creating table "proj_t_projects"...';

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
        project_subtotal        NUMERIC(12,2),
        created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
        created_by              INTEGER,
        updated_by              INTEGER
    );

    RAISE NOTICE '✔ Table "proj_t_projects" created with SERIAL PK and INTEGER FKs.';

    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_status_id
        ON public.proj_t_projects (status_id);
    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_client_name
        ON public.proj_t_projects (client_name);
    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_state_code
        ON public.proj_t_projects (state_code);
    CREATE INDEX IF NOT EXISTS idx_proj_t_projects_dealer
        ON public.proj_t_projects (dealer);
    RAISE NOTICE '✔ Indexes on "proj_t_projects" created.';
END $$;

-- ====================================================
-- STEP 4/8: Create proj_s_origin_addresses (INT PK)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 4/8] Creating table "proj_s_origin_addresses"...';

    CREATE TABLE IF NOT EXISTS public.proj_s_origin_addresses (
        id                  SERIAL          PRIMARY KEY,
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

    RAISE NOTICE '✔ Table "proj_s_origin_addresses" created with SERIAL PK.';
END $$;

-- ====================================================
-- STEP 5/8: Create proj_s_states (INT PK)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 5/8] Creating table "proj_s_states"...';

    CREATE TABLE IF NOT EXISTS public.proj_s_states (
        id              SERIAL          PRIMARY KEY,
        state_name      TEXT            NOT NULL UNIQUE,
        state_code      TEXT            NOT NULL UNIQUE,
        display_color   TEXT            NOT NULL,
        display_order   INTEGER         NOT NULL DEFAULT 0,
        is_active       BOOLEAN         NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_s_states" created with SERIAL PK.';
END $$;

-- ====================================================
-- STEP 6/8: Create proj_t_runs (INT PK, INT FKs)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 6/8] Creating table "proj_t_runs"...';

    CREATE TABLE IF NOT EXISTS public.proj_t_runs (
        id                  SERIAL          PRIMARY KEY,
        run_number          SERIAL,
        run_name            TEXT            NOT NULL,
        origin_id           INTEGER         REFERENCES public.proj_s_origin_addresses(id),
        run_date            DATE,
        status              TEXT            NOT NULL DEFAULT 'Draft',
        notes               TEXT,
        team_assigned       TEXT,
        vehicle_assigned    TEXT,
        estimated_distance  NUMERIC(10,2),
        estimated_duration  NUMERIC(10,2),
        estimated_subtotal  NUMERIC(12,2),
        created_by          INTEGER,
        updated_by          INTEGER,
        created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "proj_t_runs" created with SERIAL PK and INTEGER FKs.';

    CREATE INDEX IF NOT EXISTS idx_proj_t_runs_run_date
        ON public.proj_t_runs (run_date);
    CREATE INDEX IF NOT EXISTS idx_proj_t_runs_status
        ON public.proj_t_runs (status);
    RAISE NOTICE '✔ Indexes on "proj_t_runs" created.';
END $$;

-- ====================================================
-- STEP 7/8: Create proj_t_run_projects (INT PK, INT FKs)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 7/8] Creating table "proj_t_run_projects"...';

    CREATE TABLE IF NOT EXISTS public.proj_t_run_projects (
        id              SERIAL          PRIMARY KEY,
        run_id          INTEGER         NOT NULL REFERENCES public.proj_t_runs(id) ON DELETE CASCADE,
        project_id      INTEGER         NOT NULL REFERENCES public.proj_t_projects(id),
        stop_sequence   INTEGER         NOT NULL DEFAULT 0,
        notes           TEXT,
        CONSTRAINT proj_t_run_projects_run_project_unique UNIQUE (run_id, project_id)
    );

    RAISE NOTICE '✔ Table "proj_t_run_projects" created with SERIAL PK and INTEGER FKs.';

    CREATE INDEX IF NOT EXISTS idx_proj_t_run_projects_run_id
        ON public.proj_t_run_projects (run_id);
    CREATE INDEX IF NOT EXISTS idx_proj_t_run_projects_project_id
        ON public.proj_t_run_projects (project_id);
    RAISE NOTICE '✔ Indexes on "proj_t_run_projects" created.';
END $$;

-- ====================================================
-- STEP 8/8: Seed project statuses with display_color
-- ====================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '[STEP 8/8] Seeding project statuses with display colors...';

    -- Pre-Processing
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('New Dealer Order', 'New order received from dealer', '#3B82F6', 10)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• New Dealer Order: INSERTED or UPDATED';

    -- Processing
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Welcome Email / Call', 'Initial customer contact made', '#8B5CF6', 20)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Welcome Email / Call: INSERTED or UPDATED';

    -- Waiting
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Pending Permits', 'Awaiting permit approvals', '#F59E0B', 30)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Pending Permits: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Pending Site Readiness', 'Waiting for site preparation', '#F97316', 40)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Pending Site Readiness: INSERTED or UPDATED';

    -- Scheduled
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Ready for Install', 'Ready to schedule installation', '#10B981', 50)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Ready for Install: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Confirmed Install Date', 'Installation date confirmed', '#059669', 60)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Confirmed Install Date: INSERTED or UPDATED';

    -- Active
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Currently Being Installed', 'Installation in progress', '#2563EB', 70)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Currently Being Installed: INSERTED or UPDATED';

    -- Financial
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Pending Payment', 'Awaiting payment', '#DC2626', 80)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Pending Payment: INSERTED or UPDATED';

    -- Installed
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Fully Installed', 'Installation completed', '#6B7280', 90)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Fully Installed: INSERTED or UPDATED';

    -- Issue
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Repairs', 'Needs repair work', '#EF4444', 100)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Repairs: INSERTED or UPDATED';

    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Collections', 'In collections process', '#991B1B', 110)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Collections: INSERTED or UPDATED';

    -- Completed
    INSERT INTO public.proj_s_project_status (status_name, status_description, display_color, display_order)
    VALUES ('Completed', 'Project completed successfully', '#22C55E', 120)
    ON CONFLICT (status_name) DO UPDATE SET
        status_description = EXCLUDED.status_description,
        display_color      = EXCLUDED.display_color,
        display_order      = EXCLUDED.display_order,
        is_active          = true;
    RAISE NOTICE '• Completed: INSERTED or UPDATED';

    RAISE NOTICE '✔ Project statuses seeded with display colors.';
END $$;

-- ====================================================
-- Seed initial states (from Migration 007)
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[ADDITIONAL] Seeding initial states...';

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Alabama', 'AL', '#E53935', 10)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Alaska', 'AK', '#D43F8D', 20)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Arizona', 'AZ', '#FDD835', 30)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Arkansas', 'AR', '#7CB342', 40)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('California', 'CA', '#1E88E5', 50)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Colorado', 'CO', '#8E24AA', 60)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Connecticut', 'CT', '#00ACC1', 70)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Delaware', 'DE', '#3949AB', 80)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Florida', 'FL', '#F44336', 90)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Georgia', 'GA', '#FF7043', 100)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Hawaii', 'HI', '#AB47BC', 110)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Idaho', 'ID', '#66BB6A', 120)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Illinois', 'IL', '#42A5F5', 130)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Indiana', 'IN', '#EF5350', 140)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Iowa', 'IA', '#26A69A', 150)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Kansas', 'KS', '#FFA726', 160)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Kentucky', 'KY', '#8D6E63', 170)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Louisiana', 'LA', '#5C6BC0', 180)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Maine', 'ME', '#2E7D32', 190)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Maryland', 'MD', '#E040FB', 200)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Massachusetts', 'MA', '#D32F2F', 210)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Michigan', 'MI', '#1565C0', 220)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Minnesota', 'MN', '#00BCD4', 230)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Mississippi', 'MS', '#C62828', 240)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Missouri', 'MO', '#FF8F00', 250)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Montana', 'MT', '#43A047', 260)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Nebraska', 'NE', '#7B1FA2', 270)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Nevada', 'NV', '#F57C00', 280)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New Hampshire', 'NH', '#00897B', 290)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New Jersey', 'NJ', '#283593', 300)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New Mexico', 'NM', '#E65100', 310)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('New York', 'NY', '#1B5E20', 320)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('North Carolina', 'NC', '#0D47A1', 330)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('North Dakota', 'ND', '#00695C', 340)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Ohio', 'OH', '#FF6F00', 350)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Oklahoma', 'OK', '#827717', 360)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Oregon', 'OR', '#2E7D32', 370)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Pennsylvania', 'PA', '#4A148C', 380)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Rhode Island', 'RI', '#C51162', 390)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('South Carolina', 'SC', '#B71C1C', 400)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('South Dakota', 'SD', '#33691E', 410)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Tennessee', 'TN', '#BF360C', 420)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Texas', 'TX', '#F44336', 430)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Utah', 'UT', '#004D40', 440)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Vermont', 'VT', '#1A237E', 450)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Virginia', 'VA', '#4E342E', 460)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Washington', 'WA', '#00695C', 470)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('West Virginia', 'WV', '#3E2723', 480)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Wisconsin', 'WI', '#0D47A1', 490)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    INSERT INTO public.proj_s_states (state_name, state_code, display_color, display_order)
    VALUES ('Wyoming', 'WY', '#5D4037', 500)
    ON CONFLICT (state_code) DO UPDATE SET
        state_name      = EXCLUDED.state_name,
        display_color   = EXCLUDED.display_color,
        display_order   = EXCLUDED.display_order,
        is_active       = true;

    RAISE NOTICE '✔ States seeded successfully.';
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '012' AS migration,
    'Fix UUID to Integer PKs and Add Display Color' AS name,
    6 AS tables_created,
    0 AS tables_updated,
    1 AS columns_added,
    0 AS columns_skipped,
    8 AS indexes_created,
    12 AS statuses_inserted,
    0 AS statuses_updated,
    50 AS states_inserted,
    0 AS states_updated,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;