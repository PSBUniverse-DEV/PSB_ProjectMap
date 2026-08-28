# Live Updates (Multi-User Sync) — Senior Dev Handoff

**Module:** project-map · **Date:** 2026-08-28 · **Status:** SHIPPED — DB prerequisites applied 2026-08-28 (all 3 tables confirmed in the realtime publication); module hook implemented in `hooks/useProjectMapRealtime.js` and wired in `ProjectMapView`

## 1. The problem

Two or three users work in the Project Map at the same time. When one user
creates a project or a run, the other users see nothing until they manually
refresh the page. Consequences:

- Users re-enter data that already exists (duplicate projects / runs).
- Run assignments made by one user are invisible to the next, so stops and
  routes go stale.
- Detail panels (project drawer, run detail) show outdated info.

## 2. How data flows today (what we found)

- `ProjectMapPage.js` (server component, `force-dynamic`) loads projects,
  setup/reference tables and runs via `projectMap.server.js`, and passes them
  as initial props to `ProjectMapView` (client).
- `ProjectMapView` keeps that data in local state (`projects`, `runs`,
  `allRunProjects`, selected run's `runProjects`). Every screen — pins,
  lists, drawers, panels — renders purely from those states.
- All writes go through `"use server"` actions in `projectMap.actions.js`
  (service-role Supabase client, server-side only).
- Refreshes only happen for the **current user's own** actions
  (`router.refresh()`, `refreshRuns()`, `refreshRunProjects()`,
  `refreshRunData()`). There is no listener for **other users'** changes —
  that is the entire gap.

## 3. Proposed solution

Subscribe the browser to Supabase Realtime (`postgres_changes`) for the three
tables, debounce bursts (~800 ms), and run the existing refreshers:

| Event on table | Module-side sync action |
|---|---|
| `proj_t_projects` | re-fetch projects → pins, project list, drawer |
| `proj_t_runs` | `refreshRuns()` → runs list, status tabs, run panel header |
| `proj_t_run_projects` | `refreshRunProjects()` + `refreshRunData()` (if a run is selected) → assignments lookup, runs-tab pins, stop list, route |

Because every panel already renders from these states, **no UI component
changes are needed**. All code stays inside `src/modules/project-map` — no
core changes planned.

Implemented module-side hook (`hooks/useProjectMapRealtime.js`):

```js
// src/modules/project-map/hooks/useProjectMapRealtime.js (planned)
"use client";
import { useEffect, useRef } from "react";
import { getSupabase } from "@/core/supabase/client"; // import only — no core edits

export function useProjectMapRealtime(onSync) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    const supabase = getSupabase();
    let timer;
    const scheduleSync = () => {          // coalesce event bursts
      clearTimeout(timer);
      timer = setTimeout(() => onSyncRef.current?.(), 800);
    };
    const channel = supabase
      .channel("project-map-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "proj_t_projects" }, scheduleSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "proj_t_runs" }, scheduleSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "proj_t_run_projects" }, scheduleSync)
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);
}
```

Wiring in `ProjectMapView`: call the hook once and let `onSync`
run the refreshers above. `getSupabase()` is safe to use here — the app root
already initializes it (`AuthProvider` → `initSupabase`), and other modules
(e.g. login, profile) already import it.

## 4. What we need from senior devs

1. **Run `migration/003_enable_realtime_publication.sql`** (read-only checks
   first). This adds the three tables to the `supabase_realtime` publication.
2. **If RLS is enabled** on any of the tables (check 1a in the script):
   decide the policy shape and which role the browser subscribes as
   (`anon` vs `authenticated`). Otherwise the socket connects but silently
   delivers **zero events**.
3. Confirm exposing SELECT (via realtime payloads) on these tables to the
   chosen role is acceptable.

After the SQL is applied, the module team enables the hook — the polling
fallback below can be retired at that point.

## 5. Fallback if realtime is a no-go (module-only, zero DB changes)

A version-polling approach also fits entirely inside the module:

- One new `"use server"` action `getProjectMapVersion()` returning cheap
  aggregates: `max(updated_at)` for projects and runs; `max(id)` + `count(*)`
  for `proj_t_run_projects` (that table has **no `updated_at`** — the count
  catches deletes).
- A small hook polling every ~20–30 s (paused when the tab is hidden),
  comparing versions and refreshing only what changed via the same refreshers.

Trade-off: up to one interval of lag instead of ~1 s, but no DB changes and it
works through any proxy/firewall.

## 6. What this will NOT fix

- **Duplicate project entries.** Two users can still create the same client
  simultaneously — there is no uniqueness guard on projects. Live pins make
  this much less likely, but a duplicate warning in `AddProjectForm`
  (e.g. same client + address) would be a separate follow-up feature.
  (Run assignment duplication is already prevented server-side — a project
  can only belong to one run.)

## 7. Testing checklist (after SQL + hook ship)

- [ ] Two browsers open; A creates a project → B sees the pin within ~2 s.
- [ ] A creates a run → B sees it in the runs list and status tabs.
- [ ] A assigns a project to a run → B's map (Runs tab rules) and Assigned
      Run row update without refresh.
- [ ] A removes a project from a run (drawer ✕ or run panel) → B updates.
- [ ] A edits a stop date/invoice → B's Run Detail Panel shows new values.
- [ ] Verify no regressions in single-user flows (all existing refreshes still work).
