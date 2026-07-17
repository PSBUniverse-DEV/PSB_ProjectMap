I've read the Runs feature.md carefully. Here's a comprehensive implementation plan:

## Runs Module — Implementation Plan

### 📦 Database Changes

#### Migration 010 — Create `proj_t_runs`
```sql
CREATE TABLE IF NOT EXISTS public.proj_t_runs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    run_number      SERIAL,
    run_name        TEXT        NOT NULL,
    origin_id       UUID        REFERENCES public.proj_s_origin_addresses(id),
    run_date        DATE,
    status          TEXT        NOT NULL DEFAULT 'Draft',
    notes           TEXT,
    team_assigned   TEXT,
    vehicle_assigned TEXT,
    estimated_distance NUMERIC(10,2),
    estimated_duration NUMERIC(10,2),
    estimated_subtotal NUMERIC(12,2),
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Status options: `Draft`, `Planned`, `Scheduled`, `In Progress`, `Completed`, `Cancelled`

#### Migration 011 — Create `proj_t_run_projects`
```sql
CREATE TABLE IF NOT EXISTS public.proj_t_run_projects (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID        NOT NULL REFERENCES public.proj_t_runs(id) ON DELETE CASCADE,
    project_id      INTEGER     NOT NULL REFERENCES public.proj_t_projects(id),
    stop_sequence   INTEGER     NOT NULL DEFAULT 0,
    notes           TEXT,
    UNIQUE(run_id, project_id)
);
```

Both migrations follow standards: `IF NOT EXISTS`, `RAISE NOTICE`, final `SELECT` summary.

### 🗺 Map Workspace (Reuse Existing Page)

Add a tab switcher to the existing Project Map page:
```
[ Projects ] [ Runs ]
```

**Projects tab** — Current behavior (no changes)

**Runs tab** — New behavior:
- **Left panel**: Shows a list of runs with basic info
- **Map**: Shows all stops in the selected run with route line from origin through each stop
- **Right panel**: Run details with project grid

### 🖥 Components to Create/Modify

1. **`ProjectMapView.jsx`** — Add `[Projects] [Runs]` tab bar, mode state (`projects` | `runs`)
2. **`components/RunList.jsx`** — Left panel when in Runs mode, shows list of runs
3. **`components/RunDetailPanel.jsx`** — Right panel showing run details + project grid
4. **`components/RunForm.jsx`** — Modal for creating/editing runs (choose origin, date, select projects)
5. **`components/RunMap.jsx`** (or extend `ProjectMap.jsx`) — Show multi-stop route on map
6. **`data/projectMap.actions.js`** — Add Server Actions for Run CRUD: `createRun`, `updateRun`, `deleteRun`, `addProjectToRun`, `removeProjectFromRun`, `updateStopSequence`, `loadRuns`, `loadRunDetails`
7. **`data/projectMap.server.js`** — Add `loadRuns()` loader

### 📐 Key Design Decisions

**Reuse the same map**: No new `/runs` page. The map stays at `/project-map` and switches between Projects/Runs mode.

**Route calculation**: In Runs mode, calculate OSRM route for each segment (Origin→Stop1, Stop1→Stop2, etc.) and sum for totals. Store calculated totals in `proj_t_runs`.

**Project assignment**: Dropdown or multi-select in Run creation form. Only unassigned projects or projects already in this run shown.

**One active run per project**: A project can only belong to one Run that isn't Completed/Cancelled. History is preserved.

**Drag-and-drop**: For reordering stops within a run (future enhancement, not v1).

**Team/Vehicle**: Stored as free text (per the specification).

### 📋 Implementation Steps (Ordered)

| Step | Description |
|------|------------|
| 1 | Create migration 010: `proj_t_runs` table |
| 2 | Create migration 011: `proj_t_run_projects` table |
| 3 | Add Run CRUD Server Actions |
| 4 | Add load functions to server.js |
| 5 | Create `RunList.jsx` component |
| 6 | Create `RunDetailPanel.jsx` component |
| 7 | Create `RunForm.jsx` component |
| 8 | Update `ProjectMapView.jsx` with Projects/Runs tabs |
| 9 | Extend `ProjectMap.jsx` to support multi-stop routes |
| 10 | Build and test |

