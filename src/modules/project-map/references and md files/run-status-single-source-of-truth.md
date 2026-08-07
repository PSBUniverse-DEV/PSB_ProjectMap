TASK: Right now there are THREE separate, disconnected definitions of
"what run statuses exist" in this codebase: a hardcoded RUN_STATUSES
array, individually hardcoded <option> elements in RunForm.jsx, and
the real database table proj_s_run_status — which is not referenced
anywhere. Nothing keeps these in sync. This task makes proj_s_run_status
the single source of truth that every control (status dropdown, status
filter, status display) reads from, everywhere run status appears.

SCOPE NOTE: proj_t_runs.status stays exactly as it is today — a plain
free-text column, set by matching a status_name string. This task does
NOT add a status_id foreign key or change how status is persisted. It
only changes WHERE the list of valid options comes from (the database
table, not scattered hardcoded arrays/JSX). Since proj_s_run_status
already has a configured display_color per status, wiring it up also
lets status badges show consistent, intentional colors instead of
generic ones — that's a natural side-effect of fixing the real problem,
not the goal itself.

─────────────────────────────────────
STEP 1 — Load proj_s_run_status alongside the other setup data
─────────────────────────────────────
FILE: src/modules/project-map/data/projectMap.server.js

In loadProjectMapSetup()'s `queries` object, add a new entry alongside
the existing lookup-table queries (projectStatuses, originAddresses,
states, etc.):

  runStatuses: supabase
    .from("proj_s_run_status")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true }),

This follows the exact same resilient pattern already used for the
other lookup tables in this function (Promise.allSettled, failed
queries return [] and get logged in sourceErrors rather than crashing
the page) — no special-casing needed, it slots into the existing loop.

─────────────────────────────────────
STEP 2 — Add shared helpers
─────────────────────────────────────
FILE: src/modules/project-map/data/projectMap.data.js

Keep the existing RUN_STATUSES hardcoded array, but change what it's
for: it becomes ONLY a defensive fallback for the rare case the DB
query fails or returns empty — never the primary source again. Add a
comment above it making that explicit:

  // Fallback only — real source of truth is proj_s_run_status.
  // Used if that query fails or returns empty.
  export const RUN_STATUSES = ["Draft", "Planned", "Scheduled", "In Progress", "Completed", "Cancelled"];

Add a helper that resolves the actual options list, DB-first:

  export function resolveRunStatusOptions(runStatuses = []) {
    return runStatuses.length > 0
      ? runStatuses.map((s) => s.status_name)
      : RUN_STATUSES;
  }

Add a helper for color lookup (secondary, but trivial once the data is
loaded):

  export function getRunStatusColor(statusName, runStatuses = []) {
    if (!statusName) return "#6b7280";
    const found = runStatuses.find((s) => s.status_name === statusName);
    return found?.display_color || "#6b7280";
  }

─────────────────────────────────────
STEP 3 — RunForm.jsx: single source of truth for the status control
─────────────────────────────────────
FILE: src/modules/project-map/components/RunForm.jsx

This is the primary fix. The status <select> currently has each option
hardcoded as literal JSX. Replace it entirely:

(a) Add prop: `runStatuses = []`

(b) Replace the hardcoded <option> list:

  import { resolveRunStatusOptions } from "../data/projectMap.data";
  ...
  const statusOptions = resolveRunStatusOptions(runStatuses);
  ...
  <select value={form.status} onChange={(e) => handleChange("status", e.target.value)} ...>
    {statusOptions.map((statusName) => (
      <option key={statusName} value={statusName}>{statusName}</option>
    ))}
  </select>

Do not change the default value logic (`status: run.status || "Draft"`
or similar) — only the source of the option list changes.

─────────────────────────────────────
STEP 4 — RunFilterPanel.jsx: single source of truth for the filter control
─────────────────────────────────────
FILE: src/modules/project-map/components/RunFilterPanel.jsx

Remove this file's own local RUN_STATUSES definition entirely (it was
moved into projectMap.data.js in a prior task — if it's still locally
defined here, delete the local copy now). Add prop `runStatuses = []`
and use `resolveRunStatusOptions(runStatuses)` from projectMap.data.js
the same way as Step 3, instead of mapping over any local/hardcoded
array.

─────────────────────────────────────
STEP 5 — RunMasterView.jsx: single source of truth for its filter + form
─────────────────────────────────────
FILE: src/modules/project-map/pages/RunMasterView.jsx

(a) Add prop `runStatuses = []` (RunMasterPage.js needs to load and
    pass this — see Step 7).

(b) Update the `filterConfig` status filter's options to come from
    `resolveRunStatusOptions(runStatuses).map((s) => ({ label: s, value: s }))`
    instead of the hardcoded RUN_STATUSES constant.

(c) Pass `runStatuses` through to the RunForm modal rendered at the
    bottom of this file, since RunForm now requires it per Step 3.

(d) Since runStatuses data is already being loaded here, also swap the
    Status column's `<StatusBadge status={row.status || "Draft"} />`
    for a custom chip using `getRunStatusColor(row.status, runStatuses)`
    — matching whatever colored-chip visual pattern this codebase
    already uses for project status chips (tinted background + border
    from the hex color). This is the color side-benefit mentioned above
    — include it since the data's already there, but it is secondary to
    Steps 3–5(a-c) which are the actual point of this task.

─────────────────────────────────────
STEP 6 — RunDetailPanel.jsx: same source of truth for its status badge
─────────────────────────────────────
FILE: src/modules/project-map/components/RunDetailPanel.jsx

(a) Add prop `runStatuses = []`.

(b) Wherever this panel currently shows a status badge/pill, apply
    `getRunStatusColor(run.status, runStatuses)` instead of any
    generic/hardcoded color, matching the same chip styling used in
    Step 5(d) for visual consistency across both pages.

(c) Check the print template in this same file (the
    printWindow.document.write(...) HTML string) for whether it
    currently shows run status anywhere in the "Run Information"
    strip. If not, add a plain-text "Status" field there (no color —
    print output stays black/white/print-safe). If it's already
    present, leave it as-is.

─────────────────────────────────────
STEP 7 — Thread `runStatuses` through both page trees
─────────────────────────────────────
(a) ProjectMapPage.js → ProjectMapView.jsx: confirm loadProjectMapSetup()'s
    result (now including `runStatuses` per Step 1) reaches
    ProjectMapView via whatever spread/prop pattern is already used for
    the other setup data. Then pass `runStatuses={runStatuses}` down to
    wherever RunForm, RunFilterPanel, and RunDetailPanel are rendered.

(b) RunMasterPage.js: add `runStatuses={setup.runStatuses || []}` when
    rendering RunMasterView, alongside the existing `origins` and
    `statuses` props.

─────────────────────────────────────
DO NOT
─────────────────────────────────────
- Do not add a status_id column or foreign key to proj_t_runs.
- Do not change how createRun/updateRun save the status field — it
  continues to save the plain status_name string exactly as before.
- Do not change the generic shared StatusBadge component — build the
  colored chip locally, matching the existing project-status chip
  pattern.
- Do not delete the RUN_STATUSES constant — keep it as the documented
  fallback.

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
1. Confirm there is exactly ONE place in the codebase where the list of
   valid run statuses is defined for real use: proj_s_run_status. Every
   dropdown/filter reads from it via resolveRunStatusOptions(); the
   RUN_STATUSES constant is only reachable as a fallback path.
2. Temporarily rename a status in the DB (e.g. "In Progress" →
   "In-Progress") — confirm the Run form dropdown, the run status
   filter (both pages), and existing display all reflect the change
   without a code deploy. Rename it back after confirming.
3. Temporarily set is_active = false on a status — confirm it
   disappears from dropdowns/filters, but any existing run already set
   to that status still displays and prints correctly.
4. Confirm status badge colors now match proj_s_run_status.display_color
   consistently across the map page's Run Detail Panel and the Run
   Master List table.
5. Confirm creating/editing a run still saves status as a plain string
   exactly as before — check the database row directly to confirm no
   FK or new column was introduced.