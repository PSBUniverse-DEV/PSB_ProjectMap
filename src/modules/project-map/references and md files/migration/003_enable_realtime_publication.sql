-- Migration: Enable Supabase Realtime for Project Map tables (Update 3)
-- Description: Adds proj_t_projects, proj_t_runs, and proj_t_run_projects to
--              the supabase_realtime publication so browsers can subscribe to
--              INSERT/UPDATE/DELETE events. This is the database prerequisite
--              for live multi-user updates in the Project Map module
--              (see realtime-handoff.md in the module's docs folder).
-- Date: 2026-08-28
-- IMPORTANT: For senior dev / DBA execution only. Sections 1 and 4 are
--            read-only. Sections 2 and 3 make changes. Rollback is section 5.

-- ============================================
-- 1. PRE-FLIGHT CHECKS (read-only — run first, review the results)
-- ============================================

-- 1a. Is Row Level Security enabled on the tables? If relrowsecurity = true
--     for any of them, section 3 must ALSO be completed, otherwise browsers
--     will connect but silently receive NO events.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('proj_t_projects', 'proj_t_runs', 'proj_t_run_projects');

-- 1b. Does the realtime publication exist, and what is already in it?
--     (Adding tables here does NOT affect other apps unless they subscribe
--      to these specific tables.)
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================
-- 2. ADD THE TABLES TO THE REALTIME PUBLICATION
-- ============================================
-- Idempotent: safe to run more than once.

DO $$
BEGIN
  -- The supabase_realtime publication exists by default on every Supabase
  -- project; create it only if it is somehow missing.
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'proj_t_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE proj_t_projects;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'proj_t_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE proj_t_runs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'proj_t_run_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE proj_t_run_projects;
  END IF;
END $$;

-- ============================================
-- 3. RLS POLICIES — ONLY NEEDED IF CHECK 1a SHOWED rls_enabled = true
-- ============================================
-- Supabase Realtime delivers postgres_changes events through the role of the
-- subscribing client. The Project Map module subscribes from the browser, so
-- the role is "anon" (core anon client) or "authenticated" (logged-in JWT).
--
-- DECISION FOR SENIOR DEVS: decide which role subscribes and whether exposing
-- SELECT on these tables to that role is acceptable. If RLS is DISABLED
-- (relrowsecurity = false), no policy is needed and events flow to any
-- subscriber of the publication — skip this section entirely.
--
-- Templates (uncomment and adapt ONLY after the decision above):

-- CREATE POLICY "project_map_realtime_read_projects"
--   ON proj_t_projects FOR SELECT
--   TO authenticated            -- or: TO anon
--   USING (true);

-- CREATE POLICY "project_map_realtime_read_runs"
--   ON proj_t_runs FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "project_map_realtime_read_run_projects"
--   ON proj_t_run_projects FOR SELECT
--   TO authenticated
--   USING (true);

-- ============================================
-- 4. VERIFY (read-only)
-- ============================================

-- 4a. All three tables should now be listed here:
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'proj_t_%'
ORDER BY tablename;

-- 4b. End-to-end test once the module ships its realtime hook:
--     Open the Project Map in two different browsers. In browser A, add a
--     project or a run. Browser B should show the new pin / list entry
--     within about 1-2 seconds, WITHOUT any manual refresh.

-- ============================================
-- 5. ROLLBACK
-- ============================================
-- ALTER PUBLICATION supabase_realtime DROP TABLE proj_t_projects;
-- ALTER PUBLICATION supabase_realtime DROP TABLE proj_t_runs;
-- ALTER PUBLICATION supabase_realtime DROP TABLE proj_t_run_projects;
