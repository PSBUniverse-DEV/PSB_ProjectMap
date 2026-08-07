TASK: Replace the hand-rolled HTML table in RunMasterView.jsx with the
shared TableZ component (@/shared/components/ui/table or wherever its
actual import path resolves — confirm via how other Setup grids in this
codebase already import it, e.g. LookupTableGrid.jsx, and match that
exact import path). This is a UI-layer swap only — no changes to
projectMap.actions.js, projectMap.server.js, RunForm.jsx, or the print
utility.

Also fix a real bug found in the process: the current status filter
dropdown is fed by the `statuses` prop (project statuses like "New
Dealer Order" — the wrong data), not actual run statuses (Draft,
Planned, Scheduled, In Progress, Completed, Cancelled). Fix this as
part of the TableZ migration.

FILE: src/modules/project-map/pages/RunMasterView.jsx

─────────────────────────────────────
STEP 1 — Establish a single shared source for RUN_STATUSES
─────────────────────────────────────
RunFilterPanel.jsx currently defines its own local RUN_STATUSES array:

  const RUN_STATUSES = ["Draft", "Planned", "Scheduled", "In Progress", "Completed", "Cancelled"];

Move this into src/modules/project-map/data/projectMap.data.js as an
exported constant:

  export const RUN_STATUSES = ["Draft", "Planned", "Scheduled", "In Progress", "Completed", "Cancelled"];

Update RunFilterPanel.jsx to import it from there instead of defining
its own local copy, so there's exactly one source of truth for this
list going forward (avoids the two ever silently drifting apart).

─────────────────────────────────────
STEP 2 — Rewrite RunMasterView.jsx to use TableZ
─────────────────────────────────────
Import TableZ (match the exact import path used by other grids in this
codebase, e.g. check LookupTableGrid.jsx's import line and use the same
path) and the shared RUN_STATUSES constant:

  import TableZ from "@/shared/components/ui/table/TableZ"; // confirm exact path
  import { RUN_STATUSES } from "../data/projectMap.data";

REMOVE the following from the current implementation — TableZ handles
all of this internally in uncontrolled mode (per its own documented
usage: "Pass data and columns. TableZ handles sorting, filtering, and
pagination inside itself"):
  - The `statusFilter` and `search` state
  - The `filteredRuns` useMemo
  - The custom search `<input>` and status `<select>` JSX
  - The custom "Clear" button
  - The entire hand-rolled `<table>`/`<thead>`/`<tbody>` markup

KEEP:
  - `localRuns` state, `refreshRuns()`, `getOriginName()`,
    `getRunStopsCount()`, `getRunRevenue()`, `formatCurrency()`,
    `formatDate()` — these are still needed as column render helpers.
  - `showRunForm`/`editingRun` state and handlers (handleAddRun,
    handleEditRun, handleRunSaved, handleCloseRunForm) — unchanged.
  - `printingRunId` state and `handlePrintManifest()` — unchanged.
  - The header (title, Back to Map, + New Run buttons) — unchanged.
  - The RunForm modal at the bottom — unchanged.

BUILD a `columns` array (memoized with useMemo, since some entries
reference handler functions):

  const columns = useMemo(() => [
    {
      key: "run_name",
      label: "Run Code",
      sortable: true,
      render: (row) => row.run_name || `Run #${row.run_number || "?"}`,
    },
    {
      key: "origin_display",
      label: "Origin",
      sortable: false,
      render: (row) => getOriginName(row),
    },
    {
      key: "run_date",
      label: "Run Date",
      sortable: true,
      render: (row) => formatDate(row.run_date),
    },
    {
      key: "team_assigned",
      label: "Installer",
      sortable: true,
      render: (row) => row.team_assigned || "—",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status || "Draft"} />,
    },
    {
      key: "stops_display",
      label: "Stops",
      align: "right",
      sortable: false,
      render: (row) => getRunStopsCount(row),
    },
    {
      key: "revenue_display",
      label: "Revenue",
      align: "right",
      sortable: false,
      render: (row) => (
        <span style={{ color: "#15803d", fontWeight: 600 }}>
          {formatCurrency(getRunRevenue(row))}
        </span>
      ),
    },
  ], [getOriginName, getRunStopsCount, getRunRevenue]);

BUILD an `actions` array:

  const actions = useMemo(() => [
    {
      key: "edit",
      label: "Edit",
      icon: "pen",
      type: "secondary",
      onClick: (row) => handleEditRun(row),
    },
    {
      key: "print",
      label: "Print Manifest",
      icon: "print",
      type: "primary",
      disabled: (row) => printingRunId === row.id,
      onClick: (row) => handlePrintManifest(row),
    },
  ], [handleEditRun, handlePrintManifest, printingRunId]);

  NOTE: TableZ's action buttons are icon-only (label is used for the
  tooltip/aria-label, not visible text) — this differs from the current
  implementation's visible "Edit"/"Print Manifest" text buttons. This
  is expected and matches how the rest of this codebase's Setup grids
  already look (check LookupTableGrid.jsx or similar for the visual
  convention) — do not try to force visible text labels onto these
  buttons, that's not how this shared component works.

  NOTE: "print" is not in ActionColumn.js's defined icon-color map
  (View/Edit/Save/Deactivate/Delete/Cancel/Restore only), so it will
  render with the default fallback styling (same blue as Edit). This is
  a cosmetic limitation of the shared component, not a bug to fix here
  — if a distinct color for Print is wanted later, that would mean
  extending ACTION_COLOR_MAP in ActionColumn.js, which is out of scope
  for this task.

BUILD a `filterConfig` array for the status filter, using the shared
RUN_STATUSES constant (fixing the bug described above — this is a
select filter on the `status` field, with the actual run status
values, not project statuses):

  const filterConfig = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: RUN_STATUSES.map((s) => ({ label: s, value: s })),
    },
  ], []);

Render TableZ in place of the removed table markup:

  <TableZ
    data={localRuns}
    columns={columns}
    rowIdKey="id"
    actions={actions}
    filterConfig={filterConfig}
    searchPlaceholder="Search by run code, origin, or installer..."
    emptyMessage="No runs found."
  />

Confirm TableZ's built-in search (uncontrolled mode) actually searches
across the fields you need (run code, origin, installer) — check how
its internal search matching works (it likely searches visible column
values by default, per its filtering logic in TableZ.js). If it only
searches literal column keys and NOT the origin_display/computed
columns correctly, verify this against the actual search-matching code
in TableZ.js (search for how `normalizedSearchQuery` is applied to
`rows`) and adjust the column `key`/`render` approach if needed so
searching by origin name and installer actually works, not just Run
Code — report back if this needs a different approach than a plain
render-only column.

The `statuses` prop passed into RunMasterView (currently project
statuses from loadProjectMapSetup) is no longer used for anything in
this component after this change — leave the prop itself alone (don't
remove it from RunMasterPage.js, since it's harmless and low-risk to
leave passed-through in case something else needs it later), but you
may remove the now-unused local status filter code around it, per the
REMOVE list above.

─────────────────────────────────────
DO NOT
─────────────────────────────────────
- Do not modify TableZ.js or any of its supporting files (tableUtils,
  tableColumns, tableRender, ActionColumn, etc.) — this task only
  consumes the existing shared component, it doesn't change it.
- Do not change RunForm.jsx, the print utility, or any server action.
- Do not remove the `statuses` prop from RunMasterPage.js.

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
1. Navigate to /project-map/run-master — confirm the table now renders
   via TableZ (search bar and filter toggle should look like the
   shared component's style, not the previous custom table).
2. Confirm the Status filter now shows Draft/Planned/Scheduled/In
   Progress/Completed/Cancelled as options (not project statuses like
   "New Dealer Order"), and that selecting one actually filters the
   visible runs correctly — this is the bug fix, verify it works.
3. Confirm searching finds runs by run code, origin, AND installer —
   not just run code.
4. Confirm sorting works on sortable columns (Run Code, Run Date,
   Installer, Status).
5. Confirm Edit and Print Manifest action buttons still work exactly
   as before (Edit opens RunForm pre-filled; Print Manifest loads run
   details and opens the print window).
6. Confirm "+ New Run" still works and newly created runs appear in
   the table without a full page reload.
7. Confirm Revenue and Stops columns still show correct computed
   values (not blank/broken) for runs with and without stops.