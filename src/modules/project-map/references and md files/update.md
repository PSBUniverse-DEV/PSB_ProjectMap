This is the current version from your last upload — good, it's the up-to-date file (last modified matches this session). Let me pull the exact surrounding blocks I need to edit precisely.I have everything needed. Two things before the prompt: yes, these files are the right set — plus I found a **pre-existing bug** in `ProjectMap.jsx` (the map itself, separate from `ProjectList.jsx`) that I need to fix alongside this, or your map pins will silently break once Status becomes multi-select. I'll explain that below. No additional files needed.

I get exactly where you're going — tabs become toggleable multi-select, "All" clears everything, selected tabs OR together. Same visual design, just the click behavior changes. Here's the prompt:

---

# convert-status-tabs-to-multiselect-or.md

## Task
Convert `ProjectStatusTabs` and `RunStatusTabs` from single-select to toggleable multi-select (OR logic across selected tabs), for both the Projects page and Runs page. Visual design is unchanged — same scrollable tab track, same fade/scroll-arrow behavior, same selected-tab styling. Only the click behavior and underlying filter state change: clicking a tab toggles it on/off; multiple tabs can be lit at once; the list filters to projects/runs matching **any** of the selected statuses; clicking "All" clears every selection.

## Also fixes (found while implementing, name separately per project convention)
`ProjectMap.jsx` (the map itself) has its own **separate, out-of-date copy** of the project filtering logic that was never updated during the earlier Permit Status/Welcome Call/Dealer/State multi-select conversion. It still does old scalar `String(filters.permitStatus) === ...` comparisons against what are now arrays. This happens to work by accident for a single selection (`String(["2"])` coincidentally equals `"2"`) but silently breaks and hides matching pins the moment 2+ values are selected in any of those filters — completely independent of today's status-tabs task, but it will compound the moment this task also adds `filters.status` as an array, since the map's copy of the status check has the same flaw. Fixing it now while touching this file.

---

## File 1: `src/modules/project-map/components/ProjectStatusTabs.jsx`

Find:

```js
export default function ProjectStatusTabs({
  statuses = [],
  selectedStatus = "",
  onSelectStatus,
}) {
```

Replace with:

```js
export default function ProjectStatusTabs({
  statuses = [],
  selectedStatuses = [],
  onSelectStatus,
}) {
```

Find:

```js
  // A tab is selected when its value equals the active filter. `selectedStatus`
  // is the `filters.status` string; "" (or any falsy value) means "All".
  const isSelected = (statusId) =>
    statusId ? String(selectedStatus) === String(statusId) : !selectedStatus;
```

Replace with:

```js
  // A tab is selected when its id is present in the active filter array.
  // The "All" tab (statusId === "") is considered selected when nothing else
  // is selected — clicking it clears every other selection.
  const isSelected = (statusId) =>
    statusId ? selectedStatuses.includes(String(statusId)) : selectedStatuses.length === 0;
```

No other changes needed in this file — `handleSelect` already just forwards the clicked `value` to `onSelectStatus`; the toggle logic (add/remove from the array, or clear-all on "All") lives in the parent handler, not here.

---

## File 2: `src/modules/project-map/components/RunStatusTabs.jsx`

Find:

```js
export default function RunStatusTabs({
  runStatuses = [],
  selectedStatus = "",
  onSelectStatus,
}) {
```

Replace with:

```js
export default function RunStatusTabs({
  runStatuses = [],
  selectedStatuses = [],
  onSelectStatus,
}) {
```

Find:

```js
  // A tab is selected when its value (status_name string) equals the active
  // filter. Falsy selectedStatus means "Any".
  const isSelected = (statusName) =>
    statusName ? String(selectedStatus) === statusName : !selectedStatus;
```

Replace with:

```js
  // A tab is selected when its status_name string is present in the active
  // filter array. The "All" tab (statusName === "") is considered selected
  // when nothing else is selected — clicking it clears every other selection.
  const isSelected = (statusName) =>
    statusName ? selectedStatuses.includes(statusName) : selectedStatuses.length === 0;
```

---

## File 3: `src/modules/project-map/pages/ProjectMapView.jsx`

**3a. Replace `handleProjectStatusSelect`** with toggle logic. Find:

```js
  // Selects a project status from the status tabs shown above the project list.
  // Writes to the same `filters.status` value the old dropdown used, so the list
  // and the map pins update together. An empty string means "All" projects.
  const handleProjectStatusSelect = useCallback((statusId) => {
    setFilters((prev) => ({ ...prev, status: statusId || "" }));
  }, []);
```

Replace with:

```js
  // Toggles a project status in the status-tabs multi-select filter. Clicking
  // an already-selected tab deselects it; clicking "All" (empty statusId)
  // clears every selection. `filters.status` is now an array of status id
  // strings, OR'd together in filteredProjects/ProjectList/ProjectMap.
  const handleProjectStatusSelect = useCallback((statusId) => {
    setFilters((prev) => {
      if (!statusId) {
        return { ...prev, status: [] };
      }
      const current = prev.status || [];
      const next = current.includes(statusId)
        ? current.filter((s) => s !== statusId)
        : [...current, statusId];
      return { ...prev, status: next };
    });
  }, []);
```

**3b. Update `handleRemoveFilter`'s status reset** — find:

```js
    const filterResets = {
      status: "",
      permitStatus: [],
```

Replace with:

```js
    const filterResets = {
      status: [],
      permitStatus: [],
```

**3c. Replace `handleRemoveRunFilter`** — find:

```js
  const handleRemoveRunFilter = useCallback((filterKey) => {
    if (filterKey === "status") {
      setRunFilters({ ...runFilters, status: "" });
    } else if (filterKey === "runDate") {
      setRunFilters({ ...runFilters, runDateFrom: "", runDateTo: "" });
    }
  }, [runFilters]);
```

Replace with:

```js
  const handleRemoveRunFilter = useCallback((filterKey) => {
    if (filterKey === "status") {
      setRunFilters({ ...runFilters, status: [] });
    } else if (filterKey === "runDate") {
      setRunFilters({ ...runFilters, runDateFrom: "", runDateTo: "" });
    }
  }, [runFilters]);
```

**3d. Replace `handleRunStatusSelect`** with the same toggle pattern. Find:

```js
  // Selects a run status from the status tabs shown above the run list. Writes
  // to the same `runFilters.status` value the old dropdown used so the run list
  // stays in sync. An empty string ("All") means no status filter — the
  // filteredRuns logic already treats empty status as "show all runs".
  const handleRunStatusSelect = useCallback((statusName) => {
    setRunFilters((prev) => ({ ...prev, status: statusName || "" }));
  }, []);
```

Replace with:

```js
  // Toggles a run status in the status-tabs multi-select filter, same pattern
  // as handleProjectStatusSelect. `runFilters.status` is now an array of
  // status_name strings, OR'd together in filteredRuns.
  const handleRunStatusSelect = useCallback((statusName) => {
    setRunFilters((prev) => {
      if (!statusName) {
        return { ...prev, status: [] };
      }
      const current = prev.status || [];
      const next = current.includes(statusName)
        ? current.filter((s) => s !== statusName)
        : [...current, statusName];
      return { ...prev, status: next };
    });
  }, []);
```

**3e. Update the `runFilters` initial state** to keep the existing default (runs default to showing "Scheduled" status) but as an array. Find:

```js
  const [runFilters, setRunFilters] = useState({ status: "Scheduled" });
```

Replace with:

```js
  const [runFilters, setRunFilters] = useState({ status: ["Scheduled"] });
```

**3f. Update the `filteredProjects` status check** — find:

```js
      // Single-select scalar filters
      if (filters.status && String(p.status_id) !== filters.status) {
        return false;
      }
```

Replace with:

```js
      // Multi-select status filter — OR across selected statuses.
      if (Array.isArray(filters.status) && filters.status.length > 0 && !filters.status.includes(String(p.status_id))) {
        return false;
      }
```

**3g. Update the `filteredRuns` status check** — find:

```js
      // Status filter
      if (
        runFilters.status &&
        run.status !== runFilters.status
      ) {
        return false;
      }
```

Replace with:

```js
      // Multi-select status filter — OR across selected statuses.
      if (
        Array.isArray(runFilters.status) &&
        runFilters.status.length > 0 &&
        !runFilters.status.includes(run.status)
      ) {
        return false;
      }
```

**3h. Update the two tab component call sites** — find:

```jsx
          <ProjectStatusTabs
            statuses={statuses}
            selectedStatus={filters.status || ""}
            onSelectStatus={handleProjectStatusSelect}
          />
```

Replace with:

```jsx
          <ProjectStatusTabs
            statuses={statuses}
            selectedStatuses={filters.status || []}
            onSelectStatus={handleProjectStatusSelect}
          />
```

Find:

```jsx
          <RunStatusTabs
            runStatuses={runStatuses}
            selectedStatus={runFilters.status || ""}
            onSelectStatus={handleRunStatusSelect}
          />
```

Replace with:

```jsx
          <RunStatusTabs
            runStatuses={runStatuses}
            selectedStatuses={runFilters.status || []}
            onSelectStatus={handleRunStatusSelect}
          />
```

---

## File 4: `src/modules/project-map/components/ProjectList.jsx`

Find:

```js
      if (filters.status && String(p.status_id) !== String(filters.status)) return false;
```

Replace with:

```js
      if (Array.isArray(filters.status) && filters.status.length > 0 && !filters.status.includes(String(p.status_id))) return false;
```

---

## File 5: `src/modules/project-map/components/ProjectMap.jsx`

This is the "also fixes" item described above — update the map's own separate filtering copy for status (new, per this task) AND permitStatus/welcomeCallStatus/dealer/state (pre-existing latent bug, unrelated to today's ask but directly adjacent in the same block). Find:

```js
    if (filters.status && String(p.status_id) !== String(filters.status)) return false;
    if (filters.permitStatus && String(p.permit_status_id) !== String(filters.permitStatus)) return false;
    if (filters.welcomeCallStatus && String(p.welcome_call_status_id) !== String(filters.welcomeCallStatus)) return false;
    if (filters.dealer && p.dealer !== filters.dealer) return false;
    if (filters.state && p.state_code !== filters.state) return false;
```

Replace with:

```js
    if (Array.isArray(filters.status) && filters.status.length > 0 && !filters.status.includes(String(p.status_id))) return false;
    if (Array.isArray(filters.permitStatus) && filters.permitStatus.length > 0 && !filters.permitStatus.includes(String(p.permit_status_id))) return false;
    if (Array.isArray(filters.welcomeCallStatus) && filters.welcomeCallStatus.length > 0 && !filters.welcomeCallStatus.includes(String(p.welcome_call_status_id))) return false;
    if (Array.isArray(filters.dealer) && filters.dealer.length > 0 && !filters.dealer.includes(p.dealer)) return false;
    if (Array.isArray(filters.state) && filters.state.length > 0 && !filters.state.includes(p.state_code)) return false;
```

## DO NOT
- Do not change any styling, layout, scroll/fade behavior, or the `ProjectStatusTab`/`RunStatusTab` inner button components in either tabs file — UI/UX stays pixel-identical, only click semantics change.
- Do not touch `FilterChips.jsx` or `RunFilterChips.jsx` — status is intentionally not shown as a removable chip (the lit-up tab itself is the indicator), consistent with the existing pattern already documented in `RunFilterChips.jsx`'s comment.
- Do not touch `RunList.jsx` — it only renders whatever `filteredRuns` array it's given; no filtering logic lives there.
- Do not touch `ProjectStatusesGrid.jsx` — that's the Setup admin grid for managing status rows, unrelated to filtering behavior.
- Do not change the "Scheduled" default for the Runs tab's initial status filter — only its type changes (string → single-item array), not its value or intent.
- Do not add a status entry to `FilterPanel.jsx`/`RunFilterPanel.jsx` — status stays exclusively controlled by the tabs, as it already is today.

## Verification checklist
1. `grep -n "selectedStatuses" src/modules/project-map/components/ProjectStatusTabs.jsx src/modules/project-map/components/RunStatusTabs.jsx src/modules/project-map/pages/ProjectMapView.jsx` → should show the renamed prop used consistently across all three files.
2. `grep -n "status: \[\]" src/modules/project-map/pages/ProjectMapView.jsx` → should find matches in `filterResets` and `handleRemoveRunFilter`.
3. Reload `/project-map` (Projects tab). Click "Ready for Install" — tab lights up, list filters to that status. Click "Repairs" too (without clicking "All" first) — both tabs stay lit, list now shows projects in *either* status.
4. Click "All" — confirm all tabs unlight and the full project list returns.
5. Switch to the Runs tab — confirm it defaults to "Scheduled" selected (matching prior default behavior), then repeat steps 3–4 for run statuses.
6. With 2+ statuses selected on Projects, confirm the map pins (not just the list) also reflect the OR-filtered set — this is the `ProjectMap.jsx` fix; if pins don't match the list, that fix didn't take.
7. Paste back the output of steps 1–2 to confirm all edits persisted to disk.