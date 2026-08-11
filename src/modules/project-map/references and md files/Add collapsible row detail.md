**Task: Add collapsible row detail (Run Data / Project Data tabs) to Run Master List**

**File:** `src/modules/project-map/pages/RunMasterView.jsx`

**Do NOT touch any TableZ file** (`TableZ.js`, `tableRender.js`, `tableState.js`, `tableUtils.js`, `ActionColumn.js`, etc. — these are owned by Core). This feature uses `TableZ`'s existing public props (`selectedRowId`, `onRowClick`, `renderDetail`) only.

**Do NOT touch anything else outside `src/modules/project-map/`.**

**1. Add `formatProjectDescriptionForDisplay` to the existing data import:**
```js
import { resolveRunStatusOptions, getRunStatusColor, formatProjectDescriptionForDisplay } from "../data/projectMap.data";
```

**2. Add new state**, right after `const [printingRunId, setPrintingRunId] = useState(null);`:
```js
const [expandedRunId, setExpandedRunId] = useState(null);
const [expandedDetail, setExpandedDetail] = useState(null);
const [expandedLoading, setExpandedLoading] = useState(false);
const [activeDetailTab, setActiveDetailTab] = useState("run");
```

**3. Add the row-click handler**, after `refreshRuns`:
```js
const handleRowClick = useCallback(async (row) => {
  if (expandedRunId === row.id) {
    setExpandedRunId(null);
    setExpandedDetail(null);
    return;
  }
  setExpandedRunId(row.id);
  setExpandedDetail(null);
  setActiveDetailTab("run");
  setExpandedLoading(true);
  try {
    const detail = await loadRunDetails(row.id);
    setExpandedDetail(detail);
  } catch (err) {
    console.error("[RunMasterView] Failed to load run detail:", err);
    toastError(err?.message || "Failed to load run details.", "Run Master List");
  } finally {
    setExpandedLoading(false);
  }
}, [expandedRunId]);
```
This reuses `loadRunDetails` — already imported and already used by Print Manifest/Paid Sheet — rather than adding a new data-loading function.

**4. Add a `formatDateTime` helper**, right after `formatDate`:
```js
const formatDateTime = (val) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
};
```

**5. Add the `renderDetail` function**, after the `formatDateTime` helper (before the `columns` useMemo):
```js
const renderDetail = useCallback((row) => {
  const tabButtonStyle = (active) => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    border: "none",
    borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
    background: "transparent",
    color: active ? "#1e293b" : "#64748b",
    cursor: "pointer",
  });

  if (expandedLoading) {
    return (
      <div style={{ padding: "16px", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
        Loading run details...
      </div>
    );
  }

  const detailRun = expandedDetail?.run || row;
  const detailProjects = expandedDetail?.projects || [];

  return (
    <div style={{ padding: "12px 16px", background: "#f8fafc" }}>
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e2e8f0", marginBottom: "12px" }}>
        <button style={tabButtonStyle(activeDetailTab === "run")} onClick={() => setActiveDetailTab("run")}>
          Run Data
        </button>
        <button style={tabButtonStyle(activeDetailTab === "projects")} onClick={() => setActiveDetailTab("projects")}>
          Project Data ({detailProjects.length})
        </button>
      </div>

      {activeDetailTab === "run" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[
            ["Run Name", detailRun.run_name || "—"],
            ["Run Code", detailRun.run_code || "—"],
            ["Status", detailRun.status || "Draft"],
            ["Origin", getOriginName(detailRun)],
            ["Origin Address", detailRun.proj_s_origin_addresses?.formatted_address || detailRun.proj_s_origin_addresses?.address_line_1 || "—"],
            ["Run Date", formatDate(detailRun.run_date)],
            ["Installer", detailRun.team_assigned || "—"],
            ["Est. Distance", detailRun.estimated_distance != null ? `${(detailRun.estimated_distance / 1609.344).toFixed(1)} mi` : "—"],
            ["Est. Mileage", detailRun.estimated_mileage != null ? `${Number(detailRun.estimated_mileage).toFixed(1)} mi` : "—"],
            ["Est. Duration", detailRun.estimated_duration != null ? `${Math.round(Number(detailRun.estimated_duration) / 60)} min` : "—"],
            ["Est. Subtotal", formatCurrency(detailRun.estimated_subtotal)],
            ["Created At", formatDateTime(detailRun.created_at)],
            ["Updated At", formatDateTime(detailRun.updated_at)],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>{label}</div>
              <div style={{ fontSize: "12px", color: "#1e293b", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 10px", gridColumn: "1 / -1" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>Remarks</div>
            <div style={{ fontSize: "12px", color: "#1e293b", whiteSpace: "pre-wrap" }}>{detailRun.notes || "—"}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {detailProjects.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", padding: "8px" }}>No stops assigned to this run.</div>
          ) : (
            detailProjects.map((rp, idx) => {
              const proj = rp.proj_t_projects || {};
              const address = proj.formatted_address || [proj.address_line_1, proj.city, proj.state, proj.postal_code].filter(Boolean).join(", ") || "—";
              return (
                <div key={proj.id || idx} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                      Stop {idx + 1} — {proj.client_name || "Untitled"}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>{formatCurrency(proj.project_subtotal)}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                    <div><strong style={{ color: "#1e293b" }}>Address:</strong> {address}</div>
                    <div><strong style={{ color: "#1e293b" }}>Status:</strong> {proj.proj_s_project_status?.status_name || "—"}</div>
                    <div><strong style={{ color: "#1e293b" }}>Invoice #:</strong> {proj.invoice_number || "—"}</div>
                    <div><strong style={{ color: "#1e293b" }}>Building:</strong> {proj.proj_s_building_categories?.building_category_name || "—"}</div>
                    <div><strong style={{ color: "#1e293b" }}>Dimensions:</strong> {formatProjectDescriptionForDisplay(proj.dimension) || "—"}</div>
                    <div><strong style={{ color: "#1e293b" }}>Order Received:</strong> {formatDate(proj.order_received_at)}</div>
                    <div><strong style={{ color: "#1e293b" }}>Scheduled:</strong> {formatDate(proj.scheduled_project_start)}</div>
                    <div><strong style={{ color: "#1e293b" }}>Arrival:</strong> {formatDate(proj.install_start)}</div>
                    <div><strong style={{ color: "#1e293b" }}>Payment Method:</strong> {proj.proj_s_payment_method?.method_description || proj.proj_s_payment_method?.method_name || "—"}</div>
                  </div>
                  {proj.project_notes && (
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#1e293b", whiteSpace: "pre-wrap" }}>
                      <strong>Notes:</strong> {proj.project_notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}, [expandedLoading, expandedDetail, activeDetailTab, getOriginName, formatDate, formatCurrency]);
```

**6. Wire the new props into `<TableZ>`.** Find:
```jsx
<TableZ
  data={tableData}
  columns={columns}
  rowIdKey="id"
  actions={actions}
  filterConfig={filterConfig}
  searchPlaceholder="Search by run name, run code, origin, or installer..."
  emptyMessage="No runs found."
/>
```
Replace with:
```jsx
<TableZ
  data={tableData}
  columns={columns}
  rowIdKey="id"
  actions={actions}
  filterConfig={filterConfig}
  searchPlaceholder="Search by run name, run code, origin, or installer..."
  emptyMessage="No runs found."
  selectedRowId={expandedRunId}
  onRowClick={handleRowClick}
  renderDetail={renderDetail}
/>
```

**DO NOT:**
- Do not edit any file under the TableZ component tree — `renderDetail`/`selectedRowId`/`onRowClick` are existing public props on `TableZ`, confirmed in `tableRender.js`; this task only consumes them.
- Do not change `loadRuns()` or its query in `projectMap.server.js` — the row list keeps loading light data; full detail is fetched lazily per-row via the existing `loadRunDetails()`.
- Do not change the Edit/Print Manifest/Print Paid Sheet action behavior.
- Do not touch any file outside `src/modules/project-map/`.

**Verify:**
```
grep -n "expandedRunId\|renderDetail\|handleRowClick" src/modules/project-map/pages/RunMasterView.jsx
```
Confirm clicking a row expands a detail panel with two tabs, clicking the same row again collapses it, and clicking an action icon (pen/print icons) does **not** trigger the row expand/collapse (it shouldn't, since `ActionCell` already stops click propagation — worth a manual click-test to confirm, not just a grep).