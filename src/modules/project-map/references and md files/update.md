


# remove-run-status-filter-from-panel.md

## Task
Remove the "Run Status" dropdown from `RunFilterPanel.jsx` (the popover opened by the "Filters" button on the Runs tab) — it's now redundant with `RunStatusTabs`, which already provides the same status selection as a tab row above the run list.

## File: `src/modules/project-map/components/RunFilterPanel.jsx`

**1. Remove the now-unused import** — find:

```js
import { resolveRunStatusOptions } from "../data/projectMap.data";
```

Delete this line entirely (it's only used by the section being removed).

**2. Remove the entire "RUN STATUS SECTION" block** — find:

```jsx
          {/* RUN STATUS SECTION */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              Run Status
            </div>
            <select
              value={localFilters.status || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
              style={{
                width: "100%",
                border: "1px solid #e2e8f0",
                borderRadius: "3px",
                padding: "4px 6px",
                fontSize: "11px",
                outline: "none",
              }}
            >
              <option value="">All Statuses</option>
              {resolveRunStatusOptions(runStatuses).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

```

Delete this entire block (including the blank line after it).

**3. Update `handleClearAll`** so clearing this panel only resets the run-date range, not `status` — `status` is now owned exclusively by `RunStatusTabs` and must not be clobbered by this panel's "Clear All". Find:

```js
  const handleClearAll = () => {
    const cleared = {
      status: "",
      runDateFrom: "",
      runDateTo: "",
    };
    setLocalFilters(cleared);
    onFilterChange?.(cleared);
    setIsOpen(false);
  };
```

Replace with:

```js
  const handleClearAll = () => {
    const cleared = { ...localFilters, runDateFrom: "", runDateTo: "" };
    setLocalFilters(cleared);
    onFilterChange?.(cleared);
    setIsOpen(false);
  };
```

**4. Update `activeFilterCount`** so the badge no longer counts `status` (which this panel can no longer set) — find:

```js
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (runFilters.status) count++;
    if (runFilters.runDateFrom || runFilters.runDateTo) count++;
    return count;
  }, [runFilters]);
```

Replace with:

```js
  const activeFilterCount = useMemo(() => {
    return (runFilters.runDateFrom || runFilters.runDateTo) ? 1 : 0;
  }, [runFilters]);
```

**5. `runStatuses` prop is now unused inside this file** — it's fine to leave the prop declared in the function signature (`runStatuses = []`) since the parent (`ProjectMapView.jsx`) still passes it and removing it there is out of scope; just don't reference it anywhere in the component body anymore (the one place it was used, `resolveRunStatusOptions(runStatuses)`, is deleted in step 2).

## DO NOT
- Do not touch `RunStatusTabs.jsx` — it already correctly owns status filtering via tabs; no changes needed there.
- Do not touch `runFilters.status` state or `handleRunStatusSelect` in `ProjectMapView.jsx` — those still work exactly as before, driven by the tabs.
- Do not remove the `runStatuses` prop from `RunFilterPanel`'s function signature or from where `ProjectMapView.jsx` passes it in — leave that wiring alone even though the prop is now unused inside this file.
- Do not touch the "Run Date" section of this panel — it stays as-is.
- Do not touch `RunFilterChips.jsx` — it already correctly excludes the status chip (per its existing comment) and needs no changes.

## Verification checklist
1. `grep -n "resolveRunStatusOptions\|Run Status" src/modules/project-map/components/RunFilterPanel.jsx` → should return no matches.
2. Reload `/project-map`, switch to the Runs tab, open Filters — confirm only "Run Date" (Start/End Date) remains in the popover, no "Run Status" dropdown.
3. Click a status tab (e.g. "In Progress") in `RunStatusTabs`, then open the Filters popover and click "Clear All" — confirm the selected status tab stays active (doesn't reset to "All") and only the date range clears.
4. Paste back the output of step 1 to confirm the edit persisted to disk.